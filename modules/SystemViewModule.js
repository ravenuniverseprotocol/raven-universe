const RESOURCE_SECTORS = {
    "IRON": { x: 1500, y: -1200 },
    "TITANIUM": { x: -1800, y: 1500 },
    "FUSION_CELLS": { x: 2200, y: 2200 },
    "OXYGEN": { x: -1500, y: -2000 }
};
window.RESOURCE_SECTORS = RESOURCE_SECTORS;

class SystemView {
    constructor() {
        this.canvas = document.getElementById('systemViewCanvas');
        // If canvas is missing (UI removed), we still want the class for data
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        this.systemName = "UNKNOWN";
        this.offset = { x: 0, y: 0 };
        this.viewCenter = { x: 0, y: 0 }; // Camera focus (World Specs)
        this.targetSystem = "LOCAL";
        this.zoom = 1.0;
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.pulseTime = 0;

        this.stationImg = new Image();
        this.stationImg.src = 'assets/media/StationRaven.webp';

        this.minerImg = new Image();
        this.minerImg.src = 'assets/media/MinerRaven.png';

        this.playerShips = [
            {
                id: 'MINER-01',
                type: 'miner',
                shipClass: 'Industrial Mining Vessel',
                description: 'Heavy automated unit designed for asteroid resource extraction.',
                miningTarget: null,
                launchVector: { x: 1500, y: 1500 },
                x: 0, y: 0,
                targetX: 0, targetY: 0,
                speed: 2,
                angle: 0,
                selected: false,
                docked: true,
                status: 'DOCKED',
                cargo: 0,
                capacity: 100
            }
        ];

        if (this.canvas) {
            this.setupEvents();
            this.resize();
        }
        window.addEventListener('resize', () => this.resize());
        this.startAnimation();
    }

    startAnimation() {
        let lastTime = performance.now();
        const loop = (time) => {
            const dt = (time - lastTime) / 1000;
            lastTime = time;
            this.pulseTime = time / 1000;

            this.updateShips(dt);
            if (this.isVisible()) {
                this.draw();
            }
            this.animId = requestAnimationFrame(loop);
        };
        this.animId = requestAnimationFrame(loop);
    }

    isVisible() {
        const win = document.getElementById('system-view-window');
        return win && win.style.display !== 'none';
    }

    updateShips(dt) {
        this.playerShips.forEach(ship => {
            if (ship.docked) return;

            const dx = (ship.targetX || 0) - ship.x;
            const dy = (ship.targetY || 0) - ship.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 1. CINEMATIC STATES (UNDOCKING / RETURNING NEAR BASE)
            if (ship.status === 'UNDOCKING') {
                const launchBonus = window.skillManager ? window.skillManager.getLaunchSpeedFactor() : 1;
                ship.alpha += 0.02 * launchBonus * (dt * 60);
                ship.scale += 0.016 * launchBonus * (dt * 60);
                if (ship.alpha >= 1) {
                    ship.alpha = 1;
                    ship.scale = 1;
                    ship.status = (ship.miningTarget) ? 'LAUNCHING' : 'TRANSIT';
                }
                return; // Wait for animation
            }

            if (ship.status === 'RETURNING') {
                const distToOrigin = Math.sqrt(ship.x * ship.x + ship.y * ship.y);
                if (distToOrigin < 15) {
                    const recallBonus = window.skillManager ? window.skillManager.getLaunchSpeedFactor() : 1;
                    ship.alpha -= 0.02 * recallBonus * (dt * 60);
                    ship.scale -= 0.016 * recallBonus * (dt * 60);

                    if (ship.alpha <= 0) {
                        ship.alpha = 0;
                        ship.scale = 0.2;
                        ship.docked = true;
                        ship.status = 'DOCKED';
                        ship.x = 0; ship.y = 0;

                        // TRANSFER CARGO
                        if (ship.cargo > 0 && window.skillManager) {
                            const qty = Math.floor(ship.cargo);
                            window.skillManager.addToInventory(ship.miningTarget, qty);
                            if (typeof showGameNotification === 'function') {
                                showGameNotification(`COLLECTION COMPLETE: ${ship.id} DELIVERED ${qty} ${ship.miningTarget}`);
                            }
                        }
                        ship.cargo = 0;
                        if (typeof renderHangar === 'function') renderHangar();
                    }
                    return; // Wait for animation
                }
            }

            // 2. MOVEMENT LOGIC
            if (dist > 5) {
                const angleToTarget = Math.atan2(dy, dx);
                let angleDiff = angleToTarget - ship.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                const turnSpeed = dist < 100 ? 0.15 : 0.05;
                ship.angle += angleDiff * turnSpeed;

                const moveSpeed = (ship.speed || 2) * 60 * dt;
                ship.x += Math.cos(ship.angle) * moveSpeed;
                ship.y += Math.sin(ship.angle) * moveSpeed;

                if (ship.status === 'IDLE') ship.status = 'TRANSIT';
            } else {
                // ARRIVAL AT TARGET
                if (ship.status === 'LAUNCHING' || ship.status === 'TRANSIT') {
                    if (ship.miningTarget) {
                        ship.status = 'MINING';
                        if (typeof showGameNotification === 'function') {
                            showGameNotification(`${ship.id} COMMENCING EXTRACTION AT ${ship.miningTarget}`);
                        }
                    } else {
                        ship.status = 'IDLE';
                    }
                }
            }

            // 3. MINING ACCUMULATION
            if (ship.status === 'MINING') {
                if (ship.cargo < ship.capacity) {
                    const efficiency = window.skillManager ? window.skillManager.getGlobalEfficiencyMultiplier() : 1;
                    const richNodeChance = window.skillManager ? window.skillManager.getRichNodeDiscoveryChance() : 0;
                    const richBonus = Math.random() < richNodeChance ? 1.25 : 1;

                    ship.cargo += 0.2 * efficiency * richBonus * (dt * 60);
                    if (ship.cargo >= ship.capacity) {
                        ship.cargo = ship.capacity;
                        ship.status = 'RETURNING';
                        ship.targetX = 0;
                        ship.targetY = 0;
                        if (typeof showGameNotification === 'function') showGameNotification(`${ship.id} CARGO FULL - RETURNING`);
                    }
                }
            }

            // 4. MAP TRACKING / BOUNDARY
            const halfW = window.innerWidth / 2;
            const halfH = window.innerHeight / 2;
            const range = window.skillManager ? window.skillManager.getRadarRange() : 500;
            const distToStation = Math.sqrt(ship.x * ship.x + ship.y * ship.y);

            // Transition to Map when outside local screen OR beyond radar range
            const isOutsideLocal = Math.abs(ship.x) > halfW || Math.abs(ship.y) > halfH || distToStation > range;

            if (isOutsideLocal && !ship.onMap) {
                ship.onMap = true;
                if (typeof showGameNotification === 'function') {
                    showGameNotification(`TRACKING: ${ship.id} ENTERED DEEP SECTOR`);
                }
            }
            if (!isOutsideLocal && ship.onMap) {
                ship.onMap = false;
            }

            if (typeof renderHangar === 'function') renderHangar();
        });
    }

    setupEvents() {
        if (!this.canvas) return;
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left-click for selection
                this.isDragging = true;
                this.lastMouse = { x: e.clientX, y: e.clientY };

                // World coords click detection
                const rect = this.canvas.getBoundingClientRect();
                const mx = (e.clientX - rect.left - this.width / 2) / this.zoom - this.offset.x;
                const my = (e.clientY - rect.top - this.height / 2) / this.zoom - this.offset.y;

                let found = false;
                this.playerShips.forEach(ship => {
                    const d = Math.sqrt((mx - ship.x) ** 2 + (my - ship.y) ** 2);
                    if (d < 30) {
                        ship.selected = true;
                        found = true;
                    } else {
                        ship.selected = false;
                    }
                });
            }
        });

        // Context menu for commanding
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const wx = (e.clientX - rect.left - this.width / 2) / this.zoom - this.offset.x;
            const wy = (e.clientY - rect.top - this.height / 2) / this.zoom - this.offset.y;

            this.playerShips.forEach(ship => {
                if (ship.selected && !ship.docked) {
                    ship.targetX = wx;
                    ship.targetY = wy;
                }
            });
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.offset.x += dx / this.zoom;
            this.offset.y += dy / this.zoom;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= delta;
            this.zoom = Math.max(0.5, Math.min(this.zoom, 10));
        }, { passive: false });

        const resetBtn = document.getElementById('system-view-reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.offset = { x: 0, y: 0 };
                this.zoom = 1.0;
            };
        }
    }

    resize() {
        if (!this.canvas) return;
        const container = this.canvas.parentElement;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    open(systemName) {
        this.systemName = systemName;
        const title = document.getElementById('system-view-title');
        if (title) title.textContent = `TACTICAL SYSTEM VIEW - ${systemName}`;

        // CAMERA LOGIC: Focus on player or NPC base (DRAX)
        if (systemName === "10.05.29" || systemName === "LOCAL") {
            this.targetSystem = "LOCAL";
            this.viewCenter = { x: 0, y: 0 };
        } else if (window.npcManager) {
            // Support both station names and technical system IDs
            let npc = window.npcManager.npcs.find(n => n.stationName === systemName);

            if (!npc && window.galaxyMap) {
                const sys = window.galaxyMap.systems.find(s => s.name === systemName);
                if (sys && sys.owner) {
                    npc = window.npcManager.npcs.find(n => n.name === sys.owner);
                }
            }

            if (npc) {
                this.targetSystem = npc.name;
                this.viewCenter = { x: npc.homeX, y: npc.homeY };
            }
        }
        this.resize();
    }

    isVisibleOnMainScreen(x, y) {
        // The main screen shows space in a 1:1 pixel ratio around the station (0,0)
        // We sync visibility exactly with the screen bounds (the orange lines)
        const halfW = window.innerWidth / 2;
        const halfH = window.innerHeight / 2;
        const margin = 10; // Small buffer for visual smoothing
        return Math.abs(x) < (halfW + margin) && Math.abs(y) < (halfH + margin);
    }

    isShipOnScreen(shipId) {
        const ship = this.playerShips.find(s => s.id === shipId);
        if (!ship || ship.docked) return false;

        // If it's on the main screen, it's "On Screen" (visual), so NOT on tactical/radar
        if (this.isVisibleOnMainScreen(ship.x, ship.y)) return true;

        return false;
    }

    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(this.offset.x, this.offset.y);

        // Apply View Center Shift (Remote Observation)
        ctx.translate(-this.viewCenter.x, -this.viewCenter.y);

        this.drawGrid(ctx);
        this.drawRadarRange(ctx);
        this.drawResourceFields(ctx);
        this.drawHome(ctx);
        this.drawShips(ctx, false); // Draw with tactical labels
        this.drawEntities(ctx);

        ctx.restore();
        this.drawUI(ctx);
    }

    drawRadarRange(ctx) {
        if (!window.skillManager) return;
        const range = window.skillManager.getRadarRange();

        // Pulsing effect
        const pulse = 1 + Math.sin(Date.now() / 500) * 0.02;

        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, range * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
        ctx.lineWidth = 2 / this.zoom;
        ctx.setLineDash([10 / this.zoom, 5 / this.zoom]);
        ctx.stroke();

        // BORDER WARNING (Sovereignty Protocol)
        ctx.strokeStyle = 'rgba(255, 50, 0, 0.15)';
        ctx.setLineDash([5 / this.zoom, 10 / this.zoom]);
        ctx.beginPath();
        ctx.arc(0, 0, 2500, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    drawBackgroundShips(mainCtx, w, height) {
        mainCtx.save();
        mainCtx.translate(w / 2, height / 2);
        // ONLY draw if actually within the main screen bounds
        this.playerShips.forEach(ship => {
            if (ship.docked) return;
            if (this.isVisibleOnMainScreen(ship.x, ship.y)) {
                this.drawSingleShip(mainCtx, ship, true);
            }
        });
        mainCtx.restore();
    }

    drawGrid(ctx) {
        const size = 10000;
        const spacing = 100;

        ctx.strokeStyle = 'rgba(80, 150, 200, 0.15)';
        ctx.lineWidth = 1;

        // Main Grid
        for (let x = -size; x <= size; x += spacing) {
            ctx.beginPath(); ctx.moveTo(x, -size); ctx.lineTo(x, size); ctx.stroke();
        }
        for (let y = -size; y <= size; y += spacing) {
            ctx.beginPath(); ctx.moveTo(-size, y); ctx.lineTo(size, y); ctx.stroke();
        }

        // Sector Coords (Simplified)
        ctx.fillStyle = 'rgba(80, 150, 200, 0.4)';
        ctx.font = '10px monospace';
        for (let x = -500; x <= 500; x += spacing) {
            for (let y = -500; y <= 500; y += spacing) {
                if (Math.abs(x) % 500 === 0 && Math.abs(y) % 500 === 0) {
                    ctx.fillText(`${x},${y}`, x + 5, y - 5);
                }
            }
        }
    }

    drawHome(ctx) {
        // Render either player station or NPC station at its respective coordinates
        let stations = [{ name: 'Raven Station', x: 0, y: 0 }];
        if (window.npcManager) {
            window.npcManager.npcs.forEach(npc => {
                stations.push({ name: npc.stationName, x: npc.homeX, y: npc.homeY });
            });
        }

        stations.forEach(s => {
            if (this.isVisibleOnMainScreen(s.x, s.y)) return;
            if (!this.stationImg.complete) return;

            const size = (s.x === 0 && s.y === 0) ? 30 / this.zoom : 20 / this.zoom;
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.globalAlpha = 0.8;
            ctx.drawImage(this.stationImg, -size / 2, -size / 2, size, size);

            // Station Label
            ctx.fillStyle = (s.x === 0 && s.y === 0) ? '#00ccff' : '#ffcc00';
            ctx.font = `bold ${10 / this.zoom}px Courier New`;
            ctx.textAlign = 'center';
            ctx.fillText(s.name, 0, size / 2 + 15);
            ctx.restore();
        });
    }

    drawResourceFields(ctx) {
        const filterLvl = window.skillManager ? window.skillManager.getInterferenceFilter() : 1;

        Object.keys(RESOURCE_SECTORS).forEach(res => {
            const pos = RESOURCE_SECTORS[res];
            ctx.save();
            ctx.translate(pos.x, pos.y);

            // Draw asteroid cluster area
            ctx.strokeStyle = 'rgba(255, 153, 0, 0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, 100, 0, Math.PI * 2);
            ctx.stroke();

            // Interference Static (Grain)
            if (filterLvl < 3) {
                const grainCount = (3 - filterLvl) * 80;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
                for (let i = 0; i < grainCount; i++) {
                    const gx = (Math.random() - 0.5) * 200;
                    const gy = (Math.random() - 0.5) * 200;
                    ctx.fillRect(gx, gy, 1, 1);
                }

                if (this.zoom > 1.0) {
                    ctx.fillStyle = 'rgba(255, 100, 0, 0.4)';
                    ctx.font = '8px monospace';
                    ctx.fillText("NOISE_DETECTED", 20, 10);
                }
            }

            // Draw asteroids
            ctx.fillStyle = filterLvl >= 2 ? '#555' : 'rgba(85, 85, 85, 0.3)';
            for (let i = 0; i < 5; i++) {
                const ox = Math.cos(i * 1.2) * 40;
                const oy = Math.sin(i * 1.2) * 40;
                ctx.beginPath();
                ctx.arc(ox, oy, 8 / this.zoom, 0, Math.PI * 2);
                ctx.fill();
            }

            // Label
            ctx.fillStyle = 'rgba(255, 153, 0, 0.6)';
            ctx.font = `${12 / this.zoom}px Outfit`;
            ctx.fillText(`${res} FIELD`, 20, -20);
            ctx.restore();
        });
    }

    drawBackgroundShips(mainCtx, w, height) {
        mainCtx.save();
        mainCtx.translate(w / 2, height / 2);
        this.drawShips(mainCtx, false); // Draw on background (no labels)
        mainCtx.restore();
    }

    drawShips(ctx, isTactical, singleShip = null) {
        const range = window.skillManager ? window.skillManager.getRadarRange() : 10000;

        let shipsToDraw = singleShip ? [singleShip] : [...this.playerShips];

        // Add NPC ships if not specifically drawing a single ship
        if (!singleShip && window.npcManager) {
            shipsToDraw = shipsToDraw.concat(window.npcManager.getAllShips());
        }

        const worldToScreenScale = 1;

        shipsToDraw.forEach(ship => {
            if (ship.docked) return;

            const distFromCamera = Math.sqrt((ship.x - this.viewCenter.x) ** 2 + (ship.y - this.viewCenter.y) ** 2);
            const isPlayer = this.playerShips.includes(ship);
            const shipColor = isPlayer ? '#00ff88' : '#ffcc00';

            // VISIBILITY RULE: Only show ships in the current "observed" sector
            // Unless it's a player ship (always tracked) or an NPC visiting player space
            const isNearPlayer = Math.sqrt(ship.x * ship.x + ship.y * ship.y) < 3000;
            if (distFromCamera > 3000 && !isPlayer && !isNearPlayer) return;

            // ENTRY PROTOCOL ALERT
            if (!isPlayer && isNearPlayer && !ship.permissionGranted && ship.status === 'TRADING') {
                if (typeof showGameNotification === 'function' && Math.random() < 0.001) {
                    showGameNotification(`IFF ALERT: ${ship.id} REQUESTING PERMISSION TO ENTER PLAYER SPACE`);
                }
            }

            // TACTICAL WINDOW RULE: If ship is visible on main screen, hide it from tactical window
            if (isTactical && this.isVisibleOnMainScreen(ship.x, ship.y)) return;

            // If it's further than radar, only show if it's a player ship or relatively close NPC
            if (isTactical && dist > range) {
                if (ship.onMap) return;
                // NPCs only show SIGNAL LOST if they are within a "border" range (e.g. 2000)
                if (!isPlayer && dist > range * 2) return;

                ctx.save();
                ctx.translate(ship.x * worldToScreenScale, ship.y * worldToScreenScale);
                ctx.fillStyle = isPlayer ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 204, 0, 0.2)';
                ctx.font = `${8 / this.zoom}px monospace`;
                ctx.fillText("SIGNAL LOST", 10, 0);
                ctx.beginPath();
                ctx.arc(0, 0, 2 / this.zoom, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
                return;
            };

            ctx.save();
            ctx.translate(ship.x * worldToScreenScale, ship.y * worldToScreenScale);
            ctx.rotate(ship.angle);

            const s = isTactical ? (10 / this.zoom) : 10;

            if (this.minerImg.complete) {
                ctx.save();
                ctx.globalAlpha = ship.alpha || 1.0;
                ctx.shadowBlur = 15;
                ctx.shadowColor = shipColor;

                // Color tinting NPCs (SVG filter or globalCompositeOperation)
                // For now, just change shadow color. 
                // To actually change image color we'd need a canvas buffer, but shadow is enough for IFF.
                ctx.drawImage(this.minerImg, -s, -s, s * 2, s * 2);
                ctx.restore();
            } else {
                ctx.fillStyle = shipColor;
                ctx.beginPath();
                ctx.moveTo(s, 0); ctx.lineTo(-s, s * 0.7); ctx.lineTo(-s * 0.5, 0); ctx.lineTo(-s, -s * 0.7);
                ctx.closePath();
                ctx.fill();
            }

            if (isTactical && ship.selected) {
                ctx.strokeStyle = '#00ccff';
                ctx.lineWidth = 1;
                ctx.strokeRect(-s * 1.5, -s * 1.5, s * 3, s * 3);
            }

            ctx.restore();
        });
    }

    drawEntities(ctx) {
        if (!window.tacticalRadar) return;
        const range = window.skillManager ? window.skillManager.getRadarRange() : 500;
        const res = window.skillManager ? window.skillManager.getSignalResolution() : 1;
        const entities = window.tacticalRadar.entities;

        entities.forEach(ent => {
            // Convert polar (Radar) to Cartesian (System View)
            const worldDist = ent.dist * 3000;
            const ex = worldDist * Math.cos(ent.angle);
            const ey = worldDist * Math.sin(ent.angle);

            const distToCenter = Math.sqrt(ex * ex + ey * ey);

            // Gating by Radar Range
            if (distToCenter > range) return;

            const s = (ent.size || 5) / this.zoom;

            // Signal Resolution Logic
            if (res < 2) {
                // THERMAL BLOB
                const gradient = ctx.createRadialGradient(ex, ey, 0, ex, ey, s * 4);
                gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
                gradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.3)');
                gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(ex, ey, s * 4, 0, Math.PI * 2);
                ctx.fill();
                return;
            }

            // IFF / Type Coloring
            if (res >= 3) {
                if (ent.type === 'asteroid') ctx.fillStyle = '#888888';
                else if (ent.type === 'hostile') ctx.fillStyle = '#ff4444';
                else if (ent.type === 'neutral') ctx.fillStyle = '#aaaaaa';
                else ctx.fillStyle = ent.color || '#5096c8';
            } else {
                ctx.fillStyle = '#5096c8';
            }

            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 1 / this.zoom;

            if (ent.type === 'asteroid') {
                ctx.beginPath();
                ctx.moveTo(ex + s, ey);
                for (let i = 1; i < 6; i++) {
                    const a = (i * Math.PI * 2) / 6;
                    ctx.lineTo(ex + Math.cos(a) * s, ey + Math.sin(a) * s);
                }
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.strokeRect(ex - s, ey - s, s * 2, s * 2);
                ctx.beginPath();
                ctx.arc(ex, ey, 2 / this.zoom, 0, Math.PI * 2);
                ctx.fill();
            }

            if (this.zoom > 1.5 && res >= 3) {
                ctx.font = `${8 / this.zoom}px monospace`;
                ctx.fillText(ent.id || 'OBJ-X', ex + s + 2, ey + s);
            }
        });
    }

    drawUI(ctx) {
        // Crosshair center
        ctx.strokeStyle = 'rgba(80, 150, 200, 0.3)';
        ctx.lineWidth = 1;
        const cl = 20;
        ctx.beginPath();
        ctx.moveTo(this.width / 2 - cl, this.height / 2); ctx.lineTo(this.width / 2 + cl, this.height / 2);
        ctx.moveTo(this.width / 2, this.height / 2 - cl); ctx.lineTo(this.width / 2, this.height / 2 + cl);
        ctx.stroke();

        // Update coord text
        const mx = (-this.offset.x).toFixed(2);
        const my = (-this.offset.y).toFixed(2);
        const coordDisplay = document.getElementById('system-view-coords');
        if (coordDisplay) coordDisplay.textContent = `REL_POS: ${mx} / ${my}`;
    }
}

function initSystemView() {
    window.systemView = new SystemView();
    const win = document.getElementById('system-view-window');
    if (win) {
        if (typeof makeDraggable === 'function') makeDraggable(win);
    }
}

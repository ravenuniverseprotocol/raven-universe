class GalaxyMap {
    constructor() {
        this.canvas = document.getElementById('galaxyMapCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        this.galaxyName = "NEBULIS PRIME";
        this.systems = [];

        // Get dynamic home data from skillManager
        const homeName = window.skillManager ? window.skillManager.homeSystem : "10.05.29";
        this.currentSystemId = `S${homeName}`;

        this.offset = { x: 0, y: 0 };
        this.zoom = 1.0;
        this.isDragging = false;
        this.lastMouse = { x: 0, y: 0 };
        this.pulseTime = 0;

        this.mapStars = [];
        this.nebulae = [];

        this.initGalaxyData();
        this.initVisualDecor();
        this.setupEvents();
        this.resize();
        this.lastPlayerFetchTime = 0;

        window.addEventListener('resize', () => this.resize());
        this.lastPlayerFetchTime = 0;
        this.startAnimation();

        // Initial fetch and periodic refresh
        this.fetchOtherPlayers();
        setInterval(() => this.fetchOtherPlayers(), 60000);
    }

    createSeededRandom(seed) {
        let s = seed;
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    startAnimation() {
        const loop = (time) => {
            this.pulseTime = time / 1000;
            this.render();
            this.animId = requestAnimationFrame(loop);
        };
        this.animId = requestAnimationFrame(loop);
    }

    initGalaxyData() {
        const seededRandom = this.createSeededRandom(777); // Fixed seed for systems
        const count = 100;
        const spread = 2000;

        // Dynamic Home Node from SkillManager
        const homeName = window.skillManager ? window.skillManager.homeSystem : "10.05.29";
        const homeCoords = window.skillManager ? window.skillManager.homeCoords : { x: 0, y: 0 };

        this.systems.push({
            id: `S${homeName}`,
            name: homeName,
            x: homeCoords.x,
            y: homeCoords.y,
            isHome: true,
            owner: "PLAYER"
        });

        // Center view on home node initially
        this.offset = { x: -homeCoords.x, y: -homeCoords.y };

        const npcNames = ["DRAX", "KARA", "VEX", "ZORP", "NOMAD"];

        for (let i = 1; i < count; i++) {
            const a = seededRandom() * Math.PI * 2;
            const r = Math.sqrt(seededRandom()) * spread;

            // Random technical name format XX.XX.XX
            const p1 = Math.floor(seededRandom() * 99).toString().padStart(2, '0');
            const p2 = Math.floor(seededRandom() * 99).toString().padStart(2, '0');
            const p3 = Math.floor(seededRandom() * 99).toString().padStart(2, '0');

            const sys = {
                id: `S${p1}.${p2}.${p3}`,
                name: `${p1}.${p2}.${p3}`,
                x: Math.cos(a) * r,
                y: Math.sin(a) * r,
                isHome: false,
                owner: null
            };

            // Assign to NPC if it's one of their designated slots and distant
            if (npcNames.length > 0 && r > 1000 && i % 15 === 0) {
                const name = npcNames.shift();
                sys.owner = name;
                // isNPCBase removed as per user request
            }

            this.systems.push(sys);
        }
    }

    async fetchOtherPlayers() {
        const token = localStorage.getItem('raven_token');
        if (!token) return;

        const API_BASE_URL = window.location.protocol === 'file:' ? 'https://raven-universe.onrender.com' : '';

        try {
            const resp = await fetch(`${API_BASE_URL}/api/game/players`, {
                headers: { 'Authorization': token }
            });
            if (!resp.ok) return;

            const players = await resp.json();
            const localUsername = (window.skillManager && window.skillManager.commanderName) ? window.skillManager.commanderName.toUpperCase() : null;

            players.forEach(p => {
                const username = p.username.toUpperCase();
                if (username === localUsername) return; // Skip self

                const sysId = `S${p.homeSystem}`;

                // Check if already in list (could be generated or already fetched)
                let sys = this.systems.find(s => s.id === sysId);

                // CRITICAL FIX: If this is the local home system, do NOT overwrite it
                if (sys && sys.isHome) return;

                if (!sys) {
                    sys = {
                        id: sysId,
                        name: p.homeSystem,
                        x: p.homeCoords.x,
                        y: p.homeCoords.y,
                        isHome: false,
                        owner: username
                    };
                    this.systems.push(sys);
                }

                // Update properties for real player visibility
                sys.isOtherPlayer = true;
                sys.owner = username;
            });

            this.render(); // Redraw with new data
        } catch (err) {
            console.error('[MAP] Error fetching other players:', err);
        }
    }

    initVisualDecor() {
        const seededRandom = this.createSeededRandom(888); // Different seed for decor
        // High-depth background stars
        for (let i = 0; i < 200; i++) {
            this.mapStars.push({
                x: (seededRandom() - 0.5) * 4000,
                y: (seededRandom() - 0.5) * 4000,
                size: seededRandom() * 1.5,
                alpha: seededRandom() * 0.5 + 0.1
            });
        }

        // Procedural Nebulae (Blobs of color)
        const colors = ['rgba(80, 150, 255, 0.05)', 'rgba(255, 100, 255, 0.03)', 'rgba(100, 255, 200, 0.03)'];
        for (let i = 0; i < 15; i++) {
            this.nebulae.push({
                x: (seededRandom() - 0.5) * 3000,
                y: (seededRandom() - 0.5) * 3000,
                size: 400 + seededRandom() * 600,
                color: colors[Math.floor(seededRandom() * colors.length)]
            });
        }
    }

    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.lastMouse = { x: e.clientX, y: e.clientY };
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            const dx = e.clientX - this.lastMouse.x;
            const dy = e.clientY - this.lastMouse.y;
            this.offset.x += dx / this.zoom;
            this.offset.y += dy / this.zoom;
            this.lastMouse = { x: e.clientX, y: e.clientY };
            this.render();
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoom *= delta;
            this.zoom = Math.max(0.1, Math.min(this.zoom, 5));
            this.render();
        }, { passive: false });

        const resetBtn = document.getElementById('map-reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.offset = { x: 0, y: 0 };
                this.zoom = 1.0;
                this.render();
            };
        }

        // Selection by click
        this.canvas.addEventListener('click', (e) => {
            if (this.isDragging && Math.abs(e.clientX - this.lastMouse.x) > 2) return;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left - this.width / 2) / this.zoom - this.offset.x;
            const mouseY = (e.clientY - rect.top - this.height / 2) / this.zoom - this.offset.y;

            const found = this.systems.find(s => Math.sqrt((s.x - mouseX) ** 2 + (s.y - mouseY) ** 2) < 20 / this.zoom);
            if (found) {
                this.currentSystemId = found.id;
                this.updateHUD(found.name);
                this.render();
            }
        });

        // Detailed View by double click
        this.canvas.addEventListener('dblclick', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = (e.clientX - rect.left - this.width / 2) / this.zoom - this.offset.x;
            const mouseY = (e.clientY - rect.top - this.height / 2) / this.zoom - this.offset.y;

            const found = this.systems.find(s => Math.sqrt((s.x - mouseX) ** 2 + (s.y - mouseY) ** 2) < 20 / this.zoom);
            if (found) {
                this.viewSystem(found);
            }
        });
    }

    viewSystem(system) {
        // Gating: Only work if Radar Systems are at Level 1+
        if (!window.skillManager || !window.skillManager.checkRadarStatus()) {
            console.warn("Radar Systems insufficient for Tactical Scan.");
            // Trigger a visual notification (optional)
            if (typeof showGameNotification === 'function') {
                showGameNotification("RADAR SYSTEMS OFFLINE - TRAIN RADAR SKILLS TO LVL 1");
            }
            return;
        }

        this.currentSystemId = system.id;
        this.updateHUD(system.name);

        // Close map window
        const mapWin = document.getElementById('map-window');
        if (mapWin) mapWin.style.display = 'none';

        // Open TACTICAL SYSTEM VIEW window
        const sysWin = document.getElementById('system-view-window');
        if (sysWin) {
            sysWin.style.display = 'flex';
            if (window.systemView) {
                window.systemView.open(system.name);
            }
        }

        // Update Tactical Radar to show this system's data
        if (window.tacticalRadar) {
            window.tacticalRadar.generateSystemData(system.id);
        }

        console.log(`Viewing system: ${system.name}`);
    }

    updateHUD(systemName) {
        const display = document.getElementById('hud-system-name');
        if (display) display.textContent = systemName;
    }

    resize() {
        const container = this.canvas.parentElement;
        this.width = container.clientWidth;
        this.height = container.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.render();
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.width, this.height);

        ctx.save();
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(this.offset.x, this.offset.y);

        // 1. Background Map Stars (Parallax-ish)
        ctx.fillStyle = '#fff';
        this.mapStars.forEach(s => {
            ctx.globalAlpha = s.alpha;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Tactical Grid
        ctx.strokeStyle = 'rgba(80, 150, 200, 0.08)';
        ctx.lineWidth = 1;
        const gridSize = 200;
        const gridCount = 20;
        for (let i = -gridCount; i <= gridCount; i++) {
            ctx.beginPath();
            ctx.moveTo(i * gridSize, -gridCount * gridSize);
            ctx.lineTo(i * gridSize, gridCount * gridSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-gridCount * gridSize, i * gridSize);
            ctx.lineTo(gridCount * gridSize, i * gridSize);
            ctx.stroke();
        }

        // 3. Nebulae
        this.nebulae.forEach(n => {
            const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size);
            grad.addColorStop(0, n.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.globalAlpha = 1;
            ctx.fillRect(n.x - n.size, n.y - n.size, n.size * 2, n.size * 2);
        });

        // 4. Draw connections (high-tech lines)
        ctx.setLineDash([2, 5]);
        ctx.strokeStyle = 'rgba(80, 150, 200, 0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.systems.length; i++) {
            for (let j = i + 1; j < this.systems.length; j++) {
                const s1 = this.systems[i];
                const s2 = this.systems[j];
                const d = Math.sqrt((s1.x - s2.x) ** 2 + (s1.y - s2.y) ** 2);
                if (d < 350) {
                    ctx.beginPath();
                    ctx.moveTo(s1.x, s1.y);
                    ctx.lineTo(s2.x, s2.y);
                    ctx.stroke();
                }
            }
        }
        ctx.setLineDash([]);

        // 5. Draw Systems
        this.systems.forEach(s => {
            const isSelected = s.id === this.currentSystemId;
            const pulse = (Math.sin(this.pulseTime * 4) + 1) / 2;

            // DRAW BASE GLOW
            if (isSelected || s.isHome || s.isOtherPlayer) {
                const glowSize = (isSelected ? 15 : 10) + (pulse * 5);
                const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowSize);

                let color = 'rgba(255, 255, 255,';
                if (s.isHome) color = 'rgba(0, 204, 255,'; // Local Player = Blue
                if (s.isOtherPlayer) color = 'rgba(255, 153, 0,'; // Other Players = Orange

                grad.addColorStop(0, color + (0.4 + pulse * 0.1) + ')');
                grad.addColorStop(1, color + '0)');
                ctx.fillStyle = grad;
                ctx.fillRect(s.x - glowSize, s.y - glowSize, glowSize * 2, glowSize * 2);

                // Pulsing ring
                ctx.strokeStyle = color + (0.2 + pulse * 0.3) + ')';
                ctx.beginPath();
                ctx.arc(s.x, s.y, isSelected ? 8 + pulse * 4 : 6 + pulse * 2, 0, Math.PI * 2);
                ctx.stroke();
            }

            // CORE
            if (s.isHome) {
                ctx.fillStyle = '#00ccff'; // My Station = Blue
            } else if (s.isOtherPlayer) {
                ctx.fillStyle = '#ff9900'; // Others = Orange
            } else {
                ctx.fillStyle = isSelected ? '#fff' : 'rgba(255,255,255,0.4)';
            }

            ctx.beginPath();
            ctx.arc(s.x, s.y, isSelected ? 4 : 2, 0, Math.PI * 2);
            ctx.fill();

            // Labels
            if (this.zoom > 0.45) {
                ctx.globalAlpha = Math.min(1, (this.zoom - 0.45) * 2);

                ctx.textAlign = 'center';
                if (s.isNPCBase) {
                    ctx.fillStyle = '#ffcc00';
                    ctx.font = 'bold 9px Courier New';
                    const npc = window.npcManager ? window.npcManager.npcs.find(n => n.name === s.owner) : null;
                    const label = npc ? `${npc.stationName}` : s.name;
                    ctx.fillText(label, s.x, s.y + 16);
                } else {
                    ctx.fillStyle = isSelected ? '#fff' : 'rgba(200, 220, 255, 0.6)';
                    ctx.font = isSelected ? 'bold 10px Courier New' : '8px Courier New';

                    const label = s.isOtherPlayer ? `CMDR ${s.owner}` : s.name;
                    ctx.fillText(label, s.x, s.y + 14);

                    if (s.isOtherPlayer) {
                        ctx.font = '7px Courier New';
                        ctx.fillStyle = 'rgba(255, 153, 0, 0.6)';
                        ctx.fillText(s.name, s.x, s.y + 24);
                    }
                }
                ctx.globalAlpha = 1.0;
            }
        });

        // 6. Draw Radar Range for Home Node
        this.renderRadarCoverage(ctx);

        // 7. Draw Player Activity (Ships)
        this.drawPlayerActivity(ctx);

        ctx.restore();

        // Map Info (Top layer)
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,153,0,0.8)';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'left';
        ctx.fillText(`SECTOR: ${this.galaxyName}`, 30, this.height - 30);
        ctx.fillText(`ZOOM: ${Math.round(this.zoom * 100)}%`, 30, this.height - 45);
        ctx.fillText(`SYSTEMS: ${this.systems.length}`, 30, this.height - 60);

        // Scanlines Overlay (Map specific)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        for (let i = 0; i < this.height; i += 3) {
            ctx.fillRect(0, i, this.width, 1);
        }
    }

    renderRadarCoverage(ctx) {
        if (!window.skillManager) return;
        const homeId = `S${window.skillManager.homeSystem}`;
        const homeNode = this.systems.find(s => s.id === homeId);
        if (!homeNode) return;

        const range = window.skillManager.getRadarRange();
        const halfW = window.innerWidth / 2;
        const mapScale = 8 / halfW;
        const mapRange = range * mapScale;

        const pulse = 1 + Math.sin(this.pulseTime * 2) * 0.05;

        ctx.save();
        ctx.beginPath();
        ctx.arc(homeNode.x, homeNode.y, mapRange * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 1 / this.zoom;
        ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
        ctx.stroke();

        ctx.fillStyle = 'rgba(0, 255, 255, 0.05)';
        ctx.fill();
        ctx.restore();
    }

    drawPlayerActivity(ctx) {
        if (!window.systemView || !window.systemView.playerShips) return;
        if (!window.npcManager || !window.skillManager) return;

        const homeId = `S${window.skillManager.homeSystem}`;
        const playerHomeNode = this.systems.find(s => s.id === homeId);
        if (!playerHomeNode) return;

        // Coordinate scaling
        const halfW = window.innerWidth / 2;
        const mapScale = 8 / halfW;

        // 1. Draw Player Ships (Relative to their home)
        window.systemView.playerShips.forEach(ship => {
            if (ship.docked || !ship.onMap) return;
            this.drawMapShip(ctx, playerHomeNode, ship, mapScale, '#00ff88');
        });

        // 2. Draw NPC Ships section removed as per user request (legacy test data)
    }

    drawMapShip(ctx, homeNode, ship, mapScale, color) {
        const sx = homeNode.x + (ship.x * mapScale);
        const sy = homeNode.y + (ship.y * mapScale);

        const pulse = (Math.sin(this.pulseTime * 8) + 1) / 2;

        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;

        ctx.beginPath();
        ctx.arc(sx, sy, 3 / this.zoom, 0, Math.PI * 2);
        ctx.fill();

        // Outer pulse ring
        ctx.strokeStyle = `rgba(${color === '#00ff88' ? '0, 255, 136' : '255, 204, 0'}, ${0.5 - pulse * 0.3})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (5 + pulse * 5) / this.zoom, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;

        if (this.zoom > 1.2) {
            ctx.fillStyle = color;
            ctx.font = `${8 / this.zoom}px monospace`;
            ctx.fillText(ship.id, sx + 8 / this.zoom, sy + 3 / this.zoom);
        }
    }
}

function initMap() {
    window.galaxyMap = new GalaxyMap();

    const mapBtn = document.querySelector('[title="Map"]');
    const mapWindow = document.getElementById('map-window');

    if (mapBtn && mapWindow) {
        // Enable free movement
        if (typeof makeDraggable === 'function') makeDraggable(mapWindow);

        mapBtn.onclick = () => {
            // Close other windows logic (simplified)
            document.querySelectorAll('.window-modal').forEach(w => w.style.display = 'none');
            mapWindow.style.display = 'flex';
            setTimeout(() => window.galaxyMap.resize(), 50);
        };
    }
}

class StationHUD {
    constructor() {
        this.coreCanvas = document.getElementById('hudCoreCanvas');
        this.coreCtx = this.coreCanvas.getContext('2d');
        this.root = document.querySelector('.hud-cockpit-root');
        this.perspective = document.querySelector('.hud-perspective-container');

        // Volumetric Engine Data
        this.particles = [];
        this.clouds = [];
        this.lastUpdateTime = performance.now();
        this.frameCount = 0;
        this.currentGridLevel = 0;

        // Reactive Data Tracking
        this.vShield = 100;
        this.cShield = 100;
        this.cArmor = 100;
        this.cHull = 100;

        // Oxygen System Data
        this.maxOxygen = 1000;
        this.lastConsumTime = Date.now();

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // 2.5D Parallax Mouse Tracking
        window.addEventListener('mousemove', (e) => this.handleParallax(e));

        // Initial setup
        this.createSystems(1);
        this.generateTickMarks();
        this.initOxygenConsumption();
        requestAnimationFrame((t) => this.loop(t));
    }

    generateTickMarks() {
        const group = document.querySelector('.hud-tick-marks');
        if (!group) return;

        group.innerHTML = '';
        const arcs = [
            { r: 100, count: 20 },
            { r: 115, count: 24 },
            { r: 130, count: 28 }
        ];

        arcs.forEach(arc => {
            for (let i = 0; i <= arc.count; i++) {
                const angle = Math.PI + (i / arc.count) * Math.PI;
                const x1 = 160 + Math.cos(angle) * (arc.r - 2);
                const y1 = 160 + Math.sin(angle) * (arc.r - 2);
                const x2 = 160 + Math.cos(angle) * (arc.r + 2);
                const y2 = 160 + Math.sin(angle) * (arc.r + 2);

                const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", x1);
                line.setAttribute("y1", y1);
                line.setAttribute("x2", x2);
                line.setAttribute("y2", y2);
                line.setAttribute("stroke", "rgba(255,255,255,0.1)");
                line.setAttribute("stroke-width", "1");
                group.appendChild(line);
            }
        });

        this.updateOxygenHUD();
    }

    initOxygenConsumption() {
        setInterval(() => {
            if (!window.skillManager || !window.skillManager.isOnline) {
                const burnValue = document.getElementById('o2-burn-value');
                if (burnValue) burnValue.innerText = "0.00";
                return;
            }

            const scrubLvl = window.skillManager.skills['atmospheric_scrubbing'] ? window.skillManager.skills['atmospheric_scrubbing'].level : 1;

            // Base Rate: 0.5 units per second
            // Formula: Base * (1 - (Lvl * 0.19))
            // Lvl 1: 0.5 * 0.81 = 0.405/s
            // Lvl 5: 0.5 * 0.05 = 0.025/s
            const baseRate = 0.5;
            const efficiency = 1 - (scrubLvl * 0.19);
            const currentBurn = baseRate * efficiency;

            // Update UI Readout
            const burnValue = document.getElementById('o2-burn-value');
            if (burnValue) {
                burnValue.innerText = currentBurn.toFixed(3);
                const readout = document.getElementById('o2-burn-readout');
                if (readout) {
                    readout.style.color = currentBurn > 0.3 ? '#ff9900' : '#00ff88';
                }
            }

            // Continuous Consumption
            if (window.skillManager.inventory['OXYGEN'] > 0) {
                window.skillManager.inventory['OXYGEN'] -= currentBurn;
                if (window.skillManager.inventory['OXYGEN'] < 0) window.skillManager.inventory['OXYGEN'] = 0;

                // Save occasionally or on every tick? 
                // To avoid excessive IO, we save every tick but it's local storage.
                // In a heavier game, we'd throttle this.
                window.skillManager.save();
            }
        }, 1000); // Check every 1s
    }

    updateOxygenHUD() {
        const fill = document.getElementById('oxygen-bar-fill');
        if (!fill || !window.skillManager) return;

        const currentO2 = window.skillManager.inventory['OXYGEN'] || 0;
        const percent = Math.min(100, (currentO2 / this.maxOxygen) * 100);

        fill.style.height = `${percent}%`;

        // Visual warning if low
        const container = document.getElementById('oxygen-hud');
        if (container) {
            if (percent < 20) container.classList.add('emergency-blink');
            else container.classList.remove('emergency-blink');
        }
    }

    createSystems(level) {
        const targetCount = level * 20;

        // Adjust particle count dynamically
        if (this.particles.length < targetCount) {
            for (let i = this.particles.length; i < targetCount; i++) {
                this.particles.push({
                    angle: Math.random() * Math.PI * 2,
                    radius: 5 + Math.random() * 45,
                    speed: 0.02 + Math.random() * 0.06,
                    size: 1.0 + Math.random() * 2.0, // Thicker particles
                    history: []
                });
            }
        } else if (this.particles.length > targetCount) {
            this.particles.splice(targetCount);
        }

        // Volumetric Energy Clouds
        if (this.clouds.length === 0) {
            for (let i = 0; i < 6; i++) {
                this.clouds.push({
                    angle: (i / 6) * Math.PI * 2,
                    pulse: Math.random() * Math.PI,
                    dist: 2 + Math.random() * 20
                });
            }
        }
    }

    resize() {
        if (!this.coreCanvas) return;
        const dpr = window.devicePixelRatio || 1;

        // Use nominal dimensions to keep drawing logic (60,60 center) consistent
        // even when the element is scaled by CSS transforms
        const w = 120;
        const h = 120;

        this.coreCanvas.width = w * dpr;
        this.coreCanvas.height = h * dpr;

        this.coreCtx.resetTransform();
        this.coreCtx.scale(dpr, dpr);

        this.needsResize = false;
    }

    handleParallax(e) {
        if (!this.perspective) return;
        const x = (e.clientX / window.innerWidth) - 0.5;
        const y = (e.clientY / window.innerHeight) - 0.5;

        const rotateX = y * -6;
        const rotateY = x * 10;
        this.perspective.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    }

    update(now) {
        const dt = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;
        this.frameCount++;

        const isOnline = (window.skillManager) ? window.skillManager.isOnline : false;

        if (!isOnline) {
            if (this.root) this.root.style.display = 'none';
            return;
        } else if (this.root) {
            this.root.style.display = 'block';
            if (this.needsResize) this.resize();
        }

        const gridLvl = (window.skillManager && window.skillManager.skills['power_grid_calibration'])
            ? window.skillManager.skills['power_grid_calibration'].level
            : 1;

        // 1. DYNAMIC POWER LOGIC (Phase 4)
        const totalLevelSupply = gridLvl * 20; // 20% per lvl
        let currentLoad = 0;

        const radarActive = (window.skillManager && window.skillManager.checkRadarStatus());
        const shieldActive = (window.skillManager && window.skillManager.checkShieldStatus());
        const weaponsActive = (window.skillManager && window.skillManager.skills['ordnance_systems_ignition'] && window.skillManager.skills['ordnance_systems_ignition'].level >= 1 && gridLvl >= 4);

        if (radarActive) currentLoad += 15;
        if (shieldActive) currentLoad += 35;
        if (weaponsActive) currentLoad += 20;

        const netYield = Math.max(0, totalLevelSupply - currentLoad);
        this.isHighLoad = (currentLoad / totalLevelSupply) > 0.85;

        // Dynamic Scaling: Update systems if grid level changed
        if (this.currentGridLevel !== gridLvl) {
            this.currentGridLevel = gridLvl;
            this.createSystems(gridLvl);
        }

        // 2. Update Core Particles (Physics + Trails)
        // Energy Multiplier now reacts to Load: High load makes it pulse faster/nervously
        const stressFactor = this.isHighLoad ? 1.5 : 1.0;
        const energyMultiplier = (0.8 + (gridLvl * 0.4)) * stressFactor;

        this.particles.forEach(p => {
            p.angle += p.speed * energyMultiplier;
            const tx = 60 + Math.cos(p.angle) * p.radius;
            const ty = 60 + Math.sin(p.angle) * p.radius;

            p.history.push({ x: tx, y: ty });
            if (p.history.length > 15) p.history.shift();
            p.x = tx; p.y = ty;
        });

        // 3. Status Data
        this.vShield = (window.shieldManager) ? window.shieldManager.shieldPercent : 100;
        this.cShield += (this.vShield - this.cShield) * 0.1;

        const tArmor = 100;
        const tHull = 100;
        this.cArmor += (tArmor - this.cArmor) * 0.1;
        this.cHull += (tHull - this.cHull) * 0.1;

        this.updateArcs();
        this.updateLEDs(radarActive, shieldActive);

        const readout = document.getElementById('hud-power-percent');
        if (readout) readout.innerText = Math.floor(netYield);
    }

    updateArcs() {
        // Path Lengths:
        // Hull (R100): ~314 (PI * 100)
        // Armor (R115): ~361 (PI * 115)
        // Shield (R130): ~408 (PI * 130)

        const shdArc = document.getElementById('shield-arc');
        const armArc = document.getElementById('armor-arc');
        const hulArc = document.getElementById('hull-arc');

        if (shdArc) shdArc.style.strokeDasharray = `${408 * (this.cShield / 100)} 408`;
        if (armArc) armArc.style.strokeDasharray = `${361 * (this.cArmor / 100)} 361`;
        if (hulArc) hulArc.style.strokeDasharray = `${314 * (this.cHull / 100)} 314`;
    }

    updateLEDs(radarActive, shieldActive) {
        const updateLED = (id, active) => {
            const el = document.querySelector(`.led-item.${id} .led`);
            if (!el) return;

            // Flicker logic for high load
            const flicker = (this.isHighLoad && Math.random() > 0.7);

            if (active && !flicker) el.classList.add('active');
            else el.classList.remove('active');
        };

        // SHD LED reflects Shield activity
        updateLED('shd', shieldActive);

        // ARM LED reflects Radar activity (System Load sensor)
        updateLED('arm', radarActive);

        // HUL LED reflects Reactor Stability (Flickers on High Load)
        updateLED('hul', true);
    }

    draw() {
        const ctx = this.coreCtx;
        const w = this.coreCanvas.width;
        const h = this.coreCanvas.height;

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.restore();

        const time = performance.now();
        const globalPulse = Math.abs(Math.sin(time * 0.0015));

        // High-Tech Color Palette: Cyan for stability, Orange/Red for stress
        const themeColor = this.isHighLoad ? '255, 100, 0' : '0, 240, 255';
        const eyeColor = this.isHighLoad ? '255, 255, 255' : '255, 255, 255';

        // Background Glow
        const coreGrad = ctx.createRadialGradient(60, 60, 0, 60, 60, 40);
        coreGrad.addColorStop(0, `rgba(${eyeColor}, ${0.4 + globalPulse * 0.2})`);
        coreGrad.addColorStop(0.3, `rgba(${themeColor}, 0.2)`);
        coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(60, 60, 40, 0, Math.PI * 2);
        ctx.fill();

        // Volumetric Clouds
        this.clouds.forEach(c => {
            c.angle -= 0.005;
            c.pulse += 0.03;
            const size = 18 + Math.sin(c.pulse) * 6;
            const cx = 60 + Math.cos(c.angle) * c.dist;
            const cy = 60 + Math.sin(c.angle) * c.dist;

            const cloudGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
            cloudGrad.addColorStop(0, `rgba(${themeColor}, ${0.15 + globalPulse * 0.1})`);
            cloudGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = cloudGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, size, 0, Math.PI * 2);
            ctx.fill();
        });

        // Particles (Always on top)
        ctx.shadowBlur = this.isHighLoad ? 20 : 15;
        ctx.shadowColor = `rgb(${themeColor})`;

        this.particles.forEach(p => {
            if (p.history.length < 2) return;

            // Trail
            ctx.strokeStyle = `rgb(${themeColor})`;
            ctx.beginPath();
            ctx.moveTo(p.history[0].x, p.history[0].y);
            for (let i = 1; i < p.history.length; i++) {
                ctx.lineTo(p.history[i].x, p.history[i].y);
            }
            ctx.globalAlpha = this.isHighLoad ? 0.9 : 0.7;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Head
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        // UI Updates
        this.updateOxygenHUD();
    }

    loop(t) {
        this.update(t);
        this.draw();
        requestAnimationFrame((nt) => this.loop(nt));
    }
}

const stationHUD = new StationHUD();
function initStationHUD() { }

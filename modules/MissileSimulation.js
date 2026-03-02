/**
 * MissileSimulation.js
 * Automated Defense Layer for Raven Station
 */
class MissileSimulation {
    constructor() {
        this.container = document.getElementById('defense-sim-container');
        this.enemies = [];
        this.missiles = [];
        this.isSimulationActive = false;
        this.lastSpawnTime = 0;
        this.spawnInterval = 15000; // Spawn an enemy every 15 seconds if active

        // Target coordinates (Station Center)
        // Usually the station is centered in the .station-view
        this.targetPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

        this.init();
    }

    init() {
        if (!this.container) {
            console.warn("[SIM] Defense container not found. Check index.html");
            return;
        }

        // Main Loop
        setInterval(() => this.update(), 50);

        // Requirements Check Loop
        setInterval(() => this.checkRequirements(), 2000);

        window.addEventListener('resize', () => {
            this.targetPos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        });

        console.log("[SIM] Missile Defense Subsystems Online.");
    }

    checkRequirements() {
        if (!window.skillManager) return;

        const skills = window.skillManager.skills;
        const requiredSkills = [
            'ballastic_weaponry', // Note: Check exact naming in skillManager if needed
            'missile_guidance_systems',
            'ordnance_logistics',
            'advanced_warhead_design'
        ];

        // The user mentioned "4 skills completes", assuming Level 1+ as "active"
        let skillsReady = true;

        // Check for the 4 weapons skills (using actual IDs from CommanderModule/index.html)
        const weaponsSkills = [
            'ballistic_weaponry',
            'missile_guidance_systems',
            'ordnance_logistics',
            'advanced_warhead_design'
        ];

        weaponsSkills.forEach(s => {
            if (!skills[s] || skills[s].level < 1) skillsReady = false;
        });

        const gridLvl = skills['power_grid_calibration'] ? skills['power_grid_calibration'].level : 0;
        const ignitionLvl = skills['ordnance_systems_ignition'] ? skills['ordnance_systems_ignition'].level : 0;

        // Requirement: Grid Lvl 4 + Ignition Lvl 1 + 4 Weapons Skills Lvl 1
        // ADDED: Or simply if the station is Online (for the first 10 missiles test)
        const ready = (skillsReady && gridLvl >= 4 && ignitionLvl >= 1) || (window.skillManager && window.skillManager.isOnline);

        if (ready && !this.isSimulationActive) {
            this.isSimulationActive = true;
            console.log("[SIM] Defense Requirements Met. Engaging Automated Patrol.");
        } else if (!ready && this.isSimulationActive) {
            this.isSimulationActive = false;
            this.clearAll();
        }
    }

    update() {
        if (!this.isSimulationActive) return;

        const now = Date.now();
        if (now - this.lastSpawnTime > this.spawnInterval) {
            this.spawnEnemy();
            this.lastSpawnTime = now;
        }

        this.updateEnemies();
        this.updateMissiles();
    }

    spawnEnemy() {
        // Spawn at random edge
        const side = Math.floor(Math.random() * 4);
        let x, y;
        const margin = 50;

        if (side === 0) { x = -margin; y = Math.random() * window.innerHeight; } // Left
        else if (side === 1) { x = window.innerWidth + margin; y = Math.random() * window.innerHeight; } // Right
        else if (side === 2) { x = Math.random() * window.innerWidth; y = -margin; } // Top
        else { x = Math.random() * window.innerWidth; y = window.innerHeight + margin; } // Bottom

        const enemy = {
            id: 'enemy-' + Date.now() + Math.random(),
            x: x,
            y: y,
            hp: 180, // Needs ~3 missiles (60 dmg each)
            speed: 1.5 + Math.random() * 1,
            el: document.createElement('div')
        };

        enemy.el.className = 'sim-enemy-fighter';
        enemy.el.innerHTML = '<div class="enemy-core"></div><div class="enemy-threat-box">TARGET ID: UNKNOWN</div>';
        this.container.appendChild(enemy.el);
        this.enemies.push(enemy);
    }

    updateEnemies() {
        this.enemies.forEach((enemy, index) => {
            // Move towards station
            const dx = this.targetPos.x - enemy.x;
            const dy = this.targetPos.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > 5) {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }

            enemy.el.style.left = `${enemy.x}px`;
            enemy.el.style.top = `${enemy.y}px`;

            // Proximity Threat: If too close to station center, deal damage and explode
            if (dist < 100) {
                if (window.integrityManager) {
                    window.integrityManager.takeDamage(150); // Significant hit
                    if (typeof showGameNotification === 'function') {
                        showGameNotification("HULL IMPACT: HOSTILE BREACHED PERIMETER", "warning");
                    }
                }
                this.explode(enemy.x, enemy.y);
                enemy.el.remove();
                this.enemies.splice(index, 1);
                return;
            }

            // Auto-fire logic: If in range (e.g., 450px)
            if (dist < 450 && (!enemy.lastFireTime || Date.now() - enemy.lastFireTime > 2000)) {
                this.fireMissile(enemy);
                enemy.lastFireTime = Date.now();
            }

            if (enemy.hp <= 0) {
                this.explode(enemy.x, enemy.y);
                enemy.el.remove();
                this.enemies.splice(index, 1);
            }
        });
    }

    fireMissile(target) {
        // --- TACTICAL GATE: REQUIRE SKILLS ---
        if (!window.skillManager || !window.skillManager.checkMissileStatus()) return;

        // --- DYNAMIC WEAPON SELECTION ---
        const wm = window.weaponsModule;
        if (!wm) return;

        const weaponStock = wm.storage;
        const autoStates = wm.autoFireState;

        // Priority: Use strongest available AND toggled to AUTO
        const missilePriority = ['mk5_zeus', 'mk4_hyperion', 'mk3_typhon', 'mk2_vesta', 'mk1'];
        let selectedId = null;

        for (const id of missilePriority) {
            if (weaponStock[id] > 0 && autoStates[id]) {
                selectedId = id;
                break;
            }
        }

        if (!selectedId) return; // No ammo or none in AUTO mode

        // Deduct and Save
        if (window.weaponsModule) {
            window.weaponsModule.storage[selectedId]--;
            window.weaponsModule.saveState();
            window.weaponsModule.updateStorageUI();
        } else {
            weaponStock[selectedId]--;
            localStorage.setItem('raven_weapons_storage', JSON.stringify(weaponStock));
        }

        // Stats Matrix
        const db = {
            'mk1': { damage: 60, speed: 6, class: 'sim-missile-mk1' },
            'mk2_vesta': { damage: 90, speed: 10, class: 'sim-missile-mk2' },
            'mk3_typhon': { damage: 250, speed: 8, class: 'sim-missile-mk3' },
            'mk4_hyperion': { damage: 650, speed: 5, class: 'sim-missile-mk4' },
            'mk5_zeus': { damage: 1200, speed: 7, class: 'sim-missile-mk5' }
        };
        const stats = db[selectedId] || db['mk1'];

        const originX = this.targetPos.x;
        const originY = this.targetPos.y;

        const missile = {
            id: 'missile-' + Date.now() + Math.random(),
            x: originX,
            y: originY,
            target: target,
            speed: stats.speed,
            damage: stats.damage,
            type: selectedId,
            el: document.createElement('div')
        };

        missile.el.className = `sim-missile ${stats.class}`;
        missile.el.innerHTML = '<div class="missile-trail"></div>';
        this.container.appendChild(missile.el);
        this.missiles.push(missile);

        if (selectedId !== 'mk1' && typeof showGameNotification === 'function') {
            showGameNotification(`LAUNCHING: ${selectedId.toUpperCase()} INTERCEPTOR`);
        }
    }

    updateMissiles() {
        this.missiles.forEach((m, index) => {
            if (!m.target || !this.enemies.includes(m.target)) {
                m.el.remove();
                this.missiles.splice(index, 1);
                return;
            }

            const dx = m.target.x - m.x;
            const dy = m.target.y - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 15) {
                // Impact!
                m.target.hp -= m.damage;
                this.impactEffect(m.x, m.y, m.type);
                m.el.remove();
                this.missiles.splice(index, 1);
            } else {
                m.x += (dx / dist) * m.speed;
                m.y += (dy / dist) * m.speed;
                m.el.style.left = `${m.x}px`;
                m.el.style.top = `${m.y}px`;

                // Rotation towards target (+90 deg because sprite is vertical)
                const angle = (Math.atan2(dy, dx) * 180 / Math.PI) + 90;
                m.el.style.transform = `rotate(${angle}deg)`;
            }
        });
    }

    impactEffect(x, y, type) {
        const p = document.createElement('div');
        p.className = `sim-impact-spark spark-${type}`;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        this.container.appendChild(p);
        setTimeout(() => p.remove(), 500);
    }

    explode(x, y) {
        const exp = document.createElement('div');
        exp.className = 'sim-explosion-fighter';
        exp.style.left = `${x}px`;
        exp.style.top = `${y}px`;
        this.container.appendChild(exp);
        setTimeout(() => exp.remove(), 1000);

        if (typeof showGameNotification === 'function') {
            showGameNotification("HOSTILE INTERCEPTED. THREAT NEUTRALIZED.");
        }
    }

    clearAll() {
        this.enemies.forEach(e => e.el.remove());
        this.missiles.forEach(m => m.el.remove());
        this.enemies = [];
        this.missiles = [];
    }
}

function now() { return Date.now() + Math.random(); }

window.addEventListener('load', () => {
    window.missileSim = new MissileSimulation();
});

// GLOBAL ACCESS FOR TEST COMMANDS
window.spawnHostile = () => {
    if (window.missileSim) {
        // --- DEBUG: Grant EXACTLY 10 MK1 Missiles ---
        if (window.weaponsModule) {
            window.weaponsModule.storage['mk1'] = 10;
            window.weaponsModule.autoFireState['mk1'] = true;
            window.weaponsModule.saveState();
            window.weaponsModule.updateStorageUI();
        }

        window.missileSim.isSimulationActive = true;
        window.missileSim.spawnEnemy(); // Immediate spawn
        return "TEST INITIATED: 10 MK1 PULSE MISSILES LOADED. HOSTILE INBOUND.";
    }
    return "SIMULATION OFFLINE";
};

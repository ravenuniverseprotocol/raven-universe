class IntegrityManager {
    constructor() {
        // Core Integrity Data
        this.shield = { max: 1000, current: 1000, regenRate: 0, regenDelay: 10000, lastHit: 0 };
        this.armor = { max: 1000, current: 1000 };
        this.hull = { max: 1000, current: 1000 };

        this.lastUpdate = Date.now();

        this.elements = {
            shieldFill: document.getElementById('shield-bar-fill'),
            shieldPercent: document.getElementById('shield-percent')
        };
    }

    recalculateStats() {
        if (!window.skillManager) return;
        const skills = window.skillManager.skills;

        // --- SHIELD SCALING ---
        const opLvl = skills['shield_operation'] ? skills['shield_operation'].level : 0;
        const upgradeLvl = skills['shield_upgrades'] ? skills['shield_upgrades'].level : 0;
        const oldMaxS = this.shield.max;
        this.shield.max = 1000 * (1 + (opLvl * 0.2) + (upgradeLvl * 0.4));
        if (this.shield.max > oldMaxS) this.shield.current += (this.shield.max - oldMaxS);

        const mgmtLvl = skills['shield_management'] ? skills['shield_management'].level : 0;
        const compLvl = skills['shield_compensation'] ? skills['shield_compensation'].level : 0;
        this.shield.regenRate = (mgmtLvl * 5) + (compLvl * 2);

        const tacticalLvl = skills['tactical_shield_manipulation'] ? skills['tactical_shield_manipulation'].level : 0;
        const delays = [10000, 8000, 6000, 4000, 2000, 500];
        this.shield.regenDelay = delays[tacticalLvl] || 10000;

        // --- ARMOR/HULL SCALING (Placeholders for future skills) ---
        // Currently fixed at 1000, but structured for growth
    }

    /**
     * Hierarchical Damage Processing
     * Shield -> Armor -> Hull
     */
    takeDamage(amount) {
        if (amount <= 0) return;

        // 1. Shake the cockpit for any damage
        this.triggerShake();

        let remainingDamage = amount;

        // --- CAMADA 1: SHIELD ---
        if (this.shield.current > 0) {
            this.shield.lastHit = Date.now();
            if (this.shield.current >= remainingDamage) {
                this.shield.current -= remainingDamage;
                remainingDamage = 0;
            } else {
                remainingDamage -= this.shield.current;
                this.shield.current = 0;
            }
        }

        // --- CAMADA 2: ARMOR ---
        if (remainingDamage > 0 && this.armor.current > 0) {
            if (this.armor.current >= remainingDamage) {
                this.armor.current -= remainingDamage;
                remainingDamage = 0;
            } else {
                remainingDamage -= this.armor.current;
                this.armor.current = 0;
            }
        }

        // --- CAMADA 3: HULL ---
        if (remainingDamage > 0) {
            this.hull.current = Math.max(0, this.hull.current - remainingDamage);
            if (this.hull.current <= 0) {
                this.onCriticalFailure();
            }
        }

        this.renderStandaloneShield();
    }

    triggerShake() {
        const root = document.querySelector('.hud-cockpit-root');
        if (root) {
            root.classList.remove('cockpit-shake');
            void root.offsetWidth; // Trigger reflow
            root.classList.add('cockpit-shake');
            setTimeout(() => root.classList.remove('cockpit-shake'), 500);
        }
    }

    onCriticalFailure() {
        if (typeof showGameNotification === 'function') {
            showGameNotification("CRITICAL SYSTEM FAILURE: HULL BREACH DETECTED", "error");
        }
    }

    update() {
        const now = Date.now();
        const dt = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Shield Regen Logic
        if (this.shield.current < this.shield.max && (now - this.shield.lastHit > this.shield.regenDelay)) {
            this.shield.current = Math.min(this.shield.max, this.shield.current + (this.shield.regenRate * dt));
        }

        this.renderStandaloneShield();
    }

    // This handles the separate SHIELD window UI
    renderStandaloneShield() {
        const pct = (this.shield.current / this.shield.max) * 100;
        if (this.elements.fill) {
            this.elements.fill.style.height = `${pct}%`;
            if (pct > 75) {
                this.elements.fill.style.background = 'linear-gradient(to top, #0066ff, #00ccff, #ffffff)';
                this.elements.fill.style.boxShadow = '0 0 15px #00ccff';
            } else if (pct > 30) {
                this.elements.fill.style.background = 'linear-gradient(to top, #00aa44, #00ff88, #ffffff)';
                this.elements.fill.style.boxShadow = '0 0 15px #00ff88';
            } else {
                this.elements.fill.style.background = 'linear-gradient(to top, #aa0000, #ff3333, #ffffff)';
                this.elements.fill.style.boxShadow = '0 0 15px #ff3333';
            }
        }
        if (this.elements.shieldPercent) {
            this.elements.shieldPercent.innerText = `${Math.floor(pct)}%`;
        }
    }

    // Helper for HUD binding
    get shieldPercent() { return (this.shield.current / this.shield.max) * 100; }
    get armorPercent() { return (this.armor.current / this.armor.max) * 100; }
    get hullPercent() { return (this.hull.current / this.hull.max) * 100; }
}

window.integrityManager = new IntegrityManager();

// Compatibility wrappers for existing calls
window.shieldEngine = window.integrityManager;
window.recalculateShields = () => window.integrityManager.recalculateStats();

function initIntegrityLoop() {
    setInterval(() => {
        if (window.integrityManager) window.integrityManager.update();
    }, 100);
}

initIntegrityLoop();

class IntegrityManager {
    constructor() {
        // Core Integrity Data - Start at 0 for cinematic boot
        this.shield = { max: 1000, current: 0, regenRate: 0, regenDelay: 10000, lastHit: 0 };
        this.armor = { max: 1000, current: 0 };
        this.hull = { max: 1000, current: 0 };

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

        // During boot, we don't auto-fill to max on level up if not functional
        // But we maintain the percentage if already charging
        const mgmtLvl = skills['shield_management'] ? skills['shield_management'].level : 0;
        const compLvl = skills['shield_compensation'] ? skills['shield_compensation'].level : 0;
        this.shield.regenRate = (mgmtLvl * 5) + (compLvl * 2);

        const tacticalLvl = skills['tactical_shield_manipulation'] ? skills['tactical_shield_manipulation'].level : 0;
        const delays = [10000, 8000, 6000, 4000, 2000, 500];
        this.shield.regenDelay = delays[tacticalLvl] || 10000;
    }

    takeDamage(amount) {
        if (amount <= 0) return;
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
            if (this.hull.current <= 0) this.onCriticalFailure();
        }
        this.renderStandaloneShield();
    }

    triggerShake() {
        const root = document.querySelector('.hud-cockpit-root');
        if (root) {
            root.classList.remove('cockpit-shake');
            void root.offsetWidth;
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

        const sm = window.skillManager;
        const isOnline = sm ? sm.isOnline : false;
        const shieldActive = sm ? sm.checkShieldStatus() : false;

        // --- CINEMATIC BOOT / CHARGING LOGIC ---
        // Fill Rate: ~5% per second for boot layers
        const bootRate = 50; // 50 units per second (takes 20s for 1000)

        // 1. Armor & Hull: Growing when Online
        if (isOnline) {
            if (this.hull.current < this.hull.max) {
                this.hull.current = Math.min(this.hull.max, this.hull.current + (bootRate * dt));
            }
            if (this.armor.current < this.armor.max) {
                this.armor.current = Math.min(this.armor.max, this.armor.current + (bootRate * dt));
            }
        } else {
            // Decay if offline? User didn't specify, but let's keep it 0 if offline
            this.hull.current = 0;
            this.armor.current = 0;
            this.shield.current = 0;
        }

        // 2. Shield: Growing ONLY when activated
        if (shieldActive) {
            // Regeneration logic takes over if we are damaged, 
            // but boot growth applies if we are below max and not cooling down
            const isCharging = (this.shield.current < this.shield.max);
            const isRegenReady = (now - this.shield.lastHit > this.shield.regenDelay);

            if (isCharging && isRegenReady) {
                // Use bootRate for initial fill, or regenRate if higher
                const actualRate = Math.max(bootRate, this.shield.regenRate);
                this.shield.current = Math.min(this.shield.max, this.shield.current + (actualRate * dt));
            }
        } else {
            this.shield.current = 0;
        }

        this.renderStandaloneShield();
    }

    renderStandaloneShield() {
        const pct = this.shieldPercent;
        if (this.elements.shieldFill) {
            this.elements.fill = this.elements.shieldFill; // backwards compatibility
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

    get shieldPercent() { return (this.shield.max > 0) ? (this.shield.current / this.shield.max) * 100 : 0; }
    get armorPercent() { return (this.armor.max > 0) ? (this.armor.current / this.armor.max) * 100 : 0; }
    get hullPercent() { return (this.hull.max > 0) ? (this.hull.current / this.hull.max) * 100 : 0; }
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

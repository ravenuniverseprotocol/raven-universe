class ShieldEngine {
    constructor() {
        this.maxStrength = 1000;
        this.currentStrength = 1000;
        this.regenRate = 0;
        this.regenDelay = 10000; // Default 10s
        this.lastDamageTime = 0;
        this.lastUpdate = Date.now();

        this.elements = {
            hud: document.getElementById('shield-hud'),
            fill: document.getElementById('shield-bar-fill'),
            percent: document.getElementById('shield-percent')
        };
    }

    recalculateStats() {
        if (!window.skillManager) return;
        const skills = window.skillManager.skills;

        // Formula: 1000 * (1 + (Op * 0.2) + (Upgrades * 0.4))
        const opLvl = skills['shield_operation'] ? skills['shield_operation'].level : 0;
        const upgradeLvl = skills['shield_upgrades'] ? skills['shield_upgrades'].level : 0;

        const oldMax = this.maxStrength;
        this.maxStrength = 1000 * (1 + (opLvl * 0.2) + (upgradeLvl * 0.4));

        // If max increased, heal the delta
        if (this.maxStrength > oldMax) {
            this.currentStrength += (this.maxStrength - oldMax);
        }

        // Regen Rate: (Mgmt * 5) + (Comp * 2)
        const mgmtLvl = skills['shield_management'] ? skills['shield_management'].level : 0;
        const compLvl = skills['shield_compensation'] ? skills['shield_compensation'].level : 0;
        this.regenRate = (mgmtLvl * 5) + (compLvl * 2);

        // Tactical Shield Manipulation: Reduces regen delay from 10s to 0.5s
        const tacticalLvl = skills['tactical_shield_manipulation'] ? skills['tactical_shield_manipulation'].level : 0;
        // Scaling: 10s, 8s, 6s, 4s, 2s, 0.5s
        const delays = [10000, 8000, 6000, 4000, 2000, 500];
        this.regenDelay = delays[tacticalLvl] || 10000;
    }

    takeDamage(amount) {
        this.currentStrength = Math.max(0, this.currentStrength - amount);
        this.lastDamageTime = Date.now();
        this.render();
    }

    update() {
        const now = Date.now();
        const dt = (now - this.lastUpdate) / 1000;
        this.lastUpdate = now;

        // Handle Regen ONLY if outside damage delay window
        if (this.currentStrength < this.maxStrength && (now - this.lastDamageTime > this.regenDelay)) {
            this.currentStrength = Math.min(this.maxStrength, this.currentStrength + (this.regenRate * dt));
        }

        this.render();
    }

    render() {
        if (!this.elements.hud || this.elements.hud.style.display === 'none') return;

        const pct = (this.currentStrength / this.maxStrength) * 100;

        if (this.elements.fill) {
            this.elements.fill.style.height = `${pct}%`;

            // Color Shifting
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

        if (this.elements.percent) {
            this.elements.percent.innerText = `${Math.floor(pct)}%`;
        }
    }
}

window.shieldEngine = new ShieldEngine();

function initShieldHUD() {
    setInterval(() => {
        if (window.shieldEngine) window.shieldEngine.update();
    }, 100);
}

// Global exposure for skill updates
window.recalculateShields = () => {
    if (window.shieldEngine) window.shieldEngine.recalculateStats();
};

initShieldHUD();

class WeaponsModule {
    constructor() {
        this.window = document.getElementById('weapons-window');
        this.btn = document.getElementById('weapons-menu-btn');
        this.closeBtn = this.window ? this.window.querySelector('.close-btn') : null;

        this.ammo = 24;
        this.maxAmmo = 24;
        this.isReloading = false;

        this.init();
    }

    init() {
        if (this.btn && this.window) {
            this.btn.onclick = () => {
                this.toggleWindow();
            };

            if (this.closeBtn) {
                this.closeBtn.onclick = () => {
                    this.window.style.display = 'none';
                };
            }

            if (typeof makeDraggable === 'function') {
                makeDraggable(this.window);
            }
        }

        // Auto-update UI if open
        setInterval(() => {
            if (this.window && this.window.style.display === 'flex') {
                this.updateUI();
            }
        }, 500);
    }

    toggleWindow() {
        if (!this.window) return;

        // GATING: Check if Ordnance Systems Ignition is trained
        if (!window.skillManager || !window.skillManager.checkMissileStatus()) {
            if (typeof showGameNotification === 'function') {
                showGameNotification("SYSTEMS LOCKED: ORDNANCE IGNITION REQUIRED");
            }
            return;
        }

        const isVisible = this.window.style.display === 'flex';
        this.window.style.display = isVisible ? 'none' : 'flex';

        if (!isVisible) {
            this.updateUI();
        }
    }

    updateUI() {
        const statusEl = document.getElementById('weapons-active-status');
        const ammoCountEl = document.getElementById('weapon-ammo-count');
        const ammoFillEl = document.getElementById('weapon-ammo-fill');

        if (statusEl) {
            const isOperational = window.skillManager && window.skillManager.checkMissileStatus();
            statusEl.innerText = isOperational ? (this.isReloading ? "RELOADING" : "OPERATIONAL") : "OFFLINE";
            statusEl.style.color = isOperational ? (this.isReloading ? "#ff9900" : "#00ff88") : "#ff4444";
        }

        if (ammoCountEl) ammoCountEl.innerText = Math.floor(this.ammo);
        if (ammoFillEl) {
            const pct = (this.ammo / this.maxAmmo) * 100;
            ammoFillEl.style.width = `${pct}%`;
            ammoFillEl.style.background = pct < 25 ? '#ff4444' : '#ff9900';
        }
    }

    reload() {
        if (this.isReloading || this.ammo === this.maxAmmo) return;

        this.isReloading = true;
        if (typeof showGameNotification === 'function') {
            showGameNotification("RELOADING MISSILE ORDNANCE...");
        }

        let elapsed = 0;
        const reloadTime = 4000; // 4 seconds
        const step = 100;

        const timer = setInterval(() => {
            elapsed += step;
            if (elapsed >= reloadTime) {
                clearInterval(timer);
                this.ammo = this.maxAmmo;
                this.isReloading = false;
                if (typeof showGameNotification === 'function') {
                    showGameNotification("RELOAD COMPLETE: 24/24 MISSILES READY");
                }
                this.updateUI();
            }
        }, step);
    }
}

window.initWeapons = () => {
    window.weaponsModule = new WeaponsModule();
};

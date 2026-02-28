class WeaponsModule {
    constructor() {
        this.window = document.getElementById('weapons-window');
        this.btn = document.getElementById('weapons-menu-btn');
        this.closeBtn = this.window ? this.window.querySelector('.close-btn') : null;

        this.ammo = 24;
        this.maxAmmo = 24;
        this.isReloading = false;

        // Research State
        this.isResearching = false;
        this.researchProgress = 0;
        this.researchComplete = false;

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

        // Auto-update UI if open (legacy elements may be gone, keep running just in case)
        setInterval(() => {
            if (this.window && this.window.style.display === 'flex') {
                this.updateUI();
            }
        }, 500);
    }

    toggleWindow() {
        if (!this.window) return;

        const isVisible = this.window.style.display === 'flex';
        this.window.style.display = isVisible ? 'none' : 'flex';

        if (!isVisible) {
            // Notify if locked, but open anyway
            if (!window.skillManager || !window.skillManager.checkMissileStatus()) {
                if (typeof showGameNotification === 'function') {
                    showGameNotification("SYSTEMS LOCKED: ORDNANCE IGNITION REQUIRED");
                }
            }
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

    startResearch() {
        if (this.isResearching || this.researchComplete) return;

        const researchBox = document.getElementById('weapons-research-box');
        const percentageTxt = document.getElementById('weapons-research-percentage');
        const constructionBox = document.getElementById('weapons-construction-box');

        if (!researchBox || !percentageTxt || !constructionBox) return;

        this.isResearching = true;
        this.researchProgress = 0;
        percentageTxt.innerText = "0%";

        // Add pulsing animation class
        researchBox.classList.add('research-active');

        if (typeof showGameNotification === 'function') {
            showGameNotification("INITIATING MK1 PULSE MISSILE RESEARCH...");
        }

        const totalTime = 10000; // 10 seconds
        const interval = 100; // Update every 100ms
        const progressPerTick = (interval / totalTime) * 100;

        const timer = setInterval(() => {
            this.researchProgress += progressPerTick;
            let displayPct = Math.floor(this.researchProgress);

            if (displayPct > 100) displayPct = 100;
            percentageTxt.innerText = `${displayPct}%`;

            if (this.researchProgress >= 100) {
                clearInterval(timer);
                this.isResearching = false;
                this.researchComplete = true;

                percentageTxt.innerText = "100%";
                researchBox.classList.remove('research-active');

                // Activate construction section
                constructionBox.classList.add('construction-ready');

                // Image transfer
                const researchImg = researchBox.querySelector('.weapons-missile-img');
                const constructionImg = document.getElementById('weapons-construction-img');
                const constructionDetails = document.getElementById('weapons-construction-details');

                if (researchImg && constructionImg && constructionDetails) {
                    researchImg.style.display = 'none';
                    constructionImg.style.display = 'block';
                    constructionDetails.classList.add('active');
                }

                if (typeof showGameNotification === 'function') {
                    showGameNotification("RESEARCH SECURE. SCHEMATICS UPLOADED TO CONSTRUCTION QUEUE.");
                }
            }
        }, interval);
    }
}

window.initWeapons = () => {
    window.weaponsModule = new WeaponsModule();
};

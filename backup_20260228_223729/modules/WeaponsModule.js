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

        // Construction State
        this.isConstructing = false;
        this.storageMK1 = 0;

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

                    // Show "AWAITING SCHEMATICS" -> "READY TO BUILD" text
                    const constPct = document.getElementById('weapons-construction-percentage');
                    if (constPct) {
                        constPct.style.display = 'block';
                        constPct.innerText = "READY TO FABRICATE";
                    }
                }

                if (typeof showGameNotification === 'function') {
                    showGameNotification("RESEARCH SECURE. SCHEMATICS UPLOADED TO FABRICATION QUEUE.");
                }
            }
        }, interval);
    }

    startConstruction() {
        if (!this.researchComplete || this.isConstructing) return;

        const constructionBox = document.getElementById('weapons-construction-box');
        const percentageTxt = document.getElementById('weapons-construction-percentage');

        if (!constructionBox || !percentageTxt) return;

        // --- RESOURCE CHECK & DEDUCTION ---
        if (!window.skillManager) {
            console.error("[WEAPONS] SkillManager not found.");
            return;
        }

        const requiredIron = 250;
        const requiredTitanium = 100;
        const requiredRUC = 10000;

        const hasIron = window.skillManager.getOwned("IRON") >= requiredIron;
        const hasTitanium = window.skillManager.getOwned("TITANIUM") >= requiredTitanium;
        const hasRUC = window.skillManager.credits >= requiredRUC;

        if (!hasIron || !hasTitanium || !hasRUC) {
            if (typeof showGameNotification === 'function') {
                showGameNotification("INSUFFICIENT RESOURCES FOR FABRICATION");
            }

            percentageTxt.innerText = "INSUFFICIENT RESOURCES";
            percentageTxt.style.color = "#ff4444";
            setTimeout(() => {
                if (!this.isConstructing) {
                    percentageTxt.innerText = "READY TO FABRICATE";
                    percentageTxt.style.color = "#00ffaa";
                }
            }, 3000);
            return;
        }

        // Deduct resources
        window.skillManager.removeFromInventory("IRON", requiredIron);
        window.skillManager.removeFromInventory("TITANIUM", requiredTitanium);
        window.skillManager.spendCredits(requiredRUC);

        // --- START CONSTRUCTION ---
        this.isConstructing = true;
        let progress = 0;
        percentageTxt.innerText = "0%";
        percentageTxt.style.color = "#ff9900"; // Orange while building

        constructionBox.classList.remove('construction-ready');
        constructionBox.classList.add('construction-active');

        if (typeof showGameNotification === 'function') {
            showGameNotification("FABRICATION STARTED: MK1 PULSE MISSILE");
        }

        const totalTime = 8000; // 8 seconds to build
        const interval = 100;
        const progressPerTick = (interval / totalTime) * 100;

        const timer = setInterval(() => {
            progress += progressPerTick;
            let displayPct = Math.floor(progress);

            if (displayPct > 100) displayPct = 100;
            percentageTxt.innerText = `FABRICATING: ${displayPct}%`;

            if (progress >= 100) {
                clearInterval(timer);
                this.isConstructing = false;

                percentageTxt.innerText = "READY TO FABRICATE";
                percentageTxt.style.color = "#00ffaa";

                constructionBox.classList.remove('construction-active');
                constructionBox.classList.add('construction-ready');

                // Add to Storage
                this.storageMK1++;
                this.updateStorageUI();

                if (typeof showGameNotification === 'function') {
                    showGameNotification("FABRICATION COMPLETE. SENT TO ORDNANCE STORAGE.");
                }
            }
        }, interval);
    }

    updateStorageUI() {
        const storageGrid = document.getElementById('weapons-storage-grid');
        const emptyMsg = document.getElementById('storage-empty-msg');

        if (!storageGrid) return;

        if (this.storageMK1 > 0 && emptyMsg) {
            emptyMsg.style.display = 'none';
        }

        // We can just find or create the MK1 item in the grid
        let mk1Item = document.getElementById('storage-item-mk1');

        if (!mk1Item) {
            mk1Item = document.createElement('div');
            mk1Item.id = 'storage-item-mk1';
            mk1Item.className = 'weapons-storage-item';
            mk1Item.innerHTML = `
                <img src="assets/media/mk1%20-%20pulse%20missile.png" class="weapons-missile-img">
                <div class="weapons-storage-count" id="storage-count-mk1">QTY: ${this.storageMK1}</div>
            `;
            storageGrid.appendChild(mk1Item);
        } else {
            const countLabel = document.getElementById('storage-count-mk1');
            if (countLabel) {
                countLabel.innerText = `QTY: ${this.storageMK1}`;
            }
        }
    }
}

window.initWeapons = () => {
    window.weaponsModule = new WeaponsModule();
};

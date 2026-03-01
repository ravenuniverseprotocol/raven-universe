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

        // Particle System
        this.particles = [];
        this.particleCanvas = null;
        this.particleCtx = null;
        this.particleAnimationId = null;

        this.init();
    }

    init() {
        if (this.btn && this.window) {
            this.btn.onclick = () => {
                this.toggleWindow();
            };

            if (this.closeBtn) {
                this.closeBtn.onclick = () => {
                    this.toggleWindow(false);
                };
            }

            if (typeof makeDraggable === 'function') {
                makeDraggable(this.window);
            }
        }

        // Initialize Particle Canvas
        this.particleCanvas = document.getElementById('weapons-particle-canvas');
        if (this.particleCanvas) {
            this.particleCtx = this.particleCanvas.getContext('2d');
            this.resizeParticleCanvas();
            window.addEventListener('resize', () => this.resizeParticleCanvas());
        }

        // Auto-update UI if open (legacy elements may be gone, keep running just in case)
        setInterval(() => {
            if (this.window && this.window.style.display === 'flex') {
                this.updateUI();
                this.updateResourceCosts();
            }
        }, 500);
    }

    resizeParticleCanvas() {
        if (this.particleCanvas) {
            this.particleCanvas.width = this.particleCanvas.offsetWidth;
            this.particleCanvas.height = this.particleCanvas.offsetHeight;
            this.initParticles();
        }
    }

    initParticles() {
        this.particles = [];
        const count = 50;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.particleCanvas.width,
                y: Math.random() * this.particleCanvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }

    animateParticles() {
        if (!this.particleCtx || this.window.style.display !== 'flex') return;

        this.particleCtx.clearRect(0, 0, this.particleCanvas.width, this.particleCanvas.height);
        this.particleCtx.fillStyle = '#ff9900';

        this.particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;

            if (p.x < 0) p.x = this.particleCanvas.width;
            if (p.x > this.particleCanvas.width) p.x = 0;
            if (p.y < 0) p.y = this.particleCanvas.height;
            if (p.y > this.particleCanvas.height) p.y = 0;

            this.particleCtx.globalAlpha = p.opacity * 0.6;
            this.particleCtx.beginPath();
            this.particleCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.particleCtx.fill();
        });

        this.particleAnimationId = requestAnimationFrame(() => this.animateParticles());
    }

    toggleWindow(force) {
        if (!this.window) return;

        const isVisible = force !== undefined ? force : this.window.style.display !== 'flex';
        this.window.style.display = isVisible ? 'flex' : 'none';

        if (isVisible) {
            // Notify if locked, but open anyway
            if (!window.skillManager || !window.skillManager.checkMissileStatus()) {
                if (typeof showGameNotification === 'function') {
                    showGameNotification("SYSTEMS LOCKED: ORDNANCE IGNITION REQUIRED");
                }
            }
            this.updateUI();
            this.updateStorageUI();
            this.animateParticles();
        } else {
            if (this.particleAnimationId) {
                cancelAnimationFrame(this.particleAnimationId);
            }
        }
    }

    updateResourceCosts() {
        if (!window.skillManager) return;

        const resources = [
            { id: 'IRON', cost: 250 },
            { id: 'TITANIUM', cost: 100 },
            { id: 'RUC', cost: 10000 }
        ];

        resources.forEach(res => {
            const el = document.querySelector(`.res-item[data-res="${res.id}"]`);
            if (el) {
                const owned = res.id === 'RUC' ? window.skillManager.credits : window.skillManager.getOwned(res.id);
                const valEl = el.querySelector('.res-val');
                if (valEl) {
                    valEl.style.color = owned >= res.cost ? '#ff9900' : '#ff4444';
                }
            }
        });
    }

    updateUI() {
        const researchProgressFill = document.getElementById('research-progress-fill');
        const researchPct = document.getElementById('weapons-research-percentage');

        if (researchProgressFill) {
            researchProgressFill.style.width = `${Math.floor(this.researchProgress)}%`;
        }
        if (researchPct) {
            researchPct.innerText = `${Math.floor(this.researchProgress)}%`;
        }

        if (this.researchComplete) {
            const resWrapper = document.getElementById('weapons-research-wrapper');
            if (resWrapper) resWrapper.classList.add('research-complete');
        }
    }

    startResearch() {
        if (this.isResearching || this.researchComplete) return;

        const researchBox = document.getElementById('weapons-research-box');
        const percentageTxt = document.getElementById('weapons-research-percentage');
        const constructionBox = document.getElementById('weapons-construction-box');
        const constructionImg = document.getElementById('weapons-construction-img');
        const progressFill = document.getElementById('research-progress-fill');

        if (!researchBox || !percentageTxt || !constructionBox) return;

        this.isResearching = true;
        this.researchProgress = 0;
        percentageTxt.innerText = "0%";

        researchBox.parentElement.classList.add('research-active');

        if (typeof showGameNotification === 'function') {
            showGameNotification("INITIATING MK1 PULSE MISSILE RESEARCH...");
        }

        const totalTime = 10000; // 10 seconds
        const interval = 50;
        const progressPerTick = (interval / totalTime) * 100;

        const timer = setInterval(() => {
            this.researchProgress += progressPerTick;
            let displayPct = Math.floor(this.researchProgress);

            if (displayPct > 100) displayPct = 100;
            percentageTxt.innerText = `${displayPct}%`;
            if (progressFill) progressFill.style.width = `${displayPct}%`;

            if (this.researchProgress >= 100) {
                clearInterval(timer);
                this.isResearching = false;
                this.researchComplete = true;

                percentageTxt.innerText = "100%";
                researchBox.parentElement.classList.remove('research-active');
                researchBox.parentElement.classList.add('research-complete');

                if (constructionImg) constructionImg.style.display = 'block';

                const constStatus = document.getElementById('weapons-construction-percentage');
                if (constStatus) constStatus.innerText = "READY TO FABRICATE";

                if (typeof showGameNotification === 'function') {
                    showGameNotification("RESEARCH SECURE. SCHEMATICS UPLOADED TO FABRICATION QUEUE.");
                }
            }
        }, interval);
    }

    startConstruction() {
        if (!this.researchComplete || this.isConstructing) return;

        const percentageTxt = document.getElementById('weapons-construction-percentage');
        const fabWrapper = document.getElementById('weapons-construction-wrapper');

        if (!fabWrapper || !percentageTxt) return;

        // --- RESOURCE CHECK & DEDUCTION ---
        if (!window.skillManager) return;

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
                    percentageTxt.style.color = "#ff9900";
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
        fabWrapper.classList.add('construction-active');

        if (typeof showGameNotification === 'function') {
            showGameNotification("FABRICATION STARTED: MK1 PULSE MISSILE");
        }

        const totalTime = 8000; // 8 seconds to build
        const interval = 50;
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
                fabWrapper.classList.remove('construction-active');

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

        let mk1Item = document.getElementById('storage-item-mk1');

        if (!mk1Item && this.storageMK1 > 0) {
            mk1Item = document.createElement('div');
            mk1Item.id = 'storage-item-mk1';
            mk1Item.className = 'weapons-storage-item-4k';
            mk1Item.innerHTML = `
                <img src="assets/media/mk1%20-%20pulse%20missile.png" class="storage-img-mini">
                <div class="storage-qty-badge" id="storage-count-mk1">${this.storageMK1}</div>
            `;
            storageGrid.appendChild(mk1Item);
        } else if (mk1Item) {
            const countLabel = document.getElementById('storage-count-mk1');
            if (countLabel) {
                countLabel.innerText = this.storageMK1;
            }
        }
    }
}

window.initWeapons = () => {
    window.weaponsModule = new WeaponsModule();
};


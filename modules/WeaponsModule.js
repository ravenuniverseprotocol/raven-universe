const MISSILE_DATABASE = [
    {
        id: 'mk1',
        name: 'MK1 PULSE MISSILE',
        type: 'ROLE: ANTI-FIGHTER / LIGHT DEFENSE',
        desc: 'Standard kinetic ordnance. Optimized for intercepting light fighters and automated drones at short range. Low cost, high rate of fire.',
        image: 'assets/media/mk1%20-%20pulse%20missile.png',
        researchTime: 10000,
        fabTime: 8000,
        damage: 60,
        speed: 6.0,
        costs: { IRON: 250, TITANIUM: 100, RUC: 10000 }
    },
    {
        id: 'mk2_vesta',
        name: 'MK2 VESTA',
        type: 'ROLE: PRECISION INTERCEPTOR',
        desc: 'Advanced propulsion interceptor. Ultra-high velocity warhead designed to track and neutralize high-speed reconnaissance vessels and agile targets.',
        image: 'assets/media/mk2_vesta.png',
        researchTime: 30000,
        fabTime: 15000,
        damage: 90,
        speed: 12.0,
        costs: { IRON: 800, TITANIUM: 350, RUC: 45000 }
    },
    {
        id: 'mk3_typhon',
        name: 'MK3 TYPHON',
        type: 'ROLE: ANTI-FLEET / AREA DAMAGE',
        desc: 'Cluster-burn warheads. Upon impact, releases a thermal cloud of fragmenting sub-munitions. Highly effective against dense enemy formations and fleet groups.',
        image: 'assets/media/mk3_typhon.png',
        researchTime: 60000,
        fabTime: 30000,
        damage: 250,
        speed: 8.0,
        costs: { IRON: 2500, TITANIUM: 1200, RUC: 120000 }
    },
    {
        id: 'mk4_hyperion',
        name: 'MK4 HYPERION',
        type: 'ROLE: ANTI-STATION / HEAVY BREACH',
        desc: 'Plasma-compression payload. Devastating kinetic and thermal energy delivery. Designed for breaching heavy plating of Cruisers and stationary Outposts.',
        image: 'assets/media/mk4_hyperion.png',
        researchTime: 300000,
        fabTime: 60000,
        damage: 650,
        speed: 5.0,
        costs: { IRON: 8000, TITANIUM: 4500, RUC: 500000 }
    },
    {
        id: 'mk5_zeus',
        name: 'MK5 ZEUS',
        type: 'ROLE: STRATEGIC EMP / DISABLE',
        desc: 'High-yield electromagnetic pulse. Temporarily overloads neural links and energy grids, disabling enemy weapon systems and engines. Optimal for high-value targets.',
        image: 'assets/media/mk5_zeus.png',
        researchTime: 600000,
        fabTime: 120000,
        damage: 1200,
        speed: 7.0,
        costs: { IRON: 25000, TITANIUM: 12000, RUC: 2500000 }
    },
    {
        id: 'mkx_voyager',
        name: 'MK-X GALACTIC VOYAGER',
        type: 'ROLE: INTER-GALACTIC ANNIHILATION',
        desc: 'Inter-system strategic payload. Utilizing warp-integrated warheads to strike systems at ultra-long range. The ultimate weapon for projectable dominance.',
        image: 'assets/media/mkx_galactic_voyager.png',
        researchTime: 900000,
        fabTime: 600000,
        damage: 4500,
        speed: 25.0,
        costs: { IRON: 100000, TITANIUM: 65000, RUC: 15000000 }
    }
];

class WeaponsModule {
    constructor() {
        this.window = document.getElementById('weapons-window');
        this.btn = document.getElementById('weapons-menu-btn');
        this.closeBtn = this.window ? this.window.querySelector('.close-btn') : null;

        // Current Selection
        this.selectedIndex = 0;

        // Persistent State
        this.researchState = this.loadResearchState();
        this.storage = this.loadStorage();
        this.autoFireState = this.loadAutoFireState(); // NEW: Track which missiles fire automatically

        // Operational States
        this.isWorking = false; // Prevents multiple ops
        this.strategicTarget = null; // Target for MK-X

        // Particle System
        this.particles = [];
        this.particleCanvas = null;
        this.particleCtx = null;
        this.particleAnimationId = null;

        this.init();
    }

    loadAutoFireState() {
        const saved = localStorage.getItem('raven_artillery_auto');
        if (saved) return JSON.parse(saved);
        // Default: MK1 is AUTO by default, others are OFF
        return { 'mk1': true, 'mk2_vesta': false, 'mk3_typhon': false, 'mk4_hyperion': false, 'mk5_zeus': false };
    }

    saveState() {
        localStorage.setItem('raven_weapons_research', JSON.stringify(this.researchState));
        localStorage.setItem('raven_weapons_storage', JSON.stringify(this.storage));
        localStorage.setItem('raven_artillery_auto', JSON.stringify(this.autoFireState));
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

        // Add Navigation Buttons to UI via JS for minimal HTML changes
        this.injectNavButtons();

        // NEW: Initialize Artillery HUD Console
        this.initArtilleryHUD();

        // Initialize Particle Canvas
        this.particleCanvas = document.getElementById('weapons-particle-canvas');
        if (this.particleCanvas) {
            this.particleCtx = this.particleCanvas.getContext('2d');
            this.resizeParticleCanvas();
            window.addEventListener('resize', () => this.resizeParticleCanvas());
        }

        // Auto-update UI loop (throttled)
        setInterval(() => {
            if (this.window && this.window.style.display === 'flex') {
                this.updateUI();
                this.updateResourceCosts();
            }
            // Always update HUD Console if visible
            this.updateArtilleryHUD();
        }, 500);
    }

    initArtilleryHUD() {
        const container = document.getElementById('artillery-slots-container');
        if (!container) return;

        container.innerHTML = ''; // Reset

        MISSILE_DATABASE.forEach(m => {
            const slot = document.createElement('div');
            slot.id = `artillery-slot-${m.id}`;
            slot.className = 'artillery-slot';
            slot.title = m.name;

            // Image
            const img = document.createElement('img');
            img.src = m.image;
            slot.appendChild(img);

            // Stock Badge
            const badge = document.createElement('div');
            badge.className = 'stock-badge';
            badge.innerText = '0';
            slot.appendChild(badge);

            // Button (AUTO or READY)
            const btn = document.createElement('button');
            btn.className = 'btn-artillery-toggle';
            if (m.id === 'mkx_voyager') {
                btn.classList.add('voyager');
                btn.innerText = 'READY';
                btn.onclick = (e) => { e.stopPropagation(); this.prepareVoyagerStrike(); };
            } else {
                const isAuto = this.autoFireState[m.id];
                btn.innerText = isAuto ? 'AUTO ON' : 'AUTO OFF';
                if (isAuto) btn.classList.add('on');
                btn.onclick = (e) => { e.stopPropagation(); this.toggleAutoFire(m.id, btn); };
            }
            slot.appendChild(btn);

            container.appendChild(slot);
        });
    }

    toggleAutoFire(id, btn) {
        this.autoFireState[id] = !this.autoFireState[id];
        btn.innerText = this.autoFireState[id] ? 'AUTO ON' : 'AUTO OFF';
        btn.classList.toggle('on', this.autoFireState[id]);
        this.saveState();

        if (typeof showGameNotification === 'function') {
            showGameNotification(`${MISSILE_DATABASE.find(m => m.id === id).name}: AUTO FIRE ${this.autoFireState[id] ? 'ACTIVATED' : 'DISABLED'}`);
        }
    }

    updateArtilleryHUD() {
        MISSILE_DATABASE.forEach(m => {
            const slot = document.getElementById(`artillery-slot-${m.id}`);
            if (!slot) return;

            const qty = this.storage[m.id] || 0;
            const badge = slot.querySelector('.stock-badge');
            if (badge) badge.innerText = qty;

            // Activate slot if stock > 0
            slot.classList.toggle('active', qty > 0);
        });
    }

    updateStorageUI() {
        // Alias for the update loop to trigger immediate sync
        this.updateArtilleryHUD();
        // Also update the main weapons window if it's open
        if (this.window && this.window.style.display === 'flex') {
            this.updateUI();
        }
    }

    prepareVoyagerStrike() {
        if ((this.storage['mkx_voyager'] || 0) <= 0) {
            if (typeof showGameNotification === 'function') showGameNotification("MK-X VOYAGER STOCK DEPLETED");
            return;
        }

        if (window.mapModule) {
            if (typeof showGameNotification === 'function') showGameNotification("SELECT TARGET SYSTEM ON STELLAR MAP");
            window.mapModule.initStrategicMode();
        }
    }

    resizeParticleCanvas() {
        if (!this.particleCanvas) return;
        const rect = this.particleCanvas.getBoundingClientRect();
        this.particleCanvas.width = rect.width;
        this.particleCanvas.height = rect.height;
    }

    injectNavButtons() {
        // Injecting navigation arrows into the fabrication panel (parent of wrapper)
        // to avoid being affected by pointer-events: none on the wrapper
        const fabPanel = document.querySelector('.fabrication-panel');
        if (fabPanel && !document.getElementById('weapons-nav-left')) {
            const leftBtn = document.createElement('button');
            leftBtn.id = 'weapons-nav-left';
            leftBtn.className = 'weapons-nav-btn left';
            leftBtn.innerHTML = '❮';
            leftBtn.onclick = (e) => { e.stopPropagation(); this.navigate(-1); };

            const rightBtn = document.createElement('button');
            rightBtn.id = 'weapons-nav-right';
            rightBtn.className = 'weapons-nav-btn right';
            rightBtn.innerHTML = '❯';
            rightBtn.onclick = (e) => { e.stopPropagation(); this.navigate(1); };

            fabPanel.appendChild(leftBtn);
            fabPanel.appendChild(rightBtn);
        }
    }

    navigate(dir) {
        if (this.isWorking) return;
        this.selectedIndex += dir;
        if (this.selectedIndex < 0) this.selectedIndex = MISSILE_DATABASE.length - 1;
        if (this.selectedIndex >= MISSILE_DATABASE.length) this.selectedIndex = 0;

        this.updateUI();
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
                x: Math.random() * (this.particleCanvas ? this.particleCanvas.width : 500),
                y: Math.random() * (this.particleCanvas ? this.particleCanvas.height : 500),
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
        const weapon = MISSILE_DATABASE[this.selectedIndex];

        Object.entries(weapon.costs).forEach(([res, cost]) => {
            const el = document.querySelector(`.res-item[data-res="${res}"]`);
            if (el) {
                const owned = res === 'RUC' ? window.skillManager.credits : window.skillManager.getOwned(res);
                const valEl = el.querySelector('.res-val');
                if (valEl) {
                    valEl.innerText = cost.toLocaleString();
                    valEl.style.color = owned >= cost ? '#ff9900' : '#ff4444';
                }
            }
        });
    }

    updateUI() {
        const weapon = MISSILE_DATABASE[this.selectedIndex];
        const state = this.researchState[weapon.id] || { completed: false, progress: 0 };

        // 1. Text Info
        const nameEl = document.querySelector('.spec-name');
        const descEl = document.querySelector('.spec-desc');
        const typeEl = document.querySelector('.weapons-status'); // Recycled element
        const labHeader = document.querySelector('.readout-header');

        if (nameEl) nameEl.innerText = weapon.name;
        if (descEl) descEl.innerText = weapon.desc;
        if (typeEl) typeEl.innerText = weapon.type;
        if (labHeader) labHeader.innerText = `PROJECT: ${weapon.id.toUpperCase()}_RESEARCH_V1`;

        // 2. Images
        const fabImg = document.getElementById('weapons-construction-img');
        const resImg = document.querySelector('.research-display-box img');

        if (fabImg) fabImg.src = weapon.image;
        if (resImg) resImg.src = weapon.image;

        // 3. Stats (Injecting or updating)
        this.updateStatsReadout(weapon);

        // 4. Research Progress UI
        const researchProgressFill = document.getElementById('research-progress-fill');
        const researchPct = document.getElementById('weapons-research-percentage');
        const resWrapper = document.getElementById('weapons-research-wrapper');
        const resOverlay = document.getElementById('weapons-research-box');

        if (researchProgressFill) researchProgressFill.style.width = `${Math.floor(state.progress)}%`;
        if (researchPct) researchPct.innerText = `${Math.floor(state.progress)}%`;

        if (resWrapper) {
            if (state.completed) {
                resWrapper.classList.add('research-complete');
                if (resOverlay) resOverlay.querySelector('.overlay-text').innerText = "CALIBRATION SECURE";
            } else {
                resWrapper.classList.remove('research-complete');
                if (resOverlay) resOverlay.querySelector('.overlay-text').innerText = this.isWorking ? "PROCESSING..." : "START RESEARCH";
            }
        }

        // 5. Fabrication UI
        const fabWrapper = document.getElementById('weapons-construction-wrapper');
        const fabStatus = document.getElementById('weapons-construction-percentage');

        if (fabWrapper) {
            if (state.completed) {
                fabWrapper.style.opacity = '1';
                fabWrapper.style.pointerEvents = 'auto';
                if (fabStatus && !this.isWorking) fabStatus.innerText = "READY TO FABRICATE";
            } else {
                fabWrapper.style.opacity = '0.3';
                fabWrapper.style.pointerEvents = 'none';
                if (fabStatus) fabStatus.innerText = "RESEARCH REQUIRED";
            }
        }
    }

    updateStatsReadout(weapon) {
        // Find or create stat readout in the lab notes or near descriptions
        let statsContainer = document.getElementById('weapons-stats-readout');
        if (!statsContainer) {
            const labNotes = document.querySelector('.lab-notes');
            if (labNotes) {
                statsContainer = document.createElement('div');
                statsContainer.id = 'weapons-stats-readout';
                statsContainer.style.cssText = 'margin-top:10px; border-top:1px solid rgba(255,153,0,0.1); padding-top:10px; font-family:monospace; font-size:10px; color:#5096c8;';
                labNotes.parentElement.appendChild(statsContainer);
            }
        }

        if (statsContainer) {
            statsContainer.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span>YIELD_CAPACITY:</span> <span style="color:#ff9900">${weapon.damage}GJ</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span>PROPULSION_VELOCITY:</span> <span style="color:#ff9900">${weapon.speed.toFixed(1)}kps</span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                    <span>FAB_CYCLE_TIME:</span> <span style="color:#ff9900">${(weapon.fabTime / 1000).toFixed(0)}s</span>
                </div>
            `;
        }
    }

    startResearch() {
        const weapon = MISSILE_DATABASE[this.selectedIndex];

        // Ensure state is initialized in the main registry
        if (!this.researchState[weapon.id]) {
            this.researchState[weapon.id] = { completed: false, progress: 0 };
        }

        const state = this.researchState[weapon.id];
        if (this.isWorking || state.completed) return;

        this.isWorking = true;
        const researchBox = document.getElementById('weapons-research-box');

        researchBox.parentElement.classList.add('research-active');
        if (typeof showGameNotification === 'function') {
            showGameNotification(`INITIATING ${weapon.name} RESEARCH...`);
        }

        const totalTime = weapon.researchTime;
        const interval = 100;
        const progressPerTick = (interval / totalTime) * 100;

        const timer = setInterval(() => {
            state.progress += progressPerTick;

            if (state.progress >= 100) {
                state.progress = 100;
                clearInterval(timer);
                this.isWorking = false;
                state.completed = true;

                this.saveState();

                researchBox.parentElement.classList.remove('research-active');
                if (typeof showGameNotification === 'function') {
                    showGameNotification(`SCHEMATICS SECURED: ${weapon.name}`);
                }
            }

            // UI Update is handled by the main app loop (setInterval in init)
            // But we can call it here for immediate responsiveness
            this.updateUI();

            // Auto-save every 5% for persistence
            if (Math.floor(state.progress) % 5 === 0) this.saveState();
        }, interval);
    }

    startConstruction() {
        const weapon = MISSILE_DATABASE[this.selectedIndex];
        const state = this.researchState[weapon.id] || { completed: false };

        if (!state.completed || this.isWorking) return;

        // Resource Check
        if (!window.skillManager) return;
        let hasAll = true;
        Object.entries(weapon.costs).forEach(([res, cost]) => {
            const owned = res === 'RUC' ? window.skillManager.credits : window.skillManager.getOwned(res);
            if (owned < cost) hasAll = false;
        });

        if (!hasAll) {
            if (typeof showGameNotification === 'function') showGameNotification("INSUFFICIENT RESOURCES");
            return;
        }

        // Deduct
        Object.entries(weapon.costs).forEach(([res, cost]) => {
            if (res === 'RUC') window.skillManager.spendCredits(cost);
            else window.skillManager.removeFromInventory(res, cost);
        });

        this.isWorking = true;
        const percentageTxt = document.getElementById('weapons-construction-percentage');
        const fabWrapper = document.getElementById('weapons-construction-wrapper');

        let progress = 0;
        fabWrapper.classList.add('construction-active');

        if (typeof showGameNotification === 'function') {
            showGameNotification(`FABRICATION INITIATED: ${weapon.name}`);
        }

        const totalTime = weapon.fabTime;
        const interval = 100;
        const progressPerTick = (interval / totalTime) * 100;

        const timer = setInterval(() => {
            progress += progressPerTick;
            let displayPct = Math.floor(progress);

            if (displayPct >= 100) {
                displayPct = 100;
                clearInterval(timer);
                this.isWorking = false;
                fabWrapper.classList.remove('construction-active');

                // Add to Storage
                this.storage[weapon.id] = (this.storage[weapon.id] || 0) + 1;
                this.saveState();
                this.updateStorageUI();

                if (typeof showGameNotification === 'function') {
                    showGameNotification(`FABRICATION COMPLETE: ${weapon.name}`);
                }
                this.updateUI();
            }

            if (percentageTxt) percentageTxt.innerText = `FABRICATING: ${displayPct}%`;
        }, interval);
    }

    updateStorageUI() {
        const storageGrid = document.getElementById('weapons-storage-grid');
        const emptyMsg = document.getElementById('storage-empty-msg');
        if (!storageGrid) return;

        // Clear existing to avoid duplicates, keep empty message logic
        storageGrid.innerHTML = '';

        let hasItems = false;
        Object.entries(this.storage).forEach(([id, qty]) => {
            if (qty <= 0) return;
            hasItems = true;
            const weapon = MISSILE_DATABASE.find(m => m.id === id);
            if (!weapon) return;

            const item = document.createElement('div');
            item.className = 'weapons-storage-item-4k';
            item.innerHTML = `
                <img src="${weapon.image}" class="storage-img-mini">
                <div class="storage-qty-badge">${qty}</div>
            `;
            storageGrid.appendChild(item);
        });

        if (emptyMsg) emptyMsg.style.display = hasItems ? 'none' : 'flex';
    }
}

window.initWeapons = () => {
    window.weaponsModule = new WeaponsModule();
};



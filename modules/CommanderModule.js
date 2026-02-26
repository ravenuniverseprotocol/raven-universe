const SKILL_DATA = {
    "Station Operations": [
        { id: "power_grid_calibration", name: "Power Grid Calibration", multiplier: 1, description: "Master energy distribution. Lvl 2: Unlocks Radar, Lvl 3: Unlocks Shields." },
        { id: "basic_technical_literacy", name: "Basic Technical Literacy", multiplier: 1, description: "Master technical manuals. Lvl 2+: Global training speed +5% per lvl." },
        { id: "atmospheric_scrubbing", name: "Atmospheric Scrubbing", multiplier: 1, description: "Gas recycling. Significantly reduces O2 consumption per level (95%+ Max Efficiency)." },
        { id: "kernel_boot_sequence", name: "Kernel Boot Sequence", multiplier: 1, description: "Execute the master OS ignition protocol." }
    ],
    "Radar Systems": [
        { id: "scanner_range", name: "Scanner Range", multiplier: 1.2, description: "" },
        { id: "signal_resolution", name: "Signal Resolution", multiplier: 1.2, description: "" },
        { id: "sweep_velocity", name: "Sweep Velocity", multiplier: 1.2, description: "" },
        { id: "interference_filtering", name: "Interference Filtering", multiplier: 1.2, description: "" },
        { id: "tracking_capacity", name: "Tracking Capacity", multiplier: 1.2, description: "" }
    ],
    "Shield Systems": [
        { id: 'shield_operation', name: 'Shield Operation', multiplier: 1.0, description: "" },
        { id: 'shield_management', name: 'Shield Management', multiplier: 1.0, description: "" },
        { id: 'shield_upgrades', name: 'Shield Upgrades', multiplier: 1.0, description: "" },
        { id: 'tactical_shield_manipulation', name: 'Tactical Shield Manipulation', multiplier: 1.0, description: "" },
        { id: 'shield_compensation', name: 'Shield Compensation', multiplier: 1.0, description: "" }
    ],
    "Orbital Weapons": [
        { id: "ordnance_systems_ignition", name: "Ordnance Systems Ignition", multiplier: 1.0, description: "Master OS ignition protocol. Requer Power Grid Lvl 4. Ativa o lança-mísseis." },
        { id: "warhead_optimization", name: "Warhead Optimization", multiplier: 1.2, description: "Aumenta o yield das ogivas planetárias." },
        { id: "target_lock_speed", name: "Target Lock Speed", multiplier: 1.2, description: "Reduz o tempo de trancagem de alvos (Lock-on)." },
        { id: "missile_propulsion", name: "Propulsion Calibration", multiplier: 1.1, description: "Aumenta a velocidade de viagem dos projéteis." }
    ]
};

const BASE_TIME = 10;

class SkillManager {
    constructor(initialState = null) {
        this.skills = this.loadSkills(null); // Always fresh
        this.queue = []; // Always empty
        this.lastUpdateTime = Date.now();
        this.onlineAnnounced = false; // Reset
        this.commanderName = 'UNIDENTIFIED'; // Reset
        this.credits = 5000; // Reset
        this.inventory = { 'OXYGEN': 500 }; // Reset
        this.homeSystem = "10.05.29"; // Reset
        this.homeCoords = { x: 0, y: 0 }; // Reset
        this.isOnline = false;
        this.radarUnlocked = false;
        this.radarAnnounced = false; // Reset
        this.expandedStates = { "Station Operations": true, "Radar Systems": true, "Shield Systems": true };
        this.storefront = []; // Reset

        // Initial state check
        this.checkOnlineStatus(true);
        setTimeout(() => {
            this.updateCommanderNameUI();
            this.updateCreditsUI();
        }, 100);
    }

    loadSkills(savedSkills) {
        const currentSkills = savedSkills || {};

        const cleanedSkills = {};
        // APENAS carregar skills que existem no SKILL_DATA atual
        Object.values(SKILL_DATA).flat().forEach(s => {
            cleanedSkills[s.id] = currentSkills[s.id] || {
                id: s.id,
                level: 0,
                points: 0,
                multiplier: s.multiplier || 1.0
            };
        });
        return cleanedSkills;
    }

    loadStorefront() {
        const saved = localStorage.getItem('raven_storefront');
        return saved ? JSON.parse(saved) : [];
    }

    checkOnlineStatus(isInitial = false) {
        const stationImg = document.querySelector('.station-image');
        if (!stationImg) return;

        const coreSkills = SKILL_DATA["Station Operations"];
        const learnedAll = coreSkills.every(s => this.skills[s.id] && this.skills[s.id].level >= 1);

        if (learnedAll) {
            this.isOnline = true;
            stationImg.classList.remove('offline');
            if (!this.onlineAnnounced && !isInitial) {
                this.playOnlineSound();
                this.onlineAnnounced = true;
                localStorage.setItem('raven_online_announced', 'true');
            }
            // Trigger Name Popup if not set (sempre que online, mesmo no refresh)
            if (this.commanderName === 'UNIDENTIFIED') {
                this.showNameEntryPopup();
            } else {
                this.radarUnlocked = true;
                this.renderCategories();
            }

            // Check Missile Launcher Visuals
            this.checkMissileStatus();
        } else {
            this.isOnline = false;
            stationImg.classList.add('offline');
            // Se as skills foram resetadas, resetar também o anúncio
            if (this.onlineAnnounced) {
                this.onlineAnnounced = false;
                localStorage.removeItem('raven_online_announced');
            }
        }
    }

    checkMissileStatus() {
        const launcher = document.getElementById('missile-launcher');
        if (!launcher) return;

        // Requires Power Grid Lvl 4 AND ALL 4 Orbital Weapons skills at Lvl 1+
        const gridLvl = this.skills['power_grid_calibration'] ? this.skills['power_grid_calibration'].level : 0;

        const weaponSkills = SKILL_DATA["Orbital Weapons"];
        const weaponsFunctional = weaponSkills.every(s => this.skills[s.id] && this.skills[s.id].level >= 1);

        if (gridLvl >= 4 && weaponsFunctional) {
            launcher.classList.add('active');
        } else {
            launcher.classList.remove('active');
        }

        // Load saved position
        if (!launcher.dataset.posLoaded) {
            const savedLeft = localStorage.getItem('missile_pos_left');
            const savedTop = localStorage.getItem('missile_pos_top');
            if (savedLeft) launcher.style.left = savedLeft;
            if (savedTop) launcher.style.top = savedTop;
            launcher.dataset.posLoaded = "true";
        }
    }

    showNameEntryPopup() {
        const modal = document.getElementById('identify-modal');
        const input = document.getElementById('commander-name-input');
        const btn = document.getElementById('confirm-name-btn');

        if (modal) {
            modal.style.display = 'flex';
            if (btn) {
                btn.onclick = () => {
                    const name = input.value.trim().toUpperCase();
                    if (name) {
                        this.commanderName = name;
                        localStorage.setItem('raven_commander_name', name);
                        modal.style.display = 'none';
                        this.updateCommanderNameUI();
                        this.playWelcomeSound();
                        this.radarUnlocked = true;
                        this.renderCategories();
                    }
                };
            }
        }
    }

    updateCommanderNameUI() {
        const nameDisplay = document.getElementById('commander-name');
        if (nameDisplay) {
            nameDisplay.textContent = this.commanderName;
        }
    }

    playWelcomeSound() {
        const audio = new Audio('assets/media/Welcome Comander.mp3');
        audio.play().catch(e => console.error("Erro ao reproduzir som de boas-vindas:", e));
    }

    playOnlineSound() {
        const audio = new Audio('assets/media/Sistems Online.mp3');
        audio.play().catch(e => console.error("Erro ao reproduzir som:", e));
    }

    playRadarOnlineSound() {
        const audio = new Audio('assets/media/Radar Sistem Online.mp3');
        audio.play().catch(e => console.error("Erro ao reproduzir som do radar:", e));
    }

    checkRadarStatus() {
        if (!this.radarUnlocked) return false;

        // POWER GATE: Requires Power Grid Lvl 2
        const gridLvl = this.skills['power_grid_calibration'] ? this.skills['power_grid_calibration'].level : 0;
        if (gridLvl < 2) return false;

        const radarSkills = SKILL_DATA["Radar Systems"];
        const functional = radarSkills.every(s => this.skills[s.id] && this.skills[s.id].level >= 1);

        if (functional && !this.radarAnnounced) {
            this.playRadarOnlineSound();
            this.radarAnnounced = true;
            localStorage.setItem('radar_announced', 'true');

            // Timed Visual Appearance: Wait for system voice to conclude (~2.5s)
            setTimeout(() => {
                const radarVisual = document.getElementById('radar-visual');
                if (radarVisual) {
                    radarVisual.classList.add('active');
                }
            }, 2500);
        } else if (!functional) {
            this.radarAnnounced = false;
            localStorage.removeItem('radar_announced');

            const radarVisual = document.getElementById('radar-visual');
            if (radarVisual) radarVisual.classList.remove('active');
        }

        // Apply calibrated position (if exists)
        const radarVisual = document.getElementById('radar-visual');
        if (radarVisual && !radarVisual.dataset.posLoaded) {
            let savedLeft = localStorage.getItem('radar_pos_left');
            const savedTop = localStorage.getItem('radar_pos_top');

            if (savedLeft) {
                // Apply 10px shift as requested
                if (savedLeft.includes('px')) {
                    savedLeft = (parseInt(savedLeft) + 10) + "px";
                }
                radarVisual.style.left = savedLeft;
            }
            if (savedTop) radarVisual.style.top = savedTop;
            radarVisual.dataset.posLoaded = "true";
        }

        return functional;
    }

    checkShieldStatus() {
        if (!this.radarUnlocked) return false; // Unlock together for now

        // POWER GATE: Requires Power Grid Lvl 3
        const gridLvl = this.skills['power_grid_calibration'] ? this.skills['power_grid_calibration'].level : 0;
        if (gridLvl < 3) return false;

        const shieldSkills = SKILL_DATA["Shield Systems"];
        const functional = shieldSkills.every(s => this.skills[s.id] && this.skills[s.id].level >= 1);

        const bubble = document.getElementById('shield-bubble');
        const core = document.getElementById('shield-core');

        if (functional) {
            if (!this.shieldsAnnounced) {
                this.playShieldsOnlineSound();
                this.shieldsAnnounced = true;
                localStorage.setItem('shields_announced', 'true');
            }

            // SEQUENCE: 1. Core Ignition In, 2. Shield Bubble In (after delay)
            if (core) core.classList.add('active');

            if (bubble) {
                // Delay bubble to appearance after core starts glowing
                setTimeout(() => {
                    bubble.classList.add('active');
                }, 1500);
            }
        } else {
            this.shieldsAnnounced = false;
            localStorage.removeItem('shields_announced');
            if (core) core.classList.remove('active');
            if (bubble) bubble.classList.remove('active');
        }

        // HUD Visibility Synchronization
        const hud = document.getElementById('shield-hud');
        if (hud) {
            hud.style.display = functional ? 'flex' : 'none';
            if (functional && typeof window.recalculateShields === 'function') {
                window.recalculateShields();
            }
        }

        return functional;
    }

    playShieldsOnlineSound() {
        const audio = new Audio('assets/media/Shield System Online.mp3');
        audio.play().catch(e => console.warn("Audio play blocked (Shields):", e));

        if (typeof showGameNotification === 'function') {
            showGameNotification("SHIELD SYSTEMS ONLINE - DEFENSES ACTIVE");
        }
    }

    loadQueue() {
        const saved = localStorage.getItem('raven_skill_queue');
        const queue = saved ? JSON.parse(saved) : [];
        // FILTRAGEM ESTRITA: Remove qualquer item da fila que não pertença a uma skill oficial
        return queue.filter(q => this.getSkillInfo(q.id));
    }

    save() {
        // Progression persistence disabled by user request.
        // Values will now reset on refresh.
    }

    async heartbeat() {
        const token = localStorage.getItem('raven_token');
        if (!token) return;

        const API_BASE_URL = window.location.protocol === 'file:' ? 'https://raven-universe.onrender.com' : '';

        try {
            await fetch(`${API_BASE_URL}/api/game/heartbeat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                }
            });
        } catch (err) {
            console.error('[HEARTBEAT] Connection failed:', err);
        }
    }

    listForSale(resourceId, qty, price) {
        const id = resourceId.toUpperCase();
        if (this.removeFromInventory(id, qty)) {
            const listing = {
                id: 'LIST-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
                resource: id,
                qty: qty,
                price: price,
                seller: this.commanderName
            };
            this.storefront.push(listing);
            this.save();
            return true;
        }
        return false;
    }

    cancelListing(listingId) {
        const idx = this.storefront.findIndex(l => l.id === listingId);
        if (idx !== -1) {
            const listing = this.storefront.splice(idx, 1)[0];
            this.addToInventory(listing.resource, listing.qty);
            this.save();
            return true;
        }
        return false;
    }

    addCredits(amount) {
        this.credits += amount;
        this.save();
        this.updateCreditsUI();
    }

    spendCredits(amount) {
        if (this.credits >= amount) {
            this.credits -= amount;
            this.save();
            this.updateCreditsUI();
            return true;
        }
        return false;
    }

    updateCreditsUI() {
        const hudWallet = document.getElementById('hud-wallet-value');
        if (hudWallet) hudWallet.innerText = this.credits.toLocaleString();

        const marketWallet = document.getElementById('market-wallet-value');
        if (marketWallet) marketWallet.innerText = this.credits.toLocaleString();
    }

    addToInventory(id, qty = 1) {
        const key = id.toUpperCase().replace(/\s/g, '_');
        this.inventory[key] = (this.inventory[key] || 0) + qty;
        console.log(`[INVENTORY] Added ${qty} to ${key}. Current total: ${this.inventory[key]}`);
        this.save();
    }

    removeFromInventory(id, qty = 1) {
        const key = id.toUpperCase().replace(/\s/g, '_');
        if (this.inventory[key] && this.inventory[key] >= qty) {
            this.inventory[key] -= qty;
            if (this.inventory[key] <= 0) delete this.inventory[key];
            this.save();
            return true;
        }
        return false;
    }

    getOwned(id) {
        if (!id) return 0;
        const key = id.toUpperCase().replace(/\s/g, '_');
        return this.inventory[key] || 0;
    }

    getSkillInfo(id) {
        return Object.values(SKILL_DATA).flat().find(s => s.id === id);
    }

    getTimeRequired(id, level) {
        const info = this.getSkillInfo(id);
        if (!info) return 0;

        // Accelerated progression for Power Grid (Lvl 2 and 3)
        if (id === 'power_grid_calibration') {
            if (level === 2) return 20;
            if (level === 3) return 40;
        }

        // Training Speed Bonuses (Literacy & Kernel)
        const litLvl = this.skills['basic_technical_literacy'] ? this.skills['basic_technical_literacy'].level : 1;
        const bootLvl = this.skills['kernel_boot_sequence'] ? this.skills['kernel_boot_sequence'].level : 1;

        // Cumulative bonus: 5% per level above 1 for both skills
        const totalBonusFactor = (Math.max(0, litLvl - 1) + Math.max(0, bootLvl - 1)) * 0.05;
        const speedMultiplier = 1 + totalBonusFactor;

        const baseTime = Math.floor(BASE_TIME * info.multiplier * Math.pow(5, level - 1));
        return Math.floor(baseTime / speedMultiplier);
    }

    // HELPER GETTERS FOR OTHER MODULES
    getContractBonus() {
        // Power Grid no longer gives credits (moved to power management)
        return 1.0;
    }

    getContractSlotCount() {
        // Fixed 3 slots (until Management skills added)
        return 3;
    }

    getLaunchSpeedFactor() {
        // Fixed 1.0 (until Logistics skills added)
        return 1.0;
    }

    getFuelEfficiencyFactor() {
        // Basic Technical Literacy: +5% duration per level above 1
        const lvl = this.skills['basic_technical_literacy'] ? this.skills['basic_technical_literacy'].level : 1;
        return 1 + (Math.max(0, lvl - 1) * 0.05);
    }

    getGlobalEfficiencyMultiplier() {
        // Fixed 1.0 (until Leadership skills added)
        return 1.0;
    }

    getRichNodeDiscoveryChance() {
        // Fixed 0 (until Decision skills added)
        return 0;
    }

    // RADAR HELPERS
    getRadarRange() {
        // Scanner Range: Lvl 1: 500, then +1125 per lvl up to 5000 (Lvl 4), Lvl 5: 10000 (Full Sector)
        const lvl = this.skills['scanner_range'] ? this.skills['scanner_range'].level : 1;
        if (lvl >= 5) return 10000;
        return 500 + (Math.max(0, lvl - 1) * 1125);
    }

    getSignalResolution() {
        // Signal Resolution: Retorna o nível de identificação (1-5)
        return this.skills['signal_resolution'] ? this.skills['signal_resolution'].level : 1;
    }

    getRadarSweepRate() {
        // Sweep Velocity: 1: 2s, 2: 1s, 3: 0.5s, 4: 0.1s, 5: 0.01s (Realtime)
        const lvl = this.skills['sweep_velocity'] ? this.skills['sweep_velocity'].level : 1;
        const rates = [2, 2, 1, 0.5, 0.1, 0.016]; // 0.016 is ~60fps
        return rates[lvl] || 2;
    }

    getInterferenceFilter() {
        // Interference Filtering: Retorna o nível de filtragem (1-5)
        return this.skills['interference_filtering'] ? this.skills['interference_filtering'].level : 1;
    }

    getTrackingCapacity() {
        // Tracking Capacity: 3, 6, 12, 24, Infinite(99)
        const lvl = this.skills['tracking_capacity'] ? this.skills['tracking_capacity'].level : 1;
        const caps = [3, 3, 6, 12, 24, 99];
        return caps[lvl] || 3;
    }

    addToQueue(id) {
        const info = this.getSkillInfo(id);
        if (!info) {
            console.error(`Skill ID ${id} não é oficial e foi bloqueada.`);
            return;
        }

        const skill = this.skills[id];
        const currentLevel = skill ? skill.level : 0;
        const targetLevel = currentLevel + 1;

        if (targetLevel > 5) return;
        if (this.queue.find(q => q.id === id && q.level === targetLevel)) return;

        this.queue.push({
            id: id,
            level: targetLevel,
            totalTime: this.getTimeRequired(id, targetLevel),
            remainingTime: this.getTimeRequired(id, targetLevel)
        });
        this.save();
        this.renderQueue();
    }

    update() {
        const now = Date.now();
        const dt = (now - this.lastUpdateTime) / 1000;
        this.lastUpdateTime = now;

        if (this.queue.length === 0) {
            this.renderQueue();
            return;
        }

        const currentTask = this.queue[0];
        // Garantia extra: se por algum motivo um fantasma chegar aqui, removemos
        if (!this.getSkillInfo(currentTask.id)) {
            this.queue.shift();
            this.save();
            return;
        }

        currentTask.remainingTime -= dt;
        if (currentTask.remainingTime <= 0) {
            this.skills[currentTask.id].level = currentTask.level;
            this.queue.shift();

            // IMPORTANT: Check status BEFORE rendering to ensure gates are open in the UI
            this.checkOnlineStatus();
            this.checkRadarStatus();
            this.checkShieldStatus();

            this.renderCategories();
            if (typeof window.recalculateShields === 'function') window.recalculateShields();
        }
        this.renderQueue();
        this.save();
    }

    renderCategories() {
        const container = document.getElementById('skill-categories');
        if (!container) return;
        container.innerHTML = '';

        for (const [catName, skills] of Object.entries(SKILL_DATA)) {
            const isExpanded = this.expandedStates[catName] !== false;
            const gridLvl = this.skills['power_grid_calibration'] ? this.skills['power_grid_calibration'].level : 0;

            let isLocked = false;
            let lockReason = "";

            if (!this.radarUnlocked && (catName === "Radar Systems" || catName === "Shield Systems")) {
                isLocked = true;
                lockReason = "(LOCKED)";
            } else if (catName === "Radar Systems" && gridLvl < 2) {
                isLocked = true;
                lockReason = "(INSUFFICIENT POWER)";
            } else if (catName === "Shield Systems" && gridLvl < 3) {
                isLocked = true;
                lockReason = "(INSUFFICIENT POWER)";
            } else if (catName === "Orbital Weapons" && gridLvl < 4) {
                isLocked = true;
                lockReason = "(INSUFFICIENT POWER)";
            }

            const catDiv = document.createElement('div');
            catDiv.className = `skill-category ${isLocked ? 'locked' : ''}`;

            const headerDiv = document.createElement('div');
            headerDiv.className = 'category-header';
            if (!isLocked) {
                headerDiv.onclick = () => {
                    this.expandedStates[catName] = !isExpanded;
                    this.renderCategories();
                };
            }

            headerDiv.innerHTML = `
                <span class="category-toggle">${isLocked ? '🔒' : (isExpanded ? '▾' : '▸')}</span>
                <span class="category-title">${catName} ${lockReason}</span>
            `;

            catDiv.appendChild(headerDiv);

            if (isExpanded && !isLocked) {
                const listDiv = document.createElement('div');
                listDiv.className = 'skill-list';

                skills.forEach(s => {
                    const current = this.skills[s.id] || { level: 0 };
                    const isMaxed = current.level >= 5;
                    const item = document.createElement('div');
                    item.className = `skill-item ${isMaxed ? 'maxed' : ''}`;
                    if (!isMaxed) {
                        item.onclick = (e) => {
                            e.stopPropagation();
                            this.addToQueue(s.id);
                        };
                    }

                    let levelBoxes = '';
                    for (let i = 1; i <= 5; i++) {
                        levelBoxes += `<div class="level-box ${i <= current.level ? 'filled' : ''}"></div>`;
                    }

                    item.innerHTML = `
                        <span>${s.name}</span>
                        <div class="skill-level-boxes">${levelBoxes}</div>
                    `;
                    listDiv.appendChild(item);
                });
                catDiv.appendChild(listDiv);
            }
            container.appendChild(catDiv);
        }
    }

    renderQueue() {
        const commanderModal = document.getElementById('skill-window');
        // Optimization: Only render if the window is actually visible
        if (commanderModal && commanderModal.style.display === 'none') return;

        const container = document.getElementById('skill-queue-list');
        if (!container) return;

        if (this.queue.length === 0) {
            if (container.innerHTML !== '<div style="color:#555;font-size:11px;">Fila vazia</div>') {
                container.innerHTML = '<div style="color:#555;font-size:11px;">Fila vazia</div>';
            }
            return;
        }

        // Only rebuild the entire HTML if the queue structure changed or every second for the timer
        // This stops the 60fps flickering
        const now = Date.now();
        if (this.lastRenderTime && (now - this.lastRenderTime < 1000) && this.queue.length === this.lastQueueLength) {
            return;
        }
        this.lastRenderTime = now;
        this.lastQueueLength = this.queue.length;

        container.innerHTML = '';
        this.queue.forEach((q, index) => {
            const info = this.getSkillInfo(q.id);
            if (!info) return; // BLOQUEIO FINAL: Não renderiza se não for oficial

            const item = document.createElement('div');
            item.className = 'queue-item';
            const progress = index === 0 ? ((q.totalTime - q.remainingTime) / q.totalTime) : 0;
            const timeStr = this.formatTime(q.remainingTime);
            let squaresHtml = '';
            for (let i = 1; i <= 5; i++) {
                const isFilled = i / 5 <= progress;
                squaresHtml += `<div class="queue-level-box ${isFilled ? 'filled' : ''}"></div>`;
            }
            item.innerHTML = `
                <div class="queue-name">${info.name} ${q.level}</div>
                <div class="queue-time">${index === 0 ? timeStr : 'A aguardar...'}</div>
                <div class="queue-progress-squares">${squaresHtml}</div>
            `;
            container.appendChild(item);
        });

        this.renderMastery();
    }

    renderMastery() {
        const container = document.getElementById('mastery-list');
        if (!container) return;

        container.innerHTML = '';
        const allSkills = Object.values(SKILL_DATA).flat();
        const mastered = allSkills.filter(s => this.skills[s.id] && this.skills[s.id].level >= 5);

        if (mastered.length === 0) {
            container.innerHTML = '<div style="color:#444;font-size:10px;text-align:center;padding:10px;">NO MASTERY ACHIEVED</div>';
            return;
        }

        mastered.forEach(s => {
            const item = document.createElement('div');
            item.className = 'mastery-item';
            item.innerHTML = `
                <span class="mastery-name">${s.name}</span>
                <span class="master-tag">MASTERED</span>
            `;
            container.appendChild(item);
        });
    }

    formatTime(seconds) {
        if (seconds < 0) return "0s";
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
    }
}

// Initial instantiation removed to wait for Auth Gate
// const skillManager = new SkillManager(); 
// window.skillManager = skillManager;

function initCommander(initialState) {
    const skillManager = new SkillManager(initialState);
    window.skillManager = skillManager; // Expose globally for other modules
    const commanderModal = document.getElementById('skill-window');
    const commanderBtn = document.querySelector('[title="Commander"]');

    if (commanderBtn && commanderModal) {
        commanderBtn.onclick = () => {
            commanderModal.style.display = 'flex';
            skillManager.renderCategories();
            skillManager.renderQueue();
        };
        makeDraggable(commanderModal);
    }

    // Profile upload logic
    const profileContainer = document.querySelector('.profile-icon-container');
    const profileUpload = document.getElementById('profile-upload');
    const profileSvg = profileContainer ? profileContainer.querySelector('svg') : null;
    const sidebarCommander = document.querySelector('[title="Commander"] .icon');
    const sidebarSvg = sidebarCommander ? sidebarCommander.querySelector('svg') : null;

    function updateProfileImages(imgData) {
        if (!imgData) return;
        if (profileContainer) {
            profileContainer.style.backgroundImage = `url(${imgData})`;
            if (profileSvg) profileSvg.style.display = 'none';
        }
        if (sidebarCommander) {
            sidebarCommander.style.backgroundImage = `url(${imgData})`;
            if (sidebarSvg) sidebarSvg.style.display = 'none';
        }
    }

    const savedProfile = localStorage.getItem('raven_profile_img');
    if (savedProfile) updateProfileImages(savedProfile);

    if (profileContainer && profileUpload) {
        profileContainer.onclick = (e) => { if (e.target !== profileUpload) profileUpload.click(); };
        profileUpload.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imgData = event.target.result;
                    updateProfileImages(imgData);
                    localStorage.setItem('raven_profile_img', imgData);
                };
                reader.readAsDataURL(file);
            }
        };
    }

    // Locked Position logic for Radar Satellite
    const radarSat = document.getElementById('radar-satellite');
    if (radarSat) {
        // Load the position you defined
        const savedLeft = localStorage.getItem('radar_pos_left');
        const savedTop = localStorage.getItem('radar_pos_top');
        if (savedLeft) radarSat.style.left = savedLeft;
        if (savedTop) radarSat.style.top = savedTop;
    }

    setInterval(() => skillManager.update(), 100);

    // HEARTBEAT PROTOCOL: Track online status (no state saving)
    setInterval(() => skillManager.heartbeat(), 60000);
    // Initial heartbeat
    setTimeout(() => skillManager.heartbeat(), 2000);

    window.skillManager = skillManager;

    // Ensure Shield Logic is initialized
    if (typeof window.recalculateShields === 'function') window.recalculateShields();

    // RADAR CALIBRATION: Make it draggable
    const radarVisual = document.getElementById('radar-visual');
    if (radarVisual && typeof makeDraggable === 'function') {
        makeDraggable(radarVisual);

        // Save position on mouseup
        radarVisual.addEventListener('mouseup', () => {
            localStorage.setItem('radar_pos_left', radarVisual.style.left);
            localStorage.setItem('radar_pos_top', radarVisual.style.top);
            console.log("Radar position saved:", radarVisual.style.left, radarVisual.style.top);
        });
    }

    // Load saved position
    if (radarVisual) {
        const savedLeft = localStorage.getItem('radar_pos_left');
        const savedTop = localStorage.getItem('radar_pos_top');
        if (savedLeft) radarVisual.style.left = savedLeft;
        if (savedTop) radarVisual.style.top = savedTop;
    }

    // MISSILE LAUNCHER: Make it draggable
    const launcher = document.getElementById('missile-launcher');
    if (launcher && typeof makeDraggable === 'function') {
        makeDraggable(launcher);

        launcher.addEventListener('mouseup', () => {
            localStorage.setItem('missile_pos_left', launcher.style.left);
            localStorage.setItem('missile_pos_top', launcher.style.top);
            console.log("Missile launcher position saved:", launcher.style.left, launcher.style.top);
        });
    }
}

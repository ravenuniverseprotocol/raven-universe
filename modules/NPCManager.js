/**
 * NPCManager.js
 * Handles autonomous AI players that mirror the player's behavior.
 * Reduced to 1 AI Commander (DRAX) as requested.
 */

class NPCPlayer {
    constructor(id, name, homeX = 0, homeY = 0, stationName = "Unknown Base") {
        this.id = id;
        this.name = "DRAX";
        this.stationName = "DRAX ABODE";
        this.homeX = homeX;
        this.homeY = homeY;
        this.credits = 5000;
        this.inventory = {};
        this.skills = {};
        this.skillQueue = [];
        this.ships = [
            {
                id: `${id}-MINER-01`,
                type: 'miner',
                x: homeX, y: homeY,
                targetX: homeX, targetY: homeY,
                speed: 2,
                angle: 0,
                docked: true,
                status: 'DOCKED',
                cargo: 0,
                capacity: 100,
                miningTarget: null,
                permissionToEnter: false // Protocol for player territory
            }
        ];

        this.lastUpdate = Date.now();
        this.initSkills();
    }

    initSkills() {
        if (window.SKILL_DATA) {
            Object.values(window.SKILL_DATA).flat().forEach(s => {
                this.skills[s.id] = 0;
            });
        }
    }

    update(dt) {
        this.updateSkillQueue(dt);
        this.updateShips(dt);
        this.think(dt);
    }

    updateSkillQueue(dt) {
        if (this.skillQueue.length === 0) return;
        const task = this.skillQueue[0];
        task.remainingTime -= dt;
        if (task.remainingTime <= 0) {
            this.skills[task.id] = task.level;
            this.skillQueue.shift();
        }
    }

    updateShips(dt) {
        this.ships.forEach(ship => {
            if (ship.docked) return;

            const dx = ship.targetX - ship.x;
            const dy = ship.targetY - ship.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const distToHub = Math.sqrt(ship.x * ship.x + ship.y * ship.y);

            // BORDER CHECK: Removed protocol

            if (ship.status === 'RETURNING') {
                if (dist < 15) {
                    ship.docked = true;
                    ship.status = 'DOCKED';
                    ship.permissionToEnter = false; // Reset sovereignty flag
                    this.depositCargo(ship);
                    return;
                }
            }

            if (ship.status === 'TRADING') {
                const isOnline = window.skillManager ? window.skillManager.isOnline : false;
                if (!isOnline) {
                    ship.status = 'RETURNING';
                    ship.targetX = this.homeX;
                    ship.targetY = this.homeY;
                    return;
                }
                if (dist < 15) {
                    ship.status = 'RETURNING';
                    ship.targetX = this.homeX;
                    ship.targetY = this.homeY;
                    this.performTradeTransaction();
                    return;
                }
            }

            if (dist > 5) {
                const angleToTarget = Math.atan2(dy, dx);
                ship.angle = angleToTarget;
                const currentSpeed = (ship.speed || 2) * 60 * dt;
                ship.x += Math.cos(ship.angle) * currentSpeed;
                ship.y += Math.sin(ship.angle) * currentSpeed;
            } else if (ship.status === 'LAUNCHING') {
                ship.status = 'MINING';
            }

            if (ship.status === 'MINING') {
                if (ship.cargo < ship.capacity) {
                    ship.cargo += 0.2 * (dt * 60);
                } else {
                    ship.cargo = ship.capacity;
                    ship.status = 'RETURNING';
                    ship.targetX = this.homeX;
                    ship.targetY = this.homeY;
                }
            }
        });
    }

    depositCargo(ship) {
        if (ship.cargo > 0) {
            const key = ship.miningTarget;
            this.inventory[key] = (this.inventory[key] || 0) + Math.floor(ship.cargo);
            ship.cargo = 0;
        }
    }

    performTradeTransaction() {
        this.interactWithMarket();
    }

    think(dt) {
        // AI Logic Disabled - Emergency Revert
    }

    calculateTrainingUtility() {
        const totalLevel = Object.values(this.skills).reduce((a, b) => a + b, 0);
        return 1.0 - (totalLevel / 50);
    }

    calculateMiningUtility(ship) {
        const invTotal = Object.values(this.inventory).reduce((a, b) => a + b, 0);
        return invTotal > 1000 ? 0.1 : 0.8;
    }

    calculateTradingUtility(ship) {
        const isOnline = window.skillManager ? window.skillManager.isOnline : false;
        if (!isOnline) return 0.0;
        return this.evaluateShoppingNeeds() ? 0.95 : 0.05;
    }

    evaluateShoppingNeeds() {
        if (!window.skillManager || !window.skillManager.storefront) return false;
        return window.skillManager.storefront.some(l => (this.inventory[l.resource] || 0) < 20 && l.price < 500 && l.seller !== this.name);
    }

    listGoodsRemotely() {
        // Disabled
    }

    decideNextSkill() {
        const priorities = ['power_grid_calibration', 'basic_technical_literacy', 'scanner_range'];
        for (let id of priorities) {
            if (this.skills[id] < 5) { this.addToQueue(id); return; }
        }
        const all = Object.keys(this.skills);
        const randomSkill = all[Math.floor(Math.random() * all.length)];
        if (this.skills[randomSkill] < 5) this.addToQueue(randomSkill);
    }

    addToQueue(id) {
        const nextLvl = (this.skills[id] || 0) + 1;
        if (nextLvl > 5) return;
        this.skillQueue.push({ id, level: nextLvl, remainingTime: 120 * nextLvl });
    }

    deployMiningShip(ship) {
        const resources = ['IRON', 'TITANIUM', 'FUSION_CELLS', 'OXYGEN'];
        const target = resources[Math.floor(Math.random() * resources.length)];
        if (window.RESOURCE_SECTORS && window.RESOURCE_SECTORS[target]) {
            const pos = window.RESOURCE_SECTORS[target];
            ship.miningTarget = target;
            ship.targetX = this.homeX + (pos.x * 0.4);
            ship.targetY = this.homeY + (pos.y * 0.4);
            ship.status = 'LAUNCHING';
            ship.docked = false;
        }
    }

    deployTradingMission(ship) {
        if (this.evaluateShoppingNeeds()) {
            ship.tradeIntent = 'BUY';
            ship.targetX = 0;
            ship.targetY = 0;
            ship.status = 'TRADING';
            ship.docked = false;
            ship.permissionToEnter = false;
        } else {
            // Check if they want to SELL something physically (if inventory high)
            const invTotal = Object.values(this.inventory).reduce((a, b) => a + b, 0);
            if (invTotal > 500) {
                ship.tradeIntent = 'SELL';
                ship.targetX = 0;
                ship.targetY = 0;
                ship.status = 'TRADING';
                ship.docked = false;
                ship.permissionToEnter = false;
            }
        }
    }

    interactWithMarket() {
        const basePrices = { "IRON": 15, "TITANIUM": 85, "FUSION_CELLS": 450, "OXYGEN": 25 };
        if (window.skillManager && window.skillManager.storefront) {
            const listings = window.skillManager.storefront;
            for (let i = 0; i < listings.length; i++) {
                const l = listings[i];
                if (l.seller === this.name) continue;
                const isCheap = l.price <= (basePrices[l.resource] || 100) * 1.05;
                const isNeeded = (this.inventory[l.resource] || 0) < 20;
                if ((isCheap || isNeeded) && this.credits >= (l.price * l.qty)) {
                    const cost = l.price * l.qty;
                    this.credits -= cost;
                    window.skillManager.addCredits(cost);
                    this.inventory[l.resource] = (this.inventory[l.resource] || 0) + l.qty;
                    window.skillManager.storefront.splice(i, 1);
                    window.skillManager.save();
                    if (typeof showGameNotification === 'function') showGameNotification(`DIPLOMATIC VISIT: ${this.name} purchased ${l.resource}`);
                    break;
                }
            }
        }
        if (typeof renderMarket === 'function') renderMarket();
    }
}

class NPCManager {
    constructor() {
        this.npcs = [];
        this.init();
    }
    init() {
        const npcData = [{ name: "DRAX", station: "DRAX ABODE", home: { x: -2800, y: 1800 } }];
        npcData.forEach((data, i) => {
            this.npcs.push(new NPCPlayer(`NPC-${i + 1}`, data.name, data.home.x, data.home.y, data.station));
        });
        console.log("NPC Manager: Commander Drax Online. Station Initialized.");
    }
    update(dt) { this.npcs.forEach(npc => npc.update(dt)); }
    getAllShips() {
        let allShips = [];
        this.npcs.forEach(npc => { allShips = allShips.concat(npc.ships); });
        return allShips;
    }
}

window.npcManager = new NPCManager();

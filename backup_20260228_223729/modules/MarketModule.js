const CONTRACT_ENTITIES = [
    "NEBULIS COLONISTS", "S04 REFINERY", "VOID MINING CORP", "VANGUARD OUTPOST", "ORBITAL HUB B-1"
];

const CONTRACT_RESOURCES = ["IRON", "TITANIUM", "FUSION_CELLS", "OXYGEN"];

let activeContracts = [];
let currentMarketTab = 'storage';

function generateContracts() {
    activeContracts = [];

    // Dynamic slot count from Clear Communication
    const maxSlots = window.skillManager ? window.skillManager.getContractSlotCount() : 3;
    const count = Math.min(maxSlots, 3 + Math.floor(Math.random() * 3));

    // Skill bonus from Resource Allocation
    const bonus = window.skillManager ? window.skillManager.getContractBonus() : 1;

    for (let i = 0; i < count; i++) {
        const resource = CONTRACT_RESOURCES[Math.floor(Math.random() * CONTRACT_RESOURCES.length)];
        const qty = 20 + Math.floor(Math.random() * 150);
        // Base price + variability
        const basePrices = { "IRON": 15, "TITANIUM": 85, "FUSION_CELLS": 450, "OXYGEN": 25 };
        const payment = Math.floor(qty * basePrices[resource] * (0.9 + Math.random() * 0.4) * bonus);

        activeContracts.push({
            id: 'CONTRACT-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
            entity: CONTRACT_ENTITIES[Math.floor(Math.random() * CONTRACT_ENTITIES.length)],
            resource: resource,
            qty: qty,
            payment: payment,
            status: 'OPEN'
        });
    }
}

function initMarket() {
    const marketBtn = document.querySelector('[title="Market"]');
    const marketWindow = document.getElementById('market-window');
    const closeBtn = marketWindow ? marketWindow.querySelector('.close-btn') : null;

    if (marketBtn && marketWindow) {
        marketBtn.onclick = () => {
            marketWindow.style.display = 'flex';
            if (activeContracts.length === 0) generateContracts();
            renderMarket();
            if (window.skillManager) window.skillManager.updateCreditsUI();
        };

        if (closeBtn) {
            closeBtn.onclick = () => marketWindow.style.display = 'none';
        }

        if (typeof makeDraggable === 'function') {
            makeDraggable(marketWindow);
        }
    }
}

function renderMarket() {
    const listContainer = document.getElementById('market-items-list');
    const headContainer = document.getElementById('market-table-head');
    if (!listContainer || !headContainer) return;

    listContainer.innerHTML = '';

    if (currentMarketTab === 'storage') {
        headContainer.innerHTML = `<tr><th>RESOURCE</th><th>DESCRIPTION</th><th>QUANTITY</th><th>ACTIONS</th></tr>`;
        const resources = [
            { id: 'iron', name: 'Raw Iron', desc: 'Hull construction metal.' },
            { id: 'titanium', name: 'Titanium', desc: 'Advanced alloy metal.' },
            { id: 'fusion_cells', name: 'Fusion Cells', desc: 'Station energy cells.' },
            { id: 'oxygen', name: 'Oxygen', desc: 'Life support O2.' }
        ];

        resources.forEach(res => {
            const myStock = window.skillManager ? window.skillManager.getOwned(res.id) : 0;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div style="font-weight:bold; color:#5096c8;">${res.name}</div></td>
                <td><div style="font-size:10px; color:#555;">${res.desc}</div></td>
                <td style="text-align:center; font-weight:bold; color:#ff9900;">${Math.floor(myStock)}</td>
                <td>
                    <button class="market-action-btn" onclick="window.openListingModal('${res.id}', '${res.name}', ${myStock})">LIST FOR SALE</button>
                </td>
            `;
            listContainer.appendChild(tr);
        });
    } else if (currentMarketTab === 'storefront') {
        headContainer.innerHTML = `<tr><th>SELLER</th><th>RESOURCE</th><th>QUANTITY</th><th>PRICE (UNIT)</th><th>ACTIONS</th></tr>`;
        const listings = window.skillManager ? window.skillManager.storefront : [];
        if (listings.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#555;">NO ACTIVE LISTINGS</td></tr>';
            return;
        }

        const playerName = window.skillManager ? window.skillManager.commanderName : 'UNIDENTIFIED';

        listings.forEach(listing => {
            const tr = document.createElement('tr');
            const isMine = listing.seller === playerName;

            tr.innerHTML = `
                <td style="font-size:11px; font-family:monospace; color:${isMine ? '#00ff88' : '#ff9900'}">${listing.seller || 'UNKNOWN'}</td>
                <td style="font-weight:bold; color:#5096c8;">${listing.resource}</td>
                <td style="text-align:center;">${listing.qty}</td>
                <td style="text-align:center;">${listing.price} RUC</td>
                <td>
                    ${isMine
                    ? `<button class="market-action-btn sell" onclick="window.handleListingAction('${listing.id}', 'cancel')">CANCEL</button>`
                    : `<button class="market-action-btn buy" onclick="window.handleListingAction('${listing.id}', 'buy')">BUY</button>`
                }
                </td>
            `;
            listContainer.appendChild(tr);
        });
    } else if (currentMarketTab === 'contracts') {
        headContainer.innerHTML = `<tr><th>ENTITY</th><th>REQUEST</th><th>REWARD</th><th>AVAILABILITY</th><th>ACTIONS</th></tr>`;
        activeContracts.forEach(contract => {
            const tr = document.createElement('tr');
            const myStock = window.skillManager ? window.skillManager.getOwned(contract.resource) : 0;
            const canFulfill = myStock >= contract.qty;

            tr.innerHTML = `
                <td>
                    <div style="font-weight:bold; color:#5096c8;">${contract.entity}</div>
                    <div style="font-size:10px; color:#555;">ID: ${contract.id}</div>
                </td>
                <td><span style="color:#ff9900; font-weight:bold;">${contract.qty} ${contract.resource}</span></td>
                <td><span class="price-value">${contract.payment.toLocaleString()}</span> <span style="font-size:9px; color:#555;">RUC</span></td>
                <td style="text-align:center;">
                    <div style="font-size:10px; color:${canFulfill ? '#00ff88' : '#ff3300'}">${Math.floor(myStock)} / ${contract.qty}</div>
                </td>
                <td>
                    <button class="market-action-btn sell" 
                        ${!canFulfill ? 'disabled style="filter:grayscale(1); opacity:0.5"' : ''}
                        onclick="handleTrade('${contract.id}', 'fulfill')">
                        FULFILL
                    </button>
                </td>
            `;
            listContainer.appendChild(tr);
        });
    }
}

// Global handler for trade buttons
window.switchMarketTab = function (tab) {
    currentMarketTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.onclick.toString().includes(`'${tab}'`));
        btn.style.color = btn.classList.contains('active') ? '#00ff88' : '#5096c8';
        btn.style.fontWeight = btn.classList.contains('active') ? 'bold' : 'normal';
    });
    renderMarket();
};

window.openListingModal = function (resId, resName, maxQty) {
    if (maxQty <= 0) {
        if (typeof showGameNotification === 'function') showGameNotification("NO STOCK TO LIST");
        return;
    }
    document.getElementById('listing-resource-id').value = resId;
    document.getElementById('listing-resource-name').innerText = resName;
    document.getElementById('listing-max-qty').innerText = maxQty;
    document.getElementById('listing-qty').value = maxQty;
    document.getElementById('listing-price').value = 10;
    document.getElementById('listing-modal').style.display = 'flex';
};

window.confirmListing = function () {
    const resId = document.getElementById('listing-resource-id').value;
    const qty = parseInt(document.getElementById('listing-qty').value);
    const price = parseInt(document.getElementById('listing-price').value);

    if (window.skillManager && window.skillManager.listForSale(resId, qty, price)) {
        document.getElementById('listing-modal').style.display = 'none';
        if (typeof showGameNotification === 'function') showGameNotification(`LISTED: ${qty}x ${resId.toUpperCase()} AT ${price} RUC`);
        // Force switch to storefront tab to show the new listing
        window.switchMarketTab('storefront');
    } else {
        if (typeof showGameNotification === 'function') showGameNotification("ERROR: FAILED TO LIST ITEM");
    }
};

window.handleListingAction = function (listingId, action) {
    if (action === 'cancel') {
        if (window.skillManager && window.skillManager.cancelListing(listingId)) {
            if (typeof showGameNotification === 'function') showGameNotification("LISTING CANCELED - RETURNED TO STORAGE");
            renderMarket();
        }
    } else if (action === 'buy') {
        const listing = window.skillManager.storefront.find(l => l.id === listingId);
        if (listing && window.skillManager) {
            const totalCost = listing.price * listing.qty;
            if (window.skillManager.spendCredits(totalCost)) {
                window.skillManager.addToInventory(listing.resource, listing.qty);
                window.skillManager.storefront = window.skillManager.storefront.filter(l => l.id !== listingId);
                window.skillManager.save();
                if (typeof showGameNotification === 'function') {
                    showGameNotification(`PURCHASED: ${listing.qty}x ${listing.resource} FROM ${listing.seller}`);
                }
                renderMarket();
            } else {
                if (typeof showGameNotification === 'function') showGameNotification("INSUFFICIENT RUC FOR PURCHASE");
            }
        }
    } else if (action === 'simulate_sale') {
        // DEV SIMULATION: In a real multiplayer, this would happen when another player interacts via WebSocket
        const listing = window.skillManager.storefront.find(l => l.id === listingId);
        if (listing) {
            window.skillManager.addCredits(listing.price * listing.qty);
            window.skillManager.storefront = window.skillManager.storefront.filter(l => l.id !== listingId);
            window.skillManager.save();
            if (typeof showGameNotification === 'function') showGameNotification(`SOLD: ${listing.qty}x ${listing.resource} | +${listing.price * listing.qty} RUC`);
            renderMarket();
        }
    }
};

window.handleTrade = function (contractId, action) {
    const contractIndex = activeContracts.findIndex(c => c.id === contractId);
    if (contractIndex === -1) return;
    const contract = activeContracts[contractIndex];

    if (action === 'fulfill') {
        if (window.skillManager && window.skillManager.removeFromInventory(contract.resource, contract.qty)) {
            window.skillManager.addCredits(contract.payment);
            if (typeof showGameNotification === 'function') {
                showGameNotification(`CONTRACT FULFILLED: ${contract.id} | +${contract.payment} RUC`);
            }
            activeContracts.splice(contractIndex, 1);
            if (activeContracts.length < 2) generateContracts(); // Refill if low
            renderMarket();
        } else {
            if (typeof showGameNotification === 'function') {
                showGameNotification("INSUFFICIENT RESOURCES FOR CONTRACT");
            }
        }
    }
};

window.initMarket = initMarket;

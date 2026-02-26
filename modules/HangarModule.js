function initHangar() {
    const hangarBtn = document.getElementById('hangar-menu-btn');
    const hangarWindow = document.getElementById('hangar-window');
    const closeBtn = hangarWindow ? hangarWindow.querySelector('.close-btn') : null;

    if (hangarBtn && hangarWindow) {
        hangarBtn.onclick = () => {
            hangarWindow.style.display = 'flex';
            renderHangar();
        };

        if (closeBtn) {
            closeBtn.onclick = () => hangarWindow.style.display = 'none';
        }

        if (typeof makeDraggable === 'function') {
            makeDraggable(hangarWindow);
        }
    }

    // Auto-refresh when open
    setInterval(() => {
        if (hangarWindow && hangarWindow.style.display === 'flex') {
            // BUG FIX: Prevent re-render if user is interacting with a dropdown
            const activeEl = document.activeElement;
            if (activeEl && (activeEl.tagName === 'SELECT' || activeEl.tagName === 'INPUT')) {
                return;
            }
            renderHangar();
        }
    }, 1000);
}

function renderHangar() {
    const listContainer = document.getElementById('hangar-fleet-list');
    const shipCountSpan = document.getElementById('hangar-ship-count');

    if (!listContainer || !window.systemView) return;

    const ships = window.systemView.playerShips || [];
    if (shipCountSpan) shipCountSpan.innerText = ships.length;

    // Maintain a reference to existing rows to avoid redraw flicker
    ships.forEach(ship => {
        let row = document.getElementById(`hangar-row-${ship.id}`);
        if (!row) {
            row = document.createElement('tr');
            row.id = `hangar-row-${ship.id}`;
            listContainer.appendChild(row);
        }

        const statusClass = ship.docked ? 'status-idle' : (ship.status === 'MINING' ? 'status-active' : (ship.status === 'IDLE' ? 'status-idle' : 'status-transit'));
        const statusText = ship.status || 'IDLE';
        const shipImgSrc = ship.type === 'miner' ? 'assets/media/MinerRaven.png' : '';
        const minerals = ['IRON', 'TITANIUM', 'FUSION_CELLS', 'OXYGEN'];

        const targetSelect = ship.docked
            ? `<select class="market-select" style="background:#050a0f; color:#ff9900; border:1px solid rgba(255,153,0,0.3); font-size:10px; padding:2px;" 
                onchange="window.updateMiningTarget('${ship.id}', this.value)">
                <option value="">SELECT TARGET</option>
                ${minerals.map(m => `<option value="${m}" ${ship.miningTarget === m ? 'selected' : ''}>${m}</option>`).join('')}
               </select>`
            : `<span style="color:#5096c8; font-size:11px; font-weight:bold;">${ship.miningTarget || 'N/A'}</span>`;

        const dockBtn = ship.docked
            ? `<button class="market-action-btn" style="margin-right:4px" onclick="handleShipCommand('${ship.id}', 'deploy')">UNDOCK</button>`
            : `<button class="market-action-btn sell" style="margin-right:4px" onclick="handleShipCommand('${ship.id}', 'recall')">RECALL</button>`;

        const autoColor = ship.autoLoop ? '#00ff88' : '#888';
        const autoBg = ship.autoLoop ? 'rgba(0,255,136,0.1)' : '#222';
        const autoBorder = ship.autoLoop ? 'rgba(0,255,136,0.4)' : '#444';
        const autoLabel = ship.autoLoop ? 'AUTO: ON' : 'AUTO: OFF';
        const autoBtn = `<button id="auto-toggle-${ship.id}" style="padding:3px 7px;font-size:9px;font-family:monospace;background:${autoBg};color:${autoColor};border:1px solid ${autoBorder};cursor:pointer;border-radius:2px;" onclick="window.toggleAutoFarm('${ship.id}')">${autoLabel}</button>`;

        const coordsCell = ship.status === 'DOCKED'
            ? '<span style="color:#666;">[STATION]</span>'
            : `<span style="color:#ff9900;">SEC ${Math.round(ship.x / 10)}, ${Math.round(ship.y / 10)}</span>`;

        // Update row content without wiping the element (preserving click highlights etc)
        const newHTML = `
            <td><div class="hangar-ship-thumb"><img src="${shipImgSrc}" alt="${ship.id}"></div></td>
            <td><div class="ship-id">${ship.id}</div><div class="ship-desc">${ship.description || ''}</div></td>
            <td><div style="font-weight:bold">${ship.type.toUpperCase()}</div><div class="ship-class">${ship.shipClass || ''}</div></td>
            <td>${targetSelect}</td>
            <td><span class="${statusClass}">${statusText}</span></td>
            <td style="font-family:monospace; color:#00ff88">${Math.floor(ship.cargo || 0)} / ${ship.capacity || 100}</td>
            <td>${coordsCell}</td>
            <td style="white-space:nowrap">${dockBtn}${autoBtn}</td>
        `;

        // Conditional update to prevent input focus loss
        if (row.innerHTML !== newHTML) {
            row.innerHTML = newHTML;
        }
    });
}

window.updateMiningTarget = function (shipId, target) {
    if (!window.systemView) return;
    const ship = window.systemView.playerShips.find(s => s.id === shipId);
    if (ship) {
        ship.miningTarget = target;
        console.log(`Mining target for ${shipId} set to ${target}`);
    }
};

window.handleShipCommand = function (shipId, command) {
    if (!window.systemView) return;
    const ship = window.systemView.playerShips.find(s => s.id === shipId);
    if (!ship) return;

    if (command === 'deploy') {
        // RADAR GATE: Check if Radar Systems are operational (Lvl 1 across categories)
        if (!window.skillManager || !window.skillManager.checkRadarStatus()) {
            if (typeof showGameNotification === 'function') {
                showGameNotification("DEPLOYMENT FAILED: RADAR SYSTEMS MUST BE AT LVL 1");
            }
            return;
        }

        if (!ship.miningTarget) {
            if (typeof showGameNotification === 'function') showGameNotification("ERROR: SELECT MINING TARGET FIRST");
            return;
        }

        // Get coordinates from SystemViewModule's constants
        if (window.RESOURCE_SECTORS && window.RESOURCE_SECTORS[ship.miningTarget]) {
            const targetPos = window.RESOURCE_SECTORS[ship.miningTarget];
            ship.targetX = targetPos.x;
            ship.targetY = targetPos.y;
        } else {
            // Fallback to launch vector if not found
            ship.targetX = ship.launchVector ? ship.launchVector.x : 1500;
            ship.targetY = ship.launchVector ? ship.launchVector.y : 1500;
        }

        ship.docked = false;
        ship.status = 'UNDOCKING';
        ship.x = 0; ship.y = 0;
        ship.angle = 0;
        ship.alpha = 0;
        ship.scale = 0.2;
        if (typeof showGameNotification === 'function') showGameNotification(`${ship.id} LAUNCHING TO MINE ${ship.miningTarget}`);
    } else if (command === 'recall') {
        ship.docked = false; // Ensure it's rendered when returning
        ship.status = 'RETURNING';
        ship.targetX = 0;
        ship.targetY = 0;
        if (typeof showGameNotification === 'function') showGameNotification(`${ship.id} RETURNING TO BASE`);
    }
    renderHangar();
};

window.toggleAutoFarm = function (shipId) {
    if (!window.systemView) return;
    const ship = window.systemView.playerShips.find(s => s.id === shipId);
    if (ship) {
        ship.autoLoop = !ship.autoLoop;
        const status = ship.autoLoop ? "ACTIVATED" : "DEACTIVATED";
        if (typeof showGameNotification === 'function') {
            showGameNotification(`AUTO-FARM PROTOCOL ${status} FOR ${ship.id}`);
        }
        renderHangar();
    }
};

window.initHangar = initHangar;

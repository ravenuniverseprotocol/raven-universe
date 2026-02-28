class AdminModule {
    constructor() {
        this.container = null;
        this.userList = [];
        this.bannedList = [];
        this.currentTab = 'registry';
        this.init();
    }

    init() {
        if (document.getElementById('admin-window')) {
            this.container = document.getElementById('admin-window');
            return;
        }
        this.renderAdminUI();
        if (this.container) {
            this.setupEvents();
        }
    }

    renderAdminUI() {
        const user = JSON.parse(localStorage.getItem('raven_user'));
        if (!user || user.username !== 'FUSO') {
            console.log("[RAVEN SECURITY] Administration restricted to Prime Commander.");
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'admin-window';
        modal.className = 'window-modal glass';
        modal.style.cssText = 'display: none; width: 1000px; height: 650px; z-index: 10000;';

        modal.innerHTML = `
            <div class="window-header">
                <span class="window-title">CENTRAL ADMINISTRATION HUB</span>
                <button class="close-btn" id="admin-close">×</button>
            </div>
            <div class="window-content admin-layout">
                <div class="admin-sidebar">
                    <div class="admin-stat-card">
                        <span class="stat-label">TOTAL COMMANDERS</span>
                        <span id="admin-total-count" class="stat-value">0</span>
                    </div>
                    <nav class="admin-nav">
                        <button id="nav-registry" class="admin-nav-btn active">COMMANDER REGISTRY</button>
                        <button id="nav-banned" class="admin-nav-btn">BANNED IP REGISTRY</button>
                    </nav>
                    <button id="admin-refresh-btn" class="admin-refresh-btn">REFRESH DATA</button>
                </div>
                <div class="admin-main">
                    <div id="view-registry" class="admin-view">
                        <div class="admin-table-container">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>COMMANDER</th>
                                        <th>HOME SYSTEM</th>
                                        <th>REGISTRATION IP</th>
                                        <th>DATE IDENTIFIED</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody id="admin-user-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                    <div id="view-banned" class="admin-view" style="display:none;">
                        <div class="admin-table-container">
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>BANNED IP</th>
                                        <th>REASON</th>
                                        <th>DATE INTERDICTED</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody id="admin-banned-tbody"></tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        this.container = modal;

        const sidebar = document.querySelector('.menu-list');
        if (sidebar && !document.getElementById('admin-sidebar-btn')) {
            const li = document.createElement('li');
            li.id = 'admin-sidebar-btn';
            li.className = 'menu-item admin-btn';
            li.title = 'Admin Panel';
            li.innerHTML = '<div class="icon" style="color:#ff6666; border:1px solid #ff6666; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px;">A</div>';
            sidebar.appendChild(li);

            li.onclick = () => {
                if (modal.style.display === 'none' || modal.style.display === '') {
                    modal.style.display = 'flex';
                    this.refreshData();
                } else {
                    modal.style.display = 'none';
                }
            };
        }

        if (typeof makeDraggable === 'function') makeDraggable(modal);
    }

    setupEvents() {
        this.container.querySelector('#admin-close').onclick = () => {
            this.container.style.display = 'none';
        };

        this.container.querySelector('#nav-registry').onclick = () => this.switchTab('registry');
        this.container.querySelector('#nav-banned').onclick = () => this.switchTab('banned');
        this.container.querySelector('#admin-refresh-btn').onclick = () => this.refreshData();
    }

    switchTab(tab) {
        this.currentTab = tab;
        this.container.querySelectorAll('.admin-nav-btn').forEach(btn => btn.classList.remove('active'));
        this.container.querySelectorAll('.admin-view').forEach(view => view.style.display = 'none');

        if (tab === 'registry') {
            this.container.querySelector('#nav-registry').classList.add('active');
            this.container.querySelector('#view-registry').style.display = 'block';
            this.fetchUsers();
        } else {
            this.container.querySelector('#nav-banned').classList.add('active');
            this.container.querySelector('#view-banned').style.display = 'block';
            this.fetchBannedIPs();
        }
    }

    refreshData() {
        if (this.currentTab === 'registry') this.fetchUsers();
        else this.fetchBannedIPs();
    }

    getApiBase() {
        return window.location.protocol === 'file:' ? 'https://raven-universe.onrender.com' : '';
    }

    async fetchUsers() {
        const token = localStorage.getItem('raven_token');
        if (!token) return;

        try {
            const response = await fetch(`${this.getApiBase()}/api/admin/users`, {
                headers: { 'Authorization': token }
            });
            if (response.ok) {
                this.userList = await response.json();
                this.updateRegistryUI();
            }
        } catch (err) {
            console.error('[ADMIN] Fetch error:', err);
        }
    }

    async fetchBannedIPs() {
        const token = localStorage.getItem('raven_token');
        if (!token) return;

        try {
            const response = await fetch(`${this.getApiBase()}/api/admin/banned-ips`, {
                headers: { 'Authorization': token }
            });
            if (response.ok) {
                this.bannedList = await response.json();
                this.updateBannedUI();
            }
        } catch (err) {
            console.error('[ADMIN] Banned fetch error:', err);
        }
    }

    async deleteUser(userId, username) {
        const token = localStorage.getItem('raven_token');
        try {
            const response = await fetch(`${this.getApiBase()}/api/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            if (response.ok) {
                if (typeof showGameNotification === 'function') {
                    showGameNotification(`COMMANDER ${username} PURGED FROM DATABASE`);
                }
                this.fetchUsers();
            }
        } catch (err) {
            console.error('[ADMIN] Delete error:', err);
        }
    }

    async banIP(ip, username) {
        const token = localStorage.getItem('raven_token');
        if (!ip || ip === 'UNKNOWN') {
            if (typeof showGameNotification === 'function') showGameNotification("ERROR: CANNOT BAN UNKNOWN IP");
            return;
        }

        try {
            const response = await fetch(`${this.getApiBase()}/api/admin/ban-ip`, {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ip, reason: `Banned via Commander ${username}` })
            });

            if (response.ok) {
                if (typeof showGameNotification === 'function') {
                    showGameNotification(`NEURAL LINK INTERDICTED: IP ${ip} BANNED`);
                }
                this.fetchUsers();
            }
        } catch (err) {
            console.error('[ADMIN] Ban error:', err);
        }
    }

    async unbanIP(ip) {
        const token = localStorage.getItem('raven_token');
        try {
            const response = await fetch(`${this.getApiBase()}/api/admin/banned-ips/${ip}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            if (response.ok) {
                if (typeof showGameNotification === 'function') {
                    showGameNotification(`NEURAL LINK RESTORED: IP ${ip} UNBANNED`);
                }
                this.fetchBannedIPs();
            }
        } catch (err) {
            console.error('[ADMIN] Unban error:', err);
        }
    }

    updateRegistryUI() {
        const tbody = this.container.querySelector('#admin-user-tbody');
        const countDisplay = this.container.querySelector('#admin-total-count');
        if (!tbody || !countDisplay) return;

        countDisplay.innerText = this.userList.length;
        tbody.innerHTML = '';

        this.userList.forEach(user => {
            const row = document.createElement('tr');
            const dateStr = new Date(user.registrationDate).toLocaleString();

            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.gameState?.homeSystem || 'N/A'}</td>
                <td class="admin-ip">${user.registrationIp}</td>
                <td class="admin-date">${dateStr}</td>
                <td class="admin-actions">
                    <button class="purge-btn action-btn red" data-id="${user._id}" data-name="${user.username}">PURGE</button>
                    <button class="ban-btn action-btn critical" data-ip="${user.registrationIp}" data-name="${user.username}">BAN IP</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        tbody.querySelectorAll('.purge-btn').forEach(btn => {
            btn.onclick = () => this.deleteUser(btn.dataset.id, btn.dataset.name);
        });
        tbody.querySelectorAll('.ban-btn').forEach(btn => {
            btn.onclick = () => this.banIP(btn.dataset.ip, btn.dataset.name);
        });
    }

    updateBannedUI() {
        const tbody = this.container.querySelector('#admin-banned-tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        this.bannedList.forEach(item => {
            const row = document.createElement('tr');
            const dateStr = new Date(item.bannedAt).toLocaleString();

            row.innerHTML = `
                <td class="admin-ip">${item.ip}</td>
                <td>${item.reason}</td>
                <td class="admin-date">${dateStr}</td>
                <td class="admin-actions">
                    <button class="unban-btn action-btn cyan" data-ip="${item.ip}">UNBAN IP</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        tbody.querySelectorAll('.unban-btn').forEach(btn => {
            btn.onclick = () => this.unbanIP(btn.dataset.ip);
        });
    }
}

function initAdmin() {
    if (window.adminModule) return;
    window.adminModule = new AdminModule();
}

// Redundant call removed to favor main.js orchestration
// if (document.readyState === 'complete') initAdmin();

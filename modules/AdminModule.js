class AdminModule {
    constructor() {
        this.container = null;
        this.userList = [];
        this.init();
    }

    init() {
        // Prevent multiple modals if init is called again
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
        modal.style.cssText = 'display: none; width: 900px; height: 600px; z-index: 10000;';

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
                    <button id="admin-refresh-btn" class="admin-nav-btn active">REFRESH REGISTRY</button>
                </div>
                <div class="admin-main">
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
                    this.fetchUsers();
                } else {
                    modal.style.display = 'none';
                }
            };
        }

        if (typeof makeDraggable === 'function') makeDraggable(modal);
    }

    setupEvents() {
        const closeBtn = this.container.querySelector('#admin-close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                this.container.style.display = 'none';
            };
        }

        const refreshBtn = this.container.querySelector('#admin-refresh-btn');
        if (refreshBtn) {
            refreshBtn.onclick = () => this.fetchUsers();
        }
    }

    async fetchUsers() {
        const token = localStorage.getItem('raven_token');
        if (!token) return;

        const isLocalFile = window.location.protocol === 'file:';
        const apiBase = isLocalFile ? 'https://raven-universe.onrender.com' : '';
        const apiPath = `${apiBase}/api/admin/users`;

        try {
            const response = await fetch(apiPath, {
                headers: { 'Authorization': token }
            });
            if (response.ok) {
                this.userList = await response.json();
                this.updateUI();
            }
        } catch (err) {
            console.error('[ADMIN] Fetch error:', err);
        }
    }

    async deleteUser(userId, username) {
        const token = localStorage.getItem('raven_token');
        const isLocalFile = window.location.protocol === 'file:';
        const apiBase = isLocalFile ? 'https://raven-universe.onrender.com' : '';
        const apiPath = `${apiBase}/api/admin/users/${userId}`;

        try {
            const response = await fetch(apiPath, {
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

    updateUI() {
        const tbody = this.container.querySelector('#admin-user-tbody');
        const countDisplay = this.container.querySelector('#admin-total-count');
        if (!tbody || !countDisplay) return;

        countDisplay.innerText = this.userList.length;
        tbody.innerHTML = '';

        this.userList.forEach(user => {
            const row = document.createElement('tr');
            const date = new Date(user.registrationDate).toLocaleDateString();
            const time = new Date(user.registrationDate).toLocaleTimeString();

            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.gameState?.homeSystem || 'N/A'}</td>
                <td class="admin-ip">${user.registrationIp}</td>
                <td class="admin-date">${date} ${time}</td>
                <td>
                    <button class="purge-btn" data-id="${user._id}" data-name="${user.username}">PURGE</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        tbody.querySelectorAll('.purge-btn').forEach(btn => {
            btn.onclick = () => this.deleteUser(btn.dataset.id, btn.dataset.name);
        });
    }
}

function initAdmin() {
    if (window.adminModule) return;
    window.adminModule = new AdminModule();
}

// Redundant call removed to favor main.js orchestration
// if (document.readyState === 'complete') initAdmin();

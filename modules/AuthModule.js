class AuthModule {
    constructor() {
        if (window.DEBUG_RESET) {
            console.warn("[RAVEN DEBUG] Reset Mode Active: Purging Local Session.");
            // We clear most keys but keep maybe the last name entered if desired? 
            // The user said "inicie desde o inicio", so let's be thorough.
            const keysToKeep = ['raven_debug_persist']; // Example
            Object.keys(localStorage).forEach(key => {
                if (!keysToKeep.includes(key)) localStorage.removeItem(key);
            });
        }
        this.token = localStorage.getItem('raven_token');
        this.user = JSON.parse(localStorage.getItem('raven_user'));
        this.isAuth = !!this.token;

        this.init();
    }

    init() {
        this.renderAuthGate();
        this.checkAutoLogin();
    }

    renderAuthGate() {
        const gate = document.createElement('div');
        gate.id = 'auth-gate';
        gate.className = 'auth-gate-overlay';
        gate.innerHTML = `
            <div class="auth-container">
                <div class="auth-box">
                    <div class="auth-header">
                        <img src="assets/media/StationRaven.webp" class="auth-logo">
                        <h2>RAVEN UNIVERSE</h2>
                        <p class="subtitle">INTELLIGENCE HUB IDENTIFICATION</p>
                    </div>
                    
                    <div id="auth-form-container">
                        <div class="input-group">
                            <label>COMMANDER NAME</label>
                            <input type="text" id="auth-username" placeholder="ENTER ID...">
                        </div>
                        <div class="input-group">
                            <label>CLEARANCE KEY</label>
                            <input type="password" id="auth-password" placeholder="••••••••">
                        </div>
                        
                        <div class="auth-actions">
                            <button id="auth-login-btn" class="auth-primary-btn">LOGIN</button>
                            <button id="auth-register-btn" class="auth-secondary-btn">REGISTER</button>
                        </div>
                        
                        <div id="auth-status" class="auth-status"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(gate);

        document.getElementById('auth-login-btn').onclick = () => this.handleAuth('login');
        document.getElementById('auth-register-btn').onclick = () => this.handleAuth('register');
    }

    async handleAuth(type) {
        const username = document.getElementById('auth-username').value;
        const password = document.getElementById('auth-password').value;
        const status = document.getElementById('auth-status');

        if (!username || !password) {
            status.innerText = "ERROR: CREDENTIALS INCOMPLETE";
            return;
        }

        status.innerText = "AUTHENTICATING...";

        try {
            const isLocalFile = window.location.protocol === 'file:';
            const apiBase = isLocalFile ? 'https://raven-universe.onrender.com' : '';
            const apiPath = `${apiBase}/api/auth/${type}`;

            console.log(`[RAVEN AUTH] Attempting ${type} via ${apiPath}`);
            const response = await fetch(apiPath, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('raven_token', this.token);
                localStorage.setItem('raven_user', JSON.stringify(this.user));
                this.isAuth = true;

                status.innerText = "IDENTIFICATION GRANTED";
                // Pass combined state: user info + game state
                const fullState = {
                    username: this.user.username,
                    gameState: data.gameState
                };
                setTimeout(() => this.hideGate(fullState), 1000);
            } else {
                status.innerText = `ERROR: ${data.message || 'AUTHENTICATION REJECTED'}`;
            }
        } catch (err) {
            console.error('[RAVEN AUTH] Fetch Error:', err);
            status.innerText = "CONNECTION FAILURE: LINK TO HUB DISRUPTED";
        }
    }

    async checkAutoLogin() {
        if (this.isAuth) {
            try {
                const isLocalFile = window.location.protocol === 'file:';
                const apiBase = isLocalFile ? 'https://raven-universe.onrender.com' : '';
                const apiPath = `${apiBase}/api/game/state`;

                const response = await fetch(apiPath, {
                    headers: { 'Authorization': this.token }
                });
                if (response.ok) {
                    let gameState = await response.json();
                    if (window.DEBUG_RESET) {
                        console.log("[RAVEN DEBUG] Bypassing Server State for Clinical Reset.");
                        gameState = null; // Force defaults
                    }
                    // Combine local user info with server state
                    const fullState = {
                        username: this.user ? this.user.username : 'COMMANDER',
                        gameState: gameState
                    };
                    this.hideGate(fullState);
                } else {
                    this.logout();
                }
            } catch (err) {
                console.warn("OFFLINE MODE ACTIVATED");
            }
        }
    }

    hideGate(gameState) {
        const gate = document.getElementById('auth-gate');
        if (gate) {
            gate.style.opacity = '0';
            setTimeout(() => {
                gate.remove();
                if (window.initGame) window.initGame(gameState);
            }, 800);
        }
    }

    logout() {
        localStorage.removeItem('raven_token');
        localStorage.removeItem('raven_user');
        window.location.reload();
    }
}

window.authManager = new AuthModule();

const fs = require('fs');
const path = require('path');

class Authentication {
    constructor() {
        this.users = new Map();
        this.dbPath = path.join(__dirname, '..', 'users.json');
        this.loadUsers();
    }

    loadUsers() {
        if (fs.existsSync(this.dbPath)) {
            try {
                const data = fs.readFileSync(this.dbPath, 'utf8');
                const parsed = JSON.parse(data);
                // Convert object to Map
                Object.keys(parsed).forEach(key => {
                    this.users.set(key, parsed[key]);
                });
                console.log(`[AUTH] Loaded ${this.users.size} users from disk.`);
            } catch (e) {
                console.error('[AUTH] Error loading users:', e);
            }
        }
    }

    saveUsers() {
        try {
            const obj = Object.fromEntries(this.users);
            fs.writeFileSync(this.dbPath, JSON.stringify(obj, null, 2));
        } catch (e) {
            console.error('[AUTH] Error saving users:', e);
        }
    }

    register(username, password) {
        if (!username || !password) return { success: false, message: 'Invalid credentials' };
        if (this.users.has(username)) return { success: false, message: 'Username already taken' };

        const newUser = {
            username,
            password, // In production, this MUST be hashed (bcrypt)
            credits: 1000,
            ship: 'miner-v1',
            systemId: 0, // Raven Prime
            created: Date.now()
        };

        this.users.set(username, newUser);
        this.saveUsers();
        return { success: true, message: 'Registration successful' };
    }

    login(username, password) {
        if (!this.users.has(username)) return { success: false, message: 'User not found' };

        const user = this.users.get(username);
        if (user.password !== password) return { success: false, message: 'Invalid password' };

        return { success: true, user: user };
    }

    getUser(username) {
        return this.users.get(username);
    }
}

module.exports = Authentication;

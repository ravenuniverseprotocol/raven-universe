const bcrypt = require('bcryptjs');
const User = require('./models/User');

class Authentication {
    constructor() {
        // No local storage needed anymore
    }

    async register(username, password) {
        if (!username || !password) return { success: false, message: 'Invalid credentials' };

        try {
            // Check if user exists
            const existingUser = await User.findOne({ username });
            if (existingUser) return { success: false, message: 'Username already taken' };

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create new user in MongoDB
            const newUser = new User({
                username,
                password: hashedPassword,
                systemId: 0, // Raven Prime
                credits: 1000
            });

            await newUser.save();
            console.log(`[AUTH] New Pilot Registered: ${username}`);
            return { success: true, message: 'Registration successful' };
        } catch (err) {
            console.error('[AUTH] Register Error:', err);
            return { success: false, message: 'Server error' };
        }
    }

    async login(username, password) {
        try {
            // Find user
            const user = await User.findOne({ username });
            if (!user) return { success: false, message: 'User not found' };

            // Verify Password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return { success: false, message: 'Invalid credentials' };

            console.log(`[AUTH] Pilot Login: ${username}`);
            return { success: true, user: user };
        } catch (err) {
            console.error('[AUTH] Login Error:', err);
            return { success: false, message: 'Server error' };
        }
    }
}

module.exports = Authentication;

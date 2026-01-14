const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Mailer = require('./Mailer'); // Import Mailer

class Authentication {
    constructor() {
        // No local storage needed anymore
    }

    async register(username, email, password) {
        if (!username || !email || !password) return { success: false, message: 'Invalid credentials' };

        try {
            // Check if user exists
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) {
                if (existingUser.email === email) return { success: false, message: 'Email already registered' };
                return { success: false, message: 'Username already taken' };
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Generate OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = Date.now() + 10 * 60 * 1000; // 10 mins

            // Create new user in MongoDB (Verified = false)
            const newUser = new User({
                username,
                email,
                password: hashedPassword,
                systemId: 0, // Raven Prime
                credits: 1000,
                isVerified: false,
                otpCode,
                otpExpires
            });

            await newUser.save();

            // Send Email
            await Mailer.sendOTP(email, otpCode);

            console.log(`[AUTH] OTP generated for ${username}: ${otpCode}`); // DEBUG: View in Render Logs
            console.log(`[AUTH] New Pilot Registered (Pending Verify): ${username}`);
            return { success: true, message: 'OTP sent to email', requireOtp: true, email: email };
        } catch (err) {
            console.error('[AUTH] Register Critical Error:', err); // Detailed log for Render
            return { success: false, message: 'Server error: ' + err.message };
        }
    }

    async verify(email, code) {
        try {
            const user = await User.findOne({ email });
            if (!user) return { success: false, message: 'User not found' };

            if (user.isVerified) return { success: false, message: 'User already verified' };

            if (Date.now() > user.otpExpires) return { success: false, message: 'Code expired' };

            if (user.otpCode !== code) return { success: false, message: 'Invalid code' };

            // Verify Success
            user.isVerified = true;
            user.otpCode = undefined;
            user.otpExpires = undefined;
            await user.save();

            return { success: true, message: 'Account Verified' };
        } catch (err) {
            console.error('[AUTH] Verify Error:', err);
            return { success: false, message: 'Server error' };
        }
    }

    async login(username, password) {
        try {
            // Find user
            const user = await User.findOne({ username });
            if (!user) return { success: false, message: 'User not found' };

            // Check Verification
            if (!user.isVerified) return { success: false, message: 'Email not verified yet.' };

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

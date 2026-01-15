const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Mailer = require('./Mailer');

class Authentication {
    constructor() { }

    async register(username, email, password) {
        if (!username || !email || !password) return { success: false, message: 'Invalid credentials' };

        try {
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) {
                if (existingUser.email === email) return { success: false, message: 'Email already registered' };
                return { success: false, message: 'Username already taken' };
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Generate OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            const otpExpires = Date.now() + 10 * 60 * 1000;

            const newUser = new User({
                username,
                email,
                password: hashedPassword,
                systemId: 0,
                credits: 1000,
                isVerified: false,
                role: 'pilot',
                otpCode: otpCode,
                otpExpires: otpExpires
            });

            await newUser.save();

            // Send Email (Async - Do not await to speed up UI)
            Mailer.sendOTP(email, otpCode).catch(err => console.error('[AUTH] Email Error:', err));

            console.log(`[AUTH] Register: OTP generated for ${username}`);
            return { success: true, message: 'Code Generating... Check Email.', requireOtp: true, email: email };
        } catch (err) {
            console.error('[AUTH] Register Error:', err);
            return { success: false, message: 'Server error: ' + err.message };
        }
    }

    async verify(email, code) {
        try {
            const user = await User.findOne({ email });
            if (!user) return { success: false, message: 'User not found' };

            if (Date.now() > user.otpExpires) return { success: false, message: 'Code expired' };
            if (user.otpCode !== code) return { success: false, message: 'Invalid code' };

            user.isVerified = true;
            user.otpCode = undefined;
            user.otpExpires = undefined;
            await user.save();

            return { success: true, message: 'Verified! Please Login.' };
        } catch (err) {
            console.error('[AUTH] Verify Error:', err);
            return { success: false, message: 'Server error' };
        }
    }

    async login(username, password, code) {
        try {
            const user = await User.findOne({ username });
            if (!user) return { success: false, message: 'User not found' };

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return { success: false, message: 'Invalid credentials' };

            // STRICT 2FA: Always require code
            if (code) {
                // Step 2: Verify Code
                if (user.otpCode === code && Date.now() < user.otpExpires) {
                    user.otpCode = undefined;
                    user.otpExpires = undefined;
                    await user.save();
                    console.log(`[AUTH] Login Success: ${username}`);
                    return { success: true, user: user };
                } else {
                    return { success: false, requireOtp: true, message: 'Invalid or Expired Code' };
                }
            }

            // Step 1: Generate Login OTP
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            user.otpCode = otpCode;
            user.otpExpires = Date.now() + 5 * 60 * 1000;
            await user.save();

            // Send Email (Async)
            Mailer.sendOTP(user.email, otpCode).catch(err => console.error('[AUTH] Email Error:', err));
            console.log(`[AUTH] Login 2FA generated for ${username}`);

            return { success: false, requireOtp: true, message: 'Security Code Sent to Email' };

        } catch (err) {
            console.error('[AUTH] Login Error:', err);
            return { success: false, message: 'Server error' };
        }
    }
}

module.exports = Authentication;

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, BannedIP } = require('./database');
const { getAvailableSystem } = require('./systems');

// Helper to extract true client IP
function extractClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'UNKNOWN';
}

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const normalizedUsername = username.toUpperCase();

        const existingUser = await User.findOne({ username: normalizedUsername });
        if (existingUser) {
            return res.status(400).json({ message: 'COMMANDER ALREADY IDENTIFIED' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Capture Registration IP (Normalized)
        const registrationIp = extractClientIp(req);

        // Security Gate: Block Banned IPs
        const isBanned = await BannedIP.findOne({ ip: registrationIp });
        if (isBanned) {
            return res.status(403).json({ message: 'COMMUNICATION LINK BLOCKED: IP ACCESS DENIED' });
        }

        // Use Automatic Unique System Assignment
        const { systemName, coords } = await getAvailableSystem();

        const newUser = new User({
            username: normalizedUsername,
            password: hashedPassword,
            registrationIp: registrationIp,
            registrationDate: new Date(),
            gameState: {
                credits: 5000,
                inventory: { 'OXYGEN': 500 },
                skills: {},
                skillQueue: [],
                homeSystem: systemName,
                homeCoords: coords
            }
        });

        await newUser.save();

        const token = jwt.sign({ id: newUser._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            token,
            user: { id: newUser._id.toString(), username: newUser.username },
            gameState: newUser.gameState
        });
    } catch (err) {
        console.error('[AUTH ERROR] Registration Failure:', err);
        res.status(500).json({ message: 'SERVER ERROR DURING IDENTIFICATION' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'MISSING LOGIN DATA' });
        }

        const normalizedUsername = username.toUpperCase();

        const user = await User.findOne({ username: normalizedUsername });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'INVALID CREDENTIALS' });
        }

        const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Capture Current IP (Normalized)
        const currentIp = extractClientIp(req);

        // SECURITY GATE: Block existing users if their current IP is banned
        const isBanned = await BannedIP.findOne({ ip: currentIp });
        if (isBanned) {
            return res.status(403).json({ message: 'COMMUNICATION LINK BLOCKED: IP ACCESS DENIED' });
        }

        // Update Registration IP if it was UNKNOWN (Fix for Fuso/Legacy users)
        if (user.registrationIp === 'UNKNOWN' && currentIp !== 'UNKNOWN') {
            user.registrationIp = currentIp;
            await user.save();
        }

        res.status(200).json({
            token,
            user: { id: user._id.toString(), username: user.username },
            gameState: user.gameState
        });
    } catch (err) {
        console.error('[AUTH ERROR] Login Failure:', err);
        res.status(500).json({ message: 'SERVER CORE ERROR' });
    }
});

module.exports = router;

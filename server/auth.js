const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('./database');
const { getAvailableSystem } = require('./systems');

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

        // Capture Registration IP
        const registrationIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'UNKNOWN';

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

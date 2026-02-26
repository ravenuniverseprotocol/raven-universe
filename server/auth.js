const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('./database');

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

        // Procedural System Generation
        const p1 = Math.floor(Math.random() * 99).toString().padStart(2, '0');
        const p2 = Math.floor(Math.random() * 99).toString().padStart(2, '0');
        const p3 = Math.floor(Math.random() * 99).toString().padStart(2, '0');
        const systemName = `${p1}.${p2}.${p3}`;

        // Random Galaxy Coords (Radius 500-2500 for variety)
        const angle = Math.random() * Math.PI * 2;
        const radius = 500 + Math.random() * 2000;
        const coords = {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        };

        const newUser = new User({
            username: normalizedUsername,
            password: hashedPassword,
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
        res.status(201).json({ token, user: { id: newUser._id.toString(), username: newUser.username } });
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
        res.status(200).json({ token, user: { id: user._id.toString(), username: user.username } });
    } catch (err) {
        console.error('[AUTH ERROR] Login Failure:', err);
        res.status(500).json({ message: 'SERVER CORE ERROR' });
    }
});

module.exports = router;

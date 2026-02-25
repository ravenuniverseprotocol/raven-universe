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
        const newUser = new User({
            username: normalizedUsername,
            password: hashedPassword,
            gameState: {
                credits: 5000,
                inventory: { 'OXYGEN': 500 },
                skills: {},
                skillQueue: []
            }
        });

        await newUser.save();

        const token = jwt.sign({ id: newUser._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ token, user: { id: newUser._id.toString(), username: newUser.username } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'SERVER ERROR DURING IDENTIFICATION' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const normalizedUsername = username.toUpperCase();

        const user = await User.findOne({ username: normalizedUsername });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ message: 'INVALID CREDENTIALS' });
        }

        const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ token, user: { id: user._id.toString(), username: user.username } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'SERVER CORE ERROR' });
    }
});

module.exports = router;

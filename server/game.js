const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('./database');

// Middleware to verify JWT
function authenticate(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'NO TOKEN PROVIDED' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'UNAUTHORIZED' });
        req.userId = decoded.id;
        next();
    });
}

// Get Game State
router.get('/state', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'USER NOT FOUND' });
        res.json(user.gameState);
    } catch (err) {
        console.error('[GAME ERROR] State Fetch Failure:', err);
        res.status(500).json({ message: 'ERROR FETCHING STATE' });
    }
});

// Heartbeat to update lastLogin (online status) without saving state
router.post('/heartbeat', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: 'USER NOT FOUND' });

        user.lastLogin = Date.now();
        await user.save();
        res.json({ message: 'HEARTBEAT RECEIVED' });
    } catch (err) {
        console.error('[GAME ERROR] Heartbeat Failure:', err);
        res.status(500).json({ message: 'ERROR UPDATING HEARTBEAT' });
    }
});

module.exports = router;

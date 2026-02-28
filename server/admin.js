const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User } = require('./database');

// Middleware to verify JWT (Admin check could be added here later)
function authenticate(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'NO TOKEN PROVIDED' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'UNAUTHORIZED' });
        req.userId = decoded.id;
        next();
    });
}

// List all users
router.get('/users', authenticate, async (req, res) => {
    try {
        const users = await User.find({}).select('username registrationIp registrationDate gameState.homeSystem');
        res.json(users);
    } catch (err) {
        console.error('[ADMIN ERROR] Fetch Failure:', err);
        res.status(500).json({ message: 'ERROR FETCHING USER REGISTRY' });
    }
});

// Delete a user
router.delete('/users/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        await User.findByIdAndDelete(id);
        res.json({ message: 'COMMANDER RECORD PURGED SUCCESSFULY' });
    } catch (err) {
        console.error('[ADMIN ERROR] Purge Failure:', err);
        res.status(500).json({ message: 'ERROR PURGING COMMANDER RECORD' });
    }
});

module.exports = router;

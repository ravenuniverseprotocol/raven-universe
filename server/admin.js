const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { User, BannedIP } = require('./database');

// Middleware to verify JWT and Admin rights (Only FUSO)
async function authenticateAdmin(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ message: 'NO TOKEN PROVIDED' });

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(401).json({ message: 'UNAUTHORIZED' });

        try {
            const user = await User.findById(decoded.id);
            if (!user || user.username !== 'FUSO') {
                return res.status(403).json({ message: 'ACCESS DENIED: UNKNOWN COMMANDER' });
            }
            req.userId = decoded.id;
            next();
        } catch (dbErr) {
            res.status(500).json({ message: 'SERVER ERROR DURING VALIDATION' });
        }
    });
}

// List all users
router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const users = await User.find({}).select('username registrationIp registrationDate gameState.homeSystem');
        res.json(users);
    } catch (err) {
        console.error('[ADMIN ERROR] Fetch Failure:', err);
        res.status(500).json({ message: 'ERROR FETCHING USER REGISTRY' });
    }
});

// List all banned IPs
router.get('/banned-ips', authenticateAdmin, async (req, res) => {
    try {
        const banned = await BannedIP.find({});
        res.json(banned);
    } catch (err) {
        res.status(500).json({ message: 'ERROR FETCHING BANNED REGISTRY' });
    }
});

// Ban an IP
router.post('/ban-ip', authenticateAdmin, async (req, res) => {
    try {
        const { ip, reason } = req.body;
        const newBan = new BannedIP({ ip, reason });
        await newBan.save();
        res.json({ message: 'NEURAL LINK INTERDICTED: IP BANNED' });
    } catch (err) {
        res.status(500).json({ message: 'ERROR SECURING IP INTERDICTION' });
    }
});

// Unban an IP
router.delete('/banned-ips/:ip', authenticateAdmin, async (req, res) => {
    try {
        const { ip } = req.params;
        await BannedIP.findOneAndDelete({ ip });
        res.json({ message: 'NEURAL LINK RESTORED: IP UNBANNED' });
    } catch (err) {
        res.status(500).json({ message: 'ERROR RESTORING IP ACCESS' });
    }
});

// Delete a user
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
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

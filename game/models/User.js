const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, // Will be hashed
    credits: { type: Number, default: 1000 },
    ship: { type: String, default: 'miner-v1' },
    systemId: { type: Number, default: 0 },
    role: { type: String, default: 'pilot' }, // pilot, admin, moderator
    createdAtIndex: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);

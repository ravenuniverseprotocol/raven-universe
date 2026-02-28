const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gameState: {
        skills: { type: Map, of: Object, default: {} },
        skillQueue: { type: Array, default: [] },
        credits: { type: Number, default: 5000 },
        inventory: { type: Map, of: Number, default: { 'OXYGEN': 500 } },
        homeSystem: { type: String, required: true },
        homeCoords: {
            x: { type: Number, required: true },
            y: { type: Number, required: true }
        }
    },
    registrationIp: { type: String, default: 'UNKNOWN' },
    registrationDate: { type: Date, default: Date.now },
    lastLogin: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const bannedIPSchema = new mongoose.Schema({
    ip: { type: String, required: true, unique: true },
    reason: { type: String, default: 'Multiple accounts or policy violation' },
    bannedAt: { type: Date, default: Date.now }
});

const BannedIP = mongoose.model('BannedIP', bannedIPSchema);

const connectDB = async () => {
    try {
        const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        const conn = await mongoose.connect(dbUri);
        console.log(`[RAVEN DATA] Neural Link established: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[RAVEN DATA] Connection Failure: ${error.message}`);
        process.exit(1);
    }
};

module.exports = { User, BannedIP, connectDB };

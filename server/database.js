const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    gameState: {
        skills: { type: Map, of: Object, default: {} },
        skillQueue: { type: Array, default: [] },
        credits: { type: Number, default: 5000 },
        inventory: { type: Map, of: Number, default: { 'OXYGEN': 500 } }
    },
    lastLogin: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`[RAVEN DATA] Neural Link established: ${conn.connection.host}`);
    } catch (error) {
        console.error(`[RAVEN DATA] Connection Failure: ${error.message}`);
        process.exit(1);
    }
};

module.exports = { User, connectDB };

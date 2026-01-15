const mongoose = require('mongoose');
const User = require('./game/models/User');

const MONGO_URI = "mongodb+srv://ravenuniverseprotocol_db_user:RavenComando2026@raven-cluster.ch30ame.mongodb.net/raven_universe?appName=Raven-Cluster";

async function wipe() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB...");
        const result = await User.deleteMany({});
        console.log(`[SUCCESS] DELETED ${result.deletedCount} users from the database.`);
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await mongoose.disconnect();
    }
}

wipe();

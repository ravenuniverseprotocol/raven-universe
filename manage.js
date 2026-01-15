const mongoose = require('mongoose');
const User = require('./game/models/User');
require('dotenv').config(); // Load MONGO_URI from .env

// Manual MONGO_URI if .env fails (User can edit this)
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://ravenuniverseprotocol_db_user:RavenComando2026@raven-cluster.ch30ame.mongodb.net/raven_universe?appName=Raven-Cluster";

async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    const targetUser = args[1];

    console.log('--- RAVEN COMMAND: USER MANAGEMENT ---');

    try {
        await mongoose.connect(MONGO_URI);
        console.log('[Connection Established]');

        if (command === 'list') {
            const users = await User.find({}, 'username email isVerified role lastLogin');
            console.log('\n--- PILOT ROSTER ---');
            console.table(users.map(u => ({
                user: u.username,
                email: u.email,
                status: u.isVerified ? 'ACTIVE' : 'PENDING',
                role: u.role
            })));
        }
        else if (command === 'approve' && targetUser) {
            const res = await User.updateOne({ username: targetUser }, { isVerified: true });
            if (res.modifiedCount > 0) console.log(`\n[SUCCESS] Pilot '${targetUser}' is now APPROVED.`);
            else console.log(`\n[ERROR] Pilot '${targetUser}' not found.`);
        }
        else if (command === 'ban' && targetUser) {
            const res = await User.deleteOne({ username: targetUser });
            if (res.deletedCount > 0) console.log(`\n[SUCCESS] Pilot '${targetUser}' has been TERMINATED (Deleted).`);
            else console.log(`\n[ERROR] Pilot '${targetUser}' not found.`);
        }
        else {
            console.log('\nCOMMANDS:');
            console.log('  node manage.js list             -> Show all pilots');
            console.log('  node manage.js approve <name>   -> Approve a pilot');
            console.log('  node manage.js ban <name>       -> Delete a pilot');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

main();

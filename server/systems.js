const { User } = require('./database');

function createSeededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}

/**
 * Finds the first unassigned system from the procedural pool (Seed: 777).
 * This ensures players are assigned to "existing" systems on the map.
 */
async function getAvailableSystem() {
    const seededRandom = createSeededRandom(777);
    const spread = 2000;

    // We skip the first manual slot (which was the local home in the original client code)
    // and start searching from the procedural sequence.

    // Step 0: consume the first seededRandom call if necessary to align with client?
    // In MapModule.js, i = 0 is pushed manually. Then loop i = 1 to 100.
    // So the FIRST call to seededRandom() happens for i = 1.

    let iterations = 0;
    const maxIterations = 100; // Limit to the first 100 systems on the map

    while (iterations < maxIterations) {
        iterations++;

        // Match MapModule.js generation order
        const a = seededRandom() * Math.PI * 2;
        const r = Math.sqrt(seededRandom()) * spread;

        const p1 = Math.floor(seededRandom() * 99).toString().padStart(2, '0');
        const p2 = Math.floor(seededRandom() * 99).toString().padStart(2, '0');
        const p3 = Math.floor(seededRandom() * 99).toString().padStart(2, '0');

        const systemName = `${p1}.${p2}.${p3}`;
        const coords = {
            x: Math.cos(a) * r,
            y: Math.sin(a) * r
        };

        // Check if this system is already occupied
        const existingUser = await User.findOne({ 'gameState.homeSystem': systemName });
        if (!existingUser) {
            console.log(`[RAVEN SYSTEMS] Assigned new free system: ${systemName}`);
            return { systemName, coords };
        }
    }

    throw new Error("No free systems found in the procedural pool.");
}

module.exports = { getAvailableSystem };

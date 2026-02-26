const { User } = require('./database');

function createSeededRandom(seed) {
    let s = seed;
    return function () {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
    };
}

/**
 * Procedurally generates the 100 systems of the galaxy.
 */
function getProcessedPool() {
    const seededRandom = createSeededRandom(777);
    const spread = 2000;
    const pool = [];

    // Iteration 0 (Match MapModule.js home logic if necessary, but we focus on the 99 procedural ones)
    // MapModule pushes home manually, then loops 1 to 100.

    for (let i = 1; i < 100; i++) {
        const a = seededRandom() * Math.PI * 2;
        const r = Math.sqrt(seededRandom()) * spread;
        const p1 = Math.floor(seededRandom() * 99).toString().padStart(2, '0');
        const p2 = Math.floor(seededRandom() * 99).toString().padStart(2, '0');
        const p3 = Math.floor(seededRandom() * 99).toString().padStart(2, '0');

        pool.push({
            name: `${p1}.${p2}.${p3}`,
            coords: {
                x: Math.cos(a) * r,
                y: Math.sin(a) * r
            }
        });
    }
    return pool;
}

/**
 * Isolation Protocol: Finds the system that is FURTHEST away from all currently occupied systems.
 */
async function getAvailableSystem() {
    const pool = getProcessedPool();
    const occupiedUsers = await User.find({}).select('gameState.homeSystem gameState.homeCoords username');

    const occupiedList = occupiedUsers.map(u => ({
        name: u.gameState.homeSystem,
        x: u.gameState.homeCoords.x,
        y: u.gameState.homeCoords.y
    }));

    let bestSystem = null;
    let maxMinDistance = -1;

    // Filter out already occupied systems and find the most isolated one
    for (const sys of pool) {
        if (occupiedList.some(o => o.name === sys.name)) continue;

        // Calculate distance to the nearest player
        let minDistanceToAnyPlayer = Infinity;
        for (const player of occupiedList) {
            const dx = sys.coords.x - player.x;
            const dy = sys.coords.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistanceToAnyPlayer) {
                minDistanceToAnyPlayer = dist;
            }
        }

        // If there are no players yet, just pick the first one
        if (occupiedList.length === 0) {
            return { systemName: sys.name, coords: sys.coords };
        }

        // We want to MAXIMIZE the MINIMUM distance to any existing player
        if (minDistanceToAnyPlayer > maxMinDistance) {
            maxMinDistance = minDistanceToAnyPlayer;
            bestSystem = sys;
        }
    }

    if (bestSystem) {
        console.log(`[RAVEN SYSTEMS] Isolation Protocol selected: ${bestSystem.name} (Min Dist: ${maxMinDistance.toFixed(2)})`);
        return { systemName: bestSystem.name, coords: bestSystem.coords };
    }

    throw new Error("No free systems found in the procedural pool.");
}

module.exports = { getAvailableSystem };

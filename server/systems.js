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
 * Must perfectly match MapModule.js
 */
function getProcessedPool() {
    const seededRandom = createSeededRandom(777);
    const spread = 2000;
    const pool = [];

    // System Index 0 - Fixed Center (Historical Home)
    pool.push({
        name: "10.05.29",
        coords: { x: 0, y: 0 }
    });

    // Remaining 99 - Deterministic Randoms
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
 * No manual logic, purely mathematical.
 */
async function getAvailableSystem() {
    const pool = getProcessedPool();
    const occupiedUsers = await User.find({}).select('gameState.homeSystem gameState.homeCoords');

    const occupiedList = occupiedUsers.map(u => ({
        name: u.gameState.homeSystem,
        x: u.gameState.homeCoords.x,
        y: u.gameState.homeCoords.y
    }));

    let bestSystem = null;
    let maxMinDistance = -1;

    // Filter out already occupied systems and find the most isolated one
    for (const sys of pool) {
        // Skip if this specific system name is already taken
        if (occupiedList.some(o => o.name === sys.name)) continue;

        // Calculate distance to the nearest existing player
        let minDistanceToAnyPlayer = Infinity;
        for (const player of occupiedList) {
            const dx = sys.coords.x - player.x;
            const dy = sys.coords.y - player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDistanceToAnyPlayer) {
                minDistanceToAnyPlayer = dist;
            }
        }

        // If no players exist (impossible as FUSO at least is there), pick anything
        if (occupiedList.length === 0) return { systemName: sys.name, coords: sys.coords };

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

module.exports = { getAvailableSystem, getProcessedPool };

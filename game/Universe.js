class Universe {
    constructor() {
        this.systems = [];
        this.factions = [];
        this.generateUniverse();
    }

    generateUniverse() {
        // 1. Create Central Hub "Raven Prime"
        this.systems.push({
            id: 0,
            name: "Raven Prime",
            x: 0,
            y: 0,
            security: 1.0, // 1.0 = Safe, 0.0 = Lawless
            owner: "RAVEN",
            description: "Station Central Neutra. Zona Segura protegida por Sentinelas.",
            resources: []
        });

        // 2. Generate 99 Procedural Systems
        for (let i = 1; i < 100; i++) {
            const isSafeZone = i < 10; // First 10 systems are partial safe zones for newbies
            const x = (Math.random() * 2000) - 1000;
            const y = (Math.random() * 2000) - 1000;

            this.systems.push({
                id: i,
                name: `Sector-${i}`,
                x: Math.floor(x),
                y: Math.floor(y),
                security: isSafeZone ? 0.8 : 0.0, // High security for start, 0 for deep space
                owner: null, // Claimable
                resources: this.generateResources(i),
                station: null // Players can build here
            });
        }
    }

    generateResources(seed) {
        // Simple resource generation
        const resources = ['Iron', 'Ice', 'Titanium', 'Ravenium'];
        const amount = Math.floor(Math.random() * 3) + 1;
        const systemResources = [];
        for (let j = 0; j < amount; j++) {
            systemResources.push(resources[Math.floor(Math.random() * resources.length)]);
        }
        return [...new Set(systemResources)]; // Unique list
    }

    getStartingSystem() {
        return this.systems[0];
    }

    getPublicData() {
        // Return only what players need to know (map structure)
        return this.systems.map(s => ({
            id: s.id,
            name: s.name,
            x: s.x,
            y: s.y,
            security: s.security,
            owner: s.owner
        }));
    }
}

module.exports = Universe;

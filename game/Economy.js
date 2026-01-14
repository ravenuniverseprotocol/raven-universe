class Economy {
    constructor() {
        this.market = new Map(); // Item -> { floor, ceiling, currentPrice }
        this.stationDebts = new Map(); // GuildID -> Amount
        this.initMarket();
    }

    initMarket() {
        // Define base resources and their Ravens Control constraints
        const resources = [
            { name: 'Iron', floor: 10, ceiling: 50, start: 20 },
            { name: 'Ice', floor: 5, ceiling: 25, start: 10 },
            { name: 'Titanium', floor: 50, ceiling: 200, start: 100 },
            { name: 'Ravenium', floor: 500, ceiling: 2000, start: 1000 } // Rare
        ];

        resources.forEach(res => {
            this.market.set(res.name, {
                floor: res.floor,
                ceiling: res.ceiling,
                price: res.start
            });
        });
    }

    getPrice(resourceName) {
        if (!this.market.has(resourceName)) return 0;
        return this.market.get(resourceName).price;
    }

    // Dynamic price adjustment based on supply/demand simulation
    updatePrices(transactions) {
        // Logic to fluctuate prices within floor/ceiling
        this.market.forEach((data, name) => {
            // Simple random fluctuation for simulation
            let fluctuation = (Math.random() - 0.5) * 2; // -1 to 1
            let newPrice = data.price + fluctuation;

            // Enforce Raven Floors/Ceilings
            if (newPrice < data.floor) newPrice = data.floor;
            if (newPrice > data.ceiling) newPrice = data.ceiling;

            data.price = parseFloat(newPrice.toFixed(2));
        });
    }

    // Debt System for Station Maintenance
    chargeMaintenance(guildId, stationLevel) {
        const cost = stationLevel * 1000; // Example cost per week
        let currentDebt = this.stationDebts.get(guildId) || 0;
        this.stationDebts.set(guildId, currentDebt + cost);
        return cost;
    }

    payDebt(guildId, amount) {
        let currentDebt = this.stationDebts.get(guildId) || 0;
        let newDebt = Math.max(0, currentDebt - amount);
        this.stationDebts.set(guildId, newDebt);
        return currentDebt - newDebt; // Amount actually paid
    }
}

module.exports = Economy;

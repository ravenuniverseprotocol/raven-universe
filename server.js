require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Game Modules
const Universe = require('./game/Universe');
const Authentication = require('./game/Authentication'); // Auth Module

const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure CORS for web access
app.use(cors());

// Serve static files with absolute path
app.use(express.static(path.join(__dirname, 'public')));

// Explicit handler for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO Setup
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all connections for now (Render/Dev)
        methods: ["GET", "POST"]
    }
});

// Initialize Game Universe
const ravenUniverse = new Universe();
const auth = new Authentication(); // Initialize Auth
console.log(`[GAME] Universe initialized with ${ravenUniverse.systems.length} systems.`);

// Game State
const players = new Map();

io.on('connection', (socket) => {
    console.log(`[NET] New Connection: ${socket.id}`);

    // Handle Register
    socket.on('register', (data) => {
        const result = auth.register(data.username, data.password);
        socket.emit('registerResponse', result);
    });

    // Handle Login
    socket.on('login', (data) => {
        const result = auth.login(data.username, data.password);
        if (result.success) {
            // Success! Join the game
            const user = result.user;

            // Re-sync user location if needed, or use saved
            const startSystem = ravenUniverse.systems.find(s => s.id === user.systemId) || ravenUniverse.getStartingSystem();

            const activePlayer = {
                id: socket.id,
                username: user.username,
                systemId: startSystem.id,
                credits: user.credits,
                ship: user.ship,
                status: 'active'
            };

            players.set(socket.id, activePlayer);
            socket.emit('loginResponse', { success: true, player: activePlayer, universe: ravenUniverse.getPublicData() });

            // Broadcast arrival
            socket.broadcast.emit('playerJoined', { id: activePlayer.id, username: activePlayer.username });
        } else {
            socket.emit('loginResponse', { success: false, message: result.message });
        }
    });
    socket.on('join', (data) => {
        // data: { username: "PilotName" }
        const startSystem = ravenUniverse.getStartingSystem();

        const newPlayer = {
            id: socket.id,
            username: data.username || `Pilot-${socket.id.substr(0, 4)}`,
            systemId: startSystem.id,
            credits: 1000, // Starting credits
            ship: 'miner-v1',
            status: 'active' // active, pod, dead
        };

        players.set(socket.id, newPlayer);

        // Send initial data to player
        socket.emit('init', {
            universe: ravenUniverse.getPublicData(),
            player: newPlayer
        });

        // Broadcast new player arrival
        socket.broadcast.emit('playerJoined', { id: newPlayer.id, username: newPlayer.username });
    });

    socket.on('disconnect', () => {
        console.log(`[NET] Pilot Disconnected: ${socket.id}`);
        players.delete(socket.id);
        io.emit('playerLeft', { id: socket.id });
    });
});

// Anti-Sleep / Keep-Alive for Render Free Tier (Optional)
// Render spins down after 15mins of inactivity. 
// This endpoint allows an external monitor (like UptimeRobot) to ping it.
app.get('/health', (req, res) => {
    res.status(200).send('Raven Universe Systems Online');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[SERVER] Raven Universe Command Uplink Active on Port ${PORT}`);
});

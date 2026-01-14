const socket = io(); // Connects to the same domain automatically

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusDiv = document.getElementById('status');
const playerCountDiv = document.getElementById('player-count');
const currentSystemDiv = document.getElementById('current-system');
const securityLevelDiv = document.getElementById('security-level');

// Responsive Canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Game State
let universeData = [];
let localPlayer = null;
let otherPlayers = new Map();

// Camera
let camera = { x: 0, y: 0, zoom: 0.5 };

// Socket Events
socket.on('connect', () => {
    statusDiv.textContent = 'ONLINE - Connected to Raven Server';
    statusDiv.style.color = '#0f0';
    console.log('Connected to server');

    // Auto-join
    socket.emit('join', { username: 'Commander' });
});

socket.on('disconnect', () => {
    statusDiv.textContent = 'OFFLINE - Connection Lost';
    statusDiv.style.color = '#f00';
});

socket.on('init', (data) => {
    universeData = data.universe;
    localPlayer = data.player;
    console.log('Universe Data Received:', universeData.length, 'systems');

    // Center camera on start system
    const startSys = universeData.find(s => s.id === localPlayer.systemId);
    if (startSys) {
        camera.x = startSys.x;
        camera.y = startSys.y;
        currentSystemDiv.textContent = startSys.name;
        securityLevelDiv.textContent = startSys.security > 0.5 ? 'HIGH (SAFE)' : 'NULL (PVP)';
    }

    // Start Simulation Loop
    requestAnimationFrame(gameLoop);
});

socket.on('playerJoined', (data) => {
    console.log('New pilot detected:', data.username);
});

// Render Loop
function gameLoop() {
    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid (Simulation of Space)
    drawGrid();

    // Draw Systems
    universeData.forEach(system => {
        drawSystem(system);
    });

    // Draw Player Ship (Simulated)
    if (localPlayer) {
        // Simple rotation simulation
        const time = Date.now() * 0.001;
        drawShip(canvas.width / 2, canvas.height / 2, 'cyan', 'ME');
    }

    requestAnimationFrame(gameLoop);
}

function drawSystem(system) {
    const screenX = (system.x - camera.x) * camera.zoom + canvas.width / 2;
    const screenY = (system.y - camera.y) * camera.zoom + canvas.height / 2;

    // Culling
    if (screenX < -50 || screenX > canvas.width + 50 || screenY < -50 || screenY > canvas.height + 50) return;

    // Draw Star/Station
    ctx.beginPath();
    ctx.arc(screenX, screenY, system.id === 0 ? 8 : 4, 0, Math.PI * 2);
    ctx.fillStyle = system.id === 0 ? '#ffff00' : (system.security > 0.5 ? '#00ff00' : '#ff0000');
    ctx.fill();

    // Label
    ctx.fillStyle = '#aaa';
    ctx.font = '10px Arial';
    ctx.fillText(system.name, screenX + 10, screenY + 3);
}

function drawShip(x, y, color, label) {
    ctx.save();
    ctx.translate(x, y);
    // Draw Triangle Ship
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-5, 5);
    ctx.lineTo(-5, -5);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
}

function drawGrid() {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    const step = 100 * camera.zoom;
    const offsetX = (camera.x * camera.zoom) % step;
    const offsetY = (camera.y * camera.zoom) % step;

    for (let x = -offsetX; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = -offsetY; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

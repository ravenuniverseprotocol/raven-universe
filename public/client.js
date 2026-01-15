const socket = io();

// UI Elements
const loginOverlay = document.getElementById('login-overlay');
const loginMsg = document.getElementById('login-msg');
const uiLayer = document.getElementById('ui-layer');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game State
let universeData = [];
let localPlayer = null;
let camera = { x: 0, y: 0, zoom: 0.5 };

// --- AUTH HANDLERS ---
const emailInput = document.getElementById('email');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const otpInput = document.getElementById('otp-code');
const loginBtn = document.getElementById('btn-login');
const registerBtn = document.getElementById('btn-register');
const verifyBtn = document.getElementById('btn-verify');

// Toggle UI logic
let isRegistering = false;
let pendingEmail = '';
let isLogin2FA = false;

if (registerBtn) {
    registerBtn.addEventListener('click', () => {
        if (!isRegistering) {
            // Switch to Register Mode
            isRegistering = true;
            isLogin2FA = false;
            emailInput.style.display = 'block';
            loginBtn.style.display = 'none';
            registerBtn.textContent = 'CONFIRM REGISTRATION';
            registerBtn.style.background = '#0f0';
            registerBtn.style.color = '#000';
            otpInput.style.display = 'none';
            verifyBtn.style.display = 'none';
        } else {
            // Perform Register
            const user = usernameInput.value;
            const email = emailInput.value;
            const pass = passwordInput.value;
            if (!user || !email || !pass) return showMsg('All fields required');
            pendingEmail = email;
            socket.emit('register', { username: user, email: email, password: pass });
        }
    });
}

if (loginBtn) {
    loginBtn.addEventListener('click', () => {
        const user = usernameInput.value;
        const pass = passwordInput.value;
        if (!user || !pass) return showMsg('Enter credentials');
        socket.emit('login', { username: user, password: pass });
    });
}

if (verifyBtn) {
    verifyBtn.addEventListener('click', () => {
        const code = otpInput.value;
        if (!code) return showMsg('Enter code');

        if (isLogin2FA) {
            // Step 2 Login: verify with code
            socket.emit('login', {
                username: usernameInput.value,
                password: passwordInput.value,
                code: code
            });
        } else {
            // Registration Verify
            socket.emit('verify', { email: pendingEmail, code: code });
        }
    });
}

function showMsg(msg) {
    if (loginMsg) loginMsg.textContent = msg;
    console.log('[MSG]', msg);
}

// --- SOCKET EVENTS ---
socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('registerResponse', (res) => {
    console.log('[DEBUG] Register Response:', res);
    if (res.success && res.requireOtp) {
        showMsg(res.message);
        // Show OTP UI
        emailInput.style.display = 'none';
        usernameInput.style.display = 'none';
        passwordInput.style.display = 'none';
        registerBtn.style.display = 'none';

        otpInput.style.display = 'block';
        verifyBtn.style.display = 'block';
    } else {
        showMsg(res.message);
    }
});

socket.on('verifyResponse', (res) => {
    if (res.success) {
        showMsg('Account Verified! Please Login.');
        setTimeout(() => location.reload(), 2000);
    } else {
        showMsg(res.message);
    }
});

socket.on('loginResponse', (res) => {
    if (res.success) {
        // AUTH SUCCESS
        if (loginOverlay) loginOverlay.classList.add('hidden');
        if (uiLayer) uiLayer.style.display = 'block';
        if (canvas) canvas.style.display = 'block';

        // Init Game
        localPlayer = res.player;
        universeData = res.universe;
        initGame();
    } else if (res.requireOtp) {
        // 2FA Challenge
        isLogin2FA = true;
        showMsg(res.message);

        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        usernameInput.style.display = 'none';
        passwordInput.style.display = 'none';

        otpInput.style.display = 'block';
        verifyBtn.style.display = 'block';
        verifyBtn.textContent = 'VERIFY LOGIN CODE';
        verifyBtn.style.background = '#eb1';
    } else {
        showMsg(res.message);
    }
});

function initGame() {
    const startSys = universeData.find(s => s.id === localPlayer.systemId);
    if (startSys) {
        camera.x = startSys.x;
        camera.y = startSys.y;
        const sysEl = document.getElementById('current-system');
        const secEl = document.getElementById('security-level');
        if (sysEl) sysEl.textContent = startSys.name;
        if (secEl) secEl.textContent = startSys.security > 0.5 ? 'HIGH (SAFE)' : 'NULL (PVP)';
    }
    requestAnimationFrame(gameLoop);
}

// --- RENDER LOOP ---
function resize() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}
window.addEventListener('resize', resize);
resize();

function gameLoop() {
    if (!canvas || !ctx) return;

    // Clear
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    // Draw Systems
    if (universeData) {
        universeData.forEach(system => {
            drawSystem(system);
        });
    }

    // Draw Player Ship
    if (localPlayer) {
        drawShip(canvas.width / 2, canvas.height / 2, 'cyan');
    }

    requestAnimationFrame(gameLoop);
}

function drawSystem(system) {
    const screenX = (system.x - camera.x) * camera.zoom + canvas.width / 2;
    const screenY = (system.y - camera.y) * camera.zoom + canvas.height / 2;

    if (screenX < -50 || screenX > canvas.width + 50 || screenY < -50 || screenY > canvas.height + 50) return;

    ctx.beginPath();
    ctx.arc(screenX, screenY, system.id === 0 ? 8 : 4, 0, Math.PI * 2);
    ctx.fillStyle = system.id === 0 ? '#ffff00' : (system.security > 0.5 ? '#00ff00' : '#ff0000');
    ctx.fill();

    ctx.fillStyle = '#aaa';
    ctx.font = '10px Arial';
    ctx.fillText(system.name, screenX + 10, screenY + 3);
}

function drawGrid() {
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    const step = 100 * camera.zoom;
    const offsetX = (camera.x * camera.zoom) % step;
    const offsetY = (camera.y * camera.zoom) % step;

    for (let x = -offsetX; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = -offsetY; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
}

function drawShip(x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(10, 0); ctx.lineTo(-5, 5); ctx.lineTo(-5, -5); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    ctx.restore();
}

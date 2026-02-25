// Core Engine Diagnostic
window.DEBUG_RESET = true; // [TEMPORARY] Set to true to reset game state on every refresh
window.onerror = function (msg, url, line, col, error) {
    alert(`ENGINE ERROR: ${msg}\nAt: ${url}\nLine: ${line}`);
    console.error(msg, url, line, col, error);
};

const canvas = document.getElementById('gameCanvas');
const gl = canvas.getContext('webgl2', { alpha: false, depth: false, antialias: true });
const fgCanvas = document.getElementById('foregroundCanvas');
const fgCtx = fgCanvas.getContext('2d');

let width, height;
let lastTime = 0;

// WebGL Shaders for Starfield
const vsSource = `#version 300 es
    in vec2 a_position;
    in float a_size;
    in float a_baseAlpha;
    in float a_twinkle;
    in float a_offset;
    
    uniform vec2 u_resolution;
    
    out float v_alpha;
    out float v_twinkle;
    out float v_offset;
    out float v_baseAlpha;

    void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        gl_PointSize = a_size;
        v_baseAlpha = a_baseAlpha;
        v_twinkle = a_twinkle;
        v_offset = a_offset;
    }
`;

const fsSource = `#version 300 es
    precision highp float;
    uniform float u_time;
    in float v_baseAlpha;
    in float v_twinkle;
    in float v_offset;
    out vec4 outColor;

    void main() {
        float alpha = v_baseAlpha;
        if (v_twinkle > 0.5) {
            float t = u_time * 0.003 + v_offset;
            alpha += sin(t) * 0.15;
        }
        outColor = vec4(vec3(1.0), alpha);
    }
`;

let program, vao, positionBuffer, sizeBuffer, alphaBuffer, twinkleBuffer, offsetBuffer;
let starCount = 0;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaders() {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vs || !fs) {
        throw new Error("Shader compilation failed. Check console for details.");
    }

    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        throw new Error("WebGL Program linking failed.");
    }

    gl.useProgram(program);
}

function initBuffers() {
    starCount = Math.floor((width * height) / 600);
    const positions = new Float32Array(starCount * 2);
    const sizes = new Float32Array(starCount);
    const alphas = new Float32Array(starCount);
    const twinkles = new Float32Array(starCount);
    const offsets = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
        positions[i * 2] = Math.random() * width;
        positions[i * 2 + 1] = Math.random() * height;
        sizes[i] = Math.random() * 1.5 + 0.5;
        alphas[i] = Math.random() * 0.5 + 0.4;
        twinkles[i] = Math.random() < 0.15 ? 1.0 : 0.0;
        offsets[i] = Math.random() * 1000.0;
    }

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const setupBuffer = (data, name, size) => {
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
        return buf;
    };

    positionBuffer = setupBuffer(positions, "a_position", 2);
    sizeBuffer = setupBuffer(sizes, "a_size", 1);
    alphaBuffer = setupBuffer(alphas, "a_baseAlpha", 1);
    twinkleBuffer = setupBuffer(twinkles, "a_twinkle", 1);
    offsetBuffer = setupBuffer(offsets, "a_offset", 1);
}

function init(initialState) {
    resize();
    initShaders();
    initBuffers();

    initCommander(initialState);
    initMap();
    initMarket();
    initHangar();
    initSettings();
    initRadar();
    initStationHUD();
    if (typeof initSystemView === 'function') initSystemView();

    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => {
            btn.closest('.window-modal').style.display = 'none';
        };
    });

    requestAnimationFrame(loop);
}

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);

    fgCanvas.width = width * dpr;
    fgCanvas.height = height * dpr;
    fgCanvas.style.width = width + 'px';
    fgCanvas.style.height = height + 'px';
    fgCtx.scale(dpr, dpr);
}

function update(dt) {
    if (window.tacticalRadar) window.tacticalRadar.update(dt);
    if (window.npcManager) window.npcManager.update(dt);
}

function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform2f(gl.getUniformLocation(program, "u_resolution"), width, height);
    gl.uniform1f(gl.getUniformLocation(program, "u_time"), performance.now());

    gl.drawArrays(gl.POINTS, 0, starCount);

    if (window.tacticalRadar) window.tacticalRadar.draw();

    fgCtx.clearRect(0, 0, width, height);
    if (window.systemView && typeof window.systemView.drawBackgroundShips === 'function') {
        window.systemView.drawBackgroundShips(fgCtx, width, height);
    }
}

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    update(Math.min(dt, 0.1));
    draw();
    requestAnimationFrame(loop);
}

window.addEventListener('resize', () => {
    resize();
    initBuffers();
    if (window.galaxyMap) window.galaxyMap.resize();
});

window.initGame = init;
// init(); Removed to wait for auth

class TacticalRadar {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.gl = this.canvas.getContext('webgl2', { alpha: true });
        this.container = document.getElementById('radar-container');
        this.angle = 0;
        this.entities = [];
        this.currentSystemId = null;

        this.init();
    }

    init() {
        this.initShaders();
        this.initBuffers();
        this.resize();
        this.generateSystemData("S10.05.29");
        window.addEventListener('resize', () => this.resize());
    }

    initShaders() {
        const vsSource = `#version 300 es
            in vec2 a_pos;
            in float a_dist;
            in float a_angle;
            in float a_alpha;
            in vec3 a_color;
            uniform float u_radarRadius;
            uniform vec2 u_resolution;
            out float v_alpha;
            out vec3 v_color;
            void main() {
                float r = a_dist * u_radarRadius;
                vec2 worldPos = vec2(cos(a_angle), sin(a_angle)) * r;
                // Radar is 180x180, center is 90,90
                vec2 clipPos = ((worldPos + 90.0) / 180.0) * 2.0 - 1.0;
                gl_Position = vec4(clipPos * vec2(1, -1), 0, 1);
                gl_PointSize = 4.0;
                v_alpha = a_alpha;
                v_color = a_color;
            }
        `;

        const fsSource = `#version 300 es
            precision highp float;
            in float v_alpha;
            in vec3 v_color;
            out vec4 outColor;
            void main() {
                float d = length(gl_PointCoord - 0.5);
                if (d > 0.5) discard;
                outColor = vec4(v_color, v_alpha);
            }
        `;

        const createShader = (gl, type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            return shader;
        };

        const gl = this.gl;
        const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
        const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
        this.program = gl.createProgram();
        gl.attachShader(this.program, vs);
        gl.attachShader(this.program, fs);
        gl.linkProgram(this.program);
    }

    initBuffers() {
        const gl = this.gl;
        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

        const setupAttrib = (name, size, stride, offset) => {
            const loc = gl.getAttribLocation(this.program, name);
            if (loc === -1) return;
            gl.enableVertexAttribArray(loc);
            gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
        };

        // Struct: dist (1), angle (1), alpha (1), color (3) = 6 floats
        const stride = 6 * 4;
        setupAttrib("a_dist", 1, stride, 0);
        setupAttrib("a_angle", 1, stride, 4);
        setupAttrib("a_alpha", 1, stride, 8);
        setupAttrib("a_color", 3, stride, 12);
    }

    resize() {
        const size = 180;
        this.width = size;
        this.height = size;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = size * dpr;
        this.canvas.height = size * dpr;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    generateSystemData(systemId) {
        this.currentSystemId = systemId;
        this.entities = [];
        let seed = 0;
        for (let i = 0; i < systemId.length; i++) seed += systemId.charCodeAt(i);
        const seededRandom = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

        const add = (count, type, speedRange) => {
            for (let i = 0; i < count; i++) {
                this.entities.push({
                    dist: 0.1 + seededRandom() * 0.8,
                    angle: seededRandom() * Math.PI * 2,
                    type, alpha: 0,
                    id: type.substring(0, 3).toUpperCase() + '-' + Math.floor(seededRandom() * 1000),
                    speed: speedRange ? speedRange[0] + seededRandom() * (speedRange[1] - speedRange[0]) : 0
                });
            }
        };
        add(5 + Math.floor(seededRandom() * 10), 'asteroid');
    }

    update(dt) {
        if (!window.skillManager || !window.skillManager.checkRadarStatus()) return;

        const sweepSkill = window.skillManager.skills['sweep_velocity']?.level || 0;
        this.angle += dt * 1.5 * (1 + (sweepSkill * 0.5));
        if (this.angle > Math.PI * 2) this.angle -= Math.PI * 2;

        const rangeSkill = window.skillManager.skills['scanner_range']?.level || 1;
        const visibleRange = 0.4 + (rangeSkill * 0.12);

        const trackingCap = window.skillManager.getTrackingCapacity();

        // 1. Filter entities within range
        let inRange = this.entities.filter(ent => ent.dist < visibleRange);

        // 2. Prioritize: Hostile > Distance (Priority for closer targets)
        inRange.sort((a, b) => {
            if (a.type === 'hostile' && b.type !== 'hostile') return -1;
            if (b.type === 'hostile' && a.type !== 'hostile') return 1;
            return a.dist - b.dist;
        });

        // 3. Mark Tracked vs Ghost
        inRange.forEach((ent, index) => {
            ent.isTracked = index < trackingCap;

            if (ent.speed) ent.angle += ent.speed * dt;
            const diff = (this.angle - ent.angle + Math.PI * 2) % (Math.PI * 2);

            if (diff < 0.2) {
                ent.alpha = 1.0;
            } else {
                ent.alpha *= 0.98;
            }
        });

        // Update UI
        const trackedCount = Math.min(inRange.length, trackingCap);
        const countSpan = document.getElementById('radar-tracked-count');
        const maxSpan = document.getElementById('radar-max-slots');
        if (countSpan) countSpan.innerText = trackedCount;
        if (maxSpan) maxSpan.innerText = trackingCap;
    }

    draw() {
        const isFunctional = window.skillManager && window.skillManager.checkRadarStatus();
        if (this.container) this.container.style.display = isFunctional ? 'block' : 'none';
        if (!isFunctional) return;

        const gl = this.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        gl.useProgram(this.program);
        gl.bindVertexArray(this.vao);

        const resSkill = window.skillManager.skills['signal_resolution']?.level || 1;
        // Draw only entities within range
        const visibleEntities = this.entities.filter(ent => ent.alpha > 0.01);
        const data = new Float32Array(visibleEntities.length * 6);

        visibleEntities.forEach((ent, i) => {
            data[i * 6] = ent.dist;
            data[i * 6 + 1] = ent.angle;

            // Effect: Untracked entities are 70% dimmer and flicker
            let finalAlpha = ent.alpha;
            if (!ent.isTracked) {
                finalAlpha *= 0.3 * (0.8 + Math.random() * 0.4);
            }
            data[i * 6 + 2] = finalAlpha;

            let color = [0.31, 0.58, 0.78]; // #5096c8

            // Identification only works if tracked AND resolution is high enough
            if (ent.isTracked && resSkill >= 3) {
                if (ent.type === 'hostile') color = [1.0, 0.26, 0.26];
                else if (ent.type === 'player') color = [0.0, 1.0, 0.53];
                else if (ent.type === 'asteroid') color = [0.53, 0.53, 0.53];
            } else if (!ent.isTracked) {
                // Ghost signals are monochrome/greyish
                color = [0.4, 0.4, 0.4];
            }

            data[i * 6 + 3] = color[0];
            data[i * 6 + 4] = color[1];
            data[i * 6 + 5] = color[2];
        });

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

        gl.uniform1f(gl.getUniformLocation(this.program, "u_radarRadius"), 100.0);
        gl.drawArrays(gl.POINTS, 0, visibleEntities.length);
    }
}

function initRadar() {
    window.tacticalRadar = new TacticalRadar('radarCanvas');
}

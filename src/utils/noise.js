// ============================================================
// noise.js — Simplex 2D / 3D noise for procedural generation
// Based on Stefan Gustavson's implementation (public domain)
// ============================================================

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const F3 = 1 / 3;
const G3 = 1 / 6;

// Gradient vectors
const grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
];

export class SimplexNoise {
    constructor(seed = Math.random()) {
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        this._seed(seed);
    }

    _seed(seed) {
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;

        // Fisher–Yates shuffle with seeded PRNG
        let s = seed;
        for (let i = 255; i > 0; i--) {
            s = (s * 16807 + 0.5) % 2147483647;
            const j = Math.floor((s / 2147483647) * (i + 1));
            [p[i], p[j]] = [p[j], p[i]];
        }

        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }

    /**
     * 2D Simplex noise.  Returns value in roughly [-1, 1].
     */
    noise2D(x, y) {
        const s = (x + y) * F2;
        const i = Math.floor(x + s);
        const j = Math.floor(y + s);
        const t = (i + j) * G2;
        const X0 = i - t, Y0 = j - t;
        const x0 = x - X0, y0 = y - Y0;

        const i1 = x0 > y0 ? 1 : 0;
        const j1 = x0 > y0 ? 0 : 1;
        const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
        const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;

        const ii = i & 255, jj = j & 255;

        let n0 = 0, n1 = 0, n2 = 0;
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) {
            const gi0 = this.permMod12[ii + this.perm[jj]];
            t0 *= t0;
            n0 = t0 * t0 * (grad3[gi0][0] * x0 + grad3[gi0][1] * y0);
        }
        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) {
            const gi1 = this.permMod12[ii + i1 + this.perm[jj + j1]];
            t1 *= t1;
            n1 = t1 * t1 * (grad3[gi1][0] * x1 + grad3[gi1][1] * y1);
        }
        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) {
            const gi2 = this.permMod12[ii + 1 + this.perm[jj + 1]];
            t2 *= t2;
            n2 = t2 * t2 * (grad3[gi2][0] * x2 + grad3[gi2][1] * y2);
        }

        return 70 * (n0 + n1 + n2);
    }

    /**
     * Fractal Brownian Motion — stacks multiple noise octaves.
     * @param {number} x
     * @param {number} y
     * @param {number} octaves     Number of layers (default 4)
     * @param {number} lacunarity  Frequency multiplier per octave (default 2)
     * @param {number} gain        Amplitude multiplier per octave (default 0.5)
     */
    fbm(x, y, octaves = 4, lacunarity = 2, gain = 0.5) {
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            value += amplitude * this.noise2D(x * frequency, y * frequency);
            maxValue += amplitude;
            amplitude *= gain;
            frequency *= lacunarity;
        }

        return value / maxValue;  // normalise to [-1, 1]
    }
}

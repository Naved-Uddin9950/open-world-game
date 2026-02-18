// ============================================================
// math.js — Common math utilities
// ============================================================

/**
 * Clamp value between min and max.
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation from a to b by factor t ∈ [0,1].
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Smooth Hermite interpolation (same as GLSL smoothstep).
 */
export function smoothstep(edge0, edge1, x) {
    const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
}

/**
 * Re-map a value from one range to another.
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
    return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/**
 * Degrees to radians.
 */
export function degToRad(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Radians to degrees.
 */
export function radToDeg(radians) {
    return radians * (180 / Math.PI);
}

/**
 * Fast inverse square root approximation (for perf-critical paths).
 */
export function inverseLerp(a, b, value) {
    return (value - a) / (b - a);
}

/**
 * Damped interpolation — framerate-independent smoothing.
 * @param {number} current  Current value
 * @param {number} target   Target value
 * @param {number} lambda   Smoothing factor (higher = faster)
 * @param {number} dt       Delta time
 */
export function damp(current, target, lambda, dt) {
    return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

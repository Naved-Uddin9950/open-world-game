// ============================================================
// gameLoop.js — Fixed-timestep update + variable render loop
// ============================================================

export class GameLoop {
    /**
     * @param {object} options
     * @param {function(number)} options.onUpdate  Called with delta time (seconds)
     * @param {function()}       options.onRender  Called every frame after updates
     * @param {number}           [options.fixedStep=1/60]  Fixed timestep in seconds
     */
    constructor({ onUpdate, onRender, fixedStep = 1 / 60 }) {
        this._onUpdate = onUpdate;
        this._onRender = onRender;
        this._fixedStep = fixedStep;

        this._running = false;
        this._rafId = null;
        this._lastTime = 0;
        this._accumulator = 0;

        // Expose for performance monitor
        this.fps = 0;
        this.frameTime = 0;

        this._tick = this._tick.bind(this);
    }

    /** Start the game loop. */
    start() {
        if (this._running) return;
        this._running = true;
        this._lastTime = performance.now();
        this._rafId = requestAnimationFrame(this._tick);
    }

    /** Stop the game loop. */
    stop() {
        this._running = false;
        if (this._rafId !== null) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    /** Pause / resume toggle. */
    get paused() {
        return !this._running;
    }

    /** Internal frame callback. */
    _tick(now) {
        if (!this._running) return;
        this._rafId = requestAnimationFrame(this._tick);

        const rawDt = (now - this._lastTime) / 1000;
        this._lastTime = now;

        // Clamp to prevent spiral of death after tab switch
        const dt = Math.min(rawDt, 0.1);

        // FPS tracking
        this.frameTime = dt;
        this.fps = dt > 0 ? 1 / dt : 0;

        // ── Fixed-step updates ──────────────────────────────
        this._accumulator += dt;
        while (this._accumulator >= this._fixedStep) {
            this._onUpdate(this._fixedStep);
            this._accumulator -= this._fixedStep;
        }

        // ── Render ──────────────────────────────────────────
        this._onRender();
    }
}

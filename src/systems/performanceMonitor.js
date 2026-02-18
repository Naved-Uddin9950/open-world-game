// ============================================================
// performanceMonitor.js — FPS / frame-time tracker + adaptive quality
// ============================================================

export class PerformanceMonitor {
    /**
     * @param {object} [opts]
     * @param {number} [opts.sampleSize=60]      Frames to average over
     * @param {number} [opts.lowFPSThreshold=24]  FPS below which to suggest downgrade
     * @param {number} [opts.highFPSThreshold=55] FPS above which to suggest upgrade
     */
    constructor({
        sampleSize = 60,
        lowFPSThreshold = 24,
        highFPSThreshold = 55,
    } = {}) {
        this.sampleSize = sampleSize;
        this.lowFPSThreshold = lowFPSThreshold;
        this.highFPSThreshold = highFPSThreshold;

        this._frameTimes = [];
        this._lastTime = performance.now();

        // Stats (read-only externally)
        this.fps = 0;
        this.frameTime = 0;        // ms
        this.drawCalls = 0;
        this.triangles = 0;
        this.qualitySuggestion = null;   // 'upgrade' | 'downgrade' | null

        // HUD element (created lazily)
        this._hud = null;
        this._hudVisible = false;
    }

    /**
     * Call once per frame AFTER rendering.
     * @param {object} rendererInfo  renderer.info from EngineRenderer
     */
    update(rendererInfo) {
        const now = performance.now();
        const dt = now - this._lastTime;
        this._lastTime = now;

        this._frameTimes.push(dt);
        if (this._frameTimes.length > this.sampleSize) {
            this._frameTimes.shift();
        }

        // Average frame time
        const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
        this.frameTime = avg;
        this.fps = Math.round(1000 / avg);

        // Renderer stats
        if (rendererInfo && rendererInfo.render) {
            this.drawCalls = rendererInfo.render.calls;
            this.triangles = rendererInfo.render.triangles;
        }

        // Quality suggestion
        if (this._frameTimes.length >= this.sampleSize) {
            if (this.fps < this.lowFPSThreshold) {
                this.qualitySuggestion = 'downgrade';
            } else if (this.fps > this.highFPSThreshold) {
                this.qualitySuggestion = 'upgrade';
            } else {
                this.qualitySuggestion = null;
            }
        }

        // Update HUD if visible
        if (this._hudVisible && this._hud) {
            this._hud.textContent = `FPS: ${this.fps}  |  Draw: ${this.drawCalls}  |  Tris: ${this.triangles}`;
        }
    }

    /**
     * Toggle an on-screen HUD showing FPS and render stats.
     * @param {boolean} visible
     */
    showHUD(visible = true) {
        this._hudVisible = visible;

        if (visible && !this._hud) {
            this._hud = document.createElement('div');
            this._hud.id = 'perf-hud';
            Object.assign(this._hud.style, {
                position: 'fixed',
                top: '8px',
                left: '8px',
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.65)',
                color: '#0f0',
                fontFamily: 'monospace',
                fontSize: '13px',
                zIndex: '9999',
                borderRadius: '4px',
                pointerEvents: 'none',
            });
            document.body.appendChild(this._hud);
        }

        if (this._hud) {
            this._hud.style.display = visible ? 'block' : 'none';
        }
    }
}

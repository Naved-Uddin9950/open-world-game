// ============================================================
// performanceMonitor.js — FPS tracker + memory monitor
// ============================================================

export class PerformanceMonitor {
    constructor({ sampleSize = 60, targetFPS = 30 } = {}) {
        this.sampleSize = sampleSize;
        this.targetFPS = targetFPS;
        this._frameTimes = [];
        this._lastTime = performance.now();
        
        this.fps = 0;
        this.frameTime = 0;
        this.drawCalls = 0;
        this.triangles = 0;
        this.memory = 0;
        
        this._hud = null;
        this._hudVisible = false;
    }

    update(rendererInfo) {
        const now = performance.now();
        const dt = now - this._lastTime;
        this._lastTime = now;

        this._frameTimes.push(dt);
        if (this._frameTimes.length > this.sampleSize) this._frameTimes.shift();

        const avg = this._frameTimes.reduce((a, b) => a + b, 0) / this._frameTimes.length;
        this.frameTime = avg;
        this.fps = Math.round(1000 / avg);

        if (rendererInfo?.render) {
            this.drawCalls = rendererInfo.render.calls;
            this.triangles = rendererInfo.render.triangles;
        }

        if (performance.memory) {
            this.memory = Math.round(performance.memory.usedJSHeapSize / 1048576);
        }

        if (this._hudVisible && this._hud) {
            const color = this.fps >= this.targetFPS ? '#0f0' : this.fps >= this.targetFPS - 10 ? '#ff0' : '#f00';
            this._hud.style.color = color;
            this._hud.textContent = `FPS: ${this.fps} | Draw: ${this.drawCalls} | Tris: ${(this.triangles / 1000).toFixed(1)}K${this.memory ? ` | RAM: ${this.memory}MB` : ''}`;
        }
    }

    showHUD(visible = true) {
        this._hudVisible = visible;
        if (visible && !this._hud) {
            this._hud = document.createElement('div');
            Object.assign(this._hud.style, {
                position: 'fixed',
                top: '8px',
                left: '8px',
                padding: '6px 12px',
                background: 'rgba(0,0,0,0.75)',
                color: '#0f0',
                fontFamily: 'monospace',
                fontSize: '12px',
                zIndex: '9999',
                borderRadius: '3px',
                pointerEvents: 'none'
            });
            document.body.appendChild(this._hud);
        }
        if (this._hud) this._hud.style.display = visible ? 'block' : 'none';
    }
}
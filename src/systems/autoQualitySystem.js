// ============================================================
// autoQualitySystem.js — Dynamic quality adjustment
// ============================================================

export class AutoQualitySystem {
    constructor(renderer, perfMonitor) {
        this.renderer = renderer;
        this.perfMonitor = perfMonitor;
        
        this.currentQuality = 'MEDIUM';
        this.targetFPS = 30;
        this.checkInterval = 3000;
        this._lastCheck = Date.now();
        this._adjustmentCooldown = 0;
        
        this.settings = {
            LOW: { shadows: false, resolution: 0.7, renderDist: 2, vegDist: 40 },
            MEDIUM: { shadows: true, resolution: 0.85, renderDist: 3, vegDist: 60 },
            HIGH: { shadows: true, resolution: 1.0, renderDist: 4, vegDist: 80 }
        };
    }

    update(dt) {
        this._adjustmentCooldown -= dt;
        
        const now = Date.now();
        if (now - this._lastCheck < this.checkInterval) return;
        this._lastCheck = now;

        if (this._adjustmentCooldown > 0) return;

        const fps = this.perfMonitor.fps;
        
        if (fps < this.targetFPS - 5 && this.currentQuality !== 'LOW') {
            this._downgrade();
        } else if (fps > this.targetFPS + 15 && this.currentQuality !== 'HIGH') {
            this._upgrade();
        }
    }

    _downgrade() {
        if (this.currentQuality === 'MEDIUM') {
            this.currentQuality = 'LOW';
        } else if (this.currentQuality === 'HIGH') {
            this.currentQuality = 'MEDIUM';
        }
        this._apply();
        this._adjustmentCooldown = 10;
    }

    _upgrade() {
        if (this.currentQuality === 'LOW') {
            this.currentQuality = 'MEDIUM';
        } else if (this.currentQuality === 'MEDIUM') {
            this.currentQuality = 'HIGH';
        }
        this._apply();
        this._adjustmentCooldown = 10;
    }

    _apply() {
        const s = this.settings[this.currentQuality];
        this.renderer.setQuality(this.currentQuality);
        this.renderer.setResolutionScale(s.resolution);
    }

    getSettings() {
        return this.settings[this.currentQuality];
    }
}

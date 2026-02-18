// ============================================================
// timeSystem.js — Real-world GMT time sync
// ============================================================

export class TimeSystem {
    constructor() {
        this._lastUpdate = Date.now();
    }

    update() {
        this._lastUpdate = Date.now();
    }

    get hour() {
        const now = new Date();
        return now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    }

    get sunAltitude() {
        return Math.sin(((this.hour - 6) / 12) * Math.PI);
    }

    get isDay() {
        return this.hour >= 6 && this.hour < 18;
    }

    get formatted() {
        const h = Math.floor(this.hour);
        const m = Math.floor((this.hour - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} GMT`;
    }
}

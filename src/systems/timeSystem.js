// ============================================================
// timeSystem.js — In-game day/night cycle
// ============================================================
import { DAY_LENGTH_SECONDS, TIME_START_HOUR } from '../utils/constants.js';

export class TimeSystem {
    /**
     * @param {number} startHour  Hour to start (0–24, default from constants)
     * @param {number} dayLength  Real seconds per full day cycle
     */
    constructor(startHour = TIME_START_HOUR, dayLength = DAY_LENGTH_SECONDS) {
        this.dayLength = dayLength;
        this.timeScale = 1.0;

        // Internal time in hours (0–24)
        this._time = startHour;
    }

    /**
     * Advance time.
     * @param {number} dt  Delta time in seconds
     */
    update(dt) {
        const hoursPerSecond = 24 / this.dayLength;
        this._time += dt * hoursPerSecond * this.timeScale;
        if (this._time >= 24) this._time -= 24;
        if (this._time < 0) this._time += 24;
    }

    /** Current hour (0-24 float). */
    get hour() {
        return this._time;
    }

    /** Set time directly (0-24 float). */
    set hour(h) {
        this._time = ((h % 24) + 24) % 24;
    }

    /**
     * Normalized sun altitude (0 = horizon, 1 = zenith, <0 = below horizon).
     * Peaks at noon (12), zero at 6 and 18.
     */
    get sunAltitude() {
        return Math.sin(((this._time - 6) / 12) * Math.PI);
    }

    /** Whether it's daytime (sun above horizon). */
    get isDay() {
        return this._time >= 6 && this._time < 18;
    }

    /** Formatted time string HH:MM. */
    get formatted() {
        const h = Math.floor(this._time);
        const m = Math.floor((this._time - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
}

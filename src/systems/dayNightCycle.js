// ============================================================
// dayNightCycle.js — Coordinates all time-based systems
// ============================================================
import { TimeSystem } from './timeSystem.js';
import { SunSystem } from './sunSystem.js';
import { MoonSystem } from './moonSystem.js';
import { SkySystem } from './skySystem.js';

export class DayNightCycle {
    constructor(scene) {
        this.time = new TimeSystem();
        this.sun = new SunSystem(scene);
        this.moon = new MoonSystem(scene);
        this.sky = new SkySystem(scene);
    }

    update(playerPos) {
        this.time.update();
        this.sun.update(this.time, playerPos);
        this.moon.update(this.time, playerPos);
        this.sky.update(this.time);
        this.sky.followCamera(playerPos);
    }

    getTimeFormatted() {
        return this.time.formatted;
    }

    getSunAltitude() {
        return this.time.sunAltitude;
    }

    isDay() {
        return this.time.isDay;
    }
}

// ============================================================
// saveSystem.js — IndexedDB save/load system
// ============================================================

const DB_NAME = 'OpenWorldSaves';
const DB_VERSION = 1;
const STORE_NAME = 'saves';
const SAVE_KEY = 'autosave';

/**
 * Opens the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save system using IndexedDB.
 * Stores player position, health, stamina, and game state.
 * Save only happens when user explicitly clicks Save.
 */
export class SaveSystem {
  constructor() {
    this._db = null;
  }

  async _getDB() {
    if (!this._db) {
      this._db = await openDB();
    }
    return this._db;
  }

  /**
   * Check if a save exists.
   * @returns {Promise<boolean>}
   */
  async hasSave() {
    try {
      const db = await this._getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(SAVE_KEY);
        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Save game state.
   * @param {object} state
   * @returns {Promise<void>}
   */
  async save(state) {
    const db = await this._getDB();
    const data = {
      ...state,
      timestamp: Date.now(),
      version: 1,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(data, SAVE_KEY);
      request.onsuccess = () => {
        console.log('[SaveSystem] Game saved successfully');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load game state.
   * @returns {Promise<object|null>}
   */
  async load() {
    try {
      const db = await this._getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(SAVE_KEY);
        request.onsuccess = () => {
          const data = request.result;
          if (data) {
            console.log('[SaveSystem] Save loaded, timestamp:', new Date(data.timestamp).toLocaleString());
          }
          resolve(data || null);
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Delete the save (for new game after game over).
   * @returns {Promise<void>}
   */
  async deleteSave() {
    try {
      const db = await this._getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(SAVE_KEY);
        request.onsuccess = () => {
          console.log('[SaveSystem] Save deleted');
          resolve();
        };
        request.onerror = () => resolve();
      });
    } catch {
      // ignore
    }
  }

  /**
   * Gather current game state for saving.
   * @param {object} player  FirstPersonController
   * @param {object} dayNight  DayNightCycle
   * @returns {object}
   */
  static gatherState(player, dayNight) {
    const pos = player.getPosition();
    return {
      player: {
        x: pos.x,
        y: pos.y,
        z: pos.z,
        health: player.health,
        maxHealth: player.maxHealth,
        stamina: player.stamina,
        maxStamina: player.maxStamina,
      },
      time: dayNight ? dayNight.getTime?.() || 0 : 0,
      gameOver: false,
    };
  }

  /**
   * Apply loaded state to game objects.
   * @param {object} state
   * @param {object} player  FirstPersonController
   * @param {object} dayNight  DayNightCycle (optional)
   */
  static applyState(state, player, dayNight) {
    if (!state || !state.player) return;

    const p = state.player;
    player.player.position.set(p.x, p.y, p.z);
    player.health = p.health;
    player.maxHealth = p.maxHealth;
    player.stamina = p.stamina;
    player.maxStamina = p.maxStamina;
    player.isDead = false;

    if (dayNight && state.time && dayNight.setTime) {
      dayNight.setTime(state.time);
    }
  }
}

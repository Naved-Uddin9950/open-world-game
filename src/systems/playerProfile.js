// ============================================================
// playerProfile.js — Player profile data model & persistence
// ============================================================

const STORAGE_KEY = 'openworld_player_profile';

/**
 * Compute age from a Date-of-Birth string (YYYY-MM-DD).
 * @param {string} dob
 * @returns {number}
 */
function computeAge(dob) {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

/**
 * Create a blank profile.
 */
function createDefault(name = 'Player', dob = '2000-01-01', starterSkill = 'fireball') {
  return {
    name,
    dob,
    age: computeAge(dob),
    level: 1,
    exp: 0,
    expToNextLevel: 100,
    skillPoints: 1,           // start with 1 so they can buy their starter
    enhancementPoints: 0,
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    strength: 10,
    defence: 5,
    starterSkill,
    unlockedSkills: [starterSkill, 'super_speed'],
    equippedSkills: [starterSkill],  // up to 10 slots for keys 1-9,0
    skillLevels: {},          // { skillId: level }
    totalKills: 0,
    playTime: 0,
  };
}

export class PlayerProfile {
  constructor() {
    /** @type {ReturnType<typeof createDefault>} */
    this.data = createDefault();
    this._dirty = false;
    // Attempt to load persisted profile immediately so UIs see stored data
    try {
      this.load();
    } catch (e) {
      // swallow — load has its own guards, but protect constructor
    }
  }

  /** Age auto-calculated from dob. */
  get age() { return computeAge(this.data.dob); }

  // ── Persistence ─────────────────────────────────────────

  save() {
    this.data.age = this.age;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      console.debug('[PlayerProfile] saved to localStorage');
    } catch (e) {
      console.warn('[PlayerProfile] failed to save profile', e);
    }
    this._dirty = false;
  }

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.data = { ...createDefault(), ...parsed };
        this.data.age = this.age;
        // Migrate: ensure equippedSkills exists and is sane (max 10 slots)
        if (!Array.isArray(this.data.equippedSkills)) {
          this.data.equippedSkills = this.data.unlockedSkills
            .filter(id => id !== 'super_speed')
            .slice(0, 10);
        } else {
          this.data.equippedSkills = this.data.equippedSkills
            .slice(0, 10)
            .map(id => (typeof id === 'string' ? id : null));
        }

        // Remove invalid / locked / duplicate equipped entries while preserving slot order
        const seen = new Set();
        this.data.equippedSkills = this.data.equippedSkills.map((id) => {
          if (!id) return null;
          if (id === 'super_speed') return null;
          if (!this.data.unlockedSkills.includes(id)) return null;
          if (seen.has(id)) return null;
          seen.add(id);
          return id;
        });

        // Backfill at least one active skill if all slots are empty
        const hasAnyEquipped = this.data.equippedSkills.some(Boolean);
        if (!hasAnyEquipped) {
          const firstActive = this.data.unlockedSkills.find(id => id !== 'super_speed');
          if (firstActive) this.data.equippedSkills[0] = firstActive;
        }
        return true;
      } catch { /* corrupted */ }
    }
    // Nothing loaded
    console.debug('[PlayerProfile] no saved profile found');
    return false;
  }

  hasProfile() {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }

  deleteProfile() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = createDefault();
  }

  /** Create a fresh profile from New Game setup. */
  create(name, dob, starterSkill) {
    this.data = createDefault(name, dob, starterSkill);
    // Give the starter skill level 1
    this.data.skillLevels[starterSkill] = 1;
    this.data.skillLevels['super_speed'] = 1;
    this.save();
  }

  // ── EXP & Level ─────────────────────────────────────────

  /**
   * Add experience. Returns true if a level-up occurred.
   * @param {number} amount
   * @returns {boolean}
   */
  addExp(amount) {
    this.data.exp += amount;
    let leveledUp = false;
    while (this.data.exp >= this.data.expToNextLevel) {
      this.data.exp -= this.data.expToNextLevel;
      this.data.level++;
      this.data.skillPoints += 3;
      this.data.enhancementPoints += 3;
      // Formula: 100 * level^1.5
      this.data.expToNextLevel = Math.floor(100 * Math.pow(this.data.level, 1.5));
      leveledUp = true;
    }
    this.save();
    return leveledUp;
  }

  addSkillPoints(n) {
    this.data.skillPoints += n;
    this.save();
  }

  // ── Enhancement Points ──────────────────────────────────

  /**
   * Spend enhancement points to boost a stat.
   * @param {'health'|'stamina'|'strength'|'defence'} stat
   * @param {number} [amount=1]
   * @returns {boolean}
   */
  enhanceStat(stat, amount = 1) {
    if (this.data.enhancementPoints < amount) return false;
    this.data.enhancementPoints -= amount;
    switch (stat) {
      case 'health':
        this.data.maxHealth += 10 * amount;
        this.data.health += 10 * amount;
        break;
      case 'stamina':
        this.data.maxStamina += 10 * amount;
        this.data.stamina += 10 * amount;
        break;
      case 'strength':
        this.data.strength += 2 * amount;
        break;
      case 'defence':
        this.data.defence += 2 * amount;
        break;
    }
    this.save();
    return true;
  }

  // ── Skill Management ────────────────────────────────────

  hasSkill(id) {
    return this.data.unlockedSkills.includes(id);
  }

  unlockSkill(id, cost = 1) {
    if (this.data.skillPoints < cost) return false;
    if (this.hasSkill(id)) return false;
    this.data.skillPoints -= cost;
    this.data.unlockedSkills.push(id);
    this.data.skillLevels[id] = 1;
    // Auto-equip into first free slot (max 10 slots for keys 1-9, 0)
    if (!Array.isArray(this.data.equippedSkills)) this.data.equippedSkills = [];
    if (this.getEquippedSlot(id) === -1) {
      const freeIndex = this.data.equippedSkills.findIndex(slot => !slot);
      if (freeIndex !== -1) {
        this.data.equippedSkills[freeIndex] = id;
      } else if (this.data.equippedSkills.length < 10) {
        this.data.equippedSkills.push(id);
      }
    }
    this.save();
    return true;
  }

  upgradeSkill(id, cost = 1) {
    if (!this.hasSkill(id)) return false;
    if (this.data.skillPoints < cost) return false;
    this.data.skillPoints -= cost;
    this.data.skillLevels[id] = (this.data.skillLevels[id] || 1) + 1;
    this.save();
    return true;
  }

  getSkillLevel(id) {
    return this.data.skillLevels[id] || 0;
  }

  getEquippedSlot(id) {
    if (!Array.isArray(this.data.equippedSkills)) return -1;
    return this.data.equippedSkills.indexOf(id);
  }

  isEquipped(id) {
    return this.getEquippedSlot(id) !== -1;
  }

  equipSkill(id, preferredSlot = null) {
    if (!this.hasSkill(id)) return false;
    if (id === 'super_speed') return false;
    if (!Array.isArray(this.data.equippedSkills)) this.data.equippedSkills = [];

    // Already equipped
    if (this.isEquipped(id)) return true;

    // If a preferred slot is provided, use it
    if (Number.isInteger(preferredSlot) && preferredSlot >= 0 && preferredSlot < 10) {
      this.data.equippedSkills[preferredSlot] = id;
      this.save();
      return true;
    }

    // Otherwise use first free slot
    let free = this.data.equippedSkills.findIndex(slot => !slot);
    if (free === -1 && this.data.equippedSkills.length < 10) {
      free = this.data.equippedSkills.length;
    }
    if (free === -1) return false;

    this.data.equippedSkills[free] = id;
    this.save();
    return true;
  }

  unequipSkill(id) {
    const slot = this.getEquippedSlot(id);
    if (slot === -1) return false;
    this.data.equippedSkills[slot] = null;
    this.save();
    return true;
  }
}

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
  }

  /** Age auto-calculated from dob. */
  get age() { return computeAge(this.data.dob); }

  // ── Persistence ─────────────────────────────────────────

  save() {
    this.data.age = this.age;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this._dirty = false;
  }

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.data = { ...createDefault(), ...parsed };
        this.data.age = this.age;
        // Migrate: ensure equippedSkills exists
        if (!this.data.equippedSkills) {
          this.data.equippedSkills = this.data.unlockedSkills.filter(
            id => id !== 'super_speed'
          ).slice(0, 10);
        }
        return true;
      } catch { /* corrupted */ }
    }
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
    // Auto-equip if there's a free slot (max 10 slots for keys 1-9, 0)
    if (!this.data.equippedSkills) this.data.equippedSkills = [];
    if (this.data.equippedSkills.length < 10) {
      this.data.equippedSkills.push(id);
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
}

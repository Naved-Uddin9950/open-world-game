// ============================================================
// shopSystem.js — Buy / upgrade skills using skill points
// ============================================================
import { SKILLS, STARTER_SKILLS } from './skillSystem.js';

/**
 * ShopSystem — manages the shop inventory and purchasing logic.
 * The shop lists all skills that the player hasn't unlocked yet,
 * and allows upgrading unlocked skills (cost = current level).
 */
export class ShopSystem {
  constructor(profile) {
    /** @type {import('./playerProfile.js').PlayerProfile} */
    this.profile = profile;
  }

  /**
   * Get a list of skills available for purchase (not yet unlocked).
   * Sorted by tier then shopCost.
   * @returns {Array<{id:string, skill:object, cost:number}>}
   */
  getAvailableSkills() {
    const unlocked = new Set(this.profile.data.unlockedSkills);
    const items = [];
    for (const [id, skill] of Object.entries(SKILLS)) {
      if (unlocked.has(id)) continue;
      if (skill.passive) continue; // can't buy super_speed — it's default
      items.push({ id, skill, cost: skill.shopCost || 1 });
    }
    items.sort((a, b) => a.skill.tier - b.skill.tier || a.cost - b.cost);
    return items;
  }

  /**
   * Get unlocked skills that can be upgraded (level < maxLevel).
   * @returns {Array<{id:string, skill:object, currentLevel:number, cost:number, maxLevel:number}>}
   */
  getUpgradeableSkills() {
    const items = [];
    for (const id of this.profile.data.unlockedSkills) {
      const skill = SKILLS[id];
      if (!skill) continue;
      const lvl = this.profile.getSkillLevel(id);
      if (lvl >= skill.maxLevel) continue;
      items.push({
        id,
        skill,
        currentLevel: lvl,
        cost: lvl,  // upgrade costs current level in skill points
        maxLevel: skill.maxLevel,
      });
    }
    return items;
  }

  /**
   * Attempt to buy (unlock) a skill.
   * @param {string} id
   * @returns {{success:boolean, reason?:string}}
   */
  buySkill(id) {
    const skill = SKILLS[id];
    if (!skill) return { success: false, reason: 'Unknown skill' };
    if (this.profile.hasSkill(id)) return { success: false, reason: 'Already owned' };
    const cost = skill.shopCost || 1;
    if (this.profile.data.skillPoints < cost) {
      return { success: false, reason: `Need ${cost} SP (have ${this.profile.data.skillPoints})` };
    }
    this.profile.unlockSkill(id, cost);
    return { success: true };
  }

  /**
   * Attempt to upgrade a skill.
   * @param {string} id
   * @returns {{success:boolean, reason?:string}}
   */
  upgradeSkill(id) {
    const skill = SKILLS[id];
    if (!skill) return { success: false, reason: 'Unknown skill' };
    if (!this.profile.hasSkill(id)) return { success: false, reason: 'Not owned' };
    const lvl = this.profile.getSkillLevel(id);
    if (lvl >= skill.maxLevel) return { success: false, reason: 'Max level reached' };
    const cost = lvl; // upgrade cost = current level
    if (this.profile.data.skillPoints < cost) {
      return { success: false, reason: `Need ${cost} SP (have ${this.profile.data.skillPoints})` };
    }
    this.profile.upgradeSkill(id, cost);
    return { success: true };
  }
}

// ============================================================
// questManager.js — Quest system (main story, side, guild)
// ============================================================

/**
 * Quest states.
 */
export const QUEST_STATUS = {
  AVAILABLE: 'available',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

/**
 * Quest types.
 */
export const QUEST_TYPE = {
  MAIN: 'main',
  SIDE: 'side',
  GUILD: 'guild',
};

/**
 * @typedef {object} QuestObjective
 * @property {string} type   - kill | collect | escort | explore | talk
 * @property {string} target - creature/item/zone id
 * @property {number} required
 * @property {number} current
 */

/**
 * @typedef {object} Quest
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} type       - main | side | guild
 * @property {string} status     - available | active | completed | failed
 * @property {number} level      - Recommended level
 * @property {QuestObjective[]} objectives
 * @property {object} rewards    - { exp, gold, items[], gp }
 * @property {string|null} prerequisite - Quest ID that must be completed first
 * @property {string|null} zone  - Zone where quest is available
 */

/**
 * Main story quest chain.
 */
export const MAIN_QUESTS = [
  {
    id: 'mq_01_awakening',
    title: 'The Awakening',
    description: 'You wake up in Rookie Town with no memory. Talk to the guild master to learn about this world.',
    type: QUEST_TYPE.MAIN,
    level: 1,
    objectives: [
      { type: 'explore', target: 'rookieTown', required: 1, current: 0 },
    ],
    rewards: { exp: 50, gold: 50, items: [], gp: 10 },
    prerequisite: null,
    zone: 'rookieTown',
  },
  {
    id: 'mq_02_first_hunt',
    title: 'First Hunt',
    description: 'Prove your worth by defeating 5 slimes near the village.',
    type: QUEST_TYPE.MAIN,
    level: 2,
    objectives: [
      { type: 'kill', target: 'slime', required: 5, current: 0 },
    ],
    rewards: { exp: 100, gold: 80, items: ['ironSword'], gp: 20 },
    prerequisite: 'mq_01_awakening',
    zone: 'rookieTown',
  },
  {
    id: 'mq_03_goblin_threat',
    title: 'The Goblin Threat',
    description: 'Goblins have been raiding caravans. Venture into the Goblin Forest and eliminate 10 goblins.',
    type: QUEST_TYPE.MAIN,
    level: 8,
    objectives: [
      { type: 'kill', target: 'goblin', required: 10, current: 0 },
      { type: 'kill', target: 'goblinArcher', required: 3, current: 0 },
    ],
    rewards: { exp: 300, gold: 250, items: ['chainMail'], gp: 50 },
    prerequisite: 'mq_02_first_hunt',
    zone: 'goblinForest',
  },
  {
    id: 'mq_04_forest_guardian',
    title: 'The Forest Guardian',
    description: 'A massive forest golem blocks the path. Defeat it to continue deeper.',
    type: QUEST_TYPE.MAIN,
    level: 15,
    objectives: [
      { type: 'kill', target: 'forestGolem', required: 1, current: 0 },
    ],
    rewards: { exp: 500, gold: 400, items: ['natureShard', 'healthPotionMedium'], gp: 80 },
    prerequisite: 'mq_03_goblin_threat',
    zone: 'goblinForest',
  },
  {
    id: 'mq_05_valley_of_fire',
    title: 'Valley of Fire',
    description: 'Cross into Dragon Valley and survive the scorched lands. Defeat 5 orcs and 3 wyverns.',
    type: QUEST_TYPE.MAIN,
    level: 25,
    objectives: [
      { type: 'kill', target: 'orc', required: 5, current: 0 },
      { type: 'kill', target: 'wyvern', required: 3, current: 0 },
    ],
    rewards: { exp: 1000, gold: 800, items: ['knightSword', 'fireEssence'], gp: 150 },
    prerequisite: 'mq_04_forest_guardian',
    zone: 'dragonValley',
  },
  {
    id: 'mq_06_frozen_passage',
    title: 'The Frozen Passage',
    description: 'Navigate the Frozen North and defeat the ice dragon.',
    type: QUEST_TYPE.MAIN,
    level: 45,
    objectives: [
      { type: 'kill', target: 'iceGolem', required: 5, current: 0 },
      { type: 'kill', target: 'iceDragon', required: 1, current: 0 },
    ],
    rewards: { exp: 3000, gold: 2500, items: ['dragonHeart', 'frostCrystal'], gp: 500 },
    prerequisite: 'mq_05_valley_of_fire',
    zone: 'frozenNorth',
  },
  {
    id: 'mq_07_demon_lord',
    title: 'The Demon Lord',
    description: 'Enter the Desert Empire and defeat the Demon General to save the kingdom.',
    type: QUEST_TYPE.MAIN,
    level: 60,
    objectives: [
      { type: 'kill', target: 'demonGeneral', required: 1, current: 0 },
    ],
    rewards: { exp: 5000, gold: 5000, items: ['demonArmor', 'legendaryGem'], gp: 1000 },
    prerequisite: 'mq_06_frozen_passage',
    zone: 'desertEmpire',
  },
  {
    id: 'mq_08_ancient_dragon',
    title: 'The Ancient Dragon',
    description: 'The ultimate challenge. Defeat the Ancient Dragon and become a legend.',
    type: QUEST_TYPE.MAIN,
    level: 75,
    objectives: [
      { type: 'kill', target: 'ancientDragon', required: 1, current: 0 },
    ],
    rewards: { exp: 10000, gold: 15000, items: ['sunStone', 'legendaryGem', 'ancientRune'], gp: 5000 },
    prerequisite: 'mq_07_demon_lord',
    zone: 'desertEmpire',
  },
];

/**
 * Side quest templates (can be instantiated per zone).
 */
export const SIDE_QUESTS = [
  {
    id: 'sq_slime_samples',
    title: 'Slime Samples',
    description: 'Collect 10 slime gel for the alchemist.',
    type: QUEST_TYPE.SIDE,
    level: 2,
    objectives: [{ type: 'collect', target: 'slimeGel', required: 10, current: 0 }],
    rewards: { exp: 60, gold: 40, items: ['healthPotionSmall', 'healthPotionSmall'], gp: 5 },
    prerequisite: null,
    zone: 'rookieTown',
  },
  {
    id: 'sq_wolf_pelts',
    title: 'Wolf Pelt Collection',
    description: 'Gather 5 wolf pelts for the tanner.',
    type: QUEST_TYPE.SIDE,
    level: 12,
    objectives: [{ type: 'collect', target: 'wolfPelt', required: 5, current: 0 }],
    rewards: { exp: 150, gold: 120, items: ['leatherArmor'], gp: 15 },
    prerequisite: null,
    zone: 'goblinForest',
  },
  {
    id: 'sq_dragon_scales',
    title: 'Dragon Scale Armor',
    description: 'Bring 3 dragon scales to the blacksmith.',
    type: QUEST_TYPE.SIDE,
    level: 35,
    objectives: [{ type: 'collect', target: 'dragonScale', required: 3, current: 0 }],
    rewards: { exp: 800, gold: 600, items: ['plateArmor'], gp: 60 },
    prerequisite: null,
    zone: 'dragonValley',
  },
  {
    id: 'sq_frost_crystals',
    title: 'Frost Crystal Research',
    description: 'Collect 5 frost crystals for the mage.',
    type: QUEST_TYPE.SIDE,
    level: 30,
    objectives: [{ type: 'collect', target: 'frostCrystal', required: 5, current: 0 }],
    rewards: { exp: 500, gold: 400, items: ['staminaPotionMedium', 'staminaPotionMedium'], gp: 40 },
    prerequisite: null,
    zone: 'frozenNorth',
  },
];

// ════════════════════════════════════════════════════════════
// QuestManager class
// ════════════════════════════════════════════════════════════

export class QuestManager {
  constructor() {
    /** @type {Quest[]} */
    this.activeQuests = [];
    /** @type {Quest[]} */
    this.completedQuests = [];
    /** @type {Quest[]} */
    this.failedQuests = [];
    /** @type {Set<string>} */
    this._completedIds = new Set();

    this._onQuestComplete = null;
    this._onQuestUpdate = null;
  }

  setQuestCompleteCallback(cb) { this._onQuestComplete = cb; }
  setQuestUpdateCallback(cb) { this._onQuestUpdate = cb; }

  // ── Quest availability ──────────────────────────────────

  /**
   * Get all quests available to the player.
   */
  getAvailableQuests(playerLevel) {
    const available = [];

    // Main quests
    for (const q of MAIN_QUESTS) {
      if (this._completedIds.has(q.id)) continue;
      if (this.activeQuests.find(aq => aq.id === q.id)) continue;
      if (q.prerequisite && !this._completedIds.has(q.prerequisite)) continue;
      if (playerLevel >= q.level - 2) { // available slightly early
        available.push({ ...q, objectives: q.objectives.map(o => ({ ...o, current: 0 })) });
      }
    }

    // Side quests
    for (const q of SIDE_QUESTS) {
      if (this._completedIds.has(q.id)) continue;
      if (this.activeQuests.find(aq => aq.id === q.id)) continue;
      if (q.prerequisite && !this._completedIds.has(q.prerequisite)) continue;
      if (playerLevel >= q.level - 2) {
        available.push({ ...q, objectives: q.objectives.map(o => ({ ...o, current: 0 })) });
      }
    }

    return available;
  }

  /**
   * Accept a quest (move to active).
   */
  acceptQuest(questId) {
    const allQuests = [...MAIN_QUESTS, ...SIDE_QUESTS];
    const def = allQuests.find(q => q.id === questId);
    if (!def) return false;
    if (this.activeQuests.find(q => q.id === questId)) return false;
    if (this._completedIds.has(questId)) return false;

    const quest = {
      ...def,
      status: QUEST_STATUS.ACTIVE,
      objectives: def.objectives.map(o => ({ ...o, current: 0 })),
      acceptedAt: Date.now(),
    };
    this.activeQuests.push(quest);
    return true;
  }

  // ── Progress reporting ──────────────────────────────────

  /**
   * Report a kill event.
   */
  reportKill(creatureType, count = 1) {
    return this._reportObjective('kill', creatureType, count);
  }

  /**
   * Report item collection.
   */
  reportCollect(itemId, count = 1) {
    return this._reportObjective('collect', itemId, count);
  }

  /**
   * Report zone exploration.
   */
  reportExplore(zoneId) {
    return this._reportObjective('explore', zoneId, 1);
  }

  _reportObjective(type, target, count) {
    const completed = [];

    for (const quest of this.activeQuests) {
      let updated = false;
      for (const obj of quest.objectives) {
        if (obj.type === type && obj.target === target && obj.current < obj.required) {
          obj.current = Math.min(obj.required, obj.current + count);
          updated = true;
        }
      }

      if (updated && this._onQuestUpdate) {
        this._onQuestUpdate(quest);
      }

      // Check if all objectives complete
      const allDone = quest.objectives.every(o => o.current >= o.required);
      if (allDone) {
        quest.status = QUEST_STATUS.COMPLETED;
        quest.completedAt = Date.now();
        completed.push(quest);
      }
    }

    // Move completed
    for (const q of completed) {
      const idx = this.activeQuests.indexOf(q);
      if (idx >= 0) this.activeQuests.splice(idx, 1);
      this.completedQuests.push(q);
      this._completedIds.add(q.id);
      if (this._onQuestComplete) this._onQuestComplete(q);
    }

    return completed;
  }

  /**
   * Abandon a quest.
   */
  abandonQuest(questId) {
    const idx = this.activeQuests.findIndex(q => q.id === questId);
    if (idx < 0) return false;
    const quest = this.activeQuests.splice(idx, 1)[0];
    quest.status = QUEST_STATUS.FAILED;
    quest.failedAt = Date.now();
    this.failedQuests.push(quest);
    return true;
  }

  // ── Queries ─────────────────────────────────────────────

  getActiveByType(type) {
    return this.activeQuests.filter(q => q.type === type);
  }

  getActiveMainQuests() {
    return this.getActiveByType(QUEST_TYPE.MAIN);
  }

  getActiveSideQuests() {
    return this.getActiveByType(QUEST_TYPE.SIDE);
  }

  getActiveGuildQuests() {
    return this.getActiveByType(QUEST_TYPE.GUILD);
  }

  isQuestCompleted(questId) {
    return this._completedIds.has(questId);
  }

  /**
   * Get quest log summary for UI.
   */
  getQuestLog() {
    return {
      active: this.activeQuests.map(q => ({
        id: q.id,
        title: q.title,
        type: q.type,
        objectives: q.objectives.map(o => ({
          desc: `${o.type}: ${o.target}`,
          progress: `${o.current}/${o.required}`,
          done: o.current >= o.required,
        })),
      })),
      completed: this.completedQuests.slice(-20).map(q => ({
        id: q.id,
        title: q.title,
        type: q.type,
      })),
      failed: this.failedQuests.slice(-10).map(q => ({
        id: q.id,
        title: q.title,
        type: q.type,
      })),
    };
  }

  // ── Serialization ─────────────────────────────────────────

  serialize() {
    return {
      activeQuests: this.activeQuests,
      completedQuests: this.completedQuests.slice(-50),
      failedQuests: this.failedQuests.slice(-20),
      completedIds: Array.from(this._completedIds),
    };
  }

  deserialize(data) {
    if (!data) return;
    this.activeQuests = data.activeQuests || [];
    this.completedQuests = data.completedQuests || [];
    this.failedQuests = data.failedQuests || [];
    this._completedIds = new Set(data.completedIds || []);
  }

  dispose() {
    this.activeQuests = [];
    this.completedQuests = [];
    this.failedQuests = [];
    this._completedIds.clear();
  }
}

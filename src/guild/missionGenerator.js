// ============================================================
// missionGenerator.js — Procedural guild mission generation
// ============================================================
import { RANKS, RANK_ORDER, getRankForGP } from './rankProgression.js';
import { CREATURES } from '../entities/creatures/creatureDatabase.js';
import { ZONES } from '../world/worldConfig.js';

/**
 * Mission tier templates.
 */
const MISSION_TEMPLATES = {
  gathering: [
    { title: 'Herb Collection', desc: 'Gather {count} herbs from the meadows.', target: 'herb', count: [5, 15], gpReward: [10, 30], goldReward: [20, 60] },
    { title: 'Wood Harvest', desc: 'Chop {count} logs for the guild.', target: 'wood', count: [8, 20], gpReward: [12, 35], goldReward: [30, 80] },
    { title: 'Stone Mining', desc: 'Mine {count} stone blocks.', target: 'stone', count: [5, 12], gpReward: [15, 40], goldReward: [25, 70] },
    { title: 'Mushroom Foraging', desc: 'Find {count} mushrooms in the forest.', target: 'mushroom', count: [3, 10], gpReward: [8, 25], goldReward: [15, 50] },
  ],
  weakHunt: [
    { title: 'Slime Extermination', desc: 'Defeat {count} slimes.', target: 'slime', count: [5, 15], gpReward: [20, 60], goldReward: [40, 120] },
    { title: 'Goblin Raid', desc: 'Eliminate {count} goblins.', target: 'goblin', count: [3, 10], gpReward: [30, 80], goldReward: [60, 180] },
    { title: 'Wolf Hunt', desc: 'Hunt {count} dire wolves.', target: 'direWolf', count: [2, 6], gpReward: [40, 100], goldReward: [80, 200] },
  ],
  strongHunt: [
    { title: 'Orc Elimination', desc: 'Defeat {count} orc berserkers.', target: 'orc', count: [3, 8], gpReward: [80, 200], goldReward: [200, 500] },
    { title: 'Undead Purge', desc: 'Destroy {count} undead knights.', target: 'undeadKnight', count: [2, 6], gpReward: [100, 250], goldReward: [250, 600] },
    { title: 'Golem Destruction', desc: 'Shatter {count} forest golems.', target: 'forestGolem', count: [2, 5], gpReward: [90, 220], goldReward: [220, 550] },
  ],
  escort: [
    { title: 'Merchant Escort', desc: 'Escort a merchant safely through {zone}.', target: 'escort', count: [1, 1], gpReward: [150, 350], goldReward: [400, 900], zone: 'goblinForest' },
    { title: 'Village Defense', desc: 'Protect the village for {count} waves.', target: 'waves', count: [3, 5], gpReward: [200, 400], goldReward: [500, 1000] },
  ],
  dungeon: [
    { title: 'Frost Cavern Raid', desc: 'Clear the frost cavern of {count} ice golems.', target: 'iceGolem', count: [3, 6], gpReward: [300, 600], goldReward: [800, 1500] },
    { title: 'Volcanic Depths', desc: 'Defeat {count} fire drakes in the volcano.', target: 'fireDrake', count: [2, 5], gpReward: [350, 700], goldReward: [900, 1800] },
  ],
  dragonSlaying: [
    { title: 'Wyvern Hunt', desc: 'Slay {count} wyverns.', target: 'wyvern', count: [1, 3], gpReward: [500, 1000], goldReward: [1500, 3000] },
    { title: 'Ice Dragon Subjugation', desc: 'Defeat the ice dragon.', target: 'iceDragon', count: [1, 1], gpReward: [800, 1500], goldReward: [3000, 5000] },
  ],
  demonAssassination: [
    { title: 'Demon General Assassination', desc: 'Assassinate a demon general.', target: 'demonGeneral', count: [1, 1], gpReward: [1500, 3000], goldReward: [5000, 10000] },
  ],
  kingdomDefense: [
    { title: 'Ancient Dragon Siege', desc: 'Repel the ancient dragon from the kingdom.', target: 'ancientDragon', count: [1, 1], gpReward: [5000, 10000], goldReward: [15000, 30000] },
    { title: 'Demon Invasion', desc: 'Defeat {count} demon generals in the invasion.', target: 'demonGeneral', count: [2, 3], gpReward: [4000, 8000], goldReward: [12000, 25000] },
  ],
};

let _missionIdCounter = 1;

/**
 * Generate a random mission for a given guild rank.
 * @param {string} rankId - Current player rank
 * @param {function} [rng] - Optional RNG function, defaults to Math.random
 * @returns {object} Mission object
 */
export function generateMission(rankId, rng = Math.random) {
  const rank = RANKS[rankId] || RANKS.F;
  const tiers = rank.missionTiers;
  const tier = tiers[Math.floor(rng() * tiers.length)];
  const templates = MISSION_TEMPLATES[tier];
  if (!templates || templates.length === 0) return null;

  const template = templates[Math.floor(rng() * templates.length)];
  const count = template.count[0] + Math.floor(rng() * (template.count[1] - template.count[0] + 1));
  const gpReward = template.gpReward[0] + Math.floor(rng() * (template.gpReward[1] - template.gpReward[0] + 1));
  const goldReward = template.goldReward[0] + Math.floor(rng() * (template.goldReward[1] - template.goldReward[0] + 1));

  return {
    id: `mission_${_missionIdCounter++}`,
    title: template.title,
    description: template.desc.replace('{count}', count).replace('{zone}', template.zone || ''),
    tier,
    target: template.target,
    requiredCount: count,
    currentCount: 0,
    gpReward,
    goldReward,
    rankId,
    status: 'available', // available | active | completed | failed
    timeLimit: 0, // 0 = no limit
    createdAt: Date.now(),
  };
}

/**
 * Generate a batch of available missions.
 */
export function generateMissionBoard(rankId, count = 5, rng = Math.random) {
  const missions = [];
  for (let i = 0; i < count; i++) {
    const m = generateMission(rankId, rng);
    if (m) missions.push(m);
  }
  return missions;
}

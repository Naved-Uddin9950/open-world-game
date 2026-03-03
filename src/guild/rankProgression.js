// ============================================================
// rankProgression.js — Guild rank definitions F → SSS
// ============================================================

export const RANKS = {
  F:   { id: 'F',   name: 'F-Rank',   color: '#888888', minGP: 0,      missionTiers: ['gathering'] },
  E:   { id: 'E',   name: 'E-Rank',   color: '#aa9966', minGP: 100,    missionTiers: ['gathering'] },
  D:   { id: 'D',   name: 'D-Rank',   color: '#66aa66', minGP: 500,    missionTiers: ['gathering', 'weakHunt'] },
  C:   { id: 'C',   name: 'C-Rank',   color: '#4488cc', minGP: 1500,   missionTiers: ['gathering', 'weakHunt'] },
  B:   { id: 'B',   name: 'B-Rank',   color: '#6644cc', minGP: 4000,   missionTiers: ['gathering', 'weakHunt', 'strongHunt', 'escort'] },
  A:   { id: 'A',   name: 'A-Rank',   color: '#cc44aa', minGP: 10000,  missionTiers: ['weakHunt', 'strongHunt', 'escort', 'dungeon'] },
  S:   { id: 'S',   name: 'S-Rank',   color: '#ffaa00', minGP: 25000,  missionTiers: ['strongHunt', 'escort', 'dungeon', 'dragonSlaying'] },
  SS:  { id: 'SS',  name: 'SS-Rank',  color: '#ff6600', minGP: 60000,  missionTiers: ['dungeon', 'dragonSlaying', 'demonAssassination'] },
  SSS: { id: 'SSS', name: 'SSS-Rank', color: '#ff2222', minGP: 150000, missionTiers: ['dragonSlaying', 'demonAssassination', 'kingdomDefense'] },
};

export const RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

/**
 * Get rank for a given guild point total.
 */
export function getRankForGP(gp) {
  let rank = RANKS.F;
  for (const id of RANK_ORDER) {
    if (gp >= RANKS[id].minGP) rank = RANKS[id];
  }
  return rank;
}

/**
 * Get next rank above current.
 */
export function getNextRank(currentRankId) {
  const idx = RANK_ORDER.indexOf(currentRankId);
  if (idx < 0 || idx >= RANK_ORDER.length - 1) return null;
  return RANKS[RANK_ORDER[idx + 1]];
}

/**
 * GP needed for next rank.
 */
export function gpToNextRank(currentGP) {
  const current = getRankForGP(currentGP);
  const next = getNextRank(current.id);
  if (!next) return 0;
  return next.minGP - currentGP;
}

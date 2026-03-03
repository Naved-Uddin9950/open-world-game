// ============================================================
// guildSystem.js — Full guild & rank management
// ============================================================
import { RANKS, RANK_ORDER, getRankForGP, getNextRank, gpToNextRank } from './rankProgression.js';
import { generateMission, generateMissionBoard } from './missionGenerator.js';

export class GuildSystem {
  constructor() {
    this.guildPoints = 0;
    this.reputation = 0;
    this.rankId = 'F';

    /** @type {object[]} Active missions */
    this.activeMissions = [];
    /** @type {object[]} Completed missions */
    this.completedMissions = [];
    /** @type {object[]} Failed missions */
    this.failedMissions = [];
    /** @type {object[]} Available missions on the board */
    this.missionBoard = [];

    this._rankHistory = [{ rank: 'F', timestamp: Date.now() }];
    this._onRankUp = null;
    this._onMissionComplete = null;
  }

  setRankUpCallback(cb) { this._onRankUp = cb; }
  setMissionCompleteCallback(cb) { this._onMissionComplete = cb; }

  // ── Rank management ─────────────────────────────────────

  get rank() { return RANKS[this.rankId]; }
  get rankName() { return this.rank.name; }
  get rankColor() { return this.rank.color; }

  /**
   * Add guild points. May trigger rank-up.
   * @returns {{ ranked: boolean, newRank: string|null }}
   */
  addGP(amount) {
    this.guildPoints += amount;
    const newRank = getRankForGP(this.guildPoints);
    const ranked = newRank.id !== this.rankId;

    if (ranked) {
      const oldRank = this.rankId;
      this.rankId = newRank.id;
      this._rankHistory.push({ rank: newRank.id, timestamp: Date.now() });
      if (this._onRankUp) this._onRankUp(oldRank, newRank.id);
    }

    return { ranked, newRank: ranked ? newRank.id : null };
  }

  addReputation(amount) {
    this.reputation += amount;
  }

  getProgressToNextRank() {
    const next = getNextRank(this.rankId);
    if (!next) return { current: this.guildPoints, needed: 0, percent: 1 };
    const currentMin = RANKS[this.rankId].minGP;
    const range = next.minGP - currentMin;
    const progress = this.guildPoints - currentMin;
    return {
      current: this.guildPoints,
      needed: next.minGP,
      percent: Math.min(1, progress / Math.max(1, range)),
    };
  }

  // ── Mission management ──────────────────────────────────

  /**
   * Refresh the mission board with new missions.
   */
  refreshMissionBoard(count = 5) {
    this.missionBoard = generateMissionBoard(this.rankId, count);
  }

  /**
   * Accept a mission from the board.
   */
  acceptMission(missionId) {
    const idx = this.missionBoard.findIndex(m => m.id === missionId);
    if (idx < 0) return false;
    if (this.activeMissions.length >= 5) return false; // max active missions

    const mission = this.missionBoard.splice(idx, 1)[0];
    mission.status = 'active';
    mission.acceptedAt = Date.now();
    this.activeMissions.push(mission);
    return true;
  }

  /**
   * Report progress on active missions.
   * Call when player kills a creature, gathers a resource, etc.
   * @param {string} target - creature/resource type that was killed/gathered
   * @param {number} [count=1]
   */
  reportProgress(target, count = 1) {
    const completed = [];

    for (const mission of this.activeMissions) {
      if (mission.target === target && mission.status === 'active') {
        mission.currentCount = Math.min(
          mission.requiredCount,
          mission.currentCount + count
        );

        if (mission.currentCount >= mission.requiredCount) {
          mission.status = 'completed';
          mission.completedAt = Date.now();
          completed.push(mission);
        }
      }
    }

    // Move completed missions
    for (const m of completed) {
      const idx = this.activeMissions.indexOf(m);
      if (idx >= 0) this.activeMissions.splice(idx, 1);
      this.completedMissions.push(m);

      // Award rewards
      this.addGP(m.gpReward);
      this.addReputation(m.gpReward / 10);

      if (this._onMissionComplete) {
        this._onMissionComplete(m);
      }
    }

    return completed;
  }

  /**
   * Abandon an active mission (mark as failed).
   */
  abandonMission(missionId) {
    const idx = this.activeMissions.findIndex(m => m.id === missionId);
    if (idx < 0) return false;

    const mission = this.activeMissions.splice(idx, 1)[0];
    mission.status = 'failed';
    mission.failedAt = Date.now();
    this.failedMissions.push(mission);

    // Penalty: lose some GP
    this.guildPoints = Math.max(0, this.guildPoints - Math.floor(mission.gpReward * 0.2));
    return true;
  }

  /**
   * Get mission stats.
   */
  getStats() {
    return {
      rank: this.rankId,
      rankName: this.rankName,
      rankColor: this.rankColor,
      gp: this.guildPoints,
      reputation: this.reputation,
      activeMissions: this.activeMissions.length,
      completedMissions: this.completedMissions.length,
      failedMissions: this.failedMissions.length,
      progressToNext: this.getProgressToNextRank(),
    };
  }

  // ── Serialization ─────────────────────────────────────────

  serialize() {
    return {
      guildPoints: this.guildPoints,
      reputation: this.reputation,
      rankId: this.rankId,
      activeMissions: this.activeMissions,
      completedMissions: this.completedMissions.slice(-50), // keep last 50
      failedMissions: this.failedMissions.slice(-20),
      missionBoard: this.missionBoard,
      rankHistory: this._rankHistory,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.guildPoints = data.guildPoints || 0;
    this.reputation = data.reputation || 0;
    this.rankId = data.rankId || 'F';
    this.activeMissions = data.activeMissions || [];
    this.completedMissions = data.completedMissions || [];
    this.failedMissions = data.failedMissions || [];
    this.missionBoard = data.missionBoard || [];
    this._rankHistory = data.rankHistory || [{ rank: 'F', timestamp: Date.now() }];
  }

  dispose() {
    this.activeMissions = [];
    this.completedMissions = [];
    this.failedMissions = [];
    this.missionBoard = [];
  }
}

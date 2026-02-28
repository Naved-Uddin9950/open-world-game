// ============================================================
// gameHUD.js — Enhanced in-game HUD with EXP bar, level,
//              skill slots, and notification toasts
// ============================================================
import { SKILLS } from '../systems/skillSystem.js';

/**
 * GameHUD — replaces the basic health/stamina HUD from the controller
 * with a richer display including EXP bar, level badge, and skill slots.
 */
export class GameHUD {
  constructor() {
    this._el = null;
    this._created = false;
    this._profile = null;
    this._skillSystem = null;
    this._toastQueue = [];
    this._activeToast = null;
  }

  setProfile(profile) { this._profile = profile; }
  setSkillSystem(ss) { this._skillSystem = ss; }

  create() {
    if (this._created) return;
    this._created = true;

    // ── Container (bottom-center) ───────────────────────
    const el = document.createElement('div');
    el.id = 'game-hud';
    el.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;z-index:1100;
      pointer-events:none;font-family:'Segoe UI',system-ui,sans-serif;
    `;

    // ── Top-left: Level badge ───────────────────────────
    this._levelBadge = document.createElement('div');
    this._levelBadge.style.cssText = `
      position:fixed;top:12px;left:12px;
      background:rgba(0,0,0,0.6);border:1px solid rgba(100,200,100,0.3);
      padding:4px 12px;font-size:0.85rem;color:#aaddaa;
      font-family:monospace;letter-spacing:0.05em;
    `;
    this._levelBadge.textContent = 'Lv. 1';
    el.appendChild(this._levelBadge);

    // ── Bottom center bar group ─────────────────────────
    const barGroup = document.createElement('div');
    barGroup.style.cssText = `
      position:fixed;bottom:14px;left:50%;transform:translateX(-50%);
      display:flex;flex-direction:column;align-items:center;gap:3px;
      width:280px;
    `;

    // Health bar
    this._hpBar = this._bar('hp', '#22cc22', 14);
    barGroup.appendChild(this._hpBar.container);

    // Stamina bar
    this._stBar = this._bar('st', '#ffcc00', 8);
    barGroup.appendChild(this._stBar.container);

    // EXP bar
    this._expBar = this._bar('exp', '#6688ff', 6);
    barGroup.appendChild(this._expBar.container);

    // Labels row
    const labels = document.createElement('div');
    labels.style.cssText = 'display:flex;justify-content:space-between;width:100%;';
    this._hpLabel = this._lbl('HP: 100%');
    this._stLabel = this._lbl('ST: 100%');
    this._expLabel = this._lbl('EXP: 0/100');
    labels.appendChild(this._hpLabel);
    labels.appendChild(this._stLabel);
    labels.appendChild(this._expLabel);
    barGroup.appendChild(labels);

    el.appendChild(barGroup);

    // ── Skill bar (bottom, below bars) ──────────────────
    this._skillBar = document.createElement('div');
    this._skillBar.style.cssText = `
      position:fixed;bottom:82px;left:50%;transform:translateX(-50%);
      display:flex;gap:4px;pointer-events:none;
    `;
    el.appendChild(this._skillBar);

    // ── Notifications ───────────────────────────────────
    this._toastContainer = document.createElement('div');
    this._toastContainer.style.cssText = `
      position:fixed;top:60px;left:50%;transform:translateX(-50%);
      display:flex;flex-direction:column;align-items:center;gap:4px;
      pointer-events:none;
    `;
    el.appendChild(this._toastContainer);

    // ── Shield indicator ────────────────────────────────
    this._shieldIndicator = document.createElement('div');
    this._shieldIndicator.style.cssText = `
      position:fixed;bottom:80px;right:14px;
      background:rgba(60,80,200,0.3);border:1px solid rgba(100,140,255,0.4);
      padding:4px 10px;font-size:0.75rem;color:#88bbff;
      font-family:monospace;display:none;
    `;
    el.appendChild(this._shieldIndicator);

    document.body.appendChild(el);
    this._el = el;
  }

  /**
   * Update every frame.
   * @param {object} player - firstPersonController
   * @param {object} effectSystem
   */
  update(player, effectSystem) {
    if (!this._created) return;
    const p = this._profile ? this._profile.data : null;

    // Health bar
    const hpPct = player ? Math.max(0, Math.min(1, player.health / player.maxHealth)) : 1;
    this._hpBar.fill.style.width = (hpPct * 100) + '%';
    if (hpPct > 0.6) this._hpBar.fill.style.background = '#22cc22';
    else if (hpPct > 0.3) this._hpBar.fill.style.background = '#cccc22';
    else this._hpBar.fill.style.background = '#cc2222';
    this._hpLabel.textContent = 'HP: ' + Math.round(hpPct * 100) + '%';

    // Stamina bar
    const stPct = player ? Math.max(0, Math.min(1, player.stamina / player.maxStamina)) : 1;
    this._stBar.fill.style.width = (stPct * 100) + '%';
    if (!player?.canSprint) this._stBar.fill.style.background = '#cc6600';
    else this._stBar.fill.style.background = '#ffcc00';
    this._stLabel.textContent = 'ST: ' + Math.round(stPct * 100) + '%';

    // EXP bar
    if (p) {
      const expPct = p.expToNextLevel > 0 ? p.exp / p.expToNextLevel : 0;
      this._expBar.fill.style.width = (expPct * 100) + '%';
      this._expLabel.textContent = `EXP: ${p.exp}/${p.expToNextLevel}`;
      this._levelBadge.textContent = `Lv. ${p.level}`;
    }

    // Shield
    if (effectSystem && effectSystem.playerShield > 0) {
      this._shieldIndicator.style.display = 'block';
      this._shieldIndicator.textContent = `Shield: ${Math.round(effectSystem.playerShield)}`;
    } else {
      this._shieldIndicator.style.display = 'none';
    }

    // Process toast queue
    this._tickToasts();
  }

  /**
   * Rebuild skill slot bar (call when skills change).
   * @param {string[]} equippedSkillIds - ordered list of skill ids to show
   */
  rebuildSkillBar(equippedSkillIds) {
    if (!this._skillBar) return;
    this._skillBar.innerHTML = '';
    this._skillSlots = {};

    for (let i = 0; i < equippedSkillIds.length; i++) {
      const id = equippedSkillIds[i];
      const skill = SKILLS[id];
      if (!skill || skill.passive) continue;

      const slot = document.createElement('div');
      slot.style.cssText = `
        width:42px;height:42px;position:relative;
        background:rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.15);
        display:flex;align-items:center;justify-content:center;
        flex-direction:column;
      `;

      // Key label
      const keyLbl = document.createElement('div');
      keyLbl.style.cssText = `
        position:absolute;top:1px;left:3px;font-size:0.55rem;
        color:rgba(255,255,255,0.5);font-family:monospace;
      `;
      keyLbl.textContent = skill.key || (i + 1);
      slot.appendChild(keyLbl);

      // Color dot
      const dot = document.createElement('div');
      dot.style.cssText = `
        width:12px;height:12px;border-radius:50%;
        background:${skill.color};opacity:0.8;
      `;
      slot.appendChild(dot);

      // Name
      const nameLbl = document.createElement('div');
      nameLbl.style.cssText = 'font-size:0.45rem;color:#ccc;margin-top:2px;text-align:center;overflow:hidden;width:38px;white-space:nowrap;text-overflow:ellipsis;';
      nameLbl.textContent = skill.name;
      slot.appendChild(nameLbl);

      // Cooldown overlay
      const cdOverlay = document.createElement('div');
      cdOverlay.style.cssText = `
        position:absolute;inset:0;background:rgba(0,0,0,0.7);
        display:none;align-items:center;justify-content:center;
        font-size:0.7rem;color:#ff8888;font-family:monospace;
      `;
      slot.appendChild(cdOverlay);

      this._skillSlots[id] = { slot, cdOverlay };
      this._skillBar.appendChild(slot);
    }
  }

  /**
   * Update cooldown display on skill slots.
   */
  updateSkillCooldowns() {
    if (!this._skillSlots || !this._skillSystem) return;
    for (const [id, ui] of Object.entries(this._skillSlots)) {
      const cd = this._skillSystem.getCooldown(id);
      if (cd > 0) {
        ui.cdOverlay.style.display = 'flex';
        ui.cdOverlay.textContent = cd.toFixed(1);
      } else {
        ui.cdOverlay.style.display = 'none';
      }
    }
  }

  // ── Notifications / Toasts ──────────────────────────────

  /**
   * Show a temporary notification at the top of the screen.
   * @param {string} text
   * @param {string} [color='#aaddaa']
   */
  showToast(text, color = '#aaddaa') {
    this._toastQueue.push({ text, color, life: 3.0 });
  }

  _tickToasts() {
    if (!this._toastContainer) return;
    // Show up to 3 toasts
    while (this._toastQueue.length > 0 && this._toastContainer.children.length < 3) {
      const t = this._toastQueue.shift();
      const el = document.createElement('div');
      el.style.cssText = `
        padding:6px 18px;background:rgba(0,0,0,0.7);
        border:1px solid ${t.color}44;color:${t.color};
        font-size:0.85rem;letter-spacing:0.05em;
        opacity:1;transition:opacity 0.5s;
      `;
      el.textContent = t.text;
      el.dataset.life = t.life;
      this._toastContainer.appendChild(el);
    }

    // Tick existing toasts
    const toRemove = [];
    for (const child of this._toastContainer.children) {
      let life = parseFloat(child.dataset.life) - 0.016;
      child.dataset.life = life;
      if (life < 1.0) child.style.opacity = Math.max(0, life);
      if (life <= 0) toRemove.push(child);
    }
    for (const el of toRemove) el.remove();
  }

  // ── Helpers ───────────────────────────────────────────────

  _bar(name, color, height) {
    const container = document.createElement('div');
    container.style.cssText = `width:100%;height:${height}px;background:#333;border-radius:2px;overflow:hidden;border:1px solid #555;`;
    const fill = document.createElement('div');
    fill.style.cssText = `width:100%;height:100%;background:${color};transition:width 0.15s;`;
    container.appendChild(fill);
    return { container, fill };
  }

  _lbl(text) {
    const el = document.createElement('span');
    el.style.cssText = 'font-size:9px;color:#fff;font-family:monospace;text-shadow:1px 1px 2px #000;';
    el.textContent = text;
    return el;
  }

  show() {
    if (this._el) this._el.style.display = 'block';
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    this._created = false;
  }
}

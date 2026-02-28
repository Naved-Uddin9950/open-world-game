// ============================================================
// skillTreeUI.js — Visual skill tree / skill list panel
// ============================================================
import { SKILLS } from '../systems/skillSystem.js';

export class SkillTreeUI {
  constructor() {
    this._el = null;
    this._created = false;
    this._visible = false;
    this._profile = null;
    this._shopSystem = null;
    this._onClose = null;
  }

  setProfile(profile) { this._profile = profile; }
  setShopSystem(shop) { this._shopSystem = shop; }
  setCallbacks({ onClose }) { this._onClose = onClose; }

  show() {
    if (!this._created) this._create();
    this._refresh();
    this._el.style.display = 'flex';
    this._visible = true;
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
    this._visible = false;
  }

  isVisible() { return this._visible; }

  _create() {
    this._created = true;

    const el = document.createElement('div');
    el.id = 'skill-tree';
    el.style.cssText = `
      position:fixed;inset:0;z-index:2800;display:none;
      flex-direction:column;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.9);font-family:'Segoe UI',system-ui,sans-serif;
      backdrop-filter:blur(4px);
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:rgba(25,25,30,0.96);border:1px solid rgba(255,255,255,0.1);
      border-radius:8px;padding:24px 28px;min-width:520px;max-width:640px;
      max-height:85vh;overflow-y:auto;
    `;
    this._box = box;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'SKILL TREE';
    title.style.cssText = 'color:#aaddaa;font-size:1.2rem;font-weight:300;letter-spacing:0.12em;margin-bottom:6px;text-align:center;';
    box.appendChild(title);

    // SP display
    this._spLabel = document.createElement('div');
    this._spLabel.style.cssText = 'color:#88cc88;font-size:0.85rem;text-align:center;margin-bottom:16px;font-family:monospace;';
    box.appendChild(this._spLabel);

    // Skills container
    this._skillsContainer = document.createElement('div');
    box.appendChild(this._skillsContainer);

    // Close
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      display:block;margin:16px auto 0;padding:10px 36px;font-size:0.9rem;
      cursor:pointer;background:transparent;color:#aaa;border:1px solid rgba(255,255,255,0.2);
      letter-spacing:0.08em;text-transform:uppercase;transition:all 0.2s;font-family:inherit;
    `;
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#fff'; closeBtn.style.borderColor = 'rgba(255,255,255,0.5)'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = '#aaa'; closeBtn.style.borderColor = 'rgba(255,255,255,0.2)'; });
    closeBtn.addEventListener('click', () => {
      this.hide();
      if (this._onClose) this._onClose();
    });
    box.appendChild(closeBtn);

    el.appendChild(box);
    document.body.appendChild(el);
    this._el = el;
  }

  _refresh() {
    if (!this._profile || !this._shopSystem) return;
    const d = this._profile.data;
    this._spLabel.textContent = `Skill Points: ${d.skillPoints}`;

    const c = this._skillsContainer;
    c.innerHTML = '';

    // Group by tier
    const tiers = {};
    for (const [id, skill] of Object.entries(SKILLS)) {
      if (skill.passive) continue;
      const t = skill.tier || 1;
      if (!tiers[t]) tiers[t] = [];
      tiers[t].push({ id, skill });
    }

    const tierNames = { 1: 'Starter', 2: 'Advanced', 3: 'Expert', 4: 'Ultimate' };

    for (const tier of Object.keys(tiers).sort((a, b) => a - b)) {
      // Tier header
      const header = document.createElement('div');
      header.textContent = `TIER ${tier} — ${tierNames[tier] || ''}`;
      header.style.cssText = 'color:#777;font-size:0.7rem;letter-spacing:0.1em;margin:12px 0 6px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:4px;';
      c.appendChild(header);

      for (const { id, skill } of tiers[tier]) {
        c.appendChild(this._skillCard(id, skill));
      }
    }
  }

  _skillCard(id, skill) {
    const owned = this._profile.hasSkill(id);
    const lvl = this._profile.getSkillLevel(id);
    const d = this._profile.data;

    const card = document.createElement('div');
    card.style.cssText = `
      display:flex;justify-content:space-between;align-items:center;
      padding:8px 10px;margin-bottom:4px;
      background:${owned ? 'rgba(100,200,100,0.08)' : 'rgba(50,50,50,0.3)'};
      border-left:3px solid ${owned ? skill.color : '#333'};
    `;

    // Left: info
    const info = document.createElement('div');
    info.style.cssText = 'flex:1;';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = `font-size:0.9rem;color:${owned ? skill.color : '#888'};font-weight:600;`;
    nameEl.textContent = skill.name;
    if (owned) nameEl.textContent += ` Lv.${lvl}/${skill.maxLevel}`;
    if (skill.key) nameEl.textContent += ` [${skill.key}]`;
    info.appendChild(nameEl);

    const descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:0.7rem;color:#777;margin-top:2px;';
    descEl.textContent = skill.description;
    info.appendChild(descEl);

    const statsEl = document.createElement('div');
    statsEl.style.cssText = 'font-size:0.65rem;color:#555;margin-top:2px;';
    const parts = [];
    if (skill.damage) parts.push(`DMG:${skill.damage}`);
    if (skill.staminaCost) parts.push(`ST:${skill.staminaCost}`);
    if (skill.cooldown) parts.push(`CD:${skill.cooldown}s`);
    parts.push(`Effect:${skill.effectType}`);
    statsEl.textContent = parts.join(' | ');
    info.appendChild(statsEl);

    card.appendChild(info);

    // Right: action button
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'margin-left:8px;';

    if (!owned) {
      const cost = skill.shopCost || 1;
      const canBuy = d.skillPoints >= cost;
      const btn = document.createElement('button');
      btn.textContent = `Buy (${cost} SP)`;
      btn.style.cssText = `
        padding:4px 12px;font-size:0.75rem;cursor:${canBuy ? 'pointer' : 'default'};
        background:${canBuy ? 'rgba(100,200,100,0.2)' : 'rgba(80,80,80,0.3)'};
        color:${canBuy ? '#88ff88' : '#555'};
        border:1px solid ${canBuy ? 'rgba(100,200,100,0.4)' : 'rgba(80,80,80,0.3)'};
        font-family:inherit;
      `;
      if (canBuy) {
        btn.addEventListener('click', () => {
          this._shopSystem.buySkill(id);
          this._refresh();
        });
      }
      btnWrap.appendChild(btn);
    } else if (lvl < skill.maxLevel) {
      const cost = lvl;
      const canUp = d.skillPoints >= cost;
      const btn = document.createElement('button');
      btn.textContent = `Upgrade (${cost} SP)`;
      btn.style.cssText = `
        padding:4px 12px;font-size:0.75rem;cursor:${canUp ? 'pointer' : 'default'};
        background:${canUp ? 'rgba(100,180,255,0.2)' : 'rgba(80,80,80,0.3)'};
        color:${canUp ? '#88bbff' : '#555'};
        border:1px solid ${canUp ? 'rgba(100,180,255,0.4)' : 'rgba(80,80,80,0.3)'};
        font-family:inherit;
      `;
      if (canUp) {
        btn.addEventListener('click', () => {
          this._shopSystem.upgradeSkill(id);
          this._refresh();
        });
      }
      btnWrap.appendChild(btn);
    } else {
      const maxLbl = document.createElement('span');
      maxLbl.textContent = 'MAX';
      maxLbl.style.cssText = 'color:#ffcc00;font-size:0.75rem;font-weight:600;';
      btnWrap.appendChild(maxLbl);
    }

    card.appendChild(btnWrap);
    return card;
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    this._created = false;
  }
}

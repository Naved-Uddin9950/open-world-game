// ============================================================
// profilePanel.js — Player profile / stats / enhancement UI
// ============================================================
import { SKILLS } from '../systems/skillSystem.js';

export class ProfilePanel {
  constructor() {
    this._el = null;
    this._created = false;
    this._visible = false;
    this._profile = null;      // PlayerProfile reference
    this._onClose = null;
  }

  setProfile(profile) { this._profile = profile; }
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
    el.id = 'profile-panel';
    el.style.cssText = `
      position:fixed;inset:0;z-index:2700;display:none;
      flex-direction:column;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.88);font-family:'Segoe UI',system-ui,sans-serif;
      backdrop-filter:blur(4px);
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:rgba(30,30,30,0.95);border:1px solid rgba(255,255,255,0.1);
      border-radius:8px;padding:24px 32px;min-width:380px;max-width:460px;
      max-height:82vh;overflow-y:auto;
    `;
    this._box = box;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'PLAYER PROFILE';
    title.style.cssText = 'color:#aaddaa;font-size:1.2rem;font-weight:300;letter-spacing:0.12em;margin-bottom:16px;text-align:center;';
    box.appendChild(title);

    // Stats container — rebuilt on refresh
    this._statsContainer = document.createElement('div');
    box.appendChild(this._statsContainer);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      display:block;margin:18px auto 0;padding:10px 36px;font-size:0.9rem;
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
    if (!this._profile) return;
    const d = this._profile.data;
    const c = this._statsContainer;
    c.innerHTML = '';

    // Info
    c.appendChild(this._row('Name', d.name));
    c.appendChild(this._row('Age', String(this._profile.age)));
    c.appendChild(this._row('Level', String(d.level)));
    c.appendChild(this._row('EXP', `${d.exp} / ${d.expToNextLevel}`));
    c.appendChild(this._row('Skill Points', String(d.skillPoints)));
    c.appendChild(this._row('Enhancement Pts', String(d.enhancementPoints)));
    c.appendChild(this._row('Total Kills', String(d.totalKills)));

    c.appendChild(this._divider());

    // Stats with enhance buttons
    const stats = [
      { key: 'health', label: 'Health', val: `${d.health} / ${d.maxHealth}` },
      { key: 'stamina', label: 'Stamina', val: `${d.stamina} / ${d.maxStamina}` },
      { key: 'strength', label: 'Strength', val: String(d.strength) },
      { key: 'defence', label: 'Defence', val: String(d.defence) },
    ];
    for (const s of stats) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
      const lbl = document.createElement('span');
      lbl.style.cssText = 'color:#ccc;font-size:0.85rem;';
      lbl.textContent = `${s.label}: ${s.val}`;
      row.appendChild(lbl);

      if (d.enhancementPoints > 0) {
        const btn = document.createElement('button');
        btn.textContent = '+';
        btn.title = `Spend 1 enhancement point to boost ${s.label}`;
        btn.style.cssText = `
          padding:2px 10px;font-size:0.85rem;cursor:pointer;
          background:rgba(100,200,100,0.2);color:#88ff88;
          border:1px solid rgba(100,200,100,0.4);font-family:inherit;
        `;
        btn.addEventListener('click', () => {
          this._profile.enhanceStat(s.key, 1);
          this._refresh();
        });
        row.appendChild(btn);
      }
      c.appendChild(row);
    }

    c.appendChild(this._divider());

    // Unlocked skills
    const skillTitle = document.createElement('div');
    skillTitle.textContent = 'UNLOCKED SKILLS';
    skillTitle.style.cssText = 'color:#999;font-size:0.7rem;letter-spacing:0.1em;margin-bottom:8px;';
    c.appendChild(skillTitle);

    for (const id of d.unlockedSkills) {
      const skill = SKILLS[id];
      if (!skill) continue;
      const lvl = this._profile.getSkillLevel(id);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;';
      const lbl = document.createElement('span');
      lbl.style.cssText = `color:${skill.color};font-size:0.85rem;`;
      lbl.textContent = `${skill.name} Lv.${lvl}`;
      if (skill.key) lbl.textContent += ` [${skill.key}]`;
      row.appendChild(lbl);
      c.appendChild(row);
    }
  }

  _row(label, value) {
    const r = document.createElement('div');
    r.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;';
    const l = document.createElement('span');
    l.style.cssText = 'color:#999;font-size:0.85rem;';
    l.textContent = label;
    const v = document.createElement('span');
    v.style.cssText = 'color:#eee;font-size:0.85rem;font-family:monospace;';
    v.textContent = value;
    r.appendChild(l);
    r.appendChild(v);
    return r;
  }

  _divider() {
    const d = document.createElement('div');
    d.style.cssText = 'border-top:1px solid rgba(255,255,255,0.08);margin:10px 0;';
    return d;
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    this._created = false;
  }
}

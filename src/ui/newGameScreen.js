// ============================================================
// newGameScreen.js — Player creation UI
// ============================================================
import { STARTER_SKILLS, SKILLS } from '../systems/skillSystem.js';

/**
 * Full-screen character creation overlay.
 * Collects: name, date-of-birth, starter skill.
 */
export class NewGameScreen {
  constructor() {
    this._el = null;
    this._created = false;
    this._onConfirm = null; // (name, dob, starterSkill) => void
    this._onBack = null;
    this._selectedSkill = STARTER_SKILLS[0];
  }

  setCallbacks({ onConfirm, onBack }) {
    this._onConfirm = onConfirm;
    this._onBack = onBack;
  }

  show() {
    if (!this._created) this._create();
    this._el.style.display = 'flex';
    // Exit pointer lock
    if (document.pointerLockElement) document.exitPointerLock();
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
  }

  isVisible() {
    return this._el && this._el.style.display !== 'none';
  }

  _create() {
    this._created = true;

    const el = document.createElement('div');
    el.id = 'new-game-screen';
    el.style.cssText = `
      position:fixed;inset:0;z-index:3100;display:none;
      flex-direction:column;align-items:center;justify-content:center;
      background:linear-gradient(135deg,rgba(0,20,10,0.96),rgba(0,0,0,0.99));
      font-family:'Segoe UI',system-ui,sans-serif;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:rgba(30,30,30,0.95);border:1px solid rgba(255,255,255,0.1);
      border-radius:8px;padding:28px 36px;min-width:380px;max-width:460px;
      max-height:85vh;overflow-y:auto;
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'CREATE YOUR CHARACTER';
    title.style.cssText = 'color:#aaddaa;font-size:1.3rem;font-weight:300;letter-spacing:0.12em;margin-bottom:24px;text-align:center;';
    box.appendChild(title);

    // Name input
    box.appendChild(this._label('Player Name'));
    this._nameInput = document.createElement('input');
    this._nameInput.type = 'text';
    this._nameInput.value = 'Player';
    this._nameInput.maxLength = 24;
    this._nameInput.style.cssText = `
      width:100%;box-sizing:border-box;padding:10px 12px;margin-bottom:16px;
      background:rgba(50,50,50,0.8);border:1px solid rgba(255,255,255,0.15);
      color:#fff;font-size:1rem;font-family:inherit;outline:none;
    `;
    this._nameInput.addEventListener('focus', () => this._nameInput.style.borderColor = 'rgba(100,200,100,0.5)');
    this._nameInput.addEventListener('blur', () => this._nameInput.style.borderColor = 'rgba(255,255,255,0.15)');
    box.appendChild(this._nameInput);

    // Date of Birth
    box.appendChild(this._label('Date of Birth'));
    this._dobInput = document.createElement('input');
    this._dobInput.type = 'date';
    this._dobInput.value = '2000-01-01';
    this._dobInput.style.cssText = `
      width:100%;box-sizing:border-box;padding:10px 12px;margin-bottom:20px;
      background:rgba(50,50,50,0.8);border:1px solid rgba(255,255,255,0.15);
      color:#fff;font-size:0.95rem;font-family:inherit;outline:none;
      color-scheme:dark;
    `;
    box.appendChild(this._dobInput);

    // Starter skill
    box.appendChild(this._label('Choose Starting Skill'));
    this._skillBtns = {};
    const skillGrid = document.createElement('div');
    skillGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px;';

    for (const id of STARTER_SKILLS) {
      const skill = SKILLS[id];
      if (!skill) continue;
      const card = document.createElement('button');
      card.style.cssText = this._skillCardStyle(id === this._selectedSkill);
      card.innerHTML = `
        <div style="font-size:0.95rem;color:${skill.color};margin-bottom:4px;font-weight:600;">${skill.name}</div>
        <div style="font-size:0.7rem;color:#999;line-height:1.3;">${skill.description}</div>
        <div style="font-size:0.65rem;color:#666;margin-top:4px;">DMG: ${skill.damage} | CD: ${skill.cooldown}s</div>
      `;
      card.addEventListener('click', () => {
        this._selectedSkill = id;
        for (const [k, btn] of Object.entries(this._skillBtns)) {
          btn.style.cssText = this._skillCardStyle(k === id);
        }
      });
      skillGrid.appendChild(card);
      this._skillBtns[id] = card;
    }
    box.appendChild(skillGrid);

    // Buttons row
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    const backBtn = this._btn('Back', () => {
      this.hide();
      if (this._onBack) this._onBack();
    });
    backBtn.style.color = '#aaa';
    btnRow.appendChild(backBtn);

    const confirmBtn = this._btn('Start Adventure', () => {
      const name = (this._nameInput.value || '').trim() || 'Player';
      const dob = this._dobInput.value || '2000-01-01';
      this.hide();
      if (this._onConfirm) this._onConfirm(name, dob, this._selectedSkill);
    });
    confirmBtn.style.color = '#88ff88';
    confirmBtn.style.borderColor = 'rgba(100,200,100,0.5)';
    btnRow.appendChild(confirmBtn);

    box.appendChild(btnRow);
    el.appendChild(box);
    document.body.appendChild(el);
    this._el = el;
  }

  _label(text) {
    const l = document.createElement('div');
    l.textContent = text;
    l.style.cssText = 'color:#999;font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;';
    return l;
  }

  _skillCardStyle(active) {
    return `
      display:block;text-align:left;padding:10px 12px;cursor:pointer;
      background:${active ? 'rgba(100,200,100,0.12)' : 'rgba(50,50,50,0.5)'};
      border:1px solid ${active ? 'rgba(100,200,100,0.5)' : 'rgba(255,255,255,0.1)'};
      font-family:inherit;transition:all 0.2s;
    `;
  }

  _btn(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding:12px 28px;font-size:0.95rem;cursor:pointer;
      background:transparent;color:#88cc88;border:1px solid rgba(100,180,100,0.3);
      letter-spacing:0.08em;text-transform:uppercase;transition:all 0.2s;font-family:inherit;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(100,200,100,0.15)';
      btn.style.borderColor = 'rgba(100,200,100,0.6)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.borderColor = 'rgba(100,180,100,0.3)';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    this._created = false;
  }
}

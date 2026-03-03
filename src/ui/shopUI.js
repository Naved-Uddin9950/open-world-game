// ============================================================
// shopUI.js — In-game shop overlay for buying/upgrading skills
// ============================================================
import { SKILLS } from '../systems/skillSystem.js';

export class ShopUI {
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
  setCallbacks({ onClose, onSkillChange }) {
    this._onClose = onClose;
    this._onSkillChange = onSkillChange || null;
  }

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
    el.id = 'shop-ui';
    el.style.cssText = `
      position:fixed;inset:0;z-index:2800;display:none;
      flex-direction:column;align-items:center;justify-content:center;
      background:radial-gradient(circle at 50% 28%,rgba(30,22,10,0.74),rgba(0,0,0,0.92));
      font-family:'Segoe UI',system-ui,sans-serif;backdrop-filter:blur(6px);
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:rgba(30,24,18,0.96);border:1px solid rgba(255,200,100,0.22);
      border-radius:10px;padding:20px 22px 16px;min-width:520px;max-width:700px;
      max-height:85vh;overflow-y:auto;box-shadow:0 14px 34px rgba(0,0,0,0.48);
    `;
    this._box = box;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'SKILL SHOP';
    title.style.cssText = 'color:#ffcf78;font-size:1.24rem;font-weight:300;letter-spacing:0.12em;margin:0 0 6px;text-align:center;';
    box.appendChild(title);

    // SP display
    this._spLabel = document.createElement('div');
    this._spLabel.style.cssText = 'color:#ffd8a2;font-size:0.85rem;text-align:center;margin-bottom:14px;font-family:monospace;background:rgba(255,200,100,0.08);border:1px solid rgba(255,200,100,0.22);border-radius:6px;padding:4px 8px;';
    box.appendChild(this._spLabel);

    // Tabs
    this._tabRow = document.createElement('div');
    this._tabRow.style.cssText = 'display:flex;gap:6px;margin-bottom:12px;';
    this._tab = 'buy'; // 'buy' or 'upgrade'
    this._buyTab = this._tabBtn('Buy Skills', 'buy');
    this._upgradeTab = this._tabBtn('Upgrade Skills', 'upgrade');
    this._tabRow.appendChild(this._buyTab);
    this._tabRow.appendChild(this._upgradeTab);
    box.appendChild(this._tabRow);

    // Content
    this._content = document.createElement('div');
    box.appendChild(this._content);

    // Close
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close Shop';
    closeBtn.style.cssText = `
      display:block;margin:16px auto 0;padding:10px 36px;font-size:0.9rem;
      cursor:pointer;background:rgba(25,22,18,0.8);color:#d8c8b2;border:1px solid rgba(255,200,100,0.25);
      border-radius:6px;letter-spacing:0.08em;text-transform:uppercase;transition:all 0.2s;font-family:inherit;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#fff8ea';
      closeBtn.style.borderColor = 'rgba(255,200,100,0.52)';
      closeBtn.style.background = 'rgba(95,70,35,0.28)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#d8c8b2';
      closeBtn.style.borderColor = 'rgba(255,200,100,0.25)';
      closeBtn.style.background = 'rgba(25,22,18,0.8)';
    });
    closeBtn.addEventListener('click', () => {
      this.hide();
      if (this._onClose) this._onClose();
    });
    box.appendChild(closeBtn);

    el.appendChild(box);
    document.body.appendChild(el);
    this._el = el;
  }

  _tabBtn(text, key) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = this._tabStyle(key === this._tab);
    btn.addEventListener('click', () => {
      this._tab = key;
      this._buyTab.style.cssText = this._tabStyle(key === 'buy');
      this._upgradeTab.style.cssText = this._tabStyle(key === 'upgrade');
      this._refresh();
    });
    return btn;
  }

  _tabStyle(active) {
    return `
      flex:1;padding:8px;font-size:0.8rem;cursor:pointer;font-family:inherit;border-radius:6px;
      letter-spacing:0.06em;text-transform:uppercase;
      border:1px solid ${active ? 'rgba(255,200,100,0.5)' : 'rgba(255,255,255,0.1)'};
      background:${active ? 'rgba(255,200,100,0.16)' : 'rgba(25,22,18,0.68)'};
      color:${active ? '#ffcc66' : '#9b907e'};transition:all 0.2s;
    `;
  }

  _refresh() {
    if (!this._shopSystem || !this._profile) return;
    this._spLabel.textContent = `Skill Points: ${this._profile.data.skillPoints}`;

    const c = this._content;
    c.innerHTML = '';

    if (this._tab === 'buy') {
      const items = this._shopSystem.getAvailableSkills();
      if (items.length === 0) {
        c.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">All skills purchased!</div>';
        return;
      }
      for (const item of items) {
        c.appendChild(this._shopCard(item.id, item.skill, item.cost, 'buy'));
      }
    } else {
      const items = this._shopSystem.getUpgradeableSkills();
      if (items.length === 0) {
        c.innerHTML = '<div style="color:#666;text-align:center;padding:20px;">No skills to upgrade.</div>';
        return;
      }
      for (const item of items) {
        c.appendChild(this._shopCard(item.id, item.skill, item.cost, 'upgrade', item.currentLevel, item.maxLevel));
      }
    }
  }

  _shopCard(id, skill, cost, action, currentLevel = 0, maxLevel = 0) {
    const canAfford = this._profile.data.skillPoints >= cost;
    const equippedSlot = this._profile.getEquippedSlot ? this._profile.getEquippedSlot(id) : -1;
    const card = document.createElement('div');
    card.style.cssText = `
      display:flex;justify-content:space-between;align-items:center;
      padding:10px 12px;margin-bottom:8px;border-radius:8px;
      background:rgba(50,45,35,0.56);border:1px solid rgba(255,255,255,0.08);border-left:3px solid ${skill.color};
    `;

    // Info
    const info = document.createElement('div');
    info.style.cssText = 'flex:1;';

    const nameEl = document.createElement('div');
    nameEl.style.cssText = `font-size:0.9rem;color:${skill.color};font-weight:600;`;
    nameEl.textContent = skill.name;
    if (action === 'upgrade') nameEl.textContent += ` (Lv.${currentLevel} → ${currentLevel + 1})`;
    if (equippedSlot !== -1) {
      const key = equippedSlot < 9 ? String(equippedSlot + 1) : '0';
      nameEl.textContent += ` [${key}]`;
    }
    info.appendChild(nameEl);

    const descEl = document.createElement('div');
    descEl.style.cssText = 'font-size:0.7rem;color:#888;margin-top:2px;';
    descEl.textContent = skill.description;
    info.appendChild(descEl);

    const stats = document.createElement('div');
    stats.style.cssText = 'font-size:0.65rem;color:#666;margin-top:2px;';
    const parts = [];
    if (skill.damage) parts.push(`DMG:${skill.damage}`);
    if (skill.staminaCost) parts.push(`Cost:${skill.staminaCost} ST`);
    if (skill.cooldown) parts.push(`CD:${skill.cooldown}s`);
    stats.textContent = parts.join(' | ');
    info.appendChild(stats);

    card.appendChild(info);

    // Buy/Upgrade button
    if (action === 'upgrade') {
      const eqBtn = document.createElement('button');
      eqBtn.textContent = equippedSlot !== -1 ? 'Unequip' : 'Equip';
      eqBtn.style.cssText = `
        margin-left:10px;padding:6px 12px;font-size:0.75rem;
        cursor:pointer;background:rgba(120,120,120,0.2);color:#ddd;
        border:1px solid rgba(180,180,180,0.3);border-radius:6px;font-family:inherit;transition:all 0.15s;
      `;
      eqBtn.addEventListener('click', () => {
        if (equippedSlot !== -1) this._profile.unequipSkill(id);
        else this._profile.equipSkill(id);
        this._refresh();
        if (this._onSkillChange) this._onSkillChange();
      });
      card.appendChild(eqBtn);
    }

    const btn = document.createElement('button');
    btn.textContent = action === 'buy' ? `Buy (${cost} SP)` : `Upgrade (${cost} SP)`;
    btn.style.cssText = `
      margin-left:10px;padding:6px 16px;font-size:0.8rem;
      cursor:${canAfford ? 'pointer' : 'default'};
      background:${canAfford ? 'rgba(255,200,100,0.2)' : 'rgba(80,80,80,0.3)'};
      color:${canAfford ? '#ffcc66' : '#555'};
      border:1px solid ${canAfford ? 'rgba(255,200,100,0.4)' : 'rgba(80,80,80,0.3)'};
      border-radius:6px;font-family:inherit;transition:all 0.15s;
    `;
    if (canAfford) {
      btn.addEventListener('click', () => {
        if (action === 'buy') this._shopSystem.buySkill(id);
        else this._shopSystem.upgradeSkill(id);
        this._refresh();
        if (this._onSkillChange) this._onSkillChange();
      });
    }
    card.appendChild(btn);

    return card;
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    this._created = false;
  }
}

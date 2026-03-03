// ============================================================
// questUI.js — Quest tracker & quest log panel
// ============================================================
// Shows active quests as a persistent HUD tracker (top-right).
// Opens a full quest log panel with [Q] key or pause menu.
// ============================================================

export class QuestUI {
  constructor() {
    this._el = null;             // full panel overlay
    this._tracker = null;        // HUD tracker (always visible)
    this._created = false;
    this._trackerCreated = false;
    this._visible = false;
    this._questManager = null;
    this._onClose = null;
  }

  setQuestManager(qm) { this._questManager = qm; }
  setCallbacks({ onClose }) { this._onClose = onClose; }
  isVisible() { return this._visible; }

  // ── HUD Tracker (top-right, always visible) ─────────────

  createTracker() {
    if (this._trackerCreated) return;
    this._trackerCreated = true;

    const t = document.createElement('div');
    t.id = 'quest-tracker';
    t.style.cssText = `
      position:fixed;top:60px;right:14px;z-index:1050;
      pointer-events:none;font-family:'Segoe UI',system-ui,sans-serif;
      max-width:260px;
    `;
    this._trackerTitle = document.createElement('div');
    this._trackerTitle.style.cssText = `
      color:#88cc88;font-size:0.7rem;letter-spacing:0.1em;
      text-transform:uppercase;margin-bottom:4px;
      text-shadow:1px 1px 3px #000;
    `;
    this._trackerTitle.textContent = 'QUESTS';
    t.appendChild(this._trackerTitle);

    this._trackerBody = document.createElement('div');
    t.appendChild(this._trackerBody);

    document.body.appendChild(t);
    this._tracker = t;
  }

  updateTracker() {
    if (!this._trackerBody || !this._questManager) return;
    this._trackerBody.innerHTML = '';

    const active = this._questManager.activeQuests || [];
    if (active.length === 0) {
      this._trackerTitle.textContent = '';
      return;
    }
    this._trackerTitle.textContent = 'QUESTS';

    const shown = active.slice(0, 3);
    for (const q of shown) {
      const card = document.createElement('div');
      card.style.cssText = `
        background:rgba(0,0,0,0.5);border-left:2px solid ${q.type === 'main' ? '#88ff88' : '#aaaacc'};
        padding:4px 8px;margin-bottom:3px;
      `;
      const title = document.createElement('div');
      title.style.cssText = 'color:#ddd;font-size:0.72rem;font-weight:600;text-shadow:1px 1px 2px #000;';
      title.textContent = q.title || q.name || q.id;
      card.appendChild(title);

      // Objective progress
      if (q.objectives) {
        for (const obj of q.objectives) {
          const line = document.createElement('div');
          const done = obj.current >= obj.required;
          line.style.cssText = `color:${done ? '#88cc88' : '#999'};font-size:0.6rem;margin-top:1px;text-shadow:1px 1px 2px #000;`;
          line.textContent = `${done ? '✓' : '○'} ${obj.description || obj.target}: ${obj.current}/${obj.required}`;
          card.appendChild(line);
        }
      }
      this._trackerBody.appendChild(card);
    }
    if (active.length > 3) {
      const more = document.createElement('div');
      more.style.cssText = 'color:#666;font-size:0.6rem;text-shadow:1px 1px 2px #000;';
      more.textContent = `+${active.length - 3} more quests...`;
      this._trackerBody.appendChild(more);
    }
  }

  showTracker() { if (this._tracker) this._tracker.style.display = 'block'; }
  hideTracker() { if (this._tracker) this._tracker.style.display = 'none'; }

  // ── Full Quest Log Panel ────────────────────────────────

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

  _create() {
    this._created = true;
    const el = document.createElement('div');
    el.id = 'quest-log';
    el.style.cssText = `
      position:fixed;inset:0;z-index:2800;display:none;
      flex-direction:column;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.88);font-family:'Segoe UI',system-ui,sans-serif;
      backdrop-filter:blur(4px);
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:rgba(30,30,30,0.95);border:1px solid rgba(255,255,255,0.1);
      border-radius:8px;padding:24px 32px;min-width:500px;max-width:640px;
      max-height:82vh;overflow-y:auto;
    `;
    this._box = box;

    const title = document.createElement('h2');
    title.textContent = 'QUEST LOG';
    title.style.cssText = 'color:#aaddaa;font-size:1.2rem;font-weight:300;letter-spacing:0.12em;margin-bottom:16px;text-align:center;';
    box.appendChild(title);

    // Tab bar
    this._tabBar = document.createElement('div');
    this._tabBar.style.cssText = 'display:flex;gap:8px;margin-bottom:16px;justify-content:center;';
    box.appendChild(this._tabBar);

    this._questList = document.createElement('div');
    box.appendChild(this._questList);

    // Close
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close [Q]';
    closeBtn.style.cssText = `
      display:block;margin:18px auto 0;padding:10px 36px;font-size:0.9rem;
      cursor:pointer;background:transparent;color:#aaa;border:1px solid rgba(255,255,255,0.2);
      letter-spacing:0.08em;text-transform:uppercase;transition:all 0.2s;font-family:inherit;
    `;
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#fff'; closeBtn.style.borderColor = 'rgba(255,255,255,0.5)'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = '#aaa'; closeBtn.style.borderColor = 'rgba(255,255,255,0.2)'; });
    closeBtn.addEventListener('click', () => { this.hide(); if (this._onClose) this._onClose(); });
    box.appendChild(closeBtn);

    el.appendChild(box);
    document.body.appendChild(el);
    this._el = el;
    this._currentTab = 'active';
  }

  _refresh() {
    if (!this._questManager) return;

    // Tabs
    this._tabBar.innerHTML = '';
    const tabs = [
      { id: 'active', label: `Active (${(this._questManager.activeQuests || []).length})` },
      { id: 'completed', label: `Completed (${(this._questManager.completedQuests || []).length})` },
      { id: 'available', label: 'Available' },
    ];
    for (const tab of tabs) {
      const btn = document.createElement('button');
      const active = tab.id === this._currentTab;
      btn.textContent = tab.label;
      btn.style.cssText = `
        padding:6px 16px;font-size:0.75rem;cursor:pointer;
        background:${active ? 'rgba(100,200,100,0.2)' : 'transparent'};
        color:${active ? '#88ff88' : '#888'};
        border:1px solid ${active ? 'rgba(100,200,100,0.4)' : 'rgba(255,255,255,0.1)'};
        font-family:inherit;transition:all 0.2s;
      `;
      btn.addEventListener('click', () => { this._currentTab = tab.id; this._refresh(); });
      this._tabBar.appendChild(btn);
    }

    // Quest list
    this._questList.innerHTML = '';
    let quests = [];
    if (this._currentTab === 'active') quests = this._questManager.activeQuests || [];
    else if (this._currentTab === 'completed') quests = this._questManager.completedQuests || [];
    else quests = this._questManager.getAvailableQuests ? this._questManager.getAvailableQuests() : [];

    if (quests.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#666;font-size:0.85rem;text-align:center;padding:20px;';
      empty.textContent = this._currentTab === 'active' ? 'No active quests. Explore the world to discover quests!' : 'No quests here.';
      this._questList.appendChild(empty);
      return;
    }

    for (const q of quests) {
      const card = document.createElement('div');
      card.style.cssText = `
        background:rgba(40,40,40,0.8);border:1px solid rgba(255,255,255,0.08);
        padding:12px 16px;margin-bottom:8px;border-left:3px solid ${q.type === 'main' ? '#88ff88' : '#8888cc'};
      `;

      const header = document.createElement('div');
      header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;';
      const name = document.createElement('span');
      name.style.cssText = 'color:#eee;font-size:0.9rem;font-weight:600;';
      name.textContent = q.title || q.name || q.id;
      header.appendChild(name);
      const typeBadge = document.createElement('span');
      typeBadge.style.cssText = `font-size:0.6rem;padding:2px 6px;background:${q.type === 'main' ? 'rgba(100,200,100,0.2)' : 'rgba(100,100,200,0.2)'};color:${q.type === 'main' ? '#88ff88' : '#aaaaff'};letter-spacing:0.05em;`;
      typeBadge.textContent = (q.type || 'side').toUpperCase();
      header.appendChild(typeBadge);
      card.appendChild(header);

      if (q.description) {
        const desc = document.createElement('div');
        desc.style.cssText = 'color:#999;font-size:0.75rem;margin-bottom:8px;line-height:1.3;';
        desc.textContent = q.description;
        card.appendChild(desc);
      }

      // Objectives
      if (q.objectives && this._currentTab === 'active') {
        for (const obj of q.objectives) {
          const row = document.createElement('div');
          row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:3px;';
          const done = obj.current >= obj.required;
          const check = document.createElement('span');
          check.style.cssText = `color:${done ? '#88cc88' : '#555'};font-size:0.8rem;`;
          check.textContent = done ? '✓' : '○';
          row.appendChild(check);
          const text = document.createElement('span');
          text.style.cssText = `color:${done ? '#aaa' : '#ccc'};font-size:0.78rem;`;
          text.textContent = `${obj.description || obj.target}: ${obj.current}/${obj.required}`;
          row.appendChild(text);
          // Progress bar
          const bar = document.createElement('div');
          bar.style.cssText = 'flex:1;height:4px;background:#333;border-radius:2px;overflow:hidden;margin-left:8px;';
          const fill = document.createElement('div');
          const pct = obj.required > 0 ? Math.min(100, (obj.current / obj.required) * 100) : 0;
          fill.style.cssText = `width:${pct}%;height:100%;background:${done ? '#88cc88' : '#6688ff'};`;
          bar.appendChild(fill);
          row.appendChild(bar);
          card.appendChild(row);
        }
      }

      // Rewards
      if (q.rewards) {
        const rewards = document.createElement('div');
        rewards.style.cssText = 'color:#888;font-size:0.65rem;margin-top:6px;';
        const parts = [];
        if (q.rewards.exp) parts.push(`${q.rewards.exp} EXP`);
        if (q.rewards.gold) parts.push(`${q.rewards.gold} Gold`);
        if (q.rewards.gp) parts.push(`${q.rewards.gp} GP`);
        if (q.rewards.skillPoints) parts.push(`${q.rewards.skillPoints} SP`);
        rewards.textContent = 'Rewards: ' + parts.join(' | ');
        card.appendChild(rewards);
      }

      // Accept button for available quests
      if (this._currentTab === 'available' && this._questManager.startQuest) {
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept Quest';
        acceptBtn.style.cssText = `
          margin-top:8px;padding:6px 16px;font-size:0.75rem;
          cursor:pointer;background:rgba(100,200,100,0.15);
          color:#88ff88;border:1px solid rgba(100,200,100,0.4);
          font-family:inherit;
        `;
        acceptBtn.addEventListener('click', () => {
          this._questManager.startQuest(q.id);
          this._refresh();
        });
        card.appendChild(acceptBtn);
      }

      this._questList.appendChild(card);
    }
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    if (this._tracker) { this._tracker.remove(); this._tracker = null; }
    this._created = false;
    this._trackerCreated = false;
  }
}

// ============================================================
// guildUI.js — Guild hall panel: rank, GP, missions
// ============================================================
// Shows current guild rank, GP progress, mission board,
// active missions, completed missions. Opened with [G] key.
// ============================================================

export class GuildUI {
  constructor() {
    this._el = null;
    this._created = false;
    this._visible = false;
    this._guildSystem = null;
    this._onClose = null;
    this._currentTab = 'board';
  }

  setGuildSystem(gs) { this._guildSystem = gs; }
  setCallbacks({ onClose }) { this._onClose = onClose; }
  isVisible() { return this._visible; }

  show() {
    if (!this._created) this._create();
    // Auto-refresh mission board if empty
    if (this._guildSystem && this._guildSystem.missionBoard.length === 0) {
      this._guildSystem.refreshMissionBoard(5);
    }
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
    el.id = 'guild-panel';
    el.style.cssText = `
      position:fixed;inset:0;z-index:2900;display:none;
      flex-direction:column;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.88);font-family:'Segoe UI',system-ui,sans-serif;
      backdrop-filter:blur(4px);
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:rgba(30,30,30,0.95);border:1px solid rgba(255,255,255,0.1);
      border-radius:8px;padding:24px 32px;min-width:520px;max-width:640px;
      max-height:82vh;overflow-y:auto;
    `;
    this._box = box;

    el.appendChild(box);
    document.body.appendChild(el);
    this._el = el;
  }

  _refresh() {
    if (!this._guildSystem) return;
    const gs = this._guildSystem;
    const box = this._box;
    box.innerHTML = '';

    // Header: Rank badge + title
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:16px;';
    const rankBadge = document.createElement('div');
    rankBadge.style.cssText = `
      width:48px;height:48px;display:flex;align-items:center;justify-content:center;
      font-size:1.4rem;font-weight:700;border-radius:50%;
      background:${gs.rankColor}22;border:2px solid ${gs.rankColor};
      color:${gs.rankColor};
    `;
    rankBadge.textContent = gs.rankId;
    header.appendChild(rankBadge);

    const titleBlock = document.createElement('div');
    const title = document.createElement('div');
    title.style.cssText = `color:${gs.rankColor};font-size:1.1rem;font-weight:600;`;
    title.textContent = `${gs.rankName} Adventurer`;
    titleBlock.appendChild(title);
    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'color:#999;font-size:0.7rem;';
    subtitle.textContent = `GP: ${gs.guildPoints} | Reputation: ${gs.reputation}`;
    titleBlock.appendChild(subtitle);
    header.appendChild(titleBlock);
    box.appendChild(header);

    // GP Progress bar
    const progress = gs.getProgressToNextRank();
    const progWrap = document.createElement('div');
    progWrap.style.cssText = 'margin-bottom:16px;';
    const progLabel = document.createElement('div');
    progLabel.style.cssText = 'color:#888;font-size:0.65rem;margin-bottom:4px;display:flex;justify-content:space-between;';
    progLabel.innerHTML = `<span>GP Progress</span><span>${gs.guildPoints} / ${progress.needed || 'MAX'}</span>`;
    progWrap.appendChild(progLabel);
    const progBar = document.createElement('div');
    progBar.style.cssText = 'height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;';
    const progFill = document.createElement('div');
    progFill.style.cssText = `height:100%;width:${progress.percent * 100}%;background:${gs.rankColor};transition:width 0.3s;border-radius:3px;`;
    progBar.appendChild(progFill);
    progWrap.appendChild(progBar);
    box.appendChild(progWrap);

    // Tabs
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;';
    const tabs = ['board', 'active', 'completed'];
    for (const tab of tabs) {
      const btn = document.createElement('button');
      const active = tab === this._currentTab;
      const label = tab === 'board' ? `Board (${gs.missionBoard.length})`
        : tab === 'active' ? `Active (${gs.activeMissions.length})`
        : `Done (${gs.completedMissions.length})`;
      btn.textContent = label;
      btn.style.cssText = `
        padding:4px 12px;font-size:0.7rem;cursor:pointer;
        background:${active ? 'rgba(200,150,50,0.2)' : 'transparent'};
        color:${active ? '#ffcc44' : '#888'};
        border:1px solid ${active ? 'rgba(200,150,50,0.4)' : 'rgba(255,255,255,0.1)'};
        font-family:inherit;
      `;
      btn.addEventListener('click', () => { this._currentTab = tab; this._refresh(); });
      tabBar.appendChild(btn);
    }
    // Refresh board button
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.style.cssText = `
      padding:4px 10px;font-size:0.7rem;cursor:pointer;margin-left:auto;
      background:transparent;color:#888;border:1px solid rgba(255,255,255,0.1);font-family:inherit;
    `;
    refreshBtn.addEventListener('click', () => { gs.refreshMissionBoard(5); this._refresh(); });
    tabBar.appendChild(refreshBtn);
    box.appendChild(tabBar);

    // Mission list
    const listWrap = document.createElement('div');
    listWrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-bottom:14px;';

    let missions = [];
    if (this._currentTab === 'board') missions = gs.missionBoard;
    else if (this._currentTab === 'active') missions = gs.activeMissions;
    else missions = gs.completedMissions.slice(-20).reverse();

    if (missions.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#666;font-size:0.85rem;text-align:center;padding:20px;';
      empty.textContent = this._currentTab === 'board' ? 'No missions available. Try refreshing.' : 'No missions.';
      listWrap.appendChild(empty);
    } else {
      for (const m of missions) {
        listWrap.appendChild(this._missionCard(m));
      }
    }
    box.appendChild(listWrap);

    // Close
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close [G]';
    closeBtn.style.cssText = `
      display:block;margin:0 auto;padding:10px 36px;font-size:0.9rem;
      cursor:pointer;background:transparent;color:#aaa;border:1px solid rgba(255,255,255,0.2);
      letter-spacing:0.08em;text-transform:uppercase;transition:all 0.2s;font-family:inherit;
    `;
    closeBtn.addEventListener('mouseenter', () => { closeBtn.style.color = '#fff'; });
    closeBtn.addEventListener('mouseleave', () => { closeBtn.style.color = '#aaa'; });
    closeBtn.addEventListener('click', () => { this.hide(); if (this._onClose) this._onClose(); });
    box.appendChild(closeBtn);
  }

  _missionCard(m) {
    const card = document.createElement('div');
    const tierColors = {
      gathering: '#88cc44', weakHunt: '#44aacc', strongHunt: '#cc6644',
      escort: '#aa88cc', dungeon: '#cc4488', dragonSlaying: '#ffaa22',
      demonAssassination: '#ff4444', kingdomDefense: '#ff2222',
    };
    const tierColor = tierColors[m.tier] || '#888';
    card.style.cssText = `
      background:rgba(40,40,40,0.7);border:1px solid ${tierColor}44;
      padding:10px 14px;transition:all 0.15s;
    `;
    card.addEventListener('mouseenter', () => { card.style.borderColor = tierColor; });
    card.addEventListener('mouseleave', () => { card.style.borderColor = tierColor + '44'; });

    // Title row
    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;';
    const titleEl = document.createElement('div');
    titleEl.style.cssText = `color:#eee;font-size:0.85rem;font-weight:600;`;
    titleEl.textContent = m.title;
    titleRow.appendChild(titleEl);
    const tierBadge = document.createElement('span');
    tierBadge.style.cssText = `color:${tierColor};font-size:0.55rem;padding:2px 6px;border:1px solid ${tierColor}66;letter-spacing:0.05em;`;
    tierBadge.textContent = (m.tier || '').toUpperCase();
    titleRow.appendChild(tierBadge);
    card.appendChild(titleRow);

    // Description
    const desc = document.createElement('div');
    desc.style.cssText = 'color:#999;font-size:0.7rem;margin-bottom:6px;line-height:1.3;';
    desc.textContent = m.description;
    card.appendChild(desc);

    // Progress (if active)
    if (m.status === 'active') {
      const pct = m.requiredCount > 0 ? m.currentCount / m.requiredCount : 0;
      const bar = document.createElement('div');
      bar.style.cssText = 'height:4px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;margin-bottom:4px;';
      const fill = document.createElement('div');
      fill.style.cssText = `height:100%;width:${pct * 100}%;background:${tierColor};border-radius:2px;`;
      bar.appendChild(fill);
      card.appendChild(bar);
      const progText = document.createElement('div');
      progText.style.cssText = 'color:#aaa;font-size:0.6rem;';
      progText.textContent = `${m.currentCount} / ${m.requiredCount}`;
      card.appendChild(progText);
    }

    // Rewards
    const rewards = document.createElement('div');
    rewards.style.cssText = 'display:flex;gap:10px;margin-top:4px;';
    if (m.gpReward) {
      const gp = document.createElement('span');
      gp.style.cssText = 'color:#ffcc44;font-size:0.6rem;';
      gp.textContent = `+${m.gpReward} GP`;
      rewards.appendChild(gp);
    }
    if (m.goldReward) {
      const gold = document.createElement('span');
      gold.style.cssText = 'color:#ffdd44;font-size:0.6rem;';
      gold.textContent = `+${m.goldReward} Gold`;
      rewards.appendChild(gold);
    }
    card.appendChild(rewards);

    // Action buttons
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;margin-top:6px;';
    if (m.status === 'available' && this._currentTab === 'board') {
      const acceptBtn = document.createElement('button');
      acceptBtn.textContent = 'Accept';
      acceptBtn.style.cssText = `
        padding:3px 12px;font-size:0.65rem;cursor:pointer;
        background:rgba(100,200,100,0.15);color:#88ff88;
        border:1px solid rgba(100,200,100,0.4);font-family:inherit;
      `;
      acceptBtn.addEventListener('click', () => {
        this._guildSystem.acceptMission(m.id);
        this._refresh();
      });
      actions.appendChild(acceptBtn);
    }
    if (m.status === 'active') {
      const abandonBtn = document.createElement('button');
      abandonBtn.textContent = 'Abandon';
      abandonBtn.style.cssText = `
        padding:3px 12px;font-size:0.65rem;cursor:pointer;
        background:rgba(200,80,80,0.15);color:#ff8888;
        border:1px solid rgba(200,80,80,0.4);font-family:inherit;
      `;
      abandonBtn.addEventListener('click', () => {
        this._guildSystem.abandonMission(m.id);
        this._refresh();
      });
      actions.appendChild(abandonBtn);
    }
    if (actions.children.length > 0) card.appendChild(actions);

    return card;
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    this._created = false;
  }
}

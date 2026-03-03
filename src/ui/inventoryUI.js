// ============================================================
// inventoryUI.js — Inventory & equipment panel
// ============================================================
// Shows inventory items in a grid, equipment slots, and gold.
// Opened with [I] key or pause menu.
// ============================================================

export class InventoryUI {
  constructor() {
    this._el = null;
    this._created = false;
    this._visible = false;
    this._inventorySystem = null;
    this._profile = null;
    this._onClose = null;
    this._currentTab = 'all';
  }

  setInventorySystem(inv) { this._inventorySystem = inv; }
  setProfile(p) { this._profile = p; }
  setCallbacks({ onClose }) { this._onClose = onClose; }
  isVisible() { return this._visible; }

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
    el.id = 'inventory-panel';
    el.style.cssText = `
      position:fixed;inset:0;z-index:2800;display:none;
      flex-direction:column;align-items:center;justify-content:center;
      background:radial-gradient(circle at 50% 28%,rgba(18,28,18,0.74),rgba(0,0,0,0.9));
      font-family:'Segoe UI',system-ui,sans-serif;backdrop-filter:blur(6px);
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:rgba(24,28,24,0.96);border:1px solid rgba(130,190,130,0.2);
      border-radius:10px;padding:20px 22px 18px;min-width:560px;max-width:740px;
      max-height:84vh;overflow-y:auto;box-shadow:0 14px 34px rgba(0,0,0,0.45);
    `;
    this._box = box;

    // Title + Gold
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
    const title = document.createElement('h2');
    title.textContent = 'INVENTORY';
    title.style.cssText = 'color:#cfe8cf;font-size:1.25rem;font-weight:300;letter-spacing:0.12em;margin:0;';
    header.appendChild(title);
    this._goldLabel = document.createElement('div');
    this._goldLabel.style.cssText = 'color:#ffd96a;font-size:0.9rem;font-family:monospace;background:rgba(255,210,100,0.08);padding:4px 8px;border:1px solid rgba(255,210,100,0.22);border-radius:6px;';
    header.appendChild(this._goldLabel);
    box.appendChild(header);

    // Tab bar
    this._tabBar = document.createElement('div');
    this._tabBar.style.cssText = 'display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;';
    box.appendChild(this._tabBar);

    // Equipment slots
    this._equipSection = document.createElement('div');
    this._equipSection.style.cssText = 'margin-bottom:14px;';
    box.appendChild(this._equipSection);

    // Item grid
    this._itemGrid = document.createElement('div');
    this._itemGrid.style.cssText = 'display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:14px;';
    box.appendChild(this._itemGrid);

    // Item detail
    this._detailBox = document.createElement('div');
    this._detailBox.style.cssText = 'background:rgba(36,42,36,0.9);border:1px solid rgba(130,190,130,0.2);border-radius:8px;padding:12px;display:none;margin-bottom:14px;';
    box.appendChild(this._detailBox);

    // Close
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close [I]';
    closeBtn.style.cssText = `
      display:block;margin:2px auto 0;padding:10px 36px;font-size:0.9rem;
      cursor:pointer;background:rgba(18,24,18,0.75);color:#c5d0c5;border:1px solid rgba(140,190,140,0.24);
      border-radius:6px;letter-spacing:0.08em;text-transform:uppercase;transition:all 0.2s;font-family:inherit;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#f1fff1';
      closeBtn.style.borderColor = 'rgba(140,220,140,0.45)';
      closeBtn.style.background = 'rgba(70,120,70,0.2)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#c5d0c5';
      closeBtn.style.borderColor = 'rgba(140,190,140,0.24)';
      closeBtn.style.background = 'rgba(18,24,18,0.75)';
    });
    closeBtn.addEventListener('click', () => { this.hide(); if (this._onClose) this._onClose(); });
    box.appendChild(closeBtn);

    el.appendChild(box);
    document.body.appendChild(el);
    this._el = el;
  }

  _refresh() {
    if (!this._inventorySystem) return;
    const inv = this._inventorySystem;

    // Gold
    this._goldLabel.textContent = `Gold: ${inv.data ? inv.data.gold || 0 : 0}`;

    // Tabs
    this._tabBar.innerHTML = '';
    const categories = ['all', 'weapon', 'armor', 'consumable', 'material', 'quest'];
    for (const cat of categories) {
      const btn = document.createElement('button');
      const active = cat === this._currentTab;
      btn.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
      btn.style.cssText = `
        padding:5px 12px;font-size:0.72rem;cursor:pointer;border-radius:6px;
        background:${active ? 'rgba(100,200,100,0.22)' : 'rgba(25,30,25,0.7)'};
        color:${active ? '#adffad' : '#93a093'};
        border:1px solid ${active ? 'rgba(100,200,100,0.45)' : 'rgba(255,255,255,0.1)'};
        font-family:inherit;
      `;
      btn.addEventListener('click', () => { this._currentTab = cat; this._refresh(); });
      this._tabBar.appendChild(btn);
    }

    // Equipment section
    this._equipSection.innerHTML = '';
    const equipTitle = document.createElement('div');
    equipTitle.style.cssText = 'color:#999;font-size:0.7rem;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:6px;';
    equipTitle.textContent = 'EQUIPPED';
    this._equipSection.appendChild(equipTitle);
    const equipGrid = document.createElement('div');
    equipGrid.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    const slots = ['weapon', 'head', 'chest', 'legs', 'feet', 'accessory'];
    const equipped = (inv.data && inv.data.equipped) ? inv.data.equipped : {};
    for (const slot of slots) {
      const el = document.createElement('div');
      const item = equipped[slot];
      el.style.cssText = `
        width:58px;height:58px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;
        background:${item ? 'rgba(100,200,100,0.12)' : 'rgba(32,36,32,0.7)'};
        border:1px solid ${item ? 'rgba(100,200,100,0.32)' : 'rgba(255,255,255,0.1)'};
        border-radius:7px;
        cursor:pointer;
      `;
      const icon = document.createElement('div');
      icon.style.cssText = 'font-size:0.7rem;color:#aaa;';
      icon.textContent = item ? (item.name || item.id || slot) : slot;
      el.appendChild(icon);
      if (item) {
        el.addEventListener('click', () => {
          if (inv.unequip) inv.unequip(slot);
          this._refresh();
        });
        el.title = `Click to unequip ${item.name || item.id}`;
      }
      equipGrid.appendChild(el);
    }
    this._equipSection.appendChild(equipGrid);

    // Items grid
    this._itemGrid.innerHTML = '';
    let items = (inv.data && inv.data.items) ? inv.data.items : [];
    if (this._currentTab !== 'all') {
      items = items.filter(i => (i.category || i.type || '').toLowerCase() === this._currentTab);
    }

    if (items.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'grid-column:1/-1;color:#666;font-size:0.85rem;text-align:center;padding:20px;';
      empty.textContent = 'No items found.';
      this._itemGrid.appendChild(empty);
    } else {
      for (const item of items) {
        const cell = document.createElement('div');
        const rarityColor = this._rarityColor(item.rarity);
        cell.style.cssText = `
          background:rgba(30,36,30,0.86);border:1px solid ${rarityColor}44;
          border-radius:7px;padding:7px 6px;cursor:pointer;display:flex;flex-direction:column;
          align-items:center;justify-content:center;min-height:70px;
          transition:all 0.15s;
        `;
        cell.addEventListener('mouseenter', () => { cell.style.borderColor = rarityColor; });
        cell.addEventListener('mouseleave', () => { cell.style.borderColor = rarityColor + '44'; });

        const name = document.createElement('div');
        name.style.cssText = `color:${rarityColor};font-size:0.65rem;text-align:center;font-weight:600;`;
        name.textContent = item.name || item.id;
        cell.appendChild(name);

        if (item.quantity > 1) {
          const qty = document.createElement('div');
          qty.style.cssText = 'color:#888;font-size:0.55rem;margin-top:2px;';
          qty.textContent = `x${item.quantity}`;
          cell.appendChild(qty);
        }

        cell.addEventListener('click', () => this._showDetail(item));
        this._itemGrid.appendChild(cell);
      }
    }
  }

  _showDetail(item) {
    this._detailBox.style.display = 'block';
    this._detailBox.innerHTML = '';
    const rarityColor = this._rarityColor(item.rarity);

    const name = document.createElement('div');
    name.style.cssText = `color:${rarityColor};font-size:0.95rem;font-weight:600;margin-bottom:4px;`;
    name.textContent = `${item.name || item.id} ${item.quantity > 1 ? `(x${item.quantity})` : ''}`;
    this._detailBox.appendChild(name);

    const rarity = document.createElement('span');
    rarity.style.cssText = `color:${rarityColor};font-size:0.65rem;letter-spacing:0.08em;`;
    rarity.textContent = (item.rarity || 'common').toUpperCase();
    this._detailBox.appendChild(rarity);

    if (item.description) {
      const desc = document.createElement('div');
      desc.style.cssText = 'color:#999;font-size:0.75rem;margin-top:6px;line-height:1.3;';
      desc.textContent = item.description;
      this._detailBox.appendChild(desc);
    }

    // Stats
    if (item.stats) {
      const statsDiv = document.createElement('div');
      statsDiv.style.cssText = 'margin-top:6px;';
      for (const [k, v] of Object.entries(item.stats)) {
        const s = document.createElement('div');
        s.style.cssText = 'color:#88cc88;font-size:0.7rem;';
        s.textContent = `+${v} ${k}`;
        statsDiv.appendChild(s);
      }
      this._detailBox.appendChild(statsDiv);
    }

    // Action buttons
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:6px;margin-top:8px;';

    if (item.equippable || item.type === 'weapon' || item.type === 'armor' || item.category === 'weapon' || item.category === 'armor') {
      const equipBtn = this._actionBtn('Equip', () => {
        if (this._inventorySystem && this._inventorySystem.equip) {
          this._inventorySystem.equip(item.id || item.itemId);
          this._refresh();
        }
      });
      actions.appendChild(equipBtn);
    }

    if (item.consumable || item.type === 'consumable' || item.category === 'consumable') {
      const useBtn = this._actionBtn('Use', () => {
        if (this._inventorySystem && this._inventorySystem.useItem) {
          this._inventorySystem.useItem(item.id || item.itemId);
          this._refresh();
        }
      });
      actions.appendChild(useBtn);
    }
    this._detailBox.appendChild(actions);
  }

  _actionBtn(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding:5px 14px;font-size:0.7rem;cursor:pointer;border-radius:6px;
      background:rgba(100,200,100,0.15);color:#88ff88;
      border:1px solid rgba(100,200,100,0.4);font-family:inherit;
    `;
    btn.addEventListener('click', onClick);
    return btn;
  }

  _rarityColor(rarity) {
    const colors = {
      common: '#aaaaaa', uncommon: '#44cc44', rare: '#4488ff',
      epic: '#aa44ff', legendary: '#ffaa44', mythic: '#ff4488',
    };
    return colors[(rarity || 'common').toLowerCase()] || '#aaaaaa';
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    this._created = false;
  }
}

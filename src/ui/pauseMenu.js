// ============================================================
// pauseMenu.js — ESC pause menu overlay with Save button
// ============================================================

/**
 * Pause menu shown when ESC is pressed during gameplay.
 * - Resume
 * - Save Game
 * - Settings (placeholder)
 * - Quit to Main Menu
 */
export class PauseMenu {
  constructor() {
    this._el = null;
    this._created = false;
    this._visible = false;
    this._onResume = null;
    this._onSave = null;
    this._onSettings = null;
    this._onQuit = null;
    this._saveStatus = null;
    this._gameMode = 'singleplayer';
    this._switchModeBtn = null;
  }

  setCallbacks({ onResume, onSave, onSettings, onQuit, onProfile, onShop, onSwitchMode, onQuests, onInventory, onGuild, onMap }) {
    this._onResume = onResume;
    this._onSave = onSave;
    this._onSettings = onSettings;
    this._onQuit = onQuit;
    this._onProfile = onProfile;
    this._onShop = onShop;
    this._onSwitchMode = onSwitchMode;
    this._onQuests = onQuests;
    this._onInventory = onInventory;
    this._onGuild = onGuild;
    this._onMap = onMap;
  }

  setGameMode(mode) {
    this._gameMode = mode;
    this._updateSwitchModeText();
  }

  toggle() {
    if (this._visible) this.hide();
    else this.show();
  }

  show() {
    if (!this._created) this._create();
    this._visible = true;
    this._el.style.display = 'flex';
    // Exit pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  hide() {
    if (this._el) {
      this._el.style.display = 'none';
    }
    this._visible = false;
  }

  isVisible() {
    return this._visible;
  }

  _create() {
    this._created = true;
    const el = document.createElement('div');
    el.id = 'pause-menu';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 2500;
      display: none; flex-direction: column; align-items: center; justify-content: center;
      background: radial-gradient(circle at 50% 30%, rgba(20,28,20,0.78), rgba(0,0,0,0.88));
      font-family: 'Segoe UI', system-ui, sans-serif;
      backdrop-filter: blur(6px);
    `;

    const panel = document.createElement('div');
    panel.style.cssText = `
      width: 360px; max-width: calc(100vw - 32px);
      background: rgba(16, 22, 16, 0.82);
      border: 1px solid rgba(130, 190, 130, 0.22);
      border-radius: 10px;
      box-shadow: 0 14px 30px rgba(0,0,0,0.45);
      padding: 22px 18px 18px;
      display: flex; flex-direction: column; align-items: center;
    `;

    const title = document.createElement('h2');
    title.textContent = 'PAUSED';
    title.style.cssText = `
      color: #e8efe8; font-size: 2.1rem; font-weight: 250;
      letter-spacing: 0.15em; text-transform: uppercase;
      margin: 0 0 8px 0;
    `;
    panel.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.textContent = 'Game paused — choose an option';
    subtitle.style.cssText = 'color:#95a595;font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:14px;';
    panel.appendChild(subtitle);

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;flex-direction:column;gap:8px;align-items:center;width:100%;';

    // Resume
    btnContainer.appendChild(this._createButton('Resume', () => {
      this.hide();
      if (this._onResume) this._onResume();
    }));

    // Save Game
    const saveBtn = this._createButton('Save Game', async () => {
      if (this._onSave) {
        this._showSaveStatus('Saving...');
        try {
          await this._onSave();
          this._showSaveStatus('Game Saved!');
          setTimeout(() => this._showSaveStatus(''), 2000);
        } catch (e) {
          this._showSaveStatus('Save failed!');
          setTimeout(() => this._showSaveStatus(''), 2000);
        }
      }
    });
    btnContainer.appendChild(saveBtn);

    // Save status text
    this._saveStatus = document.createElement('div');
    this._saveStatus.style.cssText = 'color: #9cdf9c; font-size: 0.78rem; height: 18px; margin: -2px 0 2px; letter-spacing:0.02em;';
    btnContainer.appendChild(this._saveStatus);

    // Profile
    btnContainer.appendChild(this._createButton('Profile [P]', () => {
      this.hide();
      if (this._onProfile) this._onProfile();
    }));

    // Shop
    btnContainer.appendChild(this._createButton('Shop [B]', () => {
      this.hide();
      if (this._onShop) this._onShop();
    }));

    // Quests
    btnContainer.appendChild(this._createButton('Quests [Q]', () => {
      this.hide();
      if (this._onQuests) this._onQuests();
    }));

    // Inventory
    btnContainer.appendChild(this._createButton('Inventory [I]', () => {
      this.hide();
      if (this._onInventory) this._onInventory();
    }));

    // Guild
    btnContainer.appendChild(this._createButton('Guild [G]', () => {
      this.hide();
      if (this._onGuild) this._onGuild();
    }));

    // Map
    btnContainer.appendChild(this._createButton('Map [M]', () => {
      this.hide();
      if (this._onMap) this._onMap();
    }));

    // Settings
    btnContainer.appendChild(this._createButton('Settings', () => {
      if (this._onSettings) this._onSettings();
    }));

    // Switch Mode (singleplayer <-> multiplayer)
    this._switchModeBtn = this._createButton('Switch Mode', () => {
      this.hide();
      if (this._onSwitchMode) this._onSwitchMode();
    });
    btnContainer.appendChild(this._switchModeBtn);
    this._updateSwitchModeText();

    // Quit to Menu
    btnContainer.appendChild(this._createButton('Quit to Menu', () => {
      this.hide();
      if (this._onQuit) this._onQuit();
    }));

    panel.appendChild(btnContainer);
    el.appendChild(panel);
    document.body.appendChild(el);
    this._el = el;
  }

  _showSaveStatus(text) {
    if (this._saveStatus) this._saveStatus.textContent = text;
  }

  _updateSwitchModeText() {
    if (!this._switchModeBtn) return;
    const current = this._gameMode === 'singleplayer' ? 'Solo' : 'Multi';
    const target = this._gameMode === 'singleplayer' ? 'Multiplayer' : 'Singleplayer';
    this._switchModeBtn.textContent = `Switch to ${target} (${current})`;
  }

  _createButton(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      width: 100%; padding: 11px 12px; font-size: 0.97rem;
      cursor: pointer; background: rgba(18, 24, 18, 0.72);
      color: #c9d2c9; border: 1px solid rgba(150,190,150,0.18);
      border-radius: 6px;
      letter-spacing: 0.08em; text-transform: uppercase;
      transition: all 0.22s ease; font-family: inherit;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(70,120,70,0.22)';
      btn.style.color = '#f0fff0';
      btn.style.borderColor = 'rgba(140,220,140,0.45)';
      btn.style.transform = 'translateY(-1px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(18, 24, 18, 0.72)';
      btn.style.color = '#c9d2c9';
      btn.style.borderColor = 'rgba(150,190,150,0.18)';
      btn.style.transform = 'translateY(0)';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  dispose() {
    if (this._el) {
      this._el.remove();
      this._el = null;
    }
    this._created = false;
    this._visible = false;
  }
}

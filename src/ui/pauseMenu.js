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
      background: rgba(0, 0, 0, 0.75);
      font-family: 'Segoe UI', system-ui, sans-serif;
      backdrop-filter: blur(4px);
    `;

    const title = document.createElement('h2');
    title.textContent = 'PAUSED';
    title.style.cssText = `
      color: #ffffff; font-size: 2.2rem; font-weight: 200;
      letter-spacing: 0.15em; text-transform: uppercase;
      margin-bottom: 2rem;
    `;
    el.appendChild(title);

    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;flex-direction:column;gap:10px;align-items:center;';

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
    this._saveStatus.style.cssText = 'color: #88ff88; font-size: 0.85rem; height: 20px; margin-top: -5px;';
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

    el.appendChild(btnContainer);
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
      width: 200px; padding: 12px 0; font-size: 1rem;
      cursor: pointer; background: transparent;
      color: #cccccc; border: 1px solid rgba(255,255,255,0.2);
      letter-spacing: 0.08em; text-transform: uppercase;
      transition: all 0.3s ease; font-family: inherit;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255,255,255,0.1)';
      btn.style.color = '#ffffff';
      btn.style.borderColor = 'rgba(255,255,255,0.5)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color = '#cccccc';
      btn.style.borderColor = 'rgba(255,255,255,0.2)';
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

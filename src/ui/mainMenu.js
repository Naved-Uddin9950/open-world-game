// ============================================================
// mainMenu.js — Main menu with Continue / New Game / Settings
// ============================================================

/**
 * Full-screen main menu shown on game start.
 * - Continue (only if save exists and not game-over)
 * - New Game
 * - Settings (placeholder)
 */
export class MainMenu {
  constructor() {
    this._el = null;
    this._created = false;
    this._onContinue = null;
    this._onNewGame = null;
    this._onSettings = null;
    this._canContinue = false;
  }

  /**
   * @param {object} callbacks
   * @param {boolean} canContinue  Whether a save exists
   */
  setCallbacks({ onContinue, onNewGame, onSettings }) {
    this._onContinue = onContinue;
    this._onNewGame = onNewGame;
    this._onSettings = onSettings;
  }

  setCanContinue(val) {
    this._canContinue = val;
    if (this._continueBtn) {
      this._continueBtn.style.opacity = val ? '1' : '0.3';
      this._continueBtn.style.pointerEvents = val ? 'auto' : 'none';
    }
  }

  show() {
    if (!this._created) this._create();
    this._el.style.display = 'flex';
    // Exit pointer lock if active
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
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
    el.id = 'main-menu';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 3000;
      display: none; flex-direction: column; align-items: center; justify-content: center;
      background: linear-gradient(135deg, rgba(0,20,10,0.95), rgba(0,0,0,0.98));
      font-family: 'Segoe UI', system-ui, sans-serif;
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = 'OPEN WORLD';
    title.style.cssText = `
      color: #aaddaa; font-size: 3.5rem; font-weight: 200;
      letter-spacing: 0.2em; text-transform: uppercase;
      margin-bottom: 0.3rem; text-shadow: 0 0 40px rgba(100,200,100,0.3);
    `;
    el.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'A Wilderness Adventure';
    subtitle.style.cssText = `
      color: rgba(140,180,140,0.6); font-size: 1rem;
      letter-spacing: 0.15em; margin-bottom: 3rem;
    `;
    el.appendChild(subtitle);

    // Menu buttons container
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'display:flex;flex-direction:column;gap:12px;align-items:center;';

    // Continue button
    this._continueBtn = this._createButton('Continue', () => {
      if (this._canContinue && this._onContinue) {
        this.hide();
        this._onContinue();
      }
    });
    this._continueBtn.style.opacity = this._canContinue ? '1' : '0.3';
    this._continueBtn.style.pointerEvents = this._canContinue ? 'auto' : 'none';
    btnContainer.appendChild(this._continueBtn);

    // New Game button
    const newGameBtn = this._createButton('New Game', () => {
      this.hide();
      if (this._onNewGame) this._onNewGame();
    });
    btnContainer.appendChild(newGameBtn);

    // Settings button
    const settingsBtn = this._createButton('Settings', () => {
      if (this._onSettings) this._onSettings();
    });
    btnContainer.appendChild(settingsBtn);

    el.appendChild(btnContainer);

    // Controls info at bottom
    const controls = document.createElement('div');
    controls.style.cssText = `
      position: absolute; bottom: 30px; text-align: center;
      color: rgba(255,255,255,0.3); font-size: 0.8rem; line-height: 1.8;
    `;
    controls.innerHTML = `
      WASD — Move &nbsp;|&nbsp; Mouse — Look &nbsp;|&nbsp; Shift — Sprint<br>
      Space — Jump &nbsp;|&nbsp; Enter — Attack &nbsp;|&nbsp; ESC — Pause Menu
    `;
    el.appendChild(controls);

    document.body.appendChild(el);
    this._el = el;
  }

  _createButton(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      width: 220px; padding: 14px 0; font-size: 1.1rem;
      cursor: pointer; background: transparent;
      color: #88cc88; border: 1px solid rgba(100,180,100,0.3);
      letter-spacing: 0.1em; text-transform: uppercase;
      transition: all 0.3s ease; font-family: inherit;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(100,200,100,0.15)';
      btn.style.color = '#ffffff';
      btn.style.borderColor = 'rgba(100,200,100,0.6)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color = '#88cc88';
      btn.style.borderColor = 'rgba(100,180,100,0.3)';
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
  }
}

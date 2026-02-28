// ============================================================
// gameOverScreen.js — Game over overlay when player dies
// ============================================================

/**
 * Shows a full-screen game over overlay.
 * Provides "Respawn" (new game) button.
 */
export class GameOverScreen {
  constructor() {
    this._el = null;
    this._onNewGame = null;
    this._created = false;
  }

  /**
   * @param {Function} onNewGame  Called when player clicks New Game
   */
  setCallbacks({ onNewGame }) {
    this._onNewGame = onNewGame;
  }

  show() {
    if (!this._created) this._create();
    this._el.style.display = 'flex';
    // Exit pointer lock
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
  }

  _create() {
    this._created = true;
    const el = document.createElement('div');
    el.id = 'game-over-screen';
    el.style.cssText = `
      position: fixed; inset: 0; z-index: 2000;
      display: none; flex-direction: column; align-items: center; justify-content: center;
      background: rgba(80, 0, 0, 0.85);
      font-family: 'Segoe UI', system-ui, sans-serif;
      animation: fadeIn 0.5s ease;
    `;

    const title = document.createElement('h1');
    title.textContent = 'YOU DIED';
    title.style.cssText = `
      color: #ff3333; font-size: 4rem; font-weight: 300;
      letter-spacing: 0.15em; text-transform: uppercase;
      margin-bottom: 1rem; text-shadow: 0 0 30px rgba(255,0,0,0.5);
    `;
    el.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.textContent = 'The wilderness claimed another soul...';
    subtitle.style.cssText = 'color: rgba(255,200,200,0.7); font-size: 1.1rem; margin-bottom: 2rem;';
    el.appendChild(subtitle);

    const btn = document.createElement('button');
    btn.textContent = 'New Game';
    btn.style.cssText = `
      padding: 12px 40px; font-size: 1.1rem; cursor: pointer;
      background: transparent; color: #ff6666; border: 1px solid #ff4444;
      letter-spacing: 0.1em; text-transform: uppercase;
      transition: all 0.3s ease;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255,50,50,0.2)';
      btn.style.color = '#ffffff';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.color = '#ff6666';
    });
    btn.addEventListener('click', () => {
      this.hide();
      if (this._onNewGame) this._onNewGame();
    });
    el.appendChild(btn);

    document.body.appendChild(el);
    this._el = el;
  }

  dispose() {
    if (this._el) {
      this._el.remove();
      this._el = null;
    }
    this._created = false;
  }
}

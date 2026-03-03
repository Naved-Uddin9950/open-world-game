// ============================================================
// settingsPanel.js — Graphics / gameplay settings UI
// ============================================================

/**
 * Graphics quality presets and toggles.
 * Exposed as a singleton-style settings object the engine reads each frame.
 */

const PRESETS = {
  VERY_LOW: {
    label: 'Very Low',
    resolution: 0.35,
    shadows: false,
    grass: false,
    trees: false,
    renderDist: 1,
    terrainSegHigh: 12,
    terrainSegMed: 6,
    terrainSegLow: 3,
    maxTreesPerChunk: 0,
    maxGrassPerChunk: 0,
    maxRocksPerChunk: 0,
    maxAnimalsPerChunk: 3,
    grassRenderDist: 0,
    fogNear: 20,
    fogFar: 80,
    animalUpdateRate: 5,
    waterQuality: 0,
  },
  LOW: {
    label: 'Low',
    resolution: 0.5,
    shadows: false,
    grass: false,
    trees: true,
    renderDist: 2,
    terrainSegHigh: 24,
    terrainSegMed: 8,
    terrainSegLow: 4,
    maxTreesPerChunk: 20,
    maxGrassPerChunk: 0,
    maxRocksPerChunk: 8,
    maxAnimalsPerChunk: 6,
    grassRenderDist: 0,
    fogNear: 40,
    fogFar: 150,
    animalUpdateRate: 3, // update every N frames
    waterQuality: 0,     // 0=simple color, 1=transparent
  },
  MEDIUM: {
    label: 'Medium',
    resolution: 0.75,
    shadows: true,
    grass: true,
    trees: true,
    renderDist: 3,
    terrainSegHigh: 32,
    terrainSegMed: 10,
    terrainSegLow: 4,
    maxTreesPerChunk: 40,
    maxGrassPerChunk: 120,
    maxRocksPerChunk: 15,
    maxAnimalsPerChunk: 12,
    grassRenderDist: 35,
    fogNear: 50,
    fogFar: 200,
    animalUpdateRate: 2,
    waterQuality: 1,
  },
  HIGH: {
    label: 'High',
    resolution: 1.0,
    shadows: true,
    grass: true,
    trees: true,
    renderDist: 4,
    terrainSegHigh: 48,
    terrainSegMed: 12,
    terrainSegLow: 4,
    maxTreesPerChunk: 60,
    maxGrassPerChunk: 200,
    maxRocksPerChunk: 20,
    maxAnimalsPerChunk: 18,
    grassRenderDist: 45,
    fogNear: 60,
    fogFar: 250,
    animalUpdateRate: 1,
    waterQuality: 1,
  },
  ULTRA: {
    label: 'Ultra',
    resolution: 1.0,
    shadows: true,
    grass: true,
    trees: true,
    renderDist: 5,
    terrainSegHigh: 48,
    terrainSegMed: 16,
    terrainSegLow: 6,
    maxTreesPerChunk: 80,
    maxGrassPerChunk: 250,
    maxRocksPerChunk: 25,
    maxAnimalsPerChunk: 24,
    grassRenderDist: 55,
    fogNear: 80,
    fogFar: 350,
    animalUpdateRate: 1,
    waterQuality: 1,
  },
};

const SETTINGS_STORAGE_KEY = 'openworld_graphics_settings';

export class SettingsPanel {
  constructor() {
    this._el = null;
    this._created = false;
    this._visible = false;
    this._currentPreset = 'MEDIUM';
    this._settings = { ...PRESETS.MEDIUM };
    this._onChange = null; // callback when settings change
    this._onClose = null;

    // Load persisted settings
    this._loadPersisted();
  }

  /** @returns {object} current resolved settings */
  get current() { return this._settings; }
  get presetName() { return this._currentPreset; }

  setCallbacks({ onChange, onClose }) {
    this._onChange = onChange;
    this._onClose = onClose;
  }

  show() {
    if (!this._created) this._create();
    this._el.style.display = 'flex';
    this._visible = true;
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
    this._visible = false;
  }

  isVisible() { return this._visible; }

  applyPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    this._currentPreset = name;
    this._settings = { ...p };
    this._persist();
    this._notify();
    if (this._created) this._updateUI();
  }

  _notify() {
    this._persist();
    if (this._onChange) this._onChange(this._settings);
  }

  /** Save current settings to localStorage. */
  _persist() {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
        preset: this._currentPreset,
        settings: this._settings,
      }));
    } catch { /* quota exceeded or private mode */ }
  }

  /** Load settings from localStorage. */
  _loadPersisted() {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.preset && PRESETS[saved.preset]) {
        this._currentPreset = saved.preset;
        this._settings = { ...PRESETS[saved.preset], ...(saved.settings || {}) };
      } else if (saved.settings) {
        this._currentPreset = 'CUSTOM';
        this._settings = { ...PRESETS.MEDIUM, ...saved.settings };
      }
    } catch { /* corrupted data, use defaults */ }
  }

  _create() {
    this._created = true;

    const el = document.createElement('div');
    el.id = 'settings-panel';
    el.style.cssText = `
      position:fixed;inset:0;z-index:2600;display:none;
      flex-direction:column;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.85);font-family:'Segoe UI',system-ui,sans-serif;
      backdrop-filter:blur(4px);
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:rgba(30,30,30,0.95);border:1px solid rgba(255,255,255,0.1);
      border-radius:8px;padding:24px 32px;min-width:340px;max-width:420px;
      max-height:80vh;overflow-y:auto;
    `;

    // Title
    const title = document.createElement('h2');
    title.textContent = 'SETTINGS';
    title.style.cssText = 'color:#fff;font-size:1.4rem;font-weight:300;letter-spacing:0.12em;margin-bottom:20px;text-align:center;';
    box.appendChild(title);

    // Preset selector
    box.appendChild(this._label('Graphics Preset'));
    this._presetBtns = {};
    const presetRow = document.createElement('div');
    presetRow.style.cssText = 'display:flex;gap:6px;margin-bottom:16px;';
    for (const key of Object.keys(PRESETS)) {
      const btn = document.createElement('button');
      btn.textContent = PRESETS[key].label;
      btn.dataset.preset = key;
      btn.style.cssText = this._btnStyle(key === this._currentPreset);
      btn.addEventListener('click', () => this.applyPreset(key));
      presetRow.appendChild(btn);
      this._presetBtns[key] = btn;
    }
    box.appendChild(presetRow);

    // Divider
    box.appendChild(this._divider());

    // Individual toggles
    this._shadowToggle = this._toggle('Shadows', this._settings.shadows, (v) => {
      this._settings.shadows = v; this._currentPreset = 'CUSTOM'; this._notify();
    });
    box.appendChild(this._shadowToggle.row);

    this._grassToggle = this._toggle('Grass', this._settings.grass, (v) => {
      this._settings.grass = v; this._currentPreset = 'CUSTOM'; this._notify();
    });
    box.appendChild(this._grassToggle.row);

    // Render distance slider
    this._rdSlider = this._slider('Render Distance', 1, 6, this._settings.renderDist, (v) => {
      this._settings.renderDist = v; this._currentPreset = 'CUSTOM'; this._notify();
    });
    box.appendChild(this._rdSlider.row);

    // Resolution slider
    this._resSlider = this._slider('Resolution', 0.3, 1.0, this._settings.resolution, (v) => {
      this._settings.resolution = Math.round(v * 100) / 100;
      this._currentPreset = 'CUSTOM'; this._notify();
    }, 0.05);
    box.appendChild(this._resSlider.row);

    // Fog distance slider
    this._fogSlider = this._slider('View Distance', 80, 400, this._settings.fogFar, (v) => {
      this._settings.fogFar = Math.round(v);
      this._settings.fogNear = Math.round(v * 0.3);
      this._currentPreset = 'CUSTOM'; this._notify();
    }, 10);
    box.appendChild(this._fogSlider.row);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Back';
    closeBtn.style.cssText = `
      display:block;margin:20px auto 0;padding:10px 40px;font-size:0.95rem;
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

  _updateUI() {
    // Highlight active preset
    for (const [key, btn] of Object.entries(this._presetBtns)) {
      btn.style.cssText = this._btnStyle(key === this._currentPreset);
    }
    // Update toggles
    if (this._shadowToggle) this._shadowToggle.set(this._settings.shadows);
    if (this._grassToggle) this._grassToggle.set(this._settings.grass);
    if (this._rdSlider) this._rdSlider.set(this._settings.renderDist);
    if (this._resSlider) this._resSlider.set(this._settings.resolution);
    if (this._fogSlider) this._fogSlider.set(this._settings.fogFar);
  }

  _btnStyle(active) {
    return `flex:1;padding:8px 4px;font-size:0.8rem;cursor:pointer;font-family:inherit;
      letter-spacing:0.06em;text-transform:uppercase;transition:all 0.2s;
      border:1px solid ${active ? 'rgba(100,200,100,0.6)' : 'rgba(255,255,255,0.15)'};
      background:${active ? 'rgba(100,200,100,0.2)' : 'transparent'};
      color:${active ? '#fff' : '#888'};`;
  }

  _label(text) {
    const l = document.createElement('div');
    l.textContent = text;
    l.style.cssText = 'color:#999;font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;';
    return l;
  }

  _divider() {
    const d = document.createElement('div');
    d.style.cssText = 'border-top:1px solid rgba(255,255,255,0.08);margin:12px 0;';
    return d;
  }

  _toggle(label, initial, onChange) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;';

    const lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.cssText = 'color:#ccc;font-size:0.9rem;';
    row.appendChild(lbl);

    const btn = document.createElement('button');
    let value = initial;
    const update = () => {
      btn.textContent = value ? 'ON' : 'OFF';
      btn.style.color = value ? '#88ff88' : '#ff8888';
    };
    btn.style.cssText = 'background:transparent;border:1px solid rgba(255,255,255,0.15);padding:4px 14px;cursor:pointer;font-family:inherit;font-size:0.8rem;';
    update();
    btn.addEventListener('click', () => { value = !value; update(); onChange(value); });
    row.appendChild(btn);

    return {
      row,
      set(v) { value = v; update(); },
    };
  }

  _slider(label, min, max, initial, onChange, step = 1) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:12px;';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:4px;';

    const lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.cssText = 'color:#ccc;font-size:0.9rem;';
    header.appendChild(lbl);

    const valLabel = document.createElement('span');
    valLabel.style.cssText = 'color:#88cc88;font-size:0.9rem;font-family:monospace;';
    valLabel.textContent = step < 1 ? initial.toFixed(2) : Math.round(initial);
    header.appendChild(valLabel);
    row.appendChild(header);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = initial;
    input.style.cssText = 'width:100%;accent-color:#88cc88;';
    input.addEventListener('input', () => {
      const v = parseFloat(input.value);
      valLabel.textContent = step < 1 ? v.toFixed(2) : Math.round(v);
      onChange(v);
    });
    row.appendChild(input);

    return {
      row,
      set(v) { input.value = v; valLabel.textContent = step < 1 ? v.toFixed(2) : Math.round(v); },
    };
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    this._created = false;
  }
}

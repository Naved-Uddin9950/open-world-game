// ============================================================
// newGameScreen.js — Multi-step character creation UI
// ============================================================
// Steps: 1) Basic Info + Game Mode  2) Appearance Customization
//        3) Starter Skill  4) Starting Stat Distribution
// ============================================================
import { STARTER_SKILLS, SKILLS } from '../systems/skillSystem.js';
import {
  CUSTOMIZATION_OPTIONS,
  createDefaultAppearance,
  randomizeAppearance,
} from '../character/customizationSystem.js';
import { createPlayerCharacterMesh, animatePlayerCharacter } from '../player/playerCharacterMesh.js';
import * as THREE from 'three';

/**
 * Full-screen character creation overlay with multi-step flow.
 * Collects: name, dob, gameMode, appearance, starterSkill, statPoints.
 */
export class NewGameScreen {
  constructor() {
    this._el = null;
    this._created = false;
    this._onConfirm = null; // (data) => void
    this._onBack = null;
    this._selectedSkill = STARTER_SKILLS[0];
    this._gameMode = 'singleplayer';
    this._appearance = createDefaultAppearance();
    this._step = 0; // 0=basic, 1=appearance, 2=skill, 3=stats
    this._statPoints = 10;
    this._statAlloc = { strength: 0, agility: 0, vitality: 0, intelligence: 0, endurance: 0 };

    // Mini Three.js preview (created on demand)
    this._previewRenderer = null;
    this._previewScene = null;
    this._previewCamera = null;
    this._previewMesh = null;
    this._previewAnimId = null;
  }

  setCallbacks({ onConfirm, onBack }) {
    this._onConfirm = onConfirm;
    this._onBack = onBack;
  }

  show() {
    this._step = 0;
    this._statPoints = 10;
    this._statAlloc = { strength: 0, agility: 0, vitality: 0, intelligence: 0, endurance: 0 };
    this._appearance = createDefaultAppearance();
    if (!this._created) this._create();
    this._el.style.display = 'flex';
    this._showStep(0);
    if (document.pointerLockElement) document.exitPointerLock();
  }

  hide() {
    if (this._el) this._el.style.display = 'none';
    this._disposePreview();
  }
  isVisible() { return this._el && this._el.style.display !== 'none'; }

  _disposePreview() {
    if (this._previewAnimId) { cancelAnimationFrame(this._previewAnimId); this._previewAnimId = null; }
    if (this._previewRenderer) { this._previewRenderer.dispose(); this._previewRenderer = null; }
    this._previewScene = null;
    this._previewCamera = null;
    this._previewMesh = null;
  }

  _createPreview(container) {
    this._disposePreview();

    const w = 200, h = 280;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.cssText = 'display:block;margin:0 auto;border:1px solid rgba(255,255,255,0.08);background:rgba(20,25,20,0.6);';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 50);
    camera.position.set(0, 1.0, 3.5);
    camera.lookAt(0, 0.8, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    // Floor disc
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 32),
      new THREE.MeshLambertMaterial({ color: 0x333333 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Humanoid mesh
    const mesh = createPlayerCharacterMesh(this._appearance);
    mesh.visible = true; // ensure visible in preview
    scene.add(mesh);

    this._previewRenderer = renderer;
    this._previewScene = scene;
    this._previewCamera = camera;
    this._previewMesh = mesh;

    // Auto-rotate and idle animation
    let time = 0;
    const animate = () => {
      this._previewAnimId = requestAnimationFrame(animate);
      time += 0.016;
      if (this._previewMesh) {
        this._previewMesh.rotation.y += 0.008;
        animatePlayerCharacter(this._previewMesh, 0.016, false, false);
      }
      renderer.render(scene, camera);
    };
    animate();
  }

  _updatePreview() {
    if (!this._previewScene || !this._previewMesh) return;
    this._previewScene.remove(this._previewMesh);
    this._previewMesh = createPlayerCharacterMesh(this._appearance);
    this._previewMesh.visible = true;
    this._previewScene.add(this._previewMesh);
  }

  // ════════════════════════════════════════════════════════
  // Build DOM
  // ════════════════════════════════════════════════════════

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

    this._box = document.createElement('div');
    this._box.style.cssText = `
      background:rgba(30,30,30,0.95);border:1px solid rgba(255,255,255,0.1);
      border-radius:8px;padding:28px 36px;min-width:420px;max-width:540px;
      max-height:88vh;overflow-y:auto;
    `;

    el.appendChild(this._box);
    document.body.appendChild(el);
    this._el = el;
  }

  _showStep(step) {
    this._step = step;
    this._box.innerHTML = '';

    switch (step) {
      case 0: this._buildStep0_BasicInfo(); break;
      case 1: this._buildStep1_Appearance(); break;
      case 2: this._buildStep2_StarterSkill(); break;
      case 3: this._buildStep3_StatDistribution(); break;
    }
  }

  // ── Step 0: Basic Info + Game Mode ──────────────────────

  _buildStep0_BasicInfo() {
    const box = this._box;

    box.appendChild(this._title('CREATE YOUR CHARACTER'));
    box.appendChild(this._stepIndicator(0));

    // Name
    box.appendChild(this._label('Player Name'));
    this._nameInput = this._textInput('Player', 24);
    box.appendChild(this._nameInput);

    // DOB
    box.appendChild(this._label('Date of Birth'));
    this._dobInput = document.createElement('input');
    this._dobInput.type = 'date';
    this._dobInput.value = '2000-01-01';
    this._dobInput.style.cssText = this._inputCSS() + 'color-scheme:dark;';
    box.appendChild(this._dobInput);

    // Game Mode
    box.appendChild(this._label('Game Mode'));
    const modeGrid = document.createElement('div');
    modeGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;';

    const modes = [
      { id: 'singleplayer', name: 'Singleplayer', desc: 'Infinite procedural world. Play solo.' },
      { id: 'multiplayer', name: 'Multiplayer', desc: 'Finite deterministic world. Ready for online.' },
    ];

    this._modeBtns = {};
    for (const m of modes) {
      const card = document.createElement('button');
      card.style.cssText = this._cardStyle(m.id === this._gameMode);
      card.innerHTML = `
        <div style="font-size:0.9rem;color:#aaddaa;margin-bottom:4px;font-weight:600;">${m.name}</div>
        <div style="font-size:0.65rem;color:#999;line-height:1.3;">${m.desc}</div>
      `;
      card.addEventListener('click', () => {
        this._gameMode = m.id;
        for (const [k, btn] of Object.entries(this._modeBtns)) {
          btn.style.cssText = this._cardStyle(k === m.id);
        }
      });
      modeGrid.appendChild(card);
      this._modeBtns[m.id] = card;
    }
    box.appendChild(modeGrid);

    // Nav buttons
    box.appendChild(this._navRow(
      this._btn('Back', () => { this.hide(); if (this._onBack) this._onBack(); }, '#aaa'),
      this._btn('Next: Appearance', () => this._showStep(1), '#88ff88', true),
    ));
  }

  // ── Step 1: Appearance Customization ───────────────────

  _buildStep1_Appearance() {
    const box = this._box;
    box.appendChild(this._title('CUSTOMIZE APPEARANCE'));
    box.appendChild(this._stepIndicator(1));

    // ── 3D Character Preview ──────────────────────────────
    const previewContainer = document.createElement('div');
    previewContainer.style.cssText = 'margin-bottom:16px;';
    box.appendChild(previewContainer);
    // Deferred so DOM is ready
    setTimeout(() => this._createPreview(previewContainer), 0);

    const opts = CUSTOMIZATION_OPTIONS;

    // Helper to update preview after any change
    const refreshPreview = () => setTimeout(() => this._updatePreview(), 0);

    // Gender
    box.appendChild(this._optionRow('Gender', opts.gender, this._appearance.gender,
      (v) => { this._appearance.gender = v; refreshPreview(); }));

    // Body type
    box.appendChild(this._optionRow('Body Type', opts.bodyType, this._appearance.bodyType,
      (v) => { this._appearance.bodyType = v; refreshPreview(); }));

    // Height slider
    box.appendChild(this._label(`Height: ${this._appearance.height} cm`));
    const heightSlider = document.createElement('input');
    heightSlider.type = 'range';
    heightSlider.min = opts.height.min;
    heightSlider.max = opts.height.max;
    heightSlider.value = this._appearance.height;
    heightSlider.style.cssText = 'width:100%;margin-bottom:16px;accent-color:#88cc88;';
    heightSlider.addEventListener('input', () => {
      this._appearance.height = parseInt(heightSlider.value);
      heightSlider.previousElementSibling.textContent = `Height: ${this._appearance.height} cm`;
      refreshPreview();
    });
    box.appendChild(heightSlider);

    // Skin color
    box.appendChild(this._colorRow('Skin Color', opts.skinColor, this._appearance.skinColor,
      (v) => { this._appearance.skinColor = v; refreshPreview(); }));

    // Hair style
    box.appendChild(this._optionRow('Hair Style', opts.hairStyle.map(h => h.id), this._appearance.hairStyle,
      (v) => { this._appearance.hairStyle = v; refreshPreview(); }));

    // Hair color
    box.appendChild(this._colorRow('Hair Color', opts.hairColor, this._appearance.hairColor,
      (v) => { this._appearance.hairColor = v; refreshPreview(); }));

    // Eye color
    box.appendChild(this._colorRow('Eye Color', opts.eyeColor, this._appearance.eyeColor,
      (v) => { this._appearance.eyeColor = v; refreshPreview(); }));

    // Facial hair (only if male)
    if (this._appearance.gender === 'male') {
      box.appendChild(this._optionRow('Facial Hair', opts.facialHair.map(f => f.id), this._appearance.facialHair,
        (v) => { this._appearance.facialHair = v; refreshPreview(); }));
    }

    // Clothing
    box.appendChild(this._optionRow('Upper', opts.upperClothing.map(c => c.id), this._appearance.upperClothing,
      (v) => { this._appearance.upperClothing = v; refreshPreview(); }));
    box.appendChild(this._optionRow('Lower', opts.lowerClothing.map(c => c.id), this._appearance.lowerClothing,
      (v) => { this._appearance.lowerClothing = v; refreshPreview(); }));
    box.appendChild(this._optionRow('Shoes', opts.shoes.map(c => c.id), this._appearance.shoes,
      (v) => { this._appearance.shoes = v; refreshPreview(); }));

    // Accessories
    box.appendChild(this._optionRow('Accessory', opts.accessories.map(a => a.id), this._appearance.accessory,
      (v) => { this._appearance.accessory = v; refreshPreview(); }));
    box.appendChild(this._optionRow('Glasses', opts.glasses.map(g => g.id), this._appearance.glasses,
      (v) => { this._appearance.glasses = v; refreshPreview(); }));

    // Randomize button
    const randBtn = this._btn('Randomize', () => {
      this._appearance = randomizeAppearance();
      this._showStep(1); // rebuild
    }, '#ffaa44');
    randBtn.style.marginBottom = '16px';
    randBtn.style.width = '100%';
    box.appendChild(randBtn);

    // Nav
    box.appendChild(this._navRow(
      this._btn('Back', () => this._showStep(0), '#aaa'),
      this._btn('Next: Skill', () => this._showStep(2), '#88ff88', true),
    ));
  }

  // ── Step 2: Starter Skill ──────────────────────────────

  _buildStep2_StarterSkill() {
    const box = this._box;
    box.appendChild(this._title('CHOOSE STARTING SKILL'));
    box.appendChild(this._stepIndicator(2));

    this._skillBtns = {};
    const skillGrid = document.createElement('div');
    skillGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px;';

    for (const id of STARTER_SKILLS) {
      const skill = SKILLS[id];
      if (!skill) continue;
      const card = document.createElement('button');
      card.style.cssText = this._cardStyle(id === this._selectedSkill);
      card.innerHTML = `
        <div style="font-size:0.95rem;color:${skill.color};margin-bottom:4px;font-weight:600;">${skill.name}</div>
        <div style="font-size:0.7rem;color:#999;line-height:1.3;">${skill.description}</div>
        <div style="font-size:0.65rem;color:#666;margin-top:4px;">DMG: ${skill.damage} | CD: ${skill.cooldown}s</div>
      `;
      card.addEventListener('click', () => {
        this._selectedSkill = id;
        for (const [k, btn] of Object.entries(this._skillBtns)) {
          btn.style.cssText = this._cardStyle(k === id);
        }
      });
      skillGrid.appendChild(card);
      this._skillBtns[id] = card;
    }
    box.appendChild(skillGrid);

    box.appendChild(this._navRow(
      this._btn('Back', () => this._showStep(1), '#aaa'),
      this._btn('Next: Stats', () => this._showStep(3), '#88ff88', true),
    ));
  }

  // ── Step 3: Starting Stat Distribution ─────────────────

  _buildStep3_StatDistribution() {
    const box = this._box;
    box.appendChild(this._title('DISTRIBUTE BONUS STATS'));
    box.appendChild(this._stepIndicator(3));

    const info = document.createElement('div');
    info.style.cssText = 'color:#bbbbbb;font-size:0.8rem;margin-bottom:16px;text-align:center;line-height:1.4;';
    info.textContent = 'You have 10 bonus points to distribute among your stats. Choose wisely!';
    box.appendChild(info);

    // Points remaining
    this._pointsLabel = document.createElement('div');
    this._pointsLabel.style.cssText = 'color:#ffcc44;font-size:1rem;text-align:center;margin-bottom:16px;font-weight:600;';
    this._updatePointsLabel();
    box.appendChild(this._pointsLabel);

    const statNames = {
      strength: { label: 'Strength', desc: 'Increases melee damage', color: '#ff6644' },
      agility: { label: 'Agility', desc: 'Reduces cooldowns, faster attacks', color: '#44ccff' },
      vitality: { label: 'Vitality', desc: 'Increases max HP', color: '#44ff88' },
      intelligence: { label: 'Intelligence', desc: 'Increases skill damage & wolf growth', color: '#aa88ff' },
      endurance: { label: 'Endurance', desc: 'Increases stamina, reduces costs', color: '#ffaa44' },
    };

    this._statRows = {};
    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-bottom:24px;';

    for (const [key, config] of Object.entries(statNames)) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;';

      const label = document.createElement('div');
      label.style.cssText = `color:${config.color};font-size:0.85rem;width:90px;font-weight:600;`;
      label.textContent = config.label;
      row.appendChild(label);

      const desc = document.createElement('div');
      desc.style.cssText = 'color:#777;font-size:0.6rem;width:120px;';
      desc.textContent = config.desc;
      row.appendChild(desc);

      const minusBtn = this._smallBtn('-', () => {
        if (this._statAlloc[key] > 0) {
          this._statAlloc[key]--;
          this._statPoints++;
          this._updateStatRow(key);
          this._updatePointsLabel();
        }
      });
      row.appendChild(minusBtn);

      const valSpan = document.createElement('span');
      valSpan.style.cssText = 'color:#fff;font-size:0.95rem;width:30px;text-align:center;font-weight:600;';
      valSpan.textContent = this._statAlloc[key];
      row.appendChild(valSpan);

      const plusBtn = this._smallBtn('+', () => {
        if (this._statPoints > 0) {
          this._statAlloc[key]++;
          this._statPoints--;
          this._updateStatRow(key);
          this._updatePointsLabel();
        }
      });
      row.appendChild(plusBtn);

      grid.appendChild(row);
      this._statRows[key] = { row, valSpan };
    }
    box.appendChild(grid);

    // Nav
    box.appendChild(this._navRow(
      this._btn('Back', () => this._showStep(2), '#aaa'),
      this._btn('Start Adventure', () => this._confirm(), '#88ff88', true),
    ));
  }

  _updatePointsLabel() {
    if (this._pointsLabel) {
      this._pointsLabel.textContent = `Points remaining: ${this._statPoints}`;
    }
  }

  _updateStatRow(key) {
    if (this._statRows && this._statRows[key]) {
      this._statRows[key].valSpan.textContent = this._statAlloc[key];
    }
  }

  _confirm() {
    const name = (this._nameInput ? this._nameInput.value : '').trim() || 'Player';
    const dob = this._dobInput ? this._dobInput.value : '2000-01-01';
    this.hide();
    if (this._onConfirm) {
      this._onConfirm({
        name,
        dob,
        starterSkill: this._selectedSkill,
        gameMode: this._gameMode,
        appearance: { ...this._appearance },
        statAllocation: { ...this._statAlloc },
      });
    }
  }

  // ════════════════════════════════════════════════════════
  // UI helpers
  // ════════════════════════════════════════════════════════

  _title(text) {
    const t = document.createElement('h2');
    t.textContent = text;
    t.style.cssText = 'color:#aaddaa;font-size:1.2rem;font-weight:300;letter-spacing:0.12em;margin-bottom:8px;text-align:center;';
    return t;
  }

  _stepIndicator(step) {
    const d = document.createElement('div');
    d.style.cssText = 'display:flex;justify-content:center;gap:6px;margin-bottom:20px;';
    const steps = ['Info', 'Look', 'Skill', 'Stats'];
    for (let i = 0; i < steps.length; i++) {
      const s = document.createElement('div');
      s.textContent = steps[i];
      const active = i === step;
      const done = i < step;
      s.style.cssText = `
        font-size:0.65rem;padding:3px 10px;border-radius:10px;
        background:${active ? 'rgba(100,200,100,0.25)' : done ? 'rgba(100,200,100,0.1)' : 'rgba(50,50,50,0.5)'};
        color:${active ? '#88ff88' : done ? '#88bb88' : '#666'};
        border:1px solid ${active ? 'rgba(100,200,100,0.4)' : 'transparent'};
      `;
      d.appendChild(s);
    }
    return d;
  }

  _label(text) {
    const l = document.createElement('div');
    l.textContent = text;
    l.style.cssText = 'color:#999;font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;';
    return l;
  }

  _inputCSS() {
    return `
      width:100%;box-sizing:border-box;padding:10px 12px;margin-bottom:16px;
      background:rgba(50,50,50,0.8);border:1px solid rgba(255,255,255,0.15);
      color:#fff;font-size:0.95rem;font-family:inherit;outline:none;
    `;
  }

  _textInput(defaultVal, maxLen) {
    const inp = document.createElement('input');
    inp.type = 'text';
    inp.value = defaultVal;
    inp.maxLength = maxLen;
    inp.style.cssText = this._inputCSS();
    inp.addEventListener('focus', () => inp.style.borderColor = 'rgba(100,200,100,0.5)');
    inp.addEventListener('blur', () => inp.style.borderColor = 'rgba(255,255,255,0.15)');
    return inp;
  }

  _cardStyle(active) {
    return `
      display:block;text-align:left;padding:10px 12px;cursor:pointer;
      background:${active ? 'rgba(100,200,100,0.12)' : 'rgba(50,50,50,0.5)'};
      border:1px solid ${active ? 'rgba(100,200,100,0.5)' : 'rgba(255,255,255,0.1)'};
      font-family:inherit;transition:all 0.2s;
    `;
  }

  _optionRow(label, options, current, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:12px;';
    wrap.appendChild(this._label(label));
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';

    const btns = {};
    for (const opt of options) {
      const b = document.createElement('button');
      const id = typeof opt === 'string' ? opt : opt;
      b.textContent = id;
      const active = id === current;
      b.style.cssText = `
        padding:4px 10px;font-size:0.7rem;cursor:pointer;
        background:${active ? 'rgba(100,200,100,0.2)' : 'rgba(50,50,50,0.5)'};
        border:1px solid ${active ? 'rgba(100,200,100,0.5)' : 'rgba(255,255,255,0.08)'};
        color:${active ? '#88ff88' : '#aaa'};font-family:inherit;transition:all 0.15s;
      `;
      b.addEventListener('click', () => {
        onChange(id);
        for (const [k, btn] of Object.entries(btns)) {
          const a = k === id;
          btn.style.background = a ? 'rgba(100,200,100,0.2)' : 'rgba(50,50,50,0.5)';
          btn.style.borderColor = a ? 'rgba(100,200,100,0.5)' : 'rgba(255,255,255,0.08)';
          btn.style.color = a ? '#88ff88' : '#aaa';
        }
      });
      row.appendChild(b);
      btns[id] = b;
    }
    wrap.appendChild(row);
    return wrap;
  }

  _colorRow(label, colorOptions, current, onChange) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom:12px;';
    wrap.appendChild(this._label(label));
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;';

    const btns = {};
    for (const opt of colorOptions) {
      const b = document.createElement('button');
      const active = opt.id === current;
      b.title = opt.name;
      b.style.cssText = `
        width:28px;height:28px;border-radius:50%;cursor:pointer;
        background:${opt.hex};
        border:2px solid ${active ? '#88ff88' : 'rgba(255,255,255,0.15)'};
        box-shadow:${active ? '0 0 6px rgba(100,200,100,0.5)' : 'none'};
        transition:all 0.15s;
      `;
      b.addEventListener('click', () => {
        onChange(opt.id);
        for (const [k, btn] of Object.entries(btns)) {
          const a = k === opt.id;
          btn.style.borderColor = a ? '#88ff88' : 'rgba(255,255,255,0.15)';
          btn.style.boxShadow = a ? '0 0 6px rgba(100,200,100,0.5)' : 'none';
        }
      });
      row.appendChild(b);
      btns[opt.id] = b;
    }
    wrap.appendChild(row);
    return wrap;
  }

  _navRow(...btns) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;justify-content:center;';
    for (const b of btns) row.appendChild(b);
    return row;
  }

  _btn(text, onClick, color = '#88cc88', primary = false) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding:12px 24px;font-size:0.9rem;cursor:pointer;
      background:transparent;color:${color};
      border:1px solid ${primary ? 'rgba(100,200,100,0.5)' : 'rgba(100,180,100,0.3)'};
      letter-spacing:0.06em;text-transform:uppercase;transition:all 0.2s;font-family:inherit;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(100,200,100,0.15)';
      btn.style.borderColor = 'rgba(100,200,100,0.6)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
      btn.style.borderColor = primary ? 'rgba(100,200,100,0.5)' : 'rgba(100,180,100,0.3)';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  _smallBtn(text, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      width:28px;height:28px;font-size:1rem;cursor:pointer;font-weight:700;
      background:rgba(50,50,50,0.8);color:#88cc88;
      border:1px solid rgba(100,180,100,0.3);font-family:inherit;
      display:flex;align-items:center;justify-content:center;
    `;
    btn.addEventListener('click', onClick);
    return btn;
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    this._created = false;
  }
}

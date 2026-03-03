// ============================================================
// worldMapUI.js — Full-screen world map overlay
// ============================================================
// Shows zones, player position, discovered areas.
// Opened with [M] key or pause menu.
// ============================================================
import { ZONES, WORLD_SIZE, WORLD_HALF } from '../world/worldConfig.js';

export class WorldMapUI {
  constructor() {
    this._el = null;
    this._created = false;
    this._visible = false;
    this._onClose = null;
    this._playerPos = { x: 0, z: 0 };
    this._discoveredZones = new Set();
    this._gameMode = 'singleplayer';
  }

  setCallbacks({ onClose }) { this._onClose = onClose; }
  isVisible() { return this._visible; }
  setGameMode(mode) { this._gameMode = mode; }

  /** Update player position for the marker. */
  updatePlayerPos(x, z) {
    this._playerPos.x = x;
    this._playerPos.z = z;
  }

  /** Mark a zone as discovered. */
  discoverZone(zoneId) {
    this._discoveredZones.add(zoneId);
  }

  show() {
    if (!this._created) this._create();
    this._render();
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
    el.id = 'world-map-panel';
    el.style.cssText = `
      position:fixed;inset:0;z-index:2950;display:none;
      flex-direction:column;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.92);font-family:'Segoe UI',system-ui,sans-serif;
      backdrop-filter:blur(4px);
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background:rgba(25,30,25,0.95);border:1px solid rgba(255,255,255,0.1);
      border-radius:8px;padding:24px 28px;min-width:600px;max-width:720px;
      max-height:85vh;overflow-y:auto;
    `;
    this._box = box;

    el.appendChild(box);
    document.body.appendChild(el);
    this._el = el;
  }

  _render() {
    const box = this._box;
    box.innerHTML = '';

    // Title
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;';
    const title = document.createElement('h2');
    title.textContent = 'WORLD MAP';
    title.style.cssText = 'color:#aaddaa;font-size:1.2rem;font-weight:300;letter-spacing:0.12em;margin:0;';
    header.appendChild(title);
    const modeLabel = document.createElement('span');
    modeLabel.style.cssText = 'color:#888;font-size:0.7rem;';
    modeLabel.textContent = this._gameMode === 'multiplayer' ? 'Finite World (Multiplayer)' : 'Infinite World (Singleplayer)';
    header.appendChild(modeLabel);
    box.appendChild(header);

    // Map canvas area
    const mapWrap = document.createElement('div');
    mapWrap.style.cssText = `
      position:relative;width:100%;aspect-ratio:1;
      background:rgba(20,30,20,0.9);border:1px solid rgba(255,255,255,0.08);
      margin-bottom:16px;overflow:hidden;
    `;

    // Draw zones
    const zoneEntries = Object.values(ZONES);
    for (const zone of zoneEntries) {
      const discovered = this._discoveredZones.has(zone.id) || zone.isStartZone;
      const zoneEl = document.createElement('div');
      const [minX, minZ, maxX, maxZ] = zone.bounds;

      // Convert world coords → percent of map
      const left = ((minX + WORLD_HALF) / WORLD_SIZE) * 100;
      const top = ((minZ + WORLD_HALF) / WORLD_SIZE) * 100;
      const width = ((maxX - minX) / WORLD_SIZE) * 100;
      const height = ((maxZ - minZ) / WORLD_SIZE) * 100;

      const bgColor = discovered ? this._zoneColor(zone) : 'rgba(40,40,40,0.6)';
      const borderColor = discovered ? this._zoneColor(zone) : 'rgba(80,80,80,0.4)';

      zoneEl.style.cssText = `
        position:absolute;
        left:${left}%;top:${top}%;width:${width}%;height:${height}%;
        background:${bgColor};
        border:1px solid ${borderColor};
        display:flex;align-items:center;justify-content:center;
        flex-direction:column;cursor:pointer;
        transition:all 0.2s;opacity:${discovered ? 0.85 : 0.4};
      `;

      const nameEl = document.createElement('div');
      nameEl.style.cssText = `
        color:${discovered ? '#fff' : '#666'};font-size:0.65rem;font-weight:600;
        text-align:center;text-shadow:0 1px 3px rgba(0,0,0,0.8);pointer-events:none;
      `;
      nameEl.textContent = discovered ? zone.name : '???';
      zoneEl.appendChild(nameEl);

      if (discovered) {
        const levelEl = document.createElement('div');
        levelEl.style.cssText = 'color:rgba(255,255,255,0.6);font-size:0.5rem;pointer-events:none;';
        levelEl.textContent = `Lv.${zone.levelRange[0]}-${zone.levelRange[1]}`;
        zoneEl.appendChild(levelEl);
      }

      // Hover tooltip
      zoneEl.addEventListener('mouseenter', () => {
        this._showTooltip(zone, discovered, zoneEl);
        zoneEl.style.opacity = '1';
        zoneEl.style.zIndex = '10';
      });
      zoneEl.addEventListener('mouseleave', () => {
        this._hideTooltip();
        zoneEl.style.opacity = discovered ? '0.85' : '0.4';
        zoneEl.style.zIndex = '';
      });

      mapWrap.appendChild(zoneEl);
    }

    // Player marker
    const px = ((this._playerPos.x + WORLD_HALF) / WORLD_SIZE) * 100;
    const pz = ((this._playerPos.z + WORLD_HALF) / WORLD_SIZE) * 100;
    const marker = document.createElement('div');
    marker.style.cssText = `
      position:absolute;left:${px}%;top:${pz}%;
      width:10px;height:10px;margin-left:-5px;margin-top:-5px;
      background:#44ff44;border-radius:50%;
      box-shadow:0 0 8px rgba(68,255,68,0.8);
      z-index:20;pointer-events:none;
      animation:mapPulse 1.5s ease-in-out infinite;
    `;
    mapWrap.appendChild(marker);

    // Add pulse animation
    if (!document.getElementById('map-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'map-pulse-style';
      style.textContent = `@keyframes mapPulse { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.5);opacity:0.6;} }`;
      document.head.appendChild(style);
    }

    // Tooltip container
    this._tooltip = document.createElement('div');
    this._tooltip.style.cssText = `
      position:absolute;display:none;background:rgba(20,20,20,0.95);
      border:1px solid rgba(255,255,255,0.15);padding:8px 12px;
      pointer-events:none;z-index:30;min-width:160px;
    `;
    mapWrap.appendChild(this._tooltip);

    box.appendChild(mapWrap);

    // Zone legend
    const legend = document.createElement('div');
    legend.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;';
    for (const zone of zoneEntries) {
      const discovered = this._discoveredZones.has(zone.id) || zone.isStartZone;
      if (!discovered) continue;
      const chip = document.createElement('div');
      chip.style.cssText = `
        display:flex;align-items:center;gap:4px;
        padding:2px 8px;background:rgba(40,40,40,0.6);
        border:1px solid rgba(255,255,255,0.06);
      `;
      const dot = document.createElement('span');
      dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${this._zoneColor(zone)};`;
      chip.appendChild(dot);
      const name = document.createElement('span');
      name.style.cssText = 'color:#ccc;font-size:0.6rem;';
      name.textContent = zone.name;
      chip.appendChild(name);
      legend.appendChild(chip);
    }
    box.appendChild(legend);

    // Player coords
    const coords = document.createElement('div');
    coords.style.cssText = 'color:#888;font-size:0.65rem;text-align:center;margin-bottom:14px;font-family:monospace;';
    coords.textContent = `Player: (${Math.round(this._playerPos.x)}, ${Math.round(this._playerPos.z)})`;
    box.appendChild(coords);

    // Close
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close [M]';
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

  _showTooltip(zone, discovered, anchor) {
    if (!this._tooltip) return;
    this._tooltip.style.display = 'block';

    if (!discovered) {
      this._tooltip.innerHTML = '<div style="color:#666;font-size:0.7rem;">Undiscovered Zone</div>';
    } else {
      this._tooltip.innerHTML = `
        <div style="color:#fff;font-size:0.8rem;font-weight:600;margin-bottom:4px;">${zone.name}</div>
        <div style="color:#aaa;font-size:0.65rem;line-height:1.3;margin-bottom:4px;">${zone.description}</div>
        <div style="color:#888;font-size:0.6rem;">Level: ${zone.levelRange[0]}-${zone.levelRange[1]}</div>
        <div style="color:#888;font-size:0.6rem;">Terrain: ${zone.terrain}</div>
        <div style="color:#888;font-size:0.6rem;">Enemies: ${zone.enemyTypes.join(', ')}</div>
        ${zone.hasShop ? '<div style="color:#88cc44;font-size:0.6rem;">Has Shop</div>' : ''}
        ${zone.hasGuild ? '<div style="color:#ccaa44;font-size:0.6rem;">Has Guild Hall</div>' : ''}
      `;
    }

    // Position near anchor
    const rect = anchor.getBoundingClientRect();
    const parentRect = anchor.parentElement.getBoundingClientRect();
    this._tooltip.style.left = `${rect.left - parentRect.left + rect.width + 4}px`;
    this._tooltip.style.top = `${rect.top - parentRect.top}px`;
  }

  _hideTooltip() {
    if (this._tooltip) this._tooltip.style.display = 'none';
  }

  _zoneColor(zone) {
    const colors = {
      rookieTown: 'rgba(80,180,80,0.3)',
      goblinForest: 'rgba(60,120,60,0.3)',
      dragonValley: 'rgba(200,100,50,0.3)',
      frozenNorth: 'rgba(100,130,200,0.3)',
      desertEmpire: 'rgba(200,170,80,0.3)',
    };
    return colors[zone.id] || 'rgba(100,100,100,0.3)';
  }

  dispose() {
    if (this._el) { this._el.remove(); this._el = null; }
    this._created = false;
  }
}

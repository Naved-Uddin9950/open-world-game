// ============================================================
// constants.js — Engine-wide configuration constants
// ============================================================

// ── Renderer ────────────────────────────────────────────────
export const MAX_PIXEL_RATIO = 1.5;
export const SHADOW_MAP_SIZE = 1024;
export const SHADOW_CAMERA_SIZE = 60;
export const SHADOW_NEAR = 0.5;
export const SHADOW_FAR = 200;

// ── Camera ──────────────────────────────────────────────────
export const FOV = 75;
export const NEAR_CLIP = 0.1;
export const FAR_CLIP = 1000;

// ── Player ──────────────────────────────────────────────────
export const PLAYER_HEIGHT = 1.7;
export const PLAYER_SPEED = 5.0;
export const PLAYER_SPRINT_MULT = 1.8;
export const MOUSE_SENSITIVITY = 0.002;
export const GRAVITY = 9.81;
export const JUMP_FORCE = 5.0;

// ── World / Chunks ──────────────────────────────────────────
export const CHUNK_SIZE = 64;
export const RENDER_DISTANCE = 3;       // chunks around player
export const WORLD_Y_OFFSET = 0;

// ── Time ────────────────────────────────────────────────────
export const DAY_LENGTH_SECONDS = 600;     // 10-minute day cycle
export const TIME_START_HOUR = 10;      // start at 10 AM

// ── LOD ─────────────────────────────────────────────────────
export const LOD_DISTANCES = [50, 150, 400];

// ── Performance Tiers ───────────────────────────────────────
export const QUALITY_TIERS = {
    LOW: { shadowMap: false, pixelRatio: 1.0, renderScale: 0.75 },
    MEDIUM: { shadowMap: true, pixelRatio: 1.0, renderScale: 1.0 },
    HIGH: { shadowMap: true, pixelRatio: 1.5, renderScale: 1.0 },
};

// ── Fog ─────────────────────────────────────────────────────
export const FOG_NEAR = 80;
export const FOG_FAR = 350;
export const FOG_COLOR = 0xc8d6e5;

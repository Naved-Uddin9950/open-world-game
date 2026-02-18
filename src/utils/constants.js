// ============================================================
// constants.js — Engine-wide configuration constants
// ============================================================

// ── Renderer ────────────────────────────────────────────────
export const MAX_PIXEL_RATIO = 1.5;
export const SHADOW_MAP_SIZE = 512;
export const SHADOW_CAMERA_SIZE = 40;
export const SHADOW_NEAR = 0.5;
export const SHADOW_FAR = 120;

// ── Camera ──────────────────────────────────────────────────
export const FOV = 75;
export const NEAR_CLIP = 0.1;
export const FAR_CLIP = 1000;

// ── Player ──────────────────────────────────────────────────
export const PLAYER_HEIGHT = 1;
export const PLAYER_SPEED = 5.0;
export const PLAYER_SPRINT_MULT = 1.8;
export const MOUSE_SENSITIVITY = 0.002;
export const GRAVITY = 9.81;
export const JUMP_FORCE = 5.0;

// ── World / Chunks ──────────────────────────────────────────
export const CHUNK_SIZE = 64;
export const RENDER_DISTANCE = 2;
export const WORLD_Y_OFFSET = 0;

// ── Time ────────────────────────────────────────────────────
export const DAY_LENGTH_SECONDS = 600;     // 10-minute day cycle
export const TIME_START_HOUR = 10;      // start at 10 AM

// ── LOD ─────────────────────────────────────────────────────
export const LOD_DISTANCES = [30, 80, 200];

// ── Performance Tiers ───────────────────────────────────────
export const QUALITY_TIERS = {
    LOW: { shadowMap: false, pixelRatio: 1.0, renderScale: 0.65 },
    MEDIUM: { shadowMap: true, pixelRatio: 1.0, renderScale: 0.85 },
    HIGH: { shadowMap: true, pixelRatio: 1.0, renderScale: 1.0 },
};

// ── Fog ─────────────────────────────────────────────────────
export const FOG_NEAR = 60;
export const FOG_FAR = 250;
export const FOG_COLOR = 0xc8d6e5;

// ── Terrain Generation ─────────────────────────────────────
export const TERRAIN_HEIGHT_SCALE = 78;         // total max height
export const TERRAIN_CONTINENTAL_SCALE = 0.002;  // broad mountains
export const TERRAIN_CONTINENTAL_HEIGHT = 60;
export const TERRAIN_DETAIL_SCALE = 0.01;        // hills / ridges
export const TERRAIN_DETAIL_HEIGHT = 15;
export const TERRAIN_MICRO_SCALE = 0.05;         // small bumps
export const TERRAIN_MICRO_HEIGHT = 3;
export const TERRAIN_POWER_CURVE = 1.6;          // push valleys flat, peaks sharp

// ── Terrain LOD segments ───────────────────────────────────
export const TERRAIN_SEG_HIGH = 48;
export const TERRAIN_SEG_MED = 12;
export const TERRAIN_SEG_LOW = 4;

// ── Biome colours (hex) ────────────────────────────────────
export const BIOME_DEEP_GRASS = 0x2d5a1b;
export const BIOME_LIGHT_GRASS = 0x5a8c3a;
export const BIOME_DIRT = 0x8b7355;
export const BIOME_ROCK = 0x7a7a7a;
export const BIOME_SNOW = 0xe8e8f0;

// ── Biome elevation thresholds (normalised 0-1) ────────────
export const BIOME_GRASS_MAX = 0.18;
export const BIOME_DIRT_MAX = 0.38;
export const BIOME_ROCK_MAX = 0.7;
export const BIOME_SLOPE_ROCK_THRESHOLD = 0.4;

// ── Vegetation — Trees ─────────────────────────────────────
export const TREE_DENSITY_GRASS = 0.25;
export const TREE_DENSITY_DIRT = 0.08;
export const TREE_DENSITY_ROCK = 0.0;
export const TREE_DENSITY_SNOW = 0.0;
export const TREE_SPACING = 6;
export const TREE_MAX_PER_CHUNK = 80;
export const TREE_LOD_HIGH_DIST = 50;
export const TREE_LOD_MED_DIST = 120;
export const TREE_LOD_BILL_DIST = 250;
// Increased default tree scales so trees are roughly 3-4x player height
export const TREE_MIN_SCALE = 5.0;
export const TREE_MAX_SCALE = 15.0;
// Prefer scaling trees relative to the player's height: tree height = PLAYER_HEIGHT * factor
export const TREE_MIN_HEIGHT_FACTOR = 8.0;
export const TREE_MAX_HEIGHT_FACTOR = 12.0;
export const TREE_TRUNK_COLOR = 0x5c3a1e;
export const TREE_CANOPY_COLORS = [0x2d6b1b, 0x3a7d2a, 0x1e5a10, 0x4a8d3a];
export const TREE_SLOPE_MAX = 0.35;

// ── Vegetation — Grass ─────────────────────────────────────
export const GRASS_DENSITY_GRASS = 0.4;
export const GRASS_DENSITY_DIRT = 0.1;
export const GRASS_SPACING = 2;
export const GRASS_MAX_PER_CHUNK = 250;
export const GRASS_RENDER_DIST = 40;
export const GRASS_HEIGHT_MIN = 0.3;
export const GRASS_HEIGHT_MAX = 0.8;
export const GRASS_BASE_COLOR = 0x2d5a1b;
export const GRASS_TIP_COLOR = 0x7ab648;

// ── Vegetation — Rocks ─────────────────────────────────────
export const ROCK_DENSITY_GRASS = 0.03;
export const ROCK_DENSITY_DIRT = 0.08;
export const ROCK_DENSITY_ROCK = 0.15;
export const ROCK_SPACING = 10;
export const ROCK_MAX_PER_CHUNK = 25;
export const ROCK_BOULDER_SCALE = [8.0, 12.5];
export const ROCK_PEBBLE_SCALE = [2.5, 5.5];
export const ROCK_COLOR = 0x6b6b6b;
export const ROCK_COLOR_DARK = 0x4a4a4a;


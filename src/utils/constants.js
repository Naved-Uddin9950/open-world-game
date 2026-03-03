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
export const DAY_LENGTH_SECONDS = 600; // 10-minute day cycle
export const TIME_START_HOUR = 10; // start at 10 AM

// ── LOD ─────────────────────────────────────────────────────
export const LOD_DISTANCES = [30, 80, 200];

// ── Performance Tiers ───────────────────────────────────────
export const QUALITY_TIERS = {
  VERY_LOW: { shadowMap: false, pixelRatio: 0.5, renderScale: 0.35 },
  LOW: { shadowMap: false, pixelRatio: 1.0, renderScale: 0.65 },
  MEDIUM: { shadowMap: true, pixelRatio: 1.0, renderScale: 0.85 },
  HIGH: { shadowMap: true, pixelRatio: 1.0, renderScale: 1.0 },
};

// ── Fog ─────────────────────────────────────────────────────
export const FOG_NEAR = 60;
export const FOG_FAR = 250;
export const FOG_COLOR = 0xc8d6e5;

// ── Terrain Generation ─────────────────────────────────────
export const TERRAIN_HEIGHT_SCALE = 78; // total max height
export const TERRAIN_CONTINENTAL_SCALE = 0.002; // broad mountains
export const TERRAIN_CONTINENTAL_HEIGHT = 60;
export const TERRAIN_DETAIL_SCALE = 0.01; // hills / ridges
export const TERRAIN_DETAIL_HEIGHT = 15;
export const TERRAIN_MICRO_SCALE = 0.05; // small bumps
export const TERRAIN_MICRO_HEIGHT = 3;
export const TERRAIN_POWER_CURVE = 1.6; // push valleys flat, peaks sharp

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
// ── Animals ──────────────────────────────────────────────────
// Mean expected animals per chunk (used as a deterministic seed-driven mean)
export const ANIMAL_MEAN_COUNTS = {
  chicken: 8, // medium-high
  cow: 3, // medium
  deer: 2, // low-medium
  wolf: 1, // low
};
export const ANIMAL_SIZE = {
  cow: 0.002,
  chicken: 0.004,
  deer: 0.2,
  wolf: 0.01,
};
export const ANIMAL_MAX_PER_CHUNK = 6;
export const ANIMAL_SPACING = 6; // sampling spacing for placement jitter
// ── AI / Animal behavior constants ─────────────────────────────────
export const WOLF_DETECTION_RADIUS = 40; // how far wolves can detect targets
export const WOLF_ATTACK_RANGE = 2.0; // melee range for wolves
export const WOLF_CHASE_SPEED_MULT = 1.2; // wolf speed multiplier while chasing
export const WOLF_BASE_SPEED = 3.5; // meters/sec base wolf speed

export const CHICKEN_FEAR_RADIUS = 15; // chickens flee from player within this
export const CHICKEN_PANIC_SPEED = 4.0; // panic run speed
export const CHICKEN_WANDER_SPEED = 1.2;

export const DEER_FEAR_RADIUS = 30; // deer flee from player/wolf within this
export const DEER_PANIC_SPEED = 5.0;
export const DEER_NORMAL_SPEED = 3.0;
export const DEER_GROUP_RADIUS = 10;

export const COW_WOLF_FEAR_RADIUS = 25; // cows flee from wolves within this
export const COW_NORMAL_SPEED = 1.2;
export const COW_REACTION_DELAY = 1.2; // seconds delay before cow reacts
export const COW_GROUP_RADIUS = 12;

// Misc AI tuning
export const ANIMAL_DAY_ACTIVITY = { day: 1.0, night: 0.6 };

// ── Stat Multipliers (Enhancement Points → combat effect) ──
export const STRENGTH_MELEE_MULT = 0.05;       // +5% melee damage per strength point above 10
export const AGILITY_COOLDOWN_REDUCTION = 0.01; // 1% cooldown reduction per agility point
export const AGILITY_ATTACK_SPEED_MULT = 0.02;  // 2% faster attack per agility point
export const VITALITY_HP_PER_POINT = 12;        // +12 max HP per vitality point
export const INTELLIGENCE_SKILL_MULT = 0.04;    // +4% skill damage per intelligence point
export const ENDURANCE_STAMINA_PER_POINT = 8;   // +8 max stamina per endurance point
export const ENDURANCE_COST_REDUCTION = 0.015;  // 1.5% stamina cost reduction per endurance point

// ── Base Player Combat Stats ────────────────────────────────
export const BASE_MELEE_DAMAGE = 25;            // base melee damage (100-scale)
export const BASE_ATTACK_COOLDOWN = 0.5;        // seconds between melee attacks
export const BASE_ATTACK_RANGE = 3.0;           // melee reach in meters
export const BASE_PLAYER_DEFENCE = 5;           // base defence (damage reduction)
export const DEFENCE_REDUCTION_FACTOR = 0.005;  // % damage blocked per defence point

// ── Skill Scaling Per Level ─────────────────────────────────
export const SKILL_DAMAGE_PER_LEVEL = 0.18;     // +18% damage per skill level above 1
export const SKILL_COOLDOWN_REDUCTION_PER_LEVEL = 0.05; // 5% CD reduction per skill level
export const SKILL_STAMINA_REDUCTION_PER_LEVEL = 0.03;  // 3% cost reduction per skill level

// ── Familiar Wolf Constants ─────────────────────────────────
export const FAMILIAR_WOLF_BASE_HP = 0.8;       // 0-1 scale
export const FAMILIAR_WOLF_BASE_DAMAGE = 0.12;  // 0-1 scale per hit
export const FAMILIAR_WOLF_BASE_SPEED = 4.0;    // meters/sec
export const FAMILIAR_WOLF_FOLLOW_DIST = 5.0;   // distance to keep from owner
export const FAMILIAR_WOLF_LEASH_DIST = 25.0;   // max dist before teleporting back
export const FAMILIAR_WOLF_AGGRO_RANGE = 12.0;  // range to auto-attack enemies
export const FAMILIAR_WOLF_ATTACK_RANGE = 2.2;  // melee range
export const FAMILIAR_WOLF_HP_PER_LEVEL = 0.15; // +HP per summon skill level
export const FAMILIAR_WOLF_DMG_PER_LEVEL = 0.04;// +damage per summon skill level
export const FAMILIAR_WOLF_COUNT_AT_LEVEL = [1, 1, 2, 2, 3]; // wolves per skill level
export const FAMILIAR_WOLF_DURATION_BASE = 15;  // seconds at level 1
export const FAMILIAR_WOLF_DURATION_PER_LEVEL = 5; // +seconds per level


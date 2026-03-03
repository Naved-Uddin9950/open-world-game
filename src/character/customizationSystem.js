// ============================================================
// customizationSystem.js — Character appearance customization
// ============================================================
// Height, body type, skin, hair style/color, eye color, gender,
// clothing (upper/lower/shoes), accessories, glasses, beard/mustache.
// Stores in player profile. Randomize button support.
// ============================================================

/**
 * Customization option sets.
 */
export const CUSTOMIZATION_OPTIONS = {
  gender: ['male', 'female'],

  bodyType: ['slim', 'average', 'athletic', 'heavy'],

  height: { min: 150, max: 200, default: 170, unit: 'cm' },

  skinColor: [
    { id: 'fair', name: 'Fair', hex: '#FFE0BD' },
    { id: 'light', name: 'Light', hex: '#F1C27D' },
    { id: 'medium', name: 'Medium', hex: '#C68642' },
    { id: 'tan', name: 'Tan', hex: '#8D5524' },
    { id: 'brown', name: 'Brown', hex: '#6B3A2A' },
    { id: 'dark', name: 'Dark', hex: '#3B2219' },
  ],

  hairStyle: [
    { id: 'short', name: 'Short' },
    { id: 'medium', name: 'Medium' },
    { id: 'long', name: 'Long' },
    { id: 'ponytail', name: 'Ponytail' },
    { id: 'braid', name: 'Braid' },
    { id: 'mohawk', name: 'Mohawk' },
    { id: 'bald', name: 'Bald' },
    { id: 'spiky', name: 'Spiky' },
    { id: 'curly', name: 'Curly' },
  ],

  hairColor: [
    { id: 'black', name: 'Black', hex: '#1a1a1a' },
    { id: 'brown', name: 'Brown', hex: '#6B3A2A' },
    { id: 'blonde', name: 'Blonde', hex: '#D4A76A' },
    { id: 'red', name: 'Red', hex: '#A52A2A' },
    { id: 'white', name: 'White', hex: '#E0E0E0' },
    { id: 'blue', name: 'Blue', hex: '#4488CC' },
    { id: 'green', name: 'Green', hex: '#44AA44' },
    { id: 'purple', name: 'Purple', hex: '#8844AA' },
    { id: 'pink', name: 'Pink', hex: '#FF88AA' },
  ],

  eyeColor: [
    { id: 'brown', name: 'Brown', hex: '#6B3A2A' },
    { id: 'blue', name: 'Blue', hex: '#4488CC' },
    { id: 'green', name: 'Green', hex: '#44AA66' },
    { id: 'grey', name: 'Grey', hex: '#888888' },
    { id: 'amber', name: 'Amber', hex: '#CC8844' },
    { id: 'red', name: 'Red', hex: '#CC3333' },
    { id: 'violet', name: 'Violet', hex: '#AA44CC' },
  ],

  facialHair: [
    { id: 'none', name: 'None' },
    { id: 'stubble', name: 'Stubble' },
    { id: 'goatee', name: 'Goatee' },
    { id: 'fullBeard', name: 'Full Beard' },
    { id: 'mustache', name: 'Mustache' },
    { id: 'handlebar', name: 'Handlebar' },
  ],

  upperClothing: [
    { id: 'tunic', name: 'Tunic', color: '#8B6D4C' },
    { id: 'shirt', name: 'Shirt', color: '#CCCCCC' },
    { id: 'vest', name: 'Leather Vest', color: '#6B3A2A' },
    { id: 'robe', name: 'Mage Robe', color: '#334488' },
    { id: 'armor_light', name: 'Light Armor', color: '#888888' },
    { id: 'cloak', name: 'Traveler\'s Cloak', color: '#445533' },
  ],

  lowerClothing: [
    { id: 'trousers', name: 'Trousers', color: '#555555' },
    { id: 'shorts', name: 'Shorts', color: '#6B5B4B' },
    { id: 'skirt', name: 'Skirt', color: '#8B6D4C' },
    { id: 'robe_lower', name: 'Robe Bottom', color: '#334488' },
    { id: 'armored_legs', name: 'Armored Legs', color: '#777777' },
  ],

  shoes: [
    { id: 'sandals', name: 'Sandals', color: '#8B6D4C' },
    { id: 'boots', name: 'Leather Boots', color: '#5C3A1E' },
    { id: 'armored_boots', name: 'Armored Boots', color: '#666666' },
    { id: 'cloth_shoes', name: 'Cloth Shoes', color: '#444444' },
  ],

  accessories: [
    { id: 'none', name: 'None' },
    { id: 'scarf', name: 'Scarf' },
    { id: 'necklace', name: 'Necklace' },
    { id: 'earring', name: 'Earring' },
    { id: 'headband', name: 'Headband' },
    { id: 'eyepatch', name: 'Eyepatch' },
  ],

  glasses: [
    { id: 'none', name: 'None' },
    { id: 'round', name: 'Round Glasses' },
    { id: 'square', name: 'Square Glasses' },
    { id: 'sunglasses', name: 'Sunglasses' },
    { id: 'monocle', name: 'Monocle' },
  ],
};

// ════════════════════════════════════════════════════════════
// Default appearance
// ════════════════════════════════════════════════════════════

export function createDefaultAppearance() {
  return {
    gender: 'male',
    bodyType: 'average',
    height: 170,
    skinColor: 'light',
    hairStyle: 'short',
    hairColor: 'brown',
    eyeColor: 'brown',
    facialHair: 'none',
    upperClothing: 'tunic',
    lowerClothing: 'trousers',
    shoes: 'boots',
    accessory: 'none',
    glasses: 'none',
  };
}

// ════════════════════════════════════════════════════════════
// Randomize
// ════════════════════════════════════════════════════════════

function _pick(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Generate a random appearance.
 * @param {function} [rng] - Optional RNG
 * @returns {object} Appearance data
 */
export function randomizeAppearance(rng = Math.random) {
  const opts = CUSTOMIZATION_OPTIONS;
  const gender = _pick(opts.gender, rng);
  return {
    gender,
    bodyType: _pick(opts.bodyType, rng),
    height: Math.round(opts.height.min + rng() * (opts.height.max - opts.height.min)),
    skinColor: _pick(opts.skinColor, rng).id,
    hairStyle: _pick(opts.hairStyle, rng).id,
    hairColor: _pick(opts.hairColor, rng).id,
    eyeColor: _pick(opts.eyeColor, rng).id,
    facialHair: gender === 'male' ? _pick(opts.facialHair, rng).id : 'none',
    upperClothing: _pick(opts.upperClothing, rng).id,
    lowerClothing: _pick(opts.lowerClothing, rng).id,
    shoes: _pick(opts.shoes, rng).id,
    accessory: _pick(opts.accessories, rng).id,
    glasses: _pick(opts.glasses, rng).id,
  };
}

// ════════════════════════════════════════════════════════════
// Validation
// ════════════════════════════════════════════════════════════

/**
 * Validate an appearance object. Returns sanitized copy.
 */
export function validateAppearance(appearance) {
  const def = createDefaultAppearance();
  if (!appearance || typeof appearance !== 'object') return def;

  const opts = CUSTOMIZATION_OPTIONS;
  const valid = { ...def };

  if (opts.gender.includes(appearance.gender)) valid.gender = appearance.gender;
  if (opts.bodyType.includes(appearance.bodyType)) valid.bodyType = appearance.bodyType;

  const h = Number(appearance.height);
  if (h >= opts.height.min && h <= opts.height.max) valid.height = Math.round(h);

  const colorIds = (arr) => arr.map(c => c.id);
  const simpleIds = (arr) => arr.map(c => c.id);

  if (colorIds(opts.skinColor).includes(appearance.skinColor)) valid.skinColor = appearance.skinColor;
  if (simpleIds(opts.hairStyle).includes(appearance.hairStyle)) valid.hairStyle = appearance.hairStyle;
  if (colorIds(opts.hairColor).includes(appearance.hairColor)) valid.hairColor = appearance.hairColor;
  if (colorIds(opts.eyeColor).includes(appearance.eyeColor)) valid.eyeColor = appearance.eyeColor;
  if (simpleIds(opts.facialHair).includes(appearance.facialHair)) valid.facialHair = appearance.facialHair;
  if (simpleIds(opts.upperClothing).includes(appearance.upperClothing)) valid.upperClothing = appearance.upperClothing;
  if (simpleIds(opts.lowerClothing).includes(appearance.lowerClothing)) valid.lowerClothing = appearance.lowerClothing;
  if (simpleIds(opts.shoes).includes(appearance.shoes)) valid.shoes = appearance.shoes;
  if (simpleIds(opts.accessories).includes(appearance.accessory)) valid.accessory = appearance.accessory;
  if (simpleIds(opts.glasses).includes(appearance.glasses)) valid.glasses = appearance.glasses;

  return valid;
}

// ════════════════════════════════════════════════════════════
// Get visual hex colors for rendering
// ════════════════════════════════════════════════════════════

/**
 * Resolve appearance IDs to hex colors for rendering.
 */
export function resolveAppearanceColors(appearance) {
  const opts = CUSTOMIZATION_OPTIONS;
  const find = (arr, id) => arr.find(c => c.id === id) || arr[0];

  return {
    skin: find(opts.skinColor, appearance.skinColor).hex,
    hair: find(opts.hairColor, appearance.hairColor).hex,
    eye: find(opts.eyeColor, appearance.eyeColor).hex,
    upper: find(opts.upperClothing, appearance.upperClothing).color,
    lower: find(opts.lowerClothing, appearance.lowerClothing).color,
    shoes: find(opts.shoes, appearance.shoes).color,
  };
}

// ============================================================
// inventorySystem.js — Player inventory management
// ============================================================
// Manages items, stacking, equipping, using consumables.
// Serializable for save/load.
// ============================================================
import { ITEMS, getItem, RARITY } from './itemDatabase.js';

/**
 * @typedef {object} InventorySlot
 * @property {string} itemId
 * @property {number} quantity
 */

/**
 * @typedef {object} EquipmentSlots
 * @property {string|null} weapon
 * @property {string|null} head
 * @property {string|null} chest
 * @property {string|null} feet
 * @property {string|null} accessory
 */

export class InventorySystem {
  /**
   * @param {number} [maxSlots=40] - Maximum inventory slots
   */
  constructor(maxSlots = 40) {
    this.maxSlots = maxSlots;
    /** @type {InventorySlot[]} */
    this.slots = [];
    /** @type {EquipmentSlots} */
    this.equipment = { weapon: null, head: null, chest: null, feet: null, accessory: null };
    /** @type {number} */
    this.gold = 100;
    /** @type {Map<string, number>} itemId → remaining cooldown */
    this._cooldowns = new Map();
    this._onChangeCallback = null;
  }

  setOnChange(cb) { this._onChangeCallback = cb; }
  _notifyChange() { if (this._onChangeCallback) this._onChangeCallback(); }

  // ── Add / Remove items ──────────────────────────────────

  /**
   * Add item to inventory. Returns amount actually added.
   * @param {string} itemId
   * @param {number} [quantity=1]
   * @returns {number} Amount added
   */
  addItem(itemId, quantity = 1) {
    const def = getItem(itemId);
    if (!def) return 0;

    let remaining = quantity;

    // Stack into existing slots first
    if (def.stackable) {
      for (const slot of this.slots) {
        if (slot.itemId === itemId && slot.quantity < def.maxStack) {
          const canAdd = Math.min(remaining, def.maxStack - slot.quantity);
          slot.quantity += canAdd;
          remaining -= canAdd;
          if (remaining <= 0) break;
        }
      }
    }

    // Create new slots for remaining
    while (remaining > 0 && this.slots.length < this.maxSlots) {
      const count = def.stackable ? Math.min(remaining, def.maxStack) : 1;
      this.slots.push({ itemId, quantity: count });
      remaining -= count;
    }

    const added = quantity - remaining;
    if (added > 0) this._notifyChange();
    return added;
  }

  /**
   * Remove item from inventory. Returns amount actually removed.
   */
  removeItem(itemId, quantity = 1) {
    let remaining = quantity;

    // Remove from last stacks first
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i];
      if (slot.itemId !== itemId) continue;

      const canRemove = Math.min(remaining, slot.quantity);
      slot.quantity -= canRemove;
      remaining -= canRemove;

      if (slot.quantity <= 0) {
        this.slots.splice(i, 1);
      }
    }

    const removed = quantity - remaining;
    if (removed > 0) this._notifyChange();
    return removed;
  }

  /**
   * Check if player has at least `quantity` of an item.
   */
  hasItem(itemId, quantity = 1) {
    return this.getItemCount(itemId) >= quantity;
  }

  /**
   * Get total count of an item across all slots.
   */
  getItemCount(itemId) {
    let count = 0;
    for (const slot of this.slots) {
      if (slot.itemId === itemId) count += slot.quantity;
    }
    return count;
  }

  /**
   * Get all unique items with counts.
   */
  getItemSummary() {
    const map = {};
    for (const slot of this.slots) {
      map[slot.itemId] = (map[slot.itemId] || 0) + slot.quantity;
    }
    return Object.entries(map).map(([id, qty]) => ({
      item: getItem(id),
      quantity: qty,
    }));
  }

  /**
   * Get items by category.
   */
  getItemsByCategory(category) {
    return this.getItemSummary().filter(s => s.item && s.item.category === category);
  }

  // ── Equip / Unequip ────────────────────────────────────

  /**
   * Equip an item from inventory. Returns true on success.
   */
  equip(itemId) {
    const def = getItem(itemId);
    if (!def) return false;
    if (!def.effects || !def.effects.slot) return false;
    if (!this.hasItem(itemId)) return false;

    const slot = def.effects.slot;
    // Unequip current item in that slot
    if (this.equipment[slot]) {
      this.addItem(this.equipment[slot], 1);
    }

    this.removeItem(itemId, 1);
    this.equipment[slot] = itemId;
    this._notifyChange();
    return true;
  }

  /**
   * Unequip an item slot. Returns it to inventory.
   */
  unequip(slot) {
    const itemId = this.equipment[slot];
    if (!itemId) return false;

    const added = this.addItem(itemId, 1);
    if (added > 0) {
      this.equipment[slot] = null;
      this._notifyChange();
      return true;
    }
    return false; // inventory full
  }

  /**
   * Get combined equipment stat bonuses.
   * @returns {{ damage: number, defence: number, hp: number, speedBonus: number, lifesteal: number, critChance: number }}
   */
  getEquipmentBonuses() {
    const bonuses = { damage: 0, defence: 0, hp: 0, speedBonus: 0, lifesteal: 0, critChance: 0, attackSpeed: 0 };
    for (const slot of Object.keys(this.equipment)) {
      const itemId = this.equipment[slot];
      if (!itemId) continue;
      const def = getItem(itemId);
      if (!def || !def.effects) continue;
      const e = def.effects;
      if (e.damage) bonuses.damage += e.damage;
      if (e.defence) bonuses.defence += e.defence;
      if (e.hp) bonuses.hp += e.hp;
      if (e.speedBonus) bonuses.speedBonus += e.speedBonus;
      if (e.speedPenalty) bonuses.speedBonus += e.speedPenalty;
      if (e.lifesteal) bonuses.lifesteal += e.lifesteal;
      if (e.critChance) bonuses.critChance += e.critChance;
      if (e.attackSpeed) bonuses.attackSpeed += e.attackSpeed;
    }
    return bonuses;
  }

  // ── Use consumable ──────────────────────────────────────

  /**
   * Use a consumable item. Returns the effect object or null.
   * @param {string} itemId
   * @param {object} callbacks - { healPlayer, restoreStamina, cureStatus, applyBuff }
   */
  useConsumable(itemId, callbacks = {}) {
    const def = getItem(itemId);
    if (!def || def.category !== 'consumable') return null;
    if (!this.hasItem(itemId)) return null;

    // Check cooldown
    const cd = this._cooldowns.get(itemId) || 0;
    if (cd > 0) return null;

    const e = def.effects;
    this.removeItem(itemId, 1);

    // Apply cooldown
    if (e.cooldown) {
      this._cooldowns.set(itemId, e.cooldown);
    }

    // Apply effect
    switch (e.type) {
      case 'heal':
        if (callbacks.healPlayer) callbacks.healPlayer(e.amount);
        break;
      case 'stamina':
        if (callbacks.restoreStamina) callbacks.restoreStamina(e.amount);
        break;
      case 'cure':
        if (callbacks.cureStatus) callbacks.cureStatus(e.status);
        break;
      case 'buff':
        if (callbacks.applyBuff) callbacks.applyBuff(e.stat, e.mult, e.duration);
        break;
    }

    this._notifyChange();
    return e;
  }

  // ── Shop actions ────────────────────────────────────────

  /**
   * Buy item from shop. Deducts gold.
   */
  buyItem(itemId, quantity = 1) {
    const def = getItem(itemId);
    if (!def) return false;

    const totalCost = def.buyPrice * quantity;
    if (this.gold < totalCost) return false;

    const added = this.addItem(itemId, quantity);
    if (added > 0) {
      this.gold -= def.buyPrice * added;
      this._notifyChange();
      return true;
    }
    return false;
  }

  /**
   * Sell item from inventory. Awards gold.
   */
  sellItem(itemId, quantity = 1) {
    const def = getItem(itemId);
    if (!def) return false;

    const removed = this.removeItem(itemId, quantity);
    if (removed > 0) {
      this.gold += def.sellPrice * removed;
      this._notifyChange();
      return true;
    }
    return false;
  }

  // ── Update (cooldown ticking) ───────────────────────────

  update(dt) {
    for (const [id, cd] of this._cooldowns) {
      const newCd = cd - dt;
      if (newCd <= 0) this._cooldowns.delete(id);
      else this._cooldowns.set(id, newCd);
    }
  }

  getCooldown(itemId) {
    return this._cooldowns.get(itemId) || 0;
  }

  // ── Serialization ─────────────────────────────────────────

  serialize() {
    return {
      slots: this.slots.map(s => ({ ...s })),
      equipment: { ...this.equipment },
      gold: this.gold,
    };
  }

  deserialize(data) {
    if (!data) return;
    this.slots = (data.slots || []).map(s => ({ ...s }));
    this.equipment = { weapon: null, head: null, chest: null, feet: null, accessory: null, ...data.equipment };
    this.gold = data.gold || 100;
    this._notifyChange();
  }

  /**
   * Get inventory size info.
   */
  getCapacity() {
    return { used: this.slots.length, max: this.maxSlots };
  }

  dispose() {
    this.slots = [];
    this.equipment = { weapon: null, head: null, chest: null, feet: null, accessory: null };
    this.gold = 100;
    this._cooldowns.clear();
  }
}

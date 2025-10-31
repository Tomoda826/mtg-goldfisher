// Permanent State - Phase 1: Foundation
// Enhanced permanent tracking with counters, modifications, and status flags
// Prepares for Phase 2 (Static Effects) and Phase 5 (Counter Management)

/**
 * Enhanced Permanent Structure
 * Extends basic card object with rich state tracking
 * 
 * @typedef {Object} EnhancedPermanent
 * @property {string} name - Card name
 * @property {string} category - Card type (creature, artifact, etc.)
 * @property {string} oracle_text - Full card text
 * @property {string} mana_cost - Mana cost string
 * @property {number} cmc - Converted mana cost
 * @property {string} power - Base power (creatures)
 * @property {string} toughness - Base toughness (creatures)
 * @property {string} type_line - Full type line
 * 
 * // NEW ENHANCED FIELDS:
 * @property {Object} counters - All counters on this permanent
 * @property {Object} modifications - Temporary modifications from effects
 * @property {Object} status - Current status flags
 * @property {Array} triggers - Detected triggered abilities
 * @property {Object} metadata - Game metadata
 */

/**
 * Counter Types
 */
export const COUNTER_TYPES = {
  PLUS_ONE_PLUS_ONE: '+1/+1',
  MINUS_ONE_MINUS_ONE: '-1/-1',
  LOYALTY: 'loyalty',
  CHARGE: 'charge',
  QUEST: 'quest',
  VERSE: 'verse',
  TIME: 'time',
  AGE: 'age',
  DIVINITY: 'divinity',
  // Add more as needed
};

/**
 * Status Flags
 */
export const STATUS_FLAGS = {
  TAPPED: 'tapped',
  SUMMONING_SICK: 'summoningSick',
  PHASED_OUT: 'phasedOut',
  FLIPPED: 'flipped',
  TRANSFORMED: 'transformed',
  FACE_DOWN: 'faceDown',
  ATTACKING: 'attacking',
  BLOCKING: 'blocking',
};

/**
 * Create an enhanced permanent from a basic card
 * This is called when a permanent enters the battlefield
 * @param {Object} card - Basic card object
 * @param {Object} game - Game state (for context)
 * @returns {EnhancedPermanent} Enhanced permanent object
 */
export function createEnhancedPermanent(card, game = null) {
  // Start with all existing card properties
  const permanent = { ...card };
  
  // Add counter tracking
  permanent.counters = {
    [COUNTER_TYPES.PLUS_ONE_PLUS_ONE]: 0,
    [COUNTER_TYPES.MINUS_ONE_MINUS_ONE]: 0,
    [COUNTER_TYPES.LOYALTY]: 0,
    custom: {} // For unusual counter types
  };
  
  // Initialize loyalty counters for planeswalkers
  if (card.category === 'planeswalker' && card.loyalty) {
    permanent.counters[COUNTER_TYPES.LOYALTY] = parseInt(card.loyalty) || 0;
  }
  
  // Add modification tracking (from static effects, auras, equipment, etc.)
  permanent.modifications = {
    powerBonus: 0,      // +X/+0 effects
    toughnessBonus: 0,  // +0/+X effects
    keywords: [],       // Granted keywords (flying, trample, etc.)
    abilities: [],      // Granted activated/triggered abilities
    costReduction: 0,   // Cost reduction effects
    cantAttack: false,  // "Can't attack" restrictions
    cantBlock: false,   // "Can't block" restrictions
    cantActivate: false // "Can't activate abilities" restrictions
  };
  
  // Add status flags
  permanent.status = {
    [STATUS_FLAGS.TAPPED]: card.tapped || false,
    [STATUS_FLAGS.SUMMONING_SICK]: card.summoningSick || false,
    [STATUS_FLAGS.PHASED_OUT]: false,
    [STATUS_FLAGS.FLIPPED]: false,
    [STATUS_FLAGS.TRANSFORMED]: false,
    [STATUS_FLAGS.FACE_DOWN]: false,
    [STATUS_FLAGS.ATTACKING]: false,
    [STATUS_FLAGS.BLOCKING]: false
  };
  
  // Add trigger tracking (will be populated by triggerHandler)
  permanent.triggers = card.triggers || [];
  
  // Add metadata
  permanent.metadata = {
    enteredThisTurn: true,
    turnEntered: game?.turn || 0,
    attackedThisTurn: false,
    damageTakenThisTurn: 0,
    lastModified: Date.now(),
    instanceId: generateInstanceId() // Unique ID for this permanent instance
  };
  
  // Preserve original values for calculations
  permanent.basePower = card.power;
  permanent.baseToughness = card.toughness;
  
  return permanent;
}

/**
 * Generate a unique instance ID for permanents
 * Useful for tracking specific permanent instances
 * @returns {string} Unique ID
 */
function generateInstanceId() {
  return `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Add counters to a permanent
 * Handles +1/+1 and -1/-1 counter annihilation (rule 704.5q)
 * @param {EnhancedPermanent} permanent - Permanent to modify
 * @param {string} counterType - Type of counter (from COUNTER_TYPES)
 * @param {number} amount - Number of counters to add
 * @returns {number} Actual number of counters added (after annihilation)
 */
export function addCounters(permanent, counterType, amount) {
  if (amount <= 0) return 0;
  
  // Handle standard counter types
  if (permanent.counters.hasOwnProperty(counterType)) {
    permanent.counters[counterType] += amount;
  } else {
    // Custom counter type
    if (!permanent.counters.custom[counterType]) {
      permanent.counters.custom[counterType] = 0;
    }
    permanent.counters.custom[counterType] += amount;
  }
  
  // Handle +1/+1 and -1/-1 counter annihilation (MTG Rule 704.5q)
  // "If a permanent has both a +1/+1 counter and a -1/-1 counter on it,
  //  N +1/+1 and N -1/-1 counters are removed from it, where N is the
  //  smaller of the number of +1/+1 and -1/-1 counters on it."
  if (counterType === COUNTER_TYPES.PLUS_ONE_PLUS_ONE || 
      counterType === COUNTER_TYPES.MINUS_ONE_MINUS_ONE) {
    const plusCounters = permanent.counters[COUNTER_TYPES.PLUS_ONE_PLUS_ONE];
    const minusCounters = permanent.counters[COUNTER_TYPES.MINUS_ONE_MINUS_ONE];
    
    if (plusCounters > 0 && minusCounters > 0) {
      const toRemove = Math.min(plusCounters, minusCounters);
      permanent.counters[COUNTER_TYPES.PLUS_ONE_PLUS_ONE] -= toRemove;
      permanent.counters[COUNTER_TYPES.MINUS_ONE_MINUS_ONE] -= toRemove;
      
      console.log(`⚖️ Counter annihilation: Removed ${toRemove} +1/+1 and ${toRemove} -1/-1 counters from ${permanent.name}`);
    }
  }
  
  permanent.metadata.lastModified = Date.now();
  return amount;
}

/**
 * Remove counters from a permanent
 * @param {EnhancedPermanent} permanent - Permanent to modify
 * @param {string} counterType - Type of counter
 * @param {number} amount - Number of counters to remove
 * @returns {number} Actual number removed (capped at current amount)
 */
export function removeCounters(permanent, counterType, amount) {
  if (amount <= 0) return 0;
  
  let currentAmount = 0;
  
  // Get current amount
  if (permanent.counters.hasOwnProperty(counterType)) {
    currentAmount = permanent.counters[counterType];
  } else if (permanent.counters.custom[counterType]) {
    currentAmount = permanent.counters.custom[counterType];
  }
  
  // Can't remove more than exist
  const actualRemoved = Math.min(amount, currentAmount);
  
  // Remove counters
  if (permanent.counters.hasOwnProperty(counterType)) {
    permanent.counters[counterType] -= actualRemoved;
  } else if (permanent.counters.custom[counterType]) {
    permanent.counters.custom[counterType] -= actualRemoved;
  }
  
  permanent.metadata.lastModified = Date.now();
  return actualRemoved;
}

/**
 * Get current counter count
 * @param {EnhancedPermanent} permanent - Permanent to check
 * @param {string} counterType - Type of counter
 * @returns {number} Current count
 */
export function getCounterCount(permanent, counterType) {
  if (permanent.counters.hasOwnProperty(counterType)) {
    return permanent.counters[counterType];
  }
  if (permanent.counters.custom[counterType]) {
    return permanent.counters.custom[counterType];
  }
  return 0;
}

/**
 * Apply a temporary modification to a permanent
 * Used for static effects, auras, equipment, etc.
 * @param {EnhancedPermanent} permanent - Permanent to modify
 * @param {Object} modification - Modification to apply
 */
export function applyModification(permanent, modification) {
  if (modification.powerBonus) {
    permanent.modifications.powerBonus += modification.powerBonus;
  }
  
  if (modification.toughnessBonus) {
    permanent.modifications.toughnessBonus += modification.toughnessBonus;
  }
  
  if (modification.keywords) {
    permanent.modifications.keywords.push(...modification.keywords);
  }
  
  if (modification.abilities) {
    permanent.modifications.abilities.push(...modification.abilities);
  }
  
  permanent.metadata.lastModified = Date.now();
}

/**
 * Remove a temporary modification
 * @param {EnhancedPermanent} permanent - Permanent to modify
 * @param {Object} modification - Modification to remove
 */
export function removeModification(permanent, modification) {
  if (modification.powerBonus) {
    permanent.modifications.powerBonus -= modification.powerBonus;
  }
  
  if (modification.toughnessBonus) {
    permanent.modifications.toughnessBonus -= modification.toughnessBonus;
  }
  
  // Remove keywords and abilities (more complex - need to track sources)
  // For Phase 1, we'll keep this simple
  
  permanent.metadata.lastModified = Date.now();
}

/**
 * Calculate effective power/toughness
 * Takes into account base stats, counters, and modifications
 * @param {EnhancedPermanent} permanent - Permanent to calculate
 * @returns {Object} {power, toughness}
 */
export function calculateEffectiveStats(permanent) {
  if (permanent.category !== 'creature') {
    return { power: 0, toughness: 0 };
  }
  
  // Start with base stats
  let power = parseInt(permanent.basePower) || 0;
  let toughness = parseInt(permanent.baseToughness) || 0;
  
  // Add counters
  power += permanent.counters[COUNTER_TYPES.PLUS_ONE_PLUS_ONE] || 0;
  toughness += permanent.counters[COUNTER_TYPES.PLUS_ONE_PLUS_ONE] || 0;
  
  power -= permanent.counters[COUNTER_TYPES.MINUS_ONE_MINUS_ONE] || 0;
  toughness -= permanent.counters[COUNTER_TYPES.MINUS_ONE_MINUS_ONE] || 0;
  
  // Add modifications (from static effects, auras, etc.)
  power += permanent.modifications.powerBonus || 0;
  toughness += permanent.modifications.toughnessBonus || 0;
  
  // Minimum 0 (can't go negative in MTG for display purposes)
  power = Math.max(0, power);
  toughness = Math.max(0, toughness);
  
  return { power, toughness };
}

/**
 * Update permanent state (called each turn/phase)
 * Clears turn-based flags, updates metadata
 * @param {EnhancedPermanent} permanent - Permanent to update
 * @param {Object} game - Game state
 */
export function updatePermanentState(permanent, game) {
  // Clear turn-based flags at start of turn
  if (permanent.metadata.turnEntered < game.turn) {
    permanent.metadata.enteredThisTurn = false;
  }
  
  // Clear summoning sickness at start of turn
  if (permanent.status[STATUS_FLAGS.SUMMONING_SICK] && 
      permanent.metadata.turnEntered < game.turn) {
    permanent.status[STATUS_FLAGS.SUMMONING_SICK] = false;
  }
  
  // Clear "attacked this turn" flag
  if (game.phase === 'untap') {
    permanent.metadata.attackedThisTurn = false;
    permanent.metadata.damageTakenThisTurn = 0;
    permanent.status[STATUS_FLAGS.ATTACKING] = false;
    permanent.status[STATUS_FLAGS.BLOCKING] = false;
  }
}

/**
 * Check if a permanent can attack
 * @param {EnhancedPermanent} permanent - Permanent to check
 * @returns {boolean} True if can attack
 */
export function canAttack(permanent) {
  if (permanent.category !== 'creature') return false;
  if (permanent.status[STATUS_FLAGS.TAPPED]) return false;
  if (permanent.status[STATUS_FLAGS.SUMMONING_SICK]) return false;
  if (permanent.modifications.cantAttack) return false;
  
  return true;
}

/**
 * Check if a permanent can block
 * @param {EnhancedPermanent} permanent - Permanent to check
 * @returns {boolean} True if can block
 */
export function canBlock(permanent) {
  if (permanent.category !== 'creature') return false;
  if (permanent.status[STATUS_FLAGS.TAPPED]) return false;
  if (permanent.modifications.cantBlock) return false;
  
  return true;
}

/**
 * Check if a permanent has a specific keyword
 * @param {EnhancedPermanent} permanent - Permanent to check
 * @param {string} keyword - Keyword to check for (e.g., 'flying', 'haste')
 * @returns {boolean} True if has keyword
 */
export function hasKeyword(permanent, keyword) {
  const text = permanent.oracle_text?.toLowerCase() || '';
  const keywordLower = keyword.toLowerCase();
  
  // Check oracle text
  if (text.includes(keywordLower)) return true;
  
  // Check granted keywords
  if (permanent.modifications.keywords.some(k => k.toLowerCase() === keywordLower)) {
    return true;
  }
  
  return false;
}

/**
 * Tap a permanent
 * @param {EnhancedPermanent} permanent - Permanent to tap
 */
export function tapPermanent(permanent) {
  permanent.status[STATUS_FLAGS.TAPPED] = true;
  permanent.tapped = true; // For backward compatibility
  permanent.metadata.lastModified = Date.now();
}

/**
 * Untap a permanent
 * @param {EnhancedPermanent} permanent - Permanent to untap
 */
export function untapPermanent(permanent) {
  permanent.status[STATUS_FLAGS.TAPPED] = false;
  permanent.tapped = false; // For backward compatibility
  permanent.metadata.lastModified = Date.now();
}

/**
 * Convert existing permanents on battlefield to enhanced permanents
 * This is used during integration to upgrade existing game states
 * @param {Array} permanents - Array of basic permanents
 * @param {Object} game - Game state
 * @returns {Array} Array of enhanced permanents
 */
export function upgradeExistingPermanents(permanents, game) {
  return permanents.map(permanent => {
    // If already enhanced, return as-is
    if (permanent.counters && permanent.modifications && permanent.status) {
      return permanent;
    }
    
    // Otherwise, enhance it
    return createEnhancedPermanent(permanent, game);
  });
}

/**
 * Get summary of permanent state (for logging/debugging)
 * @param {EnhancedPermanent} permanent - Permanent to summarize
 * @returns {string} Human-readable summary
 */
export function getPermanentStateSummary(permanent) {
  const parts = [permanent.name];
  
  // Show counters if any
  const counterSummary = [];
  if (permanent.counters[COUNTER_TYPES.PLUS_ONE_PLUS_ONE] > 0) {
    counterSummary.push(`${permanent.counters[COUNTER_TYPES.PLUS_ONE_PLUS_ONE]} +1/+1`);
  }
  if (permanent.counters[COUNTER_TYPES.MINUS_ONE_MINUS_ONE] > 0) {
    counterSummary.push(`${permanent.counters[COUNTER_TYPES.MINUS_ONE_MINUS_ONE]} -1/-1`);
  }
  if (permanent.counters[COUNTER_TYPES.LOYALTY] > 0) {
    counterSummary.push(`${permanent.counters[COUNTER_TYPES.LOYALTY]} loyalty`);
  }
  
  if (counterSummary.length > 0) {
    parts.push(`[${counterSummary.join(', ')}]`);
  }
  
  // Show stats if creature
  if (permanent.category === 'creature') {
    const stats = calculateEffectiveStats(permanent);
    parts.push(`(${stats.power}/${stats.toughness})`);
  }
  
  // Show status
  const statusFlags = [];
  if (permanent.status[STATUS_FLAGS.TAPPED]) statusFlags.push('tapped');
  if (permanent.status[STATUS_FLAGS.SUMMONING_SICK]) statusFlags.push('sick');
  if (permanent.status[STATUS_FLAGS.ATTACKING]) statusFlags.push('attacking');
  
  if (statusFlags.length > 0) {
    parts.push(`{${statusFlags.join(', ')}}`);
  }
  
  return parts.join(' ');
}

export default {
  createEnhancedPermanent,
  addCounters,
  removeCounters,
  getCounterCount,
  applyModification,
  removeModification,
  calculateEffectiveStats,
  updatePermanentState,
  canAttack,
  canBlock,
  hasKeyword,
  tapPermanent,
  untapPermanent,
  upgradeExistingPermanents,
  getPermanentStateSummary,
  COUNTER_TYPES,
  STATUS_FLAGS
};
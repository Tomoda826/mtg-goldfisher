// Layer System - Phase 2B Week 2
// Applies static effects in correct order according to MTG rules
// Simplified 3-layer system (Type → Keyword → Power/Toughness)

import { LAYERS, EFFECT_CATEGORIES } from './staticEffectsDetector.js';

/**
 * Apply all effects from registry in correct layer order
 * This is the main entry point for applying static effects
 * 
 * @param {Object} game - Game state
 * @param {EffectRegistry} registry - Effect registry with all active effects
 */
export function applyAllLayers(game, registry) {
  if (!game || !registry) return;
  
  // Clear previous calculated values before reapplying
  resetCalculatedValues(game);
  
  // Apply effects in layer order (MTG Rule 613)
  // Layer 4: Type-changing effects
  applyLayerEffects(game, registry, LAYERS.TYPE_EFFECTS);
  
  // Layer 6: Ability-adding/removing effects (keyword grants)
  applyLayerEffects(game, registry, LAYERS.ABILITY_EFFECTS);
  
  // Layer 7c: Power/toughness modifications (anthems)
  applyLayerEffects(game, registry, LAYERS.PT_EFFECTS);
  
  // Log summary if verbose
  if (game.verboseStaticEffects) {
    logLayerApplicationSummary(game, registry);
  }
}

/**
 * Reset all calculated/modified values on permanents
 * Called before reapplying effects
 * 
 * @param {Object} game - Game state
 */
function resetCalculatedValues(game) {
  // Reset creatures
  if (game.battlefield.creatures) {
    game.battlefield.creatures.forEach(creature => {
      // Initialize staticEffects tracking if not present
      if (!creature.staticEffects) {
        creature.staticEffects = {
          powerMod: 0,
          toughnessMod: 0,
          keywords: [],
          typeMod: []
        };
      } else {
        // Reset to base values
        creature.staticEffects.powerMod = 0;
        creature.staticEffects.toughnessMod = 0;
        creature.staticEffects.keywords = [];
        creature.staticEffects.typeMod = [];
      }
    });
  }
  
  // Reset artifacts (for keyword grants)
  if (game.battlefield.artifacts) {
    game.battlefield.artifacts.forEach(artifact => {
      if (!artifact.staticEffects) {
        artifact.staticEffects = {
          keywords: [],
          typeMod: []
        };
      } else {
        artifact.staticEffects.keywords = [];
        artifact.staticEffects.typeMod = [];
      }
    });
  }
}

/**
 * Apply all effects in a specific layer
 * Effects are sorted by timestamp (oldest first) within the layer
 * 
 * @param {Object} game - Game state
 * @param {EffectRegistry} registry - Effect registry
 * @param {number} layer - Layer number to apply
 */
function applyLayerEffects(game, registry, layer) {
  // Get all effects in this layer
  const effects = registry.getEffectsByLayer(layer);
  
  if (effects.length === 0) return;
  
  // Sort by timestamp (oldest first) - MTG Rule 613.7
  effects.sort((a, b) => a.timestamp - b.timestamp);
  
  // Apply each effect in order
  effects.forEach(effect => {
    applyEffect(game, effect, layer);
  });
}

/**
 * Apply a single effect to all matching permanents
 * 
 * @param {Object} game - Game state
 * @param {Object} effect - Effect object from registry
 * @param {number} layer - Current layer being processed
 */
function applyEffect(game, effect, layer) {
  switch (layer) {
    case LAYERS.TYPE_EFFECTS:
      applyTypeEffect(game, effect);
      break;
    
    case LAYERS.ABILITY_EFFECTS:
      applyKeywordEffect(game, effect);
      break;
    
    case LAYERS.PT_EFFECTS:
      applyPowerToughnessEffect(game, effect);
      break;
    
    default:
      console.warn(`Unknown layer: ${layer}`);
  }
}

/**
 * Apply type-changing effect (Layer 4)
 * Example: "Goblins you control are Warriors in addition"
 * 
 * @param {Object} game - Game state
 * @param {Object} effect - Effect object
 */
function applyTypeEffect(game, effect) {
  if (effect.category !== EFFECT_CATEGORIES.TYPE_CHANGE) return;
  
  // Find all matching permanents
  const targets = findMatchingPermanents(game, effect);
  
  // Apply type modification to each
  targets.forEach(permanent => {
    if (!permanent.staticEffects) {
      permanent.staticEffects = { typeMod: [] };
    }
    if (!permanent.staticEffects.typeMod) {
      permanent.staticEffects.typeMod = [];
    }
    
    // Add new types (if not already present)
    if (effect.modification.types) {
      effect.modification.types.forEach(type => {
        if (!permanent.staticEffects.typeMod.includes(type)) {
          permanent.staticEffects.typeMod.push(type);
        }
      });
    }
  });
}

/**
 * Apply keyword grant effect (Layer 6)
 * Example: "Creatures you control have flying"
 * 
 * @param {Object} game - Game state
 * @param {Object} effect - Effect object
 */
function applyKeywordEffect(game, effect) {
  if (effect.category !== EFFECT_CATEGORIES.KEYWORD_GRANT) return;
  
  // Find all matching permanents
  const targets = findMatchingPermanents(game, effect);
  
  // Apply keyword to each
  targets.forEach(permanent => {
    if (!permanent.staticEffects) {
      permanent.staticEffects = { keywords: [] };
    }
    if (!permanent.staticEffects.keywords) {
      permanent.staticEffects.keywords = [];
    }
    
    const keyword = effect.modification.keyword;
    
    // Add keyword if not already granted
    if (!permanent.staticEffects.keywords.includes(keyword)) {
      permanent.staticEffects.keywords.push(keyword);
    }
  });
}

/**
 * Apply power/toughness modification effect (Layer 7c)
 * Example: "Creatures you control get +1/+1"
 * 
 * @param {Object} game - Game state
 * @param {Object} effect - Effect object
 */
function applyPowerToughnessEffect(game, effect) {
  if (effect.category !== EFFECT_CATEGORIES.POWER_TOUGHNESS) return;
  
  // Find all matching permanents
  const targets = findMatchingPermanents(game, effect);
  
  // Apply P/T modification to each
  targets.forEach(permanent => {
    if (!permanent.staticEffects) {
      permanent.staticEffects = { powerMod: 0, toughnessMod: 0 };
    }
    
    if (permanent.staticEffects.powerMod === undefined) {
      permanent.staticEffects.powerMod = 0;
    }
    if (permanent.staticEffects.toughnessMod === undefined) {
      permanent.staticEffects.toughnessMod = 0;
    }
    
    // Add modifications (they stack)
    permanent.staticEffects.powerMod += effect.modification.power || 0;
    permanent.staticEffects.toughnessMod += effect.modification.toughness || 0;
  });
}

/**
 * Find all permanents that match an effect's filter
 * Uses permanentMatchesFilter from detector module
 * 
 * @param {Object} game - Game state
 * @param {Object} effect - Effect with affectedFilter
 * @returns {Array} Array of matching permanents
 */
function findMatchingPermanents(game, effect) {
  const matches = [];
  const filter = effect.affectedFilter;
  
  if (!filter) return matches;
  
  // Check which zones to scan based on filter
  const zonesToCheck = [];
  
  if (filter.cardTypes) {
    if (filter.cardTypes.includes('creature')) zonesToCheck.push('creatures');
    if (filter.cardTypes.includes('artifact')) zonesToCheck.push('artifacts');
    if (filter.cardTypes.includes('enchantment')) zonesToCheck.push('enchantments');
    if (filter.cardTypes.includes('planeswalker')) zonesToCheck.push('planeswalkers');
  }
  
  // Default: check all zones
  if (zonesToCheck.length === 0) {
    zonesToCheck.push('creatures', 'artifacts', 'enchantments', 'planeswalkers');
  }
  
  // Scan each zone for matching permanents
  zonesToCheck.forEach(zone => {
    if (game.battlefield[zone] && Array.isArray(game.battlefield[zone])) {
      game.battlefield[zone].forEach(permanent => {
        if (permanentMatchesFilter(permanent, filter, effect.source)) {
          matches.push(permanent);
        }
      });
    }
  });
  
  return matches;
}

/**
 * Check if a permanent matches an effect's filter
 * Simplified version - imports from detector would be better
 * 
 * @param {Object} permanent - Permanent to check
 * @param {Object} filter - Filter from effect
 * @param {Object} source - Source of effect (for excludeSelf)
 * @returns {boolean} True if matches
 */
function permanentMatchesFilter(permanent, filter, source) {
  if (!permanent || !filter) return false;
  
  // Check card types
  if (filter.cardTypes && filter.cardTypes.length > 0) {
    const permanentCategory = permanent.category || '';
    const permanentTypes = permanent.types || [];
    const permanentTypeLine = (permanent.type_line || '').toLowerCase();
    
    const hasMatchingType = filter.cardTypes.some(type => 
      permanentCategory.includes(type) ||
      permanentTypes.some(t => t.toLowerCase().includes(type)) ||
      permanentTypeLine.includes(type)
    );
    
    if (!hasMatchingType) return false;
  }
  
  // Check subtypes
  if (filter.subtypes && filter.subtypes.length > 0) {
    const permanentTypes = (permanent.type_line || '').toLowerCase();
    const permanentSubtypes = (permanent.types || []).map(t => t.toLowerCase());
    
    const hasMatchingSubtype = filter.subtypes.some(subtype =>
      permanentTypes.includes(subtype) ||
      permanentSubtypes.includes(subtype)
    );
    
    if (!hasMatchingSubtype) return false;
  }
  
  // Check excludeSelf
  if (filter.excludeSelf && source) {
    const sourceId = source.id || source.name;
    const permanentId = permanent.id || permanent.name;
    if (sourceId === permanentId) return false;
  }
  
  return true;
}

/**
 * Calculate final power/toughness for a creature
 * Includes base stats + counters + static effects + temporary mods
 * 
 * @param {Object} creature - Creature permanent
 * @returns {Object} { power, toughness }
 */
export function calculateFinalStats(creature) {
  if (!creature) return { power: 0, toughness: 0 };
  
  // Start with base stats
  let power = parseInt(creature.power) || 0;
  let toughness = parseInt(creature.toughness) || 0;
  
  // Add counters (Layer 7d)
  if (creature.counters) {
    const plusCounters = creature.counters['+1/+1'] || 0;
    const minusCounters = creature.counters['-1/-1'] || 0;
    power += plusCounters - minusCounters;
    toughness += plusCounters - minusCounters;
  }
  
  // Add static effects (Layer 7c - already applied)
  if (creature.staticEffects) {
    power += creature.staticEffects.powerMod || 0;
    toughness += creature.staticEffects.toughnessMod || 0;
  }
  
  // Add temporary modifications (from pump spells)
  if (creature.temporaryModifications && creature.temporaryModifications.length > 0) {
    creature.temporaryModifications.forEach(mod => {
      power += mod.power || 0;
      toughness += mod.toughness || 0;
    });
  }
  
  return {
    power: Math.max(0, power),
    toughness: Math.max(0, toughness)
  };
}

/**
 * Get all keywords a creature has
 * Includes printed keywords + static effect grants
 * 
 * @param {Object} creature - Creature permanent
 * @returns {Array} Array of keyword strings
 */
export function getAllKeywords(creature) {
  if (!creature) return [];
  
  const keywords = [];
  
  // Check oracle text for printed keywords
  const allKeywords = [
    'flying', 'first strike', 'double strike', 'deathtouch',
    'lifelink', 'vigilance', 'trample', 'menace', 'reach',
    'haste', 'defender', 'hexproof', 'indestructible'
  ];
  
  if (creature.oracle_text) {
    const text = creature.oracle_text.toLowerCase();
    allKeywords.forEach(keyword => {
      if (text.includes(keyword) && !keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    });
  }
  
  // Add static effect keywords
  if (creature.staticEffects && creature.staticEffects.keywords) {
    creature.staticEffects.keywords.forEach(keyword => {
      if (!keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    });
  }
  
  return keywords;
}

/**
 * Log summary of layer application for debugging
 * @param {Object} game - Game state
 * @param {EffectRegistry} registry - Effect registry
 */
function logLayerApplicationSummary(game, registry) {
  const anthems = registry.getAnthemEffects();
  const keywords = registry.getKeywordGrantEffects();
  
  if (anthems.length === 0 && keywords.length === 0) return;
  
  console.log('\n=== Static Effects Applied ===');
  
  if (anthems.length > 0) {
    console.log(`Anthems (${anthems.length}):`);
    anthems.forEach(effect => {
      const sign = effect.modification.power >= 0 ? '+' : '';
      console.log(`  ${effect.source.name}: ${sign}${effect.modification.power}/${sign}${effect.modification.toughness}`);
    });
  }
  
  if (keywords.length > 0) {
    console.log(`Keyword Grants (${keywords.length}):`);
    keywords.forEach(effect => {
      console.log(`  ${effect.source.name}: grants ${effect.modification.keyword}`);
    });
  }
  
  console.log('==============================\n');
}

/**
 * Quick helper to recalculate all static effects
 * Call this when board state changes
 * 
 * @param {Object} game - Game state with effectRegistry
 */
export function recalculateStaticEffects(game) {
  if (!game.effectRegistry) {
    console.warn('No effect registry found on game state');
    return;
  }
  
  applyAllLayers(game, game.effectRegistry);
}

/**
 * Get summary of static effects for a permanent
 * Useful for display and logging
 * 
 * @param {Object} permanent - Permanent to summarize
 * @returns {Object} Summary object
 */
export function getStaticEffectsSummary(permanent) {
  if (!permanent || !permanent.staticEffects) {
    return {
      hasMods: false,
      powerMod: 0,
      toughnessMod: 0,
      keywords: [],
      typeMod: []
    };
  }
  
  return {
    hasMods: true,
    powerMod: permanent.staticEffects.powerMod || 0,
    toughnessMod: permanent.staticEffects.toughnessMod || 0,
    keywords: permanent.staticEffects.keywords || [],
    typeMod: permanent.staticEffects.typeMod || []
  };
}
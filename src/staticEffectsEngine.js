// Static Effects Engine - Phase 2B Week 3
// Main coordinator for the static effects system
// Ties together detection, registry, and layer application

import { EffectRegistry } from './effectRegistry.js';
import { detectAllStaticEffects, hasStaticAbility } from './staticEffectsDetector.js';
import { 
  applyAllLayers, 
  calculateFinalStats, 
  recalculateStaticEffects 
} from './layerSystem.js';

/**
 * Initialize static effects system for a game
 * Call this once at game start
 * 
 * @param {Object} game - Game state object
 */
export function initializeStaticEffectsSystem(game) {
  if (!game) return;
  
  // Create effect registry
  game.effectRegistry = new EffectRegistry();
  
  // Scan initial battlefield (if any permanents already present)
  game.effectRegistry.scanBattlefield(game);
  
  // Apply initial effects
  applyAllLayers(game, game.effectRegistry);
  
  console.log('✅ Static effects system initialized');
  
  if (game.detailedLog) {
    game.detailedLog.push({
      turn: game.turn || 0,
      phase: game.phase || 'init',
      action: '🎨 Static Effects System',
      details: 'Initialized static effects system',
      success: true
    });
  }
}

/**
 * Handle permanent entering battlefield
 * Call this whenever a permanent is cast/enters
 * 
 * @param {Object} game - Game state
 * @param {Object} permanent - Permanent that entered
 */
export function onPermanentEntersBattlefield(game, permanent) {
  if (!game || !permanent) return;
  if (!game.effectRegistry) {
    console.warn('Effect registry not initialized');
    return;
  }
  
  // Check if permanent has static abilities
  if (hasStaticAbility(permanent)) {
    // Register its effects
    game.effectRegistry.registerPermanent(permanent);
    
    // Recalculate all effects
    applyAllLayers(game, game.effectRegistry);
    
    // Log if permanent adds effects
    const effects = detectAllStaticEffects(permanent);
    if (effects.length > 0 && game.detailedLog) {
      game.detailedLog.push({
        turn: game.turn,
        phase: game.phase,
        action: '🎨 Static Effect Added',
        source: permanent.name,
        effectCount: effects.length,
        details: `${permanent.name} grants ${effects.length} static effect(s)`,
        success: true
      });
    }
  }
}

/**
 * Handle permanent leaving battlefield
 * Call this whenever a permanent dies/is removed
 * 
 * @param {Object} game - Game state
 * @param {Object} permanent - Permanent that left
 */
export function onPermanentLeavesBattlefield(game, permanent) {
  if (!game || !permanent) return;
  if (!game.effectRegistry) return;
  
  // Check if permanent had effects registered
  if (game.effectRegistry.hasEffects(permanent)) {
    // Remove its effects
    game.effectRegistry.unregisterPermanent(permanent);
    
    // Recalculate all effects
    applyAllLayers(game, game.effectRegistry);
    
    // Log removal
    if (game.detailedLog) {
      game.detailedLog.push({
        turn: game.turn,
        phase: game.phase,
        action: '🗑️ Static Effect Removed',
        source: permanent.name,
        details: `${permanent.name}'s static effects removed`,
        success: true
      });
    }
  }
}

/**
 * Get creature's current power/toughness with all modifications
 * Use this instead of reading creature.power/creature.toughness directly
 * 
 * @param {Object} creature - Creature permanent
 * @returns {Object} { power, toughness, displayString }
 */
export function getCreatureStats(creature) {
  if (!creature) return { power: 0, toughness: 0, displayString: '0/0' };
  
  const stats = calculateFinalStats(creature);
  
  return {
    power: stats.power,
    toughness: stats.toughness,
    displayString: `${stats.power}/${stats.toughness}`
  };
}


/**
 * Helper: Get all keywords from a creature (printed + granted)
 * Parses oracle text and checks for keyword grants from static effects
 * 
 * @param {Object} creature - Creature permanent
 * @returns {Array} Array of lowercase keyword strings
 */
function getAllKeywords(creature) {
  if (!creature) return [];
  
  const keywords = [];
  
  // Common MTG keywords to detect
  const keywordList = [
    'flying', 'first strike', 'double strike', 'deathtouch',
    'lifelink', 'vigilance', 'trample', 'menace', 'reach',
    'haste', 'defender', 'hexproof', 'indestructible',
    'ward', 'flash', 'protection'
  ];
  
  // Check oracle_text for printed keywords
  if (creature.oracle_text) {
    const text = creature.oracle_text.toLowerCase();
    keywordList.forEach(keyword => {
      if (text.includes(keyword) && !keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    });
  }
  
  // Check keywords array (if card data has it)
  if (creature.keywords && Array.isArray(creature.keywords)) {
    creature.keywords.forEach(k => {
      const keyword = k.toLowerCase();
      if (!keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    });
  }
  
  // Check granted keywords from static effects
  if (creature.grantedKeywords && Array.isArray(creature.grantedKeywords)) {
    creature.grantedKeywords.forEach(k => {
      const keyword = k.toLowerCase();
      if (!keywords.includes(keyword)) {
        keywords.push(keyword);
      }
    });
  }
  
  // Check types for implicit keywords (simplified)
  if (creature.types && Array.isArray(creature.types)) {
    const typeLine = creature.types.join(' ').toLowerCase();
    
    // Dragons typically have flying
    if (typeLine.includes('dragon') && !keywords.includes('flying')) {
      keywords.push('flying');
    }
  }
  
  return keywords;
}
/**
 * Get all keywords a creature has (printed + granted)
 * Use this instead of parsing oracle_text directly
 * 
 * @param {Object} creature - Creature permanent
 * @returns {Array} Array of keyword strings
 */
export function getCreatureKeywords(creature) {
  return getAllKeywords(creature);
}

/**
 * Check if creature has a specific keyword
 * @param {Object} creature - Creature permanent
 * @param {string} keyword - Keyword to check (e.g., 'flying')
 * @returns {boolean} True if has keyword
 */
export function creatureHasKeyword(creature, keyword) {
  const keywords = getAllKeywords(creature);
  return keywords.includes(keyword.toLowerCase());
}

/**
 * Get combat-ready creature data
 * Everything combat system needs to know about a creature
 * 
 * @param {Object} creature - Creature permanent
 * @returns {Object} Combat data
 */
export function getCombatData(creature) {
  const stats = getCreatureStats(creature);
  const keywords = getCreatureKeywords(creature);
  
  return {
    name: creature.name,
    power: stats.power,
    toughness: stats.toughness,
    keywords: keywords,
    // Combat-relevant flags
    hasFlying: keywords.includes('flying'),
    hasFirstStrike: keywords.includes('first strike'),
    hasDoubleStrike: keywords.includes('double strike'),
    hasDeathtouch: keywords.includes('deathtouch'),
    hasLifelink: keywords.includes('lifelink'),
    hasVigilance: keywords.includes('vigilance'),
    hasTrample: keywords.includes('trample'),
    hasHaste: keywords.includes('haste'),
    hasDefender: keywords.includes('defender'),
    // Other info
    tapped: creature.tapped || false,
    summoningSick: creature.summoningSick || false
  };
}

/**
 * Get summary of all active static effects
 * For display/debugging
 * 
 * @param {Object} game - Game state
 * @returns {Object} Summary
 */
export function getActiveEffectsSummary(game) {
  if (!game || !game.effectRegistry) {
    return {
      totalEffects: 0,
      anthems: 0,
      keywordGrants: 0,
      costMods: 0,
      summary: 'No static effects active'
    };
  }
  
  const anthems = game.effectRegistry.getAnthemEffects().length;
  const keywords = game.effectRegistry.getKeywordGrantEffects().length;
  const costMods = game.effectRegistry.getCostModificationEffects().length;
  
  return {
    totalEffects: game.effectRegistry.count(),
    anthems: anthems,
    keywordGrants: keywords,
    costMods: costMods,
    summary: game.effectRegistry.getSummary()
  };
}

/**
 * Update static effects for current game state
 * Call this when you're not sure if effects are current
 * 
 * @param {Object} game - Game state
 */
export function updateStaticEffects(game) {
  if (!game || !game.effectRegistry) return;
  
  // Rescan battlefield in case something was missed
  game.effectRegistry.scanBattlefield(game);
  
  // Reapply all effects
  applyAllLayers(game, game.effectRegistry);
}

/**
 * Get detailed stat breakdown for a creature
 * Shows how final stats were calculated
 * 
 * @param {Object} creature - Creature permanent
 * @returns {Object} Breakdown
 */
export function getStatBreakdown(creature) {
  if (!creature) return null;
  
  const basePower = parseInt(creature.power) || 0;
  const baseToughness = parseInt(creature.toughness) || 0;
  
  const breakdown = {
    base: { power: basePower, toughness: baseToughness },
    counters: { power: 0, toughness: 0 },
    staticEffects: { power: 0, toughness: 0 },
    temporary: { power: 0, toughness: 0 },
    final: { power: 0, toughness: 0 }
  };
  
  // Counters
  if (creature.counters) {
    const plusCounters = creature.counters['+1/+1'] || 0;
    const minusCounters = creature.counters['-1/-1'] || 0;
    breakdown.counters.power = plusCounters - minusCounters;
    breakdown.counters.toughness = plusCounters - minusCounters;
  }
  
  // Static effects
  if (creature.staticEffects) {
    breakdown.staticEffects.power = creature.staticEffects.powerMod || 0;
    breakdown.staticEffects.toughness = creature.staticEffects.toughnessMod || 0;
  }
  
  // Temporary modifications
  if (creature.temporaryModifications && creature.temporaryModifications.length > 0) {
    creature.temporaryModifications.forEach(mod => {
      breakdown.temporary.power += mod.power || 0;
      breakdown.temporary.toughness += mod.toughness || 0;
    });
  }
  
  // Calculate final
  breakdown.final.power = Math.max(0,
    breakdown.base.power + 
    breakdown.counters.power + 
    breakdown.staticEffects.power + 
    breakdown.temporary.power
  );
  
  breakdown.final.toughness = Math.max(0,
    breakdown.base.toughness + 
    breakdown.counters.toughness + 
    breakdown.staticEffects.toughness + 
    breakdown.temporary.toughness
  );
  
  return breakdown;
}

/**
 * Format stat breakdown as human-readable string
 * @param {Object} breakdown - From getStatBreakdown()
 * @returns {string} Formatted string
 */
export function formatStatBreakdown(breakdown) {
  if (!breakdown) return '';
  
  const parts = [];
  
  parts.push(`Base: ${breakdown.base.power}/${breakdown.base.toughness}`);
  
  if (breakdown.counters.power !== 0 || breakdown.counters.toughness !== 0) {
    const sign = breakdown.counters.power >= 0 ? '+' : '';
    parts.push(`Counters: ${sign}${breakdown.counters.power}/${sign}${breakdown.counters.toughness}`);
  }
  
  if (breakdown.staticEffects.power !== 0 || breakdown.staticEffects.toughness !== 0) {
    const sign = breakdown.staticEffects.power >= 0 ? '+' : '';
    parts.push(`Static: ${sign}${breakdown.staticEffects.power}/${sign}${breakdown.staticEffects.toughness}`);
  }
  
  if (breakdown.temporary.power !== 0 || breakdown.temporary.toughness !== 0) {
    const sign = breakdown.temporary.power >= 0 ? '+' : '';
    parts.push(`Temp: ${sign}${breakdown.temporary.power}/${sign}${breakdown.temporary.toughness}`);
  }
  
  parts.push(`= ${breakdown.final.power}/${breakdown.final.toughness}`);
  
  return parts.join(', ');
}

/**
 * Get all creatures with their calculated stats
 * Useful for displaying battlefield state
 * 
 * @param {Object} game - Game state
 * @returns {Array} Array of creature data
 */
export function getAllCreaturesWithStats(game) {
  if (!game || !game.battlefield || !game.battlefield.creatures) {
    return [];
  }
  
  return game.battlefield.creatures.map(creature => {
    const stats = getCreatureStats(creature);
    const keywords = getCreatureKeywords(creature);
    
    return {
      name: creature.name,
      basePower: parseInt(creature.power) || 0,
      baseToughness: parseInt(creature.toughness) || 0,
      finalPower: stats.power,
      finalToughness: stats.toughness,
      keywords: keywords,
      tapped: creature.tapped || false,
      summoningSick: creature.summoningSick || false
    };
  });
}

/**
 * Log current battlefield state with calculated stats
 * For debugging
 * 
 * @param {Object} game - Game state
 */
export function logBattlefieldState(game) {
  console.log('\n=== Battlefield State ===');
  
  const effectsSummary = getActiveEffectsSummary(game);
  console.log(`Active Effects: ${effectsSummary.summary}`);
  
  const creatures = getAllCreaturesWithStats(game);
  if (creatures.length === 0) {
    console.log('No creatures on battlefield');
  } else {
    console.log(`\nCreatures (${creatures.length}):`);
    creatures.forEach(creature => {
      const statChange = creature.finalPower !== creature.basePower || 
                        creature.finalToughness !== creature.baseToughness;
      const statsDisplay = statChange 
        ? `${creature.basePower}/${creature.baseToughness} → ${creature.finalPower}/${creature.finalToughness}`
        : `${creature.finalPower}/${creature.finalToughness}`;
      
      let flags = [];
      if (creature.tapped) flags.push('tapped');
      if (creature.summoningSick) flags.push('sick');
      const flagsDisplay = flags.length > 0 ? ` [${flags.join(', ')}]` : '';
      
      const keywordsDisplay = creature.keywords.length > 0 
        ? ` (${creature.keywords.join(', ')})` 
        : '';
      
      console.log(`  ${creature.name}: ${statsDisplay}${keywordsDisplay}${flagsDisplay}`);
    });
  }
  
  console.log('========================\n');
}

/**
 * Validate static effects system is working correctly
 * Returns any issues found
 * 
 * @param {Object} game - Game state
 * @returns {Array} Array of issue strings (empty if all good)
 */
export function validateStaticEffectsSystem(game) {
  const issues = [];
  
  if (!game) {
    issues.push('Game state is null');
    return issues;
  }
  
  if (!game.effectRegistry) {
    issues.push('Effect registry not initialized');
  }
  
  if (!game.battlefield) {
    issues.push('Battlefield not initialized');
  }
  
  // Check for permanents with static abilities but no effects registered
  if (game.battlefield && game.effectRegistry) {
    const zones = ['creatures', 'artifacts', 'enchantments', 'planeswalkers'];
    zones.forEach(zone => {
      if (game.battlefield[zone]) {
        game.battlefield[zone].forEach(permanent => {
          if (hasStaticAbility(permanent) && !game.effectRegistry.hasEffects(permanent)) {
            issues.push(`${permanent.name} has static ability but not registered`);
          }
        });
      }
    });
  }
  
  // Check for creatures without staticEffects tracking
  if (game.battlefield && game.battlefield.creatures) {
    game.battlefield.creatures.forEach(creature => {
      if (!creature.staticEffects) {
        issues.push(`${creature.name} missing staticEffects tracking`);
      }
    });
  }
  
  return issues;
}

/**
 * Fix common static effects issues
 * @param {Object} game - Game state
 */
export function fixStaticEffectsIssues(game) {
  if (!game) return;
  
  // Initialize registry if missing
  if (!game.effectRegistry) {
    initializeStaticEffectsSystem(game);
  }
  
  // Rescan and reapply
  updateStaticEffects(game);
  
  console.log('✅ Static effects system repaired');
}

/**
 * Get AI context about static effects
 * For inclusion in AI prompts
 * 
 * @param {Object} game - Game state
 * @returns {Object} AI context
 */
export function getAIContext(game) {
  if (!game || !game.effectRegistry) {
    return {
      hasStaticEffects: false,
      summary: 'No static effects active'
    };
  }
  
  const summary = getActiveEffectsSummary(game);
  const creatures = getAllCreaturesWithStats(game);
  
  // Find creatures with boosted stats
  const boostedCreatures = creatures.filter(c => 
    c.finalPower !== c.basePower || c.finalToughness !== c.baseToughness
  );
  
  // Find creatures with granted keywords
  const creaturesWithGrantedKeywords = game.battlefield.creatures.filter(c => 
    c.staticEffects && c.staticEffects.keywords && c.staticEffects.keywords.length > 0
  );
  
  return {
    hasStaticEffects: summary.totalEffects > 0,
    summary: summary.summary,
    anthemCount: summary.anthems,
    keywordGrantCount: summary.keywordGrants,
    costModCount: summary.costMods,
    boostedCreatures: boostedCreatures.map(c => ({
      name: c.name,
      stats: `${c.basePower}/${c.baseToughness} → ${c.finalPower}/${c.finalToughness}`
    })),
    grantedKeywords: creaturesWithGrantedKeywords.map(c => ({
      name: c.name,
      keywords: c.staticEffects.keywords
    }))
  };
}

// Export all functions
export default {
  initializeStaticEffectsSystem,
  onPermanentEntersBattlefield,
  onPermanentLeavesBattlefield,
  getCreatureStats,
  getCreatureKeywords,
  creatureHasKeyword,
  getCombatData,
  getActiveEffectsSummary,
  updateStaticEffects,
  getStatBreakdown,
  formatStatBreakdown,
  getAllCreaturesWithStats,
  logBattlefieldState,
  validateStaticEffectsSystem,
  fixStaticEffectsIssues,
  getAIContext
};
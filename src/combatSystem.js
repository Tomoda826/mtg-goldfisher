// Combat System - Phase 2A
// Enhanced combat with keyword mechanics: vigilance, lifelink, haste
// Replaces basic combatPhase() with full keyword support

import { createEvent, EVENT_TYPES } from './eventSystem.js';

/**
 * Main entry point - execute full combat phase
 * Replaces combatPhase() call in enhancedStepByStepGame.js
 * 
 * @param {Object} game - Current game state
 * @returns {Object} Combat results (attackers, damage, life gained, keywords)
 */
export function executeCombat(game) {
  const results = {
    attackers: [],
    damage: 0,
    lifeGained: 0,
    keywords: [],
    combatLog: []
  };
  
  // Step 1: Select creatures that can attack
  const attackers = selectAttackers(game);
  results.attackers = attackers;
  
  if (attackers.length === 0) {
    game.detailedLog?.push({
      turn: game.turn,
      phase: 'combat',
      action: '⚔️ Combat Phase',
      details: 'No creatures available to attack',
      success: false
    });
    return results;
  }
  
  // Step 2: Tap attackers (unless they have vigilance)
  tapAttackers(game, attackers, results);
  
  // Step 3: Calculate damage and apply keyword effects
  attackers.forEach(attacker => {
    const combat = calculateCreatureCombat(attacker, game);
    results.damage += combat.damage;
    results.lifeGained += combat.lifeGained;
    results.keywords.push(...combat.keywords);
    results.combatLog.push({
      creature: attacker.name,
      power: combat.displayPower,
      damage: combat.damage,
      keywords: combat.keywords,
      lifeGained: combat.lifeGained
    });
    
    // Emit CREATURE_ATTACKS event for triggers
    game.eventEmitter?.emit(createEvent(
      EVENT_TYPES.CREATURE_ATTACKS,
      attacker,
      { 
        phase: 'combat',
        damage: combat.damage,
        turn: game.turn
      }
    ));
  });
  
  // Step 4: Apply combat results to game state
  if (!game.damageDealtThisGame) {
    game.damageDealtThisGame = 0;
  }
  game.damageDealtThisGame += results.damage;
  
  if (!game.life) {
    game.life = 40; // Commander starting life
  }
  game.life += results.lifeGained;
  
  // Step 5: Emit COMBAT_DAMAGE_DEALT event for triggers
  if (results.damage > 0) {
    game.eventEmitter?.emit(createEvent(
      EVENT_TYPES.COMBAT_DAMAGE_DEALT,
      null,
      { 
        phase: 'combat',
        amount: results.damage,
        attackers: attackers.length,
        turn: game.turn
      }
    ));
  }
  
  // Step 6: Process combat event queue
  game.eventEmitter?.processEventQueue();
  
  // Step 7: Add detailed combat log entry
  logCombatResults(game, results);
  
  return results;
}

/**
 * Select creatures that can attack this turn
 * Considers summoning sickness, haste, tapped status, defender
 * 
 * @param {Object} game - Game state
 * @returns {Array} Array of creature objects that can attack
 */
function selectAttackers(game) {
  if (!game.battlefield.creatures) return [];
  
  return game.battlefield.creatures.filter(creature => {
    // Can't attack if it has defender
    if (hasKeyword(creature, 'defender')) {
      return false;
    }
    
    // Can't attack if already tapped
    if (creature.tapped) {
      return false;
    }
    
    // Can attack if has haste (even with summoning sickness)
    if (hasKeyword(creature, 'haste')) {
      return true;
    }
    
    // Otherwise, can't attack if summoning sick
    if (creature.summoningSick) {
      return false;
    }
    
    return true;
  });
}

/**
 * Tap attacking creatures (unless they have vigilance)
 * 
 * @param {Object} game - Game state
 * @param {Array} attackers - Creatures attacking
 * @param {Object} results - Combat results object (for logging)
 */
function tapAttackers(game, attackers, results) {
  attackers.forEach(attacker => {
    if (!hasKeyword(attacker, 'vigilance')) {
      attacker.tapped = true;
    } else {
      // Log that creature attacked without tapping
      results.keywords.push('vigilance');
    }
  });
}

/**
 * Calculate combat statistics for a single creature
 * Includes power calculation, keyword effects, life gain
 * 
 * @param {Object} creature - Attacking creature
 * @param {Object} game - Game state (for context)
 * @returns {Object} Combat stats (damage, lifeGained, keywords)
 */
function calculateCreatureCombat(creature, game) {
  const result = {
    damage: 0,
    displayPower: 0,
    lifeGained: 0,
    keywords: []
  };
  
  // Calculate base power
  let power = parseInt(creature.power) || 0;
  result.displayPower = power;
  
  // Add temporary modifications (from pump spells)
  if (creature.temporaryModifications && creature.temporaryModifications.length > 0) {
    creature.temporaryModifications.forEach(mod => {
      power += mod.power || 0;
    });
  }
  
  // Add counters (if tracked on creature)
  if (creature.counters) {
    const plusCounters = creature.counters['+1/+1'] || 0;
    const minusCounters = creature.counters['-1/-1'] || 0;
    power += plusCounters - minusCounters;
  }
  
  result.damage = Math.max(0, power); // Power can't be negative for damage
  
  // Apply keyword effects
  
  // Lifelink: gain life equal to damage dealt
  if (hasKeyword(creature, 'lifelink')) {
    result.lifeGained = result.damage;
    result.keywords.push('lifelink');
  }
  
  // Double strike: deal damage twice (simplified)
  if (hasKeyword(creature, 'double strike')) {
    result.damage *= 2;
    result.keywords.push('double strike');
  }
  
  // Track other combat keywords for logging
  const combatKeywords = [
    'flying', 'first strike', 'trample', 'deathtouch',
    'menace', 'reach', 'vigilance', 'haste'
  ];
  
  combatKeywords.forEach(keyword => {
    if (hasKeyword(creature, keyword) && !result.keywords.includes(keyword)) {
      result.keywords.push(keyword);
    }
  });
  
  return result;
}

/**
 * Check if a creature has a specific keyword ability
 * Searches oracle_text and keywords array
 * 
 * @param {Object} creature - Creature to check
 * @param {string} keyword - Keyword to search for
 * @returns {boolean} True if creature has keyword
 */
function hasKeyword(creature, keyword) {
  if (!creature) return false;
  
  keyword = keyword.toLowerCase();
  
  // Check oracle_text
  if (creature.oracle_text) {
    const text = creature.oracle_text.toLowerCase();
    if (text.includes(keyword)) return true;
  }
  
  // Check keywords array (if exists)
  if (creature.keywords && Array.isArray(creature.keywords)) {
    return creature.keywords.some(k => k.toLowerCase() === keyword);
  }
  
  // Check types (for creatures like "Dragon" with implicit flying)
  // This is a simplification; real game has type-based keywords
  if (creature.types && Array.isArray(creature.types)) {
    const typeLine = creature.types.join(' ').toLowerCase();
    
    // Some common type-based keywords
    if (keyword === 'flying') {
      const flyingTypes = ['dragon', 'angel', 'spirit', 'bird', 'drake', 'sphinx'];
      if (flyingTypes.some(type => typeLine.includes(type))) return true;
    }
  }
  
  return false;
}

/**
 * Get all keywords a creature has
 * Useful for display and AI decision-making
 * 
 * @param {Object} creature - Creature to analyze
 * @returns {Array} Array of keyword strings
 */
export function getCreatureKeywords(creature) {
  if (!creature) return [];
  
  const keywords = [];
  
  const allKeywords = [
    'flying', 'first strike', 'double strike', 'deathtouch',
    'lifelink', 'vigilance', 'trample', 'menace', 'reach',
    'haste', 'defender', 'hexproof', 'indestructible',
    'ward', 'flash', 'protection'
  ];
  
  allKeywords.forEach(keyword => {
    if (hasKeyword(creature, keyword)) {
      keywords.push(keyword);
    }
  });
  
  return keywords;
}

/**
 * Check if a creature can attack (considering all restrictions)
 * Useful for AI decision-making
 * 
 * @param {Object} creature - Creature to check
 * @param {Object} game - Game state
 * @returns {boolean} True if can attack
 */
export function canAttack(creature, game) {
  if (!creature) return false;
  
  // Defender can't attack
  if (hasKeyword(creature, 'defender')) return false;
  
  // Already tapped
  if (creature.tapped) return false;
  
  // Has haste - can attack even with summoning sickness
  if (hasKeyword(creature, 'haste')) return true;
  
  // Otherwise, can't attack if summoning sick
  if (creature.summoningSick) return false;
  
  return true;
}

/**
 * Calculate total potential combat damage
 * Used by AI to evaluate board state
 * 
 * @param {Object} game - Game state
 * @returns {number} Total damage all attackers could deal
 */
export function calculatePotentialDamage(game) {
  if (!game.battlefield.creatures) return 0;
  
  let totalDamage = 0;
  
  game.battlefield.creatures.forEach(creature => {
    if (canAttack(creature, game)) {
      const combat = calculateCreatureCombat(creature, game);
      totalDamage += combat.damage;
    }
  });
  
  return totalDamage;
}

/**
 * Log detailed combat results to game log
 * Creates a comprehensive combat log entry
 * 
 * @param {Object} game - Game state
 * @param {Object} results - Combat results
 */
function logCombatResults(game, results) {
  if (results.attackers.length === 0) return;
  
  // Create main combat log entry
  const uniqueKeywords = [...new Set(results.keywords)];
  
  let details = `${results.attackers.length} attacker(s) dealt ${results.damage} damage`;
  
  if (results.lifeGained > 0) {
    details += `, gained ${results.lifeGained} life`;
  }
  
  if (uniqueKeywords.length > 0) {
    details += ` (keywords: ${uniqueKeywords.join(', ')})`;
  }
  
  game.detailedLog?.push({
    turn: game.turn,
    phase: 'combat',
    action: '⚔️ Combat Phase',
    attackers: results.attackers.length,
    damage: results.damage,
    lifeGained: results.lifeGained,
    keywords: uniqueKeywords,
    details: details,
    success: true,
    combatBreakdown: results.combatLog
  });
  
  // Log individual attackers if detailed logging enabled
  if (game.verboseCombatLog && results.combatLog.length > 0) {
    results.combatLog.forEach(entry => {
      let entryDetails = `${entry.creature} (${entry.power} power) dealt ${entry.damage} damage`;
      
      if (entry.keywords.length > 0) {
        entryDetails += ` [${entry.keywords.join(', ')}]`;
      }
      
      if (entry.lifeGained > 0) {
        entryDetails += ` → gained ${entry.lifeGained} life`;
      }
      
      game.detailedLog?.push({
        turn: game.turn,
        phase: 'combat',
        action: '  ↳ Attacker',
        creature: entry.creature,
        details: entryDetails,
        indent: true
      });
    });
  }
}

/**
 * Get combat summary for AI context
 * Provides AI with information about current combat capabilities
 * 
 * @param {Object} game - Game state
 * @returns {Object} Combat summary
 */
export function getCombatSummary(game) {
  const attackers = selectAttackers(game);
  
  const summary = {
    availableAttackers: attackers.length,
    potentialDamage: 0,
    hasLifelink: false,
    hasVigilance: false,
    hasHaste: false,
    hasEvasion: false, // flying, menace, unblockable
    keywords: []
  };
  
  attackers.forEach(attacker => {
    const combat = calculateCreatureCombat(attacker, game);
    summary.potentialDamage += combat.damage;
    
    if (hasKeyword(attacker, 'lifelink')) summary.hasLifelink = true;
    if (hasKeyword(attacker, 'vigilance')) summary.hasVigilance = true;
    if (hasKeyword(attacker, 'haste')) summary.hasHaste = true;
    if (hasKeyword(attacker, 'flying') || hasKeyword(attacker, 'menace')) {
      summary.hasEvasion = true;
    }
    
    const keywords = getCreatureKeywords(attacker);
    summary.keywords.push(...keywords);
  });
  
  summary.keywords = [...new Set(summary.keywords)]; // Remove duplicates
  
  return summary;
}

/**
 * Clear tapped status during untap step
 * Called from enhancedStepByStepGame during untap phase
 * 
 * @param {Object} game - Game state
 */
export function untapPermanents(game) {
  let untappedCount = 0;
  
  // Untap all permanents (unless they have special restrictions)
  ['creatures', 'artifacts', 'enchantments', 'planeswalkers', 'lands'].forEach(zone => {
    if (game.battlefield[zone]) {
      game.battlefield[zone].forEach(permanent => {
        if (permanent.tapped) {
          // Check for "doesn't untap" effects (Phase 2B feature)
          // For now, just untap everything
          permanent.tapped = false;
          untappedCount++;
        }
      });
    }
  });
  
  if (untappedCount > 0 && game.detailedLog) {
    game.detailedLog.push({
      turn: game.turn,
      phase: 'untap',
      action: '🔓 Untap',
      details: `Untapped ${untappedCount} permanent(s)`,
      success: true
    });
  }
}

/**
 * Remove summoning sickness from creatures
 * Called at start of turn to clear summoning sickness
 * 
 * @param {Object} game - Game state
 */
export function clearSummoningSickness(game) {
  if (!game.battlefield.creatures) return;
  
  let clearedCount = 0;
  
  game.battlefield.creatures.forEach(creature => {
    if (creature.summoningSick) {
      creature.summoningSick = false;
      clearedCount++;
    }
  });
  
  if (clearedCount > 0 && game.verboseCombatLog) {
    game.detailedLog?.push({
      turn: game.turn,
      phase: 'untap',
      action: '⏰ Clear Summoning Sickness',
      details: `${clearedCount} creature(s) no longer summoning sick`,
      success: true
    });
  }
}
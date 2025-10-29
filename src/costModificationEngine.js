// Cost Modification Engine - Phase 2B Week 3
// Calculates modified spell costs based on cost reduction/increase effects
// Integrates with casting logic in gameEngine.js

import { spellMatchesCostFilter } from './staticEffectsDetector.js';
import { parseMana } from './gameEngine.js';

/**
 * Get all cost modifiers that apply to a spell
 * @param {Object} game - Game state with effectRegistry
 * @param {Object} spell - Spell being cast
 * @returns {Object} Modifiers object
 */
export function getCostModifiers(game, spell) {
  const modifiers = {
    genericReduction: 0,
    genericIncrease: 0,
    colorReduction: {}, // For future: {W: 1, U: 1} etc
    colorIncrease: {},
    sources: [] // Track what's modifying cost (for logging)
  };
  
  if (!game || !spell) return modifiers;
  if (!game.effectRegistry) return modifiers;
  
  // Get all cost modification effects
  const costEffects = game.effectRegistry.getCostModificationEffects();
  
  if (costEffects.length === 0) return modifiers;
  
  // Check each effect to see if it applies to this spell
  costEffects.forEach(effect => {
    if (spellMatchesCostFilter(spell, effect.affectedFilter)) {
      // Apply reduction
      if (effect.modification.genericReduction > 0) {
        modifiers.genericReduction += effect.modification.genericReduction;
        modifiers.sources.push({
          source: effect.source.name,
          reduction: effect.modification.genericReduction
        });
      }
      
      // Apply increase
      if (effect.modification.genericIncrease > 0) {
        modifiers.genericIncrease += effect.modification.genericIncrease;
        modifiers.sources.push({
          source: effect.source.name,
          increase: effect.modification.genericIncrease
        });
      }
    }
  });
  
  return modifiers;
}

/**
 * Calculate modified mana cost for a spell
 * Returns modified cost string (e.g., "{1}{U}{B}")
 * 
 * @param {string} baseCost - Original mana cost (e.g., "{3}{U}{B}")
 * @param {Object} modifiers - From getCostModifiers()
 * @returns {string} Modified cost string
 */
export function calculateModifiedCost(baseCost, modifiers) {
  if (!baseCost || !modifiers) return baseCost;
  
  // Parse base cost
  const cost = parseMana(baseCost);
  
  // Apply reductions (reduce generic cost, minimum 0)
  let netModification = modifiers.genericReduction - modifiers.genericIncrease;
  cost.generic = Math.max(0, cost.generic + netModification);
  
  // Recalculate total
  cost.total = cost.generic + cost.W + cost.U + cost.B + cost.R + cost.G + cost.C;
  
  // Build modified cost string
  return buildCostString(cost);
}

/**
 * Build mana cost string from cost object
 * @param {Object} cost - Cost object with W, U, B, R, G, C, generic
 * @returns {string} Cost string (e.g., "{2}{U}{B}")
 */
function buildCostString(cost) {
  let parts = [];
  
  // Generic mana (if any)
  if (cost.generic > 0) {
    parts.push(`{${cost.generic}}`);
  }
  
  // Colored mana
  const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
  colors.forEach(color => {
    for (let i = 0; i < cost[color]; i++) {
      parts.push(`{${color}}`);
    }
  });
  
  return parts.join('');
}

/**
 * Get the total CMC after modifications
 * @param {string} baseCost - Original mana cost
 * @param {Object} modifiers - Cost modifiers
 * @returns {number} Modified total CMC
 */
export function getModifiedCMC(baseCost, modifiers) {
  const modifiedCostString = calculateModifiedCost(baseCost, modifiers);
  const modifiedCost = parseMana(modifiedCostString);
  return modifiedCost.total;
}

/**
 * Check if a spell can be cast with modified cost
 * @param {Object} game - Game state
 * @param {Object} spell - Spell to cast
 * @returns {Object} { canCast, baseCost, modifiedCost, reduction, increase }
 */
export function canCastWithModifiedCost(game, spell) {
  // Get base cost
  const baseCost = parseMana(spell.mana_cost);
  
  // Get modifiers
  const modifiers = getCostModifiers(game, spell);
  
  // Calculate modified cost
  const modifiedCostString = calculateModifiedCost(spell.mana_cost, modifiers);
  const modifiedCost = parseMana(modifiedCostString);
  
  // Check if we can afford modified cost
  const canAfford = canPayModifiedCost(game.manaPool, modifiedCost, game.actualTotalMana);
  
  return {
    canCast: canAfford,
    baseCost: baseCost.total,
    modifiedCost: modifiedCost.total,
    reduction: modifiers.genericReduction,
    increase: modifiers.genericIncrease,
    savings: baseCost.total - modifiedCost.total,
    modifiers: modifiers
  };
}

/**
 * Check if we can pay a modified cost
 * Similar to canPayMana from gameEngine but uses modified cost
 * 
 * @param {Object} manaPool - Available mana
 * @param {Object} cost - Modified cost object from parseMana
 * @param {number} actualTotal - Actual total mana available
 * @returns {boolean} True if can pay
 */
function canPayModifiedCost(manaPool, cost, actualTotal) {
  // Check if we have enough total mana
  if (actualTotal < cost.total) return false;
  
  // Check colored requirements
  const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
  for (const color of colors) {
    if (cost[color] > manaPool[color]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Apply commander tax to a cost
 * Commander tax is always {2} per previous cast, not affected by reducers
 * 
 * @param {string} baseCost - Original mana cost
 * @param {number} commanderCastCount - Times previously cast
 * @returns {string} Cost with tax added
 */
export function applyCommanderTax(baseCost, commanderCastCount) {
  if (commanderCastCount === 0) return baseCost;
  
  const cost = parseMana(baseCost);
  const tax = commanderCastCount * 2;
  
  cost.generic += tax;
  cost.total += tax;
  
  return buildCostString(cost);
}

/**
 * Calculate final cost for commander including both modifications and tax
 * @param {Object} game - Game state
 * @param {Object} commander - Commander card
 * @returns {Object} Cost info
 */
export function getCommanderFinalCost(game, commander) {
  // Get base cost
  const baseCost = parseMana(commander.mana_cost);
  
  // Apply cost modifiers (from cost reducers)
  const modifiers = getCostModifiers(game, commander);
  const modifiedCostString = calculateModifiedCost(commander.mana_cost, modifiers);
  
  // Apply commander tax (tax applies AFTER reductions)
  const castCount = commander.commanderCastCount || 0;
  const finalCostString = applyCommanderTax(modifiedCostString, castCount);
  const finalCost = parseMana(finalCostString);
  
  return {
    baseCost: baseCost.total,
    afterReduction: parseMana(modifiedCostString).total,
    commanderTax: castCount * 2,
    finalCost: finalCost.total,
    costString: finalCostString,
    reduction: modifiers.genericReduction,
    increase: modifiers.genericIncrease
  };
}

/**
 * Get cost information for display/logging
 * @param {Object} game - Game state
 * @param {Object} spell - Spell to check
 * @param {boolean} isCommander - Is this a commander?
 * @returns {Object} Display info
 */
export function getCostDisplayInfo(game, spell, isCommander = false) {
  if (isCommander) {
    const info = getCommanderFinalCost(game, spell);
    
    const parts = [];
    parts.push(`Base: ${info.baseCost}`);
    if (info.reduction > 0) {
      parts.push(`-${info.reduction} (cost reducer)`);
    }
    if (info.commanderTax > 0) {
      parts.push(`+${info.commanderTax} (commander tax)`);
    }
    parts.push(`= ${info.finalCost}`);
    
    return {
      displayString: parts.join(' '),
      finalCost: info.finalCost,
      costString: info.costString,
      hasModifications: info.reduction > 0 || info.commanderTax > 0
    };
  } else {
    const info = canCastWithModifiedCost(game, spell);
    
    if (info.reduction === 0 && info.increase === 0) {
      return {
        displayString: `${info.baseCost} mana`,
        finalCost: info.baseCost,
        costString: spell.mana_cost,
        hasModifications: false
      };
    }
    
    const parts = [];
    parts.push(`Base: ${info.baseCost}`);
    if (info.reduction > 0) {
      parts.push(`-${info.reduction} (cost reducer)`);
    }
    if (info.increase > 0) {
      parts.push(`+${info.increase} (cost increase)`);
    }
    parts.push(`= ${info.modifiedCost}`);
    
    return {
      displayString: parts.join(' '),
      finalCost: info.modifiedCost,
      costString: calculateModifiedCost(spell.mana_cost, info.modifiers),
      hasModifications: true
    };
  }
}

/**
 * Log cost modifications for debugging
 * @param {Object} game - Game state
 * @param {Object} spell - Spell being cast
 */
export function logCostModifications(game, spell) {
  const modifiers = getCostModifiers(game, spell);
  
  if (modifiers.genericReduction === 0 && modifiers.genericIncrease === 0) {
    console.log(`No cost modifications for ${spell.name}`);
    return;
  }
  
  console.log(`\n=== Cost Modifications for ${spell.name} ===`);
  
  if (modifiers.sources.length > 0) {
    modifiers.sources.forEach(source => {
      if (source.reduction) {
        console.log(`  ${source.source}: -{${source.reduction}}`);
      }
      if (source.increase) {
        console.log(`  ${source.source}: +{${source.increase}}`);
      }
    });
  }
  
  const baseCost = parseMana(spell.mana_cost);
  const modifiedCost = getModifiedCMC(spell.mana_cost, modifiers);
  
  console.log(`  Base cost: {${baseCost.total}}`);
  console.log(`  Modified cost: {${modifiedCost}}`);
  console.log(`  Savings: {${baseCost.total - modifiedCost}}`);
  console.log('========================================\n');
}

/**
 * Get AI context about cost modifications
 * For inclusion in AI decision-making prompts
 * 
 * @param {Object} game - Game state
 * @returns {Object} AI context
 */
export function getCostModificationAIContext(game) {
  if (!game || !game.effectRegistry) {
    return {
      hasCostMods: false,
      summary: 'No cost modifiers active'
    };
  }
  
  const costEffects = game.effectRegistry.getCostModificationEffects();
  
  if (costEffects.length === 0) {
    return {
      hasCostMods: false,
      summary: 'No cost modifiers active'
    };
  }
  
  // Summarize what's being reduced
  const reductions = costEffects
    .filter(e => e.modification.genericReduction > 0)
    .map(e => ({
      source: e.source.name,
      types: e.affectedFilter.spellTypes,
      reduction: e.modification.genericReduction
    }));
  
  const increases = costEffects
    .filter(e => e.modification.genericIncrease > 0)
    .map(e => ({
      source: e.source.name,
      types: e.affectedFilter.spellTypes,
      increase: e.modification.genericIncrease
    }));
  
  return {
    hasCostMods: true,
    reductionCount: reductions.length,
    increaseCount: increases.length,
    reductions: reductions,
    increases: increases,
    summary: `${reductions.length} cost reducer(s), ${increases.length} cost increaser(s)`
  };
}

/**
 * Helper to get modified costs for all castable spells in hand
 * Useful for AI to see what it can afford
 * 
 * @param {Object} game - Game state
 * @returns {Array} Array of spell cost info
 */
export function getModifiedCostsForHand(game) {
  if (!game || !game.hand) return [];
  
  return game.hand
    .filter(card => card.category !== 'land') // Exclude lands
    .map(spell => {
      const costInfo = canCastWithModifiedCost(game, spell);
      return {
        name: spell.name,
        category: spell.category,
        baseCost: costInfo.baseCost,
        modifiedCost: costInfo.modifiedCost,
        canAfford: costInfo.canCast,
        savings: costInfo.savings,
        hasReduction: costInfo.reduction > 0,
        hasIncrease: costInfo.increase > 0
      };
    });
}

// Export all functions
export default {
  getCostModifiers,
  calculateModifiedCost,
  getModifiedCMC,
  canCastWithModifiedCost,
  applyCommanderTax,
  getCommanderFinalCost,
  getCostDisplayInfo,
  logCostModifications,
  getCostModificationAIContext,
  getModifiedCostsForHand
};
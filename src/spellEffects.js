// Spell Effects Engine - Phase 2A
// Executes instant/sorcery spell effects: draw, damage, destroy, pump

import { createEvent, EVENT_TYPES } from './eventSystem.js';

/**
 * Main entry point - resolve instant/sorcery effects
 * Called from enhancedStepByStepGame.js after spell is cast
 * 
 * @param {Object} game - Current game state
 * @param {Object} card - Spell card being resolved
 */
export async function resolveSpellEffects(game, card) {
  if (!isInstantOrSorcery(card)) return;
  
  const effects = parseSpellEffects(card.oracle_text, card);
  
  for (const effect of effects) {
    await executeSpellEffect(game, effect, card);
  }
}

/**
 * Parse oracle text into effect objects
 * Detects common spell patterns and creates effect descriptors
 * 
 * @param {string} oracleText - Card's oracle text
 * @param {Object} card - Full card object for context
 * @returns {Array} Array of effect objects
 */
function parseSpellEffects(oracleText, card) {
  if (!oracleText) return [];
  
  const effects = [];
  const text = oracleText.toLowerCase();
  
  // Pattern 1: "Draw X cards" or "Draw a card"
  const drawMatch = text.match(/draw (\d+|a|one|two|three) cards?/i);
  if (drawMatch) {
    const amountStr = drawMatch[1].toLowerCase();
    let amount = 1;
    
    if (amountStr === 'a' || amountStr === 'one') amount = 1;
    else if (amountStr === 'two') amount = 2;
    else if (amountStr === 'three') amount = 3;
    else amount = parseInt(amountStr) || 1;
    
    effects.push({
      type: 'DRAW',
      amount: amount
    });
  }
  
  // Pattern 2: "Deal X damage to any target" or "Deal X damage"
  const damageMatch = text.match(/deal (\d+|x) damage/i);
  if (damageMatch) {
    let amount = 0;
    const amountStr = damageMatch[1].toLowerCase();
    
    if (amountStr === 'x') {
      // Simplified X calculation: use mana spent on spell
      // More sophisticated: would need mana pool state at cast time
      amount = calculateXValue(card, text);
    } else {
      amount = parseInt(amountStr) || 0;
    }
    
    effects.push({
      type: 'DAMAGE',
      amount: amount
    });
  }
  
  // Pattern 3: "Destroy target creature" or "Destroy target permanent"
  if (text.includes('destroy target creature') || 
      text.includes('destroy target permanent')) {
    effects.push({ 
      type: 'DESTROY_CREATURE',
      targetType: text.includes('permanent') ? 'permanent' : 'creature'
    });
  }
  
  // Pattern 4: "Target creature gets +X/+X until end of turn"
  const pumpMatch = text.match(/target creature gets ([+-]\d+)\/([+-]\d+)/i);
  if (pumpMatch) {
    effects.push({
      type: 'PUMP',
      power: parseInt(pumpMatch[1]),
      toughness: parseInt(pumpMatch[2]),
      duration: 'end_of_turn'
    });
  }
  
  // Pattern 5: "You gain X life"
  const lifeGainMatch = text.match(/you gain (\d+) life/i);
  if (lifeGainMatch) {
    effects.push({
      type: 'LIFE_GAIN',
      amount: parseInt(lifeGainMatch[1])
    });
  }
  
  // Pattern 6: "Scry X" (already handled by scryEngine, just log)
  const scryMatch = text.match(/scry (\d+)/i);
  if (scryMatch) {
    // Scry is handled elsewhere, but we note it
    effects.push({
      type: 'SCRY',
      amount: parseInt(scryMatch[1]),
      note: 'Handled by scryEngine'
    });
  }
  
  return effects;
}

/**
 * Calculate X value for X spells
 * Simplified for goldfishing - uses CMC as baseline
 * 
 * @param {Object} card - Spell card
 * @param {string} text - Oracle text
 * @returns {number} Calculated X value
 */
function calculateXValue(card, text) {
  // Simplified: Use total CMC of card
  // In real game, would track mana actually spent
  const cmc = card.cmc || 0;
  
  // If CMC is 0, default to 2 for X spells
  return Math.max(cmc, 2);
}

/**
 * Execute a single spell effect
 * Routes to appropriate handler based on effect type
 * 
 * @param {Object} game - Game state
 * @param {Object} effect - Effect descriptor
 * @param {Object} source - Source card
 */
async function executeSpellEffect(game, effect, source) {
  switch(effect.type) {
    case 'DRAW':
      executeDrawEffect(game, effect.amount, source);
      break;
    case 'DAMAGE':
      executeDamageEffect(game, effect.amount, source);
      break;
    case 'DESTROY_CREATURE':
      executeDestroyEffect(game, source, effect.targetType);
      break;
    case 'PUMP':
      executePumpEffect(game, effect, source);
      break;
    case 'LIFE_GAIN':
      executeLifeGainEffect(game, effect.amount, source);
      break;
    case 'SCRY':
      // Scry handled by scryEngine, skip
      break;
    default:
      console.warn(`Unknown effect type: ${effect.type}`);
  }
}

/**
 * Execute draw effect - add cards from library to hand
 * 
 * @param {Object} game - Game state
 * @param {number} amount - Number of cards to draw
 * @param {Object} source - Source card
 */
function executeDrawEffect(game, amount, source) {
  const cardsDrawn = [];
  
  for (let i = 0; i < amount; i++) {
    if (game.library.length > 0) {
      const card = game.library.pop();
      game.hand.push(card);
      cardsDrawn.push(card.name);
      
      // Emit CARD_DRAWN event for triggers
      game.eventEmitter?.emit(createEvent(
        EVENT_TYPES.CARD_DRAWN,
        card,
        { 
          phase: game.phase, 
          source: source.name,
          turn: game.turn
        }
      ));
    } else {
      // Library empty - in real game would lose, but in goldfishing we just note it
      console.log('⚠️ Library empty, cannot draw more cards');
      break;
    }
  }
  
  if (cardsDrawn.length > 0) {
    game.detailedLog?.push({
      turn: game.turn,
      phase: game.phase,
      action: '📖 Draw Effect',
      source: source.name,
      details: `Drew ${cardsDrawn.length} card(s)${cardsDrawn.length <= 3 ? `: ${cardsDrawn.join(', ')}` : ''}`,
      success: true,
      cardsDrawn: cardsDrawn.length
    });
  }
}

/**
 * Execute damage effect
 * In goldfishing, damage goes to imaginary opponent
 * 
 * @param {Object} game - Game state
 * @param {number} amount - Damage amount
 * @param {Object} source - Source card
 */
function executeDamageEffect(game, amount, source) {
  // Track total damage dealt (for win condition tracking)
  if (!game.damageDealtThisGame) {
    game.damageDealtThisGame = 0;
  }
  game.damageDealtThisGame += amount;
  
  // Emit damage event for triggers
  game.eventEmitter?.emit(createEvent(
    EVENT_TYPES.COMBAT_DAMAGE_DEALT, // Reuse combat damage type
    source,
    { 
      phase: game.phase,
      amount: amount,
      source: 'spell',
      turn: game.turn
    }
  ));
  
  game.detailedLog?.push({
    turn: game.turn,
    phase: game.phase,
    action: '💥 Damage Effect',
    source: source.name,
    details: `Dealt ${amount} damage to opponent (total: ${game.damageDealtThisGame})`,
    success: true,
    damageDealt: amount
  });
}

/**
 * Execute destroy effect
 * In goldfishing, we assume valid target exists
 * Removes creature/permanent from battlefield
 * 
 * @param {Object} game - Game state
 * @param {Object} source - Source card
 * @param {string} targetType - 'creature' or 'permanent'
 */
function executeDestroyEffect(game, source, targetType = 'creature') {
  let destroyed = null;
  let fromZone = null;
  
  if (targetType === 'creature') {
    // Target our own creature (goldfishing simplification)
    // In real game, would target opponent's creature
    const targetIndex = game.battlefield.creatures.findIndex(c => !c.summoningSick);
    
    if (targetIndex !== -1) {
      destroyed = game.battlefield.creatures.splice(targetIndex, 1)[0];
      fromZone = 'creatures';
    }
  } else if (targetType === 'permanent') {
    // Destroy any permanent (prioritize non-lands)
    // Check creatures first, then artifacts, then enchantments
    const zones = ['creatures', 'artifacts', 'enchantments', 'planeswalkers'];
    
    for (const zone of zones) {
      if (game.battlefield[zone] && game.battlefield[zone].length > 0) {
        destroyed = game.battlefield[zone].shift();
        fromZone = zone;
        break;
      }
    }
  }
  
  if (destroyed) {
    game.graveyard.push(destroyed);
    
    // Emit CREATURE_DIES or PERMANENT_LEAVES_BATTLEFIELD event
    const eventType = fromZone === 'creatures' 
      ? EVENT_TYPES.CREATURE_DIES 
      : EVENT_TYPES.PERMANENT_LEAVES_BATTLEFIELD;
      
    game.eventEmitter?.emit(createEvent(
      eventType,
      destroyed,
      { 
        phase: game.phase,
        fromZone: fromZone,
        toZone: 'graveyard',
        turn: game.turn
      }
    ));
    
    game.detailedLog?.push({
      turn: game.turn,
      phase: game.phase,
      action: '💀 Destroy Effect',
      source: source.name,
      target: destroyed.name,
      details: `Destroyed ${destroyed.name} (${fromZone})`,
      success: true
    });
  } else {
    // No valid target
    game.detailedLog?.push({
      turn: game.turn,
      phase: game.phase,
      action: '💀 Destroy Effect',
      source: source.name,
      details: 'No valid target for destroy effect',
      success: false
    });
  }
}

/**
 * Execute pump spell effect - temporary stat boost
 * Adds modification that lasts until end of turn
 * 
 * @param {Object} game - Game state
 * @param {Object} effect - Effect descriptor with power/toughness
 * @param {Object} source - Source card
 */
function executePumpEffect(game, effect, source) {
  // Find first viable target (our own creature, not summoning sick)
  const target = game.battlefield.creatures.find(c => !c.summoningSick && !c.tapped);
  
  if (target) {
    // Initialize temporary modifications array if needed
    if (!target.temporaryModifications) {
      target.temporaryModifications = [];
    }
    
    // Add modification
    target.temporaryModifications.push({
      source: source.name,
      power: effect.power,
      toughness: effect.toughness,
      duration: effect.duration,
      turn: game.turn,
      appliedPhase: game.phase
    });
    
    game.detailedLog?.push({
      turn: game.turn,
      phase: game.phase,
      action: '💪 Pump Effect',
      source: source.name,
      target: target.name,
      details: `${target.name} gets ${effect.power >= 0 ? '+' : ''}${effect.power}/${effect.toughness >= 0 ? '+' : ''}${effect.toughness} until end of turn`,
      success: true,
      modification: { power: effect.power, toughness: effect.toughness }
    });
  } else {
    // No valid target
    game.detailedLog?.push({
      turn: game.turn,
      phase: game.phase,
      action: '💪 Pump Effect',
      source: source.name,
      details: 'No valid target for pump effect',
      success: false
    });
  }
}

/**
 * Execute life gain effect
 * 
 * @param {Object} game - Game state
 * @param {number} amount - Life to gain
 * @param {Object} source - Source card
 */
function executeLifeGainEffect(game, amount, source) {
  if (!game.life) {
    game.life = 40; // Commander starting life
  }
  
  game.life += amount;
  
  // Emit LIFE_GAINED event
  game.eventEmitter?.emit(createEvent(
    EVENT_TYPES.LIFE_GAINED,
    source,
    { 
      phase: game.phase,
      amount: amount,
      turn: game.turn
    }
  ));
  
  game.detailedLog?.push({
    turn: game.turn,
    phase: game.phase,
    action: '💚 Life Gain',
    source: source.name,
    details: `Gained ${amount} life (total: ${game.life})`,
    success: true,
    lifeGained: amount
  });
}

/**
 * Helper: Check if card is instant or sorcery
 * 
 * @param {Object} card - Card to check
 * @returns {boolean} True if instant or sorcery
 */
function isInstantOrSorcery(card) {
  if (!card) return false;
  
  return card.category === 'instant' || 
         card.category === 'sorcery' ||
         (card.types && (
           card.types.includes('Instant') || 
           card.types.includes('Sorcery')
         ));
}

/**
 * Cleanup: Remove temporary effects at end of turn
 * Called during end phase to remove "until end of turn" modifications
 * 
 * @param {Object} game - Game state
 */
export function cleanupEndOfTurnEffects(game) {
  const currentTurn = game.turn;
  let cleanedCount = 0;
  
  // Clean creatures
  game.battlefield.creatures.forEach(creature => {
    if (creature.temporaryModifications) {
      const beforeCount = creature.temporaryModifications.length;
      
      creature.temporaryModifications = creature.temporaryModifications.filter(
        mod => {
          // Keep if not end-of-turn, or if from a future turn
          return mod.duration !== 'end_of_turn' || mod.turn !== currentTurn;
        }
      );
      
      cleanedCount += beforeCount - creature.temporaryModifications.length;
    }
  });
  
  // Clean other permanent types if they have modifications
  ['artifacts', 'enchantments', 'planeswalkers'].forEach(zone => {
    if (game.battlefield[zone]) {
      game.battlefield[zone].forEach(permanent => {
        if (permanent.temporaryModifications) {
          const beforeCount = permanent.temporaryModifications.length;
          
          permanent.temporaryModifications = permanent.temporaryModifications.filter(
            mod => mod.duration !== 'end_of_turn' || mod.turn !== currentTurn
          );
          
          cleanedCount += beforeCount - permanent.temporaryModifications.length;
        }
      });
    }
  });
  
  if (cleanedCount > 0) {
    game.detailedLog?.push({
      turn: game.turn,
      phase: 'end',
      action: '🧹 Cleanup',
      details: `Removed ${cleanedCount} temporary effect(s) from end of turn`,
      success: true,
      effectsCleaned: cleanedCount
    });
  }
}

/**
 * Get summary of spell effects for AI decision-making
 * Helps AI understand what a spell does
 * 
 * @param {Object} card - Spell card
 * @returns {Object} Summary of effects
 */
export function getSpellEffectsSummary(card) {
  if (!isInstantOrSorcery(card)) return null;
  
  const effects = parseSpellEffects(card.oracle_text, card);
  
  const summary = {
    cardName: card.name,
    effectCount: effects.length,
    effectTypes: effects.map(e => e.type),
    draw: effects.filter(e => e.type === 'DRAW').reduce((sum, e) => sum + e.amount, 0),
    damage: effects.filter(e => e.type === 'DAMAGE').reduce((sum, e) => sum + e.amount, 0),
    removal: effects.some(e => e.type === 'DESTROY_CREATURE'),
    pump: effects.some(e => e.type === 'PUMP'),
    lifeGain: effects.filter(e => e.type === 'LIFE_GAIN').reduce((sum, e) => sum + e.amount, 0)
  };
  
  return summary;
}
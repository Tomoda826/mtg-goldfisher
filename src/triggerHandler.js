// Trigger Handler - Phase 1: Foundation
// Detects, matches, and resolves triggered abilities
// Based on MTG Comprehensive Rules 603 (Handling Triggered Abilities)

import { EVENT_TYPES } from './eventSystem.js';

/**
 * Trigger Keywords (Rule 603.1)
 * Triggered abilities begin with "when", "whenever", or "at"
 */
const TRIGGER_KEYWORDS = {
  WHEN: 'when',
  WHENEVER: 'whenever',
  AT: 'at'
};

/**
 * Common Trigger Patterns
 * These are the most common trigger conditions we need to detect
 */
const TRIGGER_PATTERNS = {
  // ETB Triggers (Rule 608.3 - triggers after permanent enters)
  ENTERS_BATTLEFIELD: /when .+ enters the battlefield/i,
  ENTERS_BATTLEFIELD_SELF: /when .+ (enters|enters the battlefield)/i,
  
  // Phase/Step Triggers (Rule 603.2b)
  UPKEEP_BEGIN: /at the beginning of (your|each) upkeep/i,
  DRAW_STEP_BEGIN: /at the beginning of (your|each) draw step/i,
  COMBAT_BEGIN: /at the beginning of combat/i,
  END_STEP_BEGIN: /at the beginning of (your|each|the) end step/i,
  
  // Card Drawing
  DRAW_CARD: /whenever you draw (a|one or more) card/i,
  
  // Combat Triggers
  ATTACKS: /when(ever)? .+ attacks/i,
  BECOMES_BLOCKED: /when(ever)? .+ becomes blocked/i,
  DEALS_COMBAT_DAMAGE: /when(ever)? .+ deals combat damage/i,
  
  // Death Triggers
  DIES: /when .+ (dies|is put into a graveyard from the battlefield)/i,
  CREATURE_DIES: /whenever (a|another) creature (dies|is put into a graveyard)/i,
  
  // Spell Casting
  CAST_SPELL: /whenever you cast (a|an) (spell|instant|sorcery|creature|artifact|enchantment)/i,
  
  // Token Creation
  CREATE_TOKEN: /create .+ token/i,
  
  // Counters
  COUNTER_PLACED: /whenever .+ counter .+ placed on/i,
  
  // Life
  GAIN_LIFE: /whenever you gain life/i,
  LOSE_LIFE: /whenever (you|a player) loses? life/i,
  
  // Ring Mechanic (Phase 4)
  RING_TEMPTS: /whenever the ring tempts you/i,
};

/**
 * Trigger Definition Structure
 * @typedef {Object} TriggerDefinition
 * @property {string} keyword - 'when', 'whenever', or 'at'
 * @property {string} pattern - Matched pattern type
 * @property {string} condition - Full trigger condition text
 * @property {string} effect - Effect that happens when triggered
 * @property {boolean} optional - Whether trigger is optional ("may")
 * @property {Object} sourceCard - Card this trigger belongs to
 * @property {string} eventType - EVENT_TYPES constant this trigger matches
 */

/**
 * Detect all triggers in a card's oracle text
 * Based on Rule 603.1: Triggers have trigger condition and effect
 * @param {Object} card - Card object with oracle_text
 * @returns {Array<TriggerDefinition>} Array of detected triggers
 */
export function detectTriggers(card) {
  if (!card || !card.oracle_text) return [];
  
  const text = card.oracle_text;
  const triggers = [];
  
  // Split text into sentences (triggers are usually one sentence)
  const sentences = text.split(/\.\s+/);
  
  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase();
    
    // Check if this sentence contains a trigger keyword
    let keyword = null;
    if (lowerSentence.includes('whenever')) keyword = TRIGGER_KEYWORDS.WHENEVER;
    else if (lowerSentence.includes('when')) keyword = TRIGGER_KEYWORDS.WHEN;
    else if (lowerSentence.includes('at the beginning')) keyword = TRIGGER_KEYWORDS.AT;
    
    if (!keyword) continue;
    
    // Try to match against known patterns
    const trigger = parseTriggerSentence(sentence, keyword, card);
    if (trigger) {
      triggers.push(trigger);
    }
  }
  
  return triggers;
}

/**
 * Parse a single trigger sentence into a TriggerDefinition
 * @param {string} sentence - Trigger sentence
 * @param {string} keyword - Trigger keyword (when/whenever/at)
 * @param {Object} card - Source card
 * @returns {TriggerDefinition|null} Parsed trigger or null
 */
function parseTriggerSentence(sentence, keyword, card) {
  const lower = sentence.toLowerCase();
  
  // Check if optional (contains "may")
  const optional = lower.includes('you may') || lower.includes('may');
  
  // Split into condition and effect
  // Format: "When/Whenever/At [condition], [effect]"
  const parts = sentence.split(',');
  if (parts.length < 2) {
    // Sometimes there's no comma, effect is after trigger
    // e.g., "When ~ enters the battlefield draw a card"
    // For now, we'll handle the comma case
    return null;
  }
  
  const condition = parts[0].trim();
  const effect = parts.slice(1).join(',').trim();
  
  // Determine what event type this trigger matches
  const eventType = matchTriggerToEventType(lower);
  
  // Determine pattern type for easier matching later
  let pattern = 'GENERIC';
  for (const [patternName, regex] of Object.entries(TRIGGER_PATTERNS)) {
    if (regex.test(lower)) {
      pattern = patternName;
      break;
    }
  }
  
  return {
    keyword,
    pattern,
    condition,
    effect,
    optional,
    sourceCard: card,
    eventType,
    fullText: sentence
  };
}

/**
 * Match a trigger text to an EVENT_TYPES constant
 * @param {string} triggerText - Lowercase trigger text
 * @returns {string|null} Matching EVENT_TYPE or null
 */
function matchTriggerToEventType(triggerText) {
  // ETB triggers
  if (triggerText.includes('enters the battlefield') || triggerText.includes('enters')) {
    return EVENT_TYPES.PERMANENT_ENTERS_BATTLEFIELD;
  }
  
  // Draw triggers
  if (triggerText.includes('draw a card') || triggerText.includes('draw one or more')) {
    return EVENT_TYPES.CARD_DRAWN;
  }
  
  // Cast triggers
  if (triggerText.includes('cast a spell') || 
      triggerText.includes('cast an instant') ||
      triggerText.includes('cast a sorcery')) {
    return EVENT_TYPES.SPELL_CAST;
  }
  
  // Combat triggers
  if (triggerText.includes('attacks')) {
    return EVENT_TYPES.CREATURE_ATTACKS;
  }
  
  if (triggerText.includes('combat damage')) {
    return EVENT_TYPES.COMBAT_DAMAGE_DEALT;
  }
  
  // Death triggers
  if (triggerText.includes('dies') || triggerText.includes('put into a graveyard from the battlefield')) {
    return EVENT_TYPES.CREATURE_DIES;
  }
  
  // Phase triggers
  if (triggerText.includes('beginning of your upkeep') || triggerText.includes('beginning of each upkeep')) {
    return EVENT_TYPES.PHASE_CHANGED; // We'll filter by phase in matching
  }
  
  if (triggerText.includes('beginning of your draw step')) {
    return EVENT_TYPES.PHASE_CHANGED;
  }
  
  if (triggerText.includes('beginning of combat')) {
    return EVENT_TYPES.PHASE_CHANGED;
  }
  
  if (triggerText.includes('beginning of') && triggerText.includes('end step')) {
    return EVENT_TYPES.PHASE_CHANGED;
  }
  
  // Counter triggers
  if (triggerText.includes('counter') && triggerText.includes('placed')) {
    return EVENT_TYPES.COUNTER_ADDED;
  }
  
  // Ring mechanic
  if (triggerText.includes('ring tempts you')) {
    return EVENT_TYPES.RING_TEMPTS_YOU;
  }
  
  // Token creation (not a trigger event type, but used for detection)
  if (triggerText.includes('create') && triggerText.includes('token')) {
    return EVENT_TYPES.TOKEN_CREATED;
  }
  
  return null; // Unknown trigger type
}

/**
 * Check if a trigger matches a game event
 * Based on Rule 603.2: When event matches trigger condition, ability triggers
 * @param {TriggerDefinition} trigger - Trigger to check
 * @param {GameEvent} event - Event that occurred
 * @param {Object} game - Game state
 * @returns {boolean} True if trigger should fire
 */
export function doesTriggerMatch(trigger, event, game) {
  // Basic event type matching
  if (trigger.eventType !== event.type) {
    return false;
  }
  
  const lower = trigger.condition.toLowerCase();
  
  // Special matching logic for different patterns
  switch (trigger.pattern) {
    case 'ENTERS_BATTLEFIELD':
    case 'ENTERS_BATTLEFIELD_SELF':
      // Check if it's the card itself entering
      if (lower.includes('~') || lower.includes(trigger.sourceCard.name.toLowerCase())) {
        return event.source?.name === trigger.sourceCard.name;
      }
      // Otherwise any permanent entering triggers it
      return true;
    
    case 'UPKEEP_BEGIN':
      return event.context.phase === 'upkeep';
    
    case 'DRAW_STEP_BEGIN':
      return event.context.phase === 'draw';
    
    case 'COMBAT_BEGIN':
      return event.context.phase === 'combat';
    
    case 'END_STEP_BEGIN':
      return event.context.phase === 'end';
    
    case 'DRAW_CARD':
      return true; // Any card draw matches
    
    case 'CAST_SPELL':
      // Check if spell type matches
      if (lower.includes('instant') && event.source?.category !== 'instant') return false;
      if (lower.includes('sorcery') && event.source?.category !== 'sorcery') return false;
      if (lower.includes('creature') && event.source?.category !== 'creature') return false;
      if (lower.includes('artifact') && event.source?.category !== 'artifact') return false;
      if (lower.includes('enchantment') && event.source?.category !== 'enchantment') return false;
      return true;
    
    case 'CREATURE_DIES':
      // Check if it's "another creature" (not self)
      if (lower.includes('another')) {
        return event.source?.name !== trigger.sourceCard.name;
      }
      return true;
    
    case 'ATTACKS':
      // Check if it's this creature attacking
      if (lower.includes('~') || lower.includes(trigger.sourceCard.name.toLowerCase())) {
        return event.source?.name === trigger.sourceCard.name;
      }
      return true;
    
    default:
      // Generic matching - if event types match, trigger fires
      return true;
  }
}

/**
 * Create a trigger queue from all permanents on battlefield
 * Scans all permanents for triggers and returns those ready to fire
 * @param {Object} game - Game state
 * @param {GameEvent} event - Event that occurred
 * @returns {Array<TriggerDefinition>} Triggers ready to fire
 */
export function buildTriggerQueue(game, event) {
  const triggerQueue = [];
  
  // Get all permanents on battlefield
  const allPermanents = [
    ...game.battlefield.creatures,
    ...game.battlefield.artifacts,
    ...game.battlefield.enchantments,
    ...game.battlefield.planeswalkers
  ];
  
  // Check each permanent for triggers
  for (const permanent of allPermanents) {
    // Detect triggers if not already detected
    if (!permanent.triggers) {
      permanent.triggers = detectTriggers(permanent);
    }
    
    // Check if any triggers match this event
    for (const trigger of permanent.triggers) {
      if (doesTriggerMatch(trigger, event, game)) {
        triggerQueue.push(trigger);
      }
    }
  }
  
  return triggerQueue;
}

/**
 * Resolve a triggered ability
 * Based on Rule 608: Resolving abilities
 * Uses simple heuristics for "may" abilities (no OpenAI calls)
 * @param {Object} game - Game state
 * @param {TriggerDefinition} trigger - Trigger to resolve
 * @returns {boolean} True if trigger was resolved
 */
export async function resolveTrigger(game, trigger) {
  console.log(`🎯 Resolving Trigger: ${trigger.sourceCard.name} - ${trigger.effect}`);
  
  // If optional, decide whether to execute
  if (trigger.optional) {
    const shouldExecute = decideOptionalTrigger(game, trigger);
    if (!shouldExecute) {
      game.detailedLog.push({
        turn: game.turn,
        phase: game.phase,
        action: 'Optional Trigger Declined',
        source: trigger.sourceCard.name,
        details: `Chose not to: ${trigger.effect}`
      });
      return false;
    }
  }
  
  // Log trigger resolution
  game.detailedLog.push({
    turn: game.turn,
    phase: game.phase,
    action: 'Trigger Resolved',
    source: trigger.sourceCard.name,
    trigger: trigger.fullText,
    effect: trigger.effect
  });
  
  // Execute trigger effect
  // For Phase 1, we'll detect the effect type and flag it
  // Actual execution will be integrated with existing systems (tokens, scry, etc.)
  
  const effect = trigger.effect.toLowerCase();
  
  // Detect effect types for logging
  if (effect.includes('draw')) {
    game.detailedLog.push({
      turn: game.turn,
      phase: game.phase,
      action: 'Trigger Effect',
      details: '🎴 Would draw card(s) (not yet implemented)'
    });
  }
  
  if (effect.includes('create') && effect.includes('token')) {
    game.detailedLog.push({
      turn: game.turn,
      phase: game.phase,
      action: 'Trigger Effect',
      details: '🪙 Would create token(s) (will integrate with tokenEngine)'
    });
  }
  
  if (effect.includes('scry')) {
    game.detailedLog.push({
      turn: game.turn,
      phase: game.phase,
      action: 'Trigger Effect',
      details: '🔮 Would scry (will integrate with scryEngine)'
    });
  }
  
  if (effect.includes('damage')) {
    game.detailedLog.push({
      turn: game.turn,
      phase: game.phase,
      action: 'Trigger Effect',
      details: '⚡ Would deal damage (not yet implemented)'
    });
  }
  
  if (effect.includes('counter')) {
    game.detailedLog.push({
      turn: game.turn,
      phase: game.phase,
      action: 'Trigger Effect',
      details: '➕ Would add counter(s) (not yet implemented)'
    });
  }
  
  return true;
}

/**
 * Decide whether to execute an optional trigger
 * Uses simple heuristics (not OpenAI API)
 * @param {Object} game - Game state
 * @param {TriggerDefinition} trigger - Optional trigger
 * @returns {boolean} True if should execute
 */
function decideOptionalTrigger(game, trigger) {
  const effect = trigger.effect.toLowerCase();
  
  // Always beneficial effects
  if (effect.includes('draw')) return true;              // Card advantage
  if (effect.includes('create') && effect.includes('token')) return true; // Free tokens
  if (effect.includes('+1/+1 counter')) return true;     // Making things bigger
  if (effect.includes('scry')) return true;              // Card selection
  if (effect.includes('search your library')) return true; // Tutoring
  
  // Conditional effects (require cost)
  if (effect.includes('pay')) {
    // Check if we have excess mana
    const totalMana = Object.values(game.manaPool).reduce((a, b) => a + b, 0);
    if (totalMana >= 3) return true; // If we have spare mana, pay
    return false;
  }
  
  if (effect.includes('sacrifice')) {
    // Generally don't sacrifice unless it's tokens
    return false;
  }
  
  if (effect.includes('discard')) {
    // Don't voluntarily discard in goldfishing
    return false;
  }
  
  // Default: execute if unclear
  return true;
}

/**
 * Process all triggers for a specific event
 * This is the main integration point called from game engine
 * @param {Object} game - Game state
 * @param {GameEvent} event - Event that occurred
 */
export async function processTriggers(game, event) {
  // Build queue of matching triggers
  const triggers = buildTriggerQueue(game, event);
  
  if (triggers.length === 0) {
    return;
  }
  
  console.log(`🔔 ${triggers.length} trigger(s) matched event: ${event.type}`);
  
  // Resolve each trigger in order (FIFO, simplified from MTG's APNAP)
  for (const trigger of triggers) {
    await resolveTrigger(game, trigger);
  }
}

/**
 * Get all triggers on battlefield for a specific event type
 * Useful for UI display and analysis
 * @param {Object} game - Game state
 * @param {string} eventType - EVENT_TYPE to filter by
 * @returns {Array<TriggerDefinition>} All matching triggers
 */
export function getTriggersForEventType(game, eventType) {
  const allPermanents = [
    ...game.battlefield.creatures,
    ...game.battlefield.artifacts,
    ...game.battlefield.enchantments,
    ...game.battlefield.planeswalkers
  ];
  
  const triggers = [];
  
  for (const permanent of allPermanents) {
    if (!permanent.triggers) {
      permanent.triggers = detectTriggers(permanent);
    }
    
    for (const trigger of permanent.triggers) {
      if (trigger.eventType === eventType) {
        triggers.push(trigger);
      }
    }
  }
  
  return triggers;
}

export default {
  detectTriggers,
  doesTriggerMatch,
  buildTriggerQueue,
  resolveTrigger,
  processTriggers,
  getTriggersForEventType,
  TRIGGER_PATTERNS,
  TRIGGER_KEYWORDS
};
// Enhanced Step-by-Step AI Game Engine with Protocol-Based Strategic Thinking

import {
  canPayMana,
  parseMana,
  playLand,
  castSpell,
  castCommander,
  drawCard,
  untapPhase,
  generateMana,
  getLandManaProduction,
  getArtifactManaProduction
} from './gameEngine';

import {
  hasETBTokens,
  hasTriggeredTokens,
  generateTokens,
  checkTriggeredTokens,
  executeActivatedTokenAbilities,
  analyzeTokenGenerators
} from './tokenEngine';

import {
  hasScry,
  getScryAmount,
  hasETBScry,
  hasSpellScry,
  executeScry,
  checkScryTriggers,
  analyzeScryEffects
} from './scryEngine';

// ===== PHASE 2A: Spell Effects & Combat System =====
import {
  resolveSpellEffects,
  cleanupEndOfTurnEffects,
  getSpellEffectsSummary
} from './spellEffects.js';

import {
  executeCombat,
  getCombatSummary,
  untapPermanents,
  clearSummoningSickness
} from './combatSystem.js';

import {
  parseActivatedAbilities,
  activateAbilityFromHand,
  activateAbilityFromBattlefield,
  getActivatableAbilitiesInHand,
  getActivatableAbilitiesOnBattlefield,
  analyzeActivatedAbilities
} from './activatedAbilityEngine';

import {
  executeAutomaticFetchLands,
  analyzeFetchLands
} from './fetchLandEngine';

import {
  createDeckBehaviorManifest,
  getManaProductionFromManifest
} from './cardBehaviorAnalyzer';

import { callOpenAI, SYSTEM_PROMPTS } from './apiClient.js';

import {
  GameEngineError,
  logError
} from './errorHandler.js';

// ===== PHASE 1: Event System, Trigger Handler, Enhanced Permanent State =====
import EventEmitter, { EVENT_TYPES, createEvent } from './eventSystem.js';
import { 
  detectTriggers, 
  processTriggers 
} from './triggerHandler.js';
import { 
  createEnhancedPermanent,
  upgradeExistingPermanents,
  updatePermanentState,
  calculateEffectiveStats,
  getPermanentStateSummary
} from './permanentState.js';

/**
 * Enrich deck cards with full database information
 */
const enrichCardsWithData = (parsedDeck, cardDatabase) => {
  const enrichCard = (card) => {
    const dbCard = cardDatabase[card.name.toLowerCase().trim()];
    return {
      ...card,
      fullData: dbCard || null,
      enriched: !!dbCard
    };
  };

  return {
    ...parsedDeck,
    commanders: parsedDeck.commanders.map(enrichCard),
    creatures: parsedDeck.creatures.map(enrichCard),
    instants: parsedDeck.instants.map(enrichCard),
    sorceries: parsedDeck.sorceries.map(enrichCard),
    artifacts: parsedDeck.artifacts.map(enrichCard),
    enchantments: parsedDeck.enchantments.map(enrichCard),
    planeswalkers: parsedDeck.planeswalkers.map(enrichCard),
    lands: parsedDeck.lands.map(enrichCard)
  };
};

/**
 * Analyze battlefield for triggered abilities and activated abilities
 */
const analyzeBattlefieldAbilities = (game) => {
  const allPermanents = [
    ...game.battlefield.creatures,
    ...game.battlefield.artifacts,
    ...game.battlefield.enchantments,
    ...game.battlefield.planeswalkers
  ];
  
  const abilities = {
    triggers: [],
    activatedAbilities: [],
    etbEffects: []
  };
  
  allPermanents.forEach(permanent => {
    const text = permanent.oracle_text?.toLowerCase() || '';
    
    // Check for triggered abilities
    if (text.includes('when') || text.includes('whenever') || text.includes('at the beginning')) {
      abilities.triggers.push({
        card: permanent.name,
        text: permanent.oracle_text.substring(0, 150)
      });
    }
    
    // Check for activated abilities (contains ":")
    if (text.includes(':') && !text.includes('enters the battlefield')) {
      abilities.activatedAbilities.push({
        card: permanent.name,
        text: permanent.oracle_text.substring(0, 150)
      });
    }
  });
  
  return abilities;
};

/**
 * Check if a card has ETB effects
 */
const hasETBEffect = (card) => {
  const text = card.oracle_text?.toLowerCase() || '';
  return (text.includes('when') || text.includes('as')) && text.includes('enters');
};

/**
 * Analyze battlefield for beneficial cast triggers and identify synergies with cards in hand
 * This implements the "Synergy Bonus" system to prioritize cards that trigger beneficial abilities
 */
const analyzeBattlefieldSynergies = (game) => {
  const allPermanents = [
    ...game.battlefield.creatures,
    ...game.battlefield.artifacts,
    ...game.battlefield.enchantments,
    ...game.battlefield.planeswalkers
  ];
  
  const synergies = {
    castTriggers: [],      // Abilities that trigger when you cast a spell
    spellTypeTriggers: [], // Abilities that trigger on specific spell types
    synergyBonuses: []     // Cards in hand that would gain bonus priority
  };
  
  // Scan battlefield for beneficial cast triggers
  allPermanents.forEach(permanent => {
    const text = permanent.oracle_text?.toLowerCase() || '';
    
    // Look for "whenever you cast" triggers
    if (text.includes('whenever you cast')) {
      const triggerInfo = {
        source: permanent.name,
        text: permanent.oracle_text,
        triggersOn: []
      };
      
      // Detect what types of spells trigger this
      if (text.includes('instant') && text.includes('sorcery')) {
        triggerInfo.triggersOn.push('instant', 'sorcery');
      } else if (text.includes('instant')) {
        triggerInfo.triggersOn.push('instant');
      } else if (text.includes('sorcery')) {
        triggerInfo.triggersOn.push('sorcery');
      } else if (text.includes('artifact')) {
        triggerInfo.triggersOn.push('artifact');
      } else if (text.includes('enchantment')) {
        triggerInfo.triggersOn.push('enchantment');
      } else if (text.includes('creature')) {
        triggerInfo.triggersOn.push('creature');
      } else if (text.includes('spell')) {
        // Generic "whenever you cast a spell" - triggers on everything
        triggerInfo.triggersOn.push('any');
      }
      
      // Extract the benefit from the trigger
      if (text.includes('create') && text.includes('token')) {
        triggerInfo.benefit = 'Creates tokens';
      } else if (text.includes('draw')) {
        triggerInfo.benefit = 'Draws cards';
      } else if (text.includes('damage')) {
        triggerInfo.benefit = 'Deals damage';
      } else if (text.includes('gain') && text.includes('life')) {
        triggerInfo.benefit = 'Gains life';
      } else if (text.includes('copy')) {
        triggerInfo.benefit = 'Copies spell';
      } else {
        triggerInfo.benefit = 'Triggers beneficial ability';
      }
      
      synergies.castTriggers.push(triggerInfo);
    }
  });
  
  // Now identify which cards in hand would trigger these abilities
  game.hand.forEach((card, index) => {
    const cardType = card.category.toLowerCase();
    
    synergies.castTriggers.forEach(trigger => {
      // Check if this card type matches the trigger condition
      const matches = trigger.triggersOn.includes(cardType) || 
                      trigger.triggersOn.includes('any') ||
                      (trigger.triggersOn.includes('spell') && cardType !== 'land');
      
      if (matches) {
        synergies.synergyBonuses.push({
          cardIndex: index,
          cardName: card.name,
          cardType: cardType,
          triggerSource: trigger.source,
          benefit: trigger.benefit,
          priority: 'HIGH' // This card should be prioritized
        });
      }
    });
  });
  
  return synergies;
};

/**
 * Format synergy information for AI prompt
 */
const formatSynergyInfo = (synergies) => {
  if (synergies.synergyBonuses.length === 0) {
    return 'No beneficial cast triggers currently active on battlefield.';
  }
  
  let info = '🎯 BATTLEFIELD SYNERGY OPPORTUNITIES DETECTED!\n';
  info += `You have ${synergies.castTriggers.length} permanent(s) with beneficial cast triggers:\n\n`;
  
  // List the triggers
  synergies.castTriggers.forEach(trigger => {
    info += `• ${trigger.source}: ${trigger.benefit} when you cast ${trigger.triggersOn.join(' or ')}\n`;
  });
  
  info += '\n🌟 HIGH-VALUE SPELLS IN HAND (Trigger Synergies):\n';
  
  // List cards that would trigger these abilities
  const uniqueCards = new Map();
  synergies.synergyBonuses.forEach(bonus => {
    if (!uniqueCards.has(bonus.cardName)) {
      uniqueCards.set(bonus.cardName, bonus);
    }
  });
  
  uniqueCards.forEach((bonus, cardName) => {
    info += `• ${cardName} (${bonus.cardType}) → Triggers "${bonus.triggerSource}" → ${bonus.benefit}\n`;
  });
  
  info += '\n💡 SYNERGY VALUE: These spells provide DOUBLE BENEFIT:\n';
  info += '   1. Their own spell effect\n';
  info += '   2. The triggered ability bonus\n';
  info += '   Consider prioritizing these over non-synergistic permanents when deciding between plays!';
  
  return info;
};

/**
 * Check for and execute "whenever you cast" triggered abilities from battlefield permanents
 */
const executeCastTriggers = (game, castSpell) => {
  const allPermanents = [
    ...game.battlefield.creatures,
    ...game.battlefield.artifacts,
    ...game.battlefield.enchantments,
    ...game.battlefield.planeswalkers
  ];
  
  const spellType = castSpell.category.toLowerCase();
  
  allPermanents.forEach(permanent => {
    const text = permanent.oracle_text?.toLowerCase() || '';
    
    if (!text.includes('whenever you cast')) return;
    
    let triggers = false;
    
    if (text.includes('instant') && text.includes('sorcery')) {
      triggers = (spellType === 'instant' || spellType === 'sorcery');
    } else if (text.includes('whenever you cast an instant')) {
      triggers = (spellType === 'instant');
    } else if (text.includes('whenever you cast a sorcery')) {
      triggers = (spellType === 'sorcery');
    } else if (text.includes('whenever you cast a creature')) {
      triggers = (spellType === 'creature');
    } else if (text.includes('whenever you cast an artifact')) {
      triggers = (spellType === 'artifact');
    } else if (text.includes('whenever you cast an enchantment')) {
      triggers = (spellType === 'enchantment');
    } else if (text.includes('whenever you cast a spell')) {
      triggers = (spellType !== 'land');
    }
    
    if (!triggers) return;
    
    game.detailedLog.push({
      turn: game.turn,
      phase: game.phase,
      action: '🎯 Cast Trigger',
      details: `${permanent.name} triggers from casting ${castSpell.name}`,
      source: permanent.name,
      trigger: text.substring(0, 100)
    });
    
    if (text.includes('create') && text.includes('token')) {
      generateTokens(game, permanent, 'triggered');
      
      game.detailedLog.push({
        turn: game.turn,
        phase: game.phase,
        action: '✨ Token Generation',
        details: `${permanent.name}'s trigger created tokens`,
        source: permanent.name
      });
    }
    
    if (text.includes('draw a card') || text.includes('draw one card')) {
      if (game.library.length > 0) {
        const drawnCard = game.library[game.library.length - 1];
        drawCard(game);
        game.detailedLog.push({
          turn: game.turn,
          phase: game.phase,
          action: '🎴 Cast Trigger: Draw',
          details: `${permanent.name}'s trigger drew ${drawnCard.name}`,
          source: permanent.name
        });
      }
    }
    
    if (text.includes('deals') && text.includes('damage')) {
      let damageAmount = 1;
      const damageMatch = text.match(/deals? (\d+) damage/);
      if (damageMatch) {
        damageAmount = parseInt(damageMatch[1]);
      }
      
      game.damageDealtThisGame += damageAmount;
      game.detailedLog.push({
        turn: game.turn,
        phase: game.phase,
        action: '💥 Cast Trigger: Damage',
        details: `${permanent.name}'s trigger dealt ${damageAmount} damage`,
        source: permanent.name
      });
    }
  });
};

/**
 * Initialize enhanced detailed game with enriched card data
 */

/**
 * ============================================================================
 * PHASE 1: HELPER FUNCTIONS FOR EVENT & TRIGGER SYSTEM
 * ============================================================================
 */

/**
 * Enhance all permanents on battlefield with enhanced state tracking
 */
const enhancePermanentsOnBattlefield = (game) => {
  game.battlefield.creatures = game.battlefield.creatures.map(creature => {
    if (!creature.counters || !creature.modifications) {
      const enhanced = createEnhancedPermanent(creature, game);
      enhanced.triggers = detectTriggers(enhanced);
      return enhanced;
    }
    return creature;
  });
  
  game.battlefield.artifacts = game.battlefield.artifacts.map(artifact => {
    if (!artifact.counters || !artifact.modifications) {
      const enhanced = createEnhancedPermanent(artifact, game);
      enhanced.triggers = detectTriggers(enhanced);
      return enhanced;
    }
    return artifact;
  });
  
  game.battlefield.enchantments = game.battlefield.enchantments.map(enchantment => {
    if (!enchantment.counters || !enchantment.modifications) {
      const enhanced = createEnhancedPermanent(enchantment, game);
      enhanced.triggers = detectTriggers(enhanced);
      return enhanced;
    }
    return enchantment;
  });
  
  game.battlefield.planeswalkers = game.battlefield.planeswalkers.map(planeswalker => {
    if (!planeswalker.counters || !planeswalker.modifications) {
      const enhanced = createEnhancedPermanent(planeswalker, game);
      enhanced.triggers = detectTriggers(enhanced);
      return enhanced;
    }
    return planeswalker;
  });
};

/**
 * Emit events and process triggers for a spell cast
 */
const handleSpellCastEvents = async (game, card) => {
  // Emit SPELL_CAST event
  game.eventEmitter.emit(createEvent(
    EVENT_TYPES.SPELL_CAST,
    card,
    { player: 'player', phase: game.phase, zone: 'stack' }
  ));
  
  // If permanent, handle ETB
  if (['creature', 'artifact', 'enchantment', 'planeswalker'].includes(card.category)) {
    const allPermanents = [
      ...game.battlefield.creatures,
      ...game.battlefield.artifacts,
      ...game.battlefield.enchantments,
      ...game.battlefield.planeswalkers
    ];
    
    const enteredPermanent = allPermanents
      .filter(p => p.name === card.name && !p._etbEmittedThisTurn)
      .pop();
    
    if (enteredPermanent) {
      enteredPermanent._etbEmittedThisTurn = true;
      
      const enhanced = createEnhancedPermanent(enteredPermanent, game);
      enhanced.triggers = detectTriggers(enhanced);
      enhanced._etbEmittedThisTurn = true;
      
      // Replace in array
      if (card.category === 'creature') {
        const idx = game.battlefield.creatures.findIndex(c => c === enteredPermanent);
        if (idx !== -1) game.battlefield.creatures[idx] = enhanced;
      } else if (card.category === 'artifact') {
        const idx = game.battlefield.artifacts.findIndex(a => a === enteredPermanent);
        if (idx !== -1) game.battlefield.artifacts[idx] = enhanced;
      } else if (card.category === 'enchantment') {
        const idx = game.battlefield.enchantments.findIndex(e => e === enteredPermanent);
        if (idx !== -1) game.battlefield.enchantments[idx] = enhanced;
      } else if (card.category === 'planeswalker') {
        const idx = game.battlefield.planeswalkers.findIndex(p => p === enteredPermanent);
        if (idx !== -1) game.battlefield.planeswalkers[idx] = enhanced;
      }
      
      // Emit ETB
      game.eventEmitter.emit(createEvent(
        EVENT_TYPES.PERMANENT_ENTERS_BATTLEFIELD,
        enhanced,
        { player: 'player', phase: game.phase, zone: 'battlefield' }
      ));
      
      if (enhanced.triggers.length > 0) {
        game.detailedLog.push({
          turn: game.turn,
          phase: game.phase,
          action: '🎯 Triggers Detected',
          source: enhanced.name,
          count: enhanced.triggers.length,
          triggers: enhanced.triggers.map(t => t.fullText)
        });
      }
    }
  }
  
  // Process queue and triggers
  game.eventEmitter.processEventQueue();
  const spellEvent = { type: EVENT_TYPES.SPELL_CAST, source: card, context: { phase: game.phase } };
  await processTriggers(game, spellEvent);
  
  if (['creature', 'artifact', 'enchantment', 'planeswalker'].includes(card.category)) {
    const etbEvent = { type: EVENT_TYPES.PERMANENT_ENTERS_BATTLEFIELD, source: card, context: { phase: game.phase } };
    await processTriggers(game, etbEvent);
  }
};

/**
 * Update all permanents at start of turn
 */
const updateAllPermanents = (game) => {
  const allPermanents = [
    ...game.battlefield.creatures,
    ...game.battlefield.artifacts,
    ...game.battlefield.enchantments,
    ...game.battlefield.planeswalkers
  ];
  
  allPermanents.forEach(permanent => {
    if (permanent._etbEmittedThisTurn) {
      delete permanent._etbEmittedThisTurn;
    }
    updatePermanentState(permanent, game);
  });
};


export const initializeEnhancedDetailedGame = (parsedDeck, deckStrategy, aiAnalysis, cardDatabase) => {
  // Enrich all cards with database info
  const enrichedDeck = enrichCardsWithData(parsedDeck, cardDatabase);
  
  const deckCards = [];
  
  [...enrichedDeck.creatures, ...enrichedDeck.instants, ...enrichedDeck.sorceries, 
   ...enrichedDeck.artifacts, ...enrichedDeck.enchantments, ...enrichedDeck.planeswalkers, ...enrichedDeck.lands]
    .forEach(card => {
      for (let i = 0; i < card.quantity; i++) {
        deckCards.push({ ...card, summoningSick: false });
      }
    });
  
  const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
  
  const game = {
    turn: 0,
    phase: 'beginning',
    step: 'untap',
    life: 40,
    library: shuffled,
    hand: [],
    battlefield: {
      creatures: [],
      lands: [],
      artifacts: [],
      enchantments: [],
      planeswalkers: []
    },
    graveyard: [],
    exile: [],
    commandZone: [...enrichedDeck.commanders.map(cmd => ({ ...cmd, commanderCastCount: 0 }))],
    deckList: enrichedDeck,  // Store the full deck for later reference
    manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    availableMana: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    hasPlayedLand: false,
    damageDealtThisGame: 0,
    log: [],
    actionLog: [],
    detailedLog: [],
    strategy: deckStrategy,
    aiAnalysis: aiAnalysis,
    cardDatabase: cardDatabase, // Store for quick lookups
    gameHistory: [],
    metrics: {
      landsPlayed: 0,
      commanderCasts: 0,
      totalManaSpent: 0,
      totalManaWasted: 0,
      spellsCast: 0
    },
    // Error tracking fields
    errors: [],
    fallbacksUsed: 0,
    successfulAICalls: 0,
    failedAICalls: 0,
    // ===== PHASE 1: Initialize Event System ===== 
  eventEmitter: new EventEmitter()
  };
  
  // Draw opening hand
  for (let i = 0; i < 7; i++) {
    if (game.library.length > 0) {
      game.hand.push(game.library.pop());
    }
  }
  
game.detailedLog.push({
    turn: 0,
    phase: 'setup',
    action: 'Game initialized',
    details: `Drew opening hand of ${game.hand.length} cards`,
    cards: game.hand.map(c => c.name)
  });
  
// ANALYZE TOKEN GENERATORS IN DECK
  const tokenAnalysis = analyzeTokenGenerators(enrichedDeck);
  if (tokenAnalysis.total > 0) {
    game.detailedLog.push({
      turn: 0,
      phase: 'setup',
      action: 'Token Analysis',
      details: `Deck contains ${tokenAnalysis.total} token-generating cards`,
      etb: tokenAnalysis.etb,
      triggered: tokenAnalysis.triggered,
      activated: tokenAnalysis.activated
    });
  }
  
  // ANALYZE SCRY EFFECTS IN DECK
  const scryAnalysis = analyzeScryEffects(enrichedDeck);
  if (scryAnalysis.total > 0) {
    game.detailedLog.push({
      turn: 0,
      phase: 'setup',
      action: 'Scry Analysis',
      details: `Deck contains ${scryAnalysis.total} scry effects (total scry ${scryAnalysis.totalScryAmount})`,
      etbScry: scryAnalysis.etb.map(s => `${s.name} (${s.amount})`),
      spellScry: scryAnalysis.spell.map(s => `${s.name} (${s.amount})`),
      triggeredScry: scryAnalysis.triggered.map(s => `${s.name} (${s.amount})`)
    });
  }

// ANALYZE ACTIVATED ABILITIES IN DECK
  const abilityAnalysis = analyzeActivatedAbilities(enrichedDeck);
  if (abilityAnalysis.total > 0) {
    game.detailedLog.push({
      turn: 0,
      phase: 'setup',
      action: 'Activated Ability Analysis',
      details: `Deck contains ${abilityAnalysis.total} activated abilities`,
      handAbilities: abilityAnalysis.handAbilities.map(a => `${a.card}: ${a.ability}`),
      battlefieldAbilities: abilityAnalysis.battlefieldAbilities.map(a => `${a.card}: ${a.ability}`),
      breakdown: {
        hand: abilityAnalysis.handAbilities.length,
        battlefield: abilityAnalysis.battlefieldAbilities.length
      }
    });
  }

// ✅ DEBUG: Log Lórien Revealed ability details specifically
  const lorienCard = enrichedDeck.instants.concat(enrichedDeck.sorceries).find(c => c.name.includes('Lórien Revealed'));
  if (lorienCard) {
    const lorienAbilities = parseActivatedAbilities(lorienCard);
    game.detailedLog.push({
      turn: 0,
      phase: 'setup',
      action: '🔍 DEBUG: Lórien Revealed Abilities',
      details: `Found ${lorienAbilities.length} abilities on Lórien Revealed`,
      abilities: lorienAbilities.map(a => ({
        name: a.name,
        cost: a.cost.mana.total,
        fullCost: a.cost,
        zones: a.allowedZones,
        fullText: a.fullText
      }))
    });
  }

      // CREATE BEHAVIOR MANIFEST
  console.log('🔍 Creating deck behavior manifest...');
  const behaviorManifest = createDeckBehaviorManifest(enrichedDeck);

  // ANALYZE FETCH LANDS IN DECK
  const fetchAnalysis = analyzeFetchLands(enrichedDeck);
  if (fetchAnalysis.total > 0) {
    game.detailedLog.push({
      turn: 0,
      phase: 'setup',
      action: 'Fetch Land Analysis',
      details: `Deck contains ${fetchAnalysis.total} fetch lands`,
      fetchLands: fetchAnalysis.lands.map(f => `${f.name} (${f.quantity})`)
    });
  }


  game.behaviorManifest = behaviorManifest;
  
  game.detailedLog.push({
    turn: 0,
    phase: 'setup',
    action: '🧠 Deck Behavior Analysis',
    details: `Analyzed ${behaviorManifest.summary.totalManaProducers + 
              behaviorManifest.summary.totalFetchLands + 
              behaviorManifest.summary.totalTokenGenerators} card abilities`,
    manifest: {
      manaProducers: behaviorManifest.summary.totalManaProducers,
      fetchLands: behaviorManifest.summary.totalFetchLands,
      tokenGenerators: behaviorManifest.summary.totalTokenGenerators,
      cardDraw: behaviorManifest.summary.totalCardDraw
    }
  });
  
  console.log('✅ Behavior manifest created:', behaviorManifest.summary);
  
  return game;
};

/**
 * Evaluate opening hand using AI with protocol-based criteria
 */
const evaluateOpeningHand = async (game) => {
  const hand = game.hand;
  const landCount = hand.filter(c => c.category === 'land').length;
  const lowCMCSpells = hand.filter(c => c.category !== 'land' && c.cmc <= 3).length;
  
  const prompt = `You are an expert Magic: The Gathering Commander player. IMPORTANT: Good is better than optimal - don't search for perfection.

${game.aiAnalysis?.success ? `
===== DECK ANALYSIS (This is your playbook - follow it!) =====

ARCHETYPE: ${game.aiAnalysis.analysis.archetype}

OVERALL STRATEGY:
${game.aiAnalysis.analysis.overallStrategy}

PRIMARY WIN CONDITIONS (Your goals - execute these!):
${game.aiAnalysis.analysis.winConditions.map((wc, i) => `${i+1}. ${wc}`).join('\n')}

KEY SYNERGIES (Build these interactions):
${game.aiAnalysis.analysis.keySynergies.map(s => `- ${s}`).join('\n')}

MULLIGAN CRITERIA (Use this to evaluate hands):
Must Have: ${game.aiAnalysis.analysis.mulliganCriteria?.mustHave?.join(', ') || 'Lands + action'}
Ideal Hand Description: ${game.aiAnalysis.analysis.mulliganCriteria?.idealHand || 'Balanced hand with lands and spells'}

===== END DECK ANALYSIS =====
` : `
BASIC DECK INFO:
Archetype: ${game.strategy.archetype}
Gameplan: ${game.strategy.gameplan}
`}

OPENING HAND (7 cards):
${hand.map((c, i) => `${i+1}. ${c.name} (${c.mana_cost || 'Land'}) - ${c.category}
   ${c.oracle_text ? c.oracle_text.substring(0, 120) : ''}`).join('\n\n')}

Hand Summary: ${landCount} lands, ${lowCMCSpells} spells CMC ≤3

MULLIGAN DECISION:
Based on the DECK ANALYSIS above, evaluate if this hand can execute the deck's strategy.
- Can this hand work toward the WIN CONDITIONS?
- Does it have the cards listed in MUST HAVE criteria?
- Can we do something productive in the first 3-4 turns?

Be LENIENT - keep hands that are "good enough" to function. Only mulligan if truly unplayable (0-1 lands, 6+ lands, or no path forward).

Respond with JSON:
{
  "decision": "KEEP" or "MULLIGAN",
  "confidence": 75,
  "reasoning": "How this hand relates to the deck's win conditions and strategy",
  "canExecuteGameplan": true/false
}`;

  try {
    const evaluation = await callOpenAI(
      [
        { role: 'system', content: SYSTEM_PROMPTS.mulliganDecision },
        { role: 'user', content: prompt }
      ],
      10000 // max_completion_tokens
    );
    
    return { success: true, evaluation };
  } catch (error) {
    // Log error with context
    logError(error, {
      function: 'evaluateOpeningHand',
      turn: game.turn,
      handSize: hand.length,
      landCount,
      lowCMCSpells
    });
    
    // Fallback to lenient basic logic
    const canPlay = hand.some(c => c.category !== 'land' && c.cmc <= 3);
    return {
      success: false,
      error: error.message,
      evaluation: {
        decision: (landCount >= 2 && landCount <= 5 && canPlay) ? 'KEEP' : 'MULLIGAN',
        reasoning: landCount < 2 ? 'Too few lands' : landCount > 5 ? 'Too many lands' : !canPlay ? 'No early plays' : 'Acceptable hand',
        confidence: 65,
        canExecuteGameplan: (landCount >= 2 && landCount <= 5 && canPlay)
      }
    };
  }
};

/**
 * Perform London Mulligan
 */
const performMulligan = async (game, mulliganCount = 0) => {
  if (mulliganCount >= 2) {
    game.detailedLog.push({
      turn: 0,
      phase: 'mulligan',
      action: 'Force Keep',
      details: 'Maximum mulligans reached - keeping this hand'
    });
    return game;
  }
  
  const evaluation = await evaluateOpeningHand(game);
  
  game.detailedLog.push({
    turn: 0,
    phase: 'mulligan',
    action: 'Hand Evaluation',
    details: evaluation.evaluation.reasoning,
    decision: evaluation.evaluation.decision,
    confidence: evaluation.evaluation.confidence
  });
  
  if (evaluation.evaluation.decision === 'KEEP') {
    return game;
  }
  
  // Mulligan: shuffle hand back, draw 7, put cards on bottom
  const newLibrary = [...game.library, ...game.hand].sort(() => Math.random() - 0.5);
  const newHand = [];
  
  for (let i = 0; i < 7; i++) {
    if (newLibrary.length > 0) {
      newHand.push(newLibrary.pop());
    }
  }
  
  // London Mulligan: put cards on bottom
  const cardsToBottom = mulliganCount + 1;
  game.detailedLog.push({
    turn: 0,
    phase: 'mulligan',
    action: 'Mulligan',
    details: `Drawing 7, putting ${cardsToBottom} on bottom`
  });
  
  for (let i = 0; i < cardsToBottom && newHand.length > 0; i++) {
    const bottomCard = newHand.pop();
    newLibrary.unshift(bottomCard);
  }
  
  game.hand = newHand;
  game.library = newLibrary;
  
  // Recursively evaluate new hand
  return await performMulligan(game, mulliganCount + 1);
};

/**
 * Get strategic AI decision for current phase with protocol-based thinking
 */
const getStrategicAIDecision = async (game) => {
  // ✅ FIX: Use actualTotalMana if it exists (even if 0!), otherwise calculate from pool
  const availableMana = game.actualTotalMana !== null && game.actualTotalMana !== undefined
    ? game.actualTotalMana 
    : Object.values(game.manaPool).reduce((a, b) => a + b, 0);
  
  // ⭐ NEW: Analyze battlefield synergies BEFORE building prompt
  const synergies = analyzeBattlefieldSynergies(game);
  const synergyInfo = formatSynergyInfo(synergies);
  
  // Identify cards with synergy bonuses (for marking in hand display)
  const synergyCardIndices = new Set(synergies.synergyBonuses.map(b => b.cardIndex));
  
  const combatSummary = getCombatSummary(game);

  const prompt = `You are an expert Magic: The Gathering Commander player executing optimal gameplay following professional sequencing principles.

CURRENT GAME STATE:
Turn ${game.turn}, Phase: ${game.phase}
Available Mana: ${availableMana} total (W:${game.manaPool.W} U:${game.manaPool.U} B:${game.manaPool.B} R:${game.manaPool.R} G:${game.manaPool.G} C:${game.manaPool.C})

⚠️ CRITICAL MANA RULES:
- The  mana shown above is your ACTUAL TOTAL AVAILABLE MANA
- This is ALREADY IN YOUR POOL - Do NOT try to "activate" Sol Ring or tap lands!
- To cast a spell, check: (1) Do I have the required colors? (2) Is my ACTUAL TOTAL >= spell cost?
- Example: If you see "6 total (U:2, C:4)" you can cast ANY spell costing 6 or less that needs at most 2 blue
Has Played Land This Turn: ${game.hasPlayedLand}
Damage Dealt So Far: ${game.damageDealtThisGame}/40

BATTLEFIELD:
Lands (${game.battlefield.lands.length}): ${game.battlefield.lands.map(l => l.name).join(', ') || 'None'}
Creatures (${game.battlefield.creatures.length}): ${game.battlefield.creatures.map(c => `${c.name}${c.summoningSick ? ' (summoning sick)' : ''}`).join(', ') || 'None'}
Other Permanents: ${game.battlefield.artifacts.length} artifacts, ${game.battlefield.enchantments.length} enchantments

⚔️ COMBAT CAPABILITIES ⚔️
${combatSummary.availableAttackers > 0 ? `
Ready to Attack: ${combatSummary.availableAttackers} creature(s)
Potential Damage: ${combatSummary.potentialDamage}
Combat Keywords: ${combatSummary.keywords.length > 0 ? combatSummary.keywords.join(', ') : 'None'}
${combatSummary.hasLifelink ? '❤️ Lifelink available - you will gain life' : ''}
${combatSummary.hasVigilance ? '🛡️ Vigilance available - attackers stay untapped' : ''}
${combatSummary.hasEvasion ? '🦅 Evasion available - flying/menace' : ''}
` : 'No creatures ready to attack this turn'}

⭐⭐⭐ BATTLEFIELD SYNERGY ANALYSIS ⭐⭐⭐
${synergyInfo}

HAND (${game.hand.length} cards):
${game.hand.map((c, i) => {
  // Check if this card has synergy bonus
  const hasSynergy = synergyCardIndices.has(i);
  const synergyMarker = hasSynergy ? ' 🌟 [SYNERGY - TRIGGERS BATTLEFIELD ABILITY]' : '';
  
 // ✅ NEW: Check for activated abilities
  const abilities = parseActivatedAbilities(c);
  const handAbilities = abilities.filter(a => a.allowedZones.includes('hand'));
  const battlefieldAbilities = abilities.filter(a => a.allowedZones.includes('battlefield'));
  
  const abilityMarker = handAbilities.length > 0 
    ? ` ⚡ [CAN ACTIVATE FROM HAND: ${handAbilities.map(a => `${a.name} (${a.cost.mana.total} mana)`).join(', ')}]` 
    : '';
  
  let cardInfo = `${i}. ${c.name} - ${c.mana_cost || 'Land'} [${c.category}]${synergyMarker}${abilityMarker}
   CMC: ${c.cmc || 0}
   ${c.oracle_text ? 'Effect: ' + c.oracle_text.substring(0, 150) + '...' : 'Basic land'}`;
  
  // Show hand ability details
  if (handAbilities.length > 0) {
    handAbilities.forEach((ability) => {
      cardInfo += `\n      ⚡ ${ability.name}: Pay ${ability.cost.mana.total} mana → ${ability.effect.substring(0, 50)}...`;
      cardInfo += `\n         ✅ CAN USE NOW (from hand, without casting the spell)`;
    });
  }
  
  // ✅ ENHANCED: Warn about battlefield-only abilities with specific guidance
  if (battlefieldAbilities.length > 0 && handAbilities.length === 0) {
    // Card has abilities but NONE can be activated from hand
    cardInfo += `\n      ⚠️  Has ${battlefieldAbilities.length} battlefield-ONLY ability(ies)`;
    cardInfo += `\n      ❌ CANNOT activate from hand - must be cast/played first!`;
    
    // ✅ SPECIAL CASE: Fetch lands get extra-clear instructions
    const isFetchLand = battlefieldAbilities.some(a => 
      a.name.includes('Fetch') || 
      (a.cost.tap && a.cost.sacrifice && a.effect.toLowerCase().includes('search'))
    );
    
    if (isFetchLand && c.category === 'land') {
      cardInfo += `\n      📍 THIS IS A FETCH LAND - Special Instructions:`;
      cardInfo += `\n         1️⃣  Play it as your land drop (if available this turn)`;
      cardInfo += `\n         2️⃣  IMMEDIATELY activate it from battlefield (same turn!) to search for a basic land`;
      cardInfo += `\n         3️⃣  Fetch land activation is FREE (0 cost) and should be done right away for color fixing`;
      cardInfo += `\n         4️⃣  Do NOT try to "activate" it from your hand - that's illegal!`;
      
      // Show what the ability does
      const fetchAbility = battlefieldAbilities[0];
      cardInfo += `\n      📖 Ability: {T}, Sacrifice → ${fetchAbility.effect.substring(0, 60)}...`;
    } else {
      // Non-fetch-land battlefield abilities
      cardInfo += `\n      📖 Abilities require casting/playing first:`;
      battlefieldAbilities.forEach((ability, idx) => {
        const costStr = ability.cost.tap ? '{T}' : `{${ability.cost.mana.total}}`;
        cardInfo += `\n         ${idx + 1}. ${ability.name}: ${costStr} → ${ability.effect.substring(0, 40)}...`;
      });
    }
  } else if (battlefieldAbilities.length > 0 && handAbilities.length > 0) {
    // Card has BOTH hand and battlefield abilities
    cardInfo += `\n      ℹ️  Also has ${battlefieldAbilities.length} battlefield ability(ies) (usable after casting)`;
  }
  
  // Flag cards with special token abilities (EXISTING)
  if (hasETBTokens(c)) {
    cardInfo += '\n   ⚡ GENERATES TOKENS ON ETB!';
  }
  if (hasTriggeredTokens(c)) {
    cardInfo += '\n   🔄 GENERATES TOKENS REPEATEDLY!';
  }
  
  // Flag cards with scry (EXISTING)
  if (hasScry(c)) {
    const scryAmount = getScryAmount(c);
    cardInfo += `\n   🔮 SCRY ${scryAmount} (filters deck!)`;
  }
  
  return cardInfo;
}).join('\n\n')}

COMMAND ZONE:
${game.commandZone.length > 0 ? game.commandZone.map(c => `${c.name} (${c.mana_cost}, cast ${c.commanderCastCount} times, current cost: ${c.cmc + c.commanderCastCount * 2})`).join(', ') : 'Commander is on battlefield'}

BATTLEFIELD ACTIVATED ABILITIES (Available Now):
${(() => {
  const battlefieldAbilities = getActivatableAbilitiesOnBattlefield(game);
  if (battlefieldAbilities.length === 0) {
    return 'None available (no untapped permanents with affordable abilities)';
  }
  return battlefieldAbilities.map(a => 
    `• ${a.cardName}: ${a.abilityName} (Cost: ${a.cost.mana.total} mana${a.cost.tap ? ' + Tap' : ''})`
  ).join('\n');
})()}

DECK STRATEGY:
${game.strategy.archetype} - ${game.strategy.gameplan}

${game.aiAnalysis?.success ? `
===== DECK-SPECIFIC STRATEGIC GUIDANCE (ADAPTIVE, NOT RIGID) =====

Your deck's optimal gameplan provides strategic direction, but BE FLEXIBLE based on what you draw:

EARLY GAME GOALS (Turns 1-3):
${game.aiAnalysis.analysis.optimalGameplan.earlyGame}

MID GAME GOALS (Turns 4-6):
${game.aiAnalysis.analysis.optimalGameplan.midGame}

LATE GAME GOALS (Turns 7+):
${game.aiAnalysis.analysis.optimalGameplan.lateGame}

CURRENT TURN: ${game.turn}
CURRENT PHASE: ${
  game.turn <= 3 ? 'Early Game - Focus on the early game goals above' :
  game.turn <= 6 ? 'Mid Game - Work towards mid game goals above' :
  'Late Game - Execute late game goals above'
}

**CRITICAL - FLEXIBILITY RULES:**
1. The gameplan above is ASPIRATIONAL - work towards these goals with the cards you actually have
2. If you don't have the "ideal" cards, play the best available alternatives
3. NEVER pass with unused mana just because you can't execute the "perfect" play
4. If you can't follow the gameplan this turn, do the next best thing:
   - Early: No ramp? Play any castable permanent or spell
   - Mid: No engine/commander? Advance board state with creatures/artifacts
   - Late: No finisher? Deploy whatever threats you have
5. Mana efficiency > perfect sequencing. Use your mana productively each turn.
6. Playing SOMETHING is almost always better than doing nothing

**SYNERGY CONSIDERATION (NEW):**
7. When choosing between similarly valuable plays, prioritize spells marked 🌟 [SYNERGY]
   - These provide DOUBLE VALUE: spell effect + triggered ability
   - Example: If you can cast either an instant (🌟 triggers Lord) or an enchantment (no trigger), 
     the instant is higher value even if both seem like "engine" plays
   - This is an ADDITIONAL consideration, not a replacement for the flexibility rules above

===== END STRATEGIC GUIDANCE =====
` : `
FALLBACK SEQUENCING (No AI Analysis available):
1. Play lands and ramp when possible
2. Cast spells on curve to use mana efficiently
3. Deploy permanents > hold cards hoping for better draws
4. Advance board state every turn
5. Consider battlefield synergies (🌟 marked cards) when choosing between plays
`}

RECENT ACTIONS:
${game.detailedLog.slice(-5).map(a => `- ${a.action}: ${a.details || ''}`).join('\n')}

INSTRUCTIONS:
${game.aiAnalysis?.success ? `
**PRIMARY**: Work towards the strategic goals for Turn ${game.turn} (see gameplan above)
**BACKUP**: If you can't execute the ideal strategy, play the best available cards to use your mana efficiently
**SYNERGY BONUS**: When choosing between similar plays, prefer 🌟 marked cards for double value
**NEVER**: Pass with significant unused mana unless literally nothing is castable

Decision Priority (MANA → ENGINE → THREAT Framework):

1. **Land Drop**: Can I play a land this turn? → Play the optimal land first.

2. **FREE ACTIONS**: After playing a land, check for 0-cost activated abilities:
   - ⚡ Fetch lands (Evolving Wilds, etc.): IMMEDIATELY activate to search for basic land
   - ⚡ 0-cost abilities on battlefield: Activate these before casting spells
   - These are free mana-fixing/card advantage - always prioritize them!

3. **Main Phase Evaluation** (follow sequencePriority ranking):
   
   Step A - Identify highest-priority action type available:
   - MANA: Ramp spells, mana rocks, land tutors (accelerate to win condition)
   - ENGINE: Card draw, scry, token generators, enablers (build resources)
   - THREAT: Creatures, commander, win conditions (apply pressure)
   - SYNERGY: Spells marked 🌟 provide double value (spell + triggered ability)
   
   Step B - Within that priority tier:
   - Choose the most mana-efficient/impactful option
   - Consider: CMC, immediate value, synergy bonuses
   - Check: Can I afford this with my current mana pool?
   
   Step C - Execute the chosen action:
   - ✅ Cast the spell, OR
   - ✅ Activate NON-MANA ability (cycling, tokens, card draw)
   - ❌ NEVER manually activate mana abilities (these are automatic!)

4. **Re-evaluate After Each Action**:
   - Did I use all my mana?
   - Return to Step 3 to find next best action with remaining mana
   - Continue until no more productive plays available

5. **End Phase Properly**:
   - If Steps 1-3 yield no more viable actions → Proceed to Combat/Pass
   - Do NOT tap lands for mana you can't use (mana pools empty between steps)
   - Floating unused mana is NOT a productive play

⚠️ NEVER activate mana abilities manually - they're AUTOMATIC!
` : `
Choose the SINGLE BEST action right now:
- Turn 1-2: Ramp if possible, otherwise play anything castable
- Turn 3-4: Engines/card draw if available, otherwise creatures/permanents
- Turn 5+: Threats and win conditions if available, otherwise advance board state
- Always: Consider 🌟 synergy bonuses when choosing between plays
`}

General Principles:
1. Use your mana efficiently (don't waste available mana)
2. Play on curve when possible (cast spells matching your mana)
3. Advance board state every turn (doing something > doing nothing)
4. Adapt to your actual hand (don't wait for "perfect" cards)
5. Leverage battlefield synergies when available (🌟 marked cards)

⚠️ CRITICAL MANA ABILITY RULES:

1. **Mana is ALREADY AVAILABLE**: The "Available Mana" shown above is what you can spend RIGHT NOW.
   - If you see "Available Mana: 2 total (B:1, C:1)", you can cast a 2-cost spell immediately
   - You do NOT need to "activate" Sol Ring, tap lands, or do anything to get this mana
   - The mana pool is already filled by the game engine's generateMana() function

2. **NEVER manually activate mana abilities**:
   - ❌ DO NOT try to "activate Sol Ring" or "tap Swamp for mana"
   - ❌ DO NOT try to "use land's mana ability"
   - These happen automatically during the untap phase

3. **Floating mana is NOT productive**:
   - Mana pools empty at the end of each step/phase
   - Tapping a land just to "have mana" when you can't cast anything is WASTED action
   - Only activate non-mana abilities (like cycling, token creation, card draw)

4. **When to activate abilities**:
   - ✅ Cycling (from hand) - costs mana but draws cards
   - ✅ Token creation abilities - costs mana but makes tokens
   - ✅ Card draw abilities - costs mana but draws cards
   - ❌ Mana abilities (like "{T}: Add {B}") - these are AUTOMATIC

5. **What to do with 0 mana and no castable spells**:
   - Just PASS - don't try to activate mana abilities
   - The mana will be available again next turn after untap
   - Floating mana accomplishes nothing if you can't use it this step

CRITICAL RULES FOR ACTIVATED ABILITIES:
1. **HAND abilities (Cycling)**: Can use WITHOUT casting the spell first
   - Example: Lórien Revealed has Islandcycling {1}
   - You can pay {1} to search for Island WITHOUT paying the full {3}{U}{U} casting cost
   - These are marked ⚡ [CAN ACTIVATE FROM HAND] above
   
2. **BATTLEFIELD abilities**: Can ONLY use AFTER casting the spell
   - Example: Sol Ring's "{T}: Add mana" can't be used from hand
   - Must cast Sol Ring first, THEN activate its ability next turn
   - These show ⚠️ "MUST CAST FIRST" warnings above

Options: playLand, castSpell (by index), castCommander, activateAbility (by index), or pass

⚠️ CRITICAL: Choose ONE action only. To cast multiple spells, you will be called again after each spell resolves.
Do NOT try to cast multiple spells in one action (e.g., "5 then 3" is INVALID).

Respond with JSON:
{
  "action": "playLand" | "castSpell" | "castCommander" | "activateAbility" | "pass",
  "target": "SINGLE card index from hand (0-${game.hand.length - 1}) or SINGLE card name",
  "abilityIndex": 0,
  "reasoning": "Why is this the optimal play? If activating ability, explain why activating instead of casting",
  "sequencePriority": "MANA" | "ENGINE" | "THREAT" | "PASS",
  "alternativeLine": "What would we do if this isn't available?"
}`;

  try {
    const decision = await callOpenAI(
      [
        { role: 'system', content: SYSTEM_PROMPTS.turnDecision },
        { role: 'user', content: prompt }
      ],
      10000 // max_completion_tokens
    );
    
    return { success: true, decision };
  } catch (error) {
    // Log error with context
    logError(error, {
      function: 'getStrategicAIDecision',
      turn: game.turn,
      phase: game.phase,
      handSize: game.hand.length,
      availableMana,
      battlefieldSize: Object.values(game.battlefield).flat().length
    });
    
    return { 
      success: false, 
      error: error.message,
      errorType: error.name
    };
  }
};

/**
 * Execute action with enhanced logging
 */
const executeStrategicAction = async (game, decision) => {
  const logEntry = {
    turn: game.turn,
    phase: game.phase,
    action: decision.action,
    target: decision.target,
    reasoning: decision.reasoning,
    priority: decision.sequencePriority
  };

  try {
    switch (decision.action) {
      case 'playLand': {
        let landIndex = -1;
        
        if (!isNaN(decision.target)) {
          landIndex = parseInt(decision.target);
        } else {
          landIndex = game.hand.findIndex(c => 
            c.category === 'land' && c.name === decision.target
          );
        }
        
        if (landIndex === -1 || landIndex >= game.hand.length) {
          landIndex = game.hand.findIndex(c => c.category === 'land');
        }
        
        if (landIndex !== -1 && !game.hasPlayedLand) {
          const land = game.hand[landIndex];
          playLand(game, landIndex);
          game.metrics.landsPlayed++;
          logEntry.details = `Played ${land.name}`;
          logEntry.success = true;
        } else {
          logEntry.details = 'Could not play land';
          logEntry.success = false;
        }
        break;
      }

case 'castSpell': {
  let spellIndex = -1;
  
  if (!isNaN(decision.target)) {
    spellIndex = parseInt(decision.target);
  } else {
    spellIndex = game.hand.findIndex(c => c.name === decision.target);
  }
  
  if (spellIndex !== -1 && spellIndex < game.hand.length) {
    const spell = game.hand[spellIndex];
  if (canPayMana(game.manaPool, spell.mana_cost, game.actualTotalMana, game.manaPoolManager)) {
      const manaSpent = spell.cmc || 0;
      
      // ✅ CRITICAL: Log mana BEFORE casting
      const manaBeforeCast = {...game.manaPool};
      const totalBeforeCast = game.actualTotalMana || 0;
      
      // Cast the spell (this modifies game.manaPool in place)
      // ===== PHASE 1: Save card before casting (it gets removed from hand) =====
      const cardBeforeCast = {...game.hand[spellIndex]};
      
      castSpell(game, spellIndex);
      
      // ✅ CRITICAL: Sync actualTotalMana after casting
      game.actualTotalMana = game.manaPoolManager?.getTotal() || game.actualTotalMana;
      
      // ===== PHASE 1: Handle spell cast events and triggers =====
      await handleSpellCastEvents(game, cardBeforeCast);
      
      
      // ✅ FIX #3: Log mana changes using actualTotalMana
      const manaAfterCast = {...game.manaPool};
      const totalAfterCast = game.actualTotalMana || 0;
      
      game.detailedLog.push({
        turn: game.turn,
        phase: game.phase,
        action: '💰 Mana After Cast',
        spell: spell.name,
        cost: spell.mana_cost,
        before: { pool: manaBeforeCast, total: totalBeforeCast },
        after: { pool: manaAfterCast, total: totalAfterCast },
        spent: totalBeforeCast - totalAfterCast
      });
      
      game.metrics.spellsCast++;
      game.metrics.totalManaSpent += manaSpent;
      
      // CHECK FOR ETB TOKEN GENERATION
      if (hasETBTokens(spell)) {
        generateTokens(game, spell, 'etb');
      }
      
      // CHECK FOR ETB SCRY (for creatures/artifacts/enchantments)
      if (hasETBScry(spell)) {
        const scryAmount = getScryAmount(spell);
        executeScry(game, scryAmount, spell, 'etb');
      }
      
      // CHECK FOR SPELL SCRY (for instants/sorceries)
      if (hasSpellScry(spell)) {
        const scryAmount = getScryAmount(spell);
        executeScry(game, scryAmount, spell, 'spell');
      }

      // ===== PHASE 2A: RESOLVE SPELL EFFECTS =====
      if (spell.category === 'instant' || spell.category === 'sorcery') {
        await resolveSpellEffects(game, spell);
      }

         // CHECK FOR "WHENEVER YOU CAST" TRIGGERS FROM BATTLEFIELD
   executeCastTriggers(game, spell);

      
      logEntry.details = `Cast ${spell.name} (${spell.mana_cost || 'free'})`;
      logEntry.success = true;
    } else {
      logEntry.details = `Cannot afford ${spell.name}`;
      logEntry.success = false;
    }
  } else {
    logEntry.details = 'Card not found';
    logEntry.success = false;
  }
  break;
}

case 'castCommander': {
    // ✅ ADD THIS DEFENSIVE CHECK AT THE TOP:
  if (!game.deckList || !game.deckList.commanders || game.deckList.commanders.length === 0) {
    console.error('❌ Cannot cast commander - deckList.commanders not initialized');
    
    game.detailedLog?.push({
      turn: game.turn,
      phase: game.phase,
      action: '❌ FATAL ERROR',
      details: 'Commander data not available in game state',
      success: false
    });
    
    return { 
      success: false, 
      message: 'Commander casting failed - missing deck data',
      error: 'DECKLIST_COMMANDERS_UNDEFINED'
    };
  }
  
  if (game.commandZone.length > 0) {
    const commander = game.commandZone[0];
    const taxAmount = commander.commanderCastCount * 2;
    const totalCost = commander.cmc + taxAmount;
    const totalMana = Object.values(game.manaPool).reduce((a, b) => a + b, 0);
    
if (totalMana >= totalCost && canPayMana(game.manaPool, commander.mana_cost, game.actualTotalMana, game.manaPoolManager)) {
      // ✅ DEBUG: Log mana before
      const manaB4 = {...game.manaPool};
      
      castCommander(game);
      
      // ===== PHASE 1: Handle commander ETB =====
      const commanderOnField = game.battlefield.creatures.find(c => 
        c.name === game.deckList.commanders[0]?.name && !c._etbEmittedThisTurn
      );
      
      if (commanderOnField) {
        commanderOnField._etbEmittedThisTurn = true;
        
        const enhanced = createEnhancedPermanent(commanderOnField, game);
        enhanced.triggers = detectTriggers(enhanced);
        enhanced._etbEmittedThisTurn = true;
        
        const idx = game.battlefield.creatures.findIndex(c => c === commanderOnField);
        if (idx !== -1) game.battlefield.creatures[idx] = enhanced;
        
        game.eventEmitter.emit(createEvent(
          EVENT_TYPES.PERMANENT_ENTERS_BATTLEFIELD,
          enhanced,
          { player: 'player', phase: game.phase, zone: 'battlefield' }
        ));
        
        game.eventEmitter.processEventQueue();
        const etbEvent = { type: EVENT_TYPES.PERMANENT_ENTERS_BATTLEFIELD, source: enhanced, context: { phase: game.phase } };
        await processTriggers(game, etbEvent);
        
        if (enhanced.triggers.length > 0) {
          game.detailedLog.push({
            turn: game.turn,
            phase: game.phase,
            action: '🎯 Commander Triggers',
            source: enhanced.name,
            count: enhanced.triggers.length
          });
        }
      }
      
      
      // ✅ DEBUG: Log mana after
      if (game.turn <= 5) {
        game.detailedLog.push({
          turn: game.turn,
          phase: game.phase,
          action: '🔍 DEBUG: Mana After Commander Cast',
          commander: commander.name,
          totalCost: totalCost,
          before: manaB4,
          after: {...game.manaPool}
        });
      }
      game.metrics.commanderCasts++;
      game.metrics.totalManaSpent += totalCost;
      
      // CHECK FOR ETB TOKEN GENERATION
      if (hasETBTokens(commander)) {
        generateTokens(game, commander, 'etb');
      }
      
      // CHECK FOR ETB SCRY
      if (hasETBScry(commander)) {
        const scryAmount = getScryAmount(commander);
        executeScry(game, scryAmount, commander, 'etb');
      }
      
    const taxMessage = taxAmount > 0 ? ` including ${taxAmount} tax` : '';
    logEntry.details = `Cast ${commander.name} (total cost: ${totalCost}${taxMessage})`;
      logEntry.success = true;
    } else {
      logEntry.details = `Cannot afford commander (need ${totalCost}, have ${totalMana})`;
      logEntry.success = false;
    }
  } else {
    logEntry.details = 'Commander not in command zone';
    logEntry.success = false;
  }
  break;
}

case 'activateAbility': {
        let cardIndex = -1;
        
        // Try to find card in hand first
        if (!isNaN(decision.target)) {
          cardIndex = parseInt(decision.target);
        } else {
          cardIndex = game.hand.findIndex(c => c.name === decision.target);
        }
        
        // Check if it's a hand ability activation
        if (cardIndex !== -1 && cardIndex < game.hand.length) {
          const card = game.hand[cardIndex];
          const abilityIndex = decision.abilityIndex || 0;
          const abilities = parseActivatedAbilities(card);
          
          // Find hand-activatable abilities only
          const handAbilities = abilities.filter(a => a.allowedZones.includes('hand'));
          
          if (handAbilities.length > 0) {
            const ability = handAbilities[abilityIndex];
            
            // Track whether ability actually executed successfully
            // For landcycling: card removed from hand, land added to hand
            // Net result: hand size STAYS THE SAME (can't use hand size check)
            const handSizeBefore = game.hand.length;
            const graveyardBefore = game.graveyard.length;
            
            // Activate the ability (this handles everything)
            activateAbilityFromHand(game, cardIndex, abilityIndex);
            
            // ✅ SAFETY: Ensure actualTotalMana is synced after ability activation
            
            // Detect success based on ability type
            let abilityExecuted = false;
            if (ability.isLandcycling) {
              // Landcycling success = graveyard increased (cycled card went there)
              // Can't check hand size (stays same: -1 card, +1 land)
              abilityExecuted = (game.graveyard.length > graveyardBefore);
            } else {
              // Other abilities = hand size decreased
              abilityExecuted = (game.hand.length < handSizeBefore);
            }
            
            if (abilityExecuted) {
              logEntry.details = `Activated ${ability.name} from hand (cost: ${ability.cost.mana.total} mana)`;
              logEntry.success = true;
              game.metrics.totalManaSpent += ability.cost.mana.total;
            } else {
              logEntry.details = `Failed to activate ${ability.name} - validation failed`;
              logEntry.success = false;
            }
          } else {
            logEntry.details = `${card.name} has no hand-activatable abilities (must cast it first)`;
            logEntry.success = false;
          }
        } else {
          // Not in hand - check if it's a battlefield permanent
          const allPermanents = [
            ...game.battlefield.creatures,
            ...game.battlefield.artifacts,
            ...game.battlefield.enchantments,
            ...game.battlefield.lands
          ];
          
          const permanent = allPermanents.find(p => p.name === decision.target);
          
          if (permanent) {
            const abilityIndex = decision.abilityIndex || 0;
            const abilities = parseActivatedAbilities(permanent);
            const battlefieldAbilities = abilities.filter(a => a.allowedZones.includes('battlefield'));
            
            if (battlefieldAbilities.length > 0) {
              const ability = battlefieldAbilities[abilityIndex];
              
              // Activate battlefield ability
              activateAbilityFromBattlefield(game, permanent, abilityIndex);
              
              // ✅ SAFETY: Ensure actualTotalMana is synced after ability activation
              
              logEntry.details = `Activated ${ability.name} on ${permanent.name} (cost: ${ability.cost.mana.total} mana)`;
              logEntry.success = true;
              game.metrics.totalManaSpent += ability.cost.mana.total;
            } else {
              logEntry.details = `${permanent.name} has no battlefield-activatable abilities`;
              logEntry.success = false;
            }
          } else {
            logEntry.details = 'Card not found in hand or battlefield';
            logEntry.success = false;
          }
        }
        break;
      }

      case 'pass':
        logEntry.details = 'Passed priority - no profitable plays available';
        logEntry.success = true;
        break;

      default:
        logEntry.details = 'Unknown action';
        logEntry.success = false;
    }
  } catch (error) {
    // Log error with full context
    logError(error, {
      function: 'executeStrategicAction',
      turn: game.turn,
      phase: game.phase,
      action: decision.action,
      target: decision.target,
      handSize: game.hand.length,
      manaPool: game.manaPool
    });
    
    logEntry.details = `Error: ${error.message}`;
    logEntry.success = false;
    logEntry.error = error.message;
    
    // Track error in game state
    if (!game.errors) game.errors = [];
    game.errors.push({
      turn: game.turn,
      phase: game.phase,
      action: decision.action,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  game.detailedLog.push(logEntry);
  return logEntry.success;
};

/**
 * Run enhanced main phase with strategic AI
 */
const runEnhancedMainPhase = async (game, maxActions = 15) => {
  let actionsThisPhase = 0;
  let consecutivePasses = 0;
  
  while (actionsThisPhase < maxActions && consecutivePasses < 2) {

  // ✅ FIX: Use actualTotalMana if it exists (even if 0!), otherwise calculate from pool
  const totalMana = game.actualTotalMana !== null && game.actualTotalMana !== undefined
    ? game.actualTotalMana
    : Object.values(game.manaPool).reduce((a,b)=>a+b,0);
  
  if (totalMana === 0 && game.hasPlayedLand) {
    // Check for free plays
    const hasFreePlays = game.hand.some(card => {
      const cost = parseMana(card.mana_cost || '');
      return cost.total === 0;
    });
    
    const hasActivatableAbilities = 
      getActivatableAbilitiesInHand(game).length > 0 ||
      getActivatableAbilitiesOnBattlefield(game).length > 0;
    
    if (!hasFreePlays && !hasActivatableAbilities) {
      game.detailedLog.push({
        turn: game.turn,
        phase: game.phase,
        action: 'Auto-Pass',
        details: '0 mana available, no free plays, land already played'
      });
      
      consecutivePasses = 2;
      break;
    }
  }

    const aiResponse = await getStrategicAIDecision(game);
    
    if (!aiResponse.success) {
      // Track failed AI call
      if (!game.failedAICalls) game.failedAICalls = 0;
      if (!game.fallbacksUsed) game.fallbacksUsed = 0;
      
      game.failedAICalls++;
      game.fallbacksUsed++;
      
      game.detailedLog.push({
        turn: game.turn,
        phase: game.phase,
        action: 'AI Error',
        details: `${aiResponse.error} - Using fallback logic`,
        errorType: aiResponse.errorType
      });
      
      // Track error
      if (!game.errors) game.errors = [];
      game.errors.push({
        turn: game.turn,
        phase: game.phase,
        type: 'AI_DECISION_FAILED',
        error: aiResponse.error,
        fallback: 'basic'
      });
      
// Fallback: try to play land or pass
      if (!game.hasPlayedLand) {
        const landIndex = game.hand.findIndex(c => c.category === 'land');
        if (landIndex !== -1) {
          playLand(game, landIndex);
          game.metrics.landsPlayed++;
          game.detailedLog.push({
            turn: game.turn,
            phase: game.phase,
            action: 'Fallback: Play Land',
            details: `Played ${game.hand[landIndex]?.name || 'land'}`,
            success: true
          });
          actionsThisPhase++;
          continue;
        }
      }
      
      // Try to activate hand abilities if we have mana
      const activatableFromHand = getActivatableAbilitiesInHand(game);
      if (activatableFromHand.length > 0) {
        const ability = activatableFromHand[0];
        activateAbilityFromHand(game, ability.cardIndex, ability.abilityIndex);
        
        // ✅ SAFETY: Ensure actualTotalMana is synced after ability activation
        game.detailedLog.push({
          turn: game.turn,
          phase: game.phase,
          action: 'Fallback: Activate Hand Ability',
          details: `Activated ${ability.abilityName} on ${ability.cardName} from hand`,
          success: true
        });
        actionsThisPhase++;
        continue;
      }
      
// Try to activate battlefield abilities if we have mana
      const activatableFromBattlefield = getActivatableAbilitiesOnBattlefield(game);
      if (activatableFromBattlefield.length > 0) {
        const ability = activatableFromBattlefield[0];
        activateAbilityFromBattlefield(game, ability.permanent, ability.abilityIndex);
        
        // ✅ SAFETY: Ensure actualTotalMana is synced after ability activation
        game.detailedLog.push({
          turn: game.turn,
          phase: game.phase,
          action: 'Fallback: Activate Battlefield Ability',
          details: `Activated ${ability.abilityName} on ${ability.cardName} from battlefield`,
          success: true
        });
        actionsThisPhase++;
        continue;
      }

      // If can't play land or activate abilities, just pass
      consecutivePasses = 2;
      break;
    }
    
    const decision = aiResponse.decision;
    
    // Track successful AI call
    if (!game.successfulAICalls) game.successfulAICalls = 0;
    game.successfulAICalls++;
    
    game.detailedLog.push({
      turn: game.turn,
      phase: game.phase,
      action: 'AI Strategic Decision',
      details: decision.reasoning,
      priority: decision.sequencePriority
    });
    
    if (decision.action === 'pass') {
      consecutivePasses++;
      if (consecutivePasses >= 2) {
        game.detailedLog.push({
          turn: game.turn,
          phase: game.phase,
          action: 'End Phase',
          details: 'Passed twice - ending phase'
        });
        break;
      }
    } else {
const success = await executeStrategicAction(game, decision);
if (success) {
  consecutivePasses = 0;  // Only reset on success
} else {
  consecutivePasses++;     // Count failures
}
    }
    
    actionsThisPhase++;
  }
  
  // EXECUTE ACTIVATED TOKEN ABILITIES (if excess mana available)
  executeActivatedTokenAbilities(game);
  
    // EXECUTE FETCH LANDS (activate them to search for basics)
  //executeAutomaticFetchLands(game);

  // Track wasted mana
  const wastedMana = Object.values(game.manaPool).reduce((a, b) => a + b, 0);
  game.metrics.totalManaWasted += wastedMana;
  
  return game;
};

/**
 * Check for triggered abilities at a specific phase
 */
const checkPhaseTriggersAI = async (game, phase) => {
  const abilities = analyzeBattlefieldAbilities(game);
  
  // Filter triggers relevant to current phase with STRICT matching
  const relevantTriggers = abilities.triggers.filter(t => {
    const text = t.text.toLowerCase();
    
    // STRICT PHASE MATCHING - be very specific!
    switch(phase) {
      case 'untap':
        return text.includes('beginning of your untap') || 
               text.includes('beginning of the untap');
      
      case 'upkeep':
        return (text.includes('beginning of your upkeep') || 
                text.includes('beginning of each upkeep')) &&
               !text.includes('end step'); // Exclude end step triggers
      
      case 'draw':
        return (text.includes('when you draw') || 
                text.includes('whenever you draw') ||
                text.includes('beginning of your draw step')) &&
               !text.includes('end step') &&
               !text.includes('upkeep');
      
      case 'combat':
        return (text.includes('beginning of combat') || 
                text.includes('when you attack') || 
                text.includes('whenever you attack') ||
                text.includes('whenever this creature attacks')) &&
               !text.includes('end step');
      
      case 'end':
        // CRITICAL: Only match end step triggers
        return text.includes('beginning of your end step') || 
               text.includes('beginning of the end step') ||
               text.includes('at the beginning of each end step');
      
      default:
        return false;
    }
  });
  
  if (relevantTriggers.length > 0) {
    game.detailedLog.push({
      turn: game.turn,
      phase: phase,
      action: 'Triggered Abilities',
      details: `${relevantTriggers.length} trigger(s) active: ${relevantTriggers.map(t => t.card).join(', ')}`,
      triggers: relevantTriggers
    });
  }
  
  // CHECK FOR TOKEN-GENERATING TRIGGERS
  checkTriggeredTokens(game, phase);
  
  // CHECK FOR SCRY TRIGGERS
  checkScryTriggers(game, phase);
};

/**
 * Run complete turn with protocol-based execution
 */
export const runEnhancedTurn = async (game) => {
  game.turn++;
  
  game.detailedLog.push({
    turn: game.turn,
    phase: 'beginning',
    action: '=== NEW TURN ===',
    details: `Starting turn ${game.turn}`
  });
  
  // UNTAP PHASE
untapPhase(game);
  
  // ===== PHASE 2A: CLEAR SUMMONING SICKNESS =====
  clearSummoningSickness(game);
  
  // ✅ FIX: Calculate ACTUAL mana production BEFORE generateMana taps them
  let landCountBeforeTap = 0;
  let landManaProduced = 0;
  game.battlefield.lands.filter(l => !l.tapped).forEach(land => {
    const production = getLandManaProduction(land, game.behaviorManifest);
    const manaAmount = production.actualManaProduced || 0;
    if (manaAmount > 0) {
      landCountBeforeTap++;
      landManaProduced += manaAmount;
    }
  });
  
  let artifactCountBeforeTap = 0;
  let artifactManaProduced = 0;
  game.battlefield.artifacts.filter(a => !a.tapped).forEach(artifact => {
    const production = getArtifactManaProduction(artifact, game.behaviorManifest);
    const manaAmount = production.actualManaProduced || 0;
    if (manaAmount > 0) {
      artifactCountBeforeTap++;
      artifactManaProduced += manaAmount;
    }
  });
  
  let creatureManaDorksBeforeTap = 0;
  let creatureManaProduced = 0;
  game.battlefield.creatures.filter(c => !c.tapped && !c.summoningSick).forEach(creature => {
    // Check both manifest and oracle text for mana abilities
    const manaAbilityData = game.behaviorManifest?.manaAbilities?.get(creature.name);
    const text = (creature.oracle_text || '').toLowerCase();
    const hasManaAbility = manaAbilityData?.hasManaAbility || 
                           (text.includes('{t}:') && text.includes('add'));
    
    if (hasManaAbility) {
      const production = getManaProductionFromManifest(creature, game.behaviorManifest);
      const manaAmount = production.actualManaProduced || 0;
      if (manaAmount > 0) {
        creatureManaDorksBeforeTap++;
        creatureManaProduced += manaAmount;
      }
    }
  });
  
  generateMana(game);
  await checkPhaseTriggersAI(game, 'untap');
  
  const expectedMana = landManaProduced + artifactManaProduced + creatureManaProduced;
  const totalMana = game.actualTotalMana || 0;
  
  let manaSourcesDesc = `${landCountBeforeTap} lands`;
  if (artifactCountBeforeTap > 0) {
    manaSourcesDesc += ` + ${artifactCountBeforeTap} artifacts`;
  }
  if (creatureManaDorksBeforeTap > 0) {
    manaSourcesDesc += ` + ${creatureManaDorksBeforeTap} creatures`;
  }
  
  game.detailedLog.push({
    turn: game.turn,
    phase: 'untap',
    action: 'Untap & Generate Mana',
    details: `All permanents untapped. ${manaSourcesDesc} = ${totalMana} mana available.`
  });
  
  // UPKEEP PHASE
  game.phase = 'upkeep';
  
  // ===== PHASE 1: Phase change event =====
  game.eventEmitter.emit(createEvent(
    EVENT_TYPES.PHASE_CHANGED,
    null,
    { player: 'player', phase: 'upkeep', turn: game.turn }
  ));
  
  game.eventEmitter.processEventQueue();
  const upkeepEvent = { type: EVENT_TYPES.PHASE_CHANGED, source: null, context: { phase: 'upkeep' } };
  await processTriggers(game, upkeepEvent);
  
  await checkPhaseTriggersAI(game, 'upkeep');
  
  // DRAW STEP
  game.phase = 'draw';
  if (game.library.length > 0 && game.turn > 0) {
    const drawnCard = game.library[game.library.length - 1];
    const etb = hasETBEffect(drawnCard);
    drawCard(game);
    
    // ===== PHASE 1: Card draw event =====
    game.eventEmitter.emit(createEvent(
      EVENT_TYPES.CARD_DRAWN,
      drawnCard,
      { player: 'player', phase: 'draw' }
    ));
    
    game.eventEmitter.processEventQueue();
    const drawEvent = { type: EVENT_TYPES.CARD_DRAWN, source: drawnCard, context: { phase: 'draw' } };
    await processTriggers(game, drawEvent);
    
    game.detailedLog.push({
      turn: game.turn,
      phase: 'draw',
      action: 'Draw Card',
      details: `Drew ${drawnCard.name} (${drawnCard.category}${etb ? ' - has ETB effect!' : ''})`
    });
  }
  await checkPhaseTriggersAI(game, 'draw');
  
  // PRE-COMBAT MAIN PHASE
  game.phase = 'main1';
  game.detailedLog.push({
    turn: game.turn,
    phase: 'main1',
    action: 'Main Phase 1',
    details: 'Executing strategy focused on our win condition'
  });
  
  await runEnhancedMainPhase(game);
  
// COMBAT PHASE
  game.phase = 'combat';
  const tokenCount = game.battlefield.creatures.filter(c => c.isToken).length;
  const regularCreatures = game.battlefield.creatures.filter(c => !c.isToken).length;
  
  game.detailedLog.push({
    turn: game.turn,
    phase: 'combat',
    action: 'Combat Phase',
    details: `Entering combat with ${regularCreatures} creatures and ${tokenCount} tokens`
  });
  
await checkPhaseTriggersAI(game, 'combat');
  
  // ===== PHASE 2A: ENHANCED COMBAT SYSTEM =====
  const combatResults = executeCombat(game);
  
  // Log combat details
  if (combatResults.attackers.length > 0) {
    const uniqueKeywords = [...new Set(combatResults.keywords)];
    game.detailedLog.push({
      turn: game.turn,
      phase: 'combat',
      action: '⚔️ Combat Results',
      attackers: combatResults.attackers.length,
      damage: combatResults.damage,
      lifeGained: combatResults.lifeGained,
      keywords: uniqueKeywords,
      details: `${combatResults.attackers.length} attacker(s) dealt ${combatResults.damage} damage${combatResults.lifeGained > 0 ? `, gained ${combatResults.lifeGained} life` : ''}${uniqueKeywords.length > 0 ? ` (keywords: ${uniqueKeywords.join(', ')})` : ''}`,
      success: true
    });
  }
  
  // POST-COMBAT MAIN PHASE
  game.phase = 'main2';
  game.detailedLog.push({
    turn: game.turn,
    phase: 'main2',
    action: 'Main Phase 2',
    details: 'Post-combat - deploying remaining resources'
  });
  
  await runEnhancedMainPhase(game);
  
// END STEP
  game.phase = 'end';
  await checkPhaseTriggersAI(game, 'end');
  
  // ===== PHASE 2A: CLEANUP TEMPORARY EFFECTS =====
  cleanupEndOfTurnEffects(game);
  
  game.detailedLog.push({
    turn: game.turn,
    phase: 'end',
    action: 'End Turn',
    details: `Turn ${game.turn} complete. Total damage: ${game.damageDealtThisGame}/40`
  });
  
  executeAutomaticFetchLands(game);

  return game;
};

/**
 * Run complete enhanced game with protocol
 */
export const runEnhancedDetailedGame = async (parsedDeck, deckStrategy, aiAnalysis, cardDatabase, numTurns = 10, onTurnComplete = null) => {
  const game = initializeEnhancedDetailedGame(parsedDeck, deckStrategy, aiAnalysis, cardDatabase);
  
  game.detailedLog.push({
    turn: 0,
    phase: 'pre-game',
    action: 'Deck Analysis Complete',
    details: `Strategy: ${deckStrategy.archetype} | Target Win: Turn ${deckStrategy.idealTurnWin}`
  });
  
  // MULLIGAN PHASE
  await performMulligan(game);
  
  game.detailedLog.push({
    turn: 0,
    phase: 'pre-game',
    action: 'Opening Hand Kept',
    details: `Starting with ${game.hand.length} cards`,
    cards: game.hand.map(c => c.name)
  });
  
  // RUN TURNS
  for (let i = 0; i < numTurns; i++) {
    await runEnhancedTurn(game);
    
    if (onTurnComplete) {
      onTurnComplete(game, i + 1);
    }
    
    // Check win condition
    if (game.damageDealtThisGame >= 40) {
      game.detailedLog.push({
        turn: game.turn,
        phase: 'end',
        action: '🎉 VICTORY!',
        details: `Achieved lethal damage (${game.damageDealtThisGame}) on turn ${game.turn}`
      });
      break;
    }
  }
  
  // FINAL REPORT
  game.detailedLog.push({
    turn: game.turn,
    phase: 'post-game',
    action: 'Game Complete',
    details: `Metrics: ${game.metrics.spellsCast} spells cast, ${game.metrics.commanderCasts} commander casts, ${game.metrics.landsPlayed} lands played`
  });
  
  // Add error summary if any errors occurred
  if (game.errors && game.errors.length > 0) {
    game.detailedLog.push({
      turn: game.turn,
      phase: 'post-game',
      action: '⚠️ Error Summary',
      details: `Total Errors: ${game.errors.length}, Fallbacks Used: ${game.fallbacksUsed || 0}`,
      aiStats: {
        successfulCalls: game.successfulAICalls || 0,
        failedCalls: game.failedAICalls || 0,
        successRate: game.successfulAICalls && game.failedAICalls 
          ? `${(game.successfulAICalls / (game.successfulAICalls + game.failedAICalls) * 100).toFixed(1)}%`
          : 'N/A'
      }
    });
  } else {
    game.detailedLog.push({
      turn: game.turn,
      phase: 'post-game',
      action: '✅ No Errors',
      details: 'Game completed without errors',
      aiStats: {
        successfulCalls: game.successfulAICalls || 0,
        failedCalls: 0,
        successRate: '100%'
      }
    });
  }
  
  return game;
};
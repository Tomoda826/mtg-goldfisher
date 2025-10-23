// AI-Powered Game Engine - Intelligent Turn-by-Turn Decision Making
// UPDATED: Now includes comprehensive error tracking and handling

import { getAITurnDecision } from './aiAnalyzer.js';
import {
  canPayMana,
  playLand,
  castSpell,
  castCommander,
  drawCard,
  untapPhase,
  combatPhase
} from './gameEngine.js';
import { 
  GameEngineError, 
  logError 
} from './errorHandler.js';

/**
 * Enhanced AI Main Phase - Uses OpenAI to make optimal decisions
 */
export const aiMainPhaseEnhanced = async (state, useAI = true) => {
  state.phase = 'main';
  
  if (!useAI) {
    // Fallback to basic AI if OpenAI is not available
    return aiMainPhaseBasic(state);
  }
  
  try {
    // Get available actions
    const availableActions = getAvailableActions(state);
    
    if (availableActions.length === 0) {
      state.log.push('🤖 AI: No available actions this turn');
      return state;
    }
    
    // Get AI decision
    state.log.push('🤖 AI is analyzing turn options...');
    const aiResponse = await getAITurnDecision(state, availableActions);
    
    if (!aiResponse.success) {
      // Track failed AI call
      if (!state.failedAICalls) state.failedAICalls = 0;
      if (!state.fallbacksUsed) state.fallbacksUsed = 0;
      
      state.failedAICalls++;
      state.fallbacksUsed++;
      
      state.log.push('⚠️ AI decision failed, using fallback logic');
      if (!state.errors) state.errors = [];
      state.errors.push({ 
        turn: state.turn, 
        phase: state.phase,
        type: 'AI_DECISION_FAILED',
        error: aiResponse.error,
        fallback: 'basic' 
      });
      
      return aiMainPhaseBasic(state);
    }
    
    // Track successful AI call
    if (!state.successfulAICalls) state.successfulAICalls = 0;
    state.successfulAICalls++;
    
    const decision = aiResponse.decision;
    state.log.push(`🧠 AI Strategy: ${decision.reasoning}`);
    
    // Execute AI's recommended actions in priority order
    const sortedActions = decision.actions.sort((a, b) => b.priority - a.priority);
    
    for (const action of sortedActions) {
      const executed = await executeAction(state, action);
      
      if (executed) {
        state.log.push(`✅ ${action.reason}`);
      } else {
        // Log failed action execution
        state.log.push(`⚠️ Could not execute: ${action.type} ${action.target || action.cardName || ''}`);
      }
    }
    
    return state;
    
  } catch (error) {
    // Track error
    if (!state.errors) state.errors = [];
    if (!state.fallbacksUsed) state.fallbacksUsed = 0;
    
    state.errors.push({
      turn: state.turn,
      phase: state.phase,
      type: 'AI_PHASE_ERROR',
      error: error.message,
      fallback: 'basic'
    });
    state.fallbacksUsed++;
    
    logError(error, { turn: state.turn, phase: state.phase });
    state.log.push('⚠️ AI error, using fallback logic');
    
    return aiMainPhaseBasic(state);
  }
};

/**
 * Get all available actions for current game state
 */
const getAvailableActions = (state) => {
  const actions = [];
  
  // Check for playable lands
  if (!state.hasPlayedLand) {
    const landIndices = state.hand
      .map((card, idx) => ({ card, idx }))
      .filter(({ card }) => card.category === 'land');
    
    landIndices.forEach(({ card, idx }) => {
      actions.push({
        type: 'playLand',
        cardIndex: idx,
        cardName: card.name,
        description: `Play land: ${card.name}`
      });
    });
  }
  
  // Check for castable spells
  state.hand.forEach((card, idx) => {
    if (card.category !== 'land' && canPayMana(state.manaPool, card.mana_cost)) {
      actions.push({
        type: 'castSpell',
        cardIndex: idx,
        cardName: card.name,
        cardType: card.category,
        cmc: card.cmc,
        manaCost: card.mana_cost,
        text: card.oracle_text,
        description: `Cast ${card.category}: ${card.name} (${card.cmc})`
      });
    }
  });
  
  // Check if commander can be cast
  if (state.commandZone.length > 0) {
    const commander = state.commandZone[0];
    const totalCost = commander.cmc + (commander.commanderCastCount * 2);
    const totalMana = Object.values(state.manaPool).reduce((a, b) => a + b, 0);
    
    if (totalMana >= totalCost && canPayMana(state.manaPool, commander.mana_cost)) {
      actions.push({
        type: 'castCommander',
        cardName: commander.name,
        cmc: commander.cmc,
        tax: commander.commanderCastCount * 2,
        totalCost: totalCost,
        description: `Cast commander: ${commander.name} (${totalCost} total)`
      });
    }
  }
  
  return actions;
};

/**
 * Execute a single action based on AI decision
 */
const executeAction = async (state, action) => {
  // Validate action structure
  if (!action) {
    logError(new Error('Null action provided'), { state: { turn: state.turn } }, 'warning');
    return false;
  }
  
  if (!action.type) {
    logError(new Error('Action missing type'), { action }, 'warning');
    return false;
  }
  
  try {
    switch (action.type) {
      case 'playLand': {
        if (!state.hasPlayedLand) {
          const landIndex = state.hand.findIndex(c => 
            c && c.name && (c.name === action.target || c.name === action.cardName)
          );
          
          if (landIndex === -1) {
            logError(
              new Error('Land not found in hand'),
              { 
                action, 
                handSize: state.hand.length,
                handCards: state.hand.map(c => c.name) 
              },
              'warning'
            );
            return false;
          }
          
          playLand(state, landIndex);
          return true;
        }
        
        logError(new Error('Already played land this turn'), { action }, 'info');
        return false;
      }
        
      case 'castSpell': {
        const spellIndex = state.hand.findIndex(c => 
          c && c.name && (c.name === action.target || c.name === action.cardName)
        );
        
        if (spellIndex === -1) {
          logError(
            new Error('Spell not found in hand'),
            { action, handSize: state.hand.length },
            'warning'
          );
          return false;
        }
        
        const spell = state.hand[spellIndex];
        if (!canPayMana(state.manaPool, spell.mana_cost)) {
          logError(
            new Error('Insufficient mana'),
            { 
              action, 
              required: spell.mana_cost, 
              available: state.manaPool 
            },
            'info'
          );
          return false;
        }
        
        castSpell(state, spellIndex);
        return true;
      }
        
      case 'castCommander': {
        if (state.commandZone.length === 0) {
          logError(new Error('No commander in command zone'), { action }, 'warning');
          return false;
        }
        
        const commander = state.commandZone[0];
        const totalCost = commander.cmc + (commander.commanderCastCount * 2);
        const totalMana = Object.values(state.manaPool).reduce((a, b) => a + b, 0);
        
        if (totalMana < totalCost) {
          logError(
            new Error('Insufficient mana for commander'),
            { required: totalCost, available: totalMana },
            'info'
          );
          return false;
        }
        
        if (!canPayMana(state.manaPool, commander.mana_cost)) {
          logError(new Error('Cannot pay commander color requirements'), { action }, 'warning');
          return false;
        }
        
        castCommander(state);
        return true;
      }
        
      default:
        logError(
          new Error(`Unknown action type: ${action.type}`),
          { action },
          'warning'
        );
        return false;
    }
  } catch (error) {
    logError(
      error,
      { 
        action, 
        state: { 
          turn: state.turn, 
          phase: state.phase,
          handSize: state.hand.length,
          manaPool: state.manaPool
        } 
      }
    );
    
    // Track error in game state
    if (!state.errors) state.errors = [];
    state.errors.push({
      turn: state.turn,
      phase: state.phase,
      action: action.type,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    return false;
  }
};

/**
 * Basic AI fallback (original logic)
 */
const aiMainPhaseBasic = (state) => {
  // Play a land if available
  const landInHand = state.hand.findIndex(card => card.category === 'land');
  if (landInHand !== -1 && !state.hasPlayedLand) {
    playLand(state, landInHand);
  }
  
  // Cast commander if optimal
  if (state.commandZone.length > 0 && shouldCastCommanderBasic(state)) {
    castCommander(state);
  }
  
  // Cast spells by priority
  let castedThisTurn = true;
  while (castedThisTurn) {
    castedThisTurn = false;
    
    const castableSpells = state.hand
      .map((card, idx) => ({ card, idx }))
      .filter(({ card }) => 
        card.category !== 'land' && 
        canPayMana(state.manaPool, card.mana_cost)
      )
      .map(({ card, idx }) => ({
        card,
        idx,
        priority: evaluateCardPriorityBasic(card, state)
      }))
      .sort((a, b) => b.priority - a.priority);
    
    if (castableSpells.length > 0) {
      const { idx } = castableSpells[0];
      castSpell(state, idx);
      castedThisTurn = true;
    }
  }
  
  return state;
};

/**
 * Basic commander casting logic
 */
const shouldCastCommanderBasic = (state) => {
  const landsInPlay = state.battlefield.lands.length;
  const commander = state.commandZone[0];
  
  if (!commander) return false;
  
  const archetype = state.strategy.archetype.toLowerCase();
  
  if (archetype.includes('voltron') || archetype.includes('aggro')) {
    return landsInPlay >= commander.cmc;
  }
  
  return landsInPlay >= commander.cmc + 1 && state.battlefield.creatures.length >= 2;
};

/**
 * Basic card priority evaluation
 */
const evaluateCardPriorityBasic = (card, state) => {
  let priority = 0;
  
  const archetype = state.strategy.archetype.toLowerCase();
  const cardType = card.category.toLowerCase();
  
  if (archetype.includes('aggro')) {
    if (cardType === 'creature' && card.cmc <= 3) priority += 10;
    if (card.oracle_text?.toLowerCase().includes('haste')) priority += 8;
  } else if (archetype.includes('control')) {
    if (cardType === 'instant') priority += 10;
    if (cardType === 'sorcery') priority += 8;
  } else if (archetype.includes('ramp')) {
    if (card.oracle_text?.toLowerCase().includes('search your library for a land')) priority += 10;
  } else {
    if (cardType === 'creature' && card.cmc >= 2 && card.cmc <= 5) priority += 8;
  }
  
  const landsInPlay = state.battlefield.lands.length;
  if (card.cmc <= landsInPlay && card.cmc >= landsInPlay - 1) {
    priority += 5;
  }
  
  if (landsInPlay < 4 && card.cmc > landsInPlay + 1) {
    priority -= 5;
  }
  
  return priority;
};

/**
 * Run full turn with AI enhancement
 */
export const runAIEnhancedTurn = async (state, useAI = true) => {
  state.turn++;
  state.log.push(`\n=== TURN ${state.turn} ===`);
  
  // Untap phase
  untapPhase(state);
  
  // Draw step
  drawCard(state);
  
  // Main phase 1 with AI
  await aiMainPhaseEnhanced(state, useAI);
  
  // Combat phase
  combatPhase(state);
  
  // Main phase 2
  state.phase = 'main2';
  await aiMainPhaseEnhanced(state, useAI);
  
  // End step
  state.phase = 'end';
  
  return state;
};

/**
 * Run full game with AI enhancement
 */
export const runAIEnhancedGame = async (parsedDeck, deckStrategy, aiAnalysis, numTurns = 10, useAI = true) => {
  // Initialize game with enhanced strategy
  const game = initializeEnhancedGame(parsedDeck, deckStrategy, aiAnalysis);
  
  game.log.push(`\n🎯 Deck Strategy: ${deckStrategy.archetype}`);
  game.log.push(`📋 Gameplan: ${deckStrategy.gameplan}`);
  
  if (aiAnalysis && aiAnalysis.success) {
    game.log.push(`🤖 AI Enhanced Mode: Using GPT-5-mini for optimal play`);
    game.log.push(`🎲 AI Strategy: ${aiAnalysis.analysis.overallStrategy}`);
  }
  
  game.log.push(`🎲 Target Win: Turn ${deckStrategy.idealTurnWin}\n`);
  
  // Run turns
  for (let i = 0; i < numTurns; i++) {
    await runAIEnhancedTurn(game, useAI);
  }
  
  // Add final statistics
  game.log.push(`\n=== GAME END ===`);
  game.log.push(`📊 Final Board State:`);
  game.log.push(`   Battlefield: ${game.battlefield.creatures.length} creatures, ${game.battlefield.lands.length} lands`);
  game.log.push(`   Hand: ${game.hand.length} cards`);
  game.log.push(`   Total Damage Dealt: ${game.damageDealtThisGame}`);
  
  // Add error statistics
  if (game.errors && game.errors.length > 0) {
    game.log.push(`\n⚠️ Error Summary:`);
    game.log.push(`   Total Errors: ${game.errors.length}`);
    game.log.push(`   Fallbacks Used: ${game.fallbacksUsed || 0}`);
    
    if (useAI) {
      game.log.push(`   AI Calls: ${game.successfulAICalls || 0} successful, ${game.failedAICalls || 0} failed`);
      
      if (game.successfulAICalls && game.failedAICalls) {
        const successRate = (game.successfulAICalls / (game.successfulAICalls + game.failedAICalls) * 100).toFixed(1);
        game.log.push(`   AI Success Rate: ${successRate}%`);
      }
    }
  } else {
    game.log.push(`\n✅ Game completed with no errors`);
  }
  
  if (game.damageDealtThisGame >= 40) {
    game.log.push(`\n🎉 VICTORY! Dealt lethal damage by turn ${game.turn}`);
  }
  
  return game;
};

/**
 * Initialize game with enhanced AI analysis
 */
const initializeEnhancedGame = (deck, strategy, aiAnalysis) => {
  const deckCards = [];
  
  [...deck.creatures, ...deck.instants, ...deck.sorceries, 
   ...deck.artifacts, ...deck.enchantments, ...deck.planeswalkers, ...deck.lands]
    .forEach(card => {
      for (let i = 0; i < card.quantity; i++) {
        deckCards.push({ ...card, summoningSick: false });
      }
    });
  
  const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
  
  const initialState = {
    turn: 0,
    phase: 'beginning',
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
    commandZone: [...deck.commanders.map(cmd => ({ ...cmd, commanderCastCount: 0 }))],
    manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    availableMana: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    hasPlayedLand: false,
    damageDealtThisGame: 0,
    log: ['Game initialized with AI enhancement'],
    strategy: strategy,
    aiAnalysis: aiAnalysis,
    aiEnabled: aiAnalysis && aiAnalysis.success,
    // Error tracking fields
    errors: [],
    fallbacksUsed: 0,
    successfulAICalls: 0,
    failedAICalls: 0
  };
  
  // Draw opening hand
  for (let i = 0; i < 7; i++) {
    if (initialState.library.length > 0) {
      initialState.hand.push(initialState.library.pop());
    }
  }
  
  initialState.log.push(`Drew opening hand of 7 cards`);
  
  return initialState;
};
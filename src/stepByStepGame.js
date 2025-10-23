// Step-by-Step AI Game Engine with Detailed Logging

import {
  canPayMana,
  playLand,
  castSpell,
  castCommander,
  drawCard,
  untapPhase,
  combatPhase
} from './gameEngine';

const OPENAI_API_KEY = '';
const OPENAI_API_URL = '';

/**
 * Initialize detailed game with action history
 */
export const initializeDetailedGame = (parsedDeck, deckStrategy) => {
  const deckCards = [];
  
  [...parsedDeck.creatures, ...parsedDeck.instants, ...parsedDeck.sorceries, 
   ...parsedDeck.artifacts, ...parsedDeck.enchantments, ...parsedDeck.planeswalkers, ...parsedDeck.lands]
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
    commandZone: [...parsedDeck.commanders.map(cmd => ({ ...cmd, commanderCastCount: 0 }))],
    manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    availableMana: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    hasPlayedLand: false,
    damageDealtThisGame: 0,
    log: [], // Required by gameEngine functions
    actionLog: [],
    detailedLog: [],
    strategy: deckStrategy,
    gameHistory: [] // Store all previous game states for AI context
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
    details: `Drew opening hand of ${game.hand.length} cards`
  });
  
  return game;
};

/**
 * Ask AI what to do next - single action
 */
const getNextAIAction = async (game) => {
  try {
    const prompt = `You are playing a Commander game of Magic: The Gathering. You need to decide on the NEXT SINGLE ACTION to take.

CURRENT GAME STATE:
Turn ${game.turn}, Phase: ${game.phase}
Mana Available: W:${game.manaPool.W} U:${game.manaPool.U} B:${game.manaPool.B} R:${game.manaPool.R} G:${game.manaPool.G} C:${game.manaPool.C}
Has Played Land: ${game.hasPlayedLand}

HAND (${game.hand.length} cards):
${game.hand.map((c, i) => `${i}. ${c.name} ${c.mana_cost || ''} [${c.category}]${c.oracle_text ? '\n   ' + c.oracle_text.substring(0, 150) : ''}`).join('\n')}

BATTLEFIELD:
Lands (${game.battlefield.lands.length}): ${game.battlefield.lands.map(l => l.name).join(', ') || 'None'}
Creatures (${game.battlefield.creatures.length}): ${game.battlefield.creatures.map(c => `${c.name}${c.summoningSick ? ' (sick)' : ''}`).join(', ') || 'None'}
Artifacts (${game.battlefield.artifacts.length}): ${game.battlefield.artifacts.map(a => a.name).join(', ') || 'None'}

COMMAND ZONE:
${game.commandZone.length > 0 ? game.commandZone.map(c => `${c.name} (cast ${c.commanderCastCount} times, cost: ${c.cmc + c.commanderCastCount * 2})`).join(', ') : 'Commander on battlefield'}

DECK STRATEGY: ${game.strategy.archetype} - ${game.strategy.gameplan}

RECENT ACTIONS:
${game.detailedLog.slice(-3).map(a => `- ${a.action}: ${a.details || ''}`).join('\n') || 'None yet'}

DECISION: What is the SINGLE BEST action to take right now?

Options:
1. Play a land (if haven't played one this turn and have one in hand)
2. Cast a spell from hand (if can afford it)
3. Cast commander from command zone (if can afford it)
4. Pass priority / end phase (if nothing else to do)

Respond with JSON:
{
  "action": "playLand" | "castSpell" | "castCommander" | "pass",
  "target": "card name or index number from hand",
  "reasoning": "brief explanation of why this is the best play right now"
}`;

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert Magic: The Gathering player making optimal play decisions one action at a time. Consider mana efficiency, tempo, and the deck strategy.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 1,
        max_completion_tokens: 500,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const decision = JSON.parse(data.choices[0].message.content);
    
    return {
      success: true,
      decision: decision
    };
    
  } catch (error) {
    console.error('AI Action Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Execute a single action and log it
 */
const executeAction = (game, action) => {
  const logEntry = {
    turn: game.turn,
    phase: game.phase,
    action: action.action,
    target: action.target,
    reasoning: action.reasoning
  };

  try {
    switch (action.action) {
      case 'playLand': {
        // Try to find land by name first, then by index
        let landIndex = -1;
        
        if (!isNaN(action.target)) {
          // Target is an index
          landIndex = parseInt(action.target);
        } else {
          // Target is a card name
          landIndex = game.hand.findIndex(c => 
            c.category === 'land' && c.name === action.target
          );
        }
        
        // If still not found, just find any land
        if (landIndex === -1 || landIndex >= game.hand.length) {
          landIndex = game.hand.findIndex(c => c.category === 'land');
        }
        
        if (landIndex !== -1 && !game.hasPlayedLand) {
          const land = game.hand[landIndex];
          playLand(game, landIndex);
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
        
        // Try to find by index first
        if (!isNaN(action.target)) {
          spellIndex = parseInt(action.target);
          if (spellIndex >= game.hand.length) {
            spellIndex = -1;
          }
        }
        
        // If not found by index, try by name
        if (spellIndex === -1) {
          spellIndex = game.hand.findIndex(c => c.name === action.target);
        }
        
        if (spellIndex !== -1 && spellIndex < game.hand.length) {
          const spell = game.hand[spellIndex];
          if (canPayMana(game.manaPool, spell.mana_cost)) {
            castSpell(game, spellIndex);
            logEntry.details = `Cast ${spell.name} for ${spell.mana_cost}`;
            logEntry.success = true;
          } else {
            logEntry.details = `Cannot afford ${spell.name}`;
            logEntry.success = false;
          }
        } else {
          logEntry.details = 'Card not found in hand';
          logEntry.success = false;
        }
        break;
      }

      case 'castCommander': {
        if (game.commandZone.length > 0) {
          const commander = game.commandZone[0];
          const totalCost = commander.cmc + (commander.commanderCastCount * 2);
          const totalMana = Object.values(game.manaPool).reduce((a, b) => a + b, 0);
          
          if (totalMana >= totalCost && canPayMana(game.manaPool, commander.mana_cost)) {
            castCommander(game);
            logEntry.details = `Cast ${commander.name} (cost: ${totalCost})`;
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

      case 'pass':
        logEntry.details = 'Passed priority';
        logEntry.success = true;
        break;

      default:
        logEntry.details = 'Unknown action';
        logEntry.success = false;
    }
  } catch (error) {
    logEntry.details = `Error: ${error.message}`;
    logEntry.success = false;
    logEntry.error = error.message;
  }

  game.detailedLog.push(logEntry);
  return logEntry.success;
};

/**
 * Run main phase with step-by-step AI decisions
 */
export const runStepByStepMainPhase = async (game, maxActions = 10) => {
  game.phase = 'main';
  
  let actionsThisPhase = 0;
  let consecutivePasses = 0;
  
  while (actionsThisPhase < maxActions && consecutivePasses < 2) {
    // Ask AI what to do
    const aiResponse = await getNextAIAction(game);
    
    if (!aiResponse.success) {
      game.detailedLog.push({
        turn: game.turn,
        phase: game.phase,
        action: 'AI Error',
        details: aiResponse.error
      });
      break;
    }
    
    const decision = aiResponse.decision;
    
    // Log AI's reasoning
    game.detailedLog.push({
      turn: game.turn,
      phase: game.phase,
      action: 'AI Decision',
      details: decision.reasoning
    });
    
    // Check if AI wants to pass
    if (decision.action === 'pass') {
      consecutivePasses++;
      if (consecutivePasses >= 2) {
        game.detailedLog.push({
          turn: game.turn,
          phase: game.phase,
          action: 'End Phase',
          details: 'AI passed priority twice, ending phase'
        });
        break;
      }
    } else {
      consecutivePasses = 0;
      
      // Execute the action
      const success = executeAction(game, decision);
      
      if (!success) {
        // If action failed, ask AI again (might have been invalid)
        consecutivePasses++;
      }
    }
    
    actionsThisPhase++;
  }
  
  return game;
};

/**
 * Run a complete turn with detailed AI decisions
 */
export const runDetailedAITurn = async (game) => {
  game.turn++;
  
  game.detailedLog.push({
    turn: game.turn,
    phase: 'turn-start',
    action: 'New Turn',
    details: `Starting turn ${game.turn}`
  });
  
  // Untap
  untapPhase(game);
  game.detailedLog.push({
    turn: game.turn,
    phase: 'untap',
    action: 'Untap',
    details: 'Untapped all permanents, reset mana'
  });
  
  // Draw
  if (game.library.length > 0) {
    const drawnCard = game.library[game.library.length - 1];
    drawCard(game);
    game.detailedLog.push({
      turn: game.turn,
      phase: 'draw',
      action: 'Draw',
      details: `Drew ${drawnCard.name}`
    });
  }
  
  // Main Phase 1
  game.detailedLog.push({
    turn: game.turn,
    phase: 'main1',
    action: 'Main Phase 1',
    details: 'Beginning main phase'
  });
  
  await runStepByStepMainPhase(game);
  
  // Combat
  game.detailedLog.push({
    turn: game.turn,
    phase: 'combat',
    action: 'Combat',
    details: 'Entering combat'
  });
  
  combatPhase(game);
  
  // Main Phase 2
  game.detailedLog.push({
    turn: game.turn,
    phase: 'main2',
    action: 'Main Phase 2',
    details: 'Second main phase'
  });
  
  await runStepByStepMainPhase(game);
  
  // End
  game.detailedLog.push({
    turn: game.turn,
    phase: 'end',
    action: 'End Turn',
    details: `Turn ${game.turn} complete. Damage dealt: ${game.damageDealtThisGame}`
  });
  
  return game;
};

/**
 * Run a complete game one turn at a time
 */
export const runDetailedGame = async (parsedDeck, deckStrategy, numTurns = 10, onTurnComplete = null) => {
  const game = initializeDetailedGame(parsedDeck, deckStrategy);
  
  for (let i = 0; i < numTurns; i++) {
    await runDetailedAITurn(game);
    
    // Callback for UI updates
    if (onTurnComplete) {
      onTurnComplete(game, i + 1);
    }
    
    // Check win condition
    if (game.damageDealtThisGame >= 40) {
      game.detailedLog.push({
        turn: game.turn,
        phase: 'end',
        action: 'Victory',
        details: `Dealt 40+ damage by turn ${game.turn}`
      });
      break;
    }
  }
  
  return game;
};
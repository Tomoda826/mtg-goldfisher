// AI-Powered Deck Analyzer using OpenAI API
// UPDATED: Now uses centralized error handling

import { callOpenAI, SYSTEM_PROMPTS } from './apiClient.js';
import { 
  wrapAIFunction, 
  AIAnalysisError,
  validateRequiredFields 
} from './errorHandler.js';

/**
 * Helper: Truncate oracle text to reduce prompt size
 * Full text not needed - GPT-5-mini knows most cards by name
 */
const truncateText = (text, maxLength = 150) => {
  if (!text) return 'No text available';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Internal implementation - Analyze deck using OpenAI GPT-5-mini
 */
const analyzeWithAIImpl = async (parsedDeck, basicStrategy) => {
  // Validate inputs
  validateRequiredFields(parsedDeck, ['commanders', 'creatures', 'lands'], 'parsedDeck');
  
  // Handle wrapped response from error handler (basicStrategy.analysis) or direct object
  const strategy = basicStrategy.analysis || basicStrategy;
  validateRequiredFields(strategy, ['archetype', 'gameplan'], 'basicStrategy');
  
  const prompt = `You are an expert Magic: The Gathering Commander deck analyst. Analyze this deck and provide detailed strategic insights.

DECK INFORMATION:
Commander(s): ${parsedDeck.commanders.map(c => c.name).join(', ')}

DECK COMPOSITION:
- Total Cards: ${parsedDeck.total}
- Creatures: ${parsedDeck.creatures.length} (${parsedDeck.creatures.reduce((sum, c) => sum + c.quantity, 0)} cards)
- Instants: ${parsedDeck.instants.length} (${parsedDeck.instants.reduce((sum, c) => sum + c.quantity, 0)} cards)
- Sorceries: ${parsedDeck.sorceries.length} (${parsedDeck.sorceries.reduce((sum, c) => sum + c.quantity, 0)} cards)
- Artifacts: ${parsedDeck.artifacts.length} (${parsedDeck.artifacts.reduce((sum, c) => sum + c.quantity, 0)} cards)
- Enchantments: ${parsedDeck.enchantments.length} (${parsedDeck.enchantments.reduce((sum, c) => sum + c.quantity, 0)} cards)
- Planeswalkers: ${parsedDeck.planeswalkers.length} (${parsedDeck.planeswalkers.reduce((sum, c) => sum + c.quantity, 0)} cards)
- Lands: ${parsedDeck.lands.length} (${parsedDeck.lands.reduce((sum, c) => sum + c.quantity, 0)} cards)

BASIC STRATEGY ANALYSIS:
- Archetype: ${strategy.archetype}
- Average CMC: ${strategy.avgCMC}
- Creature Density: ${strategy.creatureDensity.toFixed(1)}%
- Spell Density: ${strategy.spellDensity.toFixed(1)}%

KEY CARDS:
Commanders: ${parsedDeck.commanders.map(c => `${c.name} (${c.mana_cost}) - ${c.oracle_text || 'No text available'}`).join('\n')}

DECK LIST (card text truncated for efficiency):

CREATURES (${parsedDeck.creatures.reduce((sum, c) => sum + c.quantity, 0)} total):
${parsedDeck.creatures.map(c => `- ${c.name} ${c.mana_cost || ''} [${c.cmc} CMC]
  Type: ${c.type_line}
  ${c.power && c.toughness ? `Stats: ${c.power}/${c.toughness}` : ''}
  Text: ${truncateText(c.oracle_text)}`).join('\n\n')}

INSTANTS (${parsedDeck.instants.reduce((sum, c) => sum + c.quantity, 0)} total):
${parsedDeck.instants.map(c => `- ${c.name} ${c.mana_cost || ''}
  Text: ${truncateText(c.oracle_text)}`).join('\n\n')}

SORCERIES (${parsedDeck.sorceries.reduce((sum, c) => sum + c.quantity, 0)} total):
${parsedDeck.sorceries.map(c => `- ${c.name} ${c.mana_cost || ''}
  Text: ${truncateText(c.oracle_text)}`).join('\n\n')}

ARTIFACTS (${parsedDeck.artifacts.reduce((sum, c) => sum + c.quantity, 0)} total):
${parsedDeck.artifacts.map(c => `- ${c.name} ${c.mana_cost || ''}
  Type: ${c.type_line}
  Text: ${truncateText(c.oracle_text)}`).join('\n\n')}

ENCHANTMENTS (${parsedDeck.enchantments.reduce((sum, c) => sum + c.quantity, 0)} total):
${parsedDeck.enchantments.map(c => `- ${c.name} ${c.mana_cost || ''}
  Type: ${c.type_line}
  Text: ${truncateText(c.oracle_text)}`).join('\n\n')}

PLANESWALKERS (${parsedDeck.planeswalkers.reduce((sum, c) => sum + c.quantity, 0)} total):
${parsedDeck.planeswalkers.length > 0 ? parsedDeck.planeswalkers.map(c => `- ${c.name} ${c.mana_cost || ''}
  Loyalty: ${c.loyalty || 'Unknown'}
  Text: ${truncateText(c.oracle_text)}`).join('\n\n') : 'None'}

LANDS (${parsedDeck.lands.reduce((sum, c) => sum + c.quantity, 0)} total):
${parsedDeck.lands.map(c => `- ${c.name}${c.oracle_text ? `\n  Text: ${truncateText(c.oracle_text, 100)}` : ''}`).join('\n')}

ANALYSIS REQUEST:
Please provide a comprehensive analysis with the following sections. NOTE: Card text has been truncated for efficiency, but GPT-5-mini has comprehensive MTG card knowledge. Use your knowledge of these cards to analyze the deck.

1. DECK ARCHETYPE VALIDATION: Confirm or refine the identified archetype (${strategy.archetype}). Consider ALL cards in the deck, not just a sample.

2. WIN CONDITIONS: Identify 3-5 primary ways this deck wins games based on the ACTUAL cards present.

3. KEY SYNERGIES: Identify the most important card synergies and combos by analyzing the card texts provided. Look for cards that specifically work together.

4. OPTIMAL GAMEPLAN: Describe the ideal sequence of plays for turns 1-8 based on the cards available in this deck.

5. PRIORITY CASTING ORDER: What cards should be prioritized for casting early/mid/late game? Reference specific cards from the deck list.

6. WEAKNESSES: What are this deck's main vulnerabilities based on the cards present?

7. MULLIGAN CRITERIA: What should a keepable opening hand contain for this specific deck?

8. COMMANDER TIMING: When is the optimal time to cast the commander(s) based on this deck's strategy?

9. MANA BASE ASSESSMENT: Review the COMPLETE land list provided. Is the land count and color fixing adequate for this deck's needs?

10. CUT/ADD SUGGESTIONS: CRITICAL - Before suggesting cards to ADD, carefully review the deck list above to ensure those cards are NOT already in the deck. Only suggest cards that are genuinely missing. For cuts, reference specific cards from the deck list that underperform.

Format your response as structured JSON with these exact keys:
{
  "archetype": "string",
  "winConditions": ["string"],
  "keySynergies": ["string"],
  "optimalGameplan": {
    "earlyGame": "string",
    "midGame": "string", 
    "lateGame": "string"
  },
  "priorityCasting": {
    "earlyPriority": ["card names"],
    "midPriority": ["card names"],
    "latePriority": ["card names"]
  },
  "weaknesses": ["string"],
  "mulliganCriteria": {
    "mustHave": ["string"],
    "idealHand": "string"
  },
  "commanderTiming": "string",
  "manaBaseAssessment": {
    "rating": "Excellent/Good/Adequate/Poor",
    "issues": ["string"],
    "recommendations": ["string"]
  },
  "improvements": [
    {"cut": "card name", "reason": "string", "addInstead": "card name"}
  ],
  "overallStrategy": "string"
}`;

  // Call OpenAI API using centralized client
  const analysis = await callOpenAI(
    [
      { role: 'system', content: SYSTEM_PROMPTS.deckAnalysis },
      { role: 'user', content: prompt }
    ],
    12500 // max_completion_tokens
  );
  
  // Validate response structure
  validateRequiredFields(analysis, ['archetype', 'winConditions'], 'AI analysis response');
  
  return { analysis, model: 'gpt-4o-mini' };
};

/**
 * Fallback function when AI analysis fails
 */
const analyzeWithAIFallback = async (parsedDeck, basicStrategy) => {
  console.warn('⚠️ AI analysis failed, using basic strategy');
  
  // Handle wrapped response from error handler
  const strategy = basicStrategy.analysis || basicStrategy;
  
  return {
    analysis: {
      archetype: strategy.archetype,
      winConditions: strategy.winConditions || ['Combat damage'],
      keySynergies: ['See basic analysis'],
      optimalGameplan: {
        earlyGame: strategy.gameplan,
        midGame: 'Develop board presence',
        lateGame: 'Close out game'
      },
      priorityCasting: {
        earlyPriority: ['Ramp', 'Card draw'],
        midPriority: ['Threats'],
        latePriority: ['Win conditions']
      },
      weaknesses: ['Analysis unavailable - AI error'],
      mulliganCriteria: {
        mustHave: ['2-4 lands'],
        idealHand: '3 lands, ramp, threats'
      },
      commanderTiming: 'Cast when you have protection',
      manaBaseAssessment: {
        rating: 'Unknown',
        issues: [],
        recommendations: []
      },
      improvements: [],
      overallStrategy: strategy.gameplan
    },
    usedFallback: true
  };
};

/**
 * Analyze deck using OpenAI GPT-4o-mini (exported with error handling)
 * Provides deep strategic insights, synergy analysis, and recommendations
 */
export const analyzeWithAI = wrapAIFunction(
  analyzeWithAIImpl,
  analyzeWithAIFallback,
  'analyzeWithAI',
  {
    retryCount: 1, // Reduced: deck analysis takes 40-60s, don't want users waiting 3+ minutes
    retryDelay: 2000,
    timeout: 120000, // 120 seconds - increased for large deck analysis with full card text
    logErrors: true
  }
);

/**
 * Internal implementation - Get AI-powered turn decision
 */
const getAITurnDecisionImpl = async (gameState, availableActions) => {
  // Validate inputs
  if (!gameState || !gameState.hand) {
    throw new AIAnalysisError('Invalid game state', null, { 
      gameState: gameState ? Object.keys(gameState) : 'null' 
    });
  }
  
  if (!availableActions || availableActions.length === 0) {
    throw new AIAnalysisError('No available actions provided', null, { 
      availableActions: availableActions ? availableActions.length : 'null' 
    });
  }
  
  const prompt = `You are an expert Magic: The Gathering player playing Commander. Analyze the current game state and make the optimal play decision.

CURRENT GAME STATE:
Turn: ${gameState.turn}
Phase: ${gameState.phase}
Life: ${gameState.life}
Damage Dealt This Game: ${gameState.damageDealtThisGame}

BATTLEFIELD:
- Lands: ${gameState.battlefield.lands.length} (${gameState.battlefield.lands.map(l => l.name).join(', ')})
- Creatures: ${gameState.battlefield.creatures.length} (${gameState.battlefield.creatures.map(c => `${c.name}${c.summoningSick ? ' [sick]' : ''}`).join(', ')})
- Artifacts: ${gameState.battlefield.artifacts.length} (${gameState.battlefield.artifacts.map(a => a.name).join(', ')})
- Enchantments: ${gameState.battlefield.enchantments.length}

HAND (${gameState.hand.length} cards):
${gameState.hand.map((c, i) => `${i}: ${c.name} ${c.mana_cost || ''} [${c.category}] - ${c.oracle_text?.substring(0, 100) || 'No text'}`).join('\n')}

MANA AVAILABLE:
Total: ${Object.values(gameState.manaPool).reduce((a, b) => a + b, 0)}
Colors: W:${gameState.manaPool.W} U:${gameState.manaPool.U} B:${gameState.manaPool.B} R:${gameState.manaPool.R} G:${gameState.manaPool.G} C:${gameState.manaPool.C}

COMMAND ZONE:
${gameState.commandZone.length > 0 ? gameState.commandZone.map(c => `${c.name} (cast count: ${c.commanderCastCount}, cost: ${c.cmc + c.commanderCastCount * 2})`).join(', ') : 'Commander on battlefield'}

DECK STRATEGY:
Archetype: ${gameState.strategy.archetype}
Gameplan: ${gameState.strategy.gameplan}
Target Win Turn: ${gameState.strategy.idealTurnWin}

AVAILABLE ACTIONS:
${availableActions.map(a => `- ${a.type}: ${a.description}`).join('\n')}

DECISION REQUEST:
Based on the game state, deck strategy, and available resources, what is the optimal play sequence for this turn?

CRITICAL - GOLDFISHING RULES:
- This is GOLDFISHING (solo deck testing), not a real game
- ASSUME ALL TARGETED SPELLS HAVE VALID TARGETS (opponents, creatures, permanents exist)
- Cast removal spells (Go for the Throat, etc.) as if there are creatures to target
- Cast counterspells as if there are spells to counter
- The goal is testing mana efficiency and hand management, NOT simulating a real opponent

Consider:
1. Mana efficiency (use available mana optimally)
2. Curve and tempo (play on curve when possible)
3. Card advantage and board presence
4. Protecting/developing win conditions
5. Sequencing (play lands first, then spells in optimal order)
6. CAST targeted removal/interaction if you can afford it (assume targets exist)

Respond with a JSON object:
{
  "reasoning": "Brief explanation of your decision strategy",
  "actions": [
    {
      "type": "playLand|castSpell|castCommander",
      "target": "card name or index",
      "priority": 1-10,
      "reason": "why this play"
    }
  ],
  "alternativeLine": "what you'd do if first choice isn't available"
}`;

  const decision = await callOpenAI(
    [
      { role: 'system', content: SYSTEM_PROMPTS.turnDecision },
      { role: 'user', content: prompt }
    ],
    11000 // max_completion_tokens
  );
  
  // Validate response structure
  if (!decision || !decision.actions) {
    throw new AIAnalysisError('Invalid decision response from AI', null, { 
      decision: decision ? Object.keys(decision) : 'null' 
    });
  }
  
  return { decision };
};

/**
 * Fallback function when AI decision fails
 */
const getAITurnDecisionFallback = async (gameState, availableActions) => {
  console.warn('⚠️ AI turn decision failed, using basic heuristics');
  
  // Return a basic decision - just take the first available action
  return {
    decision: {
      reasoning: 'Using basic heuristics (AI unavailable)',
      actions: availableActions.slice(0, 1).map(a => ({
        type: a.type,
        target: a.cardName || a.target,
        priority: 5,
        reason: 'First available action'
      })),
      alternativeLine: 'Pass turn'
    }
  };
};

/**
 * Get AI-powered turn decision (exported with error handling)
 * Analyzes current game state and recommends optimal play
 */
export const getAITurnDecision = wrapAIFunction(
  getAITurnDecisionImpl,
  getAITurnDecisionFallback,
  'getAITurnDecision',
  {
    retryCount: 1,
    timeout: 30000,
    logErrors: true
  }
);

/**
 * Validate AI analysis response structure
 */
export const validateAIAnalysis = (analysis) => {
  const requiredKeys = [
    'archetype',
    'winConditions',
    'keySynergies',
    'optimalGameplan',
    'weaknesses',
    'mulliganCriteria'
  ];
  
  return requiredKeys.every(key => key in analysis);
};
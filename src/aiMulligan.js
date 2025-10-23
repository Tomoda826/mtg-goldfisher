// AI-Powered Mulligan Decision System
// UPDATED: Now uses centralized error handling

import { callOpenAI, SYSTEM_PROMPTS } from './apiClient.js';
import { 
  wrapAIFunction, 
  AIAnalysisError
} from './errorHandler.js';

/**
 * Internal implementation - Evaluate opening hand using AI
 */
const evaluateOpeningHandImpl = async (hand, deck, strategy, aiAnalysis) => {
  // Validate inputs
  if (!hand || !Array.isArray(hand)) {
    throw new AIAnalysisError('Invalid hand provided', null, { 
      hand: hand ? 'not an array' : 'null/undefined',
      handType: typeof hand 
    });
  }
  
  if (hand.length === 0) {
    throw new AIAnalysisError('Empty hand provided', null, { handLength: 0 });
  }
  
  if (!deck || !deck.commanders || !deck.commanders[0]) {
    throw new AIAnalysisError('Invalid deck structure', null, { 
      deck: deck ? Object.keys(deck) : 'null' 
    });
  }
  
  if (!strategy || !strategy.archetype) {
    throw new AIAnalysisError('Invalid strategy provided', null, { 
      strategy: strategy ? Object.keys(strategy) : 'null' 
    });
  }
  
  const prompt = `You are an expert Magic: The Gathering player evaluating an opening hand for Commander format.

DECK INFORMATION:
Commander: ${deck.commanders[0].name}
Archetype: ${strategy.archetype}
Strategy: ${strategy.gameplan}
Ideal Win Turn: ${strategy.idealTurnWin}

${aiAnalysis && aiAnalysis.success ? `
AI ANALYSIS:
Must Have in Hand: ${aiAnalysis.analysis.mulliganCriteria?.mustHave?.join(', ') || 'N/A'}
Ideal Hand: ${aiAnalysis.analysis.mulliganCriteria?.idealHand || 'N/A'}
` : ''}

OPENING HAND (${hand.length} cards):
${hand.map((card, i) => `${i + 1}. ${card.name} ${card.mana_cost || ''} - ${card.type_line || 'Unknown type'}
   ${card.oracle_text ? 'Text: ' + card.oracle_text.substring(0, 150) : ''}`).join('\n')}

EVALUATION CRITERIA:
1. Land Count: Does this hand have 2-4 lands? (2-4 is ideal for most decks)
2. Color Requirements: Can you cast your early spells with these lands?
3. Early Plays: Do you have castable spells for turns 1-3?
4. Mana Development: Is there ramp or card draw?
5. Deck Strategy Alignment: Does this support your gameplan?
6. Keepability: Is this hand better than drawing ${hand.length - 1} cards?

DECISION REQUEST:
Should this hand be kept or mulliganed?

Respond with JSON:
{
  "decision": "KEEP" or "MULLIGAN",
  "confidence": 0-100,
  "reasoning": "detailed explanation",
  "landCount": number,
  "castableSpells": number,
  "colorProblems": boolean,
  "strengths": ["list of positives"],
  "weaknesses": ["list of negatives"],
  "idealScenario": "what would happen in first 3 turns",
  "worstCaseScenario": "what could go wrong"
}`;

  const evaluation = await callOpenAI(
    [
      { role: 'system', content: SYSTEM_PROMPTS.mulliganDecision },
      { role: 'user', content: prompt }
    ],
    13000 // max_completion_tokens
  );
  
  // Validate response structure
  if (!evaluation || !evaluation.decision) {
    throw new AIAnalysisError('Invalid evaluation response from AI', null, { 
      evaluation: evaluation ? Object.keys(evaluation) : 'null' 
    });
  }
  
  return { evaluation };
};

/**
 * Fallback using basic heuristics
 */
const evaluateOpeningHandFallback = (hand, deck, strategy) => {
  console.warn('⚠️ Using basic mulligan heuristics (AI unavailable)');
  return { evaluation: evaluateHandBasic(hand, strategy) };
};

/**
 * Evaluate opening hand using AI (exported with error handling)
 * Returns whether to keep or mulligan
 */
export const evaluateOpeningHand = wrapAIFunction(
  evaluateOpeningHandImpl,
  evaluateOpeningHandFallback,
  'evaluateOpeningHand',
  {
    retryCount: 1,
    retryDelay: 2000,
    timeout: 20000,
    logErrors: true
  }
);

/**
 * Basic mulligan logic (fallback)
 */
const evaluateHandBasic = (hand, strategy) => {
  const landCount = hand.filter(c => c.category === 'land').length;
  const castableSpells = hand.filter(c => 
    c.category !== 'land' && c.cmc <= 3
  ).length;
  
  let decision = 'KEEP';
  let reasoning = '';
  
  // Adjust land requirements based on strategy
  const minLands = strategy.archetype.toLowerCase().includes('aggro') ? 2 : 2;
  const maxLands = strategy.archetype.toLowerCase().includes('ramp') ? 6 : 5;
  
  // Basic rules
  if (landCount < minLands) {
    decision = 'MULLIGAN';
    reasoning = `Too few lands (need ${minLands}-4)`;
  } else if (landCount > maxLands) {
    decision = 'MULLIGAN';
    reasoning = `Too many lands (need 2-${maxLands})`;
  } else if (castableSpells === 0 && landCount < 4) {
    decision = 'MULLIGAN';
    reasoning = 'No early plays';
  } else {
    reasoning = 'Acceptable hand with lands and spells';
  }
  
  return {
    decision,
    confidence: 70,
    reasoning,
    landCount,
    castableSpells,
    colorProblems: false,
    strengths: ['Basic criteria met'],
    weaknesses: [],
    idealScenario: 'Play lands and spells on curve',
    worstCaseScenario: 'Might be slow'
  };
};

/**
 * Perform London Mulligan with AI guidance
 */
export const performMulligan = async (hand, library, deck, strategy, aiAnalysis, mulliganCount = 0) => {
  if (mulliganCount >= 3) {
    // After 3 mulligans, always keep
    return {
      hand,
      library,
      mulliganCount,
      decision: 'KEEP',
      reason: 'Maximum mulligans reached'
    };
  }
  
  // Evaluate current hand
  const evaluation = await evaluateOpeningHand(hand, deck, strategy, aiAnalysis);
  
  if (!evaluation.success || evaluation.evaluation.decision === 'KEEP') {
    return {
      hand,
      library,
      mulliganCount,
      decision: 'KEEP',
      evaluation: evaluation.evaluation
    };
  }
  
  // Mulligan: shuffle hand back, draw 7, put cards on bottom
  const newLibrary = [...library, ...hand].sort(() => Math.random() - 0.5);
  const newHand = [];
  
  for (let i = 0; i < 7; i++) {
    if (newLibrary.length > 0) {
      newHand.push(newLibrary.pop());
    }
  }
  
  // Put cards on bottom (London Mulligan)
  const cardsToBottom = mulliganCount + 1;
  for (let i = 0; i < cardsToBottom && newHand.length > 0; i++) {
    const bottomCard = newHand.pop();
    newLibrary.unshift(bottomCard);
  }
  
  return {
    hand: newHand,
    library: newLibrary,
    mulliganCount: mulliganCount + 1,
    decision: 'MULLIGAN',
    evaluation: evaluation.evaluation
  };
};

/**
 * Get mulligan statistics for analysis
 */
export const analyzeMulliganPatterns = (gameResults) => {
  const patterns = {
    totalGames: gameResults.length,
    mulligansByCount: {},
    keepReasons: {},
    mulliganReasons: {},
    avgMulligans: 0,
    optimalHandRate: 0
  };
  
  gameResults.forEach(game => {
    const count = game.mulliganCount || 0;
    patterns.mulligansByCount[count] = (patterns.mulligansByCount[count] || 0) + 1;
    
    if (game.mulliganEvaluation) {
      if (game.mulliganEvaluation.decision === 'KEEP') {
        const reason = game.mulliganEvaluation.reasoning;
        patterns.keepReasons[reason] = (patterns.keepReasons[reason] || 0) + 1;
      }
    }
    
    patterns.avgMulligans += count;
  });
  
  patterns.avgMulligans /= gameResults.length;
  patterns.optimalHandRate = ((patterns.mulligansByCount[0] || 0) / gameResults.length) * 100;
  
  return patterns;
};

/**
 * Track mulligan decision in game state
 */
export const recordMulliganDecision = (gameState, evaluation, mulliganCount) => {
  gameState.mulliganCount = mulliganCount;
  gameState.mulliganEvaluation = evaluation;
  
  if (evaluation) {
    gameState.log.push(`🎲 Mulligan Decision: ${evaluation.decision} (confidence: ${evaluation.confidence}%)`);
    gameState.log.push(`   Reasoning: ${evaluation.reasoning}`);
    
    if (evaluation.strengths && evaluation.strengths.length > 0) {
      gameState.log.push(`   ✓ Strengths: ${evaluation.strengths.join(', ')}`);
    }
    
    if (evaluation.weaknesses && evaluation.weaknesses.length > 0) {
      gameState.log.push(`   ⚠ Weaknesses: ${evaluation.weaknesses.join(', ')}`);
    }
  }
  
  return gameState;
};
// AI-Powered Card Interaction and Combo Detection
// UPDATED: Now uses centralized error handling for all 5 functions

import { callOpenAI, SYSTEM_PROMPTS } from './apiClient.js';
import { 
  wrapAIFunction, 
  AIAnalysisError
} from './errorHandler.js';

/**
 * Internal implementation - Detect card interactions and combos using AI
 */
const detectCardInteractionsImpl = async (parsedDeck, focusCards = null) => {
  // Validate deck structure
  if (!parsedDeck || !parsedDeck.commanders) {
    throw new AIAnalysisError('Invalid deck structure', null, { 
      parsedDeck: parsedDeck ? Object.keys(parsedDeck) : 'null' 
    });
  }
  
  // Prepare card list for analysis
  const allCards = [
    ...(parsedDeck.commanders || []),
    ...(parsedDeck.creatures || []),
    ...(parsedDeck.instants || []),
    ...(parsedDeck.sorceries || []),
    ...(parsedDeck.artifacts || []),
    ...(parsedDeck.enchantments || []),
    ...(parsedDeck.planeswalkers || [])
  ];
  
  if (allCards.length === 0) {
    throw new AIAnalysisError('Deck has no non-land cards', null, { allCards: 0 });
  }
  
  // If focus cards specified, prioritize those
  const cardsToAnalyze = focusCards || allCards.slice(0, 30);
  
  const prompt = `You are an expert Magic: The Gathering combo analyst. Identify powerful card interactions and combos in this Commander deck.

COMMANDER: ${parsedDeck.commanders[0]?.name || 'Unknown'}

CARDS TO ANALYZE:
${cardsToAnalyze.map((card, i) => `${i + 1}. ${card.name} ${card.mana_cost || ''}
   Type: ${card.type_line}
   Text: ${card.oracle_text?.substring(0, 200) || 'N/A'}`).join('\n\n')}

ANALYSIS REQUEST:
Identify:
1. INFINITE COMBOS: Card combinations that create infinite loops (mana, damage, tokens, etc.)
2. POWERFUL SYNERGIES: Cards that work exceptionally well together (2-3 card interactions)
3. ENGINE PIECES: Cards that enable multiple other cards or create card advantage
4. WIN CONDITIONS: How these cards can win the game
5. PROTECTION: Cards that protect your key pieces

For each interaction, specify:
- Cards involved
- What it does
- How to execute it
- Power level (1-10)
- Consistency (how often you'll assemble it)

Respond with JSON:
{
  "infiniteCombos": [
    {
      "cards": ["Card A", "Card B", "Card C"],
      "description": "what it does",
      "steps": ["step 1", "step 2", "..."],
      "result": "infinite X",
      "powerLevel": 1-10,
      "consistency": "High/Medium/Low",
      "setupCost": "total mana needed"
    }
  ],
  "synergies": [
    {
      "cards": ["Card X", "Card Y"],
      "description": "what they do together",
      "value": "why it's good",
      "powerLevel": 1-10
    }
  ],
  "engines": [
    {
      "card": "Card Name",
      "enables": ["Card A", "Card B"],
      "description": "what it enables",
      "powerLevel": 1-10
    }
  ],
  "winConditions": [
    {
      "method": "description",
      "cardsNeeded": ["list"],
      "turnsToWin": "estimate",
      "reliability": "High/Medium/Low"
    }
  ],
  "protection": [
    {
      "card": "Card Name",
      "protects": ["what it protects"],
      "description": "how it protects"
    }
  ]
}`;

  const interactions = await callOpenAI(
    [
      { role: 'system', content: SYSTEM_PROMPTS.comboAnalysis },
      { role: 'user', content: prompt }
    ],
    18000 // max_completion_tokens
  );
  
  if (!interactions) {
    throw new AIAnalysisError('Empty response from API', null, {});
  }
  
  return { interactions };
};

/**
 * Fallback for detectCardInteractions
 */
const detectCardInteractionsFallback = () => {
  console.warn('⚠️ Card interaction analysis unavailable, using empty results');
  return {
    interactions: {
      infiniteCombos: [],
      synergies: [],
      engines: [],
      winConditions: [{
        method: 'Analysis unavailable - check errors',
        cardsNeeded: [],
        turnsToWin: 'Unknown',
        reliability: 'Unknown'
      }],
      protection: []
    }
  };
};

/**
 * Detect card interactions and combos using AI (exported with error handling)
 */
export const detectCardInteractions = wrapAIFunction(
  detectCardInteractionsImpl,
  detectCardInteractionsFallback,
  'detectCardInteractions',
  {
    retryCount: 1,
    timeout: 30000,
    logErrors: true
  }
);

/**
 * Internal implementation - Analyze specific card's interactions in deck
 */
const analyzeCardInDeckImpl = async (card, parsedDeck) => {
  // Validate inputs
  if (!card || !card.name) {
    throw new AIAnalysisError('Invalid card provided', null, { card });
  }
  
  if (!parsedDeck || !parsedDeck.commanders) {
    throw new AIAnalysisError('Invalid deck structure', null, { 
      parsedDeck: parsedDeck ? Object.keys(parsedDeck) : 'null' 
    });
  }
  
  const otherCards = [
    ...(parsedDeck.commanders || []),
    ...(parsedDeck.creatures || []),
    ...(parsedDeck.instants || []),
    ...(parsedDeck.sorceries || []),
    ...(parsedDeck.artifacts || []),
    ...(parsedDeck.enchantments || [])
  ].filter(c => c.name !== card.name);
  
  const prompt = `Analyze how this card interacts with others in the deck.

TARGET CARD:
${card.name} ${card.mana_cost || ''}
Type: ${card.type_line}
Text: ${card.oracle_text || 'N/A'}

DECK CARDS (sample):
${otherCards.slice(0, 20).map(c => `- ${c.name}: ${c.oracle_text?.substring(0, 100) || 'N/A'}`).join('\n')}

Identify:
1. Best synergies with this card
2. Cards that enable this card
3. Cards this card enables
4. Overall importance in deck (1-10)

Response JSON:
{
  "bestSynergies": ["card names"],
  "enablers": ["card names"],
  "enables": ["card names"],
  "importance": 1-10,
  "role": "description of role in deck"
}`;

  const analysis = await callOpenAI(
    [
      { role: 'system', content: SYSTEM_PROMPTS.cardInteraction },
      { role: 'user', content: prompt }
    ],
    13000 // max_completion_tokens
  );
  
  return { analysis };
};

/**
 * Fallback for analyzeCardInDeck
 */
const analyzeCardInDeckFallback = (card) => {
  console.warn('⚠️ Card analysis unavailable, using defaults');
  return {
    analysis: {
      bestSynergies: [],
      enablers: [],
      enables: [],
      importance: 5,
      role: `${card?.name || 'Card'} role analysis unavailable`
    }
  };
};

/**
 * Analyze specific card's interactions in deck (exported with error handling)
 */
export const analyzeCardInDeck = wrapAIFunction(
  analyzeCardInDeckImpl,
  analyzeCardInDeckFallback,
  'analyzeCardInDeck',
  {
    retryCount: 1,
    timeout: 20000,
    logErrors: true
  }
);

/**
 * Internal implementation - Find replacement cards for problematic ones
 */
const findReplacementCardsImpl = async (cardToReplace, deckArchetype, budget = 'medium') => {
  // Validate inputs
  if (!cardToReplace || typeof cardToReplace !== 'string') {
    throw new AIAnalysisError('Invalid card name provided', null, { cardToReplace });
  }
  
  if (!deckArchetype || typeof deckArchetype !== 'string') {
    throw new AIAnalysisError('Invalid archetype provided', null, { deckArchetype });
  }
  
  const prompt = `Suggest replacement cards for ${cardToReplace} in a ${deckArchetype} Commander deck.

Card to Replace: ${cardToReplace}
Deck Archetype: ${deckArchetype}
Budget: ${budget} (low = $5, medium = $20, high = $50+)

Provide 5 replacement options that:
1. Serve similar function
2. Fit the archetype
3. Are within budget
4. Potentially improve the deck

Response JSON:
{
  "replacements": [
    {
      "name": "Card Name",
      "reason": "why it's better",
      "cost": "mana cost",
      "price": "estimated $",
      "upgrade": true/false
    }
  ]
}`;

  const replacements = await callOpenAI(
    [
      { role: 'system', content: SYSTEM_PROMPTS.deckBuilding },
      { role: 'user', content: prompt }
    ],
    14000 // max_completion_tokens
  );
  
  return { replacements };
};

/**
 * Fallback for findReplacementCards
 */
const findReplacementCardsFallback = (cardToReplace) => {
  console.warn(`⚠️ Replacement card suggestions unavailable for ${cardToReplace}`);
  return {
    replacements: {
      replacements: [{
        name: 'Unable to generate suggestions',
        reason: `AI analysis unavailable for ${cardToReplace}`,
        cost: 'N/A',
        price: 'N/A',
        upgrade: false
      }]
    }
  };
};

/**
 * Find replacement cards for problematic ones (exported with error handling)
 */
export const findReplacementCards = wrapAIFunction(
  findReplacementCardsImpl,
  findReplacementCardsFallback,
  'findReplacementCards',
  {
    retryCount: 1,
    timeout: 20000,
    logErrors: true
  }
);

/**
 * Internal implementation - Get upgrade path for deck
 */
const getUpgradePathImpl = async (parsedDeck, deckStrategy, budget = 100) => {
  // Validate inputs
  if (!parsedDeck || !parsedDeck.commanders) {
    throw new AIAnalysisError('Invalid deck structure', null, { 
      parsedDeck: parsedDeck ? Object.keys(parsedDeck) : 'null' 
    });
  }
  
  if (!deckStrategy || !deckStrategy.archetype) {
    throw new AIAnalysisError('Invalid strategy provided', null, { 
      deckStrategy: deckStrategy ? Object.keys(deckStrategy) : 'null' 
    });
  }
  
  const prompt = `Create an upgrade path for this Commander deck.

Commander: ${parsedDeck.commanders[0]?.name}
Archetype: ${deckStrategy.archetype}
Budget: $${budget}

Current Deck Size: ${parsedDeck.total} cards
Creatures: ${parsedDeck.creatures.length}
Lands: ${parsedDeck.lands.length}

Provide a prioritized upgrade path:
1. Most impactful upgrades first
2. Stay within budget
3. Focus on consistency and power

Response JSON:
{
  "priority1": {
    "category": "Mana Base/Removal/Win Cons/etc",
    "upgrades": [
      {
        "add": "Card Name",
        "remove": "Card Name",
        "cost": "$X",
        "impact": "description"
      }
    ],
    "totalCost": "$X"
  },
  "priority2": { ... },
  "priority3": { ... }
}`;

  const upgradePath = await callOpenAI(
    [
      { role: 'system', content: SYSTEM_PROMPTS.optimization },
      { role: 'user', content: prompt }
    ],
    16000 // max_completion_tokens
  );
  
  return { upgradePath };
};

/**
 * Fallback for getUpgradePath
 */
const getUpgradePathFallback = () => {
  console.warn('⚠️ Upgrade path unavailable');
  return {
    upgradePath: {
      priority1: {
        category: 'Analysis unavailable',
        upgrades: [],
        totalCost: '$0'
      },
      priority2: {
        category: 'Analysis unavailable',
        upgrades: [],
        totalCost: '$0'
      },
      priority3: {
        category: 'Analysis unavailable',
        upgrades: [],
        totalCost: '$0'
      }
    }
  };
};

/**
 * Get upgrade path for deck (exported with error handling)
 */
export const getUpgradePath = wrapAIFunction(
  getUpgradePathImpl,
  getUpgradePathFallback,
  'getUpgradePath',
  {
    retryCount: 1,
    timeout: 25000,
    logErrors: true
  }
);

/**
 * Internal implementation - Detect missed synergies (cards that should be in deck)
 */
const detectMissedSynergiesImpl = async (parsedDeck, deckStrategy) => {
  // Validate inputs
  if (!parsedDeck || !parsedDeck.commanders || !parsedDeck.commanders[0]) {
    throw new AIAnalysisError('Invalid deck structure', null, { 
      parsedDeck: parsedDeck ? Object.keys(parsedDeck) : 'null' 
    });
  }
  
  if (!deckStrategy || !deckStrategy.archetype) {
    throw new AIAnalysisError('Invalid strategy provided', null, { 
      deckStrategy: deckStrategy ? Object.keys(deckStrategy) : 'null' 
    });
  }
  
  const commander = parsedDeck.commanders[0];
  
  const prompt = `Identify cards that are missing from this deck that would have great synergy.

Commander: ${commander.name}
Commander Text: ${commander.oracle_text || 'N/A'}
Archetype: ${deckStrategy.archetype}

Current key cards:
${[...(parsedDeck.creatures || []), ...(parsedDeck.instants || []), ...(parsedDeck.sorceries || [])]
  .slice(0, 15)
  .map(c => `- ${c.name}`)
  .join('\n')}

What staple cards or synergy pieces are missing that would improve this deck?

Response JSON:
{
  "missedSynergies": [
    {
      "cardName": "Card Name",
      "category": "Ramp/Draw/Removal/Synergy",
      "reason": "why it fits",
      "synergyWith": ["existing cards"],
      "priority": "High/Medium/Low"
    }
  ]
}`;

  const missedSynergies = await callOpenAI(
    [
      { role: 'system', content: SYSTEM_PROMPTS.synergyDetection },
      { role: 'user', content: prompt }
    ],
    15000 // max_completion_tokens
  );
  
  return { missedSynergies };
};

/**
 * Fallback for detectMissedSynergies
 */
const detectMissedSynergiesFallback = () => {
  console.warn('⚠️ Missed synergy detection unavailable');
  return {
    missedSynergies: {
      missedSynergies: [{
        cardName: 'Analysis unavailable',
        category: 'Unknown',
        reason: 'AI analysis failed',
        synergyWith: [],
        priority: 'Unknown'
      }]
    }
  };
};

/**
 * Detect missed synergies (exported with error handling)
 */
export const detectMissedSynergies = wrapAIFunction(
  detectMissedSynergiesImpl,
  detectMissedSynergiesFallback,
  'detectMissedSynergies',
  {
    retryCount: 1,
    timeout: 25000,
    logErrors: true
  }
);
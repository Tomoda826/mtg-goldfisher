// Deck Analyzer - analyzes deck strategy and archetype
// UPDATED: Now includes comprehensive error handling

import { 
  wrapSyncFunction, 
  DeckAnalysisError 
} from './errorHandler.js';

// Safe array reduce that handles null/undefined
const safeReduce = (arr, fn, initial) => {
  if (!arr || !Array.isArray(arr)) return initial;
  try {
    return arr.reduce(fn, initial);
  } catch (error) {
    console.warn('Safe reduce error:', error.message);
    return initial;
  }
};

// Internal implementation with validation
const analyzeDeckStrategyImpl = (deck) => {
  // Validate input
  if (!deck || typeof deck !== 'object') {
    throw new DeckAnalysisError('Invalid deck object provided', null, { 
      deckType: typeof deck 
    });
  }
  
  // Validate required arrays exist
  const requiredArrays = ['creatures', 'instants', 'sorceries', 'artifacts', 'enchantments', 'planeswalkers', 'lands'];
  for (const key of requiredArrays) {
    if (!Array.isArray(deck[key])) {
      throw new DeckAnalysisError(`Deck missing ${key} array`, null, { 
        deck: Object.keys(deck),
        missing: key 
      });
    }
  }
  
  const analysis = {
    archetype: 'Unknown',
    subArchetypes: [],
    avgCMC: 0,
    creatureDensity: 0,
    spellDensity: 0,
    landCount: 0,
    keyPatterns: [],
    tribalType: null,
    tribalDensity: 0,
    winConditions: [],
    gameplan: '',
    idealTurnWin: 0,
  };

  // Calculate basic metrics with safe operations
  const landQuantity = safeReduce(deck.lands, (sum, c) => sum + (c.quantity || 0), 0);
  const totalDeck = deck.totalDeck || 100;
  const totalNonLand = totalDeck - landQuantity;
  const creatureCount = safeReduce(deck.creatures, (sum, c) => sum + (c.quantity || 0), 0);
  const instantSorceryCount = 
    safeReduce(deck.instants, (sum, c) => sum + (c.quantity || 0), 0) + 
    safeReduce(deck.sorceries, (sum, c) => sum + (c.quantity || 0), 0);
  
  analysis.landCount = landQuantity;
  analysis.creatureDensity = totalNonLand > 0 ? (creatureCount / totalNonLand) * 100 : 0;
  analysis.spellDensity = totalNonLand > 0 ? (instantSorceryCount / totalNonLand) * 100 : 0;

  // Calculate average CMC (excluding lands)
  let totalCMC = 0;
  let cardCount = 0;
  
  try {
    [...deck.creatures, ...deck.instants, ...deck.sorceries, ...deck.artifacts, 
     ...deck.enchantments, ...deck.planeswalkers].forEach(card => {
      if (card && typeof card.cmc === 'number') {
        totalCMC += card.cmc * (card.quantity || 1);
        cardCount += card.quantity || 1;
      }
    });
  } catch (error) {
    console.warn('CMC calculation error:', error.message);
  }
  
  analysis.avgCMC = cardCount > 0 ? parseFloat((totalCMC / cardCount).toFixed(2)) : 3.5;

  // Detect Tribal
  const subtypeCounts = {};
  try {
    deck.creatures.forEach(card => {
      if (card && card.type_line && typeof card.type_line === 'string') {
        // Extract creature types (everything after "—")
        const typeParts = card.type_line.split('—');
        if (typeParts.length > 1) {
          const subtypes = typeParts[1].trim().split(' ');
          subtypes.forEach(subtype => {
            const cleanType = subtype.trim();
            if (cleanType && cleanType.length > 0) {
              subtypeCounts[cleanType] = (subtypeCounts[cleanType] || 0) + (card.quantity || 1);
            }
          });
        }
      }
    });
  } catch (error) {
    console.warn('Tribal detection error:', error.message);
  }

  // Find dominant tribe
  const dominantTribe = Object.entries(subtypeCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (dominantTribe && dominantTribe[1] >= 8) {
    analysis.tribalType = dominantTribe[0];
    analysis.tribalDensity = dominantTribe[1];
    analysis.subArchetypes.push('Tribal');
  }

  // Keyword detection in card text
  let allText = '';
  try {
    allText = [...deck.creatures, ...deck.instants, ...deck.sorceries, 
               ...deck.artifacts, ...deck.enchantments, ...deck.commanders]
      .map(c => (c && c.oracle_text) ? c.oracle_text.toLowerCase() : '')
      .join(' ');
  } catch (error) {
    console.warn('Text aggregation error:', error.message);
    allText = '';
  }

  const keywords = {
    control: ['counter', 'destroy', 'exile', 'return to hand', 'bounce'],
    aggro: ['haste', 'double strike', 'first strike', 'combat damage'],
    combo: ['infinite', 'win the game', 'search your library', 'tutor'],
    ramp: ['search your library for a land', 'add mana', 'untap', 'mana ability'],
    voltron: ['equip', 'attach', 'equipped creature', 'aura'],
    graveyard: ['graveyard', 'reanimate', 'return from', 'flashback', 'unearth'],
    tokens: ['create', 'token', 'populate'],
    sacrifice: ['sacrifice', 'die', 'dies'],
    lifegain: ['gain life', 'lifelink'],
    card_draw: ['draw', 'draws'],
  };

  const patternScores = {};
  Object.entries(keywords).forEach(([pattern, words]) => {
    let score = 0;
    try {
      words.forEach(word => {
        const matches = (allText.match(new RegExp(word, 'g')) || []).length;
        score += matches;
      });
    } catch (error) {
      console.warn(`Pattern scoring error for ${pattern}:`, error.message);
    }
    patternScores[pattern] = score;
  });

  // Determine primary archetype
  if (analysis.tribalDensity >= 15) {
    analysis.archetype = 'Tribal Aggro';
    analysis.gameplan = `Flood the board with ${analysis.tribalType} creatures and overwhelm with tribal synergies.`;
    analysis.idealTurnWin = 8;
    analysis.winConditions.push(`Combat damage with ${analysis.tribalType} tribal`);
  } else if (patternScores.voltron > 10 && deck.artifacts.length > 5) {
    analysis.archetype = 'Voltron';
    analysis.subArchetypes.push('Equipment');
    analysis.gameplan = 'Suit up commander with equipment and deal commander damage.';
    analysis.idealTurnWin = 7;
    analysis.winConditions.push('21 Commander damage');
  } else if (patternScores.combo > 5) {
    analysis.archetype = 'Combo';
    analysis.gameplan = 'Assemble combo pieces and win with infinite loops or alternate win conditions.';
    analysis.idealTurnWin = 6;
    analysis.winConditions.push('Combo finish');
  } else if (analysis.avgCMC <= 2.5 && analysis.creatureDensity > 50) {
    analysis.archetype = 'Aggro';
    analysis.gameplan = 'Deploy threats quickly and win through early combat damage.';
    analysis.idealTurnWin = 6;
    analysis.winConditions.push('Early combat damage');
  } else if (patternScores.control > 15 && analysis.spellDensity > 40) {
    analysis.archetype = 'Control';
    analysis.gameplan = 'Control the game with removal and counterspells, then win with late-game threats.';
    analysis.idealTurnWin = 12;
    analysis.winConditions.push('Late-game value');
  } else if (patternScores.ramp > 10 && analysis.avgCMC > 4) {
    analysis.archetype = 'Ramp';
    analysis.gameplan = 'Accelerate mana production and cast high-impact threats.';
    analysis.idealTurnWin = 9;
    analysis.winConditions.push('Big threats');
  } else if (patternScores.graveyard > 10) {
    analysis.archetype = 'Graveyard';
    analysis.subArchetypes.push('Reanimator');
    analysis.gameplan = 'Fill graveyard and reanimate powerful creatures.';
    analysis.idealTurnWin = 7;
    analysis.winConditions.push('Reanimated threats');
  } else if (analysis.creatureDensity > 40 && analysis.avgCMC >= 3 && analysis.avgCMC <= 4.5) {
    analysis.archetype = 'Midrange';
    analysis.gameplan = 'Play efficient creatures and out-value opponents in the mid-game.';
    analysis.idealTurnWin = 10;
    analysis.winConditions.push('Creature combat');
  } else {
    analysis.archetype = 'Midrange';
    analysis.gameplan = 'Balanced strategy focusing on value and board presence.';
    analysis.idealTurnWin = 10;
    analysis.winConditions.push('General value');
  }

  // Add relevant sub-archetypes based on patterns
  if (patternScores.control > 8 && analysis.archetype !== 'Control') {
    analysis.subArchetypes.push('Control Elements');
  }
  if (patternScores.tokens > 8) {
    analysis.subArchetypes.push('Token Generation');
  }
  if (patternScores.sacrifice > 8) {
    analysis.subArchetypes.push('Sacrifice Theme');
  }
  if (patternScores.card_draw > 15) {
    analysis.subArchetypes.push('Card Advantage');
  }

  // Store pattern scores for reference
  analysis.keyPatterns = Object.entries(patternScores)
    .filter(([, score]) => score > 5)
    .sort((a, b) => b[1] - a[1])
    .map(([pattern, score]) => ({ pattern, score }));

  return { analysis };
};

// Fallback function for errors
const analyzeDeckStrategyFallback = (deck) => {
  console.warn('⚠️ Using fallback deck analysis (minimal strategy)');
  
  // Try to extract commander name safely
  let commanderName = 'Unknown';
  try {
    if (deck && deck.commanders && deck.commanders[0] && deck.commanders[0].name) {
      commanderName = deck.commanders[0].name;
    }
  } catch {
    // Ignore
  }
  
  // Try to get land count safely
  let landCount = 37;
  try {
    if (deck && deck.lands && Array.isArray(deck.lands)) {
      landCount = deck.lands.length;
    }
  } catch {
    // Ignore
  }
  
  return {
    analysis: {
      archetype: 'Midrange',
      subArchetypes: [],
      avgCMC: 3.5,
      creatureDensity: 40,
      spellDensity: 30,
      landCount: landCount,
      keyPatterns: [],
      tribalType: null,
      tribalDensity: 0,
      winConditions: ['Combat damage'],
      gameplan: `Play ${commanderName} and attack with creatures`,
      idealTurnWin: 10
    }
  };
};

// Export wrapped version with error handling
export const analyzeDeckStrategy = wrapSyncFunction(
  analyzeDeckStrategyImpl,
  analyzeDeckStrategyFallback,
  'analyzeDeckStrategy'
);
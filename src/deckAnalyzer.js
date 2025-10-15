// Deck Analyzer - analyzes deck strategy and archetype

export const analyzeDeckStrategy = (deck) => {
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

  // Calculate basic metrics
  const totalNonLand = deck.totalDeck - deck.lands.reduce((sum, c) => sum + c.quantity, 0);
  const creatureCount = deck.creatures.reduce((sum, c) => sum + c.quantity, 0);
  const instantSorceryCount = 
    deck.instants.reduce((sum, c) => sum + c.quantity, 0) + 
    deck.sorceries.reduce((sum, c) => sum + c.quantity, 0);
  
  analysis.landCount = deck.lands.reduce((sum, c) => sum + c.quantity, 0);
  analysis.creatureDensity = totalNonLand > 0 ? (creatureCount / totalNonLand) * 100 : 0;
  analysis.spellDensity = totalNonLand > 0 ? (instantSorceryCount / totalNonLand) * 100 : 0;

  // Calculate average CMC (excluding lands)
  let totalCMC = 0;
  let cardCount = 0;
  [...deck.creatures, ...deck.instants, ...deck.sorceries, ...deck.artifacts, 
   ...deck.enchantments, ...deck.planeswalkers].forEach(card => {
    if (card.cmc !== undefined) {
      totalCMC += card.cmc * card.quantity;
      cardCount += card.quantity;
    }
  });
  analysis.avgCMC = cardCount > 0 ? (totalCMC / cardCount).toFixed(2) : 0;

  // Detect Tribal
  const subtypeCounts = {};
  deck.creatures.forEach(card => {
    if (card.type_line) {
      // Extract creature types (everything after "—")
      const typeParts = card.type_line.split('—');
      if (typeParts.length > 1) {
        const subtypes = typeParts[1].trim().split(' ');
        subtypes.forEach(subtype => {
          const cleanType = subtype.trim();
          if (cleanType) {
            subtypeCounts[cleanType] = (subtypeCounts[cleanType] || 0) + card.quantity;
          }
        });
      }
    }
  });

  // Find dominant tribe
  const dominantTribe = Object.entries(subtypeCounts)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (dominantTribe && dominantTribe[1] >= 8) {
    analysis.tribalType = dominantTribe[0];
    analysis.tribalDensity = dominantTribe[1];
    analysis.subArchetypes.push('Tribal');
  }

  // Keyword detection in card text
  const allText = [...deck.creatures, ...deck.instants, ...deck.sorceries, 
                   ...deck.artifacts, ...deck.enchantments, ...deck.commanders]
    .map(c => (c.oracle_text || '').toLowerCase())
    .join(' ');

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
    words.forEach(word => {
      const matches = (allText.match(new RegExp(word, 'g')) || []).length;
      score += matches;
    });
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

  return analysis;
};
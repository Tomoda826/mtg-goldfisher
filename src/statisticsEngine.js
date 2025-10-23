// Statistics Engine - Track and analyze multi-game goldfish data

export const initializeStatistics = () => {
  return {
    totalGames: 0,
    mulligans: [],
    openingHandsKept: 0,
    
    // Turn-based metrics
    firstLandTurn: [],
    landsOnTurn4: [],
    firstSpellTurn: [],
    commanderCastTurn: [],
    winTurn: [],
    
    // Game end states
    gamesWon: 0,
    finalDamage: [],
    finalBoardSize: [],
    finalLandCount: [],
    
    // Mana issues
    colorScrew: 0, // Couldn't cast spells due to colors
    manaFlood: 0, // Too many lands
    manaScrew: 0, // Too few lands
    
    // Card tracking
    cardsNeverCast: {}, // card name -> count
    cardsAlwaysCast: {}, // card name -> count
    deadCardsInHand: {}, // cards that sat in hand
    
    // Performance per game
    gameResults: []
  };
};

export const recordGameResult = (stats, gameState, gameNumber) => {
  stats.totalGames++;
  
  const result = {
    gameNumber: gameNumber,
    mulligans: gameState.mulliganCount || 0,
    commanderCastTurn: gameState.commanderFirstCastTurn || null,
    winTurn: gameState.damageDealtThisGame >= 40 ? gameState.turn : null,
    finalDamage: gameState.damageDealtThisGame,
    finalBoardSize: gameState.battlefield.creatures.length,
    finalLandCount: gameState.battlefield.lands.length,
    landsOnTurn4: gameState.landsPlayedByTurn4 || 0,
    firstSpellTurn: gameState.firstSpellCastTurn || null,
    colorScrewOccurred: gameState.colorScrewCount > 0,
    manaFloodOccurred: gameState.manaFloodTurns > 0,
    manaScrewOccurred: gameState.manaScrewTurns > 0,
    deadCards: gameState.deadCardsInHand || []
  };
  
  // Record mulligan
  stats.mulligans.push(result.mulligans);
  if (result.mulligans === 0) stats.openingHandsKept++;
  
  // Record turn metrics
  if (result.commanderCastTurn) stats.commanderCastTurn.push(result.commanderCastTurn);
  if (result.winTurn) {
    stats.winTurn.push(result.winTurn);
    stats.gamesWon++;
  }
  if (result.firstSpellTurn) stats.firstSpellTurn.push(result.firstSpellTurn);
  stats.landsOnTurn4.push(result.landsOnTurn4);
  
  // Record end state
  stats.finalDamage.push(result.finalDamage);
  stats.finalBoardSize.push(result.finalBoardSize);
  stats.finalLandCount.push(result.finalLandCount);
  
  // Record mana issues
  if (result.colorScrewOccurred) stats.colorScrew++;
  if (result.manaFloodOccurred) stats.manaFlood++;
  if (result.manaScrewOccurred) stats.manaScrew++;
  
  // Track dead cards
  result.deadCards.forEach(cardName => {
    stats.deadCardsInHand[cardName] = (stats.deadCardsInHand[cardName] || 0) + 1;
  });
  
  stats.gameResults.push(result);
  
  return stats;
};

const average = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0;
const median = (arr) => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? ((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2) : sorted[mid];
};

export const calculateSummary = (stats) => {
  return {
    totalGames: stats.totalGames,
    
    // Mulligan stats
    avgMulligans: average(stats.mulligans),
    openingHandKeptRate: ((stats.openingHandsKept / stats.totalGames) * 100).toFixed(1) + '%',
    
    // Turn-based averages
    avgCommanderCastTurn: average(stats.commanderCastTurn),
    medianCommanderCastTurn: median(stats.commanderCastTurn),
    
    avgWinTurn: average(stats.winTurn),
    medianWinTurn: median(stats.winTurn),
    winRate: ((stats.gamesWon / stats.totalGames) * 100).toFixed(1) + '%',
    
    avgFirstSpellTurn: average(stats.firstSpellTurn),
    avgLandsOnTurn4: average(stats.landsOnTurn4),
    
    // End state averages
    avgFinalDamage: average(stats.finalDamage),
    avgFinalBoardSize: average(stats.finalBoardSize),
    avgFinalLandCount: average(stats.finalLandCount),
    
    // Mana issues
    colorScrewRate: ((stats.colorScrew / stats.totalGames) * 100).toFixed(1) + '%',
    manaFloodRate: ((stats.manaFlood / stats.totalGames) * 100).toFixed(1) + '%',
    manaScrewRate: ((stats.manaScrew / stats.totalGames) * 100).toFixed(1) + '%',
    
    // Problem cards (appeared in 50%+ of games as dead)
    problematicCards: Object.entries(stats.deadCardsInHand)
      .filter(([, count]) => count >= stats.totalGames * 0.5)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ 
        name, 
        deadCount: count, 
        percentage: ((count / stats.totalGames) * 100).toFixed(0) + '%' 
      }))
  };
};

export const generateReport = (stats) => {
  const summary = calculateSummary(stats);
  
  const report = [];
  
  report.push('=== GOLDFISH ANALYSIS REPORT ===\n');
  report.push(`📊 Games Played: ${summary.totalGames}`);
  report.push(`🎲 Opening Hand Kept Rate: ${summary.openingHandKeptRate}`);
  report.push(`🔄 Average Mulligans: ${summary.avgMulligans}\n`);
  
  report.push('⏱️  SPEED METRICS:');
  report.push(`   First Spell Cast: Turn ${summary.avgFirstSpellTurn} (avg)`);
  report.push(`   Commander Cast: Turn ${summary.avgCommanderCastTurn} (avg), Turn ${summary.medianCommanderCastTurn} (median)`);
  if (stats.gamesWon > 0) {
    report.push(`   Win Turn: Turn ${summary.avgWinTurn} (avg), Turn ${summary.medianWinTurn} (median)`);
    report.push(`   Win Rate: ${summary.winRate}\n`);
  } else {
    report.push(`   Win Rate: ${summary.winRate} (No wins in simulation)\n`);
  }
  
  report.push('💎 MANA PERFORMANCE:');
  report.push(`   Lands on Turn 4: ${summary.avgLandsOnTurn4} (avg)`);
  report.push(`   Color Screw: ${summary.colorScrewRate} of games`);
  report.push(`   Mana Screw: ${summary.manaScrewRate} of games`);
  report.push(`   Mana Flood: ${summary.manaFloodRate} of games\n`);
  
  report.push('📈 END STATE:');
  report.push(`   Average Damage Dealt: ${summary.avgFinalDamage}`);
  report.push(`   Average Board Size: ${summary.avgFinalBoardSize} creatures`);
  report.push(`   Average Lands: ${summary.avgFinalLandCount}`);
  
  if (summary.problematicCards && summary.problematicCards.length > 0) {
    report.push('\n⚠️  PROBLEMATIC CARDS (Frequently Dead in Hand):');
    summary.problematicCards.forEach(card => {
      report.push(`   ${card.name}: Dead in ${card.percentage} of games`);
    });
  }
  
  report.push('\n=== END REPORT ===');
  
  return report.join('\n');
};

export const getDeckHealthScore = (stats) => {
  const summary = calculateSummary(stats);
  
  let score = 100;
  
  // Deduct for mulligan issues
  const mulliganRate = parseFloat(summary.avgMulligans);
  if (mulliganRate > 1.5) score -= 15;
  else if (mulliganRate > 1.0) score -= 10;
  else if (mulliganRate > 0.5) score -= 5;
  
  // Deduct for mana issues
  const colorScrewRate = parseFloat(summary.colorScrewRate);
  if (colorScrewRate > 30) score -= 20;
  else if (colorScrewRate > 15) score -= 10;
  else if (colorScrewRate > 5) score -= 5;
  
  const manaScrewRate = parseFloat(summary.manaScrewRate);
  if (manaScrewRate > 30) score -= 20;
  else if (manaScrewRate > 15) score -= 10;
  else if (manaScrewRate > 5) score -= 5;
  
  // Deduct for slow performance
  const avgWinTurn = parseFloat(summary.avgWinTurn) || 99;
  const targetWinTurn = 8; // Adjust based on format
  if (avgWinTurn > targetWinTurn + 4) score -= 15;
  else if (avgWinTurn > targetWinTurn + 2) score -= 10;
  
  // Reward consistency
  const winRate = parseFloat(summary.winRate);
  if (winRate < 50) score -= 10;
  
  return Math.max(0, Math.min(100, score));
};
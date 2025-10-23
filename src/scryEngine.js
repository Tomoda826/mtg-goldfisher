// Scry Engine - Detects and executes scry abilities

/**
 * Check if a card has scry
 */
export const hasScry = (card) => {
  if (!card.oracle_text) return false;
  const text = card.oracle_text.toLowerCase();
  return text.includes('scry');
};

/**
 * Get scry amount from card text
 * Returns the number to scry (e.g., "Scry 2" returns 2)
 */
export const getScryAmount = (card) => {
  if (!hasScry(card)) return 0;
  
  const text = card.oracle_text.toLowerCase();
  
  // Match "scry X" where X is a number
  const scryMatch = text.match(/scry (\d+)/);
  if (scryMatch) {
    return parseInt(scryMatch[1]);
  }
  
  // Default to scry 1 if no number found
  return 1;
};

/**
 * Check if scry is an ETB effect
 */
export const hasETBScry = (card) => {
  if (!hasScry(card)) return false;
  const text = card.oracle_text.toLowerCase();
  return (
    (text.includes('when') || text.includes('as')) && 
    text.includes('enters') && 
    text.includes('battlefield')
  );
};

/**
 * Check if scry is a cast trigger
 */
export const hasCastScry = (card) => {
  if (!hasScry(card)) return false;
  const text = card.oracle_text.toLowerCase();
  return (
    text.includes('when you cast') ||
    text.includes('whenever you cast')
  );
};

/**
 * Check if scry is from spell resolution (instant/sorcery effect)
 */
export const hasSpellScry = (card) => {
  if (!hasScry(card)) return false;
  const category = card.category?.toLowerCase();
  return category === 'instant' || category === 'sorcery';
};

/**
 * Get scry trigger type
 */
export const getScryTrigger = (card) => {
  if (!hasScry(card)) return null;
  
  if (hasSpellScry(card)) return 'spell';
  if (hasETBScry(card)) return 'etb';
  if (hasCastScry(card)) return 'cast';
  
  const text = card.oracle_text.toLowerCase();
  if (text.includes('at the beginning of your upkeep')) return 'upkeep';
  if (text.includes('at the beginning of combat')) return 'combat';
  if (text.includes('when you draw')) return 'draw';
  
  return 'other';
};

/**
 * AI decision: Should we keep this card on top or send to bottom?
 * Returns true to keep on top, false to put on bottom
 */
export const shouldKeepOnTop = (card, gameState, deckStrategy) => {
  const turn = gameState.turn;
  const landsInPlay = gameState.battlefield.lands.length;
  const handsSize = gameState.hand.length;
  
  // PRIORITY 1: Land management
  if (card.category === 'land') {
    // Early game (turns 1-4): Keep lands if we have less than 4
    if (turn <= 4 && landsInPlay < 4) return true;
    
    // Mid game: Keep lands if we're behind on mana
    if (turn > 4 && turn <= 7 && landsInPlay < 6) return true;
    
    // Late game: Bottom lands if we have 7+
    if (landsInPlay >= 7) return false;
    
    // Default: Keep if we need lands
    return landsInPlay < 5;
  }
  
  // PRIORITY 2: Low CMC spells early game
  if (turn <= 3 && card.cmc <= 2) return true;
  
  // PRIORITY 3: Cards we can cast RIGHT NOW
  const totalMana = Object.values(gameState.manaPool).reduce((a, b) => a + b, 0);
  if (card.cmc <= totalMana && card.category !== 'land') return true;
  
  // PRIORITY 4: Strategy-specific priorities
  const archetype = deckStrategy?.archetype?.toLowerCase() || '';
  
  if (archetype.includes('aggro')) {
    // Aggro wants low CMC creatures
    if (card.category === 'creature' && card.cmc <= 3) return true;
    if (card.oracle_text?.toLowerCase().includes('haste')) return true;
  }
  
  if (archetype.includes('control')) {
    // Control wants interaction
    if (card.category === 'instant') return true;
    if (card.oracle_text?.toLowerCase().includes('counter')) return true;
    if (card.oracle_text?.toLowerCase().includes('destroy')) return true;
  }
  
  if (archetype.includes('combo')) {
    // Combo wants card draw and tutors
    if (card.oracle_text?.toLowerCase().includes('draw')) return true;
    if (card.oracle_text?.toLowerCase().includes('search your library')) return true;
  }
  
  if (archetype.includes('ramp')) {
    // Ramp wants mana acceleration and big threats
    if (card.oracle_text?.toLowerCase().includes('search your library for a land')) return true;
    if (card.oracle_text?.toLowerCase().includes('add') && 
        card.oracle_text?.toLowerCase().includes('mana')) return true;
    if (card.category === 'creature' && card.cmc >= 6) return true;
  }
  
  // PRIORITY 5: Commander if not cast yet
  if (card.isCommander && gameState.commandZone.length > 0) {
    const commander = gameState.commandZone[0];
    const commanderCost = commander.cmc + (commander.commanderCastCount * 2);
    // Keep commander on top if we're close to being able to cast it
    if (landsInPlay >= commanderCost - 2) return true;
  }
  
  // PRIORITY 6: Hand size consideration
  if (handsSize < 3) {
    // Low hand size: keep anything castable
    return card.cmc <= landsInPlay + 2;
  }
  
  // PRIORITY 7: Curve consideration
  // Keep cards we can cast in the next 1-2 turns
  if (card.cmc <= landsInPlay + 2) return true;
  
  // Default: Bottom high CMC cards we can't cast soon
  return false;
};

/**
 * Execute scry and return updated game state
 */
export const executeScry = (gameState, scryAmount, sourceCard, triggerType = 'unknown') => {
  if (scryAmount <= 0 || gameState.library.length === 0) {
    return gameState;
  }
  
  // Can only scry up to library size
  const actualScryAmount = Math.min(scryAmount, gameState.library.length);
  
  // Look at top N cards
  const topCards = gameState.library.slice(-actualScryAmount);
  
  // AI decides which to keep on top vs bottom
  const decisions = topCards.map(card => ({
    card: card,
    keepOnTop: shouldKeepOnTop(card, gameState, gameState.strategy)
  }));
  
  // Separate cards to keep on top vs send to bottom
  const keptOnTop = decisions.filter(d => d.keepOnTop).map(d => d.card);
  const sentToBottom = decisions.filter(d => !d.keepOnTop).map(d => d.card);
  
  // Remove the scried cards from library
  gameState.library.splice(-actualScryAmount, actualScryAmount);
  
  // Put kept cards back on top (in order)
  keptOnTop.forEach(card => {
    gameState.library.push(card);
  });
  
  // Put sent cards on bottom (in order)
  sentToBottom.reverse().forEach(card => {
    gameState.library.unshift(card);
  });
  
  // Log the scry
  const keptNames = keptOnTop.map(c => c.name).join(', ') || 'none';
  const bottomedNames = sentToBottom.map(c => c.name).join(', ') || 'none';
  
  let actionDesc = 'Scry';
  switch(triggerType) {
    case 'spell':
      actionDesc = 'Scry (Spell Effect)';
      break;
    case 'etb':
      actionDesc = 'Scry (ETB)';
      break;
    case 'cast':
      actionDesc = 'Scry (Cast Trigger)';
      break;
    case 'upkeep':
      actionDesc = 'Scry (Upkeep)';
      break;
  }
  
  gameState.detailedLog?.push({
    turn: gameState.turn,
    phase: gameState.phase,
    action: actionDesc,
    target: sourceCard.name,
    details: `Scry ${actualScryAmount}: Kept ${keptOnTop.length} on top, sent ${sentToBottom.length} to bottom`,
    scryAmount: actualScryAmount,
    keptOnTop: keptNames,
    sentToBottom: bottomedNames,
    success: true
  });
  
  // Also log to basic log if it exists
  if (gameState.log) {
    gameState.log.push(`🔮 Scry ${actualScryAmount} from ${sourceCard.name}: Kept [${keptNames}] on top, sent [${bottomedNames}] to bottom`);
  }
  
  return gameState;
};

/**
 * Check battlefield for scry triggers at specific phase
 */
export const checkScryTriggers = (gameState, phase) => {
  const allPermanents = [
    ...gameState.battlefield.creatures,
    ...gameState.battlefield.artifacts,
    ...gameState.battlefield.enchantments,
    ...gameState.battlefield.planeswalkers
  ];
  
  allPermanents.forEach(permanent => {
    if (!hasScry(permanent)) return;
    
    const text = permanent.oracle_text.toLowerCase();
    let shouldTrigger = false;
    
    // Check if this permanent's scry should trigger this phase
    if (phase === 'upkeep' && text.includes('at the beginning of your upkeep')) {
      shouldTrigger = true;
    } else if (phase === 'combat' && text.includes('at the beginning of combat')) {
      shouldTrigger = true;
    } else if (phase === 'draw' && text.includes('when you draw')) {
      shouldTrigger = true;
    }
    
    if (shouldTrigger) {
      const amount = getScryAmount(permanent);
      executeScry(gameState, amount, permanent, phase);
    }
  });
  
  return gameState;
};

/**
 * Analyze deck for scry effects
 */
export const analyzeScryEffects = (parsedDeck) => {
  const scryCards = {
    etb: [],
    spell: [],
    triggered: [],
    total: 0,
    totalScryAmount: 0
  };
  
  const allCards = [
    ...parsedDeck.commanders,
    ...parsedDeck.creatures,
    ...parsedDeck.instants,
    ...parsedDeck.sorceries,
    ...parsedDeck.artifacts,
    ...parsedDeck.enchantments,
    ...parsedDeck.planeswalkers
  ];
  
  allCards.forEach(card => {
    if (hasScry(card)) {
      const amount = getScryAmount(card);
      scryCards.total++;
      scryCards.totalScryAmount += amount;
      
      const trigger = getScryTrigger(card);
      if (trigger === 'etb') {
        scryCards.etb.push({ name: card.name, amount });
      } else if (trigger === 'spell') {
        scryCards.spell.push({ name: card.name, amount });
      } else {
        scryCards.triggered.push({ name: card.name, amount });
      }
    }
  });
  
  return scryCards;
};

/**
 * Helper: Get scry statistics from game
 */
export const getScryStats = (gameState) => {
  if (!gameState.detailedLog) return null;
  
  const scryActions = gameState.detailedLog.filter(entry => 
    entry.action && entry.action.toLowerCase().includes('scry')
  );
  
  const totalScries = scryActions.length;
  const totalScryAmount = scryActions.reduce((sum, entry) => sum + (entry.scryAmount || 0), 0);
  const totalKept = scryActions.reduce((sum, entry) => {
    const kept = entry.keptOnTop?.split(', ').filter(name => name !== 'none').length || 0;
    return sum + kept;
  }, 0);
  const totalBottomed = scryActions.reduce((sum, entry) => {
    const bottomed = entry.sentToBottom?.split(', ').filter(name => name !== 'none').length || 0;
    return sum + bottomed;
  }, 0);
  
  return {
    totalScries,
    totalScryAmount,
    totalKept,
    totalBottomed,
    keepRate: totalScryAmount > 0 ? ((totalKept / totalScryAmount) * 100).toFixed(1) + '%' : '0%'
  };
};
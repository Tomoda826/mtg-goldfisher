// Game Engine - handles all game simulation logic

// Initialize game state
export const initializeGame = (deck, strategy) => {
  // Create deck list with all cards
  const deckCards = [];
  
  // Add all non-commander cards to library
  [...deck.creatures, ...deck.instants, ...deck.sorceries, 
   ...deck.artifacts, ...deck.enchantments, ...deck.planeswalkers, ...deck.lands]
    .forEach(card => {
      for (let i = 0; i < card.quantity; i++) {
        deckCards.push({...card});
      }
    });
  
  // Shuffle deck
  const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
  
  const initialState = {
    turn: 0,
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
    commandZone: [...deck.commanders],
    manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    hasPlayedLand: false,
    log: ['Game initialized'],
    strategy: strategy
  };
  
  // Draw opening hand (7 cards)
  for (let i = 0; i < 7; i++) {
    if (initialState.library.length > 0) {
      initialState.hand.push(initialState.library.pop());
    }
  }
  
  initialState.log.push(`Drew opening hand of 7 cards`);
  
  return initialState;
};

// Draw a card
export const drawCard = (state) => {
  if (state.library.length === 0) {
    state.log.push('Cannot draw - library is empty!');
    return state;
  }
  
  const card = state.library.pop();
  state.hand.push(card);
  state.log.push(`Drew: ${card.name}`);
  return state;
};

// Play a land
export const playLand = (state, landIndex) => {
  if (state.hasPlayedLand) {
    state.log.push('Already played a land this turn');
    return state;
  }
  
  const land = state.hand.splice(landIndex, 1)[0];
  state.battlefield.lands.push(land);
  state.hasPlayedLand = true;
  state.log.push(`Played land: ${land.name}`);
  return state;
};

// Tap lands for mana (simplified - just adds generic mana)
export const tapLandsForMana = (state) => {
  const availableMana = state.battlefield.lands.length;
  state.manaPool.C = availableMana;
  state.log.push(`Generated ${availableMana} mana from lands`);
  return state;
};

// Run a single turn
export const runTurn = (state) => {
  state.turn++;
  state.hasPlayedLand = false;
  state.manaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  
  state.log.push(`\n=== TURN ${state.turn} ===`);
  
  // Draw step
  drawCard(state);
  
  // Main phase - play a land if we have one
  const landInHand = state.hand.findIndex(card => card.category === 'land');
  if (landInHand !== -1) {
    playLand(state, landInHand);
  }
  
  // Tap lands for mana
  if (state.battlefield.lands.length > 0) {
    tapLandsForMana(state);
  }
  
  // Simple AI: Try to play creatures if we have mana
  const affordableCreatures = state.hand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => card.category === 'creature' && card.cmc <= state.manaPool.C);
  
  if (affordableCreatures.length > 0) {
    const { card, idx } = affordableCreatures[0];
    state.hand.splice(idx, 1);
    state.battlefield.creatures.push(card);
    state.manaPool.C -= card.cmc;
    state.log.push(`Cast creature: ${card.name} (${card.cmc} mana)`);
  }
  
  return state;
};

// Run a full game simulation
export const runFullGame = (parsedDeck, deckStrategy, numTurns = 10) => {
  const game = initializeGame(parsedDeck, deckStrategy);
  
  // Run specified number of turns
  for (let i = 0; i < numTurns; i++) {
    runTurn(game);
  }
  
  game.log.push(`\n=== GAME END ===`);
  game.log.push(`Battlefield: ${game.battlefield.creatures.length} creatures, ${game.battlefield.lands.length} lands`);
  game.log.push(`Hand: ${game.hand.length} cards`);
  game.log.push(`Library: ${game.library.length} cards remaining`);
  
  return game;
};
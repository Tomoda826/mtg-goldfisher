// Token Generation Engine - Detects and creates tokens from card abilities

/**
 * Check if a card creates tokens
 */
export const createsTokens = (card) => {
  if (!card.oracle_text) return false;
  const text = card.oracle_text.toLowerCase();
  return text.includes('create') && text.includes('token');
};

/**
 * Check if token generation is an ETB effect
 */
export const hasETBTokens = (card) => {
  if (!createsTokens(card)) return false;
  const text = card.oracle_text.toLowerCase();
  return (
    text.includes('when') && text.includes('enters') && text.includes('battlefield') ||
    text.includes('when') && text.includes('enters the battlefield') ||
    text.includes('as') && text.includes('enters')
  );
};

/**
 * Check if token generation is triggered (upkeep, combat, end step, etc.)
 */
export const hasTriggeredTokens = (card) => {
  if (!createsTokens(card)) return false;
  const text = card.oracle_text.toLowerCase();
  return (
    text.includes('at the beginning of') ||
    text.includes('whenever') ||
    text.includes('when you attack') ||
    text.includes('at the beginning') ||
    text.includes('during your')
  );
};

/**
 * Check if token generation is an activated ability
 */
export const hasActivatedTokenAbility = (card) => {
  if (!createsTokens(card)) return false;
  const text = card.oracle_text;
  // Activated abilities have cost: effect format with "create" after the colon
  return text.includes(':') && text.toLowerCase().includes('create') && text.toLowerCase().includes('token');
};

/**
 * Parse token description from oracle text
 * Returns array of token objects
 */
export const parseTokensFromText = (oracleText, cardName = 'Unknown') => {
  if (!oracleText) return [];
  
  const tokens = [];
  const text = oracleText.toLowerCase();
  
  // Common token patterns
  const patterns = [
    // "Create a 1/1 white Spirit creature token with flying"
    /create (?:a |an |)(\d+)\/(\d+) (\w+)(?: and \w+)?(?: (\w+))? creature tokens?(?: with ([^.]+))?/gi,
    
    // "Create X 2/2 black Zombie creature tokens"
    /create ([x\d]+) (\d+)\/(\d+) (\w+)(?: and \w+)?(?: (\w+))? creature tokens?/gi,
    
    // "Create a token that's a copy of"
    /create a token (?:that's a copy|copy) of ([^.]+)/gi,
    
    // "Create a Treasure token" (predefined tokens)
    /create (?:a |an |)(\w+) tokens?/gi,
  ];
  
  // Try each pattern
  for (const pattern of patterns) {
    let match;
    pattern.lastIndex = 0; // Reset regex
    
    while ((match = pattern.exec(text)) !== null) {
      const token = extractTokenFromMatch(match, oracleText, cardName);
      if (token) {
        tokens.push(token);
      }
    }
  }
  
  // If no patterns matched but we know it creates tokens, create a generic token
  if (tokens.length === 0 && text.includes('create') && text.includes('token')) {
    tokens.push(createGenericToken(oracleText, cardName));
  }
  
  return tokens;
};

/**
 * Extract token details from regex match
 */
const extractTokenFromMatch = (match, fullText, cardName) => {
  const matchText = match[0];
  
  // Check for predefined token types
  const predefinedTypes = ['treasure', 'food', 'clue', 'blood', 'shard', 'gold'];
  for (const type of predefinedTypes) {
    if (matchText.includes(type)) {
      return createPredefinedToken(type, cardName);
    }
  }
  
  // Parse custom creature tokens
  let quantity = 1;
  let power = 1;
  let toughness = 1;
  let colors = [];
  let types = [];
  let keywords = [];
  
  // Extract quantity (X or number)
  const quantityMatch = matchText.match(/create ([x\d]+)/i);
  if (quantityMatch) {
    const qStr = quantityMatch[1].toLowerCase();
    quantity = qStr === 'x' ? 'X' : parseInt(qStr) || 1;
  }
  
  // Extract power/toughness
  const statsMatch = matchText.match(/(\d+)\/(\d+)/);
  if (statsMatch) {
    power = parseInt(statsMatch[1]);
    toughness = parseInt(statsMatch[2]);
  }
  
  // Extract colors
  const colorWords = ['white', 'blue', 'black', 'red', 'green', 'colorless'];
  colorWords.forEach(color => {
    if (matchText.includes(color)) {
      colors.push(color);
    }
  });
  
  // Extract creature types
  const commonTypes = [
    'spirit', 'zombie', 'goblin', 'soldier', 'warrior', 'knight', 'wizard',
    'dragon', 'angel', 'demon', 'vampire', 'werewolf', 'elf', 'merfolk',
    'beast', 'elemental', 'horror', 'nightmare', 'insect', 'spider',
    'snake', 'bird', 'cat', 'dog', 'rat', 'squirrel', 'saproling',
    'wraith', 'nazgûl', 'orc', 'human', 'dwarf', 'faerie'
  ];
  
  commonTypes.forEach(type => {
    if (matchText.includes(type)) {
      types.push(type.charAt(0).toUpperCase() + type.slice(1));
    }
  });
  
  // Extract keywords
  const keywordText = matchText.match(/with ([^.]+)/);
  if (keywordText) {
    const keywordStr = keywordText[1];
    const commonKeywords = [
      'flying', 'first strike', 'double strike', 'deathtouch', 'lifelink',
      'vigilance', 'trample', 'haste', 'reach', 'menace', 'hexproof',
      'indestructible', 'defender'
    ];
    
    commonKeywords.forEach(keyword => {
      if (keywordStr.includes(keyword)) {
        keywords.push(keyword);
      }
    });
  }
  
  return {
    name: generateTokenName(colors, power, toughness, types),
    power: power,
    toughness: toughness,
    colors: colors,
    types: types.length > 0 ? types : ['Creature'],
    keywords: keywords,
    quantity: quantity,
    isToken: true,
    summoningSick: true,
    sourceCard: cardName,
    category: 'creature'
  };
};

/**
 * Generate token name from attributes
 */
const generateTokenName = (colors, power, toughness, types) => {
  const colorStr = colors.length > 0 ? colors.map(c => c.charAt(0).toUpperCase() + c.slice(1)).join(' ') : 'Colorless';
  const typeStr = types.length > 0 ? types.join(' ') : 'Creature';
  return `${power}/${toughness} ${colorStr} ${typeStr} Token`;
};

/**
 * Create predefined token types
 */
const createPredefinedToken = (type, sourceCard) => {
  const predefined = {
    treasure: {
      name: 'Treasure Token',
      types: ['Treasure', 'Artifact'],
      colors: ['colorless'],
      keywords: [],
      abilities: 'T, Sacrifice this artifact: Add one mana of any color.',
      isToken: true,
      category: 'artifact',
      quantity: 1,
      sourceCard: sourceCard
    },
    food: {
      name: 'Food Token',
      types: ['Food', 'Artifact'],
      colors: ['colorless'],
      keywords: [],
      abilities: '2, T, Sacrifice this artifact: You gain 3 life.',
      isToken: true,
      category: 'artifact',
      quantity: 1,
      sourceCard: sourceCard
    },
    clue: {
      name: 'Clue Token',
      types: ['Clue', 'Artifact'],
      colors: ['colorless'],
      keywords: [],
      abilities: '2, Sacrifice this artifact: Draw a card.',
      isToken: true,
      category: 'artifact',
      quantity: 1,
      sourceCard: sourceCard
    },
    blood: {
      name: 'Blood Token',
      types: ['Blood', 'Artifact'],
      colors: ['colorless'],
      keywords: [],
      abilities: '1, T, Discard a card, Sacrifice this artifact: Draw a card.',
      isToken: true,
      category: 'artifact',
      quantity: 1,
      sourceCard: sourceCard
    }
  };
  
  return predefined[type.toLowerCase()] || createGenericToken(type, sourceCard);
};

/**
 * Create a generic token when we can't parse specifics
 */
const createGenericToken = (text, sourceCard) => {
  return {
    name: '1/1 Creature Token',
    power: 1,
    toughness: 1,
    colors: ['colorless'],
    types: ['Creature'],
    keywords: [],
    quantity: 1,
    isToken: true,
    summoningSick: true,
    sourceCard: sourceCard,
    category: 'creature',
    note: 'Generic token - check card text for details'
  };
};

/**
 * Get trigger phase for token generation
 */
export const getTokenTriggerPhase = (card) => {
  if (!card.oracle_text) return null;
  
  const text = card.oracle_text.toLowerCase();
  
  if (hasETBTokens(card)) return 'etb';
  if (text.includes('at the beginning of your upkeep')) return 'upkeep';
  if (text.includes('at the beginning of combat')) return 'combat';
  if (text.includes('when you attack') || text.includes('whenever you attack')) return 'combat';
  if (text.includes('at the beginning of your end step')) return 'end';
  if (text.includes('at the beginning of each end step')) return 'end';
  if (text.includes('when you draw') || text.includes('whenever you draw')) return 'draw';
  if (hasActivatedTokenAbility(card)) return 'activated';
  
  return 'other';
};

/**
 * Check if token generation should trigger this phase
 */
export const shouldTriggerTokens = (card, currentPhase) => {
  const triggerPhase = getTokenTriggerPhase(card);
  
  if (triggerPhase === 'etb') return false; // ETB handled separately
  if (triggerPhase === 'activated') return false; // Activated handled separately
  
  return triggerPhase === currentPhase;
};

/**
 * Generate tokens and add them to game state
 */
export const generateTokens = (gameState, sourceCard, triggerType = 'etb') => {
  const tokens = parseTokensFromText(sourceCard.oracle_text, sourceCard.name);
  
  if (tokens.length === 0) return gameState;
  
  const createdTokens = [];
  
  tokens.forEach(tokenTemplate => {
    let quantity = tokenTemplate.quantity;
    
    // Handle X tokens (simplified - use battlefield size or mana spent as X)
    if (quantity === 'X') {
      // Heuristic: X = number of creatures you control or mana spent
      const xValue = Math.max(1, Math.floor(gameState.battlefield.creatures.length / 2));
      quantity = xValue;
    }
    
    // Create the specified number of tokens
    for (let i = 0; i < quantity; i++) {
      const token = { ...tokenTemplate };
      token.id = `token-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to appropriate battlefield zone
      if (token.category === 'creature') {
        gameState.battlefield.creatures.push(token);
        createdTokens.push(token);
      } else if (token.category === 'artifact') {
        gameState.battlefield.artifacts.push(token);
        createdTokens.push(token);
      }
    }
  });
  
// Log token creation
  if (createdTokens.length > 0) {
    const tokenNames = createdTokens.map(t => t.name).join(', ');
    
    // Determine action description based on trigger type
    let actionDesc = 'Create Tokens';
    let detailsPrefix = 'Created';
    
    switch(triggerType) {
      case 'etb':
        actionDesc = 'ETB Token Generation';
        detailsPrefix = 'ETB effect created';
        break;
      case 'upkeep':
        actionDesc = 'Upkeep Token Trigger';
        detailsPrefix = 'Upkeep trigger created';
        break;
      case 'combat':
        actionDesc = 'Combat Token Trigger';
        detailsPrefix = 'Combat trigger created';
        break;
      case 'end':
        actionDesc = 'End Step Token Trigger';
        detailsPrefix = 'End step trigger created';
        break;
      case 'activated':
        actionDesc = 'Activated Token Ability';
        detailsPrefix = 'Activated ability created';
        break;
      default:
        actionDesc = 'Create Tokens';
        detailsPrefix = 'Created';
    }
    
    gameState.detailedLog?.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: actionDesc,
      target: sourceCard.name,
      triggerType: triggerType,  // ✅ Now using the parameter!
      details: `${detailsPrefix} ${createdTokens.length} token(s): ${tokenNames}`,
      success: true,
      tokens: createdTokens.map(t => t.name)
    });
  }
  
  return gameState;
};

/**
 * Check battlefield for token-generating triggers
 */
export const checkTriggeredTokens = (gameState, phase) => {
  const allPermanents = [
    ...gameState.battlefield.creatures,
    ...gameState.battlefield.artifacts,
    ...gameState.battlefield.enchantments,
    ...gameState.battlefield.planeswalkers
  ];
  
  allPermanents.forEach(permanent => {
    if (shouldTriggerTokens(permanent, phase)) {
      generateTokens(gameState, permanent, phase);
    }
  });
  
  return gameState;
};

/**
 * Execute activated token abilities (simplified for goldfishing)
 */
export const executeActivatedTokenAbilities = (gameState) => {
  const allPermanents = [
    ...gameState.battlefield.creatures,
    ...gameState.battlefield.artifacts,
    ...gameState.battlefield.enchantments
  ];
  
  allPermanents.forEach(permanent => {
    if (hasActivatedTokenAbility(permanent)) {
      // In goldfishing, auto-activate beneficial token generation once per turn
      // if we have excess mana
      const totalMana = Object.values(gameState.manaPool).reduce((a, b) => a + b, 0);
      
      // Simple heuristic: if we have 3+ unused mana, activate token abilities
      if (totalMana >= 3) {
        generateTokens(gameState, permanent, 'activated');
        
        // Reduce mana pool (simplified)
        const manaColors = ['C', 'W', 'U', 'B', 'R', 'G'];
        let manaToSpend = 3;
        for (const color of manaColors) {
          if (manaToSpend > 0 && gameState.manaPool[color] > 0) {
            const spent = Math.min(manaToSpend, gameState.manaPool[color]);
            gameState.manaPool[color] -= spent;
            manaToSpend -= spent;
          }
        }
      }
    }
  });
  
  return gameState;
};

/**
 * Get all token-generating cards in deck for analysis
 */
export const analyzeTokenGenerators = (parsedDeck) => {
  const tokenGenerators = {
    etb: [],
    triggered: [],
    activated: [],
    total: 0
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
    if (createsTokens(card)) {
      tokenGenerators.total++;
      
      if (hasETBTokens(card)) {
        tokenGenerators.etb.push(card.name);
      } else if (hasTriggeredTokens(card)) {
        tokenGenerators.triggered.push(card.name);
      } else if (hasActivatedTokenAbility(card)) {
        tokenGenerators.activated.push(card.name);
      }
    }
  });
  
  return tokenGenerators;
};

/**
 * Helper: Count tokens on battlefield
 */
export const countTokens = (gameState) => {
  const creatureTokens = gameState.battlefield.creatures.filter(c => c.isToken).length;
  const artifactTokens = gameState.battlefield.artifacts.filter(a => a.isToken).length;
  return creatureTokens + artifactTokens;
};

/**
 * Helper: Get all tokens on battlefield
 */
export const getAllTokens = (gameState) => {
  return [
    ...gameState.battlefield.creatures.filter(c => c.isToken),
    ...gameState.battlefield.artifacts.filter(a => a.isToken)
  ];
};
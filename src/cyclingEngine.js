// cyclingEngine.js - STANDALONE VERSION
// Landcycling Mechanics - Does not require gameEngine.shuffleLibrary export

/**
 * Shuffle library using Fisher-Yates algorithm
 * Standalone implementation - doesn't require import from gameEngine
 */
const shuffleLibrary = (game) => {
  if (!game.library || game.library.length === 0) return;
  
  // Fisher-Yates shuffle
  for (let i = game.library.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [game.library[i], game.library[j]] = [game.library[j], game.library[i]];
  }
  
  console.log('🔀 [shuffleLibrary] Library shuffled');
};

/**
 * Parse landcycling cost and land type from ability text
 * 
 * CRITICAL PARSING RULE:
 * The ability name (e.g., "Islandcycling {1}") is just shorthand.
 * The ACTUAL activation cost is in the parenthetical rules text:
 * "({1}, Discard this card: Search your library for an Island card...)"
 * 
 * We must extract the cost from the PARENTHESES, not the ability name.
 * 
 * Examples:
 * - "Plainscycling {2} ({2}, Discard...)" → cost: "{2}", landType: "Plains"
 * - "Islandcycling {1} ({1}, Discard...)" → cost: "{1}", landType: "Island"
 * - "Basic landcycling {1}{G} ({1}{G}, Discard...)" → cost: "{1}{G}", landType: "basic"
 */
export const parseLandcyclingAbility = (abilityText) => {
  const text = abilityText.toLowerCase();
  
  // Step 1: Identify the land type from the ability name
  const abilityNameMatch = text.match(/(plains|island|swamp|mountain|forest|basic land)cycling/);
  
  if (!abilityNameMatch) {
    return null;
  }
  
  const landTypeRaw = abilityNameMatch[1];
  
  // Step 2: Extract the ACTUAL cost from the parenthetical rules text
  // Pattern: "({cost}, Discard this card: ...)"
  // The cost can be one or more mana symbols like {1}, {2}{U}, {1}{B}, etc.
  const costMatch = text.match(/\((\{[^}]+(?:\}\{[^}]+)*\})[^)]*discard this card/i);
  
  if (!costMatch) {
    // Fallback: If parentheses aren't found, try the old method (ability name)
    console.warn('[parseLandcyclingAbility] Could not find cost in parentheses, using ability name as fallback');
    const fallbackMatch = text.match(/cycling\s+(\{[^}]+(?:\}\{[^}]+)*\})/);
    if (fallbackMatch) {
      const cost = fallbackMatch[1];
      const landTypeMap = {
        'plains': 'Plains',
        'island': 'Island',
        'swamp': 'Swamp',
        'mountain': 'Mountain',
        'forest': 'Forest',
        'basic land': 'basic'
      };
      return {
        cost,
        landType: landTypeMap[landTypeRaw] || 'basic',
        rawText: abilityText
      };
    }
    return null;
  }
  
  const cost = costMatch[1];
  
  // Map to proper basic land names
  const landTypeMap = {
    'plains': 'Plains',
    'island': 'Island',
    'swamp': 'Swamp',
    'mountain': 'Mountain',
    'forest': 'Forest',
    'basic land': 'basic' // Can fetch any basic land
  };
  
  return {
    cost,
    landType: landTypeMap[landTypeRaw] || 'basic',
    rawText: abilityText
  };
};

/**
 * Detect if a card has landcycling
 */
export const hasLandcycling = (card) => {
  if (!card || !card.oracle_text) return false;
  const text = card.oracle_text.toLowerCase();
  return text.includes('cycling') && (
    text.includes('plainscycling') ||
    text.includes('islandcycling') ||
    text.includes('swampcycling') ||
    text.includes('mountaincycling') ||
    text.includes('forestcycling') ||
    text.includes('basic landcycling')
  );
};

/**
 * Choose which basic land to fetch based on game state and strategy
 */
const chooseBasicLandToFetch = (game, allowedLandType) => {
  console.log(`🔍 [chooseBasicLandToFetch] Analyzing which basic land to fetch (allowed: ${allowedLandType})`);
  
  // If specific land type is required, use it
  if (allowedLandType !== 'basic') {
    console.log(`✅ [chooseBasicLandToFetch] Fetching required type: ${allowedLandType}`);
    return allowedLandType;
  }
  
  // Otherwise, choose based on deck strategy and current needs
  const currentLands = game.battlefield.lands || [];
  const hand = game.hand || [];
  const commander = game.commandZone?.[0];
  const strategy = game.strategy || {};
  
  // Count current mana sources by color
  const colorCounts = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  
  currentLands.forEach(land => {
    if (land.produced_mana) {
      land.produced_mana.forEach(color => {
        if (colorCounts[color] !== undefined) {
          colorCounts[color]++;
        }
      });
    }
  });
  
  // Analyze mana needs from hand
  const neededColors = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  
  [...hand, commander].filter(Boolean).forEach(card => {
    if (card.mana_cost) {
      const colorMatches = card.mana_cost.match(/\{([WUBRG])\}/g) || [];
      colorMatches.forEach(match => {
        const color = match[1];
        if (neededColors[color] !== undefined) {
          neededColors[color]++;
        }
      });
    }
  });
  
  // Calculate which color we need most (highest need, lowest current supply)
  const colorPriority = [];
  const colorToLandName = {
    W: 'Plains',
    U: 'Island',
    B: 'Swamp',
    R: 'Mountain',
    G: 'Forest'
  };
  
  for (const color in neededColors) {
    if (neededColors[color] > 0) {
      const priority = neededColors[color] - colorCounts[color];
      colorPriority.push({
        color,
        landName: colorToLandName[color],
        need: neededColors[color],
        have: colorCounts[color],
        priority
      });
    }
  }
  
  // Sort by priority (highest first)
  colorPriority.sort((a, b) => b.priority - a.priority);
  
  console.log('📊 [chooseBasicLandToFetch] Color analysis:', {
    currentColors: colorCounts,
    neededColors,
    priorities: colorPriority
  });
  
  // Return highest priority land, or default to first commander color
  if (colorPriority.length > 0) {
    const choice = colorPriority[0];
    console.log(`✅ [chooseBasicLandToFetch] Chose ${choice.landName} (need: ${choice.need}, have: ${choice.have})`);
    return choice.landName;
  }
  
  // Fallback: use strategy's primary colors
  if (strategy.colors && strategy.colors.length > 0) {
    const primaryColor = strategy.colors[0];
    const landName = colorToLandName[primaryColor] || 'Island';
    console.log(`✅ [chooseBasicLandToFetch] Using strategy primary color: ${landName}`);
    return landName;
  }
  
  // Ultimate fallback
  console.log('⚠️ [chooseBasicLandToFetch] No color needs detected, defaulting to Island');
  return 'Island';
};

/**
 * Search library for a specific basic land type
 */
const searchLibraryForBasicLand = (game, landType) => {
  console.log(`🔍 [searchLibraryForBasicLand] Searching for: ${landType}`);
  
  if (!game.library || game.library.length === 0) {
    console.log('❌ [searchLibraryForBasicLand] Library is empty');
    return null;
  }
  
  // Search for the land in library
  const landIndex = game.library.findIndex(card => {
    const isBasicLand = card.type_line && card.type_line.includes('Basic Land');
    const matchesType = card.type_line && card.type_line.includes(landType);
    return isBasicLand && matchesType;
  });
  
  if (landIndex === -1) {
    console.log(`❌ [searchLibraryForBasicLand] No ${landType} found in library`);
    return null;
  }
  
  // Remove from library
  const foundLand = game.library.splice(landIndex, 1)[0];
  console.log(`✅ [searchLibraryForBasicLand] Found ${foundLand.name} at index ${landIndex}`);
  
  return foundLand;
};

/**
 * Execute complete Landcycling effect
 * 
 * This function performs all state changes for landcycling:
 * 1. Move cycled card from hand to graveyard
 * 2. Search library for appropriate basic land
 * 3. Add found land to hand
 * 4. Shuffle library
 * 5. Log all actions
 * 
 * @param {Object} game - Game state
 * @param {Object} cycledCard - The card being cycled
 * @param {string} allowedLandType - Type of land that can be fetched (e.g., "Island", "Plains", or "basic")
 * @returns {Object} Updated game state
 */
export const executeLandcycling = (game, cycledCard, allowedLandType) => {
  console.log('🚀 [executeLandcycling] Starting landcycling execution');
  console.log(`   Card: ${cycledCard.name}`);
  console.log(`   Allowed land type: ${allowedLandType}`);
  
  // Step 1: Choose which basic land to fetch
  const landTypeToFetch = chooseBasicLandToFetch(game, allowedLandType);
  console.log(`📋 [executeLandcycling] Decision: Fetch ${landTypeToFetch}`);
  
  // Step 2: Search library for the land
  const foundLand = searchLibraryForBasicLand(game, landTypeToFetch);
  
  if (!foundLand) {
    // If no land found, still cycle the card (it goes to graveyard)
    console.log('⚠️ [executeLandcycling] No matching land found, but cycling still happens');
    
    // Remove from hand
    const handIndex = game.hand.findIndex(c => 
      c.name === cycledCard.name && c.id === cycledCard.id
    );
    
    if (handIndex !== -1) {
      game.hand.splice(handIndex, 1);
      game.graveyard.push(cycledCard);
      console.log(`✅ [executeLandcycling] ${cycledCard.name} moved to graveyard`);
    }
    
    // Still shuffle library
    shuffleLibrary(game);
    
    // Log the failed search
    if (game.detailedLog) {
      game.detailedLog.push({
        phase: game.phase,
        action: '🔄 Landcycling',
        details: `Cycled ${cycledCard.name} (no ${landTypeToFetch} found in library)`,
        reasoning: `Searched for ${landTypeToFetch} but none available`
      });
    }
    
    return game;
  }
  
  // Step 3: Remove cycled card from hand
  const handIndex = game.hand.findIndex(c => 
    c.name === cycledCard.name && c.id === cycledCard.id
  );
  
  if (handIndex === -1) {
    console.log('❌ [executeLandcycling] ERROR: Card not found in hand');
    return game;
  }
  
  game.hand.splice(handIndex, 1);
  console.log(`✅ [executeLandcycling] Removed ${cycledCard.name} from hand`);
  
  // Step 4: Put cycled card in graveyard
  game.graveyard.push(cycledCard);
  console.log(`✅ [executeLandcycling] ${cycledCard.name} moved to graveyard`);
  
  // Step 5: Put found land in hand
  game.hand.push(foundLand);
  console.log(`✅ [executeLandcycling] ${foundLand.name} added to hand`);
  
  // Step 6: Shuffle library
  shuffleLibrary(game);
  console.log('✅ [executeLandcycling] Library shuffled');
  
  // Step 7: Log the complete action
  if (game.detailedLog) {
    game.detailedLog.push({
      phase: game.phase,
      action: '🔄 Landcycling',
      details: `Cycled ${cycledCard.name} → Fetched ${foundLand.name} to hand`,
      reasoning: `Need ${landTypeToFetch} for color fixing`
    });
  }
  
  console.log('🎉 [executeLandcycling] Landcycling complete!');
  console.log(`   Hand size: ${game.hand.length}`);
  console.log(`   Graveyard size: ${game.graveyard.length}`);
  console.log(`   Library size: ${game.library.length}`);
  
  return game;
};

/**
 * Get all landcycling abilities from cards in hand
 * Used by AI to evaluate available landcycling options
 */
export const getAvailableLandcyclingAbilities = (hand) => {
  return hand
    .filter(card => hasLandcycling(card))
    .map(card => {
      const ability = parseLandcyclingAbility(card.oracle_text);
      return {
        card,
        ...ability
      };
    })
    .filter(item => item.cost); // Filter out any that failed to parse
};

/**
 * Check if landcycling is a good play right now
 * Used by AI to decide when to cycle
 */
export const shouldLandcycle = (game, cyclingOption) => {
  const { cost } = cyclingOption;
  
  // Parse the mana cost
  const genericMatch = cost.match(/\{(\d+)\}/);
  const genericCost = genericMatch ? parseInt(genericMatch[1]) : 0;
  
  const colorMatch = cost.match(/\{([WUBRG])\}/g) || [];
  const colorCost = {};
  colorMatch.forEach(match => {
    const color = match[1];
    colorCost[color] = (colorCost[color] || 0) + 1;
  });
  
  // Check if we can afford it
  const totalMana = Object.values(game.manaPool).reduce((a, b) => a + b, 0);
  if (totalMana < genericCost + Object.keys(colorCost).length) {
    return false; // Can't afford
  }
  
  // Check colored mana requirements
  for (const color in colorCost) {
    if ((game.manaPool[color] || 0) < colorCost[color]) {
      return false; // Missing colored mana
    }
  }
  
  // Good to cycle if:
  // 1. We need lands (fewer than 4 lands on battlefield)
  // 2. The card is not immediately useful
  // 3. It's early game (turn < 6)
  
  const landCount = (game.battlefield.lands || []).length;
  const isEarlyGame = game.turn < 6;
  
  if (landCount < 4 && isEarlyGame) {
    return true; // Definitely cycle for land
  }
  
  // Also consider cycling if we need color fixing
  const currentLands = game.battlefield.lands || [];
  const neededColors = new Set();
  
  // Check what colors we need from hand
  game.hand.forEach(handCard => {
    if (handCard.mana_cost) {
      const colors = handCard.mana_cost.match(/\{([WUBRG])\}/g) || [];
      colors.forEach(c => neededColors.add(c[1]));
    }
  });
  
  // Check if we can produce those colors
  const availableColors = new Set();
  currentLands.forEach(land => {
    if (land.produced_mana) {
      land.produced_mana.forEach(color => availableColors.add(color));
    }
  });
  
  // If we're missing colors we need, cycling is good
  for (const color of neededColors) {
    if (!availableColors.has(color)) {
      return true; // Need color fixing
    }
  }
  
  return false; // Don't cycle otherwise
};
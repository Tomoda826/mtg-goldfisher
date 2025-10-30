// Dynamic Card Behavior Analysis - Pattern-based card identification
// Analyzes oracle text to determine card behaviors without hardcoding names

/**
 * Comprehensive card behavior analysis
 * Analyzes oracle_text patterns to identify all card behaviors
 */
export const analyzeCardBehavior = (card) => {
  const text = (card.oracle_text || '').toLowerCase();
  const name = card.name.toLowerCase();
  
  const behavior = {
    cardName: card.name,
    category: card.category,
    
    // Mana production
    manaProduction: analyzeManaProduction(text, name, card.category),
    
    // Fetch/Tutor abilities
    fetchAbility: analyzeFetchAbility(text),
    
    // Token generation
    tokenGeneration: analyzeTokenGeneration(text),
    
    // Scry/filtering
    scryAbility: analyzeScryAbility(text),
    
    // Card draw
    cardDraw: analyzeCardDraw(text),
    
    // Recursion (graveyard/exile)
    recursion: analyzeRecursion(text),
    
    // Sacrifice outlets
    sacrificeOutlet: analyzeSacrificeOutlet(text),
    
    // ETB effects
    etbEffect: analyzeETBEffect(text),
    
    // Triggered abilities
    triggeredAbilities: analyzeTriggeredAbilities(text),
    
    // Activated abilities
    activatedAbilities: analyzeActivatedAbilities(text)
  };
  
  return behavior;
};

/**
 * Analyze mana production from oracle text
 */
const analyzeManaProduction = (text, name, category) => {
  if (category !== 'land' && category !== 'artifact' && category !== 'creature') {
    return { produces: false };
  }
  
const production = {
  produces: false,
  colors: [],
  amount: 0,
  anyColor: false,
  conditional: false,
  requiresTap: false,
  requiresSacrifice: false,
  isFilterLand: false  // ✅ NEW FLAG
};
  
  // Check if it's a fetch land (sacrifices for lands, doesn't produce mana)
  if (text.includes('sacrifice') && text.includes('search your library')) {
    return { produces: false, isFetchLand: true };
  }

  // ✅ NEW: Check for filter land pattern
const filterLandPattern = /\{t\}:\s*add\s*\{c\}.*\{[wubrgc]\/[wubrgc]\},\s*\{t\}:\s*add/i;

if (filterLandPattern.test(text)) {
  production.produces = true;
  production.isFilterLand = true;
  production.amount = 1;  // ✅ Filter lands produce 1 mana total
  
  // Parse which colors the filter land can produce
  const colorPairs = [];
  
  if (text.includes('{u}{u}')) colorPairs.push('U');
  if (text.includes('{b}{b}')) colorPairs.push('B');
  if (text.includes('{w}{w}')) colorPairs.push('W');
  if (text.includes('{r}{r}')) colorPairs.push('R');
  if (text.includes('{g}{g}')) colorPairs.push('G');
  
  // Filter lands can produce both colors in their pair plus colorless
  production.colors = [...new Set([...colorPairs, 'C'])];
  
  return production;
}
  
  // Check for mana production patterns
  const addManaPattern = /add\s+(\{[wubrgc]\}|\{[wubrgc]\}\{[wubrgc]\}|one mana|two mana|three mana)/g;
  const addMatches = text.match(addManaPattern);
  
  if (!addMatches) {
    // Check for basic land types
    if (category === 'land') {
      if (name.includes('plains') || text.includes('plains')) {
        production.produces = true;
        production.colors = ['W'];
        production.amount = 1;
        return production;
      }
      if (name.includes('island') || text.includes('island')) {
        production.produces = true;
        production.colors = ['U'];
        production.amount = 1;
        return production;
      }
      if (name.includes('swamp') || text.includes('swamp')) {
        production.produces = true;
        production.colors = ['B'];
        production.amount = 1;
        return production;
      }
      if (name.includes('mountain') || text.includes('mountain')) {
        production.produces = true;
        production.colors = ['R'];
        production.amount = 1;
        return production;
      }
      if (name.includes('forest') || text.includes('forest')) {
        production.produces = true;
        production.colors = ['G'];
        production.amount = 1;
        return production;
      }
    }
    
    return production;
  }
  
  production.produces = true;
  
  // Check if tapping is required
  if (text.includes('{t}:') || text.includes('tap:')) {
    production.requiresTap = true;
  }
  
  // Check if sacrifice is required
  if (text.includes('sacrifice') && text.includes('add')) {
    production.requiresSacrifice = true;
  }
  
  
// Parse numeric amounts FIRST (e.g., "add {C}{C}" or "add {C}{C}{C}")
  const tripleColorless = text.match(/\{c\}\{c\}\{c\}/gi);
  if (tripleColorless) {
    production.amount = 3;
    production.colors = ['C'];
    return production;
  }
  
  const doubleColorless = text.match(/\{c\}\{c\}/gi);
  if (doubleColorless) {
    production.amount = 2;
    production.colors = ['C'];
    return production;
  }

// Parse mana symbols
const manaSymbols = text.match(/\{[wubrgc]\}/gi) || [];
const uniqueColors = new Set();

manaSymbols.forEach(symbol => {
  const color = symbol.slice(1, -1).toUpperCase();
  if (['W', 'U', 'B', 'R', 'G', 'C'].includes(color)) {
    uniqueColors.add(color);
  }
});

production.colors = Array.from(uniqueColors);
production.amount = 1;  // Default: single mana per tap
  
  // Check for "any color" text
  if (text.includes('any color') || text.includes('mana of any')) {
    production.anyColor = true;
    production.amount = 1;
  }
  
  // Check for conditional mana (only usable for certain things)
  if (text.includes('spend this mana only') || text.includes('can be spent only')) {
    production.conditional = true;
  }
  
  return production;
};

/**
 * Analyze fetch/tutor abilities
 */
const analyzeFetchAbility = (text) => {
  const ability = {
    hasFetch: false,
    requiresSacrifice: false,
    searchesFor: [],
    putsIntoPlay: false,
    putsInHand: false,
    count: 1
  };
  
  if (!text.includes('search your library')) {
    return ability;
  }
  
  ability.hasFetch = true;
  
  // Check if it requires sacrifice
  if (text.includes('sacrifice') && text.includes('search')) {
    ability.requiresSacrifice = true;
  }
  
  // Determine what it searches for
  if (text.includes('basic land')) {
    ability.searchesFor.push('basic land');
  }
  if (text.includes('land card')) {
    ability.searchesFor.push('land');
  }
  if (text.includes('creature')) {
    ability.searchesFor.push('creature');
  }
  if (text.includes('instant')) {
    ability.searchesFor.push('instant');
  }
  if (text.includes('sorcery')) {
    ability.searchesFor.push('sorcery');
  }
  if (text.includes('artifact')) {
    ability.searchesFor.push('artifact');
  }
  if (text.includes('enchantment')) {
    ability.searchesFor.push('enchantment');
  }
  
  // Check where it puts the card
  if (text.includes('put') && (text.includes('onto the battlefield') || text.includes('into play'))) {
    ability.putsIntoPlay = true;
  }
  if (text.includes('put') && text.includes('into your hand')) {
    ability.putsInHand = true;
  }
  
  // Parse count (up to X cards)
  const countMatch = text.match(/up to (\w+) (card|land)/);
  if (countMatch) {
    const countWord = countMatch[1];
    const countMap = { 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5 };
    ability.count = countMap[countWord] || 1;
  }
  
  return ability;
};

/**
 * Analyze token generation
 */
const analyzeTokenGeneration = (text) => {
  const ability = {
    createsTokens: false,
    trigger: 'none', // 'etb', 'triggered', 'activated', 'spell'
    tokenTypes: [],
    count: 0
  };
  
  if (!text.includes('create') && !text.includes('token')) {
    return ability;
  }
  
  ability.createsTokens = true;
  
  // Determine trigger type
  if (text.includes('when') && text.includes('enters') || text.includes('as') && text.includes('enters')) {
    ability.trigger = 'etb';
  } else if (text.includes('whenever') || text.includes('at the beginning')) {
    ability.trigger = 'triggered';
  } else if (text.includes(':') && text.includes('create')) {
    ability.trigger = 'activated';
  } else {
    ability.trigger = 'spell';
  }
  
  // Parse token count
  const countMatch = text.match(/create (\w+) |creates? (\d+)/);
  if (countMatch) {
    const countWord = countMatch[1] || countMatch[2];
    const countMap = { 'a': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'x': -1 };
    ability.count = countMap[countWord] || parseInt(countWord) || 1;
  }
  
  // Parse token types
  if (text.includes('treasure')) ability.tokenTypes.push('Treasure');
  if (text.includes('food')) ability.tokenTypes.push('Food');
  if (text.includes('clue')) ability.tokenTypes.push('Clue');
  if (text.includes('blood')) ability.tokenTypes.push('Blood');
  if (text.includes('wraith')) ability.tokenTypes.push('Wraith');
  if (text.includes('zombie')) ability.tokenTypes.push('Zombie');
  if (text.includes('soldier')) ability.tokenTypes.push('Soldier');
  if (text.includes('goblin')) ability.tokenTypes.push('Goblin');
  
  return ability;
};

/**
 * Analyze scry abilities
 */
const analyzeScryAbility = (text) => {
  const ability = {
    hasScry: false,
    amount: 0,
    trigger: 'none' // 'etb', 'triggered', 'spell', 'activated'
  };
  
  if (!text.includes('scry')) {
    return ability;
  }
  
  ability.hasScry = true;
  
  // Parse scry amount
  const scryMatch = text.match(/scry (\d+|x)/);
  if (scryMatch) {
    ability.amount = scryMatch[1] === 'x' ? -1 : parseInt(scryMatch[1]);
  }
  
  // Determine when it happens
  if (text.includes('when') && text.includes('enters')) {
    ability.trigger = 'etb';
  } else if (text.includes('whenever')) {
    ability.trigger = 'triggered';
  } else if (text.includes(':') && text.includes('scry')) {
    ability.trigger = 'activated';
  } else {
    ability.trigger = 'spell';
  }
  
  return ability;
};

/**
 * Analyze card draw
 */
const analyzeCardDraw = (text) => {
  const ability = {
    drawsCards: false,
    amount: 0,
    trigger: 'none'
  };
  
  if (!text.includes('draw')) {
    return ability;
  }
  
  ability.drawsCards = true;
  
  // Parse draw amount
  const drawMatch = text.match(/draw (\w+|a) card/);
  if (drawMatch) {
    const amountWord = drawMatch[1];
    const countMap = { 'a': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4 };
    ability.amount = countMap[amountWord] || parseInt(amountWord) || 1;
  }
  
  // Determine trigger
  if (text.includes('when') && text.includes('enters')) {
    ability.trigger = 'etb';
  } else if (text.includes('whenever')) {
    ability.trigger = 'triggered';
  } else if (text.includes(':') && text.includes('draw')) {
    ability.trigger = 'activated';
  } else {
    ability.trigger = 'spell';
  }
  
  return ability;
};

/**
 * Analyze recursion (return from graveyard/exile)
 */
const analyzeRecursion = (text) => {
  const ability = {
    hasRecursion: false,
    from: [], // 'graveyard', 'exile'
    to: '', // 'hand', 'battlefield', 'library'
    what: [] // 'creature', 'instant', 'sorcery', etc.
  };
  
  if (text.includes('return') && (text.includes('graveyard') || text.includes('exile'))) {
    ability.hasRecursion = true;
    
    if (text.includes('from your graveyard')) ability.from.push('graveyard');
    if (text.includes('from exile')) ability.from.push('exile');
    
    if (text.includes('to your hand')) ability.to = 'hand';
    if (text.includes('to the battlefield') || text.includes('onto the battlefield')) ability.to = 'battlefield';
    if (text.includes('to your library')) ability.to = 'library';
    
    if (text.includes('creature')) ability.what.push('creature');
    if (text.includes('instant')) ability.what.push('instant');
    if (text.includes('sorcery')) ability.what.push('sorcery');
    if (text.includes('permanent')) ability.what.push('permanent');
  }
  
  return ability;
};

/**
 * Analyze sacrifice outlets
 */
const analyzeSacrificeOutlet = (text) => {
  const ability = {
    isSacrificeOutlet: false,
    what: [], // What can be sacrificed
    benefit: '' // What you get
  };
  
  if (text.includes('sacrifice') && text.includes(':')) {
    ability.isSacrificeOutlet = true;
    
    if (text.includes('sacrifice a creature')) ability.what.push('creature');
    if (text.includes('sacrifice an artifact')) ability.what.push('artifact');
    if (text.includes('sacrifice an enchantment')) ability.what.push('enchantment');
    if (text.includes('sacrifice a permanent')) ability.what.push('permanent');
    
    if (text.includes('draw')) ability.benefit = 'draw';
    if (text.includes('damage')) ability.benefit = 'damage';
    if (text.includes('gain') && text.includes('life')) ability.benefit = 'life';
    if (text.includes('mana')) ability.benefit = 'mana';
  }
  
  return ability;
};

/**
 * Analyze ETB effects
 */
const analyzeETBEffect = (text) => {
  return {
    hasETB: (text.includes('when') || text.includes('as')) && 
            (text.includes('enters the battlefield') || text.includes('enters'))
  };
};

/**
 * Analyze triggered abilities
 */
const analyzeTriggeredAbilities = (text) => {
  const triggers = [];
  
  if (text.includes('whenever you cast')) {
    triggers.push({
      type: 'cast_trigger',
      condition: text.match(/whenever you cast (a |an |)(\w+)/)?.[2] || 'spell'
    });
  }
  
  if (text.includes('at the beginning of')) {
    const phaseMatch = text.match(/at the beginning of (?:your |each |the |)(\w+)/);
    triggers.push({
      type: 'phase_trigger',
      phase: phaseMatch?.[1] || 'unknown'
    });
  }
  
  if (text.includes('whenever') && text.includes('attacks')) {
    triggers.push({
      type: 'attack_trigger'
    });
  }
  
  if (text.includes('whenever') && text.includes('dies')) {
    triggers.push({
      type: 'death_trigger'
    });
  }
  
  return triggers;
};

/**
 * Analyze activated abilities
 */
const analyzeActivatedAbilities = (text) => {
  const abilities = [];
  
  // Look for {T}: pattern
  if (text.includes('{t}:')) {
    const tapAbility = text.match(/\{t\}:\s*([^.]+)/);
    if (tapAbility) {
      abilities.push({
        type: 'tap',
        effect: tapAbility[1].substring(0, 50)
      });
    }
  }
  
  // Look for cost: effect pattern
  const activatedPattern = /\{[^}]+\}:\s*([^.]+)/g;
  const matches = text.matchAll(activatedPattern);
  for (const match of matches) {
    if (!match[0].includes('{t}')) { // Don't duplicate tap abilities
      abilities.push({
        type: 'activated',
        effect: match[1].substring(0, 50)
      });
    }
  }
  
  return abilities;
};

/**
 * Analyze entire deck and create behavior manifest
 */
export const createDeckBehaviorManifest = (parsedDeck) => {
  const manifest = {
    manaAbilities: new Map(),
    manaProducers: [],
    fetchLands: [],
    tutors: [],
    tokenGenerators: [],
    scryEffects: [],
    cardDraw: [],
    recursion: [],
    sacrificeOutlets: [],
    etbEffects: [],
    triggeredAbilities: [],
    summary: {
      totalManaProducers: 0,
      totalFetchLands: 0,
      totalTokenGenerators: 0,
      totalCardDraw: 0
    }
  };
  
  const allCards = [
    ...parsedDeck.commanders,
    ...parsedDeck.creatures,
    ...parsedDeck.instants,
    ...parsedDeck.sorceries,
    ...parsedDeck.artifacts,
    ...parsedDeck.enchantments,
    ...parsedDeck.planeswalkers,
    ...parsedDeck.lands
  ];
  
  allCards.forEach(card => {
      // ✅ NEW: Parse and cache mana abilities
  const manaAbilityData = parseManaAbility(card);
  if (manaAbilityData.hasManaAbility) {
    manifest.manaAbilities.set(card.name, manaAbilityData);
  }
    const behavior = analyzeCardBehavior(card);
    
    if (behavior.manaProduction.produces) {
      manifest.manaProducers.push({
        name: card.name,
        ...behavior.manaProduction
      });
      manifest.summary.totalManaProducers++;
    }
    
    if (behavior.manaProduction.isFetchLand || 
        (behavior.fetchAbility.hasFetch && behavior.fetchAbility.requiresSacrifice)) {
      manifest.fetchLands.push({
        name: card.name,
        ...behavior.fetchAbility
      });
      manifest.summary.totalFetchLands++;
    }
    
    if (behavior.tokenGeneration.createsTokens) {
      manifest.tokenGenerators.push({
        name: card.name,
        ...behavior.tokenGeneration
      });
      manifest.summary.totalTokenGenerators++;
    }
    
    if (behavior.scryAbility.hasScry) {
      manifest.scryEffects.push({
        name: card.name,
        ...behavior.scryAbility
      });
    }
    
    if (behavior.cardDraw.drawsCards) {
      manifest.cardDraw.push({
        name: card.name,
        ...behavior.cardDraw
      });
      manifest.summary.totalCardDraw++;
    }
    
    if (behavior.recursion.hasRecursion) {
      manifest.recursion.push({
        name: card.name,
        ...behavior.recursion
      });
    }
    
    if (behavior.sacrificeOutlet.isSacrificeOutlet) {
      manifest.sacrificeOutlets.push({
        name: card.name,
        ...behavior.sacrificeOutlet
      });
    }
    
    if (behavior.etbEffect.hasETB) {
      manifest.etbEffects.push(card.name);
    }
    
    if (behavior.triggeredAbilities.length > 0) {
      manifest.triggeredAbilities.push({
        name: card.name,
        triggers: behavior.triggeredAbilities
      });
    }
  });
  
  return manifest;
};

/**
 * Get mana production for a land OR artifact card using behavior analysis
 * Handles dual lands, filter lands, AND artifacts with multiple mana abilities
 */
export const getManaProductionFromManifest = (card, manifest) => {
  const producer = manifest.manaProducers.find(p => p.name === card.name);
  
  if (!producer) {
    return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  }
  
  const manaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  
  // If it produces any color, default to colorless for goldfishing
  if (producer.anyColor) {
    manaPool.C = producer.amount;
    manaPool.actualManaProduced = producer.amount;  // ✅ FIX: Always set actualManaProduced
    return manaPool;
  }
  
  // ✅ FIX: Add mana for each color (each available, but produces 1 total)
  producer.colors.forEach(color => {
    if (['W', 'U', 'B', 'R', 'G', 'C'].includes(color)) {
      manaPool[color] = 1;  // Each color available
    }
  });
  
  // ✅ CRITICAL FIX: Preserve filter land flag from analyzer
  if (producer.isFilterLand) {
    manaPool.isFilterLand = true;
    manaPool.actualManaProduced = 1;
  }
  // ✅ FIX: Flag dual/multi-color producers (lands AND artifacts)
  // Examples: Watery Grave (land), Talisman of Dominance (artifact)
  // Both have multiple mana abilities but can only tap once = 1 mana total
  else if (producer.colors.length > 1) {
    manaPool.isDualLand = true;  // Name is historical, but applies to artifacts too
    manaPool.actualManaProduced = 1;
  }
  // ✅ FIX: Single-color producers (basic lands, Sol Ring, etc.)
  else if (producer.colors.length === 1) {
    manaPool.actualManaProduced = producer.amount || 1;
  }
  
  return manaPool;
};

/**
 * COMPREHENSIVE MANA ABILITY PARSER
 * Parse a card's oracle text to extract structured mana ability data
 */
const parseManaAbility = (card) => {
  const text = card.oracle_text;
  if (!text) return { hasManaAbility: false, abilities: [] };
  
  // Skip if it targets (not a mana ability per Magic rules)
  if (text.toLowerCase().includes('target')) {
    return { hasManaAbility: false, abilities: [] };
  }
  
  // Skip planeswalker loyalty abilities
  if (card.type_line?.includes('Planeswalker')) {
    return { hasManaAbility: false, abilities: [] };
  }
  
  // Skip fetch lands (they don't produce mana)
  if (text.toLowerCase().includes('sacrifice') && 
      text.toLowerCase().includes('search your library')) {
    return { hasManaAbility: false, abilities: [] };
  }
  
  const abilities = [];
  
  // Split by lines and look for mana-producing abilities
  // Handle both actual newlines and escaped newline strings
  const lines = text.split(/\\n|\n/);
  
  for (const line of lines) {
    if (!line.includes(':')) continue;
    if (!line.toLowerCase().includes('add')) continue;
    
    // Split on first colon
    const colonIndex = line.indexOf(':');
    const costPart = line.substring(0, colonIndex).trim();
    const effectPart = line.substring(colonIndex + 1).trim();
    
    // Try to parse this as a mana ability
    const parsed = parseSingleManaAbility(costPart, effectPart, line);
    
    if (parsed) {
      abilities.push(parsed);
    }
  }
  
  // Handle implicit basic land abilities (no text, just type line)
  if (abilities.length === 0 && card.category === 'land') {
    const implicitAbility = parseImplicitBasicLand(card);
    if (implicitAbility) {
      abilities.push(implicitAbility);
    }
  }
  
  return {
    hasManaAbility: abilities.length > 0,
    abilities: abilities
  };
};

/**
 * Parse a single mana ability line
 */
const parseSingleManaAbility = (costPart, effectPart, fullLine) => {
  const lowerEffect = effectPart.toLowerCase();
  
  // Must contain "add" to be a mana ability
  if (!lowerEffect.includes('add')) return null;
  
  let production = null;
  
  // Try parsing rules in priority order
  
  // Rule 6: Modal/Filter (must check first)
  production = parseModalAbility(fullLine);
  if (production) {
    return {
      abilityText: fullLine,
      isManaAbility: true,
      isModal: true,
      activationCost: parseCost(costPart),
      produces: production
    };
  }
  
  // Rule 5: Variable amount (X)
  production = parseVariableAmount(effectPart);
  if (production) {
    return {
      abilityText: fullLine,
      isManaAbility: true,
      activationCost: parseCost(costPart),
      produces: [production]
    };
  }
  
  // Rule 3: Fixed amount, choice of color
  production = parseFixedAmountChoice(effectPart);
  if (production) {
    return {
      abilityText: fullLine,
      isManaAbility: true,
      activationCost: parseCost(costPart),
      produces: [production]
    };
  }
  
  // Rule 2: Choice of one
  production = parseChoiceOfOne(effectPart);
  if (production) {
    return {
      abilityText: fullLine,
      isManaAbility: true,
      activationCost: parseCost(costPart),
      produces: [production]
    };
  }
  
  // Rule 1: Simple fixed mana
  production = parseSimpleFixedMana(effectPart);
  if (production) {
    return {
      abilityText: fullLine,
      isManaAbility: true,
      activationCost: parseCost(costPart),
      produces: [production]
    };
  }
  
  return null;
};

/**
 * Rule 1: Simple Fixed Mana
 * Pattern: "Add {C}{C}" or "Add {G}"
 */
const parseSimpleFixedMana = (text) => {
  const pattern = /add\s+(\{[wubrgc]\}(?:\{[wubrgc]\})*)/i;
  const match = text.match(pattern);
  
  if (!match) return null;
  
  const symbols = match[1].match(/\{([wubrgc])\}/gi);
  if (!symbols) return null;
  
  const types = symbols.map(s => s.replace(/[{}]/g, '').toUpperCase());
  
  return {
    quantity: types.length,
    types: types
  };
};

/**
 * Rule 2: Choice of One Mana
 * Pattern: "Add {G} or {W}" or "one mana of any color"
 */
const parseChoiceOfOne = (text) => {
  const lowerText = text.toLowerCase();
  
  // Pattern: "{G} or {W}"
  const orPattern = /add\s+\{([wubrgc])\}\s+or\s+\{([wubrgc])\}/i;
  const orMatch = text.match(orPattern);
  
  if (orMatch) {
    return {
      quantity: 1,
      types: [{
        choice: [orMatch[1].toUpperCase(), orMatch[2].toUpperCase()]
      }]
    };
  }
  
  // Pattern: "one mana of any color"
  if (lowerText.includes('one mana of any color')) {
    // Check for commander identity restriction
    const hasCommanderRestriction = lowerText.includes('commander');
    
    return {
      quantity: 1,
      types: [{
        choice: ['W', 'U', 'B', 'R', 'G'],
        restriction: hasCommanderRestriction ? 'commander_identity' : null
      }]
    };
  }
  
  // Pattern: "mana of any color" (without "one", defaults to 1)
  if (lowerText.includes('mana of any') && !lowerText.includes('two') && !lowerText.includes('three')) {
    return {
      quantity: 1,
      types: [{
        choice: ['W', 'U', 'B', 'R', 'G']
      }]
    };
  }
  
  return null;
};

/**
 * Rule 3: Fixed Amount, Choice of Color
 * Pattern: "Add two mana of any one color"
 */
const parseFixedAmountChoice = (text) => {
  const lowerText = text.toLowerCase();
  
  const numberWords = {
    'two': 2,
    'three': 3,
    'four': 4,
    'five': 5
  };
  
  const pattern = /(two|three|four|five)\s+mana\s+of\s+any\s+one\s+color/i;
  const match = lowerText.match(pattern);
  
  if (!match) return null;
  
  const numberWord = match[1].toLowerCase();
  const quantity = numberWords[numberWord];
  
  if (!quantity) return null;
  
  return {
    quantity: quantity,
    types: [{
      choice: ['W', 'U', 'B', 'R', 'G'],
      fixedQuantity: quantity
    }]
  };
};

/**
 * Rule 5: Variable Amount (X)
 * Pattern: "Add X mana" where X is defined by a condition
 */
const parseVariableAmount = (text) => {
  const lowerText = text.toLowerCase();
  
  if (!lowerText.includes('x mana') && !lowerText.includes('amount of mana equal to')) {
    return null;
  }
  
  let xRule = 'X=1'; // Default
  
  // Parse X definitions
  if (lowerText.includes('number of creatures with defender')) {
    xRule = 'X=count(defenders)';
  } else if (lowerText.includes('greatest power among creatures')) {
    xRule = 'X=max_power(creatures)';
  } else if (lowerText.includes('power') && (lowerText.includes('this creature') || lowerText.includes('its power'))) {
    xRule = 'X=power(this)';
  } else if (lowerText.includes('mana value') && lowerText.includes('sacrificed')) {
    xRule = 'X=sacrificedMV(creature)';
  } else if (lowerText.includes('number of artifacts')) {
    xRule = 'X=count(artifacts)';
  } else if (lowerText.includes('number of creatures')) {
    xRule = 'X=count(creatures)';
  }
  
  // Parse color restriction
  let types;
  
  if (lowerText.includes('any one color')) {
    types = [{
      choice: ['W', 'U', 'B', 'R', 'G'],
      total: 'X'
    }];
  } else if (lowerText.includes('any combination')) {
    types = [{
      combination: ['W', 'U', 'B', 'R', 'G'],
      total: 'X'
    }];
  } else {
    // Specific color
    const colorMatch = text.match(/\{([wubrgc])\}/i);
    if (colorMatch) {
      const color = colorMatch[1].toUpperCase();
      types = [color];
    } else {
      types = ['C']; // Default to colorless
    }
  }
  
  return {
    quantity: xRule,
    types: types
  };
};

/**
 * Rule 6: Modal/Filter Abilities
 * Pattern: Multiple "Add" clauses in one ability
 */
const parseModalAbility = (text) => {
  // Count "add" occurrences
  
  // Count "add" occurrences
  const addMatches = text.match(/add\s+[^.,;]+/gi);
  
  if (!addMatches || addMatches.length <= 1) {
    return null;
  }
  
  const productions = [];
  
  addMatches.forEach(addClause => {
    // Try each parsing rule (choice patterns must be checked before simple patterns)
    let prod = parseChoiceOfOne(addClause);  // ✅ Try choice first (e.g., "{U} or {B}")
    if (!prod) prod = parseFixedAmountChoice(addClause);
    if (!prod) prod = parseSimpleFixedMana(addClause);  // Try simple last
    
    if (prod) {
      productions.push(prod);
    }
  });
  
  return productions.length > 1 ? productions : null;
};

/**
 * Parse implicit basic land abilities
 */
const parseImplicitBasicLand = (card) => {
  const typeLine = (card.type_line || '').toLowerCase();
  const name = card.name.toLowerCase();
  
  const colorMap = {
    'plains': 'W',
    'island': 'U',
    'swamp': 'B',
    'mountain': 'R',
    'forest': 'G'
  };
  
  for (const [landType, color] of Object.entries(colorMap)) {
    if (typeLine.includes(landType) || name.includes(landType)) {
      return {
        abilityText: `{T}: Add {${color}}`,
        isManaAbility: true,
        isImplicit: true,
        activationCost: ['{T}'],
        produces: [{
          quantity: 1,
          types: [color]
        }]
      };
    }
  }
  
  return null;
};

/**
 * Parse activation cost
 */
const parseCost = (costText) => {
  const costs = [];
  const lowerCost = costText.toLowerCase();
  
  if (lowerCost.includes('{t}')) {
    costs.push('{T}');
  }
  
  if (lowerCost.includes('sacrifice')) {
    costs.push('sacrifice');
  }
  
  if (lowerCost.includes('pay') && lowerCost.includes('life')) {
    const lifeMatch = costText.match(/pay (\d+) life/i);
    if (lifeMatch) {
      costs.push(`pay_life:${lifeMatch[1]}`);
    }
  }
  
  // Extract mana symbols
  const manaPattern = /\{([wubrgc0-9/]+)\}/gi;
  let match;
  while ((match = manaPattern.exec(costText)) !== null) {
    costs.push(`{${match[1].toUpperCase()}}`);
  }
  
  return costs;
};

export {
  parseManaAbility,
  parseSimpleFixedMana,
  parseChoiceOfOne,
  parseFixedAmountChoice,
  parseVariableAmount,
  parseModalAbility
};

/**
 * Check if a land is a fetch land using manifest
 */
export const isFetchLandFromManifest = (land, manifest) => {
  return manifest.fetchLands.some(f => f.name === land.name);
};
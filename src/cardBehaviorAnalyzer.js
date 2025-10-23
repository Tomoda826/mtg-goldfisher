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
production.amount = 1;  // ✅ FIX: Lands produce 1 mana per tap (choose from colors)
  
  // Check for "any color" text
  if (text.includes('any color') || text.includes('mana of any')) {
    production.anyColor = true;
    production.amount = 1;
  }
  
  // Check for conditional mana (only usable for certain things)
  if (text.includes('spend this mana only') || text.includes('can be spent only')) {
    production.conditional = true;
  }
  
  // Parse numeric amounts (e.g., "add {C}{C}")
  const doubleColorless = text.match(/\{c\}\{c\}/gi);
  if (doubleColorless) {
    production.amount = 2;
    production.colors = ['C'];
  }
  
  const tripleColorless = text.match(/\{c\}\{c\}\{c\}/gi);
  if (tripleColorless) {
    production.amount = 3;
    production.colors = ['C'];
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
  
  return manaPool;
};

/**
 * Check if a land is a fetch land using manifest
 */
export const isFetchLandFromManifest = (land, manifest) => {
  return manifest.fetchLands.some(f => f.name === land.name);
};
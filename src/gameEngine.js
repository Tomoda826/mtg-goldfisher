// Advanced Game Engine - Strategic AI for Commander Goldfishing

// ========== MANA PARSING & MANAGEMENT ==========

import {
  getManaProductionFromManifest,
} from './cardBehaviorAnalyzer';

// Parse mana cost string like "{2}{U}{B}" into object
export const parseMana = (manaCost) => {
  if (!manaCost) return { total: 0, W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, generic: 0 };
  
  const cost = { total: 0, W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, generic: 0 };
  
  // Extract all mana symbols from {X} format
  const symbols = manaCost.match(/\{[^}]+\}/g) || [];
  
  symbols.forEach(symbol => {
    const inner = symbol.slice(1, -1); // Remove { }
    
    // Handle generic mana (numbers)
    if (/^\d+$/.test(inner)) {
      const amount = parseInt(inner);
      cost.generic += amount;
      cost.total += amount;
    }
    // Handle colored mana
    else if (['W', 'U', 'B', 'R', 'G', 'C'].includes(inner)) {
      cost[inner]++;
      cost.total++;
    }
    // Handle hybrid/phyrexian (simplified - treat as 1 generic)
    else {
      cost.generic++;
      cost.total++;
    }
  });
  
  return cost;
};

export const getLandManaProduction = (land, manifest) => {
  const name = land.name.toLowerCase();
  const text = (land.oracle_text || '').toLowerCase();
  const typeLine = (land.type_line || land.types || '').toLowerCase(); // ✅ ADD THIS LINE
  
  // ===================================================================
  // ✅ ADD THIS ENTIRE SECTION (Priority #1 - Type Line Check)
  // ===================================================================
  const basicLandTypes = ['plains', 'island', 'swamp', 'mountain', 'forest'];
  const landTypesPresent = basicLandTypes.filter(type => typeLine.includes(type));
  
  if (landTypesPresent.length >= 2) {
    // This is a dual land with implicit mana abilities!
    const colors = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    
    // Map land types to colors (both colors available, but only produce 1 mana)
    landTypesPresent.forEach(type => {
      if (type === 'plains') colors.W = 1;
      if (type === 'island') colors.U = 1;
      if (type === 'swamp') colors.B = 1;
      if (type === 'mountain') colors.R = 1;
      if (type === 'forest') colors.G = 1;
    });
    
    return {
      ...colors,
      isDualLand: true,
      actualManaProduced: 1  // ✅ Dual lands produce 1 mana total (choose color)
    };
  }
  
  // ✅ ALWAYS check for dual land patterns in oracle text (even if manifest exists)
  // This is a safety fallback
  
  // Pattern: "{T}: Add {X} or {Y}"
// ✅ DUAL LANDS: Produce 1 mana (choose a color)
  // In goldfishing, we make both colors available but it only counts as 1 mana total
  
  // UB Dual Lands (Drowned Catacomb, etc.)
  if (text.includes('{t}: add {u} or {b}') || text.includes('{t}: add {b} or {u}')) {
    return { 
      U: 1, 
      B: 1, 
      W: 0, 
      R: 0, 
      G: 0, 
      C: 0,
      isDualLand: true,  // ✅ NEW: Flag this as a dual land
      actualManaProduced: 1  // ✅ NEW: This land produces 1 mana total
    };
  }
  
  // WU Dual Lands (Azorius Chancery, etc.)
  if (text.includes('{t}: add {w} or {u}') || text.includes('{t}: add {u} or {w}')) {
    return { 
      W: 1, 
      U: 1, 
      B: 0, 
      R: 0, 
      G: 0, 
      C: 0,
      isDualLand: true,
      actualManaProduced: 1
    };
  }
  
  // WB Dual Lands
  if (text.includes('{t}: add {w} or {b}') || text.includes('{t}: add {b} or {w}')) {
    return { 
      W: 1, 
      B: 1, 
      U: 0, 
      R: 0, 
      G: 0, 
      C: 0,
      isDualLand: true,
      actualManaProduced: 1
    };
  }
  
  // UR Dual Lands
  if (text.includes('{t}: add {u} or {r}') || text.includes('{t}: add {r} or {u}')) {
    return { 
      U: 1, 
      R: 1, 
      W: 0, 
      B: 0, 
      G: 0, 
      C: 0,
      isDualLand: true,
      actualManaProduced: 1
    };
  }
  
  // BR Dual Lands
  if (text.includes('{t}: add {b} or {r}') || text.includes('{t}: add {r} or {b}')) {
    return { 
      B: 1, 
      R: 1, 
      W: 0, 
      U: 0, 
      G: 0, 
      C: 0,
      isDualLand: true,
      actualManaProduced: 1
    };
  }
  
  // BG Dual Lands
  if (text.includes('{t}: add {b} or {g}') || text.includes('{t}: add {g} or {b}')) {
    return { 
      B: 1, 
      G: 1, 
      W: 0, 
      U: 0, 
      R: 0, 
      C: 0,
      isDualLand: true,
      actualManaProduced: 1
    };
  }
  
  // RG Dual Lands
  if (text.includes('{t}: add {r} or {g}') || text.includes('{t}: add {g} or {r}')) {
    return { 
      R: 1, 
      G: 1, 
      W: 0, 
      U: 0, 
      B: 0, 
      C: 0,
      isDualLand: true,
      actualManaProduced: 1
    };
  }
  
  // RW Dual Lands
  if (text.includes('{t}: add {r} or {w}') || text.includes('{t}: add {w} or {r}')) {
    return { 
      R: 1, 
      W: 1, 
      U: 0, 
      B: 0, 
      G: 0, 
      C: 0,
      isDualLand: true,
      actualManaProduced: 1
    };
  }
  
  // GW Dual Lands
  if (text.includes('{t}: add {g} or {w}') || text.includes('{t}: add {w} or {g}')) {
    return { 
      G: 1, 
      W: 1, 
      U: 0, 
      B: 0, 
      R: 0, 
      C: 0,
      isDualLand: true,
      actualManaProduced: 1
    };
  }
  
  // GU Dual Lands
  if (text.includes('{t}: add {g} or {u}') || text.includes('{t}: add {u} or {g}')) {
    return { 
      G: 1, 
      U: 1, 
      W: 0, 
      B: 0, 
      R: 0, 
      C: 0,
      isDualLand: true,
      actualManaProduced: 1
    };
  }
  
  // Try manifest if available
  if (manifest) {
    const manifestProduction = getManaProductionFromManifest(land, manifest);
    const total = Object.values(manifestProduction).reduce((a, b) => a + b, 0);
    
    if (total > 0) {
      return manifestProduction;
    }
  }
  
  // Fall back to basic land type detection
  if (name.includes('plains') || text.includes('(plains)')) return { W: 1, U: 0, B: 0, R: 0, G: 0, C: 0 };
  if (name.includes('island') || text.includes('(island)')) return { U: 1, W: 0, B: 0, R: 0, G: 0, C: 0 };
  if (name.includes('swamp') || text.includes('(swamp)')) return { B: 1, W: 0, U: 0, R: 0, G: 0, C: 0 };
  if (name.includes('mountain') || text.includes('(mountain)')) return { R: 1, W: 0, U: 0, B: 0, G: 0, C: 0 };
  if (name.includes('forest') || text.includes('(forest)')) return { G: 1, W: 0, U: 0, B: 0, R: 0, C: 0 };
  
  console.warn('⚠️ Could not determine mana production for:', land.name);
  return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
};

// Check if we can pay a mana cost
export const canPayMana = (manaPool, manaCost) => {
  const cost = parseMana(manaCost);
  
  // Check colored requirements
  if (cost.W > manaPool.W) return false;
  if (cost.U > manaPool.U) return false;
  if (cost.B > manaPool.B) return false;
  if (cost.R > manaPool.R) return false;
  if (cost.G > manaPool.G) return false;
  
  // Check total mana (generic can be paid with any color)
  const availableTotal = manaPool.W + manaPool.U + manaPool.B + manaPool.R + manaPool.G + manaPool.C;
  const requiredTotal = cost.total;
  
  return availableTotal >= requiredTotal;
};

// Pay mana from pool
export const payMana = (manaPool, manaCost) => {
  const cost = parseMana(manaCost);
  const newPool = { ...manaPool };
  
  // Pay colored costs first
  newPool.W -= cost.W;
  newPool.U -= cost.U;
  newPool.B -= cost.B;
  newPool.R -= cost.R;
  newPool.G -= cost.G;
  
  // Pay generic with remaining mana (prioritize colorless, then excess colored)
  let genericToPay = cost.generic;
  
  if (genericToPay > 0 && newPool.C > 0) {
    const payment = Math.min(genericToPay, newPool.C);
    newPool.C -= payment;
    genericToPay -= payment;
  }
  
  // Use any remaining colored mana for generic
  const colors = ['W', 'U', 'B', 'R', 'G'];
  for (const color of colors) {
    if (genericToPay > 0 && newPool[color] > 0) {
      const payment = Math.min(genericToPay, newPool[color]);
      newPool[color] -= payment;
      genericToPay -= payment;
    }
  }
  
  return newPool;
};

// ========== STRATEGIC AI DECISION MAKING ==========

// Evaluate card priority based on deck strategy
export const evaluateCardPriority = (card, state, strategy) => {
  let priority = 0;
  
  const archetype = strategy.archetype.toLowerCase();
  const cardType = card.category.toLowerCase();
  
  // Base priority by card type and strategy
  if (archetype.includes('aggro')) {
    if (cardType === 'creature' && card.cmc <= 3) priority += 10;
    if (cardType === 'creature' && card.cmc <= 2) priority += 5;
    if (card.oracle_text?.toLowerCase().includes('haste')) priority += 8;
    if (cardType === 'sorcery' || cardType === 'instant') priority += 3;
  }
  else if (archetype.includes('control')) {
    if (cardType === 'instant' && card.oracle_text?.toLowerCase().includes('counter')) priority += 10;
    if (cardType === 'sorcery' && card.oracle_text?.toLowerCase().includes('destroy')) priority += 8;
    if (cardType === 'creature' && card.cmc >= 5) priority += 5;
  }
  else if (archetype.includes('ramp')) {
    if (card.oracle_text?.toLowerCase().includes('search your library for a land')) priority += 10;
    if (card.oracle_text?.toLowerCase().includes('add') && card.oracle_text?.toLowerCase().includes('mana')) priority += 8;
    if (cardType === 'creature' && card.cmc >= 6) priority += 7;
  }
  else if (archetype.includes('combo')) {
    if (card.oracle_text?.toLowerCase().includes('search your library')) priority += 10;
    if (card.oracle_text?.toLowerCase().includes('draw')) priority += 8;
    if (cardType === 'instant' || cardType === 'sorcery') priority += 5;
  }
  else { // Midrange or other
    if (cardType === 'creature' && card.cmc >= 2 && card.cmc <= 5) priority += 8;
    if (cardType === 'artifact' || cardType === 'enchantment') priority += 5;
  }
  
  // Adjust for mana efficiency (play on-curve)
  const landsInPlay = state.battlefield.lands.length;
  if (card.cmc <= landsInPlay && card.cmc >= landsInPlay - 1) {
    priority += 5; // Prefer playing on curve
  }
  
  // Penalize high CMC cards early game
  if (landsInPlay < 4 && card.cmc > landsInPlay + 1) {
    priority -= 5;
  }
  
  return priority;
};

// Decide whether to cast commander
export const shouldCastCommander = (state, strategy) => {
  const landsInPlay = state.battlefield.lands.length;
  const commander = state.commandZone[0];
  
  if (!commander) return false;
  
  const archetype = strategy.archetype.toLowerCase();
  
  // Voltron - cast ASAP
  if (archetype.includes('voltron')) {
    return landsInPlay >= commander.cmc;
  }
  
  // Aggro - cast early
  if (archetype.includes('aggro')) {
    return landsInPlay >= commander.cmc;
  }
  
  // Other strategies - wait until mid-game or when we have protection
  return landsInPlay >= commander.cmc + 1 && state.battlefield.creatures.length >= 2;
};

// ========== GAME STATE INITIALIZATION ==========

export const initializeGame = (deck, strategy) => {
  const deckCards = [];
  
  // Add all non-commander cards to library
  [...deck.creatures, ...deck.instants, ...deck.sorceries, 
   ...deck.artifacts, ...deck.enchantments, ...deck.planeswalkers, ...deck.lands]
    .forEach(card => {
      for (let i = 0; i < card.quantity; i++) {
        deckCards.push({ ...card, summoningSick: false });
      }
    });
  
  // Shuffle deck
  const shuffled = [...deckCards].sort(() => Math.random() - 0.5);
  
  const initialState = {
    turn: 0,
    phase: 'beginning',
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
    commandZone: [...deck.commanders.map(cmd => ({ ...cmd, commanderCastCount: 0 }))],
    manaPool: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    availableMana: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
    hasPlayedLand: false,
    damageDealtThisGame: 0,
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

// ========== TURN PHASES ==========

// Draw a card
export const drawCard = (state) => {
  if (state.library.length === 0) {
    state.log.push('⚠️ Cannot draw - library is empty!');
    return state;
  }
  
  const card = state.library.pop();
  state.hand.push(card);
  state.log.push(`📥 Drew: ${card.name}`);
  return state;
};

export const untapPhase = (state) => {
  state.phase = 'untap';
  state.hasPlayedLand = false;
  state.manaPool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  state.actualTotalMana = 0;

  // Untap all lands
  state.battlefield.lands.forEach(land => {
    land.tapped = false;
  });
  
  // Remove summoning sickness from creatures
  state.battlefield.creatures.forEach(creature => {
    creature.summoningSick = false;
  });
  
  return state;
};

// Generate available mana from lands AND artifacts
export const generateMana = (state) => {
  const availableMana = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  
  // ✅ DEBUG: Track each land's production
  const landDetails = [];
  
  // ✅ CRITICAL: Track actual total mana separately (fixes dual land double-counting)
  let actualTotalMana = 0;
  
  // Count UNTAPPED lands only
  state.battlefield.lands.forEach(land => {
    // Skip tapped lands
    if (land.tapped) {
      landDetails.push({ name: land.name, status: 'TAPPED', mana: 'none' });
      return;
    }
    
    const production = getLandManaProduction(land, state.behaviorManifest);

    // ✅ NEW: Track dual/filter lands separately for correct total calculation
    if (!state.dualLandManaTracking) {
      state.dualLandManaTracking = [];
    }
    
    if (production.isDualLand || production.isFilterLand) {
      state.dualLandManaTracking.push({
        landName: land.name,
        actualMana: production.actualManaProduced || 1,
        colors: Object.keys(production).filter(k => 
          ['W','U','B','R','G','C'].includes(k) && production[k] > 0
        )
      });
    }

    // ✅ CRITICAL FIX #1: Filter lands produce 1 mana (choose mode), not sum of all abilities
    if (production.isFilterLand) {
      // For filter lands, add mana to multiple colors but DON'T double count
      Object.keys(production).forEach(color => {
        if (color !== 'isFilterLand' && color !== 'actualManaProduced') {
          availableMana[color] += production[color];
        }
      });
      
      // ✅ Add ACTUAL mana produced (1) to total
      actualTotalMana += (production.actualManaProduced || 1);
      
      // Log correctly
      const colors = Object.entries(production)
        .filter(([key, val]) => val > 0 && key !== 'isFilterLand' && key !== 'actualManaProduced')
        .map(([color]) => color)
        .join(' or ');
      
      landDetails.push({ 
        name: land.name, 
        status: 'UNTAPPED', 
        mana: `1 (choose ${colors})`,
        isFilter: true,
        actualMana: 1
      });
    }
    // ✅ CRITICAL FIX #2: Dual lands produce 1 mana (choose color), not sum of both colors
    else if (production.isDualLand) {
      // For dual lands, add mana to both colors but DON'T double count
      Object.keys(production).forEach(color => {
        if (color !== 'isDualLand' && color !== 'actualManaProduced') {
          availableMana[color] += production[color];
        }
      });
      
      // ✅ Add ACTUAL mana produced (1) to total
      actualTotalMana += (production.actualManaProduced || 1);
      
      // Log correctly
      const colors = Object.entries(production)
        .filter(([key, val]) => val > 0 && key !== 'isDualLand' && key !== 'actualManaProduced')
        .map(([color]) => color)
        .join(' or ');
      
      landDetails.push({ 
        name: land.name, 
        status: 'UNTAPPED', 
        mana: `1 (choose ${colors})`,
        isDual: true,
        actualMana: 1
      });
    } else {
      // Regular lands: add all colors normally
      Object.keys(production).forEach(color => {
        if (color !== 'isDualLand' && color !== 'actualManaProduced' && color !== 'isFilterLand') {
          availableMana[color] += production[color];
        }
      });
      
      // ✅ Add sum of production to total (for regular lands, this is typically 1)
      const landTotal = Object.keys(production)
        .filter(k => ['W','U','B','R','G','C'].includes(k))
        .reduce((sum, color) => sum + production[color], 0);
      
      actualTotalMana += landTotal;
      
      // Log normally
      const manaString = Object.entries(production)
        .filter(([key, val]) => val > 0 && key !== 'isDualLand' && key !== 'actualManaProduced' && key !== 'isFilterLand')
        .map(([color, amount]) => `${color}:${amount}`)
        .join(', ');
      
      landDetails.push({ 
        name: land.name, 
        status: 'UNTAPPED', 
        mana: manaString || 'none',
        actualMana: landTotal
      });
    }
  });
  
  // ✅ DEBUG: Log on early turns
  if (state.detailedLog && state.turn <= 5) {
    state.detailedLog.push({
      turn: state.turn,
      phase: state.phase,
      action: '🔍 DEBUG: Mana Generation',
      details: `${state.battlefield.lands.length} lands, ${landDetails.filter(l => l.status === 'UNTAPPED').length} untapped`,
      lands: landDetails,
      landTotal: actualTotalMana,
      totalAvailable: availableMana
    });
  }
  
// ✅ Count mana-producing artifacts (assume they untap normally)
state.battlefield.artifacts.forEach(artifact => {
  const production = getArtifactManaProduction(artifact, state.behaviorManifest);
  
  // ✅ CRITICAL FIX: Artifacts with multiple mana abilities work like dual lands
  // Example: Talisman of Dominance has "{T}: Add {C}" OR "{T}: Add {U} or {B}"
  // You can only tap it ONCE per turn, so it produces 1 mana total (your choice)
  
  if (production.isDualLand || production.isChoiceManaArtifact) {
    // Multi-ability artifacts: add all colors to pool, but only count as 1 total
    Object.keys(production).forEach(color => {
      if (['W','U','B','R','G','C'].includes(color)) {
        availableMana[color] += production[color];
      }
    });
    
    // ✅ Only add 1 to actual total (artifact can only be tapped once)
    actualTotalMana += (production.actualManaProduced || 1);
    
  } else {
    // Regular mana artifacts: add normally
    Object.keys(production).forEach(color => {
      if (['W','U','B','R','G','C'].includes(color)) {
        availableMana[color] += production[color];
        actualTotalMana += production[color];
      }
    });
  }
});
  
  // ✅ Set the mana pool to the availableMana object
  state.manaPool = { ...availableMana };
  
  state.actualTotalMana = actualTotalMana;

  // ✅ CRITICAL: Log using ACTUAL total, not sum of colors
  if (actualTotalMana > 0) {
    state.log.push(`💎 Generated ${actualTotalMana} mana (W:${availableMana.W} U:${availableMana.U} B:${availableMana.B} R:${availableMana.R} G:${availableMana.G} C:${availableMana.C})`);
  }
  
  return state;
};

// NEW FUNCTION - Add this after getLandManaProduction
export const getArtifactManaProduction = (artifact, manifest) => {
  if (!manifest) {
    console.warn('⚠️ No manifest provided for artifact:', artifact.name);
    return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  }
  
  // ✅ JUST CALL THE FUNCTION WE IMPORTED!
  return getManaProductionFromManifest(artifact, manifest);
};

// Play a land
export const playLand = (state, landIndex) => {
  if (state.hasPlayedLand) {
    state.log.push('⚠️ Already played a land this turn');
    return state;
  }
  
  const land = state.hand.splice(landIndex, 1)[0];
  
  // Check if land enters tapped
  const text = (land.oracle_text || '').toLowerCase();
  // Note: name variable removed - no longer needed with new check land logic

//   // ✅ FILTER LANDS: Check for filter land pattern
// // Pattern: "{T}: Add {C}." followed by "{X/Y}, {T}: Add {XX}, {XY}, or {YY}."
// // These lands produce 1 mana (either {C} or filtered colors), NOT the sum of both abilities

// // Common filter lands and their patterns
// const filterLandPatterns = [
//   // Sunken Ruins (U/B filter)
//   /\{t\}:\s*add\s*\{c\}.*\{[ub]\/[ub]\},\s*\{t\}:\s*add\s*\{[ub]\}\{[ub]\}/i,
  
//   // Generic filter pattern: {T}: Add {C}. {X/Y}, {T}: Add {XX}, {XY}, or {YY}
//   /\{t\}:\s*add\s*\{c\}.*\{[wubrgc]\/[wubrgc]\},\s*\{t\}:\s*add/i
// ];

// const isFilterLand = filterLandPatterns.some(pattern => pattern.test(text));

// if (isFilterLand) {
//   // For filter lands, determine which colors they can produce
//   // In goldfishing, we assume optimal play (can use filter mode when beneficial)
//   // But it still only produces 1 mana total
  
//   let colors = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  
//   // Parse which color combinations this filter land offers
//   if (text.includes('{u}{u}') || text.includes('{u}{b}') || text.includes('{b}{b}')) {
//     // Sunken Ruins: can produce U or B
//     colors.U = 1;
//     colors.B = 1;
//     colors.C = 1; // Can also tap for {C}
//   } else if (text.includes('{w}{w}') || text.includes('{w}{u}') || text.includes('{u}{u}')) {
//     // Mystic Gate: can produce W or U
//     colors.W = 1;
//     colors.U = 1;
//     colors.C = 1;
//   } else if (text.includes('{w}{w}') || text.includes('{w}{b}') || text.includes('{b}{b}')) {
//     // Fetid Heath: can produce W or B
//     colors.W = 1;
//     colors.B = 1;
//     colors.C = 1;
//   } else if (text.includes('{u}{u}') || text.includes('{u}{r}') || text.includes('{r}{r}')) {
//     // Cascade Bluffs: can produce U or R
//     colors.U = 1;
//     colors.R = 1;
//     colors.C = 1;
//   } else if (text.includes('{b}{b}') || text.includes('{b}{r}') || text.includes('{r}{r}')) {
//     // Graven Cairns: can produce B or R
//     colors.B = 1;
//     colors.R = 1;
//     colors.C = 1;
//   } else if (text.includes('{b}{b}') || text.includes('{b}{g}') || text.includes('{g}{g}')) {
//     // Twilight Mire: can produce B or G
//     colors.B = 1;
//     colors.G = 1;
//     colors.C = 1;
//   } else if (text.includes('{r}{r}') || text.includes('{r}{g}') || text.includes('{g}{g}')) {
//     // Fire-Lit Thicket: can produce R or G
//     colors.R = 1;
//     colors.G = 1;
//     colors.C = 1;
//   } else if (text.includes('{r}{r}') || text.includes('{r}{w}') || text.includes('{w}{w}')) {
//     // Rugged Prairie: can produce R or W
//     colors.R = 1;
//     colors.W = 1;
//     colors.C = 1;
//   } else if (text.includes('{g}{g}') || text.includes('{g}{w}') || text.includes('{w}{w}')) {
//     // Wooded Bastion: can produce G or W
//     colors.G = 1;
//     colors.W = 1;
//     colors.C = 1;
//   } else if (text.includes('{g}{g}') || text.includes('{g}{u}') || text.includes('{u}{u}')) {
//     // Flooded Grove: can produce G or U
//     colors.G = 1;
//     colors.U = 1;
//     colors.C = 1;
//   } else {
//     // Generic filter land - default to colorless
//     colors.C = 1;
//   }
  
//   return {
//     ...colors,
//     isFilterLand: true,
//     actualManaProduced: 1  // ✅ CRITICAL: Filter lands produce 1 mana total
//   };
// }
  
  // ✅ CHECK LANDS: "enters tapped unless you control [land type]"
  const isCheckLand = text.includes('enters') && text.includes('tapped') && text.includes('unless you control');
  let checkLandEntersUntapped = false;
  
  if (isCheckLand) {
    // Parse which land types satisfy the condition
    const requiredTypes = [];
    if (text.includes('island')) requiredTypes.push('island');
    if (text.includes('plains')) requiredTypes.push('plains');
    if (text.includes('swamp')) requiredTypes.push('swamp');
    if (text.includes('mountain')) requiredTypes.push('mountain');
    if (text.includes('forest')) requiredTypes.push('forest');
    
    // Check if we control any of the required land types
    checkLandEntersUntapped = state.battlefield.lands.some(l => {
      const landText = (l.oracle_text || '').toLowerCase();
      const landName = l.name.toLowerCase();
      
      return requiredTypes.some(type => 
        landName.includes(type) || 
        landText.includes(`(${type})`) ||
        landText.includes(`: ${type}`)
      );
    });
  }
  
  // ✅ SHOCK LANDS: "you may pay 2 life. If you don't, enters tapped"
  const isShockLand = text.includes('you may pay 2 life') && text.includes('if you don\'t, it enters the battlefield tapped');
  
  // Determine if land enters tapped
  let entersTapped = false;
  let entryReason = '';
  
  if (isCheckLand) {
    entersTapped = !checkLandEntersUntapped;
    entryReason = checkLandEntersUntapped 
      ? '(enters untapped - condition met)' 
      : '(enters tapped - no required land type)';
  } else if (isShockLand) {
    // In goldfishing, always pay 2 life for shock lands
    entersTapped = false;
    entryReason = '(paid 2 life, enters untapped)';
  } else if (text.includes('enters the battlefield tapped') || text.includes('enters tapped')) {
    // Always enters tapped (like Bojuka Bog)
    entersTapped = true;
    entryReason = '(enters tapped)';
  }
  
  // Mark land as tapped
  land.tapped = entersTapped;
  
state.battlefield.lands.push(land);
  state.hasPlayedLand = true;
  
  // ✅ FIX: Add new land's mana to existing pool (don't regenerate entire pool)
  if (!land.tapped) {
    const newMana = getLandManaProduction(land, state.behaviorManifest);
    
    // Add the new land's mana production to the current pool
if (newMana.isDualLand || newMana.isFilterLand) {
      Object.keys(newMana).forEach(color => {
        if (['W', 'U', 'B', 'R', 'G', 'C'].includes(color) && newMana[color] > 0) {
          state.manaPool[color] = (state.manaPool[color] || 0) + 1;
        }
      });
      
      // ✅ BUG #1 FIX: Update actualTotalMana for dual/filter lands
      state.actualTotalMana = (state.actualTotalMana || 0) + (newMana.actualManaProduced || 1);
      
    } else {
      Object.keys(newMana).forEach(color => {
        if (['W', 'U', 'B', 'R', 'G', 'C'].includes(color)) {
          state.manaPool[color] = (state.manaPool[color] || 0) + (newMana[color] || 0);
        }
      });
      
      // ✅ BUG #1 FIX: Update actualTotalMana for regular lands
      const landTotal = Object.keys(newMana)
        .filter(k => ['W','U','B','R','G','C'].includes(k))
        .reduce((sum, color) => sum + newMana[color], 0);
      state.actualTotalMana = (state.actualTotalMana || 0) + landTotal;
    }
    
    // ✅ BUG #1 FIX: Use actualTotalMana instead of sum
    const totalMana = state.actualTotalMana || Object.values(state.manaPool).reduce((a, b) => a + b, 0);
    
    // Log with reason
    if (entryReason) {
      state.log.push(`🏔️ Played land: ${land.name} ${entryReason}`);
    } else {
      state.log.push(`🏔️ Played land: ${land.name}`);
    }
    
    state.log.push(`💎 Mana pool after land: ${totalMana} total (W:${state.manaPool.W} U:${state.manaPool.U} B:${state.manaPool.B} R:${state.manaPool.R} G:${state.manaPool.G} C:${state.manaPool.C})`);
  } else {
    // Land entered tapped, no mana added
    if (entryReason) {
      state.log.push(`🏔️ Played land: ${land.name} ${entryReason}`);
    } else {
      state.log.push(`🏔️ Played land: ${land.name}`);
    }
  }
  
  return state;
};

// Cast a spell
export const castSpell = (state, cardIndex) => {
  const card = state.hand[cardIndex];
  
  // ✅ DEBUG: Log mana state before casting
  const poolTotal = Object.values(state.manaPool).reduce((a, b) => a + b, 0);
  console.log(`[castSpell] Attempting to cast ${card.name} (cost: ${card.cmc || 0})`);
  console.log(`[castSpell] Current pool:`, state.manaPool, `Total: ${poolTotal}`);
  
  if (!canPayMana(state.manaPool, card.mana_cost)) {
    const totalAvailable = Object.values(state.manaPool).reduce((a, b) => a + b, 0);
    state.log.push(`⚠️ CANNOT CAST ${card.name}: Need ${card.cmc} mana, have ${totalAvailable}`);
    console.log(`[castSpell] ⚠️ Affordability check FAILED`);
    return state; // Don't cast if can't afford
  }
  
  console.log(`[castSpell] ✅ Affordability check PASSED - proceeding with cast`);
  
  // Pay mana
  state.manaPool = payMana(state.manaPool, card.mana_cost);
  
  //... rest of function

// ✅ NEW: Log remaining mana after cast
const totalRemaining = Object.values(state.manaPool).reduce((a, b) => a + b, 0);
if (state.detailedLog) {
  state.detailedLog.push({
    turn: state.turn,
    phase: state.phase,
    action: '💰 Mana After Cast',
    spell: card.name,
    remaining: state.manaPool,
    total: totalRemaining
  });
}
state.log.push(`💰 Remaining mana: ${totalRemaining} (W:${state.manaPool.W} U:${state.manaPool.U} B:${state.manaPool.B} R:${state.manaPool.R} G:${state.manaPool.G} C:${state.manaPool.C})`);

// Remove from hand
state.hand.splice(cardIndex, 1);
  
  // Add to battlefield or graveyard
  if (card.category === 'creature') {
    card.summoningSick = true;
    state.battlefield.creatures.push(card);
    state.log.push(`⚔️ Cast creature: ${card.name} (${card.cmc} mana)`);
  }
  else if (card.category === 'artifact') {
    state.battlefield.artifacts.push(card);
    state.log.push(`⚙️ Cast artifact: ${card.name} (${card.cmc} mana)`);
  }
  else if (card.category === 'enchantment') {
    state.battlefield.enchantments.push(card);
    state.log.push(`✨ Cast enchantment: ${card.name} (${card.cmc} mana)`);
  }
  else if (card.category === 'planeswalker') {
    state.battlefield.planeswalkers.push(card);
    state.log.push(`👤 Cast planeswalker: ${card.name} (${card.cmc} mana)`);
  }
  else if (card.category === 'instant' || card.category === 'sorcery') {
    state.graveyard.push(card);
    state.log.push(`⚡ Cast ${card.category}: ${card.name} (${card.cmc} mana)`);
  }
  
  return state;
};

export const castCommander = (state) => {
  if (state.commandZone.length === 0) return state;
  
  const commander = state.commandZone[0];
  
  // Commander tax is (2 * number of times PREVIOUSLY cast)
  const additionalCost = commander.commanderCastCount * 2;  // This is CORRECT
  const totalCMC = commander.cmc + additionalCost;
  
  // Check if we can afford commander tax
  const totalMana = state.manaPool.W + state.manaPool.U + state.manaPool.B + 
                     state.manaPool.R + state.manaPool.G + state.manaPool.C;
  
  if (totalMana < totalCMC) {
    state.log.push(`⚠️ Cannot cast commander: need ${totalCMC}, have ${totalMana}`);
    return state;
  }
  
  if (!canPayMana(state.manaPool, commander.mana_cost)) {
    state.log.push(`⚠️ Cannot cast commander: wrong colors`);
    return state;
  }
  
  // Pay mana
  state.manaPool = payMana(state.manaPool, commander.mana_cost);
  
  // Pay commander tax from remaining mana
  let taxToPay = additionalCost;
  const colors = ['C', 'W', 'U', 'B', 'R', 'G'];
  for (const color of colors) {
    if (taxToPay > 0 && state.manaPool[color] > 0) {
      const payment = Math.min(taxToPay, state.manaPool[color]);
      state.manaPool[color] -= payment;
      taxToPay -= payment;
    }
  }
  
  if (taxToPay > 0) {
    state.log.push(`⚠️ Cannot pay commander tax: need ${additionalCost} more`);
    return state;
  }
  
  // Cast commander
  state.commandZone.shift();
  commander.summoningSick = true;
  
  // Increment AFTER casting (so first cast has 0 tax)
  const castNumber = commander.commanderCastCount + 1;
  commander.commanderCastCount = castNumber;
  state.battlefield.creatures.push(commander);
  
  const taxMsg = additionalCost > 0 ? ` (${commander.cmc}+${additionalCost} tax, cast #${castNumber})` : ` (${commander.cmc}, cast #${castNumber})`;
  state.log.push(`👑 Cast commander: ${commander.name}${taxMsg}`);
  
  return state;
};

// AI Main Phase - make strategic decisions
export const aiMainPhase = (state) => {
  state.phase = 'main';
  
  // Step 1: Play a land if we have one
  const landInHand = state.hand.findIndex(card => card.category === 'land');
  if (landInHand !== -1 && !state.hasPlayedLand) {
    playLand(state, landInHand);
  }
  
  // Step 2: Cast commander if optimal
  if (state.commandZone.length > 0 && shouldCastCommander(state, state.strategy)) {
    castCommander(state);
  }
  
  // Step 3: Cast spells from hand (ordered by priority)
  let castedThisTurn = true;
  while (castedThisTurn) {
    castedThisTurn = false;
    
    // Evaluate all castable spells
    const castableSpells = state.hand
      .map((card, idx) => ({ card, idx }))
      .filter(({ card }) => 
        card.category !== 'land' && 
        canPayMana(state.manaPool, card.mana_cost)
      )
      .map(({ card, idx }) => ({
        card,
        idx,
        priority: evaluateCardPriority(card, state, state.strategy)
      }))
      .sort((a, b) => b.priority - a.priority);
    
    // Cast highest priority spell
    if (castableSpells.length > 0) {
      const { idx } = castableSpells[0];
      castSpell(state, idx);
      castedThisTurn = true;
    }
  }
  
  return state;
};

// Combat phase (simplified)
export const combatPhase = (state) => {
  state.phase = 'combat';
  
  // Count attackers (non-summoning sick creatures)
  const attackers = state.battlefield.creatures.filter(c => !c.summoningSick);
  
  if (attackers.length === 0) {
    return state;
  }
  
  // Calculate total damage
  let totalDamage = 0;
  attackers.forEach(creature => {
    const power = parseInt(creature.power) || 0;
    totalDamage += power;
  });
  
  if (totalDamage > 0) {
    state.damageDealtThisGame += totalDamage;
    state.log.push(`⚔️ Combat: ${attackers.length} creatures attack for ${totalDamage} damage (total: ${state.damageDealtThisGame})`);
  }
  
  return state;
};

// ========== FULL TURN ==========

export const runTurn = (state) => {
  state.turn++;
  state.log.push(`\n=== TURN ${state.turn} ===`);
  
  // Untap phase
  untapPhase(state);
  
  // Draw step
  drawCard(state);
  
  // Main phase 1
  aiMainPhase(state);
  
  // Combat phase
  combatPhase(state);
  
  // Main phase 2 (simplified - try to cast remaining spells)
  state.phase = 'main2';
  aiMainPhase(state);
  
  // End step
  state.phase = 'end';
  
  return state;
};

// ========== FULL GAME SIMULATION ==========

export const runFullGame = (parsedDeck, deckStrategy, numTurns = 10) => {
  const game = initializeGame(parsedDeck, deckStrategy);
  
  game.log.push(`\n🎯 Deck Strategy: ${deckStrategy.archetype}`);
  game.log.push(`📋 Gameplan: ${deckStrategy.gameplan}`);
  game.log.push(`🎲 Target Win: Turn ${deckStrategy.idealTurnWin}\n`);
  
  // Run specified number of turns
  for (let i = 0; i < numTurns; i++) {
    runTurn(game);
  }
  
  game.log.push(`\n=== GAME END ===`);
  game.log.push(`📊 Final Board State:`);
  game.log.push(`   Battlefield: ${game.battlefield.creatures.length} creatures, ${game.battlefield.lands.length} lands`);
  game.log.push(`   Hand: ${game.hand.length} cards`);
  game.log.push(`   Library: ${game.library.length} cards remaining`);
  game.log.push(`   Total Damage Dealt: ${game.damageDealtThisGame}`);
  
  // Check if win condition was met
  if (game.damageDealtThisGame >= 40) {
    game.log.push(`\n🎉 VICTORY! Dealt lethal damage by turn ${game.turn}`);
  } else {
    game.log.push(`\n📈 Simulation incomplete. Would need ${40 - game.damageDealtThisGame} more damage to win.`);
  }
  
  return game;
};
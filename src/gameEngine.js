// Advanced Game Engine - Strategic AI for Commander Goldfishing

// ========== MANA PARSING & MANAGEMENT ==========

import {
  getManaProductionFromManifest,
} from './cardBehaviorAnalyzer';

import { ManaPool } from './manaPool.js';

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
  const lowerText = text.toLowerCase();
  if (lowerText.includes('{t}: add {u} or {b}') || lowerText.includes('{t}: add {b} or {u}')) {
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
  if (lowerText.includes('{t}: add {w} or {u}') || lowerText.includes('{t}: add {u} or {w}')) {
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
  if (lowerText.includes('{t}: add {w} or {b}') || lowerText.includes('{t}: add {b} or {w}')) {
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
  if (lowerText.includes('{t}: add {u} or {r}') || lowerText.includes('{t}: add {r} or {u}')) {
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
  if (lowerText.includes('{t}: add {b} or {r}') || lowerText.includes('{t}: add {r} or {b}')) {
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
  if (lowerText.includes('{t}: add {b} or {g}') || lowerText.includes('{t}: add {g} or {b}')) {
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
  if (lowerText.includes('{t}: add {r} or {g}') || lowerText.includes('{t}: add {g} or {r}')) {
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
  if (lowerText.includes('{t}: add {r} or {w}') || lowerText.includes('{t}: add {w} or {r}')) {
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
  if (lowerText.includes('{t}: add {g} or {w}') || lowerText.includes('{t}: add {w} or {g}')) {
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
  if (lowerText.includes('{t}: add {g} or {u}') || lowerText.includes('{t}: add {u} or {g}')) {
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
      // ✅ FIX: Add actualManaProduced property for untap phase counting
      return {
        ...manifestProduction,
        actualManaProduced: manifestProduction.actualManaProduced || total
      };
    }
  }
  
  // Fall back to basic land type detection
  if (name.includes('plains') || text.includes('(plains)')) return { W: 1, U: 0, B: 0, R: 0, G: 0, C: 0, actualManaProduced: 1 };
  if (name.includes('island') || text.includes('(island)')) return { U: 1, W: 0, B: 0, R: 0, G: 0, C: 0, actualManaProduced: 1 };
  if (name.includes('swamp') || text.includes('(swamp)')) return { B: 1, W: 0, U: 0, R: 0, G: 0, C: 0, actualManaProduced: 1 };
  if (name.includes('mountain') || text.includes('(mountain)')) return { R: 1, W: 0, U: 0, B: 0, G: 0, C: 0, actualManaProduced: 1 };
  if (name.includes('forest') || text.includes('(forest)')) return { G: 1, W: 0, U: 0, B: 0, R: 0, C: 0, actualManaProduced: 1 };
  
  console.warn('⚠️ Could not determine mana production for:', land.name);
  return { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
};

// Check if we can pay a mana cost
export const canPayMana = (manaPool, manaCost, actualTotalMana = null, manaPoolManager = null, state = null) => {
  // ✨ NEW SYSTEM: Use ManaPool manager with solver
  if (manaPoolManager && state) {
    return manaPoolManager.canPay(manaCost, state);
  }
  
  // OLD SYSTEM: Backwards compatibility (when state not available)
  if (manaPoolManager) {
    return manaPoolManager.canPay(manaCost);
  }
  
  // LEGACY: Direct pool checking
  const cost = parseMana(manaCost);
  
  // Check colored requirements
  if (cost.W > manaPool.W) return false;
  if (cost.U > manaPool.U) return false;
  if (cost.B > manaPool.B) return false;
  if (cost.R > manaPool.R) return false;
  if (cost.G > manaPool.G) return false;
  
  const availableTotal = actualTotalMana !== null 
    ? actualTotalMana 
    : (manaPool.W + manaPool.U + manaPool.B + manaPool.R + manaPool.G + manaPool.C);
  
  const requiredTotal = cost.total;
  
  return availableTotal >= requiredTotal;
};

// Pay mana from pool
// Pay mana from pool
export const payMana = (manaPool, manaCost, manaPoolManager = null) => {
  // NEW SYSTEM: Use ManaPool manager if available
  if (manaPoolManager) {
    manaPoolManager.pay(manaCost);
    return manaPoolManager.getPool();
  }
  
  // OLD SYSTEM: Backwards compatibility
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

// ========== MANA POOL SYNCHRONIZATION ==========

/**
 * Recalculate actualTotalMana from manaPool to keep them in sync
 * CRITICAL: Call this after ANY mana expenditure (spell cast, ability activation)
 * 
 * This fixes the bug where actualTotalMana is incremented when generating mana
 * but never decremented when spending mana, causing phantom mana tracking.
 */
export const syncActualTotalMana = (state) => {
  const poolTotal = Object.values(state.manaPool).reduce((a, b) => a + b, 0);
  state.actualTotalMana = poolTotal;
  return state;
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

// =============================================
// NEW "AVAILABLE SOURCES" MANA SYSTEM
// =============================================
// This function builds a list of all available mana abilities
// instead of calculating a fixed pool. Just-in-time solving
// happens when spells are cast (see castSpell refactor).
// =============================================

export const generateMana = (state) => {
  console.log(`🔍 [generateMana] Starting - Turn ${state.turn}`);
  console.log(`🔍 [generateMana] Battlefield: ${state.battlefield.lands.length} lands, ${state.battlefield.artifacts.length} artifacts, ${state.battlefield.creatures.length} creatures`);
  
  // Initialize mana pool manager if doesn't exist
  if (!state.manaPoolManager) {
    state.manaPoolManager = new ManaPool();
  }
  
  // ✨ NEW SYSTEM: Build PotentialManaPool (Available Sources)
  state.potentialManaPool = state.manaPoolManager.buildPotentialManaPool(state);
  
  // For backwards compatibility and AI decision making, calculate a "preview" pool
  // This shows what mana COULD be available, but the actual activation happens
  // just-in-time during castSpell()
  state.manaPoolManager.emptyPool();
  
  // Calculate preview totals (for AI to know what's available)
  const previewTotals = {
    W: 0, U: 0, B: 0, R: 0, G: 0, C: 0
  };
  let actualTotalMana = 0;
  
  state.potentialManaPool.forEach(entry => {
    // Count what each source COULD produce, respecting quantity
    entry.ability.produces.forEach(production => {
      if (!production.types) return;
      
      const quantity = production.quantity || 1;
      
      production.types.forEach(type => {
        if (typeof type === 'string' && ['W', 'U', 'B', 'R', 'G', 'C'].includes(type)) {
          // Fixed color - add quantity
          previewTotals[type] += quantity;
          actualTotalMana += quantity;
        } else if (type.choice) {
          // For choice abilities, count all options with the quantity
          type.choice.forEach(c => {
            if (['W', 'U', 'B', 'R', 'G', 'C'].includes(c)) {
              previewTotals[c] += quantity;
            }
          });
          // But only count once for actual total
          actualTotalMana += quantity;
        } else if (type.combination) {
          // Combination produces multiple types, but total is the combination length
          actualTotalMana += type.combination.length;
          type.combination.forEach(c => {
            if (['W', 'U', 'B', 'R', 'G', 'C'].includes(c)) {
              previewTotals[c]++;
            }
          });
        }
      });
    });
  });
  
  // Store preview (for AI visibility and backwards compat)
  state.manaPool = {
    W: previewTotals.W,
    U: previewTotals.U,
    B: previewTotals.B,
    R: previewTotals.R,
    G: previewTotals.G,
    C: previewTotals.C
  };
  state.actualTotalMana = actualTotalMana;
  
  console.log(`🔍 [generateMana] Final total: ${state.actualTotalMana} available sources`);
  console.log(`🔍 [generateMana] Preview flexibility:`, state.manaPool);
  
  // Log
  if (state.actualTotalMana > 0) {
    const pool = state.manaPool;
    state.log.push(`💎 Available: ${state.actualTotalMana} sources (could produce: W:${pool.W} U:${pool.U} B:${pool.B} R:${pool.R} G:${pool.G} C:${pool.C})`);
  }
  
  return state;
};

// =============================================
// OLD SYSTEM (kept for reference, can be deleted after refactor is complete)
// =============================================
export const generateMana_OLD = (state) => {
  console.log(`🔍 [generateMana] Starting - Turn ${state.turn}`);
  console.log(`🔍 [generateMana] Battlefield: ${state.battlefield.lands.length} lands, ${state.battlefield.artifacts.length} artifacts, ${state.battlefield.creatures.length} creatures`);
  
  // Initialize mana pool manager if doesn't exist
  if (!state.manaPoolManager) {
    state.manaPoolManager = new ManaPool();
  }
  
  // Empty pool at start of each mana generation
  state.manaPoolManager.emptyPool();
  console.log(`🔍 [generateMana] Pool emptied`);
  
  // Process lands
  state.battlefield.lands.forEach(land => {
    if (land.tapped) return;
    
    // Try new system first (cached abilities)
    const manaAbilityData = state.behaviorManifest?.manaAbilities?.get(land.name);
    
    // 🔍 DEBUG: Log Underground River abilities
    if (land.name === 'Underground River' && manaAbilityData) {
      console.log('🔍 [Underground River] Manifest data:',  JSON.stringify(manaAbilityData, null, 2));
    }
    
    if (manaAbilityData?.hasManaAbility) {
      // NEW SYSTEM: Use cached structured data
      // ✅ FIX: For lands with multiple abilities (e.g., Underground River has {T}:Add{C} AND {T}:Add{U}or{B}),
      // we should activate the BEST one, not try all of them (which would fail after first tap)
      
      // Filter to only activatable abilities
      const activatableAbilities = manaAbilityData.abilities.filter(ability => {
        return ability.activationCost.every(cost => {
          if (cost === '{T}') return !land.tapped;
          if (cost === 'sacrifice') return true; // Handle separately
          // Reject abilities that require paying mana during untap
          if (cost.match(/^\{.*\}$/)) return false;
          return true;
        });
      });
      
      if (activatableAbilities.length > 0) {
        // 🔍 DEBUG: Log all abilities for Underground River
        if (land.name === 'Underground River') {
          console.log('🔍 [Underground River] All activatable abilities:', activatableAbilities.length);
          activatableAbilities.forEach((ab, idx) => {
            console.log(`🔍 [Underground River]   Ability ${idx+1}:`, JSON.stringify(ab, null, 2));
          });
        }
        
        // Use manaPoolManager to intelligently choose which ability to activate
        const chosenAbility = state.manaPoolManager.chooseBestAbility(
          activatableAbilities,
          state,
          land
        );
        
        if (chosenAbility) {
          // Activate the chosen ability
          chosenAbility.produces.forEach(production => {
            state.manaPoolManager.addMana(production, state, land);
          });
          
          // Tap the land
          if (chosenAbility.activationCost.includes('{T}')) {
            land.tapped = true;
          }
        }
      }
    } else {
      // FALLBACK: Old system for backwards compatibility
      const production = getLandManaProduction(land, state.behaviorManifest);
      
      // Convert to manaPoolManager format for smart color choice
      const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
      
      if (production.isDualLand || production.isFilterLand) {
        // Dual lands: use manaPoolManager.addMana for smart color choice
        const availableColors = colors.filter(c => production[c] > 0);
        const amount = production.actualManaProduced || 1;
        
        if (availableColors.length > 0) {
          // Use manaPoolManager with choice structure for optimal color selection
          state.manaPoolManager.addMana(
            { quantity: amount, types: [{ choice: availableColors }] },
            state,
            land
          );
        }
      } else {
        // Basic lands: add the produced color directly
        const actualAmount = colors.reduce((sum, c) => sum + (production[c] || 0), 0);
        
        colors.forEach(color => {
          if (production[color] > 0) {
            state.manaPoolManager.pool[color] += production[color];
          }
        });
        state.manaPoolManager.actualTotal += actualAmount;
      }
      
      land.tapped = true;
    }
  });
  
  // Process artifacts (similar logic)
  state.battlefield.artifacts.forEach(artifact => {
    if (artifact.tapped) return;
    
    const manaAbilityData = state.behaviorManifest?.manaAbilities?.get(artifact.name);
    
    // Debug logging for Sol Ring
    if (artifact.name === 'Sol Ring') {
      console.log('🔍 [Sol Ring] Has manifest?', !!manaAbilityData);
      if (manaAbilityData) {
        console.log('🔍 [Sol Ring] Manifest:', JSON.stringify(manaAbilityData, null, 2));
      }
    }
    
    if (manaAbilityData?.hasManaAbility) {
      // NEW SYSTEM: Choose best activatable ability
      const activatableAbilities = manaAbilityData.abilities.filter(ability => {
        return ability.activationCost.every(cost => {
          if (cost === '{T}') return !artifact.tapped;
          if (cost.match(/^\{.*\}$/)) return false;
          return true;
        });
      });
      
      if (activatableAbilities.length > 0) {
        // Use manaPoolManager to intelligently choose which ability to activate
        const chosenAbility = state.manaPoolManager.chooseBestAbility(
          activatableAbilities,
          state,
          artifact
        );
        
        if (chosenAbility) {
          chosenAbility.produces.forEach(production => {
            state.manaPoolManager.addMana(production, state, artifact);
          });
          
          if (chosenAbility.activationCost.includes('{T}')) {
            artifact.tapped = true;
          }
        }
      }
    } else {
      // FALLBACK: Old system
      const production = getArtifactManaProduction(artifact, state.behaviorManifest);
      
      // Convert to manaPoolManager format for smart color choice
      const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
      const colorCount = colors.filter(c => production[c] > 0).length;
      
      if (colorCount >= 2 || production.isDualLand) {
        // Multi-color artifacts: use manaPoolManager for smart color choice
        const availableColors = colors.filter(c => production[c] > 0);
        const amount = production.actualManaProduced || 1;
        
        if (availableColors.length > 0) {
          state.manaPoolManager.addMana(
            { quantity: amount, types: [{ choice: availableColors }] },
            state,
            artifact
          );
        }
      } else {
        // Single-color artifacts: add the produced color directly
        const actualAmount = colors.reduce((sum, c) => sum + (production[c] || 0), 0);
        
        colors.forEach(color => {
          if (production[color] > 0) {
            state.manaPoolManager.pool[color] += production[color];
          }
        });
        state.manaPoolManager.actualTotal += actualAmount;
      }
      
      artifact.tapped = true;
    }
  });
  
  // Process creatures with mana abilities (e.g., Birds of Paradise, mana dorks)
  state.battlefield.creatures.forEach(creature => {
    if (creature.tapped || creature.summoningSick) return;
    
    const manaAbilityData = state.behaviorManifest?.manaAbilities?.get(creature.name);
    
    if (manaAbilityData?.hasManaAbility) {
      // NEW SYSTEM: Choose best activatable ability
      const activatableAbilities = manaAbilityData.abilities.filter(ability => {
        return ability.activationCost.every(cost => {
          if (cost === '{T}') return !creature.tapped && !creature.summoningSick;
          if (cost.match(/^\{.*\}$/)) return false;
          return true;
        });
      });
      
      if (activatableAbilities.length > 0) {
        // Use manaPoolManager to intelligently choose which ability to activate
        const chosenAbility = state.manaPoolManager.chooseBestAbility(
          activatableAbilities,
          state,
          creature
        );
        
        if (chosenAbility) {
          chosenAbility.produces.forEach(production => {
            state.manaPoolManager.addMana(production, state, creature);
          });
          
          if (chosenAbility.activationCost.includes('{T}')) {
            creature.tapped = true;
          }
        }
      }
    } else {
      // FALLBACK: Old system - check oracle text for mana abilities
      const text = (creature.oracle_text || '').toLowerCase();
      if (text.includes('{t}:') && text.includes('add')) {
        const production = getManaProductionFromManifest(creature, state.behaviorManifest);
        
        // Convert to manaPoolManager format for smart color choice
        const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
        const colorCount = colors.filter(c => production[c] > 0).length;
        
        if (colorCount >= 2) {
          // Multi-color creatures: use manaPoolManager for smart color choice
          const availableColors = colors.filter(c => production[c] > 0);
          const amount = production.actualManaProduced || 1;
          
          if (availableColors.length > 0) {
            state.manaPoolManager.addMana(
              { quantity: amount, types: [{ choice: availableColors }] },
              state,
              creature
            );
            creature.tapped = true;
          }
        } else {
          // Single-color creatures: add the produced color directly
          const actualAmount = colors.reduce((sum, c) => sum + (production[c] || 0), 0);
          
          if (actualAmount > 0) {
            colors.forEach(color => {
              if (production[color] > 0) {
                state.manaPoolManager.pool[color] += production[color];
              }
            });
            state.manaPoolManager.actualTotal += actualAmount;
            creature.tapped = true;
          }
        }
      }
    }
  });
  
  // Update legacy fields for backwards compatibility
  state.manaPool = state.manaPoolManager.getPool();
  state.actualTotalMana = state.manaPoolManager.getTotal();
  
  console.log(`🔍 [generateMana] Final total: ${state.actualTotalMana}`);
  console.log(`🔍 [generateMana] Final pool:`, state.manaPool);
  
  // Log
  if (state.actualTotalMana > 0) {
    const pool = state.manaPool;
    state.log.push(`💎 Generated ${state.actualTotalMana} mana (W:${pool.W} U:${pool.U} B:${pool.B} R:${pool.R} G:${pool.G} C:${pool.C})`);
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
  
  // ✨ NEW SYSTEM: Rebuild PotentialManaPool (land's abilities now available)
  if (state.manaPoolManager) {
    state.potentialManaPool = state.manaPoolManager.buildPotentialManaPool(state);
    
    // Update preview pool for AI visibility (respect quantity!)
    const previewTotals = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    let actualTotalMana = 0;
    
    state.potentialManaPool.forEach(entry => {
      entry.ability.produces.forEach(production => {
        if (!production.types) return;
        const quantity = production.quantity || 1;
        
        production.types.forEach(type => {
          if (typeof type === 'string' && ['W', 'U', 'B', 'R', 'G', 'C'].includes(type)) {
            previewTotals[type] += quantity;
            actualTotalMana += quantity;
          } else if (type.choice) {
            type.choice.forEach(c => {
              if (['W', 'U', 'B', 'R', 'G', 'C'].includes(c)) previewTotals[c] += quantity;
            });
            actualTotalMana += quantity;
          } else if (type.combination) {
            actualTotalMana += type.combination.length;
            type.combination.forEach(c => {
              if (['W', 'U', 'B', 'R', 'G', 'C'].includes(c)) previewTotals[c]++;
            });
          }
        });
      });
    });
    
    state.manaPool = previewTotals;
    state.actualTotalMana = actualTotalMana;
    
    // Log
    const totalMana = state.actualTotalMana;
    if (entryReason) {
      state.log.push(`🏔️ Played land: ${land.name} ${entryReason}`);
    } else {
      state.log.push(`🏔️ Played land: ${land.name}`);
    }
    state.log.push(`💎 Available: ${totalMana} sources (could produce: W:${state.manaPool.W} U:${state.manaPool.U} B:${state.manaPool.B} R:${state.manaPool.R} G:${state.manaPool.G} C:${state.manaPool.C})`);
  } else {
    // Land entered tapped
    if (entryReason) {
      state.log.push(`🏔️ Played land: ${land.name} ${entryReason}`);
    } else {
      state.log.push(`🏔️ Played land: ${land.name}`);
    }
  }
  
  return state;
};

// =============================================
// REFACTORED castSpell() - Uses Mana Solver
// =============================================
export const castSpell = (state, cardIndex) => {
  const card = state.hand[cardIndex];
  
  console.log(`\n🎯 [castSpell] Attempting to cast ${card.name}`);
  console.log(`🎯 [castSpell] Cost: ${card.mana_cost || '{0}'}`);
  
  // ✨ NEW SYSTEM: Use mana solver with PotentialManaPool
  const solution = state.manaPoolManager.solveCost(
    card.mana_cost || '{0}',
    state.potentialManaPool || [],
    state
  );
  
  if (!solution) {
    const totalAvailable = state.potentialManaPool?.length || 0;
    state.log.push(`⚠️ CANNOT CAST ${card.name}: Mana solver found no valid payment`);
    console.log(`❌ [castSpell] Cannot afford - no solution found`);
    return state;
  }
  
  console.log(`✅ [castSpell] Solution found! Tapping ${solution.solution.length} sources`);
  
  // Apply the solution: Tap the permanents
  solution.solution.forEach(entry => {
    entry.permanent.tapped = true;
    console.log(`   🔒 Tapped ${entry.sourceName} (produced {${entry.chosenColor}})`);
  });
  
  // Rebuild PotentialManaPool (untapped sources only)
  state.potentialManaPool = state.manaPoolManager.buildPotentialManaPool(state);
  
  // Update preview pool for AI visibility (respect quantity!)
  const previewTotals = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  let actualTotalMana = 0;
  
  state.potentialManaPool.forEach(entry => {
    entry.ability.produces.forEach(production => {
      if (!production.types) return;
      const quantity = production.quantity || 1;
      
      production.types.forEach(type => {
        if (typeof type === 'string' && ['W', 'U', 'B', 'R', 'G', 'C'].includes(type)) {
          previewTotals[type] += quantity;
          actualTotalMana += quantity;
        } else if (type.choice) {
          type.choice.forEach(c => {
            if (['W', 'U', 'B', 'R', 'G', 'C'].includes(c)) previewTotals[c] += quantity;
          });
          actualTotalMana += quantity;
        } else if (type.combination) {
          actualTotalMana += type.combination.length;
          type.combination.forEach(c => {
            if (['W', 'U', 'B', 'R', 'G', 'C'].includes(c)) previewTotals[c]++;
          });
        }
      });
    });
  });
  
  state.manaPool = previewTotals;
  state.actualTotalMana = actualTotalMana;
  
  // Log remaining mana
  const totalRemaining = state.actualTotalMana;
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
  state.log.push(`💰 Remaining: ${totalRemaining} sources (W:${state.manaPool.W} U:${state.manaPool.U} B:${state.manaPool.B} R:${state.manaPool.R} G:${state.manaPool.G} C:${state.manaPool.C})`);

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

// =============================================
// REFACTORED castCommander() - Uses Mana Solver
// =============================================
export const castCommander = (state) => {
  if (state.commandZone.length === 0) return state;
  
  const commander = state.commandZone[0];
  
  // Commander tax is (2 * number of times PREVIOUSLY cast)
  const additionalCost = commander.commanderCastCount * 2;
  
  // Build the full cost string (base cost + tax)
  let fullCost = commander.mana_cost || '{0}';
  if (additionalCost > 0) {
    // Add tax as additional generic mana
    fullCost = fullCost.replace(/\}$/, `}{${additionalCost}}`);
  }
  
  console.log(`\n👑 [castCommander] Attempting to cast ${commander.name}`);
  console.log(`👑 [castCommander] Base cost: ${commander.mana_cost}, Tax: ${additionalCost}, Full cost: ${fullCost}`);
  
  // ✨ NEW SYSTEM: Use mana solver with PotentialManaPool
  const solution = state.manaPoolManager.solveCost(
    fullCost,
    state.potentialManaPool || [],
    state
  );
  
  if (!solution) {
    const totalAvailable = state.potentialManaPool?.length || 0;
    state.log.push(`⚠️ Cannot cast commander: Mana solver found no valid payment`);
    console.log(`❌ [castCommander] Cannot afford - no solution found`);
    return state;
  }
  
  console.log(`✅ [castCommander] Solution found! Tapping ${solution.solution.length} sources`);
  
  // Apply the solution: Tap the permanents
  solution.solution.forEach(entry => {
    entry.permanent.tapped = true;
    console.log(`   🔒 Tapped ${entry.sourceName} (produced {${entry.chosenColor}})`);
  });
  
  // Rebuild PotentialManaPool (untapped sources only)
  state.potentialManaPool = state.manaPoolManager.buildPotentialManaPool(state);
  
  // Update preview pool for AI visibility (respect quantity!)
  const previewTotals = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  let actualTotalMana = 0;
  
  state.potentialManaPool.forEach(entry => {
    entry.ability.produces.forEach(production => {
      if (!production.types) return;
      const quantity = production.quantity || 1;
      
      production.types.forEach(type => {
        if (typeof type === 'string' && ['W', 'U', 'B', 'R', 'G', 'C'].includes(type)) {
          previewTotals[type] += quantity;
          actualTotalMana += quantity;
        } else if (type.choice) {
          type.choice.forEach(c => {
            if (['W', 'U', 'B', 'R', 'G', 'C'].includes(c)) previewTotals[c] += quantity;
          });
          actualTotalMana += quantity;
        } else if (type.combination) {
          actualTotalMana += type.combination.length;
          type.combination.forEach(c => {
            if (['W', 'U', 'B', 'R', 'G', 'C'].includes(c)) previewTotals[c]++;
          });
        }
      });
    });
  });
  
  state.manaPool = previewTotals;
  state.actualTotalMana = actualTotalMana;
  
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
      .filter(({ card }) => {
        if (card.category === 'land') return false;
        
        // ✨ NEW SYSTEM: Use mana solver to check affordability
        const solution = state.manaPoolManager?.solveCost(
          card.mana_cost || '{0}',
          state.potentialManaPool || [],
          state
        );
        return solution !== null;
      })
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
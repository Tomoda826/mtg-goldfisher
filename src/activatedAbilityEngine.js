// Activated Ability Engine - Zone-Aware System for Hand and Battlefield Abilities

/**
 * CRITICAL MAGIC RULES:
 * - Most activated abilities can ONLY be used from the battlefield
 * - Cycling/Channel abilities can be used from hand (explicit exceptions)
 * - You must cast a spell FIRST before using its battlefield abilities
 */

// ✅ COMPREHENSIVE FIX: Import fetch land executor
import { executeSingleFetchLand } from './fetchLandEngine';

import { executeLandcycling, parseLandcyclingAbility } from './cyclingEngine';

/**
 * Ability zones - where can this ability be activated from?
 */
const ABILITY_ZONES = {
  HAND: 'hand',           // Cycling, Channel
  BATTLEFIELD: 'battlefield',  // Most activated abilities
  GRAVEYARD: 'graveyard', // Flashback, Unearth
  EXILE: 'exile'          // Some special abilities
};

/**
 * Check if a card has activated abilities
 */
export const hasActivatedAbilities = (card) => {
  if (!card.oracle_text) return false;
  const text = card.oracle_text;
  
  // Activated abilities have format: "cost: effect"
  // Must have a colon, and cost appears before it
  return text.includes(':') && !text.toLowerCase().includes('enters the battlefield:');
};

/**
 * Parse all activated abilities from a card with ZONE AWARENESS
 * Returns array of ability objects with costs, effects, AND allowed zones
 */
export const parseActivatedAbilities = (card) => {
  if (!card.oracle_text) return [];
  
  const abilities = [];
  const text = card.oracle_text;
  
  // ✅ NEW: FETCH LAND DETECTION (must come FIRST to prevent misidentification)
  // Pattern: "{T}, Sacrifice CARDNAME: Search your library for a basic land"
  const fetchLandPattern = /\{t\},?\s*sacrifice\s+[^:]+:\s*search\s+your\s+library\s+for\s+a\s+basic\s+land/i;
  
  if (fetchLandPattern.test(text)) {
    // This is a fetch land - return ONLY this ability to prevent cycling misidentification
    abilities.push({
      type: 'activated',
      name: 'Fetch Land',
      fullText: text.substring(0, 150),
      cost: {
        mana: { total: 0, W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 },
        tap: true,
        sacrifice: true,
        other: `Sacrifice ${card.name}`
      },
      effect: 'Search library for basic land card, put it onto battlefield tapped',
      allowedZones: ['battlefield'], // ⭐ Can ONLY activate from battlefield
      priority: 'MANA',
      isFetchLand: true // ✅ NEW: Flag for easy detection
    });
    
    // ⚠️ CRITICAL: Return early to prevent further parsing that might misidentify this as cycling
    console.log(`[parseActivatedAbilities] Detected fetch land: ${card.name}`);
    return abilities;
  }
  
  // ✅ EXISTING CODE: Continue with line-by-line parsing for non-fetch-lands
  // Split by line breaks and look for ability patterns
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Skip ETB triggers (not activated abilities)
    if (line.toLowerCase().includes('enters the battlefield')) continue;
    if (line.toLowerCase().includes('when ') || line.toLowerCase().includes('whenever ')) continue;
    if (line.toLowerCase().includes('at the beginning')) continue;
    
    // Look for cost:effect pattern
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const costPart = line.substring(0, colonIndex).trim();
    const effectPart = line.substring(colonIndex + 1).trim();
    
    if (!costPart || !effectPart) continue;
    
 // Parse the ability
    const ability = {
      fullText: line,
      cost: parseCost(costPart),
      effect: effectPart,
      name: generateAbilityName(effectPart, costPart, card.name),
      allowedZones: determineAllowedZones(line, costPart, effectPart) // ✅ CRITICAL
    };
    
    // ✅ NEW: Add landcycling detection flag (mirrors fetch land pattern)
    const abilityName = ability.name;
    if (abilityName && abilityName.includes('cycling') && abilityName !== 'Cycling') {
      // This is landcycling (Plainscycling, Islandcycling, etc.) not regular cycling
      const cyclingInfo = parseLandcyclingAbility(line);
      if (cyclingInfo) {
        ability.isLandcycling = true;  // ✅ Detection flag
        ability.landType = cyclingInfo.landType;  // ✅ Which land to fetch
        
        // ⭐ CRITICAL: Use the cost from parenthetical rules text
        // parseLandcyclingAbility now correctly extracts from "({1}, Discard this card: ...)"
        // not from the ability name "Islandcycling {1}"
        ability.cost = parseCost(cyclingInfo.cost);
        
        console.log(`[parseActivatedAbilities] Detected landcycling: ${card.name} → ${ability.landType} (cost: ${cyclingInfo.cost})`);
      }
    }
    
    abilities.push(ability);
  }
  
  return abilities;
};

/**
 * ✅ NEW: Determine which zones this ability can be activated from
 * This is THE critical function for following Magic rules correctly
 */
const determineAllowedZones = (fullText, costPart, effectPart) => {
  const lower = fullText.toLowerCase();
  const costLower = costPart.toLowerCase();
  const effectLower = effectPart.toLowerCase();
  
  // HAND ZONE abilities (explicit exceptions to normal rules)
  
  // Cycling and variants (most common hand ability)
  if (costLower.includes('cycling') || effectLower.includes('search your library for')) {
    return [ABILITY_ZONES.HAND];
  }
  
  // Channel (some cards have this)
  if (costLower.includes('channel')) {
    return [ABILITY_ZONES.HAND];
  }
  
  // Forecast (rare, but exists)
  if (costLower.includes('forecast')) {
    return [ABILITY_ZONES.HAND];
  }
  
  // GRAVEYARD ZONE abilities
  if (lower.includes('activate only if') && lower.includes('in your graveyard')) {
    return [ABILITY_ZONES.GRAVEYARD];
  }
  
  if (costLower.includes('unearth') || costLower.includes('flashback')) {
    return [ABILITY_ZONES.GRAVEYARD];
  }
  
  // BATTLEFIELD ZONE abilities (default for almost everything)
  // This includes:
  // - Mana abilities (e.g., "{T}: Add {G}")
  // - Tap abilities (e.g., "{T}: Draw a card")
  // - Activated abilities with costs (e.g., "{2}, Sacrifice: Create token")
  return [ABILITY_ZONES.BATTLEFIELD];
};

/**
 * Parse cost string into structured format
 */
const parseCost = (costString) => {
  const cost = {
    mana: { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0, generic: 0, total: 0 },
    tap: false,
    sacrifice: false,
    discard: 0,
    exile: 0,
    other: []
  };
  
  const lower = costString.toLowerCase();
  
  // Check for tap symbol
  if (lower.includes('{t}') || lower.includes('tap')) {
    cost.tap = true;
  }
  
  // Check for sacrifice
  if (lower.includes('sacrifice')) {
    cost.sacrifice = true;
  }
  
  // ✅ FIXED: Ignore "discard this card" for cycling (it's built-in, not an additional cost)
  const discardMatch = lower.match(/discard (?:a card|(\d+) cards?)/);
  if (discardMatch && !lower.includes('discard this card')) {
    // Only count as additional discard cost if it's NOT "discard this card"
    cost.discard = discardMatch[1] ? parseInt(discardMatch[1]) : 1;
  }
  
  // Check for exile
  const exileMatch = lower.match(/exile (?:a card|(\d+) cards?)/);
  if (exileMatch) {
    cost.exile = exileMatch[1] ? parseInt(exileMatch[1]) : 1;
  }
  
  // Parse mana costs
  const manaSymbols = costString.match(/\{[^}]+\}/g) || [];
  manaSymbols.forEach(symbol => {
    const inner = symbol.slice(1, -1);
    
    if (/^\d+$/.test(inner)) {
      const amount = parseInt(inner);
      cost.mana.generic += amount;
      cost.mana.total += amount;
    } else if (['W', 'U', 'B', 'R', 'G', 'C'].includes(inner)) {
      cost.mana[inner]++;
      cost.mana.total++;
    } else if (inner === 'T') {
      cost.tap = true;
    }
  });
  
  return cost;
};

/**
 * Generate a descriptive name for an ability
 */
const generateAbilityName = (effect, cost) => {
  const lower = effect.toLowerCase();
  const costLower = cost.toLowerCase();
  
  // Cycling variants
  if (costLower.includes('cycling') || (lower.includes('search your library for') && lower.includes('land'))) {
    if (lower.includes('island')) return 'Islandcycling';
    if (lower.includes('plains')) return 'Plainscycling';
    if (lower.includes('swamp')) return 'Swampcycling';
    if (lower.includes('mountain')) return 'Mountaincycling';
    if (lower.includes('forest')) return 'Forestcycling';
    if (lower.includes('basic land')) return 'Landcycling';
    if (lower.includes('draw a card')) return 'Cycling';
  }
  
  // ✅ CRITICAL: Mark mana abilities as AUTO
  // These shouldn't be activated manually - they're handled by generateMana()
  if (lower.includes('add') && lower.includes('mana')) {
    return 'AUTO_MANA_ABILITY';  // Special marker
  }
  
  // Token creation
  if (lower.includes('create') && lower.includes('token')) {
    return 'Create token';
  }
  
  // Draw abilities
  if (lower.includes('draw')) {
    return 'Draw ability';
  }
  
  // Scry abilities
  if (lower.includes('scry')) {
    return 'Scry ability';
  }
  
  // Generic
  return `Activated ability`;
};

/**
 * ✅ CRITICAL: Check if we can pay an ability cost
 */
const canPayAbilityCost = (gameState, ability, card) => {
  const cost = ability.cost;
  
  // ✅ FIX: Handle 0-cost abilities (e.g., fetch lands with only {T}, Sacrifice)
  const { W = 0, U = 0, B = 0, R = 0, G = 0, total = 0 } = cost.mana || {};
  
  // Check colored mana requirements (only if > 0)
  if (W > 0 && gameState.manaPool.W < W) return false;
  if (U > 0 && gameState.manaPool.U < U) return false;
  if (B > 0 && gameState.manaPool.B < B) return false;
  if (R > 0 && gameState.manaPool.R < R) return false;
  if (G > 0 && gameState.manaPool.G < G) return false;
  
  // Check total mana (including generic) - only if > 0
  if (total > 0) {
    const totalAvailable = Object.values(gameState.manaPool).reduce((a, b) => a + b, 0);
    if (totalAvailable < total) return false;
  }
  
  // Check tap requirement (card must be untapped)
  if (cost.tap && card.tapped) return false;
  
  // For now, assume we can pay other costs (sacrifice is checked elsewhere)
  return true;
};

/**
 * ✅ Pay the cost of an activated ability
 */
const payAbilityCost = (gameState, ability, card, zone) => {
  const cost = ability.cost;
  
  // Pay mana
  if (cost.mana.total > 0) {
    const { W, U, B, R, G, generic } = cost.mana;
    
    // Pay colored mana first
    gameState.manaPool.W -= W;
    gameState.manaPool.U -= U;
    gameState.manaPool.B -= B;
    gameState.manaPool.R -= R;
    gameState.manaPool.G -= G;
    
    // Pay generic from remaining mana
    let remaining = generic;
    const colors = ['W', 'U', 'B', 'R', 'G', 'C'];
    for (const color of colors) {
      if (remaining <= 0) break;
      const take = Math.min(gameState.manaPool[color], remaining);
      gameState.manaPool[color] -= take;
      remaining -= take;
    }
    
    // ✅ CRITICAL FIX FOR BUG #2: Re-sync actualTotalMana after spending mana
    const poolTotal = Object.values(gameState.manaPool).reduce((a, b) => a + b, 0);
    gameState.actualTotalMana = poolTotal;
  }
  
  // Tap the card if required
  if (cost.tap && zone === ABILITY_ZONES.BATTLEFIELD) {
    card.tapped = true;
  }
  
  // ⚠️ NOTE: Sacrifice cost is handled separately (card moved to graveyard)
  // ⚠️ NOTE: Discard/exile costs not yet implemented
};


/**
 * ✅ Execute the effect of an activated ability
 */
const executeAbilityEffect = (gameState, ability, card) => {
  const effect = ability.effect.toLowerCase();
  
  // Draw card
  if (effect.includes('draw')) {
    const drawCount = parseInt(effect.match(/draw (\d+)/)?.[1] || '1');
    for (let i = 0; i < drawCount; i++) {
      if (gameState.library.length > 0) {
        const drawnCard = gameState.library.shift();
        gameState.hand.push(drawnCard);
        
        gameState.detailedLog?.push({
          turn: gameState.turn,
          phase: gameState.phase,
          action: '📖 Drew Card',
          details: `Drew ${drawnCard.name}`,
          source: card.name,
          card: drawnCard.name
        });
      }
    }
  }
  
  // Search library (cycling/tutors)
  if (effect.includes('search your library')) {
    // Basic land cycling
    if (effect.includes('basic land')) {
      const landTypes = ['plains', 'island', 'swamp', 'mountain', 'forest'];
      
      // Find first basic land in library
      const landIndex = gameState.library.findIndex(c => {
        const name = c.name.toLowerCase();
        return landTypes.some(type => name.includes(type));
      });
      
      if (landIndex !== -1) {
        const foundLand = gameState.library.splice(landIndex, 1)[0];
        gameState.hand.push(foundLand);
        
        gameState.detailedLog?.push({
          turn: gameState.turn,
          phase: gameState.phase,
          action: '🔍 Searched Library',
          details: `Found ${foundLand.name} via ${ability.name}`,
          source: card.name,
          found: foundLand.name
        });
        
        // Shuffle library (not actually implemented)
        gameState.detailedLog?.push({
          turn: gameState.turn,
          phase: gameState.phase,
          action: '🔀 Shuffle',
          details: 'Shuffled library'
        });
      }
    }
    
    // Island cycling
    if (effect.includes('island')) {
      const islandIndex = gameState.library.findIndex(c => 
        c.name.toLowerCase().includes('island')
      );
      
      if (islandIndex !== -1) {
        const island = gameState.library.splice(islandIndex, 1)[0];
        gameState.hand.push(island);
        
        gameState.detailedLog?.push({
          turn: gameState.turn,
          phase: gameState.phase,
          action: '🔍 Islandcycling',
          details: `Found ${island.name}`,
          source: card.name
        });
      }
    }
    
    // Similar patterns for other land types...
  }
  
  // Scry
  if (effect.includes('scry')) {
    const scryAmount = parseInt(effect.match(/scry (\d+)/)?.[1] || '1');
    
    gameState.detailedLog?.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: '🔮 Scry',
      details: `Scry ${scryAmount} from ${card.name}`,
      source: card.name,
      amount: scryAmount
    });
  }
  
  // Create tokens
  if (effect.includes('create') && effect.includes('token')) {
    gameState.detailedLog?.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: '🎭 Create Token',
      details: `Created token(s) via ${card.name}`,
      source: card.name
    });
  }
  
  // Generic log for unhandled effects
  if (!effect.includes('draw') && !effect.includes('search') && !effect.includes('scry') && !effect.includes('create')) {
    gameState.detailedLog?.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: '⚡ Ability Effect',
      details: ability.effect.substring(0, 100),
      source: card.name
    });
  }
};

/**
 * ✅ Activate an ability from HAND (cycling, channel, etc.)
 */
export const activateAbilityFromHand = (gameState, cardIndex, abilityIndex = 0) => {
  const card = gameState.hand[cardIndex];
  if (!card) {
    console.warn(`[activateAbilityFromHand] No card at index ${cardIndex}`);
    return gameState;
  }
  
  const abilities = parseActivatedAbilities(card);
  if (abilities.length === 0) {
    console.warn(`[activateAbilityFromHand] ${card.name} has no activated abilities`);
    return gameState;
  }
  
  const ability = abilities[abilityIndex];
  if (!ability) {
    console.warn(`[activateAbilityFromHand] No ability at index ${abilityIndex} for ${card.name}`);
    return gameState;
  }
  
  // ✅ VALIDATION 1: Check if this ability can be activated from hand
  if (!ability.allowedZones.includes(ABILITY_ZONES.HAND)) {
    console.log(`[activateAbilityFromHand] ${ability.name} cannot be activated from hand`);
    console.log(`   Allowed zones: ${ability.allowedZones.join(', ')}`);
    
    gameState.detailedLog?.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: '❌ Invalid Zone',
      details: `${ability.name} can only be activated from: ${ability.allowedZones.join(', ')}`,
      source: card.name,
      success: false
    });
    
    gameState.log?.push(`❌ Cannot activate ${ability.name} from hand (wrong zone)`);
    
    return gameState;
  }
  
  // ✅ VALIDATION 2: Check if we're in the right phase (main phase only for hand abilities)
  // ⭐ FIXED: Accept 'main', 'main1', or 'main2' as valid phases
  const validMainPhases = ['main', 'main1', 'main2'];
  if (!validMainPhases.includes(gameState.phase)) {
    console.log(`[activateAbilityFromHand] Cannot activate during ${gameState.phase} phase`);
    
    gameState.detailedLog?.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: '❌ Wrong Phase',
      details: `Can only activate ${ability.name} during main phase`,
      source: card.name,
      success: false
    });
    
    gameState.log?.push(`❌ Cannot activate ${ability.name} during ${gameState.phase} phase`);
    
    return gameState;
  }
  
  // ✅ VALIDATION 3: Check if the card is actually in hand
  if (!gameState.hand.includes(card)) {
    console.warn(`[activateAbilityFromHand] Card ${card.name} not in hand`);
    
    gameState.detailedLog?.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: '❌ Card Not Found',
      details: `${card.name} is not in hand`,
      source: card.name,
      success: false
    });
    
    gameState.log?.push(`⚠️ ${card.name} is not in hand`);
    
    return gameState;
  }
  
  // ✅ VALIDATION 4: For cycling specifically, check card type restrictions
  if (ability.name.includes('cycling')) {
    // Cycling itself has no additional restrictions
    console.log(`[activateAbilityFromHand] ✅ Cycling ability is valid`);
  }
  
  // ✅ VALIDATION 5: Check if we can pay the cost
  if (!canPayAbilityCost(gameState, ability, card)) {
    const totalCost = ability.cost.mana.total;
    const totalAvailable = Object.values(gameState.manaPool).reduce((a, b) => a + b, 0);
    
    console.log(`[activateAbilityFromHand] Cannot afford ${ability.name} on ${card.name}`);
    console.log(`   Cost: ${totalCost} mana, Available: ${totalAvailable}`);
    
    gameState.detailedLog?.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: '❌ Cannot Afford',
      details: `Cannot afford ${ability.name} on ${card.name} (need ${totalCost}, have ${totalAvailable})`,
      source: card.name,
      cost: ability.cost,
      available: gameState.manaPool,
      success: false
    });
    
    gameState.log?.push(`⚠️ Cannot afford ${ability.name} on ${card.name} (need ${totalCost}, have ${totalAvailable})`);
    
    return gameState;
  }
  
  // ✅ ALL VALIDATIONS PASSED - Execute the ability
  console.log(`[activateAbilityFromHand] ✅ Activating ${ability.name} on ${card.name} from hand`);
  console.log(`   Cost: ${ability.cost.mana.total} mana`);
  console.log(`   Effect: ${ability.effect.substring(0, 50)}...`);
  
// Pay the cost
  payAbilityCost(gameState, ability, card, ABILITY_ZONES.HAND);
  
  // ============================================================================
  // ✅ NEW: LANDCYCLING SPECIAL HANDLING (mirrors fetch land pattern)
  // ============================================================================
  if (ability.isLandcycling) {
    console.log(`🔄 [activateAbilityFromHand] LANDCYCLING DETECTED: ${card.name}`);
    console.log(`   Ability: ${ability.name}`);
    console.log(`   Land type to fetch: ${ability.landType}`);
    
    // Execute landcycling (handles all state changes)
    // This function will:
    // - Remove card from hand
    // - Add card to graveyard
    // - Search library for land
    // - Add land to hand
    // - Shuffle library
    // - Log everything
    executeLandcycling(gameState, card, ability.landType);
    
    console.log(`🎉 [activateAbilityFromHand] Landcycling complete for ${card.name}`);
    
    // Return early - executeLandcycling already handled all state changes
    // Don't execute generic executeAbilityEffect or do manual state changes
    return gameState;
  }
   // ============================================================================
  // END LANDCYCLING SPECIAL HANDLING
  // ============================================================================
  
  // ⭐ FIX: For non-landcycling abilities, continue with standard flow
  // Remove card from hand and put in graveyard (cycling/channel goes to graveyard)
  // NOTE: executeLandcycling already handles card removal for landcycling
  gameState.hand.splice(cardIndex, 1);
  gameState.graveyard.push(card);
  
  // Execute the effect
  executeAbilityEffect(gameState, ability, card);
  
  // Log the activation
  gameState.detailedLog?.push({
    turn: gameState.turn,
    phase: gameState.phase,
    action: '⚡ Activated Ability',
    details: `Activated ${ability.name} from hand (cost: ${ability.cost.mana.total} mana)`,
    source: card.name,
    cost: ability.cost.mana.total,
    effect: ability.effect.substring(0, 100),
    success: true
  });
  
  gameState.log?.push(`⚡ Activated ${ability.name} on ${card.name} from hand (cost: ${ability.cost.mana.total} mana)`);
  
  return gameState;
};

/**
 * ✅ Activate an ability from BATTLEFIELD (tap abilities, etc.)
 * 🔧 COMPREHENSIVE FIX: Now detects and executes fetch lands immediately!
 */
export const activateAbilityFromBattlefield = (gameState, permanent, abilityIndex = 0) => {
  const abilities = parseActivatedAbilities(permanent);
  if (abilities.length === 0) return gameState;
  
  const ability = abilities[abilityIndex];
  if (!ability) return gameState;
  
  // ✅ CRITICAL CHECK: Is this a battlefield-activatable ability?
  if (!ability.allowedZones.includes(ABILITY_ZONES.BATTLEFIELD)) {
    gameState.detailedLog?.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: '❌ Invalid Zone',
      details: `${ability.name} cannot be activated from battlefield`,
      source: permanent.name,
      success: false
    });
    return gameState;
  }
  
  // Check if we can pay the cost
  if (!canPayAbilityCost(gameState, ability, permanent)) {
    gameState.detailedLog?.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: '❌ Cannot Activate',
      details: `Cannot afford ${ability.name} on ${permanent.name}`,
      source: permanent.name,
      success: false
    });
    return gameState;
  }
  
  // ✅ COMPREHENSIVE FIX: Detect fetch lands and execute immediately!
  if (ability.isFetchLand || ability.name === 'Fetch Land') {
    console.log(`🔍 [activateAbilityFromBattlefield] FETCH LAND DETECTED: ${permanent.name}`);
    
    // Pay the cost first (taps the land, marks it for sacrifice)
    payAbilityCost(gameState, ability, permanent, ABILITY_ZONES.BATTLEFIELD);
    
    console.log(`✅ [activateAbilityFromBattlefield] Paid cost for ${permanent.name}`);
    
    // ⭐ CRITICAL: Execute fetch land state changes IMMEDIATELY
    executeSingleFetchLand(gameState, permanent);
    
    console.log(`🎉 [activateAbilityFromBattlefield] Fetch land execution complete for ${permanent.name}`);
    
    // Return early - no need for generic executeAbilityEffect
    return gameState;
  }
  
  // For non-fetch-land abilities, use the standard flow
  // Pay the cost
  payAbilityCost(gameState, ability, permanent, ABILITY_ZONES.BATTLEFIELD);
  
  // Execute the effect
  executeAbilityEffect(gameState, ability, permanent);
  
  // Log the activation
  gameState.detailedLog?.push({
    turn: gameState.turn,
    phase: gameState.phase,
    action: '⚡ Activated Ability',
    details: `Activated ${ability.name} from battlefield`,
    source: permanent.name,
    cost: ability.cost.mana.total,
    success: true
  });
  
  return gameState;
};

/**
 * Get all activatable abilities from HAND only
 */
export const getActivatableAbilitiesInHand = (gameState) => {
  const activatable = [];
  
  gameState.hand.forEach((card, cardIndex) => {
    const abilities = parseActivatedAbilities(card);
    
    abilities.forEach((ability, abilityIndex) => {
      // ✅ Only include if it's a hand ability AND we can pay
      if (ability.allowedZones.includes(ABILITY_ZONES.HAND) && 
          canPayAbilityCost(gameState, ability, card)) {
        activatable.push({
          cardIndex,
          abilityIndex,
          cardName: card.name,
          abilityName: ability.name,
          cost: ability.cost,
          effect: ability.effect,
          zone: ABILITY_ZONES.HAND
        });
      }
    });
  });
  
  return activatable;
};

/**
 * Get all activatable abilities from BATTLEFIELD only
 * ✅ FIXED: Filters out mana abilities since they're automatic
 */
export const getActivatableAbilitiesOnBattlefield = (gameState) => {
  const activatable = [];
  
  const allPermanents = [
    ...gameState.battlefield.creatures,
    ...gameState.battlefield.artifacts,
    ...gameState.battlefield.enchantments,
    ...gameState.battlefield.lands
  ];
  
  allPermanents.forEach(permanent => {
    const abilities = parseActivatedAbilities(permanent);
    
    abilities.forEach((ability, abilityIndex) => {
      // ✅ CRITICAL FIX: Skip mana abilities - they're automatic!
      if (ability.name === 'AUTO_MANA_ABILITY') {
        return;  // Don't add to activatable list
      }
      
      // ✅ ADDITIONAL CHECK: Double-check for mana ability patterns
      const text = ability.fullText.toLowerCase();
      if (text.includes('add {') && text.includes('}') && 
          (text.includes('{t}:') || text.includes('tap:'))) {
        // This looks like a mana ability - skip it
        return;
      }
      
      // Only include if it's a battlefield ability AND we can pay
      if (ability.allowedZones.includes(ABILITY_ZONES.BATTLEFIELD) && 
          canPayAbilityCost(gameState, ability, permanent)) {
        activatable.push({
          permanent,
          abilityIndex,
          cardName: permanent.name,
          abilityName: ability.name,
          cost: ability.cost,
          effect: ability.effect,
          zone: ABILITY_ZONES.BATTLEFIELD
        });
      }
    });
  });
  
  return activatable;
};

/**
 * Analyze deck for activated abilities
 */
export const analyzeActivatedAbilities = (parsedDeck) => {
  const analysis = {
    total: 0,
    handAbilities: [],      // Cycling, Channel
    battlefieldAbilities: [], // Most abilities
    other: []
  };
  
  const allCards = [
    ...parsedDeck.commanders,
    ...parsedDeck.creatures,
    ...parsedDeck.instants,
    ...parsedDeck.sorceries,
    ...parsedDeck.artifacts,
    ...parsedDeck.enchantments,
    ...parsedDeck.lands
  ];
  
  allCards.forEach(card => {
    if (hasActivatedAbilities(card)) {
      const abilities = parseActivatedAbilities(card);
      
      abilities.forEach(ability => {
        analysis.total++;
        
        if (ability.allowedZones.includes(ABILITY_ZONES.HAND)) {
          analysis.handAbilities.push({ 
            card: card.name, 
            ability: ability.name,
            zone: 'hand'
          });
        } else if (ability.allowedZones.includes(ABILITY_ZONES.BATTLEFIELD)) {
          analysis.battlefieldAbilities.push({ 
            card: card.name, 
            ability: ability.name,
            zone: 'battlefield'
          });
        } else {
          analysis.other.push({ 
            card: card.name, 
            ability: ability.name,
            zone: ability.allowedZones.join(',')
          });
        }
      });
    }
  });
  
  return analysis;
};
// Fetch Land Engine - Handles land searching and fetching

import {
  isFetchLandFromManifest
} from './cardBehaviorAnalyzer';

/**
 * Check if a land is a fetch land that can search for basics
 */
export const isFetchLand = (land, manifest) => {
  if (!manifest) {
    console.warn('⚠️ No manifest for fetch land check:', land.name);
    return false;
  }
  
  // ✅ USE THE IMPORTED FUNCTION!
  return isFetchLandFromManifest(land, manifest);
};

/**
 * Analyze what colors the deck needs based on cards in hand and commander
 */
const analyzeColorNeeds = (gameState) => {
  const colorNeeds = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  
  // Check commander color requirements
  if (gameState.commandZone.length > 0) {
    const commander = gameState.commandZone[0];
    const commanderCost = commander.mana_cost || '';
    
    colorNeeds.W += (commanderCost.match(/\{W\}/g) || []).length * 3; // Weight commander heavily
    colorNeeds.U += (commanderCost.match(/\{U\}/g) || []).length * 3;
    colorNeeds.B += (commanderCost.match(/\{B\}/g) || []).length * 3;
    colorNeeds.R += (commanderCost.match(/\{R\}/g) || []).length * 3;
    colorNeeds.G += (commanderCost.match(/\{G\}/g) || []).length * 3;
  }
  
  // Check cards in hand
  gameState.hand.forEach(card => {
    if (card.category === 'land') return; // Skip lands
    
    const cost = card.mana_cost || '';
    
    colorNeeds.W += (cost.match(/\{W\}/g) || []).length;
    colorNeeds.U += (cost.match(/\{U\}/g) || []).length;
    colorNeeds.B += (cost.match(/\{B\}/g) || []).length;
    colorNeeds.R += (cost.match(/\{R\}/g) || []).length;
    colorNeeds.G += (cost.match(/\{G\}/g) || []).length;
  });
  
  return colorNeeds;
};

/**
 * Analyze what colors are already available
 */
const analyzeAvailableColors = (gameState) => {
  const available = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  
  gameState.battlefield.lands.forEach(land => {
    const name = land.name.toLowerCase();
    const text = (land.oracle_text || '').toLowerCase();
    
    // Skip tapped lands
    if (land.tapped) return;
    
    // Basic lands
    if (name.includes('plains') || text.includes('plains')) available.W++;
    if (name.includes('island') || text.includes('island')) available.U++;
    if (name.includes('swamp') || text.includes('swamp')) available.B++;
    if (name.includes('mountain') || text.includes('mountain')) available.R++;
    if (name.includes('forest') || text.includes('forest')) available.G++;
    
    // Dual lands - count both colors
    if (text.includes('add {w}')) available.W++;
    if (text.includes('add {u}')) available.U++;
    if (text.includes('add {b}')) available.B++;
    if (text.includes('add {r}')) available.R++;
    if (text.includes('add {g}')) available.G++;
  });
  
  return available;
};

/**
 * Determine the best basic land to fetch
 */
const chooseBestBasicLand = (gameState) => {
  const colorNeeds = analyzeColorNeeds(gameState);
  const available = analyzeAvailableColors(gameState);
  
  // Calculate deficit (what we need but don't have)
  const deficit = {
    W: Math.max(0, colorNeeds.W - available.W),
    U: Math.max(0, colorNeeds.U - available.U),
    B: Math.max(0, colorNeeds.B - available.B),
    R: Math.max(0, colorNeeds.R - available.R),
    G: Math.max(0, colorNeeds.G - available.G)
  };
  
  // Find color with highest deficit
  let bestColor = 'U'; // Default to blue
  let highestDeficit = 0;
  
  Object.entries(deficit).forEach(([color, need]) => {
    if (need > highestDeficit) {
      highestDeficit = need;
      bestColor = color;
    }
  });
  
  // If no deficit, fetch the color we need most overall
  if (highestDeficit === 0) {
    Object.entries(colorNeeds).forEach(([color, need]) => {
      if (need > highestDeficit) {
        highestDeficit = need;
        bestColor = color;
      }
    });
  }
  
  // Map color to basic land name
  const basicLandNames = {
    W: 'Plains',
    U: 'Island',
    B: 'Swamp',
    R: 'Mountain',
    G: 'Forest'
  };
  
  return {
    color: bestColor,
    landName: basicLandNames[bestColor],
    reason: highestDeficit > 0 ? 
      `Need ${bestColor} for cards in hand/commander` : 
      `${bestColor} is primary deck color`
  };
};

/**
 * Search library for a basic land
 */
const searchForBasicLand = (gameState, landName) => {
  const searchName = landName.toLowerCase();
  
  // Find matching basic land in library
  const landIndex = gameState.library.findIndex(card => {
    const name = card.name.toLowerCase();
    return name === searchName || name.includes(searchName);
  });
  
  if (landIndex === -1) {
    return null; // No matching land found
  }
  
  // Remove land from library
  const foundLand = gameState.library.splice(landIndex, 1)[0];
  return foundLand;
};

/**
 * ✅ NEW: Execute a SINGLE fetch land activation immediately
 * Called directly from activatedAbilityEngine when fetch land is activated
 * This is the COMPREHENSIVE FIX for fetch land state changes
 */
export const executeSingleFetchLand = (game, fetchLand) => {
  console.log(`🔍 [executeSingleFetchLand] Starting fetch for ${fetchLand.name}`);
  
  // 1. ANALYZE: Determine best basic land to fetch
  const choice = chooseBestBasicLand(game);
  
  game.detailedLog.push({
    turn: game.turn,
    phase: game.phase,
    action: '🔍 Fetch Land Analysis',
    details: `Analyzing deck needs: ${choice.reason}`,
    target: fetchLand.name,
    choice: choice.landName
  });
  
  console.log(`🔍 [executeSingleFetchLand] Decided to fetch: ${choice.landName}`);
  
  // 2. SEARCH: Look for the chosen basic in library
  const foundLand = searchForBasicLand(game, choice.landName);
  
  if (!foundLand) {
    game.detailedLog.push({
      turn: game.turn,
      phase: game.phase,
      action: '❌ Fetch Failed',
      details: `No ${choice.landName} found in library`,
      target: fetchLand.name
    });
    console.warn(`❌ [executeSingleFetchLand] No ${choice.landName} in library`);
    return game;
  }
  
  console.log(`✅ [executeSingleFetchLand] Found ${foundLand.name} in library`);
  
  // 3. SACRIFICE: Remove fetch land from battlefield
  // Use a more robust search that checks both object identity and unique ID
  const fetchIndex = game.battlefield.lands.findIndex(l => 
    l === fetchLand || // Same object reference
    (l.id && fetchLand.id && l.id === fetchLand.id) || // Same unique ID
    (l.name === fetchLand.name && l.tapped === fetchLand.tapped) // Same name + tap status
  );
  
  if (fetchIndex === -1) {
    console.warn(`⚠️ [executeSingleFetchLand] Could not find ${fetchLand.name} on battlefield`);
    console.log('   Battlefield lands:', game.battlefield.lands.map(l => l.name));
  } else {
    game.battlefield.lands.splice(fetchIndex, 1);
    console.log(`✅ [executeSingleFetchLand] Removed ${fetchLand.name} from battlefield`);
  }
  
  // 4. GRAVEYARD: Put fetch land in graveyard
  game.graveyard.push(fetchLand);
  console.log(`✅ [executeSingleFetchLand] Put ${fetchLand.name} in graveyard`);
  
  // 5. BATTLEFIELD: Put fetched land onto battlefield (tapped)
  foundLand.tapped = true; // All fetched basics enter tapped per fetch land rules
  game.battlefield.lands.push(foundLand);
  console.log(`✅ [executeSingleFetchLand] Put ${foundLand.name} onto battlefield tapped`);
  
  // 6. LOG: Final success message
  game.detailedLog.push({
    turn: game.turn,
    phase: game.phase,
    action: '✅ Fetch Land Executed',
    details: `Sacrificed ${fetchLand.name} → Fetched ${foundLand.name} (enters tapped)`,
    source: fetchLand.name,
    fetched: foundLand.name
  });
  
  // 7. SHUFFLE: Note library shuffle (not actually implemented but logged)
  game.detailedLog.push({
    turn: game.turn,
    phase: game.phase,
    action: '🔀 Shuffle Library',
    details: 'Library shuffled after search'
  });
  
  console.log(`🎉 [executeSingleFetchLand] Fetch land execution complete!`);
  
  return game;
};

/**
 * Execute fetch land ability (LEGACY - kept for compatibility)
 */
export const activateFetchLand = (gameState, fetchLand) => {
  // Determine best land to fetch
  const choice = chooseBestBasicLand(gameState);
  
  gameState.detailedLog.push({
    turn: gameState.turn,
    phase: gameState.phase,
    action: '🔍 Fetch Land Analysis',
    details: `Analyzing deck needs: ${choice.reason}`,
    target: fetchLand.name,
    choice: choice.landName
  });
  
  // Search library for the chosen basic
  const foundLand = searchForBasicLand(gameState, choice.landName);
  
  if (!foundLand) {
    gameState.detailedLog.push({
      turn: gameState.turn,
      phase: gameState.phase,
      action: '❌ Fetch Failed',
      details: `No ${choice.landName} found in library`,
      target: fetchLand.name
    });
    return gameState;
  }
  
  // Remove fetch land from battlefield (sacrifice)
  const fetchIndex = gameState.battlefield.lands.findIndex(l => l.id === fetchLand.id || l.name === fetchLand.name);
  if (fetchIndex !== -1) {
    gameState.battlefield.lands.splice(fetchIndex, 1);
  }
  
  // Put fetch land in graveyard
  gameState.graveyard.push(fetchLand);
  
  // Put found land onto battlefield
  // Check if it enters tapped
  const text = (foundLand.oracle_text || '').toLowerCase();
  const entersTapped = text.includes('enters the battlefield tapped') || text.includes('enters tapped');
  
  foundLand.tapped = entersTapped;
  gameState.battlefield.lands.push(foundLand);
  
  gameState.detailedLog.push({
    turn: gameState.turn,
    phase: gameState.phase,
    action: '✅ Fetch Land Activated',
    details: `Sacrificed ${fetchLand.name}, fetched ${foundLand.name}${entersTapped ? ' (enters tapped)' : ''}`,
    source: fetchLand.name,
    fetched: foundLand.name
  });
  
  // Shuffle library (not implemented but noted)
  gameState.detailedLog.push({
    turn: gameState.turn,
    phase: gameState.phase,
    action: '🔀 Shuffle Library',
    details: 'Library shuffled after search'
  });
  
  return gameState;
};

/**
 * Check and execute fetch lands during main phase
 */
export const executeAutomaticFetchLands = (game) => {
  // Track used fetch lands to prevent re-activation
  if (!game.usedFetchLands) game.usedFetchLands = new Set();
  
  // Find untapped fetch lands that haven't been used
  const fetchLands = game.battlefield.lands.filter(land => {
    const isFetch = isFetchLand(land, game.behaviorManifest);
    const isUntapped = !land.tapped;
    const uniqueId = land.name + (land.id || '');
    const notUsed = !game.usedFetchLands.has(uniqueId);
    return isFetch && isUntapped && notUsed;
  });
  
  if (fetchLands.length === 0) return;
  
  console.log(`🔍 [fetchLand] Found ${fetchLands.length} unused fetch lands`);
  
  // Activate each fetch land
  fetchLands.forEach(fetchLand => {
    // ✅ CRITICAL: Find basic land index FIRST
    const basicIndex = game.library.findIndex(card => {
      const name = card.name.toLowerCase();
      return name.includes('plains') || 
             name.includes('island') || 
             name.includes('swamp') || 
             name.includes('mountain') || 
             name.includes('forest');
    });
    
    // ✅ CRITICAL: Remove fetch land BEFORE checking for basics
    // This ensures it's removed even if we can't find a basic
    const fetchLandIndex = game.battlefield.lands.findIndex(l => l === fetchLand);
    if (fetchLandIndex !== -1) {
      game.battlefield.lands.splice(fetchLandIndex, 1);
      game.graveyard.push(fetchLand);
      
      // Mark as used
      const uniqueId = fetchLand.name + (fetchLand.id || '');
      game.usedFetchLands.add(uniqueId);
      
      console.log(`✅ [fetchLand] Removed ${fetchLand.name} from battlefield`);
    }
    
    // Check if we found a basic land
    if (basicIndex === -1) {
      game.detailedLog.push({
        turn: game.turn,
        phase: game.phase,
        action: '⚠️ Fetch Failed',
        details: `Sacrificed ${fetchLand.name}, but no basic lands in library`,
        source: fetchLand.name
      });
      console.warn(`⚠️ [fetchLand] No basic lands in library`);
      return;
    }
    
    // Remove basic from library and add to battlefield
    const basicToFetch = game.library.splice(basicIndex, 1)[0];
    basicToFetch.tapped = true;
    game.battlefield.lands.push(basicToFetch);
    
    // Log success
    game.detailedLog.push({
      turn: game.turn,
      phase: game.phase,
      action: '🔍 Fetch Land Activated',
      details: `Sacrificed ${fetchLand.name}, fetched ${basicToFetch.name} (enters tapped)`,
      source: fetchLand.name,
      result: basicToFetch.name
    });
    
    console.log(`✅ [fetchLand] Fetched ${basicToFetch.name}`);
  });
};

/**
 * Analyze deck for fetch lands (called during setup)
 */
export const analyzeFetchLands = (parsedDeck, manifest) => {
  if (!manifest) {
    return { total: 0, lands: [] };
  }
  
  // ✅ Use manifest directly instead of calling isFetchLand
  const fetchLands = manifest.fetchLands || [];
  
  return {
    total: fetchLands.length,
    lands: fetchLands
  };
};
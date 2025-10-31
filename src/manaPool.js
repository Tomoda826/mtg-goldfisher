// Mana Pool Manager - Strategic mana management with AI-driven color choices
// Based on comprehensive mana ability parsing guide

/**
 * ManaPool Class - Centralized mana pool management
 * 
 * Handles:
 * - Adding mana from parsed abilities
 * - Resolving variable amounts (X)
 * - Strategic color choices based on hand analysis
 * - Paying costs correctly (colored first, then generic)
 * - Tracking actual total mana (no double-counting)
 */
export class ManaPool {
  constructor() {
    this.pool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    this.actualTotal = 0;
    this.history = []; // For debugging
  }
  
  /**
   * Add mana from a parsed ability
   * 
   * @param {Object} production - Production object from parsed ability
   *   { quantity: number|string, types: Array }
   * @param {Object} game - Game state for context
   * @param {Object} permanent - The permanent producing mana
   */
  addMana(production, game, permanent) {
    const { quantity, types } = production;
    
    // Step 1: Resolve variable quantity (X)
    let amount;
    if (typeof quantity === 'string' && quantity.startsWith('X=')) {
      amount = this.resolveQuantity(quantity, game, permanent);
    } else {
      amount = quantity;
    }
    
    // Step 2: Handle different type structures
    if (!types || types.length === 0) {
      console.warn(`[ManaPool] No types specified for ${permanent.name}`);
      return;
    }
    
    // Type structure: [{ choice: [...] }]
    if (types[0]?.choice) {
      const color = this.chooseOptimalColor(types[0].choice, game, permanent);
      this.pool[color] += amount;
      this.actualTotal += amount;
      
      this.history.push({
        source: permanent.name,
        type: 'choice',
        chosen: color,
        amount,
        options: types[0].choice
      });
      
      return;
    }
    
    // Type structure: [{ combination: [...], total: "X" }]
    if (types[0]?.combination) {
      const combo = this.chooseOptimalCombination(types[0].combination, amount, game);
      combo.forEach(c => this.pool[c]++);
      this.actualTotal += amount;
      
      this.history.push({
        source: permanent.name,
        type: 'combination',
        chosen: combo,
        amount
      });
      
      return;
    }
    
    // Type structure: ["G", "W"] (fixed colors)
    if (Array.isArray(types) && types.every(t => typeof t === 'string')) {
      types.forEach(color => {
        if (['W', 'U', 'B', 'R', 'G', 'C'].includes(color)) {
          this.pool[color]++;
        }
      });
      this.actualTotal += types.length;
      
      this.history.push({
        source: permanent.name,
        type: 'fixed',
        colors: types,
        amount: types.length
      });
      
      return;
    }
    
    console.warn(`[ManaPool] Unknown type structure for ${permanent.name}:`, types);
  }
  
  /**
   * Resolve variable quantity (X rules)
   */
  resolveQuantity(rule, game, permanent) {
    if (rule === 'X=count(defenders)') {
      const count = (game.battlefield.creatures || []).filter(c => 
        (c.oracle_text || '').toLowerCase().includes('defender')
      ).length;
      console.log(`[ManaPool] Resolved ${rule} = ${count}`);
      return count;
    }
    
    if (rule === 'X=power(this)') {
      const power = permanent.power || 0;
      console.log(`[ManaPool] Resolved ${rule} = ${power}`);
      return power;
    }
    
    if (rule === 'X=max_power(creatures)') {
      const maxPower = Math.max(
        0,
        ...(game.battlefield.creatures || []).map(c => c.power || 0)
      );
      console.log(`[ManaPool] Resolved ${rule} = ${maxPower}`);
      return maxPower;
    }
    
    if (rule.includes('sacrificedMV')) {
      const mv = game.lastSacrificed?.cmc || 0;
      console.log(`[ManaPool] Resolved ${rule} = ${mv}`);
      return mv;
    }
    
    if (rule === 'X=count(artifacts)') {
      const count = (game.battlefield.artifacts || []).length;
      console.log(`[ManaPool] Resolved ${rule} = ${count}`);
      return count;
    }
    
    if (rule === 'X=count(creatures)') {
      const count = (game.battlefield.creatures || []).length;
      console.log(`[ManaPool] Resolved ${rule} = ${count}`);
      return count;
    }
    
    console.warn(`[ManaPool] Unknown X rule: ${rule}, defaulting to 1`);
    return 1;
  }
  
  /**
   * Choose best ability from multiple mana abilities
   * Used when a permanent has multiple mana abilities (e.g., Underground River)
   * 
   * @param {Array} abilities - Array of parsed ability objects
   * @param {Object} game - Game state for context
   * @param {Object} permanent - The permanent with multiple abilities
   * @returns {Object} - The chosen ability to activate
   */
  chooseBestAbility(abilities, game, permanent) {
    if (!abilities || abilities.length === 0) return null;
    if (abilities.length === 1) return abilities[0];
    
    console.log(`🔍 [${permanent.name}] Choosing from ${abilities.length} abilities`);
    
    // Analyze what colors the hand needs
    const handNeeds = this.analyzeHandColorNeeds(game.hand, game);
    
    // Score each ability based on how well it meets hand needs
    const scored = abilities.map(ability => {
      let score = 0;
      let reason = '';
      
      // Extract what colors this ability can produce
      const canProduce = [];
      
      ability.produces.forEach(production => {
        if (!production.types) return;
        
        production.types.forEach(type => {
          if (typeof type === 'string' && ['W', 'U', 'B', 'R', 'G', 'C'].includes(type)) {
            canProduce.push(type);
          } else if (type.choice) {
            canProduce.push(...type.choice);
          }
        });
      });
      
      // Remove duplicates
      const uniqueColors = [...new Set(canProduce)];
      
      // Score based on whether this ability can produce what we need
      // Find the color with the HIGHEST need that this ability can produce
      let meetsNeed = false;
      let bestNeedColor = null;
      let highestNeed = 0;
      
      for (const color of uniqueColors) {
        if (handNeeds[color] > highestNeed) {
          highestNeed = handNeeds[color];
          bestNeedColor = color;
          meetsNeed = true;
        }
      }
      
      if (meetsNeed) {
        // Ability produces a needed color - HIGH score
        score = 100;
        reason = `hand needs {${bestNeedColor}}`;
      } else {
        // Ability doesn't meet immediate need - score by flexibility
        const hasColorless = uniqueColors.includes('C');
        const hasColored = uniqueColors.some(c => c !== 'C');
        const isChoice = ability.produces.some(p => 
          p.types && p.types.some(t => t.choice)
        );
        
        if (isChoice) {
          // Choice abilities are most flexible
          score = 30;
          reason = 'offers choice (no immediate need)';
        } else if (hasColored) {
          // Colored mana is generally more useful
          score = 20;
          reason = 'colored (default)';
        } else if (hasColorless) {
          // Colorless is least flexible
          score = 10;
          reason = 'colorless (default)';
        } else {
          score = 5;
          reason = 'unknown';
        }
      }
      
      return { ability, score, reason, canProduce: uniqueColors };
    });
    
    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);
    
    const chosen = scored[0];
    console.log(`🔍 [${permanent.name}] Chose ability producing [${chosen.canProduce.join(',')}] (score: ${chosen.score}, reason: ${chosen.reason})`);
    
    // Log skipped abilities
    scored.slice(1).forEach(s => {
      console.log(`🔍 [${permanent.name}] Skipped ability producing [${s.canProduce.join(',')}] (score: ${s.score})`);
    });
    
    return chosen.ability;
  }
  
  /**
   * Strategic color choice - analyze hand needs and choose optimally
   */
  chooseOptimalColor(colors, game, permanent) {
    // Special case: Commander's color identity (Command Tower, Arcane Signet)
    if (permanent.oracle_text?.toLowerCase().includes('commander')) {
      return this.chooseFromCommanderIdentity(colors, game);
    }
    
    // Analyze what colors are needed in hand
    const handNeeds = this.analyzeHandColorNeeds(game.hand, game);
    
    // Find most-needed color that's available in choices
    for (const color of colors) {
      if (handNeeds[color] > 0) {
        console.log(`[ManaPool] Chose ${color} from ${colors} (hand needs it)`);
        return color;
      }
    }
    
    // No immediate need - choose based on overall deck colors
    if (game.strategy?.colors) {
      for (const color of game.strategy.colors) {
        if (colors.includes(color)) {
          console.log(`[ManaPool] Chose ${color} from ${colors} (deck primary color)`);
          return color;
        }
      }
    }
    
    // Default to first available
    console.log(`[ManaPool] Chose ${colors[0]} from ${colors} (default)`);
    return colors[0];
  }
  
  /**
   * Choose from commander's color identity
   */
  chooseFromCommanderIdentity(colors, game) {
    const commander = game.commandZone?.[0] || game.battlefield.creatures?.find(c => c.isCommander);
    
    if (!commander?.mana_cost) {
      return colors[0];
    }
    
    // Extract commander's colors
    const commanderColors = [];
    const cost = commander.mana_cost;
    if (cost.includes('{W}')) commanderColors.push('W');
    if (cost.includes('{U}')) commanderColors.push('U');
    if (cost.includes('{B}')) commanderColors.push('B');
    if (cost.includes('{R}')) commanderColors.push('R');
    if (cost.includes('{G}')) commanderColors.push('G');
    
    // Filter available colors to only those in identity
    const validColors = colors.filter(c => commanderColors.includes(c));
    
    if (validColors.length > 0) {
      // Choose based on hand needs from valid colors
      const handNeeds = this.analyzeHandColorNeeds(game.hand, game);
      for (const color of validColors) {
        if (handNeeds[color] > 0) return color;
      }
      return validColors[0];
    }
    
    // Shouldn't happen, but fallback
    return colors[0];
  }
  
  /**
   * Strategic combination choice - greedy fill most-needed colors
   */
  chooseOptimalCombination(colors, amount, game) {
    const handNeeds = this.analyzeHandColorNeeds(game.hand, game);
    
    // Sort colors by need (descending)
    const sorted = colors.sort((a, b) => handNeeds[b] - handNeeds[a]);
    
    const combo = [];
    for (let i = 0; i < amount; i++) {
      // Greedy: fill most-needed colors first, cycling through if needed
      combo.push(sorted[i % sorted.length]);
    }
    
    console.log(`[ManaPool] Chose combination ${combo} for ${amount} mana`);
    return combo;
  }
  
  /**
   * Analyze what colors are needed in hand
   */
  analyzeHandColorNeeds(hand, game) {
    const needs = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    
    if (!hand) {
      console.log('[ManaPool] analyzeHandColorNeeds: No hand provided');
      return needs;
    }
    
    console.log(`[ManaPool] Analyzing hand of ${hand.length} cards`);
    
    // Analyze hand
    hand.forEach(card => {
      if (card.category === 'land') return; // Skip lands
      
      const cost = card.mana_cost || '';
      const matches = cost.match(/\{([WUBRGC])\}/gi) || []; // Added 'i' for case-insensitive
      
      console.log(`[ManaPool]   ${card.name}: cost="${cost}", matches=${matches.length}`);
      
      matches.forEach(match => {
        const color = match.replace(/[{}]/g, '').toUpperCase();
        if (needs[color] !== undefined) {
          needs[color]++;
        }
      });
    });
    
    // Weight commander heavily if in command zone
    if (game.commandZone?.[0]) {
      const commander = game.commandZone[0];
      const cost = commander.mana_cost || '';
      const matches = cost.match(/\{([WUBRGC])\}/gi) || [];
      
      console.log(`[ManaPool] Commander ${commander.name}: cost="${cost}", matches=${matches.length}`);
      
      matches.forEach(match => {
        const color = match.replace(/[{}]/g, '').toUpperCase();
        if (needs[color] !== undefined) {
          needs[color] += 3; // Heavy weight
        }
      });
    }
    
    console.log('[ManaPool] Hand needs:', needs);
    
    return needs;
  }
  
  /**
   * Check if we can pay a mana cost using Available Sources model
   * @param {string} manaCost - The mana cost to check (e.g., "{2}{B}")
   * @param {object} state - Game state with potentialManaPool
   * @returns {boolean} True if we can pay the cost
   */
  canPay(manaCost, state = null) {
    if (!manaCost) return true;
    
    // ✨ NEW SYSTEM: Use solver to check if payment is possible
    if (state?.potentialManaPool) {
      const solution = this.solveCost(manaCost, state.potentialManaPool, state);
      console.log(`🔍 [canPay] Checking "${manaCost}": ${solution ? 'YES ✅' : 'NO ❌'}`);
      return solution !== null;
    }
    
    // OLD SYSTEM: Fallback for backwards compatibility
    const required = this.parseManaCostDetailed(manaCost);
    
    // Check colored requirements
    for (const [color, amount] of Object.entries(required.colored)) {
      if (this.pool[color] < amount) {
        return false;
      }
    }
    
    // Check total availability for generic
    const totalRequired = Object.values(required.colored).reduce((a, b) => a + b, 0) 
                         + required.generic;
    
    return this.actualTotal >= totalRequired;
  }
  
  /**
   * Pay a mana cost
   */
  pay(manaCost) {
    if (!manaCost) return;
    
    const required = this.parseManaCostDetailed(manaCost);
    
    // Pay colored first
    for (const [color, amount] of Object.entries(required.colored)) {
      this.pool[color] -= amount;
      this.actualTotal -= amount;
    }
    
    // Pay generic with remaining mana
    let remaining = required.generic;
    
    // Prioritize colorless for generic
    if (this.pool.C >= remaining) {
      this.pool.C -= remaining;
      this.actualTotal -= remaining;
      remaining = 0;
    } else {
      remaining -= this.pool.C;
      this.actualTotal -= this.pool.C;
      this.pool.C = 0;
    }
    
    // Use colored mana for generic if needed
    const colorPriority = ['W', 'U', 'B', 'R', 'G'];
    for (const color of colorPriority) {
      if (remaining <= 0) break;
      
      const use = Math.min(this.pool[color], remaining);
      this.pool[color] -= use;
      this.actualTotal -= use;
      remaining -= use;
    }
    
    if (remaining > 0) {
      console.error(`[ManaPool] Failed to pay ${remaining} generic mana - insufficient mana!`);
    }
  }
  
  /**
   * Parse mana cost into colored and generic components
   */
  parseManaCostDetailed(manaCost) {
    const colored = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    let generic = 0;
    
    if (!manaCost) return { colored, generic };
    
    const symbols = manaCost.match(/\{([^}]+)\}/g) || [];
    
    symbols.forEach(symbol => {
      const inner = symbol.replace(/[{}]/g, '');
      
      // Generic mana (numbers)
      if (/^\d+$/.test(inner)) {
        generic += parseInt(inner);
      }
      // Colored mana
      else if (/^[WUBRGC]$/.test(inner)) {
        colored[inner]++;
      }
      // Hybrid mana (simplified - count as 1 generic)
      else if (inner.includes('/')) {
        generic++;
      }
    });
    
    return { colored, generic };
  }
  
  /**
   * Empty the mana pool (called at end of phase)
   */
  emptyPool() {
    this.pool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
    this.actualTotal = 0;
    this.history = [];
  }
  
  /**
   * Get current pool state (for backwards compatibility)
   */
  getPool() {
    return { ...this.pool };
  }
  
  /**
   * Get actual total mana (for backwards compatibility)
   */
  getTotal() {
    return this.actualTotal;
  }
  
  /**
   * Get detailed history (for debugging)
   */
  getHistory() {
    return [...this.history];
  }
  
  /**
   * Debug string representation
   */
  toString() {
    const colors = Object.entries(this.pool)
      .filter(([, amount]) => amount > 0)
      .map(([color, amount]) => `${color}:${amount}`)
      .join(' ');
    
    return `Total: ${this.actualTotal} (${colors || 'none'})`;
  }
  
  /**
   * BUILD POTENTIAL MANA POOL (Available Sources Model)
   * 
   * Scans all untapped permanents and returns an array of available mana abilities.
   * Each entry represents ONE ability that can be activated.
   * 
   * @param {Object} gameState - Current game state
   * @returns {Array} PotentialManaPool - Array of {source, sourceName, ability, permanent} objects
   */
  buildPotentialManaPool(gameState) {
    const potentialPool = [];
    
    console.log('\n💎 [PotentialPool] Building available sources...');
    
    // Scan untapped lands
    (gameState.battlefield?.lands || []).forEach(land => {
      if (land.tapped) return;
      
      const manaAbilityData = gameState.behaviorManifest?.manaAbilities?.get(land.name);
      
      if (manaAbilityData?.hasManaAbility) {
        manaAbilityData.abilities.forEach((ability, idx) => {
          // Check basic activation requirements (tapping only)
          const requiresTap = ability.activationCost.includes('{T}');
          if (requiresTap && land.tapped) return; // Can't tap if already tapped
          
          // Include ability with its activation cost tracked
          // ManaSolver will decide if paying the cost is worth it
          potentialPool.push({
            source: 'land',
            sourceName: land.name,
            ability: ability,
            permanent: land,
            abilityIndex: idx,
            activationCost: ability.activationCost // Track costs for solver
          });
        });
      }
    });
    
    // Scan untapped artifacts
    (gameState.battlefield?.artifacts || []).forEach(artifact => {
      if (artifact.tapped) return;
      
      const manaAbilityData = gameState.behaviorManifest?.manaAbilities?.get(artifact.name);
      
      if (!manaAbilityData) {
        console.log(`⚠️ [PotentialPool] No manifest data for artifact: ${artifact.name}`);
      } else if (!manaAbilityData.hasManaAbility) {
        console.log(`⚠️ [PotentialPool] Artifact ${artifact.name} has no mana ability in manifest`);
      }
      
      if (manaAbilityData?.hasManaAbility) {
        manaAbilityData.abilities.forEach((ability, idx) => {
          // Check basic activation requirements (tapping only)
          const requiresTap = ability.activationCost.includes('{T}');
          if (requiresTap && artifact.tapped) return; // Can't tap if already tapped
          
          // Include ability with its activation cost tracked
          // ManaSolver will decide if paying the cost is worth it
          potentialPool.push({
            source: 'artifact',
            sourceName: artifact.name,
            ability: ability,
            permanent: artifact,
            abilityIndex: idx,
            activationCost: ability.activationCost // Track costs for solver
          });
        });
      }
    });
    
    // Scan untapped creatures (mana dorks)
    (gameState.battlefield?.creatures || []).forEach(creature => {
      if (creature.tapped || creature.summoningSick) return;
      
      const manaAbilityData = gameState.behaviorManifest?.manaAbilities?.get(creature.name);
      
      if (manaAbilityData?.hasManaAbility) {
        manaAbilityData.abilities.forEach((ability, idx) => {
          // Check basic activation requirements (tapping + summoning sickness)
          const requiresTap = ability.activationCost.includes('{T}');
          if (requiresTap && (creature.tapped || creature.summoningSick)) return;
          
          // Include ability with its activation cost tracked
          // ManaSolver will decide if paying the cost is worth it
          potentialPool.push({
            source: 'creature',
            sourceName: creature.name,
            ability: ability,
            permanent: creature,
            abilityIndex: idx,
            activationCost: ability.activationCost // Track costs for solver
          });
        });
      }
    });
    
    console.log(`💎 [PotentialPool] Found ${potentialPool.length} available mana abilities`);
    potentialPool.forEach((entry, idx) => {
      const produces = this.describeProduction(entry.ability.produces);
      console.log(`   ${idx}: ${entry.sourceName} (${entry.source}) → ${produces}`);
    });
    
    return potentialPool;
  }
  
  /**
   * Helper: Describe what a mana ability produces (for logging)
   */
  describeProduction(produces) {
    if (!produces || produces.length === 0) return 'nothing';
    
    return produces.map(p => {
      if (!p.types) return '?';
      
      const typeDesc = p.types.map(t => {
        if (typeof t === 'string') return `{${t}}`;
        if (t.choice) return `{${t.choice.join('/')}}`;
        if (t.combination) return `{combo: ${t.combination.join(',')}}`;
        return '?';
      }).join('');
      
      return `${p.quantity || 1}x${typeDesc}`;
    }).join(' + ');
  }
  
  /**
   * MANA SOLVER (Just-in-Time Cost Solving)
   * 
   * Given a mana cost and available sources, find an optimal payment solution.
   * Returns which sources to tap and which abilities to use.
   * 
   * @param {string} manaCost - e.g., "{2}{U}{B}"
   * @param {Array} potentialPool - Available mana abilities
   * @param {Object} gameState - Current game state (for context)
   * @returns {Object|null} - { solution: Array, totalPaid: Object } or null if impossible
   */
  solveCost(manaCost, potentialPool, gameState) {
    console.log(`\n🧮 [ManaSolver] Solving cost: ${manaCost}`);
    console.log(`🧮 [ManaSolver] Available sources: ${potentialPool.length} abilities`);
    
    // Parse the mana cost
    const required = this.parseManaCostDetailed(manaCost);
    console.log(`🧮 [ManaSolver] Required:`, required);
    
    // Track what we need to pay
    const needed = {
      W: required.colored.W || 0,
      U: required.colored.U || 0,
      B: required.colored.B || 0,
      R: required.colored.R || 0,
      G: required.colored.G || 0,
      generic: required.generic
    };
    
    const solution = [];
    const usedIndices = new Set();
    
    // PHASE 1: Pay colored requirements (strict)
    const colorOrder = ['W', 'U', 'B', 'R', 'G'];
    
    for (const color of colorOrder) {
      while (needed[color] > 0) {
        // Find a source that can produce this color (prefer free sources)
        const sourceIdx = this.findBestSourceForColor(potentialPool, color, usedIndices, needed);
        
        if (sourceIdx === -1) {
          console.log(`❌ [ManaSolver] Cannot find source for {${color}}`);
          return null; // Cannot pay
        }
        
        const entry = potentialPool[sourceIdx];
        
        // Check what colors this ability produces (might be multiple!)
        // e.g., Dimir Signet {U}{B} → produces both U and B in one activation
        // e.g., Underground River {U} or {B} → produces U (if we're paying for U)
        const producedColors = this.getProducedColors(entry.ability, color);
        
        // Handle activation cost (e.g., Dimir Signet needs {1})
        const activationCost = this.getActivationManaCost(entry.activationCost || []);
        if (activationCost) {
          needed.generic += activationCost; // Add to generic requirement
          console.log(`   💰 ${entry.sourceName} requires {${activationCost}} to activate`);
        }
        
        // Mark source as used ONCE
        usedIndices.add(sourceIdx);
        
        // Credit ALL colors this ability produces
        // For Dimir Signet {U}{B}: credits both U and B
        // For Island {U}: credits only U
        // For Underground River {U/B}: credits the chosen color (U or B depending on request)
        producedColors.forEach(producedColor => {
          if (needed[producedColor] > 0) {
            needed[producedColor]--;
            console.log(`   ✓ ${entry.sourceName} produces {${producedColor}}`);
          }
        });
        
        // Add to solution with the primary color requested
        solution.push({
          ...entry,
          chosenColor: color,
          producedColors: producedColors, // Track all colors produced
          reason: `colored requirement (produces ${producedColors.map(c => `{${c}}`).join('')})`,
          activationCost: activationCost || 0
        });
        
        console.log(`   ✓ Used ${entry.sourceName} for ${producedColors.map(c => `{${c}}`).join('')}`);
      }
    }
    
    // PHASE 2: Pay generic requirement (any source)
    while (needed.generic > 0) {
      // Find best source (prefer free sources, avoid mana rocks unless needed)
      const sourceIdx = this.findBestGenericSource(potentialPool, usedIndices, needed.generic);
      
      if (sourceIdx === -1) {
        console.log(`❌ [ManaSolver] Cannot find source for generic {${needed.generic}}`);
        return null; // Cannot pay
      }
      
      const entry = potentialPool[sourceIdx];
      const producedColor = this.chooseGenericColor(entry.ability, gameState);
      
      // ✅ FIX MANA-019: Get the quantity this ability produces (with X resolution)
      const producedQuantity = this.getProductionQuantity(entry.ability, gameState, entry.permanent);
      
      // ✅ FIX MANA-022: Handle activation cost (calculate NET contribution)
      // Dimir Signet: costs {1}, produces 2 → NET is +1 (not +2!)
      const activationCost = this.getActivationManaCost(entry.activationCost || []);
      const netProduction = producedQuantity - activationCost;
      
      if (netProduction <= 0) {
        console.log(`❌ [ManaSolver] ${entry.sourceName} is net-zero or negative (produces ${producedQuantity}, costs ${activationCost})`);
        continue; // Skip this source, it doesn't help
      }
      
      if (activationCost > 0) {
        console.log(`   💰 ${entry.sourceName} costs {${activationCost}}, produces ${producedQuantity} → NET +${netProduction}`);
      }
      
      solution.push({
        ...entry,
        chosenColor: producedColor,
        reason: `generic payment (net +${netProduction})`,
        activationCost: activationCost || 0
      });
      usedIndices.add(sourceIdx);
      needed.generic -= netProduction; // Use NET production, not gross
      
      console.log(`   ✓ Using ${entry.sourceName} for generic (NET ${netProduction} after {${activationCost}} cost)`);
    }
    
    console.log(`✅ [ManaSolver] Found solution using ${solution.length} sources`);
    
    return {
      solution: solution,
      totalPaid: {
        W: required.colored.W || 0,
        U: required.colored.U || 0,
        B: required.colored.B || 0,
        R: required.colored.R || 0,
        G: required.colored.G || 0,
        generic: required.generic
      }
    };
  }
  
  /**
   * Get the total quantity of mana an ability produces for GENERIC payment
   * Handles: 2x{C}{C} (Sol Ring produces 2), 1x{U/B} (choice produces 1), etc.
   * IMPORTANT: For colored pips, we always pay 1 per source activation.
   * For generic, we count the total quantity available, resolving X if needed.
   * 
   * @param {Object} ability - The mana ability
   * @param {Object} gameState - Current game state (for X resolution)
   * @param {Object} permanent - The permanent with this ability (for X resolution)
   */
  getProductionQuantity(ability, gameState, permanent) {
    if (!ability.produces || ability.produces.length === 0) return 1;
    
    // Sum all production quantities
    let total = 0;
    ability.produces.forEach(production => {
      const qty = production.quantity;
      
      // Handle variable quantities (X) - resolve using game state
      if (typeof qty === 'string') {
        const resolved = this.resolveQuantity(qty, gameState, permanent);
        console.log(`🔍 [Solver] Resolved variable quantity "${qty}" = ${resolved}`);
        total += resolved;
        return;
      }
      
      total += qty || 1;
    });
    
    return total;
  }
  
  /**
   * Check if an ability can produce a specific color
   */
  canProduceColor(ability, color) {
    if (!ability.produces || ability.produces.length === 0) return false;
    
    for (const production of ability.produces) {
      if (!production.types) continue;
      
      for (const type of production.types) {
        if (typeof type === 'string' && type === color) return true;
        if (type.choice && type.choice.includes(color)) return true;
        if (type.combination && type.combination.includes(color)) return true;
      }
    }
    
    return false;
  }
  
  /**
   * Choose what color to produce for generic payment
   */
  chooseGenericColor(ability, gameState) {
    if (!ability.produces || ability.produces.length === 0) return 'C';
    
    // Extract all possible colors this ability can produce
    const canProduce = [];
    ability.produces.forEach(production => {
      if (!production.types) return;
      production.types.forEach(type => {
        if (typeof type === 'string') canProduce.push(type);
        if (type.choice) canProduce.push(...type.choice);
        if (type.combination) canProduce.push(...type.combination);
      });
    });
    
    // Prefer colorless for generic payment (preserve colored mana)
    if (canProduce.includes('C')) return 'C';
    
    // Otherwise use first available color
    return canProduce[0] || 'C';
  }
  
  /**
   * Extract mana cost from activation cost array
   * e.g., ['{1}', '{T}'] → 1 (generic mana needed)
   * e.g., ['{T}'] → 0 (no mana cost)
   * e.g., ['{2}', '{U}', '{T}'] → not yet supported (colored + generic)
   */
  getActivationManaCost(activationCostArray) {
    if (!activationCostArray || activationCostArray.length === 0) return 0;
    
    let totalGeneric = 0;
    
    for (const cost of activationCostArray) {
      // Match generic mana symbols like {1}, {2}, {3}
      const genericMatch = cost.match(/^\{(\d+)\}$/);
      if (genericMatch) {
        totalGeneric += parseInt(genericMatch[1], 10);
      }
      // Note: Colored costs like {U}, {B} not yet supported
      // Skip {T}, 'sacrifice', 'pay_life' etc
    }
    
    return totalGeneric;
  }
  
  /**
   * Get ALL colors an ability produces in one activation
   * @param {Object} ability - The mana ability
   * @param {string} targetColor - The color being requested (for choice abilities)
   * 
   * Examples:
   * - Dimir Signet {U}{B} (combination) → ['U', 'B'] (both produced at once)
   * - Island {U} (fixed) → ['U'] (only one)
   * - Underground River {U} or {B} (choice), targetColor='B' → ['B'] (chosen color)
   * - Underground River {U} or {B} (choice), targetColor='W' → ['U'] (fall back to first)
   */
  getProducedColors(ability, targetColor = null) {
    if (!ability.produces || ability.produces.length === 0) return [];
    
    const colors = [];
    
    ability.produces.forEach(production => {
      if (!production.types) return;
      
      production.types.forEach(type => {
        if (typeof type === 'string') {
          // Fixed color: {U}, {B}, {C}, etc
          colors.push(type);
        } else if (type.combination) {
          // Combination: {U}{B} produces both U and B
          colors.push(...type.combination);
        } else if (type.choice) {
          // Choice: {U} or {B} - pick the target color if available
          if (targetColor && type.choice.includes(targetColor)) {
            colors.push(targetColor); // Use requested color
          } else {
            // Fall back: prefer colored over colorless
            const colored = type.choice.filter(c => c !== 'C');
            if (colored.length > 0) {
              colors.push(colored[0]);
            } else {
              colors.push(type.choice[0]);
            }
          }
        }
      });
    });
    
    return colors;
  }
  
  /**
   * Find best source for a colored requirement
   * Prefers free sources (no mana cost) over mana rocks
   */
  findBestSourceForColor(potentialPool, color, usedIndices, needed) {
    // First try: find a FREE source (no mana activation cost)
    let sourceIdx = potentialPool.findIndex((entry, idx) => {
      if (usedIndices.has(idx)) return false;
      if (!this.canProduceColor(entry.ability, color)) return false;
      
      const manaCost = this.getActivationManaCost(entry.activationCost || []);
      return manaCost === 0; // Free source
    });
    
    if (sourceIdx !== -1) return sourceIdx;
    
    // Second try: allow mana rocks (have activation cost)
    sourceIdx = potentialPool.findIndex((entry, idx) => {
      if (usedIndices.has(idx)) return false;
      return this.canProduceColor(entry.ability, color);
    });
    
    return sourceIdx;
  }
  
  /**
   * Find best source for generic payment
   * Prefers free sources, only uses mana rocks if beneficial
   */
  findBestGenericSource(potentialPool, usedIndices, neededGeneric) {
    // First try: find a FREE source that produces enough
    let sourceIdx = potentialPool.findIndex((entry, idx) => {
      if (usedIndices.has(idx)) return false;
      
      const manaCost = this.getActivationManaCost(entry.activationCost || []);
      return manaCost === 0; // Free source
    });
    
    if (sourceIdx !== -1) return sourceIdx;
    
    // Second try: mana rocks that are net-positive
    // e.g., Dimir Signet: costs {1}, produces {U}{B} (2 mana) → net +1
    sourceIdx = potentialPool.findIndex((entry, idx) => {
      if (usedIndices.has(idx)) return false;
      
      const manaCost = this.getActivationManaCost(entry.activationCost || []);
      if (manaCost === 0) return false; // Already checked above
      
      // Only use if it's net-positive or we desperately need it
      // For now, allow any mana rock (solver will handle the math)
      return true;
    });
    
    return sourceIdx;
  }
}
// Static Effects Detector - Phase 2B Week 1
// Detects static abilities from card oracle text
// Supports: anthems, keyword grants, cost reduction

/**
 * Effect Categories
 * These define what type of static effect we detected
 */
export const EFFECT_CATEGORIES = {
  POWER_TOUGHNESS: 'power_toughness',      // "Creatures you control get +1/+1"
  KEYWORD_GRANT: 'keyword_grant',          // "Creatures you control have flying"
  COST_MODIFICATION: 'cost_modification',  // "Creature spells cost {1} less"
  TYPE_CHANGE: 'type_change',              // "Goblins you control are Warriors" (Phase 2C)
  COLOR_CHANGE: 'color_change',            // "Creatures are white" (Phase 2C)
};

/**
 * Layer Numbers (Simplified for Phase 2B)
 * Based on MTG Comprehensive Rules Section 613
 * We're only implementing 3 layers in Phase 2B
 */
export const LAYERS = {
  TYPE_EFFECTS: 4,      // Type-changing effects
  ABILITY_EFFECTS: 6,   // Adding/removing abilities (keyword grants)
  PT_EFFECTS: 7,        // Power/toughness modifications (anthems)
};

/**
 * Check if a card has any static abilities
 * @param {Object} card - Card object with oracle_text
 * @returns {boolean} True if card has static abilities
 */
export function hasStaticAbility(card) {
  if (!card || !card.oracle_text) return false;
  
  const text = card.oracle_text.toLowerCase();
  
  // Look for common static ability patterns
  const staticPatterns = [
    'creatures you control get',
    'creatures you control have',
    'spells you cast cost',
    'creature spells cost',
    'artifact spells cost',
    'instant spells cost',
    'sorcery spells cost',
    'enchantment spells cost',
    'planeswalker spells cost',
  ];
  
  return staticPatterns.some(pattern => text.includes(pattern));
}

/**
 * Parse anthem effects (P/T modifications)
 * Pattern: "Creatures you control get +X/+X"
 * 
 * @param {Object} card - Card with oracle text
 * @returns {Object|null} Effect object or null if no anthem found
 */
export function parseAnthemEffect(card) {
  if (!card || !card.oracle_text) return null;
  
  const text = card.oracle_text.toLowerCase();
  
  // Pattern 1: "Creatures you control get +X/+X"
  const basicAnthemMatch = text.match(/creatures you control get ([+-]\d+)\/([+-]\d+)/i);
  if (basicAnthemMatch) {
    return {
      category: EFFECT_CATEGORIES.POWER_TOUGHNESS,
      layer: LAYERS.PT_EFFECTS,
      affectedFilter: {
        cardTypes: ['creature'],
        controller: 'you',
        subtypes: null // Affects all creatures
      },
      modification: {
        power: parseInt(basicAnthemMatch[1]),
        toughness: parseInt(basicAnthemMatch[2])
      },
      source: card,
      sourceId: card.id || card.name,
      timestamp: Date.now()
    };
  }
  
  // Pattern 2: "[Subtype] creatures you control get +X/+X"
  const subtypeAnthemMatch = text.match(/(\w+) creatures you control get ([+-]\d+)\/([+-]\d+)/i);
  if (subtypeAnthemMatch) {
    return {
      category: EFFECT_CATEGORIES.POWER_TOUGHNESS,
      layer: LAYERS.PT_EFFECTS,
      affectedFilter: {
        cardTypes: ['creature'],
        controller: 'you',
        subtypes: [subtypeAnthemMatch[1].toLowerCase()]
      },
      modification: {
        power: parseInt(subtypeAnthemMatch[2]),
        toughness: parseInt(subtypeAnthemMatch[3])
      },
      source: card,
      sourceId: card.id || card.name,
      timestamp: Date.now()
    };
  }
  
  // Pattern 3: "Other creatures you control get +X/+X"
  const otherCreaturesMatch = text.match(/other creatures you control get ([+-]\d+)\/([+-]\d+)/i);
  if (otherCreaturesMatch) {
    return {
      category: EFFECT_CATEGORIES.POWER_TOUGHNESS,
      layer: LAYERS.PT_EFFECTS,
      affectedFilter: {
        cardTypes: ['creature'],
        controller: 'you',
        subtypes: null,
        excludeSelf: true // Don't affect the source card itself
      },
      modification: {
        power: parseInt(otherCreaturesMatch[1]),
        toughness: parseInt(otherCreaturesMatch[2])
      },
      source: card,
      sourceId: card.id || card.name,
      timestamp: Date.now()
    };
  }
  
  return null;
}

/**
 * Parse keyword grant effects
 * Pattern: "Creatures you control have [keyword]"
 * 
 * @param {Object} card - Card with oracle text
 * @returns {Object|null} Effect object or null if no keyword grant found
 */
export function parseKeywordGrant(card) {
  if (!card || !card.oracle_text) return null;
  
  const text = card.oracle_text.toLowerCase();
  
  // Common keywords to detect
  const keywords = [
    'flying', 'first strike', 'double strike', 'deathtouch', 
    'lifelink', 'vigilance', 'trample', 'menace', 'reach',
    'haste', 'defender', 'hexproof', 'indestructible'
  ];
  
  // Pattern 1: "Creatures you control have [keyword]"
  for (const keyword of keywords) {
    const basicGrantMatch = text.match(new RegExp(`creatures you control have ${keyword}`, 'i'));
    if (basicGrantMatch) {
      return {
        category: EFFECT_CATEGORIES.KEYWORD_GRANT,
        layer: LAYERS.ABILITY_EFFECTS,
        affectedFilter: {
          cardTypes: ['creature'],
          controller: 'you',
          subtypes: null
        },
        modification: {
          keyword: keyword
        },
        source: card,
        sourceId: card.id || card.name,
        timestamp: Date.now()
      };
    }
  }
  
  // Pattern 2: "[Subtype] creatures you control have [keyword]"
  for (const keyword of keywords) {
    const subtypeGrantMatch = text.match(new RegExp(`(\\w+) creatures you control have ${keyword}`, 'i'));
    if (subtypeGrantMatch) {
      return {
        category: EFFECT_CATEGORIES.KEYWORD_GRANT,
        layer: LAYERS.ABILITY_EFFECTS,
        affectedFilter: {
          cardTypes: ['creature'],
          controller: 'you',
          subtypes: [subtypeGrantMatch[1].toLowerCase()]
        },
        modification: {
          keyword: keyword
        },
        source: card,
        sourceId: card.id || card.name,
        timestamp: Date.now()
      };
    }
  }
  
  // Pattern 3: "Other creatures you control have [keyword]"
  for (const keyword of keywords) {
    const otherGrantMatch = text.match(new RegExp(`other creatures you control have ${keyword}`, 'i'));
    if (otherGrantMatch) {
      return {
        category: EFFECT_CATEGORIES.KEYWORD_GRANT,
        layer: LAYERS.ABILITY_EFFECTS,
        affectedFilter: {
          cardTypes: ['creature'],
          controller: 'you',
          subtypes: null,
          excludeSelf: true
        },
        modification: {
          keyword: keyword
        },
        source: card,
        sourceId: card.id || card.name,
        timestamp: Date.now()
      };
    }
  }
  
  // Pattern 4: "Artifacts you control have [keyword]"
  for (const keyword of keywords) {
    const artifactGrantMatch = text.match(new RegExp(`artifacts you control have ${keyword}`, 'i'));
    if (artifactGrantMatch) {
      return {
        category: EFFECT_CATEGORIES.KEYWORD_GRANT,
        layer: LAYERS.ABILITY_EFFECTS,
        affectedFilter: {
          cardTypes: ['artifact'],
          controller: 'you',
          subtypes: null
        },
        modification: {
          keyword: keyword
        },
        source: card,
        sourceId: card.id || card.name,
        timestamp: Date.now()
      };
    }
  }
  
  return null;
}

/**
 * Parse cost reduction/increase effects
 * Pattern: "[Type] spells cost {X} less to cast"
 * 
 * @param {Object} card - Card with oracle text
 * @returns {Object|null} Effect object or null if no cost modification found
 */
export function parseCostReduction(card) {
  if (!card || !card.oracle_text) return null;
  
  const text = card.oracle_text.toLowerCase();
  
  // Spell types we can reduce costs for
  const spellTypes = [
    'creature', 'artifact', 'enchantment', 'instant', 
    'sorcery', 'planeswalker', 'legendary'
  ];
  
  // Pattern 1: "[Type] spells cost {X} less to cast"
  for (const spellType of spellTypes) {
    const reductionMatch = text.match(new RegExp(`${spellType} spells(?: you cast)? cost \\{(\\d+)\\} less`, 'i'));
    if (reductionMatch) {
      return {
        category: EFFECT_CATEGORIES.COST_MODIFICATION,
        layer: null, // Cost modifications don't use layers
        affectedFilter: {
          spellTypes: [spellType],
          isSpell: true
        },
        modification: {
          genericReduction: parseInt(reductionMatch[1]),
          genericIncrease: 0
        },
        source: card,
        sourceId: card.id || card.name,
        timestamp: Date.now()
      };
    }
  }
  
  // Pattern 2: "[Type] spells cost {X} more to cast"
  for (const spellType of spellTypes) {
    const increaseMatch = text.match(new RegExp(`${spellType} spells(?: you cast)? cost \\{(\\d+)\\} more`, 'i'));
    if (increaseMatch) {
      return {
        category: EFFECT_CATEGORIES.COST_MODIFICATION,
        layer: null,
        affectedFilter: {
          spellTypes: [spellType],
          isSpell: true
        },
        modification: {
          genericReduction: 0,
          genericIncrease: parseInt(increaseMatch[1])
        },
        source: card,
        sourceId: card.id || card.name,
        timestamp: Date.now()
      };
    }
  }
  
  // Pattern 3: "Spells cost {X} less to cast" (all spells)
  const allSpellsReductionMatch = text.match(/spells(?: you cast)? cost \{(\d+)\} less/i);
  if (allSpellsReductionMatch) {
    return {
      category: EFFECT_CATEGORIES.COST_MODIFICATION,
      layer: null,
      affectedFilter: {
        spellTypes: ['all'],
        isSpell: true
      },
      modification: {
        genericReduction: parseInt(allSpellsReductionMatch[1]),
        genericIncrease: 0
      },
      source: card,
      sourceId: card.id || card.name,
      timestamp: Date.now()
    };
  }
  
  return null;
}

/**
 * Detect all static effects on a card
 * Returns array of all detected effects
 * 
 * @param {Object} card - Card to analyze
 * @returns {Array} Array of effect objects
 */
export function detectAllStaticEffects(card) {
  const effects = [];
  
  // Try to detect anthem effect
  const anthem = parseAnthemEffect(card);
  if (anthem) {
    effects.push(anthem);
  }
  
  // Try to detect keyword grant
  const keywordGrant = parseKeywordGrant(card);
  if (keywordGrant) {
    effects.push(keywordGrant);
  }
  
  // Try to detect cost reduction
  const costMod = parseCostReduction(card);
  if (costMod) {
    effects.push(costMod);
  }
  
  return effects;
}

/**
 * Check if a permanent matches the effect's filter
 * Used to determine which permanents are affected by an effect
 * 
 * @param {Object} permanent - Permanent to check
 * @param {Object} effectFilter - Filter from effect object
 * @param {Object} sourceCard - Source of the effect (for excludeSelf check)
 * @returns {boolean} True if permanent matches filter
 */
export function permanentMatchesFilter(permanent, effectFilter, sourceCard) {
  if (!permanent || !effectFilter) return false;
  
  // Check card types
  if (effectFilter.cardTypes && effectFilter.cardTypes.length > 0) {
    const permanentCategory = permanent.category || permanent.type_line?.toLowerCase() || '';
    const hasMatchingType = effectFilter.cardTypes.some(type => 
      permanentCategory.includes(type) ||
      (permanent.types && permanent.types.some(t => t.toLowerCase().includes(type)))
    );
    
    if (!hasMatchingType) return false;
  }
  
  // Check controller (in goldfishing, all permanents are "you" controlled)
  if (effectFilter.controller === 'you') {
    // In goldfishing, we only have one player, so all permanents match
    // In a real game, we'd check permanent.controller === 'player'
  }
  
  // Check subtypes (e.g., "Goblin creatures")
  if (effectFilter.subtypes && effectFilter.subtypes.length > 0) {
    const permanentTypes = (permanent.type_line || '').toLowerCase();
    const permanentSubtypes = permanent.types?.map(t => t.toLowerCase()) || [];
    
    const hasMatchingSubtype = effectFilter.subtypes.some(subtype =>
      permanentTypes.includes(subtype) ||
      permanentSubtypes.includes(subtype)
    );
    
    if (!hasMatchingSubtype) return false;
  }
  
  // Check excludeSelf ("Other creatures you control")
  if (effectFilter.excludeSelf && sourceCard) {
    if (permanent.name === sourceCard.name || permanent.id === sourceCard.id) {
      return false;
    }
  }
  
  return true;
}

/**
 * Check if a spell matches cost modification filter
 * Used to determine if a spell's cost should be modified
 * 
 * @param {Object} spell - Spell being cast
 * @param {Object} effectFilter - Filter from cost modification effect
 * @returns {boolean} True if spell matches filter
 */
export function spellMatchesCostFilter(spell, effectFilter) {
  if (!spell || !effectFilter) return false;
  if (!effectFilter.isSpell) return false;
  
  // "All spells" matches everything
  if (effectFilter.spellTypes && effectFilter.spellTypes.includes('all')) {
    return true;
  }
  
  // Check if spell type matches
  if (effectFilter.spellTypes && effectFilter.spellTypes.length > 0) {
    const spellCategory = spell.category || '';
    const spellTypes = spell.types?.map(t => t.toLowerCase()) || [];
    const spellTypeLine = (spell.type_line || '').toLowerCase();
    
    const hasMatchingType = effectFilter.spellTypes.some(type =>
      spellCategory.includes(type) ||
      spellTypes.includes(type) ||
      spellTypeLine.includes(type)
    );
    
    return hasMatchingType;
  }
  
  return false;
}

/**
 * Get summary of all static effects on a card
 * Useful for logging and debugging
 * 
 * @param {Object} card - Card to analyze
 * @returns {Object} Summary object
 */
export function getStaticEffectsSummary(card) {
  const effects = detectAllStaticEffects(card);
  
  const summary = {
    cardName: card.name,
    hasStaticAbilities: effects.length > 0,
    effectCount: effects.length,
    effectTypes: effects.map(e => e.category),
    effects: effects.map(e => ({
      category: e.category,
      layer: e.layer,
      description: formatEffectDescription(e)
    }))
  };
  
  return summary;
}

/**
 * Format effect description for human-readable output
 * @param {Object} effect - Effect object
 * @returns {string} Human-readable description
 */
function formatEffectDescription(effect) {
  switch (effect.category) {
    case EFFECT_CATEGORIES.POWER_TOUGHNESS: {
      const sign = effect.modification.power >= 0 ? '+' : '';
      return `Creatures get ${sign}${effect.modification.power}/${sign}${effect.modification.toughness}`;
    }
    
    case EFFECT_CATEGORIES.KEYWORD_GRANT:
      return `Creatures have ${effect.modification.keyword}`;
    
    case EFFECT_CATEGORIES.COST_MODIFICATION:
      if (effect.modification.genericReduction > 0) {
        return `Spells cost {${effect.modification.genericReduction}} less`;
      } else if (effect.modification.genericIncrease > 0) {
        return `Spells cost {${effect.modification.genericIncrease}} more`;
      }
      return 'Cost modification';
    
    default:
      return effect.category;
  }
}

// ========== EXAMPLES & TESTING ==========

/**
 * Test the detector with example cards
 * Run this to verify detection is working
 */
export function testStaticEffectsDetector() {
  console.log('=== Static Effects Detector Test ===\n');
  
  const testCards = [
    {
      name: 'Glorious Anthem',
      oracle_text: 'Creatures you control get +1/+1.'
    },
    {
      name: 'Honor of the Pure',
      oracle_text: 'White creatures you control get +1/+1.'
    },
    {
      name: 'Favorable Winds',
      oracle_text: 'Creatures you control with flying get +1/+1.'
    },
    {
      name: 'Intangible Virtue',
      oracle_text: 'Creature tokens you control get +1/+1 and have vigilance.'
    },
    {
      name: 'Archetype of Courage',
      oracle_text: 'Creatures you control have first strike.\nCreatures your opponents control lose first strike and can\'t have or gain first strike.'
    },
    {
      name: 'Goblin Warchief',
      oracle_text: 'Goblin spells you cast cost {1} less to cast.\nGoblins you control have haste.'
    },
    {
      name: 'Herald\'s Horn',
      oracle_text: 'As Herald\'s Horn enters the battlefield, choose a creature type.\nCreature spells you cast cost {1} less to cast.'
    }
  ];
  
  testCards.forEach(card => {
    console.log(`\nTesting: ${card.name}`);
    console.log(`Oracle text: ${card.oracle_text}`);
    
    const effects = detectAllStaticEffects(card);
    
    if (effects.length === 0) {
      console.log('  ❌ No effects detected');
    } else {
      effects.forEach(effect => {
        console.log(`  ✅ Detected: ${effect.category}`);
        console.log(`     Layer: ${effect.layer || 'N/A'}`);
        console.log(`     Description: ${formatEffectDescription(effect)}`);
      });
    }
  });
  
  console.log('\n=== Test Complete ===');
}

// Uncomment to run tests:
// testStaticEffectsDetector();
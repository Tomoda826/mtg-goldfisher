// Effect Registry - Phase 2B Week 1
// Stores and manages all active static effects in the game
// Automatically updates when permanents enter/leave battlefield

import {
  detectAllStaticEffects,
  EFFECT_CATEGORIES,
  LAYERS
} from './staticEffectsDetector.js';

/**
 * Effect Registry Class
 * Manages all active static effects in the game
 */
export class EffectRegistry {
  constructor() {
    // Map of source ID -> array of effects
    // This allows fast lookup and removal when source leaves
    this.effectsBySource = new Map();
    
    // Flat array of all effects for easy iteration
    this.allEffects = [];
    
    // Statistics for debugging
    this.stats = {
      totalEffectsRegistered: 0,
      totalEffectsRemoved: 0,
      currentActiveEffects: 0
    };
  }
  
  /**
   * Register all effects from a permanent that entered the battlefield
   * @param {Object} permanent - Permanent that just entered
   */
  registerPermanent(permanent) {
    if (!permanent) return;
    
    // Detect static effects on this card
    const effects = detectAllStaticEffects(permanent);
    
    if (effects.length === 0) return;
    
    // Generate unique ID for this permanent if it doesn't have one
    const sourceId = permanent.id || permanent.name + '_' + Date.now();
    permanent.id = sourceId; // Store ID on permanent for future reference
    
    // Store effects indexed by source
    this.effectsBySource.set(sourceId, effects);
    
    // Add to flat array
    this.allEffects.push(...effects);
    
    // Update stats
    this.stats.totalEffectsRegistered += effects.length;
    this.stats.currentActiveEffects = this.allEffects.length;
    
    // Log registration
    console.log(`📝 Registered ${effects.length} static effect(s) from ${permanent.name}`);
    effects.forEach(effect => {
      console.log(`   - ${effect.category} (Layer ${effect.layer || 'N/A'})`);
    });
  }
  
  /**
   * Remove all effects from a permanent that left the battlefield
   * @param {Object} permanent - Permanent that just left
   */
  unregisterPermanent(permanent) {
    if (!permanent) return;
    
    const sourceId = permanent.id || permanent.name;
    
    // Get effects from this source
    const effects = this.effectsBySource.get(sourceId);
    
    if (!effects || effects.length === 0) return;
    
    // Remove from source map
    this.effectsBySource.delete(sourceId);
    
    // Remove from flat array
    effects.forEach(effect => {
      const index = this.allEffects.findIndex(e => 
        e.sourceId === sourceId && e.category === effect.category
      );
      if (index !== -1) {
        this.allEffects.splice(index, 1);
      }
    });
    
    // Update stats
    this.stats.totalEffectsRemoved += effects.length;
    this.stats.currentActiveEffects = this.allEffects.length;
    
    // Log removal
    console.log(`🗑️ Removed ${effects.length} static effect(s) from ${permanent.name}`);
  }
  
  /**
   * Scan entire battlefield and register all static effects
   * Call this after game state changes significantly
   * 
   * @param {Object} game - Game state with battlefield
   */
  scanBattlefield(game) {
    // Clear existing registry
    this.clear();
    
    // Scan all permanent zones
    const zones = ['creatures', 'artifacts', 'enchantments', 'planeswalkers'];
    let totalScanned = 0;
    let totalFound = 0;
    
    zones.forEach(zone => {
      if (game.battlefield[zone] && Array.isArray(game.battlefield[zone])) {
        game.battlefield[zone].forEach(permanent => {
          totalScanned++;
          const effects = detectAllStaticEffects(permanent);
          if (effects.length > 0) {
            this.registerPermanent(permanent);
            totalFound += effects.length;
          }
        });
      }
    });
    
    console.log(`🔍 Battlefield scan complete: ${totalScanned} permanents, ${totalFound} effects found`);
  }
  
  /**
   * Get all effects of a specific category
   * @param {string} category - Effect category from EFFECT_CATEGORIES
   * @returns {Array} Array of effects
   */
  getEffectsByCategory(category) {
    return this.allEffects.filter(e => e.category === category);
  }
  
  /**
   * Get all effects in a specific layer
   * @param {number} layer - Layer number from LAYERS
   * @returns {Array} Array of effects
   */
  getEffectsByLayer(layer) {
    return this.allEffects.filter(e => e.layer === layer);
  }
  
  /**
   * Get all cost modification effects
   * @returns {Array} Array of cost modification effects
   */
  getCostModificationEffects() {
    return this.getEffectsByCategory(EFFECT_CATEGORIES.COST_MODIFICATION);
  }
  
  /**
   * Get all anthem (P/T modification) effects
   * @returns {Array} Array of anthem effects
   */
  getAnthemEffects() {
    return this.getEffectsByCategory(EFFECT_CATEGORIES.POWER_TOUGHNESS);
  }
  
  /**
   * Get all keyword grant effects
   * @returns {Array} Array of keyword grant effects
   */
  getKeywordGrantEffects() {
    return this.getEffectsByCategory(EFFECT_CATEGORIES.KEYWORD_GRANT);
  }
  
  /**
   * Check if a specific permanent has registered effects
   * @param {Object} permanent - Permanent to check
   * @returns {boolean} True if has registered effects
   */
  hasEffects(permanent) {
    if (!permanent) return false;
    const sourceId = permanent.id || permanent.name;
    return this.effectsBySource.has(sourceId);
  }
  
  /**
   * Get all effects from a specific source
   * @param {Object} permanent - Source permanent
   * @returns {Array} Array of effects
   */
  getEffectsFromSource(permanent) {
    if (!permanent) return [];
    const sourceId = permanent.id || permanent.name;
    return this.effectsBySource.get(sourceId) || [];
  }
  
  /**
   * Count total active effects
   * @returns {number} Number of active effects
   */
  count() {
    return this.allEffects.length;
  }
  
  /**
   * Check if registry is empty
   * @returns {boolean} True if no effects registered
   */
  isEmpty() {
    return this.allEffects.length === 0;
  }
  
  /**
   * Clear all effects (use with caution)
   */
  clear() {
    this.effectsBySource.clear();
    this.allEffects = [];
    this.stats.currentActiveEffects = 0;
  }
  
  /**
   * Get registry statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      effectsByCategory: this.getEffectBreakdown(),
      effectsByLayer: this.getLayerBreakdown()
    };
  }
  
  /**
   * Get breakdown of effects by category
   * @returns {Object} Category counts
   */
  getEffectBreakdown() {
    const breakdown = {};
    
    Object.values(EFFECT_CATEGORIES).forEach(category => {
      breakdown[category] = this.getEffectsByCategory(category).length;
    });
    
    return breakdown;
  }
  
  /**
   * Get breakdown of effects by layer
   * @returns {Object} Layer counts
   */
  getLayerBreakdown() {
    const breakdown = {};
    
    Object.values(LAYERS).forEach(layer => {
      breakdown[layer] = this.getEffectsByLayer(layer).length;
    });
    
    // Add cost modifications (no layer)
    breakdown['cost_mods'] = this.getCostModificationEffects().length;
    
    return breakdown;
  }
  
  /**
   * Get human-readable summary of registry
   * @returns {string} Summary string
   */
  getSummary() {
    if (this.isEmpty()) {
      return 'No static effects active';
    }
    
    const anthems = this.getAnthemEffects().length;
    const keywords = this.getKeywordGrantEffects().length;
    const costMods = this.getCostModificationEffects().length;
    
    const parts = [];
    if (anthems > 0) parts.push(`${anthems} anthem(s)`);
    if (keywords > 0) parts.push(`${keywords} keyword grant(s)`);
    if (costMods > 0) parts.push(`${costMods} cost modification(s)`);
    
    return `${this.count()} active effect(s): ${parts.join(', ')}`;
  }
  
  /**
   * Log detailed registry information to console
   * Useful for debugging
   */
  logDetails() {
    console.log('\n=== Effect Registry Details ===');
    console.log(`Total effects: ${this.count()}`);
    
    if (this.isEmpty()) {
      console.log('Registry is empty');
      return;
    }
    
    console.log('\nBy Category:');
    const breakdown = this.getEffectBreakdown();
    Object.entries(breakdown).forEach(([category, count]) => {
      if (count > 0) {
        console.log(`  ${category}: ${count}`);
      }
    });
    
    console.log('\nBy Layer:');
    const layerBreakdown = this.getLayerBreakdown();
    Object.entries(layerBreakdown).forEach(([layer, count]) => {
      if (count > 0) {
        console.log(`  Layer ${layer}: ${count}`);
      }
    });
    
    console.log('\nBy Source:');
    this.effectsBySource.forEach((effects, sourceId) => {
      console.log(`  ${sourceId}: ${effects.length} effect(s)`);
      effects.forEach(effect => {
        console.log(`    - ${effect.category}`);
      });
    });
    
    console.log('\nStatistics:');
    console.log(`  Total registered: ${this.stats.totalEffectsRegistered}`);
    console.log(`  Total removed: ${this.stats.totalEffectsRemoved}`);
    console.log(`  Currently active: ${this.stats.currentActiveEffects}`);
    
    console.log('==============================\n');
  }
}

/**
 * Helper function to update registry when battlefield changes
 * Call this after permanents enter or leave battlefield
 * 
 * @param {EffectRegistry} registry - The effect registry
 * @param {Object} game - Game state
 */
export function updateRegistryFromBattlefield(registry, game) {
  if (!registry || !game) return;
  
  // Simple approach: rescan entire battlefield
  // More efficient: track changes and only update what changed
  registry.scanBattlefield(game);
}

/**
 * Helper function to initialize registry for a game
 * @param {Object} game - Game state
 * @returns {EffectRegistry} New registry with battlefield scanned
 */
export function createRegistryForGame(game) {
  const registry = new EffectRegistry();
  registry.scanBattlefield(game);
  return registry;
}

// ========== EXAMPLES & TESTING ==========

/**
 * Test the registry with sample game state
 */
export function testEffectRegistry() {
  console.log('=== Effect Registry Test ===\n');
  
  // Create mock game state
  const mockGame = {
    battlefield: {
      creatures: [
        {
          name: 'Glorious Anthem',
          category: 'enchantment',
          oracle_text: 'Creatures you control get +1/+1.'
        }
      ],
      artifacts: [
        {
          name: 'Herald\'s Horn',
          category: 'artifact',
          oracle_text: 'As Herald\'s Horn enters the battlefield, choose a creature type.\nCreature spells you cast cost {1} less to cast.'
        }
      ],
      enchantments: [
        {
          name: 'Intangible Virtue',
          category: 'enchantment',
          oracle_text: 'Creature tokens you control get +1/+1 and have vigilance.'
        }
      ],
      planeswalkers: []
    }
  };
  
  // Create and populate registry
  const registry = new EffectRegistry();
  console.log('1. Scanning battlefield...');
  registry.scanBattlefield(mockGame);
  
  console.log('\n2. Registry summary:');
  console.log(`   ${registry.getSummary()}`);
  
  console.log('\n3. Checking specific categories:');
  console.log(`   Anthems: ${registry.getAnthemEffects().length}`);
  console.log(`   Keyword grants: ${registry.getKeywordGrantEffects().length}`);
  console.log(`   Cost modifications: ${registry.getCostModificationEffects().length}`);
  
  console.log('\n4. Adding a new permanent...');
  const newPermanent = {
    name: 'Archetype of Courage',
    category: 'creature',
    oracle_text: 'Creatures you control have first strike.'
  };
  registry.registerPermanent(newPermanent);
  
  console.log('\n5. Updated summary:');
  console.log(`   ${registry.getSummary()}`);
  
  console.log('\n6. Removing a permanent...');
  registry.unregisterPermanent(mockGame.battlefield.creatures[0]);
  
  console.log('\n7. Final summary:');
  console.log(`   ${registry.getSummary()}`);
  
  console.log('\n8. Full registry details:');
  registry.logDetails();
  
  console.log('=== Test Complete ===');
}

// Uncomment to run tests:
// testEffectRegistry();
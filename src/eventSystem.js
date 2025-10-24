// Event System - Phase 1: Foundation
// Provides event-driven architecture for trigger handling and game mechanics

/**
 * Standard Event Types (Constants)
 * Based on MTG Comprehensive Rules 603 & 608
 */
export const EVENT_TYPES = {
  // Spell/Ability Events
  SPELL_CAST: 'SPELL_CAST',                           // When spell goes on stack
  ABILITY_ACTIVATED: 'ABILITY_ACTIVATED',             // When ability is activated
  ABILITY_RESOLVED: 'ABILITY_RESOLVED',               // When ability resolves
  
  // Permanent Events
  PERMANENT_ENTERS_BATTLEFIELD: 'PERMANENT_ENTERS_BATTLEFIELD',  // When permanent enters (ETB)
  PERMANENT_LEAVES_BATTLEFIELD: 'PERMANENT_LEAVES_BATTLEFIELD',  // When permanent leaves
  
  // Combat Events
  CREATURE_ATTACKS: 'CREATURE_ATTACKS',               // When creature declares attack
  COMBAT_DAMAGE_DEALT: 'COMBAT_DAMAGE_DEALT',        // When combat damage is dealt
  CREATURE_DIES: 'CREATURE_DIES',                     // When creature goes to graveyard from battlefield
  
  // Card Movement Events
  CARD_DRAWN: 'CARD_DRAWN',                           // When player draws
  CARD_DISCARDED: 'CARD_DISCARDED',                   // When player discards
  
  // Phase/Step Events
  PHASE_CHANGED: 'PHASE_CHANGED',                     // When game phase changes
  TURN_BEGAN: 'TURN_BEGAN',                           // When new turn starts
  TURN_ENDED: 'TURN_ENDED',                           // When turn ends
  
  // Counter Events
  COUNTER_ADDED: 'COUNTER_ADDED',                     // When counter added to permanent
  COUNTER_REMOVED: 'COUNTER_REMOVED',                 // When counter removed
  
  // Life Events
  LIFE_GAINED: 'LIFE_GAINED',                         // When player gains life
  LIFE_LOST: 'LIFE_LOST',                             // When player loses life
  
  // Special Mechanics (Phase 4)
  RING_TEMPTS_YOU: 'RING_TEMPTS_YOU',                 // When Ring tempts you
  
  // Token Events
  TOKEN_CREATED: 'TOKEN_CREATED',                     // When token is created
  
  // Scry Events
  SCRY_RESOLVED: 'SCRY_RESOLVED',                     // When scry effect resolves
};

/**
 * Event Payload Structure
 * @typedef {Object} GameEvent
 * @property {string} type - Event type from EVENT_TYPES
 * @property {Object} source - Card/permanent that caused event
 * @property {Object|null} target - Target if applicable
 * @property {string} player - 'player' or 'opponent'
 * @property {Object} context - Event-specific data
 * @property {number} timestamp - When event occurred
 */

/**
 * Event Emitter Class
 * Handles event registration, emission, and queuing
 * Based on MTG Rule 603.3 (triggered abilities use the stack)
 */
export class EventEmitter {
  constructor() {
    // Map of event types to arrays of listener callbacks
    // Structure: Map<eventType, Array<{callback, context, once}>>
    this.listeners = new Map();
    
    // FIFO queue for events waiting to be processed
    // Events are processed in order they were emitted (603.3b simplified)
    this.eventQueue = [];
    
    // Track if we're currently processing to prevent infinite loops
    this.isProcessing = false;
    
    // Statistics for debugging
    this.stats = {
      totalEmitted: 0,
      totalProcessed: 0,
      byType: {}
    };
  }
  
  /**
   * Register a listener for an event type
   * @param {string} eventType - Event type from EVENT_TYPES
   * @param {Function} callback - Function to call when event fires
   * @param {Object} context - Optional context for callback
   */
  on(eventType, callback, context = null) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType).push({
      callback,
      context,
      once: false
    });
  }
  
  /**
   * Register a one-time listener
   * @param {string} eventType - Event type from EVENT_TYPES
   * @param {Function} callback - Function to call when event fires
   * @param {Object} context - Optional context for callback
   */
  once(eventType, callback, context = null) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    
    this.listeners.get(eventType).push({
      callback,
      context,
      once: true
    });
  }
  
  /**
   * Unregister a listener
   * @param {string} eventType - Event type
   * @param {Function} callback - Callback to remove
   */
  off(eventType, callback) {
    if (!this.listeners.has(eventType)) return;
    
    const listeners = this.listeners.get(eventType);
    const index = listeners.findIndex(l => l.callback === callback);
    
    if (index !== -1) {
      listeners.splice(index, 1);
    }
    
    // Clean up empty listener arrays
    if (listeners.length === 0) {
      this.listeners.delete(eventType);
    }
  }
  
  /**
   * Emit an event (adds to queue, doesn't process immediately)
   * Based on MTG Rule 603.2: "The ability doesn't do anything at this point"
   * @param {GameEvent} event - Event payload
   */
  emit(event) {
    // Validate event has required fields
    if (!event.type) {
      console.error('❌ Event missing type:', event);
      return;
    }
    
    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = Date.now();
    }
    
    // Add to queue (FIFO)
    this.eventQueue.push(event);
    
    // Update statistics
    this.stats.totalEmitted++;
    this.stats.byType[event.type] = (this.stats.byType[event.type] || 0) + 1;
    
    // Debug log
    console.log(`📤 Event Emitted: ${event.type}`, {
      source: event.source?.name || 'unknown',
      queueSize: this.eventQueue.length
    });
  }
  
  /**
   * Process all events in queue (FIFO order)
   * Based on MTG Rule 603.3b: Process triggers in order
   * @returns {number} Number of events processed
   */
  processEventQueue() {
    // Prevent recursive processing
    if (this.isProcessing) {
      console.warn('⚠️ Already processing events, skipping recursive call');
      return 0;
    }
    
    this.isProcessing = true;
    let processedCount = 0;
    
    try {
      // Process events FIFO
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();
        this.processEvent(event);
        processedCount++;
        this.stats.totalProcessed++;
      }
    } catch (error) {
      console.error('❌ Error processing event queue:', error);
    } finally {
      this.isProcessing = false;
    }
    
    return processedCount;
  }
  
  /**
   * Process a single event (call all registered listeners)
   * @param {GameEvent} event - Event to process
   * @private
   */
  processEvent(event) {
    const listeners = this.listeners.get(event.type);
    
    if (!listeners || listeners.length === 0) {
      return;
    }
    
    console.log(`🔔 Processing Event: ${event.type} (${listeners.length} listeners)`);
    
    // Call each listener
    // Note: We iterate over a copy in case listeners modify the array
    const listenersCopy = [...listeners];
    
    for (const listener of listenersCopy) {
      try {
        // Call with context if provided
        if (listener.context) {
          listener.callback.call(listener.context, event);
        } else {
          listener.callback(event);
        }
        
        // Remove one-time listeners
        if (listener.once) {
          this.off(event.type, listener.callback);
        }
      } catch (error) {
        console.error(`❌ Error in event listener for ${event.type}:`, error);
      }
    }
  }
  
  /**
   * Clear all events from queue (use with caution)
   */
  clearQueue() {
    const cleared = this.eventQueue.length;
    this.eventQueue = [];
    console.log(`🗑️ Cleared ${cleared} events from queue`);
    return cleared;
  }
  
  /**
   * Get current queue size
   * @returns {number} Number of events in queue
   */
  getQueueSize() {
    return this.eventQueue.length;
  }
  
  /**
   * Check if specific event type has listeners
   * @param {string} eventType - Event type to check
   * @returns {boolean} True if has listeners
   */
  hasListeners(eventType) {
    return this.listeners.has(eventType) && this.listeners.get(eventType).length > 0;
  }
  
  /**
   * Get statistics about event system
   * @returns {Object} Statistics object
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.eventQueue.length,
      listenerTypes: Array.from(this.listeners.keys())
    };
  }
  
  /**
   * Reset event system (for testing)
   */
  reset() {
    this.listeners.clear();
    this.eventQueue = [];
    this.isProcessing = false;
    this.stats = {
      totalEmitted: 0,
      totalProcessed: 0,
      byType: {}
    };
  }
}

/**
 * Helper function to create properly formatted events
 * @param {string} type - Event type from EVENT_TYPES
 * @param {Object} source - Source card/permanent
 * @param {Object} context - Additional context data
 * @returns {GameEvent} Formatted event object
 */
export function createEvent(type, source, context = {}) {
  return {
    type,
    source: source || null,
    target: context.target || null,
    player: context.player || 'player',
    context: {
      ...context,
      zone: context.zone || null,
      phase: context.phase || null,
      amount: context.amount || null
    },
    timestamp: Date.now()
  };
}

/**
 * Export singleton instance for convenience
 * (Can also create new instances if needed)
 */
export default EventEmitter;
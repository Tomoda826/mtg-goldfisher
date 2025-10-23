/**
 * Centralized Error Handling System for MTG Commander Goldfisher
 * 
 * Provides consistent error handling, logging, and fallback mechanisms
 * across all Phase 2 modules (AI analysis, game engines, deck analysis)
 */

/**
 * Safely check if we're in development mode
 * Works in both Node.js and browser environments
 */
const isDevelopmentMode = () => {
  try {
    // Check for Node.js process.env
    // eslint-disable-next-line no-undef
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
      // eslint-disable-next-line no-undef
      return process.env.NODE_ENV !== 'production';
    }
    // Check for Vite environment variable
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE) {
      return import.meta.env.MODE === 'development';
    }
    // Default to true for development (shows more info when unsure)
    return true;
  } catch {
    return true;
  }
};

/**
 * Custom error class for AI-related errors
 */
export class AIAnalysisError extends Error {
  constructor(message, originalError = null, context = {}) {
    super(message);
    this.name = 'AIAnalysisError';
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isRecoverable = true; // Most AI errors are recoverable with fallbacks
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      isRecoverable: this.isRecoverable,
      originalError: this.originalError?.message || null
    };
  }
}

/**
 * Custom error class for game engine errors
 */
export class GameEngineError extends Error {
  constructor(message, originalError = null, context = {}) {
    super(message);
    this.name = 'GameEngineError';
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isRecoverable = false; // Game errors might not be recoverable
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      isRecoverable: this.isRecoverable,
      originalError: this.originalError?.message || null
    };
  }
}

/**
 * Custom error class for deck analysis errors
 */
export class DeckAnalysisError extends Error {
  constructor(message, originalError = null, context = {}) {
    super(message);
    this.name = 'DeckAnalysisError';
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
    this.isRecoverable = true;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      isRecoverable: this.isRecoverable,
      originalError: this.originalError?.message || null
    };
  }
}

/**
 * Standard success response format
 */
export const createSuccessResponse = (data = {}, metadata = {}) => {
  return {
    success: true,
    timestamp: new Date().toISOString(),
    ...data,
    metadata: {
      source: 'errorHandler',
      ...metadata
    }
  };
};

/**
 * Standard error response format
 */
export const createErrorResponse = (error, fallbackData = null, context = {}) => {
  const errorObj = {
    success: false,
    error: error?.message || 'Unknown error',
    errorType: error?.name || 'Error',
    timestamp: new Date().toISOString(),
    context,
    isRecoverable: error?.isRecoverable ?? true
  };

  // Include fallback data if provided
  if (fallbackData !== null) {
    errorObj.fallbackData = fallbackData;
    errorObj.usingFallback = true;
  }

  // Include original error for debugging (but sanitize for production)
  if (isDevelopmentMode() && error?.originalError) {
    errorObj.originalError = error.originalError.message;
    errorObj.stack = error.originalError.stack;
  }

  return errorObj;
};

/**
 * Wrap an async function with consistent error handling and optional fallback
 * 
 * @param {Function} fn - The async function to wrap
 * @param {Function} fallbackFn - Optional fallback function to call on error
 * @param {string} functionName - Name of the function for logging
 * @param {Object} options - Additional options
 * @returns {Function} - Wrapped function
 */
export const wrapAIFunction = (fn, fallbackFn = null, functionName = 'unknown', options = {}) => {
  const {
    logErrors = true,
    throwOnError = false,
    retryCount = 0,
    retryDelay = 1000,
    timeout = 30000
  } = options;

  return async (...args) => {
    let lastError = null;

    // Retry logic
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        // Add timeout wrapper
        const result = await Promise.race([
          fn(...args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
          )
        ]);

        return createSuccessResponse(result, {
          functionName,
          attempt: attempt + 1,
          retriesUsed: attempt
        });

      } catch (error) {
        lastError = error;

        if (logErrors) {
          console.error(`[${functionName}] Attempt ${attempt + 1}/${retryCount + 1} failed:`, {
            error: error.message,
            context: error.context || {},
            args: args.map(arg => typeof arg === 'object' ? Object.keys(arg) : typeof arg)
          });
        }

        // If not last attempt, wait before retrying
        if (attempt < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
          if (logErrors) {
            console.log(`[${functionName}] Retrying... (${attempt + 1}/${retryCount})`);
          }
          continue;
        }

        // Last attempt failed, try fallback
        if (fallbackFn) {
          try {
            if (logErrors) {
              console.log(`[${functionName}] Using fallback function`);
            }

            const fallbackResult = await fallbackFn(...args);
            
            return {
              success: true,
              usedFallback: true,
              ...fallbackResult,
              metadata: {
                functionName,
                fallbackUsed: true,
                originalError: error.message,
                timestamp: new Date().toISOString()
              }
            };

          } catch (fallbackError) {
            if (logErrors) {
              console.error(`[${functionName}] Fallback also failed:`, fallbackError.message);
            }
            
            if (throwOnError) {
              throw new AIAnalysisError(
                `Both primary and fallback failed for ${functionName}`,
                fallbackError,
                { functionName, originalError: error.message }
              );
            }

            return createErrorResponse(
              fallbackError,
              null,
              { functionName, primaryError: error.message, fallbackError: fallbackError.message }
            );
          }
        }

        // No fallback, return error response
        if (throwOnError) {
          throw new AIAnalysisError(
            `Function ${functionName} failed`,
            error,
            { functionName }
          );
        }

        return createErrorResponse(error, null, { functionName, retriesAttempted: attempt + 1 });
      }
    }

    // Should not reach here, but safety net
    return createErrorResponse(lastError, null, { functionName, unexpected: true });
  };
};

/**
 * Wrap a synchronous function with error handling
 * 
 * @param {Function} fn - The synchronous function to wrap
 * @param {Function} fallbackFn - Optional fallback function
 * @param {string} functionName - Name of the function
 * @returns {Function} - Wrapped function
 */
export const wrapSyncFunction = (fn, fallbackFn = null, functionName = 'unknown') => {
  return (...args) => {
    try {
      const result = fn(...args);
      return createSuccessResponse(result, { functionName });

    } catch (error) {
      console.error(`[${functionName}] Error:`, error.message);

      if (fallbackFn) {
        try {
          console.log(`[${functionName}] Using fallback`);
          const fallbackResult = fallbackFn(...args);
          
          return {
            success: true,
            usedFallback: true,
            ...fallbackResult,
            metadata: {
              functionName,
              fallbackUsed: true,
              originalError: error.message
            }
          };

        } catch (fallbackError) {
          console.error(`[${functionName}] Fallback failed:`, fallbackError.message);
          
          return createErrorResponse(
            fallbackError,
            null,
            { functionName, primaryError: error.message }
          );
        }
      }

      return createErrorResponse(error, null, { functionName });
    }
  };
};

/**
 * Validate required fields in an object
 */
export const validateRequiredFields = (obj, requiredFields, objectName = 'object') => {
  const missingFields = requiredFields.filter(field => !(field in obj));
  
  if (missingFields.length > 0) {
    throw new DeckAnalysisError(
      `Missing required fields in ${objectName}: ${missingFields.join(', ')}`,
      null,
      { objectName, missingFields, receivedFields: Object.keys(obj) }
    );
  }
  
  return true;
};

/**
 * Safe JSON parse with error handling
 */
export const safeJSONParse = (jsonString, fallbackValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON Parse Error:', error.message);
    return fallbackValue;
  }
};

/**
 * Log error with context for debugging
 */
export const logError = (error, context = {}, severity = 'error') => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    severity,
    message: error?.message || 'Unknown error',
    name: error?.name || 'Error',
    context,
    stack: isDevelopmentMode() ? error?.stack : undefined
  };

  if (severity === 'error') {
    console.error(`[${timestamp}] ERROR:`, logEntry);
  } else if (severity === 'warning') {
    console.warn(`[${timestamp}] WARNING:`, logEntry);
  } else {
    console.log(`[${timestamp}] INFO:`, logEntry);
  }

  return logEntry;
};

/**
 * Batch error handler for multiple operations
 */
export const handleBatchOperations = async (operations, options = {}) => {
  const {
    continueOnError = true,
    logErrors = true,
    returnPartialResults = true
  } = options;

  const results = [];
  const errors = [];

  for (let i = 0; i < operations.length; i++) {
    const { fn, args = [], name = `operation_${i}` } = operations[i];
    
    try {
      const result = await fn(...args);
      results.push({ success: true, name, result });
    } catch (error) {
      if (logErrors) {
        console.error(`Batch operation ${name} failed:`, error.message);
      }
      
      errors.push({ success: false, name, error: error.message });
      
      if (!continueOnError) {
        break;
      }
    }
  }

  return {
    success: errors.length === 0,
    totalOperations: operations.length,
    successCount: results.length,
    errorCount: errors.length,
    results: returnPartialResults ? results : (errors.length === 0 ? results : []),
    errors
  };
};

/**
 * Rate limit handler (useful for API calls)
 */
export class RateLimiter {
  constructor(maxCalls = 60, windowMs = 60000) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
    this.calls = [];
  }

  async acquire() {
    const now = Date.now();
    
    // Remove old calls outside the window
    this.calls = this.calls.filter(time => now - time < this.windowMs);
    
    if (this.calls.length >= this.maxCalls) {
      const oldestCall = this.calls[0];
      const waitTime = this.windowMs - (now - oldestCall);
      
      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      return this.acquire(); // Try again after waiting
    }
    
    this.calls.push(now);
    return true;
  }
}

/**
 * Circuit breaker pattern for failing services
 */
export class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureThreshold = threshold;
    this.timeout = timeout;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }

  async execute(fn, ...args) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN. Service unavailable.');
      }
    }

    try {
      const result = await fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
  }
}

/**
 * Export all utilities
 */
export default {
  AIAnalysisError,
  GameEngineError,
  DeckAnalysisError,
  createSuccessResponse,
  createErrorResponse,
  wrapAIFunction,
  wrapSyncFunction,
  validateRequiredFields,
  safeJSONParse,
  logError,
  handleBatchOperations,
  RateLimiter,
  CircuitBreaker
};
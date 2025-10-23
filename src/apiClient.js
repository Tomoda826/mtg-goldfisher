// Centralized OpenAI API Client
// Eliminates duplicate API call logic across all AI modules

import { OPENAI_API_KEY, OPENAI_API_URL } from './config.js';

/**
 * Call OpenAI API with automatic error handling and retries
 * 
 * @param {Array} messages - Array of message objects with role and content
 * @param {number} maxTokens - Maximum completion tokens (default: 12500)
 * @param {Object} options - Additional options
 * @param {string} options.model - Model to use (default: 'gpt-5-mini')
 * @param {number} options.temperature - Temperature setting (default: 1)
 * @param {Object} options.responseFormat - Response format (default: JSON object)
 * @param {number} options.retries - Number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Initial retry delay in ms (default: 1000)
 * @returns {Promise<Object|string>} Parsed JSON object or string content
 */
export const callOpenAI = async (messages, maxTokens = 12500, options = {}) => {
  const {
    model = 'gpt-5-mini',
    temperature = 1,
    responseFormat = { type: "json_object" },
    retries = 3,
    retryDelay = 1000
  } = options;

  // Validate API key
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_API_KEY_HERE') {
    throw new Error('OpenAI API key not configured. Please add your API key to config.js');
  }
  
  // Attempt API call with retries
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_completion_tokens: maxTokens,
          response_format: responseFormat
        })
      });

      // Handle HTTP errors
      if (!response.ok) {
        let errorMessage = `OpenAI API error: ${response.status}`;
        let errorData = null;
        
        try {
          errorData = await response.json();
          console.error('Full OpenAI Error Response:', JSON.stringify(errorData, null, 2));
          errorMessage = errorData?.error?.message || errorMessage;
        } catch {
          const errorText = await response.text();
          console.error('OpenAI Error (raw text):', errorText);
        }
        
        // Check if error is retryable (rate limit or server error)
        if (response.status === 429 || response.status >= 500) {
          if (attempt < retries - 1) {
            const delay = retryDelay * (attempt + 1);
            console.log(`Retrying after ${delay}ms (attempt ${attempt + 1}/${retries})...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
        }
        
        throw new Error(errorMessage);
      }

      // Parse response
      const data = await response.json();
      
      // Log response details for debugging (only on first attempt)
      if (attempt === 0) {
        console.log('API Response received:', {
          model: data.model,
          finishReason: data.choices?.[0]?.finish_reason,
          hasContent: !!data.choices?.[0]?.message?.content
        });
      }
      
      // Validate response structure
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response structure from OpenAI');
      }
      
      const message = data.choices[0].message;
      const content = message.content;
      
      // Check for refusal
      if (message.refusal) {
        throw new Error(`OpenAI refused the request: ${message.refusal}`);
      }
      
      // Validate content exists
      if (!content || content.trim() === '') {
        console.error('Complete response data:', JSON.stringify(data, null, 2));
        throw new Error('Empty response from OpenAI - check console for full response');
      }
      
      // Parse JSON if response_format is json_object
      if (responseFormat?.type === 'json_object') {
        try {
          return JSON.parse(content);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', content);
          throw new Error(`Invalid JSON in response: ${parseError.message}`);
        }
      }
      
      // Return raw content for non-JSON responses
      return content;
      
    } catch (error) {
      // If this was the last retry, throw the error
      if (attempt === retries - 1) {
        throw error;
      }
      
      // Log retry attempt
      console.log(`Attempt ${attempt + 1} failed: ${error.message}. Retrying...`);
    }
  }
};

/**
 * System prompts for different analysis types
 * Centralized to ensure consistency across all AI modules
 */
export const SYSTEM_PROMPTS = {
  /**
   * Comprehensive deck analysis
   */
  deckAnalysis: 'You are a highly skilled Magic: The Gathering player with deep knowledge of Commander format, optimal play patterns, and strategic decision-making. IMPORTANT: You are GOLDFISHING (testing the deck solo). This means: (1) Assume all targeted spells have valid targets - cast removal, counterspells, and interaction as if opponents and their permanents exist. (2) The goal is to test mana efficiency and deck flow, so cast any spell you can afford. (3) Targeted removal should be cast to empty your hand and trigger spell-matters effects.',
  
  /**
   * Combo and interaction analysis
   */
  comboAnalysis: 'You are an expert Magic: The Gathering combo analyst with encyclopedic knowledge of card interactions, infinite combos, and synergies across all sets. You can identify complex interactions and explain them clearly.',
  
  /**
   * Mulligan decisions
   */
  mulliganDecision: 'You are an expert MTG player with deep knowledge of Commander mulligan decisions. You understand the London Mulligan rule and evaluate hands based on land count, color requirements, early plays, and deck strategy.',
  
  /**
   * Turn-by-turn gameplay decisions
   */
  turnDecision: 'You are a highly skilled Magic: The Gathering player with deep knowledge of Commander format, optimal play patterns, and strategic decision-making.',
  
  /**
   * Deck building and upgrades
   */
  deckBuilding: 'You are an MTG deck building expert with knowledge of card prices and alternatives.',
  
  /**
   * Card interaction analysis
   */
  cardInteraction: 'You are an MTG card interaction expert.',
  
  /**
   * Synergy detection
   */
  synergyDetection: 'You are an MTG deck building expert who identifies missing synergies.',
  
  /**
   * Deck optimization
   */
  optimization: 'You are an MTG deck optimization expert.'
};

/**
 * Helper function to create a standardized error response
 */
export const createErrorResponse = (error, fallbackData = null) => {
  console.error('OpenAI API Error:', error);
  console.error('Error details:', {
    message: error.message,
    stack: error.stack
  });
  
  return {
    success: false,
    error: error.message,
    ...(fallbackData && { fallbackData })
  };
};

/**
 * Helper function to create a standardized success response
 */
export const createSuccessResponse = (data, model = 'gpt-5-mini') => {
  return {
    success: true,
    data,
    model,
    timestamp: new Date().toISOString()
  };
};
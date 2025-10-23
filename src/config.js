// Centralized Configuration for MTG Commander Goldfisher
// DO NOT commit API keys to source control

/**
 * OpenAI API Configuration
 * Set OPENAI_API_KEY environment variable before running
 * 
 * For development:
 * - Create .env.local file with: OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
 * - Or set in terminal: export OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE
 * 
 * For production:
 * - Set environment variable in your hosting platform (Vercel, Netlify, etc.)
 */

// Load from Vite environment variable
// Vite exposes env vars through import.meta.env (not process.env)
// Must be prefixed with VITE_ to be exposed to the browser
const getApiKey = () => {
  // Check if we're in a Vite environment
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const key = import.meta.env.VITE_OPENAI_API_KEY;
    if (key) return key;
  }
  
  // If no key found, throw helpful error
  console.error('❌ CRITICAL: OPENAI_API_KEY environment variable not configured');
  console.error('📋 Setup instructions:');
  console.error('   1. Create .env.local file in project root');
  console.error('   2. Add: VITE_OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE');
  console.error('   3. Restart dev server');
  throw new Error('OPENAI_API_KEY environment variable is required');
};

export const OPENAI_API_KEY = getApiKey();

// OpenAI API endpoint
export const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Validate API key format
if (OPENAI_API_KEY && !OPENAI_API_KEY.startsWith('sk-')) {
  throw new Error('❌ Invalid OPENAI_API_KEY format - must start with "sk-"');
}

if (OPENAI_API_KEY && OPENAI_API_KEY.length < 20) {
  throw new Error('❌ Invalid OPENAI_API_KEY - key too short');
}

// Log successful configuration (without exposing key)
if (OPENAI_API_KEY) {
  console.log('✅ OpenAI API configured successfully');
  console.log(`   Key prefix: ${OPENAI_API_KEY.substring(0, 7)}...`);
  console.log(`   Key length: ${OPENAI_API_KEY.length} characters`);
}

// Export configuration object
export default {
  OPENAI_API_KEY,
  OPENAI_API_URL,
  // Add other configuration here as needed
  MODEL: 'gpt-4o-mini',
  DEFAULT_TEMPERATURE: 1.0,
  MAX_TOKENS: 16000
};
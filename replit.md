# MTG Commander Goldfisher

## Overview
An AI-powered Magic: The Gathering Commander deck analyzer and simulator. This application allows users to input their Commander decklist and run intelligent simulations to analyze deck performance, consistency, and strategic gameplay using OpenAI's GPT-4o-mini model.

## Project Information
- **Created**: October 29, 2025
- **Type**: React + Vite Single Page Application
- **Primary Purpose**: Commander deck goldfish simulation with AI-powered analysis
- **Current Branch**: fix/mana-parsing-logic
- **Status**: Configured and running in Replit environment

## Technology Stack

### Frontend
- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.7
- **Styling**: Tailwind CSS 3.4.18
- **UI Components**: Custom components with Lucide React icons
- **Data Processing**: PapaParse for CSV card database

### AI Integration
- **Provider**: OpenAI
- **Model**: GPT-4o-mini (referenced as gpt-5-mini in some code comments)
- **Use Cases**:
  - Deck strategy analysis
  - Mulligan decisions
  - Turn-by-turn gameplay optimization
  - Card interaction analysis

## Project Architecture

### Key Components
- `App.jsx` - Main application container with tab-based UI
- `DeckView.jsx` - Deck list display and analysis
- `SimulationView.jsx` - Game simulation results and statistics
- `AIAnalysisView.jsx` - AI-powered strategic insights
- `DetailedGameView.jsx` - Step-by-step game playback
- `PerformanceDashboard.jsx` - Performance metrics visualization

### Core Engines
- `gameEngine.js` - Base game logic, mana system, card resolution
- `aiGameEngine.js` - AI-enhanced turn decision making
- `deckAnalyzer.js` - Deck composition and strategy analysis
- `aiAnalyzer.js` - OpenAI API integration for deck insights
- `aiMulligan.js` - AI-powered mulligan decisions
- `statisticsEngine.js` - Game statistics tracking and reporting

### Specialized Systems
- `cardBehaviorAnalyzer.js` - Card effect and interaction analysis
- `activatedAbilityEngine.js` - Activated ability processing
- `cyclingEngine.js` - Cycling mechanic implementation
- `fetchLandEngine.js` - Land fetch effect handling
- `scryEngine.js` - Scry mechanic implementation
- `tokenEngine.js` - Token generation and management

### Configuration
- `config.js` - Centralized API configuration
- `apiClient.js` - OpenAI API client with retry logic
- `errorHandler.js` - Error handling and logging utilities

## Data Files
- `public/data/Full card data.csv` - Comprehensive card database (32,731 cards)

## Environment Setup

### Required Secrets
- `VITE_OPENAI_API_KEY` - OpenAI API key (configured ✅)

### Development Server
- Port: 5000
- Host: 0.0.0.0
- HMR: Configured for Replit proxy (WSS on port 443)

### Deployment Configuration
- **Target**: Autoscale (stateless web app)
- **Build**: `npm run build`
- **Run**: `npx vite preview --host 0.0.0.0`

## Recent Changes
- **2025-10-30**: Fixed parser not splitting multi-ability oracle text - PARSER-002 resolved ✅
  - **Root Cause**: Parser used `split('\n')` to separate abilities, but card data contains escaped newlines `\\n`. Underground River's TWO abilities (`{T}: Add {C}` AND `{T}: Add {U} or {B}`) were treated as ONE modal ability
  - **Symptom**: Manifest had one ability with `produces: [{types:["C"]}, {types:[{choice:["U","B"]}]}]` instead of two separate abilities
  - **Discovery**: Console logs showed abilityText with `\\n` separator; parser wasn't splitting on escaped newlines
  - **Fix**: Changed split pattern from `split('\n')` to `split(/\\n|\n/)` to handle both actual and escaped newlines
  - **Result**: Underground River now correctly creates TWO ability objects; MANA-009 fix chooses the best one to activate
  - Architect-reviewed and verified

- **2025-10-30**: Fixed parser incorrectly parsing "{U} or {B}" choice patterns - PARSER-001 resolved ✅
  - **Root Cause**: parseModalAbility tried parseSimpleFixedMana BEFORE parseChoiceOfOne. For "Add {U} or {B}", the simple parser matched `/add\s+(\{[wubrgc]\})/` and captured only {U}, returning before the choice parser could run
  - **Symptom**: Underground River's manifest showed `produces: [{types:["C"]}, {types:["U"]}]` missing the {B} option entirely; all U/B dual lands parsed as U-only
  - **Discovery**: Console logs revealed manifest data had only {U} in the second ability, not {choice:["U","B"]}
  - **Fix**: Reordered parsing priority in parseModalAbility to: parseChoiceOfOne → parseFixedAmountChoice → parseSimpleFixedMana. Choice patterns must be tried first to prevent simple patterns from short-circuiting
  - **Result**: All "or" choice patterns now correctly parse as `{types:[{choice:[...]}]}` structures in manifest data
  - Architect-reviewed and verified

- **2025-10-29**: Fixed multi-ability permanents only producing from first ability - MANA-009 resolved ✅
  - **Root Cause**: generateMana used `.forEach()` to process all abilities sequentially. For Underground River with TWO abilities ({T}:Add{C} AND {T}:Add{U}or{B}), the first ability would tap the land, causing the second ability's `!land.tapped` check to fail
  - **Symptom**: Underground River only produced {C} instead of {U}/{B}; all dual-lands with colorless mode produced only colorless
  - **Discovery**: Card data revealed Underground River has two separate mana abilities on different lines, parsed as separate abilities in manifest
  - **Fix**: Changed from sequential `.forEach()` to: (1) filter activatable abilities, (2) choose BEST ability (prefer colored mana over colorless), (3) activate only ONE ability
  - **Result**: Underground River and similar pain lands now correctly produce colored mana; applied to lands, artifacts, and creatures
  - Architect-reviewed and verified

- **2025-10-29**: Fixed lands with mana-cost abilities producing free mana - MANA-008 resolved ✅
  - **Root Cause**: generateMana activation cost validation had fallback `return true` for unknown costs, allowing mana abilities with mana costs (like Great Hall of the Citadel's `{1}, {T}`) to activate during untap when pool is empty
  - **Symptom**: Turn 3 with 2 lands + 1 artifact produced 3 mana instead of 2; Turn 5 with 4 lands + 2 artifacts produced 6 instead of 5
  - **Discovery**: Debug logging revealed Great Hall was adding 1 mana each turn when it should add 0 (requires paying {1} to activate)
  - **Fix**: Added regex check `/^\{.*\}$/` to detect and reject mana costs in activation validation for lands, artifacts, and creatures during untap
  - **Result**: Lands/artifacts/creatures requiring mana payment no longer auto-activate during untap phase
  - Architect-reviewed and verified via console log analysis

- **2025-10-29**: Fixed untap mana calculation ignoring board state - MANA-006 resolved ✅
  - **Root Cause**: getManaProductionFromManifest was not setting `actualManaProduced` for single-color and anyColor mana sources
  - **Symptom**: Untap phase showed "0 lands" and ignored artifact mana, used flawed turn-based heuristic instead of counting actual permanents
  - **Fix 1**: Updated getManaProductionFromManifest to ALWAYS set actualManaProduced for all source types (anyColor, multi-color, single-color)
  - **Fix 2**: Updated getLandManaProduction to preserve actualManaProduced when using manifest data
  - **Result**: Untap phase now correctly counts and displays all mana sources (e.g., "3 lands + 1 artifacts = 4 mana")
  - This was the final piece needed for accurate untap mana calculation - all mana sources now properly tracked

- **2025-10-29**: Fixed basic land counting regression - MANA-003 resolved ✅
  - **Root Cause**: Basic lands were missing `actualManaProduced` property in getLandManaProduction return object
  - **Symptom**: Untap phase logged "0 lands" every turn despite lands being played and untapped correctly
  - **Fix**: Added `actualManaProduced: 1` to all 5 basic land type returns (Plains, Island, Swamp, Mountain, Forest)
  - **Result**: Untap phase now correctly counts and displays actual land totals (e.g., "6 lands = 6 mana available")
  - This regression appeared after earlier MANA-002 fixes; basic lands now match dual land implementation pattern

- **2025-10-29**: Fixed 0-cost ability validation - ENGINE-003 resolved ✅
  - **Cost Validation Fix**: Updated canPayAbilityCost in activatedAbilityEngine.js to properly handle 0-cost abilities
  - **Default Values**: Added default values for mana destructuring to handle abilities with no mana cost
  - **Conditional Checks**: Only validate mana requirements if they're greater than 0
  - Evolving Wilds and other {T}, Sacrifice abilities now activate successfully without "Cannot afford" errors

- **2025-10-29**: Fixed AI fetch land activation priority - AI-LOGIC-001 resolved ✅
  - **Fetch Land Instructions**: Updated AI prompt to activate fetch lands IMMEDIATELY after playing them (same turn), not "next turn"
  - **Free Action Priority**: Added new decision priority step for 0-cost activated abilities before spell casting
  - **Decision Order**: Now enforces Land Drop → Free Actions (fetch lands) → Main Phase Evaluation
  - AI will now properly activate Evolving Wilds and similar fetch lands right after playing them for optimal color fixing

- **2025-10-29**: Completed ALL mana calculation fixes - MANA-002 fully resolved ✅
  - **Untap Mana Calculation**: Fixed untap phase in enhancedStepByStepGame.js to check actual mana production instead of counting permanents. Now properly excludes zero-mana permanents (Evolving Wilds, The One Ring) and correctly sums multi-mana sources
  - **Dual-Land Smart Color Choice**: Updated all fallback code paths in `generateMana()` and `playLand()` to use `manaPoolManager.addMana()` with choice structure instead of hardcoded color selection. Command Tower and similar dual lands now choose optimal colors based on game state via `chooseOptimalColor()` helper
  - **PlayLand Synchronization**: Updated `playLand()` to use manaPoolManager for adding mana from land drops, matching generateMana pattern and ensuring mid-turn mana pool persistence
  - **Creature Mana Abilities**: Updated `generateMana()` in gameEngine.js to process creatures with mana abilities (e.g., Birds of Paradise, mana dorks), checking for summoning sickness and using behaviorManifest for proper mana production
  - **Mana Pool Synchronization**: Updated `castSpell()` and `castCommander()` to consistently use ManaPoolManager for all mana operations, ensuring mana pool colors remain properly tracked after casting spells
  - **Commander Tax Payment**: Fixed commander tax payment to use ManaPoolManager.pay() method instead of direct pool mutation, maintaining synchronization throughout payment flow
  - All changes architect-reviewed and verified. Multi-spell turns now work correctly, mana persists within phases, and all mana sources are accurately tracked

- **2025-10-29**: Initial Replit setup and branch configuration
  - Imported project from GitHub
  - Switched to `fix/mana-parsing-logic` branch
  - Configured Vite for Replit environment (host 0.0.0.0, port 5000)
  - Set up HMR for Replit proxy compatibility
  - Installed npm dependencies (249 packages)
  - Created workflow for frontend development
  - Configured OpenAI API key (VITE_OPENAI_API_KEY)
  - Set up deployment configuration (autoscale mode)
  - Verified application running successfully with card database loaded

## Features
- Upload and parse Commander decklists
- Load example decks (e.g., Lord of the Nazgûl)
- AI-powered deck strategy analysis
- Automated goldfish simulations (AI or basic mode)
- Mulligan decision analysis
- Turn-by-turn gameplay tracking
- Performance statistics and health scoring
- Detailed game replay viewer

## Branch Purpose: fix/mana-parsing-logic
This branch is focused on improvements to the mana parsing and production logic, particularly for complex land types and mana abilities.

## User Preferences
- None documented yet

## Notes
- The application uses a client-side CSV database for card data
- AI features require valid OpenAI API key
- Supports both AI-enhanced and basic simulation modes
- All AI calls include error handling with fallback logic
- Minor WebSocket warning in console (cosmetic only, doesn't affect functionality)

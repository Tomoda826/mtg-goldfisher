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
- **2025-10-29**: Completed MANA-002 fixes - all mana calculation bugs resolved
  - **Dual-Land Smart Color Choice**: Updated all fallback code paths in `generateMana()` and `playLand()` to use `manaPoolManager.addMana()` with choice structure instead of hardcoded color selection. Command Tower and similar dual lands now choose optimal colors based on game state via `chooseOptimalColor()` helper
  - **PlayLand Synchronization**: Updated `playLand()` to use manaPoolManager for adding mana from land drops, matching generateMana pattern and ensuring mid-turn mana pool persistence
  - **Creature Mana Abilities**: Updated `generateMana()` in gameEngine.js to process creatures with mana abilities (e.g., Birds of Paradise, mana dorks), checking for summoning sickness and using behaviorManifest for proper mana production
  - **Accurate Mana Logging**: Fixed untap phase log in enhancedStepByStepGame.js to count and report creatures with mana abilities alongside lands and artifacts
  - **Mana Pool Synchronization**: Updated `castSpell()` and `castCommander()` to consistently use ManaPoolManager for all mana operations, ensuring mana pool colors remain properly tracked after casting spells
  - **Commander Tax Payment**: Fixed commander tax payment to use ManaPoolManager.pay() method instead of direct pool mutation, maintaining synchronization throughout payment flow
  - All changes architect-reviewed and verified to resolve all MANA-002 bugs (playLand sync, castSpell persistence, dual-land color choice)

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

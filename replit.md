# MTG Commander Goldfisher

## Overview
An AI-powered Magic: The Gathering Commander deck analyzer and simulator. This application allows users to input their Commander decklist and run intelligent simulations to analyze deck performance, consistency, and strategic gameplay using OpenAI's GPT-4o-mini model. The project aims to provide in-depth analysis of deck strategies, mulligan decisions, and turn-by-turn gameplay optimization, with a focus on a React + Vite frontend and robust AI integration.

## User Preferences
- None documented yet

## System Architecture

### Technology Stack
- **Frontend**: React 19.1.1, Vite 7.1.7, Tailwind CSS 3.4.18, Lucide React icons, PapaParse (for CSV).
- **AI Integration**: OpenAI (GPT-4o-mini) for deck strategy analysis, mulligan decisions, turn-by-turn gameplay optimization, and card interaction analysis.

### Core Architecture
The application is structured around a tab-based UI (`App.jsx`) leading to dedicated views for deck analysis (`DeckView.jsx`), simulation results (`SimulationView.jsx`), AI insights (`AIAnalysisView.jsx`), detailed game replay (`DetailedGameView.jsx`), and performance metrics (`PerformanceDashboard.jsx`).

### Core Engines & Systems
- **Game Logic**: `gameEngine.js` (base logic, mana system, card resolution), `aiGameEngine.js` (AI turn decisions).
- **Deck Analysis**: `deckAnalyzer.js` (composition and strategy), `aiAnalyzer.js` (OpenAI integration), `aiMulligan.js` (AI mulligan).
- **Statistics**: `statisticsEngine.js` (tracking and reporting).
- **Specialized Systems**: `cardBehaviorAnalyzer.js`, `activatedAbilityEngine.js`, `cyclingEngine.js`, `fetchLandEngine.js`, `scryEngine.js`, `tokenEngine.js` for specific game mechanics.

### Key Architectural Decisions (October 2025)

**Major Refactor: "Available Sources" Mana System (Oct 30, 2025)**
- Replaced "fixed pool" model with "Available Sources" (just-in-time solving) model
- Core components:
  - `ManaPoolManager.buildPotentialManaPool()` - Scans battlefield for untapped mana sources
  - `ManaPoolManager.solveCost()` - Just-in-time solver that finds optimal payment solutions
  - `ManaPoolManager.canPay()` - Uses solver to check affordability before casting
- Refactored `generateMana()`, `castSpell()`, `castCommander()`, `playLand()` to use new model
- Fixed preview calculations to respect `production.quantity` (Sol Ring's 2×{C} counts as 2 mana)
- Design principle: Mana sources no longer activate during untap; solver determines which sources to tap when casting spells

**Parser Improvements**
- Per-line "target" checking: Allows cards like Bojuka Bog (ETB targets) to be recognized as mana producers
- Multi-ability parsing: Correctly splits oracle text on escaped newlines (`\\n`)
- Priority-based parsing: Tries complex "choice" patterns before simple fixed mana patterns
- Handles 0-cost abilities and mana-cost abilities correctly

**AI Integration**
- AI casting logic now uses mana solver for affordability checks
- Intelligent ability selection based on hand needs (colored vs. colorless)
- Fetch land activation prioritized for color fixing

### Deployment and Configuration
- **Development Environment**: React + Vite, configured for Replit (port 5000, HMR via WSS on port 443).
- **Deployment**: Autoscale stateless web app, built with `npm run build` and run with `npx vite preview`.

## External Dependencies
- **OpenAI**: Used for AI integration, specifically with the `GPT-4o-mini` model, requiring a `VITE_OPENAI_API_KEY`.
- **PapaParse**: Used for client-side parsing of the `Full card data.csv` database.
- **Lucide React**: For UI icons.
- **Tailwind CSS**: For styling.
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

### Key Architectural Decisions
- **Mana System Refactor**: Replaced a "fixed pool" mana model with an "Available Sources" (just-in-time solving) model to improve accuracy, eliminate state corruption, and enable multi-spell turns. This involves dynamically building a `PotentialManaPool` and using a `ManaPoolManager.solveCost()` for optimal mana payment.
- **Intelligent Ability Chooser**: Implemented a need-based scoring system in `ManaPoolManager.chooseBestAbility()` to intelligently select the optimal ability from multi-ability permanents (e.g., Underground River producing colorless or colored mana based on current hand needs).
- **Parser Improvements**: Enhanced parsing logic to correctly split multi-ability oracle text (handling escaped newlines `\\n`) and prioritize parsing of complex "choice" patterns (e.g., "{U} or {B}") over simpler fixed mana patterns.
- **Mana Production Accuracy**: Addressed multiple issues to ensure accurate mana production from all sources (lands, artifacts, creatures) by correctly tracking `actualManaProduced`, handling 0-cost abilities, and synchronizing mana pool operations across all game phases and spell casting.
- **AI Fetch Land Logic**: Updated AI decision priorities to ensure fetch lands are activated immediately after being played for optimal color fixing.

### Deployment and Configuration
- **Development Environment**: React + Vite, configured for Replit (port 5000, HMR via WSS on port 443).
- **Deployment**: Autoscale stateless web app, built with `npm run build` and run with `npx vite preview`.

## External Dependencies
- **OpenAI**: Used for AI integration, specifically with the `GPT-4o-mini` model, requiring a `VITE_OPENAI_API_KEY`.
- **PapaParse**: Used for client-side parsing of the `Full card data.csv` database.
- **Lucide React**: For UI icons.
- **Tailwind CSS**: For styling.
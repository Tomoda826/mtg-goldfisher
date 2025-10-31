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

**Parser Improvements (Oct 31, 2025)**
- Per-line "target" checking: Allows cards like Bojuka Bog, Barad-dûr (ETB targets) to be recognized as mana producers
- Multi-ability parsing: Correctly splits oracle text on escaped newlines (`\\n`)
- Priority-based parsing: Tries complex "choice" patterns before simple fixed mana patterns
- Handles 0-cost abilities and mana-cost abilities correctly
- **MANA-017 Fixed**: Changed from blanket "target" rejection to per-line check, enabling complex lands to work correctly

**JIT (Just-In-Time) Pool Rebuilding (Oct 31, 2025)**
- **MANA-016 Fixed**: Lands played mid-turn now update the potential pool correctly
  - Root cause: playLand() was rebuilding pool but using OLD buggy preview calculation
  - Solution: Replaced with SAME corrected logic from generateMana() (permanent grouping, flexibility tie-breaking)
  - Result: Playing Rivendell mid-turn immediately adds its ability to the pool (5 → 6 abilities)
  - AI can now use newly-played lands in the same turn they enter (if untapped)

**Solver Improvements (Oct 31, 2025)**
- **MANA-019 Fixed**: ManaSolver now correctly handles multi-mana sources
  - Colored payments: Always use 1 mana per source activation (prevents multi-color overuse)
  - Generic payments: Use full quantity via `getProductionQuantity()` (Sol Ring now pays 2 for {2})
  - Variable X quantities: Integrated with `resolveQuantity()` for accurate game-state-based resolution
  - Handles Cabal Coffers, Nykthos, and other X producers correctly (can resolve to 0)

**Game Rules Fixes (Oct 31, 2025)**
- **MANA-018 Fixed**: Artifacts now untap correctly during untap phase
  - Root cause: `untapPhase()` was only untapping lands, not artifacts
  - Sol Ring and other mana artifacts now persist turn-to-turn instead of disappearing
  - This was a critical missing piece of basic MTG rules implementation

**Preview/AI Data Pipeline Fixes (Oct 31, 2025)**
- **MANA-020 Fixed**: AI preview mana totals now match ManaSolver reality
  - Root cause: Preview was counting all abilities separately (Underground River with 2 abilities counted as 2 mana sources)
  - Solution: Group abilities by permanent, pick best ability (considering flexibility for ties), count each permanent once
  - Flexibility tie-breaking: When abilities produce equal mana, prefer more color options (Underground River now shows {U/B} not {C})
  - Combination handling: Properly credits multi-symbol abilities using combination.length as fallback
  - AI now sees accurate mana counts matching what the ManaSolver can actually use

**Mana Rock Support (Oct 31, 2025)**
- **MANA-021 Fixed**: Mana rocks with activation costs (Dimir Signet, Arcane Signet, Talismans, etc.) now fully supported
  - Root cause: buildPotentialManaPool filtered out ANY ability with mana cost in activation
  - Solution: Include all abilities with activation costs tracked, let ManaSolver decide when to use them
  - Multi-color handling: Combination abilities (Dimir Signet `{U}{B}`) credit ALL pips in one activation
  - Choice handling: Choice abilities (Underground River `{U} or {B}`) select requested color intelligently
  - Activation cost accounting: Costs added to generic requirement during solving, paid in Phase 2
  - Solver strategy: Prefer free sources first, use mana rocks when needed for colors or when net-positive

- **MANA-022 Fixed**: Recursive mana activation prevented (mana rocks can't pay for their own activation)
  - Root cause: Solver added activation cost to needed.generic, then subtracted full production, creating circular math
  - Solution: Calculate NET production (production - activation cost) before crediting toward payment
  - Example: Dimir Signet costs {1}, produces 2 → NET is +1 (not +2)
  - Result: Casting {5} with 4 lands + Signet correctly FAILS (can't afford Signet's activation)
  - Result: Casting {5} with 5 lands + Signet correctly SUCCEEDS (1 land pays for activation, Signet produces 2)

**AI Integration**
- AI casting logic now uses mana solver for affordability checks
- Intelligent ability selection based on hand needs (colored vs. colorless)
- Fetch land activation prioritized for color fixing
- AI decision-making now uses same data source as ManaSolver (single source of truth)
- Mana rocks (Signets, Talismans) now counted and used correctly in AI gameplay

### Deployment and Configuration
- **Development Environment**: React + Vite, configured for Replit (port 5000, HMR via WSS on port 443).
- **Deployment**: Autoscale stateless web app, built with `npm run build` and run with `npx vite preview`.

## External Dependencies
- **OpenAI**: Used for AI integration, specifically with the `GPT-4o-mini` model, requiring a `VITE_OPENAI_API_KEY`.
- **PapaParse**: Used for client-side parsing of the `Full card data.csv` database.
- **Lucide React**: For UI icons.
- **Tailwind CSS**: For styling.
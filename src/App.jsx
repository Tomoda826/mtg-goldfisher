import React, { useState } from 'react';
import { Upload, Play, BarChart3, Brain, Settings } from 'lucide-react';
import { runFullGame } from './gameEngine';
import { runAIEnhancedGame } from './aiGameEngine';
import { analyzeDeckStrategy } from './deckAnalyzer';
import { analyzeWithAI } from './aiAnalyzer';
import { 
  initializeStatistics, 
  recordGameResult, 
  calculateSummary, 
  generateReport,
  getDeckHealthScore 
} from './statisticsEngine';
import DeckView from './components/DeckView.jsx';
import SimulationView from './components/SimulationView.jsx';
import AIAnalysisView from './components/AIAnalysisView.jsx';
import { runEnhancedDetailedGame } from './enhancedStepByStepGame';  // NEW LINE
import DetailedGameView from './components/DetailedGameView';

export default function MTGGoldfisher() {
  const [commanderList, setCommanderList] = useState('');
  const [deckList, setDeckList] = useState('');
  const [parsedDeck, setParsedDeck] = useState(null);
  const [deckStrategy, setDeckStrategy] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('input');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [cardDatabase, setCardDatabase] = useState(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentGame, setCurrentGame] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [useAI, setUseAI] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load card database from CSV on mount
  React.useEffect(() => {
    const loadCardDatabase = async () => {
      try {
        setLoadingStatus('Loading card database...');
        
        let response = await fetch('/data/Full card data.csv');
        
        if (!response.ok) {
          response = await fetch('/Full card data.csv');
        }
        
        if (!response.ok) {
          throw new Error(`CSV file not found. Status: ${response.status}`);
        }
        
        const csvData = await response.text();
        
        const Papa = await import('papaparse');
        const parsed = Papa.default.parse(csvData, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        
        const cardMap = {};
        parsed.data.forEach(card => {
          if (card.name) {
            const key = card.name.toLowerCase().trim();
            if (!cardMap[key]) {
              cardMap[key] = {
                name: card.name,
                type: card.type || '',
                types: card.types || '',
                manaCost: card.manaCost || '',
                manaValue: card.manaValue || 0,
                power: card.power || '',
                toughness: card.toughness || '',
                text: card.text || '',
                subtypes: card.subtypes || '',
                supertypes: card.supertypes || '',
                rarity: card.rarity || '',
                loyalty: card.loyalty || '',
                keywords: card.keywords || '',
              };
            }
          }
        });
        
        setCardDatabase(cardMap);
        setDbLoaded(true);
        setLoadingStatus('');
        console.log(`Loaded ${Object.keys(cardMap).length} cards into database`);
      } catch (error) {
        console.error('Error loading card database:', error);
        setLoadingStatus('Error loading card database. Please ensure "Full card data.csv" is uploaded.');
      }
    };
    
    loadCardDatabase();
  }, []);

  const lookupCard = (cardName) => {
    if (!cardDatabase) return null;
    const key = cardName.toLowerCase().trim();
    return cardDatabase[key] || null;
  };

  const categorizeCard = (type) => {
    if (!type) return 'unknown';
    const lower = type.toLowerCase();
    
    if (lower.includes('creature')) return 'creature';
    if (lower.includes('land')) return 'land';
    if (lower.includes('artifact')) return 'artifact';
    if (lower.includes('enchantment')) return 'enchantment';
    if (lower.includes('planeswalker')) return 'planeswalker';
    if (lower.includes('instant')) return 'instant';
    if (lower.includes('sorcery')) return 'sorcery';
    
    return 'unknown';
  };

  const parseDeckList = async (commanderText, deckText) => {
    if (!cardDatabase) {
      alert('Card database is still loading. Please wait a moment and try again.');
      return null;
    }
    
    setLoading(true);
    setLoadingStatus('Parsing deck list...');
    
    const deck = {
      commanders: [],
      creatures: [],
      instants: [],
      sorceries: [],
      artifacts: [],
      enchantments: [],
      planeswalkers: [],
      lands: [],
      unknown: [],
      totalCommanders: 0,
      totalDeck: 0,
      total: 0
    };

    const processLine = (line, isCommander) => {
      const match = line.match(/^(\d+)x?\s+(.+)$/);
      const cardName = match ? match[2].trim() : line.trim();
      const quantity = match ? parseInt(match[1]) : 1;
      
      const cardData = lookupCard(cardName);
      
      if (cardData) {
        const category = categorizeCard(cardData.type);
        return {
          name: cardData.name,
          type_line: cardData.type,
          mana_cost: cardData.manaCost,
          cmc: cardData.manaValue,
          power: cardData.power,
          toughness: cardData.toughness,
          oracle_text: cardData.text,
          quantity: quantity,
          category: category,
          isCommander: isCommander
        };
      } else {
        return {
          name: cardName,
          quantity: quantity,
          category: 'unknown',
          type_line: 'Not Found in Database',
          isCommander: isCommander
        };
      }
    };
    
    if (commanderText.trim()) {
      const commanderLines = commanderText.split('\n').filter(line => line.trim());
      commanderLines.forEach(line => {
        const card = processLine(line, true);
        deck.commanders.push(card);
        deck.totalCommanders += card.quantity;
      });
    }
    
    if (deckText.trim()) {
      const deckLines = deckText.split('\n').filter(line => line.trim());
      deckLines.forEach(line => {
        const card = processLine(line, false);
        
        switch (card.category) {
          case 'creature':
            deck.creatures.push(card);
            break;
          case 'instant':
            deck.instants.push(card);
            break;
          case 'sorcery':
            deck.sorceries.push(card);
            break;
          case 'artifact':
            deck.artifacts.push(card);
            break;
          case 'enchantment':
            deck.enchantments.push(card);
            break;
          case 'planeswalker':
            deck.planeswalkers.push(card);
            break;
          case 'land':
            deck.lands.push(card);
            break;
          default:
            deck.unknown.push(card);
        }
        deck.totalDeck += card.quantity;
      });
    }

    deck.total = deck.totalCommanders + deck.totalDeck;
    
    setLoading(false);
    setLoadingStatus('');
    return deck;
  };

  const handleParseDeck = async () => {
    if (!commanderList.trim() && !deckList.trim()) {
      alert('Please add at least a commander or deck cards!');
      return;
    }
    const parsed = await parseDeckList(commanderList, deckList);
    setParsedDeck(parsed);
    
    if (parsed) {
      const strategy = analyzeDeckStrategy(parsed);
      setDeckStrategy(strategy);
      console.log('Deck Strategy Analysis:', strategy);
    }
    
    setActiveTab('deck');
  };

  const handleAIAnalysis = async () => {
    if (!parsedDeck || !deckStrategy) {
      alert('Please parse a deck first!');
      return;
    }

    setIsAnalyzing(true);
    setActiveTab('ai-analysis');

    try {
      const result = await analyzeWithAI(parsedDeck, deckStrategy);
      setAiAnalysis(result);
    } catch (error) {
      console.error('AI Analysis failed:', error);
      setAiAnalysis({
        success: false,
        error: error.message
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runMultipleGames = async (numGames) => {
    if (!parsedDeck || !deckStrategy) {
      alert('Please parse a deck first!');
      return;
    }
    
    setIsSimulating(true);
    setTotalGames(numGames);
    setActiveTab('simulation');
    
    const stats = initializeStatistics();
    
    // Run games sequentially
    for (let i = 0; i < numGames; i++) {
      setCurrentGame(i + 1);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let game;
      if (useAI && aiAnalysis && aiAnalysis.success) {
        // Use AI-enhanced game engine
        game = await runAIEnhancedGame(parsedDeck, deckStrategy, aiAnalysis, 10, true);
      } else {
        // Use basic game engine
        game = runFullGame(parsedDeck, deckStrategy, 10);
      }
      
      recordGameResult(stats, game, i + 1);
    }
    
    const summary = calculateSummary(stats);
    const textReport = generateReport(stats);
    const healthScore = getDeckHealthScore(stats);
    
    setStatistics({
      raw: stats,
      summary: summary,
      textReport: textReport,
      healthScore: healthScore
    });
    
    setIsSimulating(false);
    setCurrentGame(0);
    setTotalGames(0);
  };

  const clearResults = () => {
    setStatistics(null);
  };

  const exampleCommander = `1 Lord of the Nazgûl`;
  
  const exampleDeck = `1 Arcane Denial
1 Arcane Signet
1 Barad-dûr
1 Birthday Escape
1 Bojuka Bog
1 Borne Upon a Wind
1 Brainstorm
1 Call of the Ring
1 Claim the Precious
1 Command Tower
1 Commander's Sphere
1 Consider
1 Counterspell
1 Countersquall
1 Decree of Pain
1 Dimir Signet
1 Drowned Catacomb
1 Evolving Wilds
1 Extract from Darkness
1 Feed the Swarm
1 Frantic Search
1 Glamdring
1 Go for the Throat
1 Great Hall of the Citadel
8 Island
1 Lightning Greaves
1 Lórien Revealed
1 Minas Morgul, Dark Fortress
1 Mirkwood Bats
1 Mithril Coat
1 Mordor Muster
1 Mystic Confluence
9 Nazgûl
1 Nazgûl Battle-Mace
1 Night's Whisper
1 Not Dead After All
1 One Ring to Rule Them All
1 Opt
1 Orcish Bowmasters
1 Orcish Medicine
1 Palantír of Orthanc
1 Path of Ancestry
1 Ponder
1 Preordain
1 Press the Enemy
1 Reanimate
1 Ringsight
1 Ringwraiths
1 Rivendell
1 Sam's Desperate Rescue
1 Saruman's Trickery
1 Sauron's Ransom
1 Scroll of Isildur
1 Shelob's Ambush
1 Snap
1 Sol Ring
1 Stern Scolding
1 Storm of Saruman
1 Sunken Hollow
1 Sunken Ruins
1 Surrounded by Orcs
10 Swamp
1 Swan Song
1 Tainted Isle
1 Talisman of Dominance
1 The Black Gate
1 The Grey Havens
1 The One Ring
1 Toxic Deluge
1 Treason of Isengard
1 Underground River
1 Watery Grave
1 Whispersilk Cloak
1 Witch-king of Angmar
1 Witch-king, Bringer of Ruin`;

  const loadExampleDeck = () => {
    setCommanderList(exampleCommander);
    setDeckList(exampleDeck);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            MTG Commander Goldfisher
          </h1>
          <p className="text-gray-400">Automated deck testing with AI-powered analysis</p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-sm text-gray-400 hover:text-purple-400 transition-colors flex items-center gap-1"
            >
              <Settings size={16} />
              Settings
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6 p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">⚙️ Settings</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-medium text-sm">AI-Powered Simulation</label>
                  <p className="text-xs text-gray-400">Use GPT-4o-mini for optimal gameplay decisions</p>
                </div>
                <button
                  onClick={() => setUseAI(!useAI)}
                  className={`px-4 py-2 rounded transition-all ${
                    useAI ? 'bg-purple-600' : 'bg-gray-600'
                  }`}
                >
                  {useAI ? '🤖 AI ON' : '🔧 Basic'}
                </button>
              </div>
              <div className="text-xs text-gray-500 p-3 bg-gray-900 rounded">
                <p><strong>Note:</strong> AI-powered features require an OpenAI API key.</p>
                <p className="mt-1">Edit <code className="bg-gray-800 px-1">aiAnalyzer.js</code> to add your key.</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('input')}
            className={`px-6 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'input'
                ? 'border-b-2 border-purple-400 text-purple-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="inline mr-2" size={18} />
            Import Deck
          </button>
          <button
            onClick={() => setActiveTab('deck')}
            className={`px-6 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'deck'
                ? 'border-b-2 border-purple-400 text-purple-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
            disabled={!parsedDeck}
          >
            <BarChart3 className="inline mr-2" size={18} />
            View Deck ({parsedDeck?.total || 0})
          </button>
          <button
            onClick={() => setActiveTab('ai-analysis')}
            className={`px-6 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'ai-analysis' 
                ? 'border-b-2 border-purple-400 text-purple-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            disabled={!parsedDeck}
          >
            <Brain className="inline mr-2" size={18} />
            AI Analysis
          </button>
          <button onClick={() => setActiveTab('detailed-game')}>
        🎮 Detailed AI Game
          </button>
          <button
            onClick={() => setActiveTab('simulation')}
            className={`px-6 py-3 font-semibold transition-all whitespace-nowrap ${
              activeTab === 'simulation' 
                ? 'border-b-2 border-purple-400 text-purple-400' 
                : 'text-gray-400 hover:text-gray-200'
            }`}
            disabled={!parsedDeck}
          >
            <Play className="inline mr-2" size={18} />
            Simulate Game
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-gray-800 rounded-lg shadow-2xl p-6">
          {activeTab === 'input' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Import Your Deck</h2>
              <p className="text-gray-400 mb-4">
                Enter your commander(s) and deck list separately. Format: <code className="bg-gray-700 px-2 py-1 rounded">1 Card Name</code> per line
              </p>
              
              <button
                onClick={loadExampleDeck}
                disabled={!dbLoaded}
                className="mb-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed rounded text-sm"
              >
                {dbLoaded ? 'Load Example Deck (Lord of the Nazgûl)' : 'Loading card database...'}
              </button>

              <div className="space-y-4">
                <div>
                  <label className="block text-lg font-semibold mb-2 text-purple-400">
                    Commander(s)
                  </label>
                  <p className="text-sm text-gray-400 mb-2">
                    Enter 1 or 2 commanders (for partner commanders)
                  </p>
                  <textarea
                    value={commanderList}
                    onChange={(e) => setCommanderList(e.target.value)}
                    placeholder="1 Lord of the Nazgûl"
                    className="w-full h-24 bg-gray-900 border border-gray-700 rounded p-4 font-mono text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-lg font-semibold mb-2 text-purple-400">
                    Deck (99 or 98 cards)
                  </label>
                  <p className="text-sm text-gray-400 mb-2">
                    Enter the remaining cards in your deck
                  </p>
                  <textarea
                    value={deckList}
                    onChange={(e) => setDeckList(e.target.value)}
                    placeholder="1 Sol Ring&#10;1 Command Tower&#10;1 Lightning Greaves&#10;..."
                    className="w-full h-96 bg-gray-900 border border-gray-700 rounded p-4 font-mono text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleParseDeck}
                  disabled={loading || !dbLoaded}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
                >
                  {loading ? 'Parsing...' : !dbLoaded ? 'Loading Database...' : 'Parse Deck List'}
                </button>
              </div>
              
              {!dbLoaded && (
                <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-700 rounded">
                  <p className="text-yellow-300 text-sm">
                    {loadingStatus || 'Loading card database...'}
                  </p>
                </div>
              )}
            </div>
          )}

{activeTab === 'detailed-game' && (
  <DetailedGameView 
    parsedDeck={parsedDeck}
    deckStrategy={deckStrategy}
    aiAnalysis={aiAnalysis}
    cardDatabase={cardDatabase}
    runEnhancedDetailedGame={runEnhancedDetailedGame}
  />
)}

          {activeTab === 'deck' && parsedDeck && (
            <DeckView parsedDeck={parsedDeck} deckStrategy={deckStrategy} />
          )}

          {activeTab === 'ai-analysis' && (
            <AIAnalysisView 
              aiAnalysis={aiAnalysis}
              isAnalyzing={isAnalyzing}
              onRunAnalysis={handleAIAnalysis}
            />
          )}

          {activeTab === 'simulation' && (
            <SimulationView 
              statistics={statistics}
              isSimulating={isSimulating}
              parsedDeck={parsedDeck}
              runMultipleGames={runMultipleGames}
              clearResults={clearResults}
              currentGame={currentGame}
              totalGames={totalGames}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm space-y-1">
          <p>Version 1.0 - AI-Powered Commander Goldfisher</p>
          <p>✨ GPT-4o-mini deck analysis • 🤖 AI-powered optimal play • 📊 Advanced statistics</p>
          {useAI && (
            <p className="text-purple-400">🧠 AI Mode Active - Using GPT-4o-mini for gameplay decisions</p>
          )}
        </div>
      </div>
    </div>
  );
}
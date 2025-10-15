import React, { useState } from 'react';
import { Upload, Play, BarChart3 } from 'lucide-react';
import { runFullGame } from './gameEngine';

export default function MTGGoldfisher() {
  const [commanderList, setCommanderList] = useState('');
  const [deckList, setDeckList] = useState('');
  const [parsedDeck, setParsedDeck] = useState(null);
  const [deckStrategy, setDeckStrategy] = useState(null);
  const [activeTab, setActiveTab] = useState('input');
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [cardDatabase, setCardDatabase] = useState(null);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [gameState, setGameState] = useState(null);
const [isSimulating, setIsSimulating] = useState(false);

// Load card database from CSV on mount
  React.useEffect(() => {
    const loadCardDatabase = async () => {
      try {
        setLoadingStatus('Loading card database...');
        
        // Fetch from public folder
        let response = await fetch('/data/Full card data.csv');
        
        if (!response.ok) {
          response = await fetch('/Full card data.csv');
        }
        
        if (!response.ok) {
          throw new Error(`CSV file not found. Status: ${response.status}`);
        }
        
        const csvData = await response.text();
        
        // Use PapaParse to parse CSV
        const Papa = await import('papaparse');
        const parsed = Papa.default.parse(csvData, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        
        // Create a map for fast lookups (by lowercase name)
        const cardMap = {};
        parsed.data.forEach(card => {
          if (card.name) {
            const key = card.name.toLowerCase().trim();
            // Keep only the first occurrence of each card name
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

  // Look up card from local database
  const lookupCard = (cardName) => {
    if (!cardDatabase) return null;
    
    const key = cardName.toLowerCase().trim();
    return cardDatabase[key] || null;
  };

  // Analyze deck strategy and archetype
  const analyzeDeckStrategy = (deck) => {
    const analysis = {
      archetype: 'Unknown',
      subArchetypes: [],
      avgCMC: 0,
      creatureDensity: 0,
      spellDensity: 0,
      landCount: 0,
      keyPatterns: [],
      tribalType: null,
      tribalDensity: 0,
      winConditions: [],
      gameplan: '',
      idealTurnWin: 0,
    };

    // Calculate basic metrics
    const totalNonLand = deck.totalDeck - deck.lands.reduce((sum, c) => sum + c.quantity, 0);
    const creatureCount = deck.creatures.reduce((sum, c) => sum + c.quantity, 0);
    const instantSorceryCount = 
      deck.instants.reduce((sum, c) => sum + c.quantity, 0) + 
      deck.sorceries.reduce((sum, c) => sum + c.quantity, 0);
    
    analysis.landCount = deck.lands.reduce((sum, c) => sum + c.quantity, 0);
    analysis.creatureDensity = totalNonLand > 0 ? (creatureCount / totalNonLand) * 100 : 0;
    analysis.spellDensity = totalNonLand > 0 ? (instantSorceryCount / totalNonLand) * 100 : 0;

    // Calculate average CMC (excluding lands)
    let totalCMC = 0;
    let cardCount = 0;
    [...deck.creatures, ...deck.instants, ...deck.sorceries, ...deck.artifacts, 
     ...deck.enchantments, ...deck.planeswalkers].forEach(card => {
      if (card.cmc !== undefined) {
        totalCMC += card.cmc * card.quantity;
        cardCount += card.quantity;
      }
    });
    analysis.avgCMC = cardCount > 0 ? (totalCMC / cardCount).toFixed(2) : 0;

    // Detect Tribal
    const subtypeCounts = {};
    deck.creatures.forEach(card => {
      if (card.type_line) {
        // Extract creature types (everything after "—")
        const typeParts = card.type_line.split('—');
        if (typeParts.length > 1) {
          const subtypes = typeParts[1].trim().split(' ');
          subtypes.forEach(subtype => {
            const cleanType = subtype.trim();
            if (cleanType) {
              subtypeCounts[cleanType] = (subtypeCounts[cleanType] || 0) + card.quantity;
            }
          });
        }
      }
    });

    // Find dominant tribe
    const dominantTribe = Object.entries(subtypeCounts)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (dominantTribe && dominantTribe[1] >= 8) {
      analysis.tribalType = dominantTribe[0];
      analysis.tribalDensity = dominantTribe[1];
      analysis.subArchetypes.push('Tribal');
    }

    // Keyword detection in card text
    const allText = [...deck.creatures, ...deck.instants, ...deck.sorceries, 
                     ...deck.artifacts, ...deck.enchantments, ...deck.commanders]
      .map(c => (c.oracle_text || '').toLowerCase())
      .join(' ');

    const keywords = {
      control: ['counter', 'destroy', 'exile', 'return to hand', 'bounce'],
      aggro: ['haste', 'double strike', 'first strike', 'combat damage'],
      combo: ['infinite', 'win the game', 'search your library', 'tutor'],
      ramp: ['search your library for a land', 'add mana', 'untap', 'mana ability'],
      voltron: ['equip', 'attach', 'equipped creature', 'aura'],
      graveyard: ['graveyard', 'reanimate', 'return from', 'flashback', 'unearth'],
      tokens: ['create', 'token', 'populate'],
      sacrifice: ['sacrifice', 'die', 'dies'],
      lifegain: ['gain life', 'lifelink'],
      card_draw: ['draw', 'draws'],
    };

    const patternScores = {};
    Object.entries(keywords).forEach(([pattern, words]) => {
      let score = 0;
      words.forEach(word => {
        const matches = (allText.match(new RegExp(word, 'g')) || []).length;
        score += matches;
      });
      patternScores[pattern] = score;
    });

    // Determine primary archetype
    if (analysis.tribalDensity >= 15) {
      analysis.archetype = 'Tribal Aggro';
      analysis.gameplan = `Flood the board with ${analysis.tribalType} creatures and overwhelm with tribal synergies.`;
      analysis.idealTurnWin = 8;
      analysis.winConditions.push(`Combat damage with ${analysis.tribalType} tribal`);
    } else if (patternScores.voltron > 10 && deck.artifacts.length > 5) {
      analysis.archetype = 'Voltron';
      analysis.subArchetypes.push('Equipment');
      analysis.gameplan = 'Suit up commander with equipment and deal commander damage.';
      analysis.idealTurnWin = 7;
      analysis.winConditions.push('21 Commander damage');
    } else if (patternScores.combo > 5) {
      analysis.archetype = 'Combo';
      analysis.gameplan = 'Assemble combo pieces and win with infinite loops or alternate win conditions.';
      analysis.idealTurnWin = 6;
      analysis.winConditions.push('Combo finish');
    } else if (analysis.avgCMC <= 2.5 && analysis.creatureDensity > 50) {
      analysis.archetype = 'Aggro';
      analysis.gameplan = 'Deploy threats quickly and win through early combat damage.';
      analysis.idealTurnWin = 6;
      analysis.winConditions.push('Early combat damage');
    } else if (patternScores.control > 15 && analysis.spellDensity > 40) {
      analysis.archetype = 'Control';
      analysis.gameplan = 'Control the game with removal and counterspells, then win with late-game threats.';
      analysis.idealTurnWin = 12;
      analysis.winConditions.push('Late-game value');
    } else if (patternScores.ramp > 10 && analysis.avgCMC > 4) {
      analysis.archetype = 'Ramp';
      analysis.gameplan = 'Accelerate mana production and cast high-impact threats.';
      analysis.idealTurnWin = 9;
      analysis.winConditions.push('Big threats');
    } else if (patternScores.graveyard > 10) {
      analysis.archetype = 'Graveyard';
      analysis.subArchetypes.push('Reanimator');
      analysis.gameplan = 'Fill graveyard and reanimate powerful creatures.';
      analysis.idealTurnWin = 7;
      analysis.winConditions.push('Reanimated threats');
    } else if (analysis.creatureDensity > 40 && analysis.avgCMC >= 3 && analysis.avgCMC <= 4.5) {
      analysis.archetype = 'Midrange';
      analysis.gameplan = 'Play efficient creatures and out-value opponents in the mid-game.';
      analysis.idealTurnWin = 10;
      analysis.winConditions.push('Creature combat');
    } else {
      analysis.archetype = 'Midrange';
      analysis.gameplan = 'Balanced strategy focusing on value and board presence.';
      analysis.idealTurnWin = 10;
      analysis.winConditions.push('General value');
    }

    // Add relevant sub-archetypes based on patterns
    if (patternScores.control > 8 && analysis.archetype !== 'Control') {
      analysis.subArchetypes.push('Control Elements');
    }
    if (patternScores.tokens > 8) {
      analysis.subArchetypes.push('Token Generation');
    }
    if (patternScores.sacrifice > 8) {
      analysis.subArchetypes.push('Sacrifice Theme');
    }
    if (patternScores.card_draw > 15) {
      analysis.subArchetypes.push('Card Advantage');
    }

    // Store pattern scores for reference
    analysis.keyPatterns = Object.entries(patternScores)
      .filter(([, score]) => score > 5)
      .sort((a, b) => b[1] - a[1])
      .map(([pattern, score]) => ({ pattern, score }));

    return analysis;
  };
  const categorizeCard = (type) => {
    if (!type) return 'unknown';
    
    const lower = type.toLowerCase();
    
    // Check for multiple types (e.g., "Artifact Creature")
    if (lower.includes('creature')) return 'creature';
    if (lower.includes('land')) return 'land';
    if (lower.includes('artifact')) return 'artifact';
    if (lower.includes('enchantment')) return 'enchantment';
    if (lower.includes('planeswalker')) return 'planeswalker';
    if (lower.includes('instant')) return 'instant';
    if (lower.includes('sorcery')) return 'sorcery';
    
    return 'unknown';
  };

  // Parse deck list using local card database
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
    
    // Process commanders
    if (commanderText.trim()) {
      const commanderLines = commanderText.split('\n').filter(line => line.trim());
      commanderLines.forEach(line => {
        const card = processLine(line, true);
        deck.commanders.push(card);
        deck.totalCommanders += card.quantity;
      });
    }
    
    // Process main deck
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
    
    // Analyze deck strategy
    if (parsed) {
      const strategy = analyzeDeckStrategy(parsed);
      setDeckStrategy(strategy);
      console.log('Deck Strategy Analysis:', strategy);
    }
    
    setActiveTab('deck');
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

  const runGameSimulation = () => {
  if (!parsedDeck || !deckStrategy) {
    alert('Please parse a deck first!');
    return;
  }
  
  setIsSimulating(true);
  const game = runFullGame(parsedDeck, deckStrategy, 10);
  setGameState(game);
  setIsSimulating(false);
  setActiveTab('simulation');
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            MTG Commander Goldfisher
          </h1>
          <p className="text-gray-400">Automated deck testing and analysis</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('input')}
            className={`px-6 py-3 font-semibold transition-all ${
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
            className={`px-6 py-3 font-semibold transition-all ${
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
  onClick={() => setActiveTab('simulation')}
  className={`px-6 py-3 font-semibold transition-all ${
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
                {/* Commander Section */}
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
                 {activeTab === 'simulation' && (
  <div>
    <h2 className="text-2xl font-bold mb-4">Game Simulation</h2>
    
      {!gameState && (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-6">Ready to simulate a game with your deck?</p>
          <button
            onClick={runGameSimulation}
            disabled={isSimulating || !parsedDeck}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 rounded-lg font-bold text-lg transition-all"
          >
            {isSimulating ? 'Simulating...' : '▶ Run 10-Turn Simulation'}
          </button>
        </div>
      )}
    
    {gameState && (
      <div>
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-900 rounded">
            <p className="text-sm text-gray-400">Turn</p>
            <p className="text-3xl font-bold text-purple-400">{gameState.turn}</p>
          </div>
          <div className="p-4 bg-gray-900 rounded">
            <p className="text-sm text-gray-400">Life</p>
            <p className="text-3xl font-bold text-red-400">{gameState.life}</p>
          </div>
          <div className="p-4 bg-gray-900 rounded">
            <p className="text-sm text-gray-400">Lands</p>
            <p className="text-3xl font-bold text-green-400">{gameState.battlefield.lands.length}</p>
          </div>
          <div className="p-4 bg-gray-900 rounded">
            <p className="text-sm text-gray-400">Creatures</p>
            <p className="text-3xl font-bold text-blue-400">{gameState.battlefield.creatures.length}</p>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3">Battlefield</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-900 rounded">
              <p className="text-sm text-gray-400 mb-2">Lands ({gameState.battlefield.lands.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {gameState.battlefield.lands.map((card, idx) => (
                  <p key={idx} className="text-xs text-gray-300">{card.name}</p>
                ))}
              </div>
            </div>
            <div className="p-4 bg-gray-900 rounded">
              <p className="text-sm text-gray-400 mb-2">Creatures ({gameState.battlefield.creatures.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {gameState.battlefield.creatures.map((card, idx) => (
                  <p key={idx} className="text-xs text-gray-300">
                    {card.name} {card.power && card.toughness && `(${card.power}/${card.toughness})`}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-3">Hand ({gameState.hand.length})</h3>
          <div className="p-4 bg-gray-900 rounded">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {gameState.hand.map((card, idx) => (
                <div key={idx} className="p-2 bg-gray-800 rounded text-xs">
                  <p className="font-semibold">{card.name}</p>
                  <p className="text-gray-400">{card.type_line}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-xl font-semibold mb-3">Game Log</h3>
          <div className="p-4 bg-gray-900 rounded font-mono text-xs max-h-96 overflow-y-auto">
            {gameState.log.map((entry, idx) => (
              <p key={idx} className={entry.startsWith('===') ? 'text-purple-400 font-bold' : 'text-gray-300'}>
                {entry}
              </p>
            ))}
          </div>
        </div>
        
        <div className="mt-6 flex gap-4">
          <button
            onClick={runGameSimulation}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all"
          >
            🔄 Run Another Simulation
          </button>
          <button
            onClick={() => setGameState(null)}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all"
          >
            Clear
          </button>
        </div>
      </div>
    )}
  </div>
)}
                </div>

                {/* Deck List Section */}
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
                  <p className="text-yellow-400 text-xs mt-2">
                    Please ensure "Full card data.csv" has been uploaded to this conversation.
                  </p>
                </div>
              )}
              
              {loading && (
                <div className="mt-4 p-4 bg-blue-900/30 border border-blue-700 rounded">
                  <p className="text-blue-300 text-sm">
                    {loadingStatus}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'deck' && parsedDeck && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Deck Overview</h2>
              
              {/* Strategy Analysis Section */}
              {deckStrategy && (
                <div className="mb-6 p-6 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500 rounded-lg">
                  <h3 className="text-2xl font-bold mb-3 text-purple-300">
                    🎯 Deck Strategy Analysis
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <p className="text-sm text-gray-400 mb-1">Primary Archetype</p>
                        <p className="text-3xl font-bold text-purple-400">{deckStrategy.archetype}</p>
                        {deckStrategy.tribalType && (
                          <p className="text-lg text-purple-300 mt-1">
                            ({deckStrategy.tribalType} Tribal - {deckStrategy.tribalDensity} cards)
                          </p>
                        )}
                      </div>
                      
                      {deckStrategy.subArchetypes.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-gray-400 mb-2">Sub-themes</p>
                          <div className="flex flex-wrap gap-2">
                            {deckStrategy.subArchetypes.map((sub, idx) => (
                              <span key={idx} className="px-3 py-1 bg-blue-900/50 border border-blue-700 rounded-full text-sm text-blue-300">
                                {sub}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mb-4">
                        <p className="text-sm text-gray-400 mb-2">Win Conditions</p>
                        <ul className="list-disc list-inside text-green-400">
                          {deckStrategy.winConditions.map((condition, idx) => (
                            <li key={idx}>{condition}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <div>
                      <div className="mb-4 p-4 bg-gray-900/50 rounded">
                        <p className="text-sm text-gray-400 mb-2">Gameplan</p>
                        <p className="text-sm text-gray-300">{deckStrategy.gameplan}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-900/50 rounded">
                          <p className="text-xs text-gray-400">Avg CMC</p>
                          <p className="text-xl font-bold text-yellow-400">{deckStrategy.avgCMC}</p>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded">
                          <p className="text-xs text-gray-400">Target Win Turn</p>
                          <p className="text-xl font-bold text-green-400">~{deckStrategy.idealTurnWin}</p>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded">
                          <p className="text-xs text-gray-400">Creature %</p>
                          <p className="text-xl font-bold text-blue-400">{deckStrategy.creatureDensity.toFixed(0)}%</p>
                        </div>
                        <div className="p-3 bg-gray-900/50 rounded">
                          <p className="text-xs text-gray-400">Spell %</p>
                          <p className="text-xl font-bold text-red-400">{deckStrategy.spellDensity.toFixed(0)}%</p>
                        </div>
                      </div>
                      
                      {deckStrategy.keyPatterns.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs text-gray-400 mb-2">Key Patterns Detected</p>
                          <div className="flex flex-wrap gap-2">
                            {deckStrategy.keyPatterns.slice(0, 5).map((pattern, idx) => (
                              <span key={idx} className="px-2 py-1 bg-gray-800 rounded text-xs text-gray-300">
                                {pattern.pattern} ({pattern.score})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mb-6 p-4 bg-gray-900 rounded grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Cards</p>
                  <p className="text-2xl font-bold text-purple-400">{parsedDeck.total}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Creatures</p>
                  <p className="text-2xl font-bold text-green-400">{parsedDeck.creatures.reduce((sum, c) => sum + c.quantity, 0)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Instants/Sorceries</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {parsedDeck.instants.reduce((sum, c) => sum + c.quantity, 0) + 
                     parsedDeck.sorceries.reduce((sum, c) => sum + c.quantity, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Lands</p>
                  <p className="text-2xl font-bold text-yellow-400">{parsedDeck.lands.reduce((sum, c) => sum + c.quantity, 0)}</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Commander Section */}
                {parsedDeck.commanders.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold border-b border-purple-700 pb-2 text-purple-400">
                      Commander{parsedDeck.commanders.length > 1 ? 's' : ''} ({parsedDeck.commanders.length})
                    </h3>
                    <div className="grid gap-2 mt-3">
                      {parsedDeck.commanders.map((card, idx) => (
                        <div
                          key={idx}
                          className="bg-purple-900/30 border border-purple-700 p-3 rounded"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-lg">{card.name}</span>
                              <p className="text-sm text-gray-400 mt-1">{card.type_line}</p>
                              {card.oracle_text && (
                                <p className="text-xs text-gray-500 mt-2 line-clamp-2">{card.oracle_text}</p>
                              )}
                            </div>
                            <div className="text-right">
                              {card.mana_cost && (
                                <p className="text-sm font-mono mb-1">{card.mana_cost}</p>
                              )}
                              {card.power && card.toughness && (
                                <p className="text-sm text-green-400">{card.power}/{card.toughness}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card Type Sections */}
                {[
                  { key: 'creatures', title: 'Creatures', color: 'green', icon: '🗡️' },
                  { key: 'instants', title: 'Instants', color: 'blue', icon: '⚡' },
                  { key: 'sorceries', title: 'Sorceries', color: 'red', icon: '🔥' },
                  { key: 'artifacts', title: 'Artifacts', color: 'gray', icon: '⚙️' },
                  { key: 'enchantments', title: 'Enchantments', color: 'purple', icon: '✨' },
                  { key: 'planeswalkers', title: 'Planeswalkers', color: 'orange', icon: '👤' },
                  { key: 'lands', title: 'Lands', color: 'yellow', icon: '🏔️' },
                ].map(section => {
                  const cards = parsedDeck[section.key];
                  if (!cards || cards.length === 0) return null;
                  
                  const totalCount = cards.reduce((sum, c) => sum + c.quantity, 0);
                  
                  return (
                    <div key={section.key}>
                      <h3 className="text-xl font-semibold border-b border-gray-700 pb-2">
                        {section.icon} {section.title} ({cards.length} unique, {totalCount} total)
                      </h3>
                      <div className="grid gap-2 mt-3">
                        {cards.map((card, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-900 p-3 rounded hover:bg-gray-800 transition-all"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className="font-medium">{card.name}</span>
                                {card.quantity > 1 && (
                                  <span className="ml-2 text-gray-400 text-sm">×{card.quantity}</span>
                                )}
                                <p className="text-xs text-gray-500 mt-1">{card.type_line}</p>
                              </div>
                              <div className="text-right ml-4">
                                {card.mana_cost && (
                                  <p className="text-xs font-mono">{card.mana_cost}</p>
                                )}
                                {card.power && card.toughness && (
                                  <p className="text-xs text-green-400 mt-1">{card.power}/{card.toughness}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Unknown Cards */}
                {parsedDeck.unknown && parsedDeck.unknown.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold border-b border-red-700 pb-2 text-red-400">
                      ⚠️ Unknown/Not Found ({parsedDeck.unknown.length})
                    </h3>
                    <div className="grid gap-2 mt-3">
                      {parsedDeck.unknown.map((card, idx) => (
                        <div
                          key={idx}
                          className="bg-red-900/20 border border-red-800 p-3 rounded"
                        >
                          <span className="font-medium">{card.name}</span>
                          <span className="ml-2 text-gray-400 text-sm">×{card.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded">
                <p className="text-sm text-blue-300">
                  <strong>✅ Deck Strategy Identified!</strong> The analyzer has determined your deck's archetype and optimal gameplan.
                </p>
                <p className="text-xs text-blue-400 mt-2">
                  Next: Build the game engine to simulate games based on this strategy!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Version 0.1 - Deck Parser</p>
          <p>Next: Card database integration and basic game engine</p>
        </div>
      </div>
    </div>
  );
}
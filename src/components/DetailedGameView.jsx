import React, { useState } from 'react';
import { Play, RefreshCw, Brain } from 'lucide-react';

export default function DetailedGameView({ parsedDeck, deckStrategy, aiAnalysis, cardDatabase, runEnhancedDetailedGame }) {
  const [gameState, setGameState] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [selectedLogEntry, setSelectedLogEntry] = useState(null);

  const startGame = async () => {
    if (!parsedDeck || !deckStrategy) {
      alert('Please parse a deck first!');
      return;
    }

    setIsRunning(true);
    setCurrentTurn(0);

    try {
      const game = await runEnhancedDetailedGame(
        parsedDeck,
        deckStrategy,
        aiAnalysis,
        cardDatabase,
        10,
        (updatedGame, turn) => {
          setGameState({ ...updatedGame });
          setCurrentTurn(turn);
        }
      );

      setGameState(game);
      setIsRunning(false);
    } catch (error) {
      console.error('Detailed game error:', error);
      alert(`Error running game: ${error.message}`);
      setIsRunning(false);
    }
  };

  const resetGame = () => {
    setGameState(null);
    setCurrentTurn(0);
    setSelectedLogEntry(null);
  };

  if (!gameState) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">🎮 Detailed AI Game</h2>
        <div className="text-center py-12">
          <Brain className="mx-auto mb-6" size={64} color="#a78bfa" />
          <p className="text-gray-400 mb-2">
            Watch the AI execute professional-level gameplay with strategic thinking
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Following the Mana → Engine → Threats protocol with full card data and mulligan logic
          </p>
          <button
            onClick={startGame}
            disabled={isRunning || !parsedDeck}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all"
          >
            {isRunning ? (
              <>
                <Brain className="inline mr-2 animate-pulse" size={20} />
                AI is playing...
              </>
            ) : (
              <>
                <Play className="inline mr-2" size={20} />
                Start Detailed Game
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">🎮 Detailed AI Game</h2>
          <p className="text-sm text-gray-400">Turn {currentTurn} • {gameState.detailedLog.length} actions logged</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Reset
          </button>
        </div>
      </div>

      {/* Game Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Current Turn</p>
          <p className="text-2xl font-bold text-purple-400">{gameState.turn}</p>
        </div>
        <div className="p-4 bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Phase</p>
          <p className="text-2xl font-bold text-blue-400">{gameState.phase}</p>
        </div>
        <div className="p-4 bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Total Damage</p>
          <p className="text-2xl font-bold text-red-400">{gameState.damageDealtThisGame}</p>
        </div>
        <div className="p-4 bg-gray-900 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Hand Size</p>
          <p className="text-2xl font-bold text-green-400">{gameState.hand.length}</p>
        </div>
      </div>

      {/* Battlefield State */}
      <div className="p-6 bg-gray-900 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-purple-300">⚔️ Battlefield</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-semibold text-yellow-400 mb-2">
              🏔️ Lands ({gameState.battlefield.lands.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {gameState.battlefield.lands.length > 0 ? (
                gameState.battlefield.lands.map((land, idx) => (
                  <div key={idx} className="text-xs text-gray-300 p-2 bg-gray-800 rounded">
                    {land.name}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No lands</p>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-green-400 mb-2">
              ⚔️ Creatures ({gameState.battlefield.creatures.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {gameState.battlefield.creatures.length > 0 ? (
                gameState.battlefield.creatures.map((creature, idx) => (
                  <div key={idx} className="text-xs text-gray-300 p-2 bg-gray-800 rounded">
                    {creature.name}
                    {creature.summoningSick && (
                      <span className="ml-2 text-yellow-400">(sick)</span>
                    )}
                    {creature.power && creature.toughness && (
                      <span className="ml-2 text-gray-500">
                        {creature.power}/{creature.toughness}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No creatures</p>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-400 mb-2">
              ⚙️ Other Permanents ({gameState.battlefield.artifacts.length + gameState.battlefield.enchantments.length})
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {[...gameState.battlefield.artifacts, ...gameState.battlefield.enchantments].length > 0 ? (
                [...gameState.battlefield.artifacts, ...gameState.battlefield.enchantments].map((perm, idx) => (
                  <div key={idx} className="text-xs text-gray-300 p-2 bg-gray-800 rounded">
                    {perm.name}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">No artifacts/enchantments</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Current Hand */}
      <div className="p-6 bg-gray-900 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-purple-300">
          🃏 Hand ({gameState.hand.length} cards)
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {gameState.hand.map((card, idx) => (
            <div key={idx} className="p-3 bg-gray-800 rounded hover:bg-gray-750 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold">{card.name}</p>
                  <p className="text-xs text-gray-500">{card.category}</p>
                </div>
                {card.mana_cost && (
                  <p className="text-xs font-mono text-gray-400">{card.mana_cost}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mana Pool */}
      <div className="p-4 bg-gray-900 rounded-lg">
        <h3 className="text-lg font-semibold mb-3 text-purple-300">💎 Available Mana</h3>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{gameState.manaPool.W}</p>
            <p className="text-xs text-gray-400">White</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{gameState.manaPool.U}</p>
            <p className="text-xs text-gray-400">Blue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{gameState.manaPool.B}</p>
            <p className="text-xs text-gray-400">Black</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{gameState.manaPool.R}</p>
            <p className="text-xs text-gray-400">Red</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{gameState.manaPool.G}</p>
            <p className="text-xs text-gray-400">Green</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-400">{gameState.manaPool.C}</p>
            <p className="text-xs text-gray-400">Colorless</p>
          </div>
        </div>
      </div>

      {/* Action Log */}
      <div className="p-6 bg-gray-900 rounded-lg">
        <h3 className="text-lg font-semibold mb-4 text-purple-300">📜 Action Log</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {gameState.detailedLog.map((entry, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedLogEntry(selectedLogEntry === idx ? null : idx)}
              className={`p-3 rounded cursor-pointer transition-all ${
                selectedLogEntry === idx
                  ? 'bg-purple-900/50 border border-purple-500'
                  : entry.success === false
                  ? 'bg-red-900/20 border border-red-800 hover:bg-red-900/30'
                  : entry.action === 'AI Strategic Decision'
                  ? 'bg-blue-900/20 border border-blue-800 hover:bg-blue-900/30'
                  : entry.priority
                  ? entry.priority === 'MANA' 
                    ? 'bg-yellow-900/20 border border-yellow-800 hover:bg-yellow-900/30'
                    : entry.priority === 'ENGINE'
                    ? 'bg-green-900/20 border border-green-800 hover:bg-green-900/30'
                    : 'bg-purple-900/20 border border-purple-800 hover:bg-purple-900/30'
                  : 'bg-gray-800 hover:bg-gray-750'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">T{entry.turn}</span>
                    <span className="text-xs text-purple-400">{entry.phase}</span>
                    {entry.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        entry.priority === 'MANA' ? 'bg-yellow-700 text-yellow-200' :
                        entry.priority === 'ENGINE' ? 'bg-green-700 text-green-200' :
                        entry.priority === 'THREAT' ? 'bg-purple-700 text-purple-200' :
                        'bg-gray-700 text-gray-200'
                      }`}>
                        {entry.priority}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-white">
                      {entry.action}
                      {entry.target && `: ${entry.target}`}
                    </span>
                  </div>
                  {entry.details && (
                    <p className="text-xs text-gray-300">{entry.details}</p>
                  )}
                  {entry.cards && entry.cards.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {entry.cards.map((card, i) => (
                        <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                          {card}
                        </span>
                      ))}
                    </div>
                  )}
                  {selectedLogEntry === idx && entry.reasoning && (
                    <div className="mt-2 p-2 bg-gray-900 rounded">
                      <p className="text-xs text-blue-300">
                        <strong>🧠 AI Reasoning:</strong> {entry.reasoning}
                      </p>
                    </div>
                  )}
                  {selectedLogEntry === idx && entry.decision && (
                    <div className="mt-2 p-2 bg-gray-900 rounded">
                      <p className="text-xs text-green-300">
                        <strong>✓ Decision:</strong> {entry.decision}
                      </p>
                      {entry.confidence && (
                        <p className="text-xs text-gray-400 mt-1">
                          Confidence: {entry.confidence}%
                        </p>
                      )}
                    </div>
                  )}
                </div>
                {entry.success === true && (
                  <span className="text-green-400 text-xs">✓</span>
                )}
                {entry.success === false && (
                  <span className="text-red-400 text-xs">✗</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Metrics */}
      {gameState.metrics && (
        <div className="p-6 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold mb-4 text-purple-300">📊 Performance Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">{gameState.metrics.landsPlayed}</p>
              <p className="text-xs text-gray-400">Lands Played</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">{gameState.metrics.spellsCast}</p>
              <p className="text-xs text-gray-400">Spells Cast</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">{gameState.metrics.commanderCasts}</p>
              <p className="text-xs text-gray-400">Commander Casts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{gameState.metrics.totalManaSpent}</p>
              <p className="text-xs text-gray-400">Total Mana Spent</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-800 rounded">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Mana Efficiency:</span>
              <span className={`font-semibold ${
                gameState.metrics.totalManaWasted < 10 ? 'text-green-400' :
                gameState.metrics.totalManaWasted < 20 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {gameState.metrics.totalManaWasted} wasted
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Win Condition Check */}
      {gameState.damageDealtThisGame >= 40 && (
        <div className="p-6 bg-green-900/30 border-2 border-green-500 rounded-lg">
          <h3 className="text-2xl font-bold text-green-400 mb-2">🎉 Victory!</h3>
          <p className="text-gray-300">
            Dealt lethal damage ({gameState.damageDealtThisGame}) by turn {gameState.turn}
          </p>
        </div>
      )}
    </div>
  );
}
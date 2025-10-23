import React from 'react';

export default function SimulationView({ 
  statistics, 
  isSimulating, 
  parsedDeck, 
  runMultipleGames, 
  clearResults,
  currentGame,
  totalGames
}) {
  // No games have been run yet
  if (!statistics) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Goldfish Analysis</h2>
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">
            Run multiple games to analyze your deck's performance and consistency
          </p>
          <p className="text-sm text-gray-500 mb-6">
            This will simulate 10 games, track statistics, and identify potential issues
          </p>
          <button
            onClick={() => runMultipleGames(10)}
            disabled={isSimulating || !parsedDeck}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-lg transition-all"
          >
            {isSimulating ? `Simulating Game ${currentGame}/${totalGames}...` : '▶ Run 10-Game Analysis'}
          </button>
        </div>
      </div>
    );
  }

  const summary = statistics.summary;

  // Games have been run - show comprehensive statistics
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Goldfish Analysis Results</h2>
        <div className="flex gap-3">
          <button
            onClick={() => runMultipleGames(10)}
            disabled={isSimulating}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-all"
          >
            {isSimulating ? `Simulating ${currentGame}/${totalGames}...` : '🔄 Run 10 More Games'}
          </button>
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-all"
          >
            Clear Results
          </button>
        </div>
      </div>

      {/* Deck Health Score */}
      <div className="mb-6 p-6 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-purple-300 mb-2">Deck Health Score</h3>
            <p className="text-sm text-gray-400">
              Overall consistency and performance rating
            </p>
          </div>
          <div className="text-right">
            <p className={`text-6xl font-bold ${
              statistics.healthScore >= 80 ? 'text-green-400' :
              statistics.healthScore >= 60 ? 'text-yellow-400' :
              statistics.healthScore >= 40 ? 'text-orange-400' : 'text-red-400'
            }`}>
              {statistics.healthScore}
            </p>
            <p className="text-sm text-gray-400">out of 100</p>
          </div>
        </div>
        <div className="mt-4 w-full bg-gray-700 rounded-full h-4">
          <div 
            className={`h-4 rounded-full transition-all ${
              statistics.healthScore >= 80 ? 'bg-green-500' :
              statistics.healthScore >= 60 ? 'bg-yellow-500' :
              statistics.healthScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${statistics.healthScore}%` }}
          ></div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-900 rounded">
          <p className="text-xs text-gray-400 mb-1">Games Played</p>
          <p className="text-3xl font-bold text-purple-400">{summary.totalGames}</p>
        </div>
        <div className="p-4 bg-gray-900 rounded">
          <p className="text-xs text-gray-400 mb-1">Win Rate</p>
          <p className="text-3xl font-bold text-green-400">{summary.winRate}</p>
        </div>
        <div className="p-4 bg-gray-900 rounded">
          <p className="text-xs text-gray-400 mb-1">Avg Win Turn</p>
          <p className="text-3xl font-bold text-yellow-400">
            {summary.avgWinTurn || 'N/A'}
          </p>
        </div>
        <div className="p-4 bg-gray-900 rounded">
          <p className="text-xs text-gray-400 mb-1">Mulligan Rate</p>
          <p className="text-3xl font-bold text-blue-400">{summary.avgMulligans}</p>
        </div>
      </div>

      {/* Performance Sections */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Speed Metrics */}
        <div className="p-4 bg-gray-900 rounded">
          <h3 className="text-lg font-semibold mb-4 text-purple-300">⏱️ Speed Metrics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Opening Hand Kept:</span>
              <span className="text-sm font-semibold text-white">{summary.openingHandKeptRate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">First Spell Cast (avg):</span>
              <span className="text-sm font-semibold text-white">Turn {summary.avgFirstSpellTurn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Commander Cast (avg):</span>
              <span className="text-sm font-semibold text-white">Turn {summary.avgCommanderCastTurn}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Commander Cast (median):</span>
              <span className="text-sm font-semibold text-white">Turn {summary.medianCommanderCastTurn}</span>
            </div>
            {summary.avgWinTurn && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Win Turn (avg):</span>
                  <span className="text-sm font-semibold text-green-400">Turn {summary.avgWinTurn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Win Turn (median):</span>
                  <span className="text-sm font-semibold text-green-400">Turn {summary.medianWinTurn}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Mana Performance */}
        <div className="p-4 bg-gray-900 rounded">
          <h3 className="text-lg font-semibold mb-4 text-purple-300">💎 Mana Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-400">Lands on Turn 4 (avg):</span>
              <span className="text-sm font-semibold text-white">{summary.avgLandsOnTurn4}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Mana Screw:</span>
              <span className={`text-sm font-semibold ${
                parseFloat(summary.manaScrewRate) > 20 ? 'text-red-400' :
                parseFloat(summary.manaScrewRate) > 10 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {summary.manaScrewRate}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Color Screw:</span>
              <span className={`text-sm font-semibold ${
                parseFloat(summary.colorScrewRate) > 20 ? 'text-red-400' :
                parseFloat(summary.colorScrewRate) > 10 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {summary.colorScrewRate}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Mana Flood:</span>
              <span className={`text-sm font-semibold ${
                parseFloat(summary.manaFloodRate) > 20 ? 'text-red-400' :
                parseFloat(summary.manaFloodRate) > 10 ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {summary.manaFloodRate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* End State Averages */}
      <div className="mb-6 p-4 bg-gray-900 rounded">
        <h3 className="text-lg font-semibold mb-4 text-purple-300">📈 Average End State</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{summary.avgFinalDamage}</p>
            <p className="text-xs text-gray-400 mt-1">Damage Dealt</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{summary.avgFinalBoardSize}</p>
            <p className="text-xs text-gray-400 mt-1">Creatures</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{summary.avgFinalLandCount}</p>
            <p className="text-xs text-gray-400 mt-1">Lands</p>
          </div>
        </div>
      </div>

      {/* Problematic Cards */}
      {summary.problematicCards && summary.problematicCards.length > 0 && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded">
          <h3 className="text-lg font-semibold mb-3 text-red-400">⚠️ Problematic Cards</h3>
          <p className="text-sm text-gray-400 mb-3">
            These cards were frequently dead in hand (unable to cast or not useful):
          </p>
          <div className="space-y-2">
            {summary.problematicCards.map((card, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-gray-900 rounded">
                <span className="text-sm font-medium">{card.name}</span>
                <span className="text-sm text-red-400">Dead in {card.percentage} of games</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            💡 Consider replacing these cards with more impactful options
          </p>
        </div>
      )}

      {/* Individual Game Results */}
      <div className="p-4 bg-gray-900 rounded">
        <h3 className="text-lg font-semibold mb-4 text-purple-300">📋 Individual Game Results</h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {statistics.raw.gameResults.map((game, idx) => (
            <div key={idx} className="p-3 bg-gray-800 rounded hover:bg-gray-750 transition-all">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">Game {game.gameNumber}</span>
                  {game.mulligans > 0 && (
                    <span className="ml-2 text-xs text-yellow-400">
                      ({game.mulligans} mulligan{game.mulligans > 1 ? 's' : ''})
                    </span>
                  )}
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-400">
                    Commander: <span className="text-white">T{game.commanderCastTurn || 'N/A'}</span>
                  </span>
                  {game.winTurn ? (
                    <span className="text-green-400 font-semibold">
                      Win: T{game.winTurn}
                    </span>
                  ) : (
                    <span className="text-gray-400">
                      Damage: {game.finalDamage}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analysis Tips */}
      <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded">
        <h3 className="text-sm font-semibold text-blue-300 mb-2">💡 Analysis Tips</h3>
        <ul className="text-xs text-blue-200 space-y-1">
          <li>• <strong>High mulligan rate?</strong> Your mana base or curve might need adjustment</li>
          <li>• <strong>Color screw issues?</strong> Add more dual lands or mana fixing</li>
          <li>• <strong>Slow win turns?</strong> Add more threats or speed up your ramp</li>
          <li>• <strong>Dead cards?</strong> Replace with cards that fit your strategy better</li>
          <li>• <strong>Mana flood/screw?</strong> Adjust your land count (36-38 is typical)</li>
        </ul>
      </div>

      {/* Text Report */}
      <div className="mt-6">
        <details className="p-4 bg-gray-900 rounded cursor-pointer">
          <summary className="font-semibold text-purple-300">📄 View Full Text Report</summary>
          <div className="mt-4 p-4 bg-gray-800 rounded font-mono text-xs whitespace-pre-wrap max-h-96 overflow-y-auto">
            {statistics.textReport}
          </div>
        </details>
      </div>
    </div>
  );
}
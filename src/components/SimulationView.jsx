import React from 'react';

export default function SimulationView({ gameState, isSimulating, parsedDeck, runGameSimulation, setGameState }) {
  if (!gameState) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Game Simulation</h2>
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
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Game Simulation</h2>
      
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
  );
}
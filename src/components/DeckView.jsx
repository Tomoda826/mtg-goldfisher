import React from 'react';

export default function DeckView({ parsedDeck, deckStrategy }) {
  // Handle both old format and new error-handler wrapped format
  const strategy = deckStrategy?.analysis || deckStrategy;
  
  // Early return if no strategy data
  if (!strategy) {
    return (
      <div className="p-6 bg-red-900/30 border border-red-700 rounded">
        <p className="text-red-300">⚠️ Deck strategy analysis unavailable</p>
      </div>
    );
  }
  
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Deck Overview</h2>
      
      {/* Strategy Analysis Section */}
      {strategy && (
        <div className="mb-6 p-6 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500 rounded-lg">
          <h3 className="text-2xl font-bold mb-3 text-purple-300">
            🎯 Deck Strategy Analysis
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-1">Primary Archetype</p>
                <p className="text-3xl font-bold text-purple-400">{strategy.archetype}</p>
                {strategy.tribalType && (
                  <p className="text-lg text-purple-300 mt-1">
                    ({strategy.tribalType} Tribal - {strategy.tribalDensity} cards)
                  </p>
                )}
              </div>
              
              {strategy.subArchetypes && strategy.subArchetypes.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-2">Sub-themes</p>
                  <div className="flex flex-wrap gap-2">
                    {strategy.subArchetypes.map((sub, idx) => (
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
                  {(strategy.winConditions || []).map((condition, idx) => (
                    <li key={idx}>{condition}</li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div>
              <div className="mb-4 p-4 bg-gray-900/50 rounded">
                <p className="text-sm text-gray-400 mb-2">Gameplan</p>
                <p className="text-sm text-gray-300">{strategy.gameplan}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-900/50 rounded">
                  <p className="text-xs text-gray-400">Avg CMC</p>
                  <p className="text-xl font-bold text-yellow-400">{strategy.avgCMC}</p>
                </div>
                <div className="p-3 bg-gray-900/50 rounded">
                  <p className="text-xs text-gray-400">Target Win Turn</p>
                  <p className="text-xl font-bold text-green-400">~{strategy.idealTurnWin}</p>
                </div>
                <div className="p-3 bg-gray-900/50 rounded">
                  <p className="text-xs text-gray-400">Creature %</p>
                  <p className="text-xl font-bold text-blue-400">
                    {strategy.creatureDensity?.toFixed?.(0) || 0}%
                  </p>
                </div>
                <div className="p-3 bg-gray-900/50 rounded">
                  <p className="text-xs text-gray-400">Spell %</p>
                  <p className="text-xl font-bold text-red-400">
                    {strategy.spellDensity?.toFixed?.(0) || 0}%
                  </p>
                </div>
              </div>
              
              {strategy.keyPatterns && strategy.keyPatterns.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-400 mb-2">Key Patterns Detected</p>
                  <div className="flex flex-wrap gap-2">
                    {strategy.keyPatterns.slice(0, 5).map((pattern, idx) => (
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
      
      {/* Deck Statistics */}
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

      {/* Card Lists by Type */}
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
          { key: 'creatures', title: 'Creatures', color: 'green', icon: '⚔️' },
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

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-900/30 border border-blue-700 rounded">
        <p className="text-sm text-blue-300">
          <strong>✅ Deck Strategy Identified!</strong> The analyzer has determined your deck's archetype and optimal gameplan.
        </p>
        <p className="text-xs text-blue-400 mt-2">
          Ready to simulate games! Click the "Simulate Game" tab to test your deck.
        </p>
      </div>
    </div>
  );
}
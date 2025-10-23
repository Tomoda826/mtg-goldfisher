/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { Brain, Target, Zap, Shield, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

function AIAnalysisView({ aiAnalysis, isAnalyzing, onRunAnalysis }) {
  if (isAnalyzing) {
    return (
      <div className="text-center py-12">
        <Brain className="mx-auto mb-4 animate-pulse" size={48} color="#a78bfa" />
        <p className="text-xl text-purple-400 font-semibold mb-2">AI is analyzing your deck...</p>
        <p className="text-sm text-gray-400">This may take 1-2 Minutes</p>
      </div>
    );
  }

  if (!aiAnalysis) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">🤖 AI Deck Analysis</h2>
        <div className="text-center py-12">
          <Brain className="mx-auto mb-6" size={64} color="#a78bfa" />
          <p className="text-gray-400 mb-4">
            Get deep strategic insights powered by GPT-5-mini
          </p>
          <ul className="text-sm text-gray-500 mb-6 text-left max-w-md mx-auto space-y-2">
            <li>✓ Comprehensive win condition analysis</li>
            <li>✓ Key synergy identification</li>
            <li>✓ Optimal gameplan for turns 1-8</li>
            <li>✓ Mulligan criteria and commander timing</li>
            <li>✓ Mana base assessment</li>
            <li>✓ Cut/add recommendations</li>
          </ul>
          <button
            onClick={onRunAnalysis}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold text-lg transition-all"
          >
            🧠 Run AI Analysis
          </button>
          <p className="text-xs text-gray-500 mt-4">Requires OpenAI API key (gpt-4o-mini)</p>
        </div>
      </div>
    );
  }

  if (!aiAnalysis.success) {
    return (
      <div className="p-6 bg-red-900/30 border border-red-700 rounded-lg">
        <div className="flex items-start gap-3">
          <XCircle className="flex-shrink-0 mt-1" size={24} color="#f87171" />
          <div>
            <h3 className="text-lg font-semibold text-red-400 mb-2">AI Analysis Failed</h3>
            <p className="text-sm text-red-300 mb-3">
              Error: {aiAnalysis.error}
            </p>
            <p className="text-xs text-gray-400">
              Please check your OpenAI API key in aiAnalyzer.js and ensure you have API credits available.
            </p>
            <button
              onClick={onRunAnalysis}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle both old format (aiAnalysis.data.analysis) and new error-handler wrapped format (aiAnalysis.analysis)
  const analysis = aiAnalysis?.analysis || aiAnalysis?.data?.analysis;
  
  // Safety check - if we still don't have analysis data, show error
  if (!analysis) {
    return (
      <div className="p-6 bg-yellow-900/30 border border-yellow-700 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="flex-shrink-0 mt-1" size={24} color="#fbbf24" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">Analysis Data Unavailable</h3>
            <p className="text-sm text-yellow-300 mb-3">
              The AI analysis completed but the data format is unexpected.
            </p>
            <button
              onClick={onRunAnalysis}
              className="mt-4 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">🤖 AI Strategic Analysis</h2>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <CheckCircle size={16} className="text-green-400" />
          <span>Analyzed by GPT-4o-mini</span>
        </div>
      </div>

      {/* Overall Strategy */}
      {analysis.overallStrategy && (
        <div className="p-6 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border-2 border-purple-500 rounded-lg">
          <div className="flex items-start gap-3 mb-4">
            <Brain className="flex-shrink-0 mt-1" size={24} color="#a78bfa" />
            <div>
              <h3 className="text-xl font-bold text-purple-300 mb-2">Overall Strategy</h3>
              <p className="text-gray-300">{analysis.overallStrategy}</p>
            </div>
          </div>
        </div>
      )}

      {/* Archetype */}
      {analysis.archetype && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center gap-3 mb-2">
            <Target size={20} color="#a78bfa" />
            <h3 className="text-lg font-semibold text-purple-300">Confirmed Archetype</h3>
          </div>
          <p className="text-2xl font-bold text-white">{analysis.archetype}</p>
        </div>
      )}

      {/* Win Conditions */}
      {analysis.winConditions && analysis.winConditions.length > 0 && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Zap size={20} color="#fbbf24" />
            <h3 className="text-lg font-semibold text-yellow-300">Primary Win Conditions</h3>
          </div>
          <ul className="space-y-2">
            {analysis.winConditions.map((condition, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">⚡</span>
                <span className="text-gray-300">{condition}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Synergies */}
      {analysis.keySynergies && analysis.keySynergies.length > 0 && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp size={20} color="#34d399" />
            <h3 className="text-lg font-semibold text-green-300">Key Synergies & Combos</h3>
          </div>
          <div className="space-y-2">
            {analysis.keySynergies.map((synergy, idx) => (
              <div key={idx} className="p-3 bg-gray-800 rounded">
                <p className="text-sm text-gray-300">{synergy}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optimal Gameplan */}
      {analysis.optimalGameplan && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-300 mb-4">📋 Optimal Gameplan</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {analysis.optimalGameplan.earlyGame && (
              <div className="p-3 bg-gray-800 rounded">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">Early Game (T1-3)</h4>
                <p className="text-xs text-gray-300">{analysis.optimalGameplan.earlyGame}</p>
              </div>
            )}
            {analysis.optimalGameplan.midGame && (
              <div className="p-3 bg-gray-800 rounded">
                <h4 className="text-sm font-semibold text-green-400 mb-2">Mid Game (T4-6)</h4>
                <p className="text-xs text-gray-300">{analysis.optimalGameplan.midGame}</p>
              </div>
            )}
            {analysis.optimalGameplan.lateGame && (
              <div className="p-3 bg-gray-800 rounded">
                <h4 className="text-sm font-semibold text-purple-400 mb-2">Late Game (T7+)</h4>
                <p className="text-xs text-gray-300">{analysis.optimalGameplan.lateGame}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Priority Casting */}
      {analysis.priorityCasting && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-300 mb-4">🎯 Casting Priorities</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {analysis.priorityCasting.earlyPriority && analysis.priorityCasting.earlyPriority.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-400 mb-2">Early Priority</h4>
                <ul className="space-y-1">
                  {analysis.priorityCasting.earlyPriority.map((card, idx) => (
                    <li key={idx} className="text-xs text-gray-300">• {card}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.priorityCasting.midPriority && analysis.priorityCasting.midPriority.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-yellow-400 mb-2">Mid Priority</h4>
                <ul className="space-y-1">
                  {analysis.priorityCasting.midPriority.map((card, idx) => (
                    <li key={idx} className="text-xs text-gray-300">• {card}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.priorityCasting.latePriority && analysis.priorityCasting.latePriority.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-400 mb-2">Late Priority</h4>
                <ul className="space-y-1">
                  {analysis.priorityCasting.latePriority.map((card, idx) => (
                    <li key={idx} className="text-xs text-gray-300">• {card}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Commander Timing */}
      {analysis.commanderTiming && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-300 mb-2">👑 Commander Timing</h3>
          <p className="text-gray-300">{analysis.commanderTiming}</p>
        </div>
      )}

      {/* Mulligan Criteria */}
      {analysis.mulliganCriteria && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-300 mb-3">🎲 Mulligan Criteria</h3>
          <div className="space-y-3">
            {analysis.mulliganCriteria.mustHave && analysis.mulliganCriteria.mustHave.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-400 mb-2">Must Have</h4>
                <ul className="space-y-1">
                  {analysis.mulliganCriteria.mustHave.map((item, idx) => (
                    <li key={idx} className="text-sm text-gray-300">✓ {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {analysis.mulliganCriteria.idealHand && (
              <div className="p-3 bg-gray-800 rounded">
                <h4 className="text-sm font-semibold text-blue-400 mb-2">Ideal Hand</h4>
                <p className="text-sm text-gray-300">{analysis.mulliganCriteria.idealHand}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {analysis.weaknesses && analysis.weaknesses.length > 0 && (
        <div className="p-4 bg-orange-900/30 border border-orange-700 rounded-lg">
          <div className="flex items-center gap-3 mb-3">
            <Shield size={20} color="#fb923c" />
            <h3 className="text-lg font-semibold text-orange-300">Deck Weaknesses</h3>
          </div>
          <ul className="space-y-2">
            {analysis.weaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <AlertTriangle size={16} className="flex-shrink-0 mt-1 text-orange-400" />
                <span className="text-sm text-gray-300">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mana Base Assessment */}
      {analysis.manaBaseAssessment && (
        <div className="p-4 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold text-purple-300 mb-3">💎 Mana Base Assessment</h3>
          {analysis.manaBaseAssessment.rating && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Rating:</span>
                <span className={`text-lg font-bold ${
                  analysis.manaBaseAssessment.rating === 'Excellent' ? 'text-green-400' :
                  analysis.manaBaseAssessment.rating === 'Good' ? 'text-blue-400' :
                  analysis.manaBaseAssessment.rating === 'Adequate' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {analysis.manaBaseAssessment.rating}
                </span>
              </div>
            </div>
          )}
          {analysis.manaBaseAssessment.issues && analysis.manaBaseAssessment.issues.length > 0 && (
            <div className="mb-3">
              <h4 className="text-sm font-semibold text-red-400 mb-2">Issues:</h4>
              <ul className="space-y-1">
                {analysis.manaBaseAssessment.issues.map((issue, idx) => (
                  <li key={idx} className="text-xs text-gray-300">• {issue}</li>
                ))}
              </ul>
            </div>
          )}
          {analysis.manaBaseAssessment.recommendations && analysis.manaBaseAssessment.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-green-400 mb-2">Recommendations:</h4>
              <ul className="space-y-1">
                {analysis.manaBaseAssessment.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-gray-300">✓ {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Improvements */}
      {analysis.improvements && analysis.improvements.length > 0 && (
        <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">🔄 Suggested Improvements</h3>
          <div className="space-y-3">
            {analysis.improvements.map((improvement, idx) => (
              <div key={idx} className="p-3 bg-gray-900 rounded">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <span className="text-red-400 line-through">Cut: {improvement.cut}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-green-400">Add: {improvement.addInstead}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">Reason: {improvement.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-analyze Button */}
      <div className="flex justify-center">
        <button
          onClick={onRunAnalysis}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all"
        >
          🔄 Re-analyze Deck
        </button>
      </div>
    </div>
  );
}

export default AIAnalysisView;
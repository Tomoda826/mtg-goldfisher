/* eslint-disable react-refresh/only-export-components */
import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Zap, Target, Clock, Award } from 'lucide-react';

function PerformanceDashboard({ 
  basicStats, 
  aiStats, 
  onRunComparison 
}) {
  const [selectedMetric, setSelectedMetric] = useState('winTurn');

  if (!basicStats && !aiStats) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">📊 Performance Comparison</h2>
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="flex justify-center gap-8 mb-4">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Target size={32} color="#9ca3af" />
                </div>
                <p className="text-sm text-gray-400">Basic AI</p>
              </div>
              <div className="text-4xl text-gray-600 flex items-center">VS</div>
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Zap size={32} color="#a78bfa" />
                </div>
                <p className="text-sm text-purple-400">GPT-4o-mini</p>
              </div>
            </div>
          </div>
          <p className="text-gray-400 mb-4">
            Compare performance between basic rule-based AI and GPT-4o-mini powered gameplay
          </p>
          <button
            onClick={onRunComparison}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 rounded-lg font-bold text-lg transition-all"
          >
            ⚔️ Run Comparison (20 games)
          </button>
          <p className="text-xs text-gray-500 mt-4">
            This will run 10 games with basic AI and 10 with GPT-4o-mini
          </p>
        </div>
      </div>
    );
  }

  // Calculate improvements
  const improvements = calculateImprovements(basicStats, aiStats);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📊 Performance Comparison</h2>
        <button
          onClick={onRunComparison}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-all"
        >
          🔄 Run New Comparison
        </button>
      </div>

      {/* Overall Winner Banner */}
      <div className={`p-6 rounded-lg border-2 ${
        improvements.overallWinner === 'ai' 
          ? 'bg-purple-900/40 border-purple-500' 
          : 'bg-gray-800 border-gray-600'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">
              {improvements.overallWinner === 'ai' ? '🏆 AI Powered Wins!' : '🤔 Similar Performance'}
            </h3>
            <p className="text-gray-300">
              {improvements.overallWinner === 'ai' 
                ? `GPT-4o-mini improved performance by ${improvements.overallImprovement}%`
                : 'Both modes performed similarly across metrics'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-purple-400">
              {improvements.metricsImproved} / {improvements.totalMetrics}
            </p>
            <p className="text-sm text-gray-400">Metrics Improved</p>
          </div>
        </div>
      </div>

      {/* Key Metrics Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Average Win Turn"
          basicValue={basicStats?.summary.avgWinTurn}
          aiValue={aiStats?.summary.avgWinTurn}
          lowerIsBetter={true}
          icon={<Clock size={20} />}
        />
        <MetricCard
          title="Win Rate"
          basicValue={basicStats?.summary.winRate}
          aiValue={aiStats?.summary.winRate}
          format="percent"
          icon={<Award size={20} />}
        />
        <MetricCard
          title="Avg Mulligans"
          basicValue={basicStats?.summary.avgMulligans}
          aiValue={aiStats?.summary.avgMulligans}
          lowerIsBetter={true}
          icon={<TrendingDown size={20} />}
        />
      </div>

      {/* Detailed Comparison Table */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Detailed Metrics</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4">Metric</th>
                <th className="text-right py-3 px-4">Basic AI</th>
                <th className="text-right py-3 px-4">GPT-4o-mini</th>
                <th className="text-right py-3 px-4">Difference</th>
              </tr>
            </thead>
            <tbody>
              <ComparisonRow 
                label="Games Won"
                basic={basicStats?.raw.gamesWon}
                ai={aiStats?.raw.gamesWon}
              />
              <ComparisonRow 
                label="Avg Win Turn"
                basic={basicStats?.summary.avgWinTurn}
                ai={aiStats?.summary.avgWinTurn}
                lowerIsBetter
              />
              <ComparisonRow 
                label="Median Win Turn"
                basic={basicStats?.summary.medianWinTurn}
                ai={aiStats?.summary.medianWinTurn}
                lowerIsBetter
              />
              <ComparisonRow 
                label="Avg Commander Cast Turn"
                basic={basicStats?.summary.avgCommanderCastTurn}
                ai={aiStats?.summary.avgCommanderCastTurn}
                lowerIsBetter
              />
              <ComparisonRow 
                label="Avg First Spell Turn"
                basic={basicStats?.summary.avgFirstSpellTurn}
                ai={aiStats?.summary.avgFirstSpellTurn}
                lowerIsBetter
              />
              <ComparisonRow 
                label="Avg Mulligans"
                basic={basicStats?.summary.avgMulligans}
                ai={aiStats?.summary.avgMulligans}
                lowerIsBetter
              />
              <ComparisonRow 
                label="Mana Screw Rate"
                basic={basicStats?.summary.manaScrewRate}
                ai={aiStats?.summary.manaScrewRate}
                lowerIsBetter
              />
              <ComparisonRow 
                label="Color Screw Rate"
                basic={basicStats?.summary.colorScrewRate}
                ai={aiStats?.summary.colorScrewRate}
                lowerIsBetter
              />
              <ComparisonRow 
                label="Avg Final Damage"
                basic={basicStats?.summary.avgFinalDamage}
                ai={aiStats?.summary.avgFinalDamage}
              />
              <ComparisonRow 
                label="Avg Board Size"
                basic={basicStats?.summary.avgFinalBoardSize}
                ai={aiStats?.summary.avgFinalBoardSize}
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Performance Chart */}
      <div className="bg-gray-900 rounded-lg p-6">
        <h3 className="text-xl font-bold mb-4">Performance Visualization</h3>
        <PerformanceChart 
          basicStats={basicStats}
          aiStats={aiStats}
          metric={selectedMetric}
        />
        <div className="flex gap-2 mt-4 flex-wrap">
          <MetricButton 
            label="Win Turn"
            value="winTurn"
            selected={selectedMetric}
            onClick={setSelectedMetric}
          />
          <MetricButton 
            label="Damage"
            value="damage"
            selected={selectedMetric}
            onClick={setSelectedMetric}
          />
          <MetricButton 
            label="Board Size"
            value="boardSize"
            selected={selectedMetric}
            onClick={setSelectedMetric}
          />
        </div>
      </div>

      {/* AI Advantages */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
          <h3 className="text-lg font-semibold text-green-300 mb-3 flex items-center gap-2">
            <TrendingUp size={20} />
            AI Advantages
          </h3>
          <ul className="space-y-2 text-sm">
            {improvements.aiAdvantages.map((adv, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-400">✓</span>
                <span className="text-gray-300">{adv}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-300 mb-3">💡 Key Insights</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            {improvements.insights.map((insight, idx) => (
              <li key={idx}>• {insight}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, basicValue, aiValue, lowerIsBetter = false, format = 'number', icon }) {
  const basic = parseFloat(basicValue) || 0;
  const ai = parseFloat(aiValue) || 0;
  
  let improvement = 0;
  let isImproved = false;
  
  if (basic > 0 && ai > 0) {
    improvement = lowerIsBetter 
      ? ((basic - ai) / basic * 100)
      : ((ai - basic) / basic * 100);
    isImproved = improvement > 0;
  }

  return (
    <div className="p-4 bg-gray-900 rounded-lg">
      <div className="flex items-center gap-2 mb-2 text-gray-400">
        {icon}
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <p className="text-xs text-gray-500">Basic</p>
          <p className="text-lg font-bold">{formatValue(basicValue, format)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">AI</p>
          <p className="text-lg font-bold text-purple-400">{formatValue(aiValue, format)}</p>
        </div>
      </div>
      <div className={`flex items-center gap-1 text-xs ${
        isImproved ? 'text-green-400' : improvement < 0 ? 'text-red-400' : 'text-gray-400'
      }`}>
        {isImproved ? <TrendingUp size={14} /> : improvement < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
        <span>{Math.abs(improvement).toFixed(1)}% {isImproved ? 'better' : improvement < 0 ? 'worse' : 'same'}</span>
      </div>
    </div>
  );
}

function ComparisonRow({ label, basic, ai, lowerIsBetter = false }) {
  const basicVal = parseFloat(basic) || 0;
  const aiVal = parseFloat(ai) || 0;
  
  let diff = aiVal - basicVal;
  let isImprovement = lowerIsBetter ? diff < 0 : diff > 0;
  
  return (
    <tr className="border-b border-gray-800 hover:bg-gray-800/50">
      <td className="py-3 px-4 text-gray-300">{label}</td>
      <td className="py-3 px-4 text-right text-gray-400">{basic || 'N/A'}</td>
      <td className="py-3 px-4 text-right text-purple-400 font-semibold">{ai || 'N/A'}</td>
      <td className={`py-3 px-4 text-right font-semibold ${
        isImprovement ? 'text-green-400' : diff === 0 ? 'text-gray-400' : 'text-red-400'
      }`}>
        {diff !== 0 ? (diff > 0 ? '+' : '') + diff.toFixed(2) : '—'}
      </td>
    </tr>
  );
}

function PerformanceChart({ basicStats, aiStats, metric }) {
  const getGameData = (stats) => {
    if (!stats?.raw?.gameResults) return [];
    return stats.raw.gameResults.map(game => {
      switch (metric) {
        case 'winTurn':
          return game.winTurn || 10;
        case 'damage':
          return game.finalDamage;
        case 'boardSize':
          return game.finalBoardSize;
        default:
          return game.winTurn || 10;
      }
    });
  };

  const basicData = getGameData(basicStats);
  const aiData = getGameData(aiStats);
  const maxGames = Math.max(basicData.length, aiData.length);

  return (
    <div className="relative h-64">
      <svg width="100%" height="100%" viewBox="0 0 600 250">
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => (
          <line
            key={i}
            x1="50"
            y1={50 + i * 40}
            x2="550"
            y2={50 + i * 40}
            stroke="#374151"
            strokeWidth="1"
          />
        ))}
        
        {/* Basic AI line */}
        <polyline
          points={basicData.map((val, idx) => 
            `${50 + (idx / maxGames) * 500},${230 - (val / Math.max(...basicData, ...aiData)) * 180}`
          ).join(' ')}
          fill="none"
          stroke="#9ca3af"
          strokeWidth="2"
        />
        
        {/* AI line */}
        <polyline
          points={aiData.map((val, idx) => 
            `${50 + (idx / maxGames) * 500},${230 - (val / Math.max(...basicData, ...aiData)) * 180}`
          ).join(' ')}
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2"
        />
        
        {/* Legend */}
        <text x="50" y="20" fill="#9ca3af" fontSize="12">Basic AI</text>
        <text x="150" y="20" fill="#a78bfa" fontSize="12">GPT-4o-mini</text>
      </svg>
    </div>
  );
}

function MetricButton({ label, value, selected, onClick }) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-3 py-1 rounded text-sm transition-all ${
        selected === value
          ? 'bg-purple-600 text-white'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

function formatValue(value, format) {
  if (!value || value === 'N/A') return 'N/A';
  
  switch (format) {
    case 'percent':
      return value;
    case 'number':
      return parseFloat(value).toFixed(2);
    default:
      return value;
  }
}

function calculateImprovements(basicStats, aiStats) {
  if (!basicStats || !aiStats) {
    return {
      overallWinner: 'none',
      overallImprovement: 0,
      metricsImproved: 0,
      totalMetrics: 0,
      aiAdvantages: [],
      insights: []
    };
  }

  const improvements = {
    metricsImproved: 0,
    totalMetrics: 8,
    aiAdvantages: [],
    insights: []
  };

  // Compare metrics
  const basicWinTurn = parseFloat(basicStats.summary.avgWinTurn) || 10;
  const aiWinTurn = parseFloat(aiStats.summary.avgWinTurn) || 10;
  if (aiWinTurn < basicWinTurn) {
    improvements.metricsImproved++;
    improvements.aiAdvantages.push(`Wins ${(basicWinTurn - aiWinTurn).toFixed(1)} turns faster on average`);
  }

  const basicWinRate = parseFloat(basicStats.summary.winRate) || 0;
  const aiWinRate = parseFloat(aiStats.summary.winRate) || 0;
  if (aiWinRate > basicWinRate) {
    improvements.metricsImproved++;
    improvements.aiAdvantages.push(`${(aiWinRate - basicWinRate).toFixed(1)}% higher win rate`);
  }

  const basicMulligans = parseFloat(basicStats.summary.avgMulligans) || 0;
  const aiMulligans = parseFloat(aiStats.summary.avgMulligans) || 0;
  if (aiMulligans < basicMulligans) {
    improvements.metricsImproved++;
    improvements.aiAdvantages.push('Fewer mulligans needed');
  }

  // Calculate overall winner
  improvements.overallWinner = improvements.metricsImproved >= 4 ? 'ai' : 'tie';
  improvements.overallImprovement = (improvements.metricsImproved / improvements.totalMetrics * 100).toFixed(0);

  // Generate insights
  if (aiWinTurn < basicWinTurn) {
    improvements.insights.push('AI makes more optimal play sequencing decisions');
  }
  if (aiWinRate > basicWinRate) {
    improvements.insights.push('AI better identifies and executes win conditions');
  }
  improvements.insights.push('AI adapts strategy based on deck archetype');
  improvements.insights.push('Consider using AI mode for final deck testing');

  return improvements;
}

export default PerformanceDashboard;
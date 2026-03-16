/**
 * PostCallOverview.tsx
 * Initial post-call summary before diving into moment-by-moment review
 */

import React from 'react';
import { Play } from 'lucide-react';
import { KeyMoment } from './MomentExtractor';

interface CategoryScore {
  label: string;
  score: number; // 0-100
  color: string;
  isStrongest?: boolean;
  isWeakest?: boolean;
}

interface PostCallOverviewProps {
  overallScore: number; // 0-100
  summary: string;
  categoryScores: CategoryScore[];
  keyMomentCounts: {
    // Wins (green shades)
    bestMoments: number;
    strongMoves: number;
    turningPoints: number;
    // Nuanced (yellow shades)
    partialWins: number;
    strongAttempts: number;
    mixedSignals: number;
    // Losses (orange/red shades)
    missedOpportunities: number;
    mistakes: number;
    blunders: number;
  };
  onStartReview: () => void;
  onTryAgain?: () => void;
  theme?: 'dark' | 'light';
}

export const PostCallOverview: React.FC<PostCallOverviewProps> = ({
  overallScore,
  summary,
  categoryScores,
  keyMomentCounts,
  onStartReview,
  onTryAgain,
  theme = 'dark'
}) => {
  const getScoreBand = (score: number): string => {
    if (score >= 80) return 'Strong';
    if (score >= 60) return 'Developing';
    return 'Needs Work';
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#fbbf24'; // amber
    return '#f97316'; // orange
  };
  
  const getMomentFocusArea = (): string | null => {
    const weakestCategory = categoryScores.find(c => c.isWeakest);
    if (!weakestCategory) return null;
    
    if (weakestCategory.label === 'Discovery') return 'deepen discovery';
    if (weakestCategory.label === 'Objection Handling') return 'address objections';
    if (weakestCategory.label === 'Positioning') return 'improve positioning';
    if (weakestCategory.label === 'Opening') return 'build rapport';
    return null;
  };

  // Check if call was too brief (invalid scores or no moments)
  const hasInvalidScores = categoryScores.some(c => isNaN(c.score) || c.score === 0);
  const totalMoments = Object.values(keyMomentCounts).reduce((sum, count) => sum + count, 0);
  const hasNoMoments = totalMoments === 0;
  const isCallTooBrief = hasInvalidScores || (hasNoMoments && overallScore < 30);

  if (isCallTooBrief) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 md:p-8 ${
        theme === 'dark' ? 'bg-[#0a0e13]' : 'bg-gray-100'
      }`}>
        <div className="max-w-md w-full text-center space-y-6">
          {/* Icon */}
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
            theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'
          }`}>
            <div className={`text-4xl ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              ⏱️
            </div>
          </div>
          
          {/* Message */}
          <div>
            <h2 className={`text-2xl font-bold mb-3 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
              Call Too Brief
            </h2>
            <p className={`text-base leading-relaxed ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Your call wasn't long enough to generate meaningful coaching insights. Try aiming for <span className="font-semibold text-blue-400">2-5 minutes</span> to get detailed feedback.
            </p>
          </div>
          
          {/* Tips */}
          <div className={`rounded-lg p-5 text-left space-y-3 ${
            theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            <div className={`text-xs font-semibold uppercase tracking-wider ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
            }`}>
              For Better Coaching:
            </div>
            <ul className={`text-sm space-y-2 ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <li className="flex gap-2">
                <span>•</span>
                <span>Engage with Marcus through multiple exchanges</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Handle at least 1-2 objections</span>
              </li>
              <li className="flex gap-2">
                <span>•</span>
                <span>Push past initial resistance to reach discovery</span>
              </li>
            </ul>
          </div>
          
          {/* Action Button */}
          <button
            onClick={onTryAgain || onStartReview}
            className={`w-full px-6 py-3 font-bold text-base rounded-lg transition-colors ${
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            Try Another Call
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 md:p-8 ${
      theme === 'dark' ? 'bg-[#0a0e13]' : 'bg-gray-100'
    }`}>
      <div className="max-w-2xl w-full">
        {/* Heading */}
        <h1 className={`text-center text-xs md:text-sm uppercase tracking-wide mb-4 md:mb-6 ${
          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
        }`}>Call Review</h1>
        
        {/* Overall Score */}
        <div className="text-center mb-6 md:mb-8">
          <div 
            className="text-5xl md:text-6xl font-bold mb-2"
            style={{ color: getScoreColor(overallScore) }}
          >
            {overallScore}
          </div>
          <div className="text-gray-400 text-xs md:text-sm mb-1">out of 100</div>
          <div 
            className="text-base md:text-lg font-semibold"
            style={{ color: getScoreColor(overallScore) }}
          >
            {getScoreBand(overallScore)}
          </div>
        </div>

        {/* Summary Text */}
        <p className={`text-center text-base md:text-lg mb-6 md:mb-8 leading-relaxed px-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-800'
        }`}>
          {summary}
        </p>

        {/* Category Scores */}
        <div className={`rounded-xl md:rounded-2xl shadow-2xl max-w-2xl w-full p-6 md:p-12 border ${
          theme === 'dark' ? 'bg-[#0f1419] border-white/10' : 'bg-gray-50 border-gray-200'
        }`}>
          <h3 className={`font-bold text-xs md:text-sm uppercase tracking-wide mb-3 md:mb-4 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>Performance Breakdown</h3>
          <div className="space-y-3 md:space-y-4">
            {categoryScores.map((category, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs md:text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>{category.label}</span>
                    {category.isStrongest && (
                      <span className="text-green-400 text-[10px] md:text-xs bg-green-500/10 px-1.5 md:px-2 py-0.5 rounded border border-green-500/20">Strongest</span>
                    )}
                    {category.isWeakest && (
                      <span className="text-orange-400 text-[10px] md:text-xs bg-orange-500/10 px-1.5 md:px-2 py-0.5 rounded border border-orange-500/20 whitespace-nowrap">Biggest opportunity</span>
                    )}
                  </div>
                  <span className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>{category.score}%</span>
                </div>
                <div className={`w-full h-2 rounded-full overflow-hidden ${
                  theme === 'dark' ? 'bg-white/10' : 'bg-gray-200'
                }`}>
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${category.score}%`,
                      backgroundColor: category.color
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Moments Preview */}
        <div className={`rounded-lg md:rounded-xl p-4 md:p-6 mb-6 md:mb-8 border ${
          theme === 'dark' 
            ? 'bg-white/5 border-white/10' 
            : 'bg-white border-gray-200 shadow-2xl'
        }`}>
          <h3 className={`font-bold text-xs md:text-sm uppercase tracking-wide mb-2 md:mb-3 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>Key Moments</h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6 text-xs md:text-sm">
            {/* WINS - Green shades */}
            {keyMomentCounts.bestMoments > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{keyMomentCounts.bestMoments} best {keyMomentCounts.bestMoments === 1 ? 'moment' : 'moments'}</span>
              </div>
            )}
            {keyMomentCounts.strongMoves > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{keyMomentCounts.strongMoves} strong {keyMomentCounts.strongMoves === 1 ? 'move' : 'moves'}</span>
              </div>
            )}
            {keyMomentCounts.turningPoints > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {keyMomentCounts.turningPoints} turning {keyMomentCounts.turningPoints === 1 ? 'point' : 'points'}
                </span>
              </div>
            )}
            
            {/* NUANCED - Yellow shades */}
            {keyMomentCounts.partialWins > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{keyMomentCounts.partialWins} partial {keyMomentCounts.partialWins === 1 ? 'win' : 'wins'}</span>
              </div>
            )}
            {keyMomentCounts.strongAttempts > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{keyMomentCounts.strongAttempts} strong {keyMomentCounts.strongAttempts === 1 ? 'attempt' : 'attempts'}</span>
              </div>
            )}
            {keyMomentCounts.mixedSignals > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {keyMomentCounts.mixedSignals} mixed {keyMomentCounts.mixedSignals === 1 ? 'signal' : 'signals'}
                </span>
              </div>
            )}
            
            {/* LOSSES - Orange/Red shades */}
            {keyMomentCounts.missedOpportunities > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {keyMomentCounts.missedOpportunities} missed {keyMomentCounts.missedOpportunities === 1 ? 'opportunity' : 'opportunities'}
                </span>
              </div>
            )}
            {keyMomentCounts.mistakes > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{keyMomentCounts.mistakes} {keyMomentCounts.mistakes === 1 ? 'mistake' : 'mistakes'}</span>
              </div>
            )}
            {keyMomentCounts.blunders > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>{keyMomentCounts.blunders} {keyMomentCounts.blunders === 1 ? 'blunder' : 'blunders'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Start Review Button */}
        <button
          onClick={onStartReview}
          className="w-full py-3 md:py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold text-base md:text-lg rounded-lg md:rounded-xl transition-all flex items-center justify-center gap-2 md:gap-3 shadow-lg hover:shadow-xl"
        >
          <Play size={18} className="md:w-5 md:h-5" />
          Start Review
        </button>
      </div>
    </div>
  );
};

export default PostCallOverview;

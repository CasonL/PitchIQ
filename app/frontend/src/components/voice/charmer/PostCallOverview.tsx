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
    incredible: number;   // Blue: best_moment, turning_point
    great: number;        // Green: strong_move
    goodAttempt: number;  // Yellow: partial_turning_point, strong_attempt, mixed_signal
    mistakes: number;     // Red: missed_opportunity, mistake, blunder
  };
  onStartReview: () => void;
  onTryAgain?: () => void;
  theme?: 'dark' | 'light';
  coachingData?: {
    identifiedIssue: string | null;
    whatWorked: string;
  };
  callMetadata?: {
    durationSeconds: number;
    exchangeCount: number;
    analysisConfidence: 'high' | 'medium' | 'low';
  };
}

export const PostCallOverview: React.FC<PostCallOverviewProps> = ({
  overallScore,
  summary,
  categoryScores,
  keyMomentCounts,
  onStartReview,
  onTryAgain,
  theme = 'dark',
  coachingData,
  callMetadata
}) => {
  
  // Map coaching issues to readable labels
  const getCoachingLabel = (issue: string | null): string => {
    if (!issue) return '';
    const labels: Record<string, string> = {
      'no-discovery': 'Ask discovery questions instead of pitching',
      'premature-pitch': 'Build rapport before diving into features',
      'close-ended': 'Use open-ended questions to create dialogue',
      'feature-dump': 'Focus on their needs, not your features',
      'weak-opening': 'Strengthen your opening to capture attention',
      'vague': 'Be specific with examples and proof points',
      'too-fast': 'Slow down and listen more',
      'apologetic': 'Show confidence in your solution',
      'feature-focus': 'Connect features to their actual problems'
    };
    return labels[issue] || issue;
  };
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
  
  // Check if call was too brief using actual metadata, not UI inference
  const isCallTooBrief = callMetadata
    ? callMetadata.durationSeconds < 90 ||
      callMetadata.exchangeCount < 4 ||
      callMetadata.analysisConfidence === 'low'
    : false; // Fallback: trust the data if metadata unavailable
  
  const totalMoments = Object.values(keyMomentCounts).reduce((sum, count) => sum + count, 0);
  
  // Dynamic CTA text based on state
  const getReviewCTA = (): string => {
    if (coachingData?.identifiedIssue) return 'Review Biggest Opportunity';
    if (keyMomentCounts.incredible > 0) return 'See What Worked';
    if (keyMomentCounts.mistakes > 0) return 'Review Key Moments';
    return 'Start Review';
  };
  
  // Add context below moment counts when useful
  const getMomentContext = (): string => {
    const weakestCat = categoryScores.find(c => c.isWeakest);
    if (keyMomentCounts.mistakes > keyMomentCounts.incredible + keyMomentCounts.great) {
      return 'Most leverage is in your missed opportunities';
    }
    if (keyMomentCounts.incredible >= 2 && weakestCat?.label === 'Discovery') {
      return 'Your strongest moments came early—maintain that energy into discovery';
    }
    if (weakestCat) {
      return `Focus your review on ${weakestCat.label.toLowerCase()} patterns`;
    }
    return '';
  };

  console.log('🔍 PostCallOverview Debug:', {
    coachingData,
    hasCoaching: !!coachingData?.identifiedIssue,
    isCallTooBrief,
    callMetadata,
    overallScore,
    totalMoments
  });

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
          
          {/* Coaching Feedback - Show even for brief calls */}
          {coachingData?.identifiedIssue && (
            <div className={`rounded-lg p-5 text-left space-y-3 ${
              theme === 'dark' ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              }`}>
                Biggest Opportunity:
              </div>
              <div className={`text-base font-medium ${
                theme === 'dark' ? 'text-red-300' : 'text-red-700'
              }`}>
                {getCoachingLabel(coachingData.identifiedIssue)}
              </div>
              {coachingData.whatWorked && (
                <div className="pt-2 mt-2 border-t border-white/10">
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  }`}>
                    What Worked:
                  </div>
                  <div className={`text-sm ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {coachingData.whatWorked}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Tips */}
          <div className={`rounded-lg p-5 text-left space-y-3 ${
            theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
          }`}>
            <div className={`text-xs font-semibold uppercase tracking-wider ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
            }`}>
              Next Time:
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
            {keyMomentCounts.incredible > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {keyMomentCounts.incredible} incredible {keyMomentCounts.incredible === 1 ? 'moment' : 'moments'}
                </span>
              </div>
            )}
            {keyMomentCounts.great > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {keyMomentCounts.great} great {keyMomentCounts.great === 1 ? 'move' : 'moves'}
                </span>
              </div>
            )}
            {keyMomentCounts.goodAttempt > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {keyMomentCounts.goodAttempt} good {keyMomentCounts.goodAttempt === 1 ? 'attempt' : 'attempts'}
                </span>
              </div>
            )}
            {keyMomentCounts.mistakes > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
                  {keyMomentCounts.mistakes} {keyMomentCounts.mistakes === 1 ? 'mistake' : 'mistakes'}
                </span>
              </div>
            )}
          </div>
          {totalMoments > 0 && getMomentContext() && (
            <p className={`text-xs mt-3 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
            }`}>
              {getMomentContext()}
            </p>
          )}
        </div>

        {/* Coaching Feedback - Main Issue Detected */}
        {coachingData?.identifiedIssue && (
          <div className={`rounded-lg md:rounded-xl p-5 md:p-6 mb-6 md:mb-8 border ${
            theme === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${
              theme === 'dark' ? 'text-red-400' : 'text-red-600'
            }`}>
              Biggest Opportunity:
            </div>
            <div className={`text-base md:text-lg font-medium mb-4 ${
              theme === 'dark' ? 'text-red-300' : 'text-red-700'
            }`}>
              {getCoachingLabel(coachingData.identifiedIssue)}
            </div>
            {coachingData.whatWorked && (
              <div className="pt-3 mt-3 border-t border-white/10">
                <div className={`text-xs font-semibold uppercase tracking-wider mb-2 ${
                  theme === 'dark' ? 'text-green-400' : 'text-green-600'
                }`}>
                  What Worked:
                </div>
                <div className={`text-sm md:text-base ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {coachingData.whatWorked}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Start Review Button */}
        <button
          onClick={onStartReview}
          className="w-full py-3 md:py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold text-base md:text-lg rounded-lg md:rounded-xl transition-all flex items-center justify-center gap-2 md:gap-3 shadow-lg hover:shadow-xl"
        >
          <Play size={18} className="md:w-5 md:h-5" />
          {getReviewCTA()}
        </button>
      </div>
    </div>
  );
};

export default PostCallOverview;

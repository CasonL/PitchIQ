/**
 * MarcusScoreReveal.tsx
 * Post-call score reveal with professional, dopamine-driven feedback
 * 
 * Design Philosophy:
 * - Clean, minimal presentation (white background, bold reds/blacks)
 * - Progressive reveal animation for dopamine hit
 * - Clear, actionable feedback
 */

import React, { useEffect, useState } from 'react';
import { MarcusScenario } from './MarcusScenarios';

interface ScoreData {
  scenario: string;
  difficulty: 'easy' | 'medium' | 'hard';
  duration: number;
  score: {
    permissionOpener: boolean;
    discoveryQuestionsAsked: number;
    problemFramed: boolean;
    objectionsHandled: number;
    closeAttempted: boolean;
    conciseControl: boolean;
    totalPoints: number;
  };
  painPoints: {
    discoveredCount: number;
    requiredCount: number;
  };
  objections: {
    handledCount: number;
    requiredCount: number;
  };
  winCondition: {
    won: boolean;
    reason: string;
  };
}

interface MarcusScoreRevealProps {
  scoreData: ScoreData;
  onTryAgain: () => void;
  onChangeDifficulty: () => void;
  onExit: () => void;
}

export const MarcusScoreReveal: React.FC<MarcusScoreRevealProps> = ({
  scoreData,
  onTryAgain,
  onChangeDifficulty,
  onExit
}) => {
  const [revealed, setRevealed] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  useEffect(() => {
    // Progressive reveal animation
    const timer1 = setTimeout(() => setRevealed(true), 100);
    const timer2 = setTimeout(() => setAnimationStep(1), 300);
    const timer3 = setTimeout(() => setAnimationStep(2), 600);
    const timer4 = setTimeout(() => setAnimationStep(3), 900);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, []);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-amber-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getDifficultyEmoji = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
      default: return '⚪';
    }
  };

  const getScoreGrade = (points: number) => {
    if (points >= 9) return { grade: 'A+', color: 'text-green-600', emoji: '🏆' };
    if (points >= 8) return { grade: 'A', color: 'text-green-600', emoji: '⭐' };
    if (points >= 7) return { grade: 'B', color: 'text-blue-600', emoji: '👍' };
    if (points >= 6) return { grade: 'C', color: 'text-amber-600', emoji: '📈' };
    return { grade: 'D', color: 'text-red-600', emoji: '💪' };
  };

  const scoreGrade = getScoreGrade(scoreData.score.totalPoints);
  const wonChallenge = scoreData.winCondition.won;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div 
        className={`bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto my-auto transition-all duration-500 transform ${
          revealed ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Header - Win/Loss State */}
        <div className={`p-8 rounded-t-2xl ${wonChallenge ? 'bg-green-50' : 'bg-gray-50'}`}>
          <div className="text-center">
            <div className="text-6xl mb-4">
              {wonChallenge ? '🎉' : '📊'}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {wonChallenge ? 'Challenge Complete!' : 'Call Complete'}
            </h1>
            <p className="text-gray-600">
              {wonChallenge ? scoreData.winCondition.reason : 'Keep practicing. You\'re getting better.'}
            </p>
          </div>
        </div>

        {/* Score Display */}
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center justify-center gap-6 mb-6">
            {/* Total Score */}
            <div 
              className={`text-center transition-all duration-500 ${
                animationStep >= 1 ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
              }`}
            >
              <div className="text-6xl font-bold text-gray-900 mb-2">
                {scoreData.score.totalPoints}
                <span className="text-3xl text-gray-400">/10</span>
              </div>
              <div className={`text-2xl font-bold ${scoreGrade.color} flex items-center justify-center gap-2`}>
                <span>{scoreGrade.emoji}</span>
                <span>Grade {scoreGrade.grade}</span>
              </div>
            </div>

            {/* Difficulty Badge */}
            <div 
              className={`transition-all duration-500 ${
                animationStep >= 1 ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
              }`}
            >
              <div className="bg-gray-100 rounded-xl p-4 text-center min-w-[120px]">
                <div className="text-3xl mb-1">{getDifficultyEmoji(scoreData.difficulty)}</div>
                <div className={`text-xs font-bold uppercase ${getDifficultyColor(scoreData.difficulty)}`}>
                  {scoreData.difficulty}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.floor(scoreData.duration / 60)}:{String(scoreData.duration % 60).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div 
            className={`space-y-3 transition-all duration-500 ${
              animationStep >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
            }`}
          >
            <div className="grid grid-cols-2 gap-3">
              <ScoreItem
                label="Permission Opener"
                achieved={scoreData.score.permissionOpener}
                points={1}
              />
              <ScoreItem
                label="Discovery Questions"
                achieved={scoreData.score.discoveryQuestionsAsked >= 2}
                points={2}
                detail={`${scoreData.score.discoveryQuestionsAsked}/2 asked`}
              />
              <ScoreItem
                label="Problem Framing"
                achieved={scoreData.score.problemFramed}
                points={2}
              />
              <ScoreItem
                label="Objection Handling"
                achieved={scoreData.score.objectionsHandled >= scoreData.objections.requiredCount}
                points={2}
                detail={`${scoreData.score.objectionsHandled}/${scoreData.objections.requiredCount} handled`}
              />
              <ScoreItem
                label="Clear Close"
                achieved={scoreData.score.closeAttempted}
                points={2}
              />
              <ScoreItem
                label="Concise Control"
                achieved={scoreData.score.conciseControl}
                points={1}
                detail={scoreData.duration <= 90 ? "Under 90s" : "Over 90s"}
              />
            </div>
          </div>
        </div>

        {/* Win Condition Status */}
        <div 
          className={`p-6 bg-gray-50 transition-all duration-500 ${
            animationStep >= 3 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="space-y-3">
            <WinConditionItem
              label="Pain Points Discovered"
              achieved={scoreData.painPoints.discoveredCount >= scoreData.painPoints.requiredCount}
              current={scoreData.painPoints.discoveredCount}
              required={scoreData.painPoints.requiredCount}
            />
            <WinConditionItem
              label="Objections Handled"
              achieved={scoreData.score.objectionsHandled >= scoreData.objections.requiredCount}
              current={scoreData.score.objectionsHandled}
              required={scoreData.objections.requiredCount}
            />
            <WinConditionItem
              label="Meeting Booked"
              achieved={scoreData.score.closeAttempted}
              current={scoreData.score.closeAttempted ? 1 : 0}
              required={1}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-8 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={onExit}
              className="flex-1 px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors rounded-xl hover:bg-gray-100"
            >
              Exit
            </button>
            <button
              onClick={onChangeDifficulty}
              className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium transition-colors rounded-xl"
            >
              Change Difficulty
            </button>
            <button
              onClick={onTryAgain}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const ScoreItem: React.FC<{
  label: string;
  achieved: boolean;
  points: number;
  detail?: string;
}> = ({ label, achieved, points, detail }) => (
  <div className={`p-3 rounded-lg border-2 ${achieved ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
    <div className="flex items-center justify-between mb-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <span className={`text-lg ${achieved ? 'text-green-600' : 'text-gray-400'}`}>
        {achieved ? '✓' : '○'}
      </span>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{detail || (achieved ? 'Completed' : 'Not completed')}</span>
      <span className={`text-xs font-bold ${achieved ? 'text-green-600' : 'text-gray-400'}`}>
        {achieved ? `+${points}pt${points > 1 ? 's' : ''}` : `${points}pt${points > 1 ? 's' : ''}`}
      </span>
    </div>
  </div>
);

const WinConditionItem: React.FC<{
  label: string;
  achieved: boolean;
  current: number;
  required: number;
}> = ({ label, achieved, current, required }) => (
  <div className="flex items-center justify-between p-3 bg-white rounded-lg border-2 border-gray-200">
    <div className="flex items-center gap-3">
      <span className={`text-xl ${achieved ? 'text-green-600' : 'text-gray-400'}`}>
        {achieved ? '✓' : '○'}
      </span>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
    <div className={`text-sm font-bold ${achieved ? 'text-green-600' : 'text-gray-500'}`}>
      {current}/{required}
    </div>
  </div>
);

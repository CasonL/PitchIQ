/**
 * MarcusChallengeLobby.tsx
 * Difficulty selector for the Marcus cold call challenge
 * 
 * Design Philosophy:
 * - Professional, minimalist (PitchIQ brand)
 * - Dopamine-driven progression (clear unlocks, score feedback)
 * - Not "gamified" in appearance, but rewards system underneath
 */

import React, { useState } from 'react';
import { MarcusScenario, ALL_SCENARIOS, ScenarioDifficulty } from './MarcusScenarios';

// Keyframe animation for gradient border
const gradientAnimation = `
  @keyframes gradient-shift {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
`;

interface MarcusChallengeLobbyProps {
  onStartChallenge: (scenario: MarcusScenario) => void;
  onCancel?: () => void;
}

export const MarcusChallengeLobby: React.FC<MarcusChallengeLobbyProps> = ({
  onStartChallenge,
  onCancel
}) => {
  const [selectedScenario, setSelectedScenario] = useState<MarcusScenario | null>(null);

  const getDifficultyColor = (difficulty: ScenarioDifficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-amber-600';
      case 'hard': return 'text-red-600';
    }
  };

  const getDifficultyBg = (difficulty: ScenarioDifficulty) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-50 border-green-200';
      case 'medium': return 'bg-amber-50 border-amber-200';
      case 'hard': return 'bg-red-50 border-red-200';
    }
  };

  const getDifficultyIndicator = (difficulty: ScenarioDifficulty) => {
    switch (difficulty) {
      case 'easy': return { text: 'BEGINNER', color: 'bg-green-500' };
      case 'medium': return { text: 'INTERMEDIATE', color: 'bg-amber-500' };
      case 'hard': return { text: 'ADVANCED', color: 'bg-red-500' };
    }
  };


  return (
    <>
      <style>{gradientAnimation}</style>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-8 border-b border-gray-100">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            The Marcus Challenge
          </h1>
          <p className="text-gray-600">
            Master the cold call. Book the meeting. Prove your skills.
          </p>
        </div>

        {/* Scenario Selection */}
        <div className="p-8 space-y-4">
          {ALL_SCENARIOS.map((scenario) => {
            const indicator = getDifficultyIndicator(scenario.difficulty);
            const isSelected = selectedScenario?.id === scenario.id;

            return (
              <div
                key={scenario.id}
                className="relative"
                style={scenario.id === 'adaptive-anything' ? {
                  background: 'linear-gradient(135deg, #dc2626, #991b1b, #7f1d1d, #991b1b, #dc2626)',
                  backgroundSize: '200% 200%',
                  animation: 'gradient-shift 4s ease infinite',
                  padding: '2px',
                  borderRadius: '0.75rem'
                } : undefined}
              >
                <div
                  onClick={() => setSelectedScenario(scenario)}
                  className={`group relative w-full text-left p-6 rounded-xl border-2 bg-white transition-colors duration-200 cursor-pointer ${
                    isSelected ? 'border-white' : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                  }`}
                  style={scenario.id === 'adaptive-anything' ? { borderColor: 'transparent' } : undefined}
                >
                {/* Difficulty badge - always visible, works on touch and desktop */}
                <div className={`absolute top-4 right-4 z-30 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide text-white ${indicator.color}`}>
                  {indicator.text}
                </div>

                {/* Dark overlay - hover/selected visual feedback only, no longer gates content */}
                <div className={`pointer-events-none absolute inset-0 rounded-xl bg-black/75 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

                {/* Content - always visible on all devices (fixes: hover-only info was invisible on touch) */}
                <div className={`relative z-10 pr-20 transition-colors duration-200 ${isSelected ? 'text-white' : 'text-gray-900 group-hover:text-white'}`}>
                  <h3 className="text-xl font-bold">
                    {scenario.name}
                  </h3>
                  <p className={`text-sm mt-1 transition-colors duration-200 ${isSelected ? 'text-white/80' : 'text-gray-600 group-hover:text-white/80'}`}>
                    {scenario.description}
                  </p>
                  <p className={`text-xs mt-3 leading-relaxed transition-colors duration-200 ${isSelected ? 'text-white/60' : 'text-gray-500 group-hover:text-white/70'}`}>
                    {scenario.productDescription}
                  </p>
                </div>
              </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="p-8 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          {/* Warm-up notice — always visible so users aren't surprised */}
          <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <span className="text-amber-500 text-lg leading-none mt-0.5">⏱</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">First call warm-up</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Marcus's AI may take a few seconds to warm up on the first message or two. After that, responses are fast. This is normal — hang tight.
              </p>
            </div>
          </div>
          {selectedScenario && (
            <div className="mb-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-center">
              <p className="text-xs text-gray-600">
                🎯 Goal: <span className="font-semibold text-red-600">Book a follow-up or meeting</span>
              </p>
              <p className="text-xs text-gray-500">
                💡 Marcus values directness — get to the point fast.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={() => selectedScenario && onStartChallenge(selectedScenario)}
              disabled={!selectedScenario}
              className={`
                px-8 py-3 rounded-xl font-bold text-white transition-all duration-200
                ${selectedScenario
                  ? 'bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 cursor-not-allowed'
                }
              `}
            >
              {selectedScenario ? 'Start Call with Marcus' : 'Select a Challenge'}
            </button>
          </div>
        </div>

      </div>
    </div>
    </>
  );
};

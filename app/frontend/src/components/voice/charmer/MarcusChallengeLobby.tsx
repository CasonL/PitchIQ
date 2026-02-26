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
              <button
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario)}
                className={`group relative w-full text-left p-6 rounded-xl border-2 bg-white transition-colors duration-200 ${isSelected ? 'border-white' : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'}`}
              >
                {/* Layer 1: Dark overlay - show on hover OR selected */}
                <div className={`pointer-events-none absolute inset-0 rounded-xl bg-black/75 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

                {/* Layer 2: Base content - visible by default and when selected, hidden when hovering */}
                <div className={`relative z-10 flex items-start gap-3 transition-all duration-200 ${isSelected ? 'text-white opacity-100' : 'text-gray-900 group-hover:opacity-0'}`}>
                  <div className={`w-3 h-3 rounded-full mt-1 ${indicator.color}`} />
                  <div>
                    <h3 className="text-xl font-bold">
                      {scenario.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {scenario.description}
                    </p>
                  </div>
                </div>

                {/* Layer 3: Hover description - ONLY shows when NOT selected */}
                {!isSelected && (
                  <div className="pointer-events-none absolute inset-0 z-20 rounded-xl p-6 flex items-start justify-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-white text-base leading-relaxed">
                      {scenario.productDescription}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="p-8 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
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
  );
};

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
  const [learnModalOpen, setLearnModalOpen] = useState<string | null>(null);

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

  const getScenarioEducation = (scenarioId: string) => {
    switch (scenarioId) {
      case 'website-audit':
        return {
          title: 'Why Website Refresh Matters',
          sections: [
            {
              heading: 'Your Website is Your First Impression',
              content: 'Before a prospect ever picks up the phone, they\'re researching you online. Your website communicates whether you\'re **current, credible, and worth their time**.'
            },
            {
              heading: 'An outdated website costs you',
              bullets: [
                'Lost trust - prospects question if you can deliver modern solutions',
                'Missed opportunities - potential clients leave before contacting you',
                'Competitive disadvantage - rivals with better sites win before you compete',
                'Wasted marketing - ads and referrals bounce off a poor website experience'
              ]
            },
            {
              heading: 'What a Modern Website Delivers',
              bullets: [
                'Credibility that converts visitors into leads',
                'Clear value proposition that differentiates you',
                'Mobile-friendly experience that matches how people research',
                'Foundation for growth - SEO, content marketing, automation'
              ]
            },
            {
              heading: 'The Real Cost',
              content: 'It\'s not about aesthetics. It\'s about **every prospect who researched you and chose someone else** because your website didn\'t earn their trust. That\'s revenue walking away before you ever knew they existed.',
              highlight: true
            }
          ]
        };
      case 'promotional-swag':
        return {
          title: 'Why Promotional Materials Matter',
          sections: [
            {
              heading: 'Retention is Cheaper Than Acquisition',
              content: 'Acquiring a new customer costs **5-25x more** than keeping an existing one. Promotional materials aren\'t "nice-to-have" - they\'re a retention and relationship tool.'
            },
            {
              heading: 'What Thoughtful Gifts Actually Do',
              bullets: [
                'Keep your brand visible daily (coffee mugs, notebooks, desk items)',
                'Strengthen relationships through thoughtful gestures at key moments',
                'Trigger conversations and referrals ("Where\'d you get that?")',
                'Show appreciation that builds loyalty beyond transactions'
              ]
            },
            {
              heading: 'The Business Impact',
              bullets: [
                'Repeat business - clients remember who valued them',
                'Referrals - branded items spark organic conversations',
                'Top-of-mind awareness - when they need you again, they think of you first',
                'Differentiation - thoughtful gifts set you apart from competitors who do nothing'
              ]
            },
            {
              heading: 'The Real Value',
              content: 'This isn\'t about mugs or pens. It\'s about **staying connected, building loyalty, and turning one-time buyers into long-term partners**. That\'s how businesses grow without constantly chasing new leads.',
              highlight: true
            }
          ]
        };
      default:
        return null;
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
                <button
                  onClick={() => setSelectedScenario(scenario)}
                  className={`group relative w-full text-left p-6 rounded-xl border-2 bg-white transition-colors duration-200 ${
                    isSelected ? 'border-white' : 'border-gray-200 hover:border-gray-300 hover:shadow-lg'
                  }`}
                  style={scenario.id === 'adaptive-anything' ? { borderColor: 'transparent' } : undefined}
                >
                {/* Layer 1: Dark overlay - show on hover OR selected */}
                <div className={`pointer-events-none absolute inset-0 rounded-xl bg-black/75 transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />

                {/* Layer 2: Base content - visible by default and when selected, hidden when hovering */}
                <div className={`relative z-10 transition-all duration-200 ${isSelected ? 'text-white opacity-100' : 'text-gray-900 group-hover:opacity-0'}`}>
                  <h3 className="text-xl font-bold">
                    {scenario.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {scenario.description}
                  </p>
                </div>

                {/* Learn button - always visible, positioned absolutely */}
                {scenario.id !== 'adaptive-anything' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLearnModalOpen(scenario.id);
                    }}
                    className="absolute top-4 right-4 z-30 px-4 py-2 text-sm font-bold text-red-600 bg-white border-2 border-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors shadow-sm"
                  >
                    Learn More
                  </button>
                )}

                {/* Layer 3: Hover description - ONLY shows when NOT selected */}
                {!isSelected && (
                  <div className="pointer-events-none absolute inset-0 z-20 rounded-xl p-6 flex items-start justify-start opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <p className="text-white text-base leading-relaxed">
                      {scenario.productDescription}
                    </p>
                  </div>
                )}
              </button>
              </div>
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

      {/* Educational Modal */}
      {learnModalOpen && (() => {
        const education = getScenarioEducation(learnModalOpen);
        if (!education) return null;
        
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {education.title}
                  </h2>
                  <button
                    onClick={() => setLearnModalOpen(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-6">
                  {education.sections.map((section, idx) => (
                    <div key={idx} className={section.highlight ? 'bg-red-50 p-4 rounded-lg border-l-4 border-red-600' : ''}>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">
                        {section.heading}
                      </h3>
                      {section.content && (
                        <p className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ 
                          __html: section.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-red-600">$1</strong>') 
                        }} />
                      )}
                      {section.bullets && (
                        <ul className="mt-2 space-y-2">
                          {section.bullets.map((bullet, bulletIdx) => (
                            <li key={bulletIdx} className="flex items-start gap-2">
                              <span className="text-red-600 mt-1">•</span>
                              <span className="text-gray-700">{bullet}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setLearnModalOpen(null)}
                    className="w-full px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
                  >
                    Got It
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
};

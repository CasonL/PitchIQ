/**
 * MarcusPreCallBrief.tsx
 * 10-second pre-call briefing screen
 * Removes unnecessary cognitive load before call starts
 */

import React, { useState } from 'react';
import { Phone, Mic, Target, User } from 'lucide-react';
import { MarcusScenario } from './MarcusScenarios';
import { LearnMoreModal } from './LearnMoreModal';

interface MarcusPreCallBriefProps {
  scenario: MarcusScenario;
  onReady: () => void;
  onBack: () => void;
}

export const MarcusPreCallBrief: React.FC<MarcusPreCallBriefProps> = ({
  scenario,
  onReady,
  onBack
}) => {
  const [showLearnMore, setShowLearnMore] = useState(false);
  
  // Determine selling text based on scenario
  const getSellingText = () => {
    if (scenario.id === 'website-audit') {
      return 'Website refresh';
    } else if (scenario.id === 'promotional-swag') {
      return 'Promotional material service';
    }
    return scenario.title;
  };
  
  // Check if scenario has Learn More available
  const hasLearnMore = scenario.id === 'website-audit' || scenario.id === 'promotional-swag';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <Phone className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Call Starting Soon
          </h1>
          <p className="text-gray-600">
            Here's what you need to know
          </p>
        </div>

        {/* Brief Info Cards */}
        <div className="space-y-4 mb-8">
          {/* Who You're Calling */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <User className="w-5 h-5 text-gray-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  You're cold calling: Marcus Stindle
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Busy, impatient decision maker. You've never met Marcus before.
                </p>
              </div>
            </div>
          </div>

          {/* What You're Selling */}
          <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Target className="w-5 h-5 text-blue-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  You're selling: {getSellingText()}
                </h3>
                {hasLearnMore && (
                  <button
                    onClick={() => setShowLearnMore(true)}
                    className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-700 underline"
                  >
                    Learn more
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* How to Interact */}
          <div className="bg-green-50 rounded-xl p-5 border border-green-200">
            <div className="flex items-start gap-3">
              <div className="mt-1">
                <Mic className="w-5 h-5 text-green-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  This is a voice interaction
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Speak naturally when it's your turn. Marcus will respond with voice. Average call: 3-5 minutes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Goal Reminder */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-5 border border-red-200 mb-8">
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              Your Goal
            </p>
            <p className="text-lg font-bold text-red-600">
              Book a followup or meeting
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onReady}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl"
          >
            I'm Ready
          </button>
        </div>

        {/* Quick Tip */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            💡 Tip: Marcus values directness. Get to the point fast.
          </p>
        </div>
      </div>
      
      {/* Learn More Modal */}
      {showLearnMore && (
        <LearnMoreModal
          scenario={scenario}
          onClose={() => setShowLearnMore(false)}
        />
      )}
    </div>
  );
};

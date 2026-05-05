import React, { useState } from 'react';
import { TrendingUp, Target, Users } from 'lucide-react';
import { CallFeedbackForm } from './CallFeedbackForm';

interface PostCallCTAProps {
  theme: 'dark' | 'light';
  onTryAgain: () => void;
  onSignUp: () => void;
  sessionId?: string;
  callDuration?: number;
}

export const PostCallCTA: React.FC<PostCallCTAProps> = ({
  theme,
  onTryAgain,
  onSignUp,
  sessionId,
  callDuration
}) => {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${
      theme === 'dark' ? 'bg-[#0a0f16]' : 'bg-gray-50'
    }`}>
      <div className="max-w-2xl w-full">
        {/* Feedback Form - Kimi Style */}
        <div className={`rounded-xl p-8 mb-6 transition-all duration-500 ${
          theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-2xl font-bold mb-2 text-center ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            How was this experience?
          </h2>
          <p className={`text-sm mb-6 text-center ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Your feedback helps us improve PitchIQ
          </p>
          
          <CallFeedbackForm
            sessionId={sessionId}
            callDuration={callDuration}
            onSubmitSuccess={() => setFeedbackSubmitted(true)}
          />
        </div>

        <div className={`rounded-xl p-8 mb-6 ${
          theme === 'dark' 
            ? 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-2 border-blue-500/30'
            : 'bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300'
        }`}>
          <h3 className={`text-xl font-bold mb-4 text-center ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            Ready to Level Up Your Sales Game?
          </h3>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <Users size={20} className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
              </div>
              <div>
                <div className={`font-bold text-sm mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Custom AI Prospects
                </div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Practice with prospects that match your ideal customer profile
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-purple-500/20' : 'bg-purple-100'
              }`}>
                <Target size={20} className={theme === 'dark' ? 'text-purple-400' : 'text-purple-600'} />
              </div>
              <div>
                <div className={`font-bold text-sm mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Progressive Training
                </div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Scenarios that build on each other, adapting to your skill level
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                theme === 'dark' ? 'bg-green-500/20' : 'bg-green-100'
              }`}>
                <TrendingUp size={20} className={theme === 'dark' ? 'text-green-400' : 'text-green-600'} />
              </div>
              <div>
                <div className={`font-bold text-sm mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  Performance Tracking
                </div>
                <div className={`text-xs ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Track your improvement over time and identify patterns
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onSignUp}
            className={`w-full py-3 rounded-lg font-bold text-base transition-all active:scale-98 ${
              theme === 'dark'
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        <button
          onClick={onTryAgain}
          className={`w-full py-3 border rounded-lg text-sm font-medium transition-colors ${
            theme === 'dark'
              ? 'bg-white/5 hover:bg-white/10 border-white/10 text-gray-300'
              : 'bg-gray-50 hover:bg-gray-100 border-gray-300 text-gray-700'
          }`}
        >
          Try Another Call
        </button>
      </div>
    </div>
  );
};

/**
 * MarcusPostCall.tsx
 * Minimal post-call insight screen
 */

import React from 'react';
import { Button } from '@mui/material';
import { RotateCcw, TrendingUp } from 'lucide-react';

interface MarcusPostCallProps {
  callData: {
    duration: number;
    phaseSummary: {
      currentPhase: number;
    };
    finalContext: {
      userName: string;
      product: string;
      identifiedIssue: string | null;
      whatWorked: string;
    };
  };
  onTryAgain: () => void;
  onStartTraining: () => void;
}

export const MarcusPostCall: React.FC<MarcusPostCallProps> = ({
  callData,
  onTryAgain,
  onStartTraining
}) => {
  const { duration, phaseSummary, finalContext } = callData;
  const completedAllPhases = phaseSummary.currentPhase >= 5;

  // Format duration
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            {completedAllPhases ? 'Call Complete' : 'Call Ended'}
          </h2>
          <p className="text-gray-400">
            Duration: {durationStr}
          </p>
        </div>

        {/* Insight card */}
        <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-6">
          {/* What Marcus noticed */}
          {finalContext.identifiedIssue && (
            <div className="mb-6">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <span className="text-2xl">👁️</span>
                What Marcus Noticed
              </h3>
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
                <p className="text-red-400 font-medium mb-1">
                  Issue: {finalContext.identifiedIssue}
                </p>
                {finalContext.whatWorked && (
                  <p className="text-gray-300 text-sm">
                    What worked: {finalContext.whatWorked}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* The feeling */}
          <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
            <p className="text-gray-300 text-center italic">
              "That feeling you just experienced?<br />
              That's what PitchIQ training teaches."
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-white mb-1">
                {phaseSummary.currentPhase}/5
              </div>
              <div className="text-gray-400 text-sm">
                Phases Completed
              </div>
            </div>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-2xl font-bold text-white mb-1">
                {durationStr}
              </div>
              <div className="text-gray-400 text-sm">
                Call Duration
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-6">
          <h3 className="text-white font-semibold text-lg mb-2 text-center">
            Ready for More?
          </h3>
          <p className="text-gray-400 text-sm mb-6 text-center">
            This was one call. Imagine what you'd learn with structured practice.
          </p>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={onStartTraining}
            startIcon={<TrendingUp />}
            sx={{
              bgcolor: '#EF4444',
              color: 'white',
              '&:hover': {
                bgcolor: '#DC2626',
              },
              fontWeight: '600',
              fontSize: '1rem',
              py: 1.5,
              borderRadius: 3,
              textTransform: 'none',
              boxShadow: 'none',
            }}
          >
            Explore Training
          </Button>
        </div>

        {/* Secondary action */}
        <div className="text-center">
          <Button
            variant="text"
            onClick={onTryAgain}
            startIcon={<RotateCcw />}
            sx={{
              color: '#6b7280',
              '&:hover': {
                color: '#ffffff',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
              textTransform: 'none',
              borderRadius: 2,
            }}
          >
            Practice with Marcus Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MarcusPostCall;

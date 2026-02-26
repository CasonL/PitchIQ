/**
 * MarcusPostCallMoments.tsx
 * Moment-based feedback UI - shows 1-2 critical moments with puzzle hints
 */

import React, { useState } from 'react';
import { Button } from '@mui/material';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { MomentPuzzle, CallSummary } from './MomentFeedbackGenerator';

interface MarcusPostCallMomentsProps {
  momentPuzzles: MomentPuzzle[];
  callSummary: CallSummary | null;
  duration: number;
  onTryAgain: () => void;
}

export const MarcusPostCallMoments: React.FC<MarcusPostCallMomentsProps> = ({
  momentPuzzles,
  callSummary,
  duration,
  onTryAgain
}) => {
  const [revealedHints, setRevealedHints] = useState<{[key: string]: boolean}>({});
  
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  
  const toggleHint = (momentId: string) => {
    setRevealedHints(prev => ({
      ...prev,
      [momentId]: !prev[momentId]
    }));
  };
  
  const formatTimestamp = (timestamp: number): string => {
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            Call Complete
          </h2>
          <p className="text-gray-400">
            Duration: {durationStr}
          </p>
        </div>
        
        {/* No moments found */}
        {momentPuzzles.length === 0 && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-6">
            <p className="text-gray-300 text-center mb-4">
              Call too short to analyze critical moments.
            </p>
            <p className="text-gray-400 text-center text-sm">
              Try a longer conversation to get detailed feedback on key exchanges.
            </p>
          </div>
        )}
        
        {/* Critical Moments */}
        {momentPuzzles.map((puzzle, index) => (
          <div key={puzzle.moment.id} className="mb-6">
            {/* Moment Card */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🎯</span>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    Critical Moment #{index + 1}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {formatTimestamp(puzzle.moment.timestamp)} into the call
                  </p>
                </div>
              </div>
              
              {/* The Exchange */}
              <div className="bg-black/30 rounded-2xl p-6 mb-6 font-mono text-sm">
                <div className="mb-4">
                  <div className="text-gray-400 text-xs mb-2">You said:</div>
                  <div className="text-white leading-relaxed">
                    "{puzzle.moment.userMessage}"
                  </div>
                </div>
                
                <div>
                  <div className="text-gray-400 text-xs mb-2">Marcus responded:</div>
                  <div className="text-white leading-relaxed">
                    "{puzzle.moment.marcusResponse}"
                  </div>
                </div>
              </div>
              
              {/* Context */}
              <div className="mb-6">
                <p className="text-gray-300 text-base leading-relaxed">
                  {puzzle.context}
                </p>
              </div>
              
              {/* Puzzle Questions */}
              <div className="mb-6">
                <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">
                  Your Puzzle:
                </h4>
                <ul className="space-y-3">
                  {puzzle.puzzleQuestions.map((question, qIndex) => (
                    <li key={qIndex} className="flex items-start gap-3">
                      <span className="text-blue-400 mt-1 flex-shrink-0">•</span>
                      <span className="text-gray-300">{question}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Hidden Hint */}
              <div className="border-t border-white/10 pt-4">
                <button
                  onClick={() => toggleHint(puzzle.moment.id)}
                  className="w-full flex items-center justify-between text-left p-4 rounded-xl hover:bg-white/5 transition-colors"
                >
                  <span className="text-gray-400 text-sm font-medium">
                    {revealedHints[puzzle.moment.id] ? 'Hide hint' : 'Tap to see one possible path'}
                  </span>
                  {revealedHints[puzzle.moment.id] ? (
                    <ChevronUp className="text-gray-400 w-5 h-5" />
                  ) : (
                    <ChevronDown className="text-gray-400 w-5 h-5" />
                  )}
                </button>
                
                {revealedHints[puzzle.moment.id] && (
                  <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {puzzle.possiblePath}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Personal Summary */}
        {callSummary && (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-6">
            <h3 className="text-white font-bold text-lg mb-4">
              Your Call Summary
            </h3>
            
            <p className="text-gray-300 leading-relaxed mb-4">
              {callSummary.overallTakeaway}
            </p>
            
            <p className="text-white font-medium">
              {callSummary.encouragement}
            </p>
          </div>
        )}
        
        {/* Action Button */}
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
              fontSize: '1rem',
              py: 1.5,
              px: 3
            }}
          >
            Practice with Marcus Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MarcusPostCallMoments;

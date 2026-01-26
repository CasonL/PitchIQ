/**
 * MarcusPostCall.tsx
 * Enhanced post-call feedback with rubric-based scoring
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@mui/material';
import { RotateCcw, TrendingUp, AlertCircle } from 'lucide-react';
import { CallMetrics, RubricScore, calculateTalkRatio, scoreTalkRatio, scoreDiscovery, scoreObjectionHandling } from './CallMetrics';
import { MetricColorBar } from './MetricColorBar';
import { RubricEvaluator } from './RubricEvaluator';
import { assessDataSufficiency, getFeedbackDisclaimer, shouldShowFeedback, getInsufficientDataMessage } from './CallDataSufficiency';

interface MarcusPostCallProps {
  callData: {
    duration: number;
    metrics: CallMetrics;
  };
  onTryAgain: () => void;
  onStartTraining: () => void;
}

export const MarcusPostCall: React.FC<MarcusPostCallProps> = ({
  callData,
  onTryAgain,
  onStartTraining
}) => {
  const { duration, metrics } = callData;
  const [rubricScore, setRubricScore] = useState<RubricScore | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(true);

  // Format duration
  const mins = Math.floor(duration / 60);
  const secs = duration % 60;
  const durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  
  // Assess data sufficiency
  const dataSufficiency = assessDataSufficiency(metrics);
  const showFeedback = shouldShowFeedback(dataSufficiency);
  const disclaimer = getFeedbackDisclaimer(dataSufficiency);
  
  // Calculate metric scores
  const talkRatio = calculateTalkRatio(metrics);
  const talkRatioScore = scoreTalkRatio(talkRatio);
  const discoveryScore = scoreDiscovery(metrics);
  const objectionScore = scoreObjectionHandling(metrics);
  
  // Evaluate rubric on mount (only if we have sufficient data)
  useEffect(() => {
    const evaluateCall = async () => {
      if (!showFeedback) {
        // Not enough data for feedback
        setIsEvaluating(false);
        return;
      }
      
      setIsEvaluating(true);
      const evaluator = new RubricEvaluator();
      const score = await evaluator.evaluateCall(metrics);
      setRubricScore(score);
      setIsEvaluating(false);
    };
    
    evaluateCall();
  }, [metrics, showFeedback]);

  return (
    <div className="min-h-screen bg-[#0f1419] flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white flex items-center justify-center">
            <span className="text-4xl">✓</span>
          </div>
          
          <h2 className="text-3xl font-bold text-white mb-2">
            Call Ended
          </h2>
          <p className="text-gray-400">
            Duration: {durationStr}
          </p>
        </div>
        
        {/* Insufficient data warning */}
        {!showFeedback && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl p-8 mb-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="text-amber-400 w-8 h-8 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-amber-400 font-bold text-xl mb-3">
                  Call Too Short
                </h3>
                <p className="text-gray-300 text-lg">
                  Need at least 90 seconds for feedback.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {isEvaluating && showFeedback && (
          <div className="text-center mb-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <p className="text-gray-400 mt-2">Analyzing your call...</p>
          </div>
        )}
        
        {/* Partial data disclaimer */}
        {!isEvaluating && showFeedback && disclaimer && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-400 w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-gray-300 text-sm" dangerouslySetInnerHTML={{ __html: disclaimer.replace(/\*\*/g, '') }} />
            </div>
          </div>
        )}
        
        {!isEvaluating && showFeedback && rubricScore && (

          <>
            {/* Sales DNA Header */}
            <div className="text-center mb-8">
              <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">
                Your Sales DNA
              </h3>
              <h2 className="text-3xl font-bold text-white mb-3">
                {rubricScore.salesDNA}
              </h2>
              <div className="flex items-center justify-center gap-3">
                <div className="text-4xl font-bold text-white">
                  {rubricScore.score}/10
                </div>
                <div className="text-left">
                  <div className="text-sm text-gray-400">Overall Score</div>
                  <div className="text-xs text-gray-500">{rubricScore.level}</div>
                </div>
              </div>
            </div>
            
            {/* Metrics Card */}
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-6">
              {/* Talk Ratio */}
              {dataSufficiency.talkRatio ? (
                <MetricColorBar
                  value={talkRatio}
                  label="Talk Ratio"
                  score={talkRatioScore}
                  formatValue={(v) => `${Math.round(v * 100)}% you / ${Math.round((1 - v) * 100)}% Marcus`}
                  explanation={talkRatio < 0.4 ? "Try leading the conversation more" : talkRatio > 0.6 ? "Practice active listening" : "Natural conversational flow"}
                />
              ) : (
                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 font-medium">Talk Ratio</span>
                    <span className="text-gray-500 text-sm">Insufficient Data</span>
                  </div>
                  <p className="text-gray-500 text-sm">{getInsufficientDataMessage('talkRatio')}</p>
                </div>
              )}
              
              {/* Discovery */}
              {dataSufficiency.questions ? (
                <MetricColorBar
                  value={metrics.openEndedCount / 10}
                  label="Discovery"
                  score={discoveryScore}
                  optimalMin={0.3}
                  optimalMax={0.7}
                  formatValue={() => `${metrics.openEndedCount} open-ended, ${metrics.followUpCount} follow-ups`}
                  explanation={metrics.openEndedCount >= 3 ? "Strong discovery mindset" : "Ask more 'how' and 'why' questions"}
                />
              ) : (
                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 font-medium">Discovery</span>
                    <span className="text-gray-500 text-sm">Insufficient Data</span>
                  </div>
                  <p className="text-gray-500 text-sm">{getInsufficientDataMessage('questions')}</p>
                </div>
              )}
              
              {/* Objection Handling */}
              {dataSufficiency.objections ? (
                <MetricColorBar
                  value={metrics.objectionsRaised > 0 ? metrics.objectionsResolved / metrics.objectionsRaised : 0.5}
                  label="Objection Handling"
                  score={objectionScore}
                  formatValue={() => `${metrics.objectionsResolved}/${metrics.objectionsRaised} resolved`}
                  explanation={metrics.objectionsResolved === metrics.objectionsRaised ? "Handled all resistance smoothly" : "Watch for subtle objections"}
                />
              ) : (
                <div className="mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 font-medium">Objection Handling</span>
                    <span className="text-gray-500 text-sm">Insufficient Data</span>
                  </div>
                  <p className="text-gray-500 text-sm">{getInsufficientDataMessage('objections')}</p>
                </div>
              )}
            </div>
            
            {/* Strengths & Bottleneck */}
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-6">
              <div className="mb-6">
                <h4 className="text-white font-bold mb-3 flex items-center gap-2">
                  <span className="text-xl">💪</span>
                  Your Strengths
                </h4>
                <ul className="space-y-2">
                  {rubricScore.strengths.map((strength, i) => (
                    <li key={i} className="text-gray-300 flex items-start gap-2">
                      <span className="text-green-400 mt-1">✓</span>
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
                <h4 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                  <span className="text-xl">🎯</span>
                  Your Bottleneck
                </h4>
                <p className="text-gray-300">
                  {rubricScore.bottleneck}
                </p>
              </div>
            </div>
            
            {/* Training Plan */}
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-6">
              <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span className="text-2xl">📈</span>
                Your Growth Path
              </h3>
              
              <div className="mb-6">
                <p className="text-gray-400 font-medium mb-3">PitchIQ will teach you:</p>
                <ul className="space-y-2">
                  {rubricScore.trainingPlan.teach.map((skill, i) => (
                    <li key={i} className="text-gray-300 flex items-start gap-2">
                      <span className="text-blue-400">→</span>
                      {skill}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="text-gray-400 font-medium mb-3">Then challenge you with:</p>
                <ul className="space-y-2">
                  {rubricScore.trainingPlan.challenge.map((scenario, i) => (
                    <li key={i} className="text-gray-300 flex items-start gap-2">
                      <span className="text-red-400">⚡</span>
                      {scenario}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {/* One-liner */}
            <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
              <p className="text-gray-300 text-center italic text-lg">
                "{rubricScore.oneLiner}"
              </p>
            </div>
          </>
        )}

        {/* CTA */}
        {!isEvaluating && rubricScore && (
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-6">
            <h3 className="text-white font-semibold text-xl mb-2 text-center">
              Unlock Your Full Profile
            </h3>
            <p className="text-gray-400 text-sm mb-6 text-center">
              Get personalized drills, track your progress over time, and master every scenario.
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
              Start Training (30 seconds)
            </Button>
          </div>
        )}

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

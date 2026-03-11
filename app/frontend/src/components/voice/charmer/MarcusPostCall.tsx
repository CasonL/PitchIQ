/**
 * MarcusPostCall.tsx
 * Enhanced post-call feedback with rubric-based scoring
 */

import React, { useEffect, useState } from 'react';
import { Button } from '@mui/material';
import { RotateCcw, TrendingUp, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { SimplifiedMessageAnalysis } from './SimplifiedMessageAnalysis';
import { CallMetrics, RubricScore, calculateTalkRatio, scoreTalkRatio, scoreDiscovery, scoreObjectionHandling } from './CallMetrics';
import { MetricColorBar } from './MetricColorBar';
import { RubricEvaluator } from './RubricEvaluator';
import { assessDataSufficiency, getFeedbackDisclaimer, shouldShowFeedback, getInsufficientDataMessage } from './CallDataSufficiency';

interface MarcusPostCallProps {
  callData: {
    duration: number;
    metrics: CallMetrics;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  };
  onTryAgain: () => void;
  onStartTraining: () => void;
}

export const MarcusPostCall: React.FC<MarcusPostCallProps> = ({
  callData,
  onTryAgain,
  onStartTraining
}) => {
  const { duration, metrics, conversationHistory = [] } = callData;
  const [rubricScore, setRubricScore] = useState<RubricScore | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);

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
            {/* Summary Quote - The Hook */}
            <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-3xl p-8 mb-8">
              <p className="text-gray-100 text-center text-xl italic leading-relaxed">
                "{rubricScore.oneLiner}"
              </p>
            </div>
            
            {/* Score Card - Compact */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-4 bg-white/5 rounded-2xl px-8 py-4 border border-white/10">
                <div>
                  <div className="text-3xl font-bold text-white">{rubricScore.score}/10</div>
                  <div className="text-xs text-gray-500">{rubricScore.level}</div>
                </div>
                <div className="h-12 w-px bg-white/20"></div>
                <div className="text-left">
                  <div className="text-sm text-gray-400">Sales DNA</div>
                  <div className="text-white font-semibold">{rubricScore.salesDNA}</div>
                </div>
              </div>
            </div>
            
            {/* Your ONE Focus - The Bottleneck */}
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-6">
              <h3 className="text-white font-bold text-2xl mb-2 flex items-center gap-2">
                <span className="text-3xl">🎯</span>
                Your Focus Area
              </h3>
              <p className="text-gray-400 mb-6">
                Everything else orbits this one improvement:
              </p>
              <div className="bg-amber-500/10 border-l-4 border-amber-500 rounded-r-2xl p-6">
                <p className="text-gray-100 text-lg">
                  {rubricScore.bottleneck}
                </p>
              </div>
            </div>
            
            {/* Concrete Example - Simplified Message Analysis */}
            {conversationHistory.length > 0 && (() => {
              // Find the first user message with actual pitch/discovery content (skip greetings and introductions)
              const firstMeaningfulMessage = conversationHistory.find(
                (msg, idx) => {
                  if (msg.role !== 'user' || msg.content.length < 30) return false;
                  const lower = msg.content.toLowerCase();
                  // Skip greetings and introductions
                  if (lower.match(/^(hey|hi|hello)[,.]?\s+(marcus|is this)/i)) return false;
                  if (lower.includes('my name is') || lower.includes("it's ") && idx < 3) return false;
                  // Find actual pitch/discovery content
                  return lower.includes('wonder') || lower.includes('notice') || 
                         lower.includes('took a look') || lower.includes('we saw') ||
                         lower.includes('would you') || lower.includes('are you') ||
                         (lower.includes('?') && idx > 1);
                }
              );
              
              if (firstMeaningfulMessage) {
                // Find problematic pattern in the message
                const content = firstMeaningfulMessage.content;
                let highlightStart: number | undefined;
                let highlightEnd: number | undefined;
                let whatHappened = "";
                let whyItMatters = "";
                let betterApproach = "";
                
                // Detect leading statements or assumptions
                const leadingPatterns = [
                  { pattern: /we (took a look|noticed|saw).*(wondering if|having trouble|experiencing|issues)/i, type: 'assumptive' },
                  { pattern: /(out of date|outdated|old|aging).*(website|site)/i, type: 'telling' },
                  { pattern: /we (noticed|saw|found).*(lack|missing|problem|issue)/i, type: 'assumptive' }
                ];
                
                const matchedPattern = leadingPatterns.find(p => p.pattern.test(content));
                
                if (matchedPattern) {
                  const match = content.match(matchedPattern.pattern);
                  if (match) {
                    highlightStart = match.index;
                    highlightEnd = content.indexOf('?', highlightStart);
                    if (highlightEnd !== -1) highlightEnd += 1;
                    else highlightEnd = highlightStart! + match[0].length;
                  }
                  whatHappened = "You told Marcus what his problem was instead of asking him.";
                  whyItMatters = "Leading questions with assumptions make prospects defensive and reduce trust.";
                  betterApproach = "Ask open-ended questions that let Marcus share his reality: 'How's your current website working for you?' or 'What made you think about your web presence recently?'";
                } else if (content.toLowerCase().includes("notice") || content.toLowerCase().includes("lack")) {
                  const noticeIdx = content.toLowerCase().indexOf("notice");
                  const lackIdx = content.toLowerCase().indexOf("lack");
                  highlightStart = Math.min(noticeIdx !== -1 ? noticeIdx : Infinity, lackIdx !== -1 ? lackIdx : Infinity);
                  if (highlightStart === Infinity) highlightStart = undefined;
                  highlightEnd = content.indexOf("?") !== -1 ? content.indexOf("?") + 1 : undefined;
                  whatHappened = "You asked a specific question, but it was leading and assumptive.";
                  whyItMatters = "Leading questions suggest the answer and can make prospects defensive.";
                  betterApproach = "Ask open-ended questions that let the prospect share their reality: 'How's your current website working for you?' or 'What made you think about your web presence recently?'";
                } else {
                  // Generic improvement
                  whatHappened = "You jumped into your pitch without understanding their situation.";
                  whyItMatters = "Effective discovery helps you understand before you propose solutions.";
                  betterApproach = "Start with open questions: 'What's working well with your current setup?' or 'What challenges are you trying to solve?'";
                }
                
                return (
                  <SimplifiedMessageAnalysis
                    userMessage={content}
                    highlightStart={highlightStart}
                    highlightEnd={highlightEnd}
                    whatHappened={whatHappened}
                    whyItMatters={whyItMatters}
                    betterApproach={betterApproach}
                  />
                );
              }
              return null;
            })()}
            
            {/* Quick Metrics Summary - Collapsed by default */}
            <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-6">
              <h3 className="text-white font-bold text-lg mb-4">Call Metrics</h3>
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
            
            {/* What Went Well */}
            {rubricScore.strengths.length > 0 && (
              <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-6">
                <h4 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="text-xl">✨</span>
                  What You Did Well
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
            )}
            
            {/* Framework Insights - Optional Detail */}
            {metrics.frameworkInsights && false && (
              <div className="bg-white/5 rounded-3xl p-8 border border-white/10 mb-6">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  What You Did
                </h3>
                
                {/* Question Pattern */}
                <div className="mb-6 pb-6 border-b border-white/10">
                  <h4 className="text-gray-300 font-semibold mb-2">Question Flow</h4>
                  <p className="text-gray-400 mb-3">{metrics.frameworkInsights.questionPattern.feedback}</p>
                  {metrics.frameworkInsights.questionPattern.whatYouDid.length > 0 && (
                    <ul className="space-y-1 mb-3">
                      {metrics.frameworkInsights.questionPattern.whatYouDid.map((item, i) => (
                        <li key={i} className="text-gray-500 text-sm flex items-start gap-2">
                          <span className="text-blue-400">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 mt-3">
                    <p className="text-blue-400 text-sm font-medium">💡 {metrics.frameworkInsights.questionPattern.whatToTryNext}</p>
                  </div>
                </div>
                
                {/* Objection Handling */}
                {metrics.frameworkInsights.objectionHandling && (
                  <div className="mb-6 pb-6 border-b border-white/10">
                    <h4 className="text-gray-300 font-semibold mb-2">Handling Resistance</h4>
                    <p className="text-gray-400 mb-2">{metrics.frameworkInsights.objectionHandling.feedback}</p>
                    {metrics.frameworkInsights.objectionHandling.missedMoments.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-3">
                        <p className="text-amber-400 text-sm font-medium">
                          {metrics.frameworkInsights.objectionHandling.missedMoments[0]}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Insight Moments */}
                {metrics.frameworkInsights.insightMoments && (
                  <div className="mb-6 pb-6 border-b border-white/10">
                    <h4 className="text-gray-300 font-semibold mb-2">Challenging Their Thinking</h4>
                    <p className="text-gray-400 mb-2">{metrics.frameworkInsights.insightMoments.feedback}</p>
                    {metrics.frameworkInsights.insightMoments.opportunity && (
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 mt-3">
                        <p className="text-purple-400 text-sm font-medium">💡 {metrics.frameworkInsights.insightMoments.opportunity}</p>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Call Outcome */}
                <div>
                  <h4 className="text-gray-300 font-semibold mb-2">How It Ended</h4>
                  <p className="text-gray-400 mb-2">{metrics.frameworkInsights.outcome.feedback}</p>
                  {metrics.frameworkInsights.outcome.whoElseNeeded.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-gray-500 text-sm">Stakeholders mentioned:</span>
                      {metrics.frameworkInsights.outcome.whoElseNeeded.map((stakeholder, i) => (
                        <span key={i} className="bg-white/5 px-2 py-1 rounded text-gray-300 text-sm">
                          {stakeholder}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Practice Drill */}
                <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl p-4 mt-6">
                  <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                    <span className="text-xl">🎯</span>
                    Quick Drill
                  </h4>
                  <p className="text-gray-300 text-sm">
                    {metrics.frameworkInsights.practiceThis}
                  </p>
                </div>
              </div>
            )}
            
            {/* Collapsible Transcript */}
            {conversationHistory.length > 0 && (
              <div className="bg-white/5 rounded-3xl border border-white/10 mb-6 overflow-hidden">
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <h4 className="text-white font-bold text-lg">Call Transcript</h4>
                  {showTranscript ? (
                    <ChevronUp className="text-gray-400" />
                  ) : (
                    <ChevronDown className="text-gray-400" />
                  )}
                </button>
                
                {showTranscript && (
                  <div className="px-6 pb-6 max-h-96 overflow-y-auto">
                    {conversationHistory.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`mb-4 ${
                          msg.role === 'user' ? 'text-right' : 'text-left'
                        }`}
                      >
                        <div
                          className={`inline-block max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.role === 'user'
                              ? 'bg-blue-500/20 text-gray-100'
                              : 'bg-white/10 text-gray-300'
                          }`}
                        >
                          <div className="text-xs text-gray-500 mb-1">
                            {msg.role === 'user' ? 'You' : 'Marcus'}
                          </div>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
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

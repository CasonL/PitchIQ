/**
 * MarcusPostCallMoments.tsx
 * Two-pane moment-based coaching interface
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@mui/material';
import { RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { ConversationExchange } from './ConversationTranscript';
import { KeyMoment, MomentExtractor } from './MomentExtractor';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MomentCoachingPanel } from './MomentCoachingPanel';

interface MarcusPostCallMomentsProps {
  duration: number;
  conversationExchanges?: ConversationExchange[];
  objectionData: {
    objectionSatisfaction: Record<string, number>;
    objectionCounts: Record<string, number>;
    activeObjection?: string;
  };
  buyerState?: {
    clarity?: number;
    trustLevel: number;
    relevance?: number;
  };
  finalResistance: number;
  scenario?: any;
  onTryAgain: () => void;
}

export const MarcusPostCallMoments: React.FC<MarcusPostCallMomentsProps> = ({
  duration,
  conversationExchanges = [],
  objectionData,
  buyerState,
  finalResistance,
  scenario,
  onTryAgain
}) => {
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>([]);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  
  const selectedMoment = keyMoments[currentMomentIndex] || null;
  
  const goToNextMoment = () => {
    if (currentMomentIndex < keyMoments.length - 1) {
      setCurrentMomentIndex(currentMomentIndex + 1);
    }
  };
  
  const goToPreviousMoment = () => {
    if (currentMomentIndex > 0) {
      setCurrentMomentIndex(currentMomentIndex - 1);
    }
  };
  
  const goToMoment = (index: number) => {
    setCurrentMomentIndex(index);
  };
  
  const getMomentColor = (moment: KeyMoment): string => {
    switch (moment.classification) {
      case 'best_moment':
      case 'strong_move':
        return '#22c55e'; // green
      case 'turning_point':
        return '#3b82f6'; // blue
      case 'mistake':
      case 'blunder':
        return '#f97316'; // orange
      case 'missed_opportunity':
        return '#fbbf24'; // amber
      default:
        return '#6b7280'; // gray
    }
  };
  const [showMetrics, setShowMetrics] = useState(false);
  const [isEvaluatingMoments, setIsEvaluatingMoments] = useState(true);
  
  useEffect(() => {
    if (conversationExchanges.length > 0) {
      evaluateMomentsWithLLM();
    }
  }, [conversationExchanges, objectionData, finalResistance, buyerState]);
  
  const evaluateMomentsWithLLM = async () => {
    setIsEvaluatingMoments(true);
    
    // Extract candidate moments
    const candidateMoments = MomentExtractor.extractKeyMoments({
      conversationExchanges,
      objectionData,
      finalResistance,
      buyerState
    });
    
    console.log(`🔍 Evaluating ${candidateMoments.length} candidate moments with GPT-4o...`);
    
    if (candidateMoments.length === 0) {
      setKeyMoments([]);
      setIsEvaluatingMoments(false);
      return;
    }
    
    try {
      // Evaluate each moment for sales impact
      const evaluatedMoments = await Promise.all(
        candidateMoments.map(async (moment) => {
          const score = await scoreMomentImpact(moment);
          return { moment, score };
        })
      );
      
      // Filter for coaching-worthy moments (score >= 5/10) and sort chronologically
      const impactfulMoments = evaluatedMoments
        .filter(({ score }) => score >= 5)
        .sort((a, b) => a.moment.turnNumber - b.moment.turnNumber) // Chronological order
        .slice(0, 5)
        .map(({ moment }) => moment);
      
      console.log(`✅ Filtered to ${impactfulMoments.length} coaching-worthy moments (threshold: 5/10)`);
      
      setKeyMoments(impactfulMoments);
      setCurrentMomentIndex(0);
    } catch (error) {
      console.error('❌ LLM evaluation failed, using all candidates:', error);
      setKeyMoments(candidateMoments.slice(0, 5));
      setCurrentMomentIndex(0);
    }
    
    setIsEvaluatingMoments(false);
  };
  
  const scoreMomentImpact = async (moment: KeyMoment): Promise<number> => {
    const prompt = `You are a sales training expert evaluating whether a moment from a call is worth coaching on.

MOMENT:
Turn ${moment.turnNumber}: "${moment.userMessage}" → "${moment.marcusResponse}"

CONTEXT:
- Type: ${moment.type.replace(/_/g, ' ')}
- What changed: ${moment.whatChanged}
- Why it matters: ${moment.whyItMatters}
- Resistance shift: ${moment.resistanceBefore.toFixed(1)} → ${moment.resistanceAfter.toFixed(1)}

Evaluate this moment on a 1-10 scale:
- 1-3: Not worth coaching (greeting, filler, technical issue, no real sales impact)
- 4-6: Minor moment (small resistance change, but not a learning opportunity)
- 7-8: Good coaching moment (clear mistake or win, actionable insight)
- 9-10: Critical moment (major turning point, make-or-break exchange)

Consider:
- Is this a real sales exchange or just pleasantries/greetings?
- Did the rep's choice meaningfully affect buyer state?
- Would coaching on this moment improve future performance?
- Is there a clear alternative approach that would work better?

Return ONLY a single integer 1-10, nothing else.`;
    
    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a sales training expert. Return only a single integer score.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 10
        })
      });
      
      if (!response.ok) throw new Error('Failed to score moment');
      
      const data = await response.json();
      const scoreText = data.choices?.[0]?.message?.content?.trim() || '5';
      const score = parseInt(scoreText, 10);
      
      console.log(`📊 Turn ${moment.turnNumber} scored ${score}/10`);
      
      return isNaN(score) ? 5 : Math.max(1, Math.min(10, score));
    } catch (error) {
      console.error('Error scoring moment:', error);
      return 5; // Default to middle score if LLM fails
    }
  };
  
  const formatDuration = (): string => {
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const calculateFocusArea = (): string => {
    const unresolvedCount = Object.values(objectionData.objectionSatisfaction)
      .filter(sat => sat < 0.3).length;
    
    if (unresolvedCount >= 2) {
      return 'Objection handling - multiple concerns left unaddressed';
    }
    
    const hasDiscoveryGaps = keyMoments.some(m => m.type === 'missed_leverage');
    if (hasDiscoveryGaps) {
      return 'Discovery depth - uncovering pain before pitching';
    }
    
    if (finalResistance >= 7) {
      return 'Trust building - establishing credibility early';
    }
    
    return 'Conversation control - managing buyer state transitions';
  };
  
  const generateOneLiner = (): string => {
    const positiveCount = keyMoments.filter(m => m.type === 'positive_shift').length;
    const negativeCount = keyMoments.filter(m => m.type === 'negative_shift').length;
    
    if (negativeCount === 0 && positiveCount > 0) {
      return 'Strong execution - buyer stayed engaged throughout';
    }
    
    const mainIssue = Object.entries(objectionData.objectionSatisfaction)
      .filter(([_, sat]) => sat < 0.3)
      .sort((a, b) => (objectionData.objectionCounts[b[0]] || 0) - (objectionData.objectionCounts[a[0]] || 0))[0];
    
    if (mainIssue) {
      const [type] = mainIssue;
      return `Marcus understood the concept but never trusted the ${type}`;
    }
    
    return 'Call stayed polite but discovery remained shallow';
  };
  
  return (
    <div className="h-screen bg-[#0a0e13] flex flex-col overflow-hidden">
      {/* Timeline Above Both Columns */}
      {keyMoments.length > 0 && (
        <div className="bg-[#0f1419] border-b border-white/10 py-3">
          <div className="max-w-7xl mx-auto px-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1"></div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onTryAgain}
                  disabled={isEvaluatingMoments}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <RotateCcw size={16} />
                  Try Again
                </button>
                <button
                  onClick={() => console.log('Sign up clicked')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Sign Up
                </button>
              </div>
            </div>
            {/* Linear Timeline with All Moments */}
            <div className="relative h-4">
              {/* Background line */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/20 -translate-y-1/2"></div>
              
              {/* All moment dots positioned by timestamp */}
              {keyMoments.map((moment, index) => {
                const position = (moment.timestamp / duration) * 100;
                const dotColor = getMomentColor(moment);
                return (
                  <button
                    key={moment.id}
                    onClick={() => goToMoment(index)}
                    className="absolute top-1/2 -translate-y-1/2 group z-10 transition-all"
                    style={{ left: `${position}%` }}
                    title={moment.title}
                  >
                    <div 
                      className={`rounded-full transition-all ${
                        index === currentMomentIndex
                          ? 'w-4 h-4 ring-4 ring-white/30' 
                          : 'w-2.5 h-2.5 opacity-70 hover:opacity-100 hover:scale-110'
                      }`}
                      style={{ backgroundColor: dotColor }}
                    ></div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Two-Column Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {keyMoments.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500 text-sm">
              No key moments identified in this call
            </div>
          </div>
        ) : (
          <>
            {/* Left: Moment List + Exchange */}
            <div className="w-2/5 border-r border-white/10 flex flex-col overflow-hidden">
              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto">
                {/* Moment List - Fog of War with previous peek */}
                <div className="p-6 overflow-hidden border-b border-white/10 relative">
                {/* Spotlight effect - dim everything except middle card area */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse 100% 120px at center 90px, transparent 0%, rgba(10, 14, 19, 0.7) 100%)'
                  }}></div>
                </div>
                
                <div className="relative">
                  {/* Spacer for consistent positioning when at first moment */}
                  {currentMomentIndex === 0 && (
                    <div className="mb-3" style={{ height: '45px' }}></div>
                  )}
                  
                  {/* Previous moment - 50% visible (peek) with fade overlay at top */}
                  {currentMomentIndex > 0 && (
                    <div className="relative overflow-hidden mb-3 opacity-60" style={{ maxHeight: '45px' }}>
                      <button
                        onClick={() => goToMoment(currentMomentIndex - 1)}
                        className="w-full text-left p-3 rounded-lg border transition-all hover:opacity-100"
                        style={{ 
                          backgroundColor: `${getMomentColor(keyMoments[currentMomentIndex - 1])}10`,
                          borderColor: `${getMomentColor(keyMoments[currentMomentIndex - 1])}30`
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div 
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: getMomentColor(keyMoments[currentMomentIndex - 1]) }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium mb-1 leading-snug">
                              {keyMoments[currentMomentIndex - 1].title}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Turn {keyMoments[currentMomentIndex - 1].turnNumber} • {Math.floor(keyMoments[currentMomentIndex - 1].timestamp / 60)}:{String(Math.floor(keyMoments[currentMomentIndex - 1].timestamp % 60)).padStart(2, '0')}
                            </div>
                          </div>
                        </div>
                      </button>
                      {/* Fade overlay at top */}
                      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0e13] to-transparent pointer-events-none"></div>
                    </div>
                  )}
                  
                  {/* Current moment - fully visible with colored background */}
                  {selectedMoment && (
                    <button
                      onClick={() => goToMoment(currentMomentIndex)}
                      className="w-full text-left p-3 rounded-lg border mb-3 transition-all"
                      style={{ 
                        backgroundColor: `${getMomentColor(selectedMoment)}20`,
                        borderColor: `${getMomentColor(selectedMoment)}50`
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div 
                          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: getMomentColor(selectedMoment) }}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white text-sm font-medium mb-1 leading-snug">
                            {selectedMoment.title}
                          </div>
                          <div className="text-gray-500 text-xs">
                            Turn {selectedMoment.turnNumber} • {Math.floor(selectedMoment.timestamp / 60)}:{String(Math.floor(selectedMoment.timestamp % 60)).padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                    </button>
                  )}
                  
                  {/* Next moment - 50% visible (peek) with colored background */}
                  {currentMomentIndex < keyMoments.length - 1 && (
                    <div className="relative overflow-hidden opacity-60" style={{ maxHeight: '45px' }}>
                      <button
                        onClick={() => goToMoment(currentMomentIndex + 1)}
                        className="w-full text-left p-3 rounded-lg border transition-all hover:opacity-100"
                        style={{ 
                          backgroundColor: `${getMomentColor(keyMoments[currentMomentIndex + 1])}10`,
                          borderColor: `${getMomentColor(keyMoments[currentMomentIndex + 1])}30`
                        }}
                      >
                        <div className="flex items-start gap-2">
                          <div 
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: getMomentColor(keyMoments[currentMomentIndex + 1]) }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium mb-1 leading-snug">
                              {keyMoments[currentMomentIndex + 1].title}
                            </div>
                            <div className="text-gray-500 text-xs">
                              Turn {keyMoments[currentMomentIndex + 1].turnNumber} • {Math.floor(keyMoments[currentMomentIndex + 1].timestamp / 60)}:{String(Math.floor(keyMoments[currentMomentIndex + 1].timestamp % 60)).padStart(2, '0')}
                            </div>
                          </div>
                        </div>
                      </button>
                      {/* Fade overlay */}
                      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0a0e13] to-transparent pointer-events-none"></div>
                    </div>
                  )}
                </div>
              </div>
              
                {/* The Exchange */}
                {selectedMoment && (
                  <div className="p-6 border-b border-white/10">
                  <div className="rounded-lg p-3" style={{ 
                    backgroundColor: `${getMomentColor(selectedMoment)}10`,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: `${getMomentColor(selectedMoment)}30`
                  }}>
                    <div className="mb-3">
                      <div className="text-gray-500 font-semibold text-sm mb-1">Marcus said:</div>
                      <div className="text-gray-300 text-sm leading-relaxed">"{selectedMoment.marcusResponse}"</div>
                    </div>
                    <div className="pt-3" style={{
                      borderTopWidth: '1px',
                      borderTopStyle: 'solid',
                      borderTopColor: `${getMomentColor(selectedMoment)}20`
                    }}>
                      <div className="font-semibold text-sm mb-1" style={{ color: getMomentColor(selectedMoment) }}>You responded:</div>
                      <div className="text-white text-sm leading-relaxed font-medium">"{selectedMoment.userMessage}"</div>
                    </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Fixed bottom section */}
              <div className="flex-shrink-0">
                {/* Navigation Arrows */}
                <div className="p-6 border-b border-white/10">
                <div className="flex gap-2">
                  <button
                    onClick={goToPreviousMoment}
                    disabled={currentMomentIndex === 0}
                    className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      currentMomentIndex === 0
                        ? 'border-white/10 bg-white/5 text-gray-600 cursor-not-allowed'
                        : 'border-white/30 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <ChevronLeft size={16} />
                    <span className="text-xs">Previous</span>
                  </button>
                  
                  <button
                    onClick={goToNextMoment}
                    disabled={currentMomentIndex === keyMoments.length - 1}
                    className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      currentMomentIndex === keyMoments.length - 1
                        ? 'border-white/10 bg-white/5 text-gray-600 cursor-not-allowed'
                        : 'border-white/30 bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xs">Next</span>
                    <ChevronRight size={16} />
                  </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Coaching Panel */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <MomentCoachingPanel 
                moment={selectedMoment} 
                callDuration={duration}
                allMoments={keyMoments}
                currentIndex={currentMomentIndex}
                onNavigate={goToMoment}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MarcusPostCallMoments;

/**
 * MarcusPostCallMoments.tsx
 * Two-pane moment-based coaching interface
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@mui/material';
import { RotateCcw, ChevronDown, ChevronUp, Sun, Moon } from 'lucide-react';
import { ConversationExchange } from './ConversationTranscript';
import { KeyMoment, MomentExtractor } from './MomentExtractor';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MomentCoachingPanel } from './MomentCoachingPanel';
import { PostCallOverview } from './PostCallOverview';
import { PostCallCTA } from './PostCallCTA';
import type { MomentClassification } from './MomentExtractor';

const getClassificationLabel = (classification: MomentClassification): string => {
  switch (classification) {
    case 'best_moment': return 'Best Moment';
    case 'strong_move': return 'Strong Move';
    case 'turning_point': return 'Turning Point';
    case 'partial_turning_point': return 'Partial Win';
    case 'strong_attempt': return 'Strong Attempt';
    case 'mixed_signal': return 'Mixed Result';
    case 'missed_opportunity': return 'Missed Opportunity';
    case 'mistake': return 'Mistake';
    case 'blunder': return 'Blunder';
  }
};

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
  preAnalyzedMoments?: KeyMoment[]; // Skip LLM re-analysis if already analyzed
}

export const MarcusPostCallMoments: React.FC<MarcusPostCallMomentsProps> = ({
  duration,
  conversationExchanges = [],
  objectionData,
  buyerState,
  finalResistance,
  scenario,
  onTryAgain,
  preAnalyzedMoments
}) => {
  // Detect mobile vs desktop to conditionally render only one MomentCoachingPanel
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [phase, setPhase] = useState<'overview' | 'review' | 'cta'>('overview');
  const [keyMoments, setKeyMoments] = useState<KeyMoment[]>(preAnalyzedMoments || []);
  const [currentMomentIndex, setCurrentMomentIndex] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isExchangeExpanded, setIsExchangeExpanded] = useState(false);
  
  const selectedMoment = keyMoments[currentMomentIndex] || null;
  
  const goToNextMoment = () => {
    if (currentMomentIndex < keyMoments.length - 1) {
      setCurrentMomentIndex(currentMomentIndex + 1);
    } else {
      setPhase('cta');
    }
  };
  
  const goToPreviousMoment = () => {
    if (currentMomentIndex > 0) {
      setCurrentMomentIndex(currentMomentIndex - 1);
    }
  };
  
  const goToMoment = (index: number) => {
    setCurrentMomentIndex(index);
    setIsExchangeExpanded(false); // Reset expansion when changing moments
  };
  
  const getMomentColor = (moment: KeyMoment): string => {
    switch (moment.classification) {
      // INCREDIBLE (Blue)
      case 'best_moment':
      case 'turning_point':
        return '#3b82f6'; // blue-500
      
      // GREAT (Green)
      case 'strong_move':
        return '#22c55e'; // green-500
      
      // GOOD ATTEMPT (Yellow)
      case 'partial_turning_point':
      case 'strong_attempt':
      case 'mixed_signal':
        return '#eab308'; // yellow-500
      
      // MISTAKES (Red)
      case 'missed_opportunity':
      case 'mistake':
      case 'blunder':
        return '#ef4444'; // red-500
      
      default:
        return '#6b7280'; // gray (should never happen)
    }
  };
  const [showMetrics, setShowMetrics] = useState(false);
  const [isEvaluatingMoments, setIsEvaluatingMoments] = useState(!preAnalyzedMoments);
  
  useEffect(() => {
    // ALWAYS use MomentExtractor for consistent moment detection
    // preAnalyzedMoments from CriticalMomentDetector have incompatible structure
    if (conversationExchanges.length > 0) {
      console.log('🔍 Running MomentExtractor analysis...');
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
      
      // Filter for coaching-worthy moments (score >= 4/10) and sort chronologically
      const impactfulMoments = evaluatedMoments
        .filter(({ score }) => score >= 4)
        .sort((a, b) => a.moment.turnNumber - b.moment.turnNumber) // Chronological order
        .slice(0, 5)
        .map(({ moment }) => moment);
      
      console.log(`✅ Filtered to ${impactfulMoments.length} coaching-worthy moments (threshold: 4/10)`);
      
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
    const categories = calculateCategoryScores();
    const weakest = categories.find(c => c.isWeakest);
    const strongest = categories.find(c => c.isStrongest);
    
    const positiveCount = keyMoments.filter(m => m.type === 'positive_shift').length;
    const negativeCount = keyMoments.filter(m => m.type === 'negative_shift').length;
    
    // Debug logging for scenario difficulty
    console.log('🎯 Marcus Scenario Debug:', {
      scenarioExists: !!scenario,
      scenarioKeys: scenario ? Object.keys(scenario) : [],
      difficulty: scenario?.difficulty || 'not set',
      scenarioName: scenario?.name || 'not set',
      scenarioId: scenario?.id || 'not set',
      finalResistance,
      showHardMessage: scenario?.difficulty === 'hard' && finalResistance >= 7
    });
    
    // Hard difficulty - normalize unwinnable prospects
    if (scenario?.difficulty === 'hard' && finalResistance >= 7) {
      console.log('✅ Showing hard difficulty message');
      return "Marcus wasn't a fit this time—that's part of the game. Focus on qualifying out faster next time.";
    }
    
    // Strong performance
    if (negativeCount === 0 && positiveCount > 0 && strongest && strongest.score >= 75) {
      return 'You built strong rapport and kept Marcus engaged throughout';
    }
    
    // Identify specific weakness pattern
    const discoveryMisses = keyMoments.filter(m => m.type === 'missed_leverage').length;
    if (discoveryMisses >= 2 && weakest?.label === 'Discovery') {
      return 'The conversation stayed comfortable, but you missed chances to uncover real pain';
    }
    
    const mainIssue = Object.entries(objectionData.objectionSatisfaction)
      .filter(([_, sat]) => sat < 0.3)
      .sort((a, b) => (objectionData.objectionCounts[b[0]] || 0) - (objectionData.objectionCounts[a[0]] || 0))[0];
    
    if (mainIssue) {
      const [type] = mainIssue;
      return `The conversation stayed polite, but ${type} concerns were never fully addressed`;
    }
    
    if (weakest && strongest) {
      return `${strongest.label} held up better than the rest, but ${weakest.label.toLowerCase()} limited the call`;
    }
    
    return 'The conversation lacked depth where it mattered most';
  };
  
  const calculateOverallScore = (): number => {
    // Overall score is the weighted average of category scores
    const categories = calculateCategoryScores();
    const opening = categories.find(c => c.label === 'Opening')?.score || 50;
    const discovery = categories.find(c => c.label === 'Discovery')?.score || 50;
    const objection = categories.find(c => c.label === 'Objection Handling')?.score || 50;
    const positioning = categories.find(c => c.label === 'Positioning')?.score || 50;
    
    // Weight categories by sales importance
    // Discovery and Positioning are weighted higher as they drive outcomes
    return Math.round(
      (opening * 0.15) + 
      (discovery * 0.35) + 
      (objection * 0.25) + 
      (positioning * 0.25)
    );
  };
  
  const calculateObjectionScore = (): number => {
    const satisfactionValues = Object.values(objectionData.objectionSatisfaction);
    if (satisfactionValues.length === 0) return 70;
    const avgSatisfaction = satisfactionValues.reduce((sum, val) => sum + val, 0) / satisfactionValues.length;
    return Math.max(0, Math.min(100, avgSatisfaction * 100));
  };
  
  const calculateMomentScore = (): number => {
    if (keyMoments.length === 0) return 50;
    const positiveCount = keyMoments.filter(m => ['best_moment', 'strong_move', 'turning_point'].includes(m.classification)).length;
    const negativeCount = keyMoments.filter(m => ['mistake', 'blunder', 'missed_opportunity'].includes(m.classification)).length;
    
    // If no moments match our classifications, return neutral score
    if (positiveCount + negativeCount === 0) return 50;
    
    const ratio = positiveCount / (positiveCount + negativeCount);
    return Math.round(ratio * 100);
  };
  
  const calculateCategoryScores = () => {
    // Opening: Based on initial resistance and first moments
    const openingScore = calculateOpeningScore();
    
    // Discovery: Based on missed leverage and clarity achieved
    const discoveryScore = calculateDiscoveryScore();
    
    // Objection Handling: Based on objection satisfaction
    const objectionScore = calculateObjectionScore();
    
    // Positioning: Based on clarity, relevance, and value articulation
    const positioningScore = calculatePositioningScore();
    
    const categories = [
      { label: 'Opening', score: openingScore },
      { label: 'Discovery', score: discoveryScore },
      { label: 'Objection Handling', score: objectionScore },
      { label: 'Positioning', score: positioningScore },
    ];
    
    // Find strongest and weakest
    const sorted = [...categories].sort((a, b) => b.score - a.score);
    const strongest = sorted[0].label;
    const weakest = sorted[sorted.length - 1].label;
    
    return categories.map(cat => ({
      ...cat,
      color: cat.score >= 70 ? '#22c55e' : cat.score >= 50 ? '#fbbf24' : '#f97316',
      isStrongest: cat.label === strongest && cat.score >= 60,
      isWeakest: cat.label === weakest && cat.score < 60
    }));
  };
  
  const calculateOpeningScore = (): number => {
    // Opening based on initial resistance and trust building
    const resistanceScore = Math.max(0, 100 - (finalResistance * 10));
    const trustScore = Math.max(0, Math.min(100, ((buyerState?.trustLevel || 0) / 10) * 100));
    
    // Weight resistance more heavily as it reflects how the opening landed
    return Math.round((resistanceScore * 0.6) + (trustScore * 0.4));
  };
  
  const calculatePositioningScore = (): number => {
    // Positioning based on clarity, relevance, and moment quality
    const clarityScore = Math.max(0, Math.min(100, ((buyerState?.clarity || 0.5) * 100)));
    const relevanceScore = Math.max(0, Math.min(100, ((buyerState?.relevance || 0.5) * 100)));
    const momentScore = calculateMomentScore();
    
    // Clarity and relevance are key positioning indicators
    return Math.round((clarityScore * 0.4) + (relevanceScore * 0.4) + (momentScore * 0.2));
  };
  
  const calculateDiscoveryScore = (): number => {
    // Discovery quality based on missed leverage opportunities
    const discoveryMisses = keyMoments.filter(m => m.type === 'missed_leverage').length;
    const totalMoments = keyMoments.length || 1;
    
    // If we have many discovery misses, score should be low
    const missRatio = discoveryMisses / totalMoments;
    const baseScore = Math.max(0, Math.round((1 - missRatio) * 100));
    
    // Penalize if discovery misses are present
    if (discoveryMisses >= 2) return Math.min(baseScore, 40);
    if (discoveryMisses === 1) return Math.min(baseScore, 60);
    
    // If clarity is low, discovery was likely shallow regardless of moments
    // Normalize clarity to 0-1 range (in case it's passed as 0-10 or 0-100)
    const rawClarity = buyerState?.clarity || 0.5;
    const normalizedClarity = rawClarity > 1 ? rawClarity / 10 : rawClarity;
    const clarityScore = Math.min(100, normalizedClarity * 100);
    
    // Cap final score at 100
    return Math.min(100, Math.round((baseScore + clarityScore) / 2));
  };
  
  const getKeyMomentCounts = () => {
    // INCREDIBLE (Blue): Best moments and turning points
    const incredible = keyMoments.filter(m => 
      ['best_moment', 'turning_point'].includes(m.classification)
    ).length;
    
    // GREAT (Green): Strong moves
    const great = keyMoments.filter(m => 
      m.classification === 'strong_move'
    ).length;
    
    // GOOD ATTEMPT (Yellow): Partial wins, strong attempts, mixed signals
    const goodAttempt = keyMoments.filter(m => 
      ['partial_turning_point', 'strong_attempt', 'mixed_signal'].includes(m.classification)
    ).length;
    
    // MISTAKES (Red): Missed opportunities, mistakes, blunders
    const mistakes = keyMoments.filter(m => 
      ['missed_opportunity', 'mistake', 'blunder'].includes(m.classification)
    ).length;
    
    return { incredible, great, goodAttempt, mistakes };
  };
  
  // Show CTA screen after reviewing all moments
  if (phase === 'cta') {
    return (
      <PostCallCTA
        theme={theme}
        onTryAgain={() => {
          setPhase('overview');
          setCurrentMomentIndex(0);
          onTryAgain();
        }}
        onSignUp={() => {
          window.location.href = '/signup';
        }}
      />
    );
  }

  // Show overview screen first
  if (phase === 'overview' && keyMoments.length > 0 && !isEvaluatingMoments) {
    return (
      <div className={theme === 'dark' ? 'bg-[#0a0e13]' : 'bg-gray-50'}>
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`p-2 rounded-lg transition-colors ${
              theme === 'dark' 
                ? 'bg-white/10 hover:bg-white/20 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <PostCallOverview
          overallScore={calculateOverallScore()}
          summary={generateOneLiner()}
          categoryScores={calculateCategoryScores()}
          keyMomentCounts={getKeyMomentCounts()}
          onStartReview={() => setPhase('review')}
          onTryAgain={onTryAgain}
          theme={theme}
        />
      </div>
    );
  }
  
  return (
    <div className={`h-screen flex flex-col overflow-hidden ${
      theme === 'dark' ? 'bg-[#0a0e13]' : 'bg-gray-50'
    }`}>
      {/* Timeline Above Both Columns */}
      {keyMoments.length > 0 && phase === 'review' && (
        <div className={`py-3 border-b ${
          theme === 'dark' ? 'bg-[#0f1419] border-white/10' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={`p-2 rounded-lg transition-colors ${
                    theme === 'dark' 
                      ? 'bg-white/10 hover:bg-white/20 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
              <div className="flex-1"></div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onTryAgain}
                  disabled={isEvaluatingMoments}
                  className={`flex items-center gap-1 md:gap-2 px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white'
                  } disabled:opacity-50`}
                >
                  <RotateCcw size={14} className="md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Try Again</span>
                  <span className="sm:hidden">Retry</span>
                </button>
                <button className={`px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}>
                  Sign Up
                </button>
              </div>
            </div>
            
            <div className={`text-[10px] md:text-xs uppercase tracking-wider font-medium mb-2 md:mb-3 ${
              theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
            }`}>Coaching Moments Timeline</div>
            
            {/* Linear Timeline with All Moments */}
            <div className="relative h-4">
            {/* Background line */}
            <div className={`absolute left-0 right-0 h-0.5 ${
              theme === 'dark' ? 'bg-white/10' : 'bg-gray-300'
            } `} style={{ top: '50%', transform: 'translateY(-50%)' }}></div>
            
            {/* Turn tick marks - evenly spaced */}
            {conversationExchanges.map((exchange, idx) => {
              const totalTurns = conversationExchanges.length;
              const position = ((idx + 1) / totalTurns) * 100; // Position by actual turn count
              return (
                <div
                  key={`tick-${idx}`}
                  className={`absolute top-1/2 -translate-y-1/2 w-px h-2 ${
                    theme === 'dark' ? 'bg-white/20' : 'bg-gray-400'
                  }`}
                  style={{ left: `${position}%` }}
                />
              );
            })}
            
            {/* All moment dots positioned by turn number to match tick marks */}
            {keyMoments.map((moment, index) => {
              const totalTurns = conversationExchanges.length;
              const position = (moment.turnNumber / totalTurns) * 100; // Match tick mark positioning
              const dotColor = getMomentColor(moment);
              return (
                <button
                  key={moment.id}
                  onClick={() => goToMoment(index)}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group z-10 transition-all"
                  style={{ left: `${position}%` }}
                  title={moment.title}
                >
                  <div 
                    className={`rounded-full transition-all ${
                      index === currentMomentIndex
                        ? 'w-5 h-5 md:w-4 md:h-4 ring-4 ring-white/30' 
                        : 'w-3.5 h-3.5 md:w-2.5 md:h-2.5 opacity-70 hover:opacity-100 active:opacity-100 hover:scale-110'
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
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
      {isEvaluatingMoments ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Analyzing key moments...
            </div>
          </div>
        </div>
      ) : keyMoments.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className={`max-w-md text-center space-y-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {/* Icon */}
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'
            }`}>
              <div className={`text-3xl ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                ✓
              </div>
            </div>
            
            {/* Heading */}
            <div>
              <h3 className={`text-xl font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Call Complete
              </h3>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                No critical moments were detected in this conversation. This usually means the call was too brief or didn't reach key decision points.
              </p>
            </div>
            
            {/* Suggestions */}
            <div className={`rounded-lg p-4 text-left space-y-3 ${
              theme === 'dark' ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className={`text-xs font-semibold uppercase tracking-wider ${
                theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
              }`}>
                Next Time:
              </div>
              <ul className={`text-sm space-y-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Stay on the call longer to reach objection handling or discovery phases</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Push through resistance to create learning opportunities</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Try a different approach to generate meaningful exchanges with Marcus</span>
                </li>
              </ul>
            </div>
            
            {/* Action Button */}
            <button
              onClick={onTryAgain}
              className={`w-full px-6 py-3 font-semibold rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-red-500 hover:bg-red-600 text-white'
              }`}
            >
              Try Another Call
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* MOBILE LAYOUT - Single column with Trust cards at top, fixed nav at bottom */}
          <div className="md:hidden flex flex-col h-full overflow-hidden">
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto pb-32">
              {/* Classification Card at TOP */}
              {selectedMoment && (
                <div className="p-3 border-b" style={{
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(229,231,235,1)'
                }}>
                  <div className="rounded-lg p-2.5 border-l-4" style={{
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(249,250,251,1)',
                    borderColor: getMomentColor(selectedMoment)
                  }}>
                    <div className="font-bold text-xs" style={{ color: getMomentColor(selectedMoment) }}>
                      {getClassificationLabel(selectedMoment.classification)}
                    </div>
                    <div className={`text-xs mt-0.5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {selectedMoment.title}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Exchange Context - Responses */}
              {selectedMoment && (
                <div className="p-3 border-b space-y-2" style={{
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(229,231,235,1)'
                }}>
                  <div className="rounded-lg p-3 border-l-2" style={{
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(249,250,251,1)',
                    borderColor: getMomentColor(selectedMoment)
                  }}>
                    <div className="font-semibold text-xs mb-1" style={{ color: getMomentColor(selectedMoment) }}>Marcus said:</div>
                    <div className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      "{selectedMoment.marcusResponse || ''}"
                    </div>
                  </div>
                  
                  <div className="rounded-lg p-3 border-l-2 border-blue-500" style={{
                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(249,250,251,1)'
                  }}>
                    <div className="font-semibold text-xs mb-1" style={{ color: getMomentColor(selectedMoment) }}>You responded:</div>
                    <div className={`text-xs leading-relaxed font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                      "{selectedMoment.userMessage || ''}"
                    </div>
                  </div>
                </div>
              )}
              
              {/* Trust/Curiosity/Urgency - Inline format below responses */}
              {selectedMoment && (
                <div className="p-3 border-b" style={{
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(229,231,235,1)'
                }}>
                  <div className="flex gap-3 text-xs">
                    <div className="flex-1 rounded-lg p-2" style={{
                      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(249,250,251,1)',
                      border: theme === 'light' ? '1px solid rgba(229,231,235,1)' : 'none'
                    }}>
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>Trust: </span>
                      <span className={`font-medium capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {selectedMoment.marcusState?.trust || 'unknown'}
                      </span>
                    </div>
                    <div className="flex-1 rounded-lg p-2" style={{
                      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(249,250,251,1)',
                      border: theme === 'light' ? '1px solid rgba(229,231,235,1)' : 'none'
                    }}>
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>Curiosity: </span>
                      <span className={`font-medium capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {selectedMoment.marcusState?.curiosity || 'unknown'}
                      </span>
                    </div>
                    <div className="flex-1 rounded-lg p-2" style={{
                      backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(249,250,251,1)',
                      border: theme === 'light' ? '1px solid rgba(229,231,235,1)' : 'none'
                    }}>
                      <span className={theme === 'dark' ? 'text-gray-500' : 'text-gray-600'}>Urgency: </span>
                      <span className={`font-medium capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                        {selectedMoment.marcusState?.urgency || 'unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Coaching Content - Only render on mobile */}
              {isMobile && (
                <div className="p-3">
                  <MomentCoachingPanel 
                    key={selectedMoment?.id || 'no-moment'}
                    moment={selectedMoment} 
                    callDuration={duration}
                    allMoments={keyMoments}
                    currentIndex={currentMomentIndex}
                    scenario={scenario}
                    onNavigate={goToMoment}
                    theme={theme}
                  />
                </div>
              )}
            </div>
            
            {/* Fixed Navigation at Bottom */}
            <div className="fixed bottom-0 left-0 right-0 p-4" style={{
              backgroundColor: theme === 'dark' ? '#0a0e13' : '#ffffff',
              borderTop: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(229,231,235,1)'}`,
              boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <div className="flex gap-2">
                <button
                  onClick={goToPreviousMoment}
                  disabled={currentMomentIndex === 0}
                  className={`flex-1 py-2.5 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                    currentMomentIndex === 0
                      ? theme === 'dark'
                        ? 'border-white/10 bg-white/5 text-gray-600 cursor-not-allowed'
                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : theme === 'dark'
                        ? 'border-white/30 bg-white/5 text-white hover:bg-white/10 active:scale-95'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95'
                  }`}
                >
                  <ChevronLeft size={14} />
                  <span className="text-xs font-medium">Previous</span>
                </button>
                
                <button
                  onClick={goToNextMoment}
                  className={`flex-1 py-2.5 rounded-lg border flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    currentMomentIndex === keyMoments.length - 1
                      ? theme === 'dark'
                        ? 'border-blue-500/50 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                        : 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
                      : theme === 'dark'
                        ? 'border-white/30 bg-white/5 text-white hover:bg-white/10'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs font-medium">
                    {currentMomentIndex === keyMoments.length - 1 ? 'Complete Review' : 'Next'}
                  </span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
          
          {/* DESKTOP LAYOUT - Two columns */}
          <div className={`hidden md:flex w-full md:w-2/5 border-b md:border-b-0 md:border-r flex-col overflow-hidden ${
            theme === 'dark' ? 'border-white/10' : 'border-gray-200'
          }`}>
            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto">
              {/* Moment List - Fog of War with previous peek - Hidden on mobile */}
              <div className={`hidden md:block p-4 md:p-6 overflow-hidden border-b relative ${
                theme === 'dark' ? 'border-white/10' : 'border-gray-200'
              }`}>
              {/* Spotlight effect - dim everything except middle card area */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute inset-0" style={{
                  background: theme === 'dark'
                    ? 'radial-gradient(ellipse 100% 120px at center 90px, transparent 0%, rgba(10, 14, 19, 0.7) 100%)'
                    : 'radial-gradient(ellipse 100% 120px at center 90px, transparent 0%, rgba(243, 244, 246, 0.7) 100%)'
                }}></div>
              </div>
              
              <div className="relative">
                {/* Spacer for consistent positioning when at first moment */}
                {currentMomentIndex === 0 && (
                  <div className="mb-3" style={{ height: '45px' }}></div>
                )}
                
                {/* Previous moment - 50% visible (peek) with fade overlay at top */}
                {currentMomentIndex > 0 && (
                  <div className="relative overflow-hidden mb-3 opacity-60" style={{ maxHeight: '50px' }}>
                    <button
                      onClick={() => goToMoment(currentMomentIndex - 1)}
                      className={`w-full text-left p-3 md:p-3 rounded-lg border transition-all hover:opacity-100 active:opacity-100 ${
                        theme === 'light' ? 'shadow-sm' : ''
                      }`}
                      style={{ 
                        backgroundColor: theme === 'dark' 
                          ? `${getMomentColor(keyMoments[currentMomentIndex - 1])}10`
                          : `${getMomentColor(keyMoments[currentMomentIndex - 1])}08`,
                        borderColor: `${getMomentColor(keyMoments[currentMomentIndex - 1])}30`
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div 
                          className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                          style={{ backgroundColor: getMomentColor(keyMoments[currentMomentIndex - 1]) }}
                        ></div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium mb-1 leading-snug ${
                            theme === 'dark' ? 'text-white' : 'text-gray-800'
                          }`}>
                            {keyMoments[currentMomentIndex - 1].title}
                          </div>
                          <div className={`text-[10px] md:text-xs ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                          }`}>
                            Turn {keyMoments[currentMomentIndex - 1].turnNumber} • {Math.floor(keyMoments[currentMomentIndex - 1].timestamp / 60)}:{String(Math.floor(keyMoments[currentMomentIndex - 1].timestamp % 60)).padStart(2, '0')}
                          </div>
                        </div>
                      </div>
                    </button>
                    {/* Fade overlay at top */}
                    <div className={`absolute top-0 left-0 right-0 h-8 bg-gradient-to-b to-transparent pointer-events-none ${
                      theme === 'dark' ? 'from-[#0a0e13]' : 'from-gray-50'
                    }`}></div>
                  </div>
                )}
                
                {/* Current moment - fully visible with colored background */}
                {selectedMoment && (
                  <button
                    onClick={() => goToMoment(currentMomentIndex)}
                    className={`w-full text-left p-3 md:p-3 rounded-lg border mb-3 transition-all active:scale-98 ${
                      theme === 'light' ? 'shadow-sm' : ''
                    }`}
                    style={{ 
                      backgroundColor: theme === 'dark'
                        ? `${getMomentColor(selectedMoment)}20`
                        : `${getMomentColor(selectedMoment)}15`,
                      borderColor: `${getMomentColor(selectedMoment)}50`
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div 
                        className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: getMomentColor(selectedMoment) }}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium mb-1 leading-snug ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>
                          {selectedMoment.title}
                        </div>
                        <div className={`text-xs ${
                          theme === 'dark' ? 'text-gray-500' : 'text-gray-600'
                        }`}>
                          Turn {selectedMoment.turnNumber} • {Math.floor(selectedMoment.timestamp / 60)}:{String(Math.floor(selectedMoment.timestamp % 60)).padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
            
            {/* Exchange Context - Visible on all screen sizes */}
            {selectedMoment && (
              <div className={`p-4 md:p-6 border-b space-y-3 ${
                theme === 'dark' ? 'border-white/10' : 'border-gray-200'
              }`}>
                    <div className={`rounded-lg p-3 md:p-4 border-l-2 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`} style={{ borderColor: getMomentColor(selectedMoment) }}>
                      <div className="font-semibold text-xs md:text-sm mb-1" style={{ color: getMomentColor(selectedMoment) }}>Marcus said:</div>
                      <div className={`text-xs md:text-sm leading-relaxed ${theme === 'dark' ? 'text-white' : 'text-gray-800'} ${
                        !isExchangeExpanded && (selectedMoment.marcusResponse?.length || 0) > 150 ? 'line-clamp-3' : ''
                      }`}>"{selectedMoment.marcusResponse || ''}"</div>
                    </div>
                    
                    <div className={`rounded-lg p-3 md:p-4 border-l-2 border-blue-500 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-50'}`}>
                      <div className="font-semibold text-xs md:text-sm mb-1" style={{ color: getMomentColor(selectedMoment) }}>You responded:</div>
                      <div className={`text-xs md:text-sm leading-relaxed font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'} ${
                        !isExchangeExpanded && (selectedMoment.userMessage?.length || 0) > 150 ? 'line-clamp-3' : ''
                      }`}>"{selectedMoment.userMessage || ''}"</div>
                    </div>
                    
                    {/* Expand/Collapse Button */}
                    {((selectedMoment.marcusResponse?.length || 0) > 150 || (selectedMoment.userMessage?.length || 0) > 150) && (
                      <button
                        onClick={() => setIsExchangeExpanded(!isExchangeExpanded)}
                        className={`w-full py-2 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                          theme === 'dark'
                            ? 'text-blue-400 hover:bg-white/5'
                            : 'text-blue-600 hover:bg-gray-100'
                        }`}
                      >
                        {isExchangeExpanded ? '↑ Show less' : '↓ Show more'}
                      </button>
                    )}
              </div>
            )}
            </div>
              
            {/* Fixed bottom section */}
            <div className="flex-shrink-0">
                {/* Navigation Arrows */}
                <div className={`p-6 border-b ${
                  theme === 'dark' ? 'border-white/10' : 'border-gray-200'
                }`}>
                <div className="flex gap-2">
                  <button
                    onClick={goToPreviousMoment}
                    disabled={currentMomentIndex === 0}
                    className={`flex-1 py-2 rounded-lg border flex items-center justify-center gap-2 transition-all ${
                      currentMomentIndex === 0
                        ? theme === 'dark'
                          ? 'border-white/10 bg-white/5 text-gray-600 cursor-not-allowed'
                          : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : theme === 'dark'
                          ? 'border-white/30 bg-white/5 text-white hover:bg-white/10'
                          : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <ChevronLeft size={14} className="md:w-4 md:h-4" />
                    <span className="text-[11px] md:text-xs font-medium">Previous</span>
                  </button>
                  
                  <button
                    onClick={goToNextMoment}
                    className={`flex-1 py-2.5 md:py-2 rounded-lg border flex items-center justify-center gap-1 md:gap-2 transition-all active:scale-95 ${
                      currentMomentIndex === keyMoments.length - 1
                        ? theme === 'dark'
                          ? 'border-blue-500/50 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                          : 'border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : theme === 'dark'
                          ? 'border-white/30 bg-white/5 text-white hover:bg-white/10'
                          : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-[11px] md:text-xs font-medium">
                      {currentMomentIndex === keyMoments.length - 1 ? 'Complete Review' : 'Next'}
                    </span>
                    <ChevronRight size={14} className="md:w-4 md:h-4" />
                  </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right: Coaching Panel - Only render on desktop */}
            {!isMobile && (
              <div className="flex-1 flex flex-col overflow-hidden min-h-0 w-full">
                <MomentCoachingPanel 
                  key={selectedMoment?.id || 'no-moment'}
                  moment={selectedMoment} 
                  callDuration={duration}
                  allMoments={keyMoments}
                  currentIndex={currentMomentIndex}
                  scenario={scenario}
                  onNavigate={goToMoment}
                  theme={theme}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MarcusPostCallMoments;

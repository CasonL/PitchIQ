/**
 * TrainingWheels.tsx
 * Real-time coaching overlay during Marcus calls
 */

import React from 'react';
import { AlertCircle, CheckCircle, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';

interface TrainingWheelsProps {
  enabled: boolean;
  currentResistance: number;
  lastResistance: number;
  currentPhase: number;
  signals: {
    askedDiscovery: boolean;
    buildingRapport: boolean;
    talkingTooMuch: boolean;
    makingAssumptions: boolean;
    providingValue: boolean;
  };
  lastUserMessage: string;
  conversationTurns: number;
}

export const TrainingWheels: React.FC<TrainingWheelsProps> = ({
  enabled,
  currentResistance,
  lastResistance,
  currentPhase,
  signals,
  lastUserMessage,
  conversationTurns
}) => {
  if (!enabled) return null;

  const resistanceChange = currentResistance - lastResistance;
  
  // Determine what tip to show based on current state
  const getCurrentTip = (): { type: 'error' | 'warning' | 'success' | 'tip'; message: string; suggestion?: string } | null => {
    // Phase 1: Building rapport
    if (currentPhase === 1) {
      if (signals.talkingTooMuch && conversationTurns > 2) {
        return {
          type: 'error',
          message: "You're talking too much - Marcus is getting impatient",
          suggestion: "Ask about his context first: 'How's that been working out?' or 'What made you go with that approach?'"
        };
      }
      
      if (!signals.buildingRapport && conversationTurns > 3) {
        return {
          type: 'warning',
          message: "You haven't built any rapport yet",
          suggestion: "Try acknowledging something he said: 'That makes sense' or 'I can imagine that's frustrating'"
        };
      }
      
      if (!signals.askedDiscovery && conversationTurns > 4) {
        return {
          type: 'error',
          message: "Still no discovery questions - Marcus doesn't know why you're calling",
          suggestion: "Ask about HIS situation: 'What made you choose your current setup?' or 'How's that been working out?'"
        };
      }
      
      if (signals.askedDiscovery && !signals.talkingTooMuch) {
        return {
          type: 'success',
          message: "Good questioning! Keep listening and ask follow-ups"
        };
      }
    }
    
    // Phase 2: Discovery
    if (currentPhase === 2) {
      if (!signals.askedDiscovery) {
        return {
          type: 'error',
          message: "You're in discovery phase but not asking questions",
          suggestion: "Ask follow-ups: 'How's that been working out?' or 'Walk me through how you handle that currently'"
        };
      }
      
      if (signals.makingAssumptions) {
        return {
          type: 'warning',
          message: "You're making assumptions - ask, don't assume",
          suggestion: "Replace 'I bet you...' with 'Have you experienced...?' or 'What's your take on...?'"
        };
      }
      
      if (signals.askedDiscovery && signals.providingValue) {
        return {
          type: 'success',
          message: "Great discovery! Marcus is opening up"
        };
      }
    }
    
    // Phase 3: Handling objections
    if (currentPhase === 3) {
      if (signals.talkingTooMuch) {
        return {
          type: 'error',
          message: "You're pitching into resistance - STOP and ask questions",
          suggestion: "Ask: 'What would need to change for this to be worth exploring?' or 'What concerns do you have?'"
        };
      }
      
      if (currentResistance >= 8) {
        return {
          type: 'warning',
          message: "Marcus is very defensive - you need to de-escalate",
          suggestion: "Try: 'I totally understand. What would make this conversation more valuable for you?'"
        };
      }
    }
    
    // Generic tip based on resistance change
    if (resistanceChange >= 2) {
      return {
        type: 'error',
        message: `Marcus resistance jumped +${resistanceChange} - something you said triggered him`,
        suggestion: "Stop pitching. Ask what he thinks instead."
      };
    }
    
    if (resistanceChange <= -2) {
      return {
        type: 'success',
        message: `Resistance dropped ${Math.abs(resistanceChange)}! Whatever you're doing, keep it up`
      };
    }
    
    return null;
  };
  
  const tip = getCurrentTip();
  
  const getResistanceColor = (level: number): string => {
    if (level >= 8) return '#ef4444'; // red
    if (level >= 6) return '#f59e0b'; // orange
    if (level >= 4) return '#eab308'; // yellow
    return '#10b981'; // green
  };
  
  const getResistanceLabel = (level: number): string => {
    if (level >= 8) return 'Very Defensive';
    if (level >= 6) return 'Guarded';
    if (level >= 4) return 'Neutral';
    return 'Open';
  };
  
  const getTipIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-gray-900" />;
      case 'tip': return <Lightbulb className="w-5 h-5 text-blue-400" />;
      default: return null;
    }
  };
  
  const getTipColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-500/50 bg-red-500/10';
      case 'warning': return 'border-yellow-500/50 bg-yellow-500/10';
      case 'success': return 'border-green-500/50 bg-green-500/10';
      case 'tip': return 'border-blue-500/50 bg-blue-500/10';
      default: return 'border-white/10 bg-white/5';
    }
  };
  
  return (
    <div className="fixed top-24 right-6 w-96 z-50 space-y-3">
      {/* Resistance Meter */}
      <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-semibold text-sm">Marcus's Resistance</span>
          <div className="flex items-center gap-2">
            {resistanceChange > 0 && (
              <TrendingUp className="w-4 h-4 text-red-400" />
            )}
            {resistanceChange < 0 && (
              <TrendingDown className="w-4 h-4 text-green-400" />
            )}
            <span 
              className="text-lg font-bold"
              style={{ color: getResistanceColor(currentResistance) }}
            >
              {currentResistance}/10
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full transition-all duration-500 rounded-full"
            style={{ 
              width: `${(currentResistance / 10) * 100}%`,
              backgroundColor: getResistanceColor(currentResistance)
            }}
          />
        </div>
        
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-400">
            {getResistanceLabel(currentResistance)}
          </span>
        </div>
      </div>
      
      {/* Current Tip */}
      {tip && (
        <div className={`border rounded-2xl p-4 backdrop-blur-sm ${getTipColor(tip.type)}`}>
          <div className="flex items-start gap-3">
            {getTipIcon(tip.type)}
            <div className="flex-1">
              <p className="text-sm font-medium leading-relaxed text-gray-900">
                {tip.message}
              </p>
              
              {tip.suggestion && (
                <div className="mt-3 p-3 rounded-xl border bg-white/90 border-gray-300">
                  <p className="text-xs font-mono leading-relaxed text-gray-900">
                    💡 {tip.suggestion}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Signal Indicators */}
      <div className="bg-black/80 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <div className="text-xs text-gray-400 mb-2 font-semibold">YOUR SIGNALS</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">Discovery Questions</span>
            <span className={`text-xs font-semibold ${signals.askedDiscovery ? 'text-green-400' : 'text-red-400'}`}>
              {signals.askedDiscovery ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">Building Rapport</span>
            <span className={`text-xs font-semibold ${signals.buildingRapport ? 'text-green-400' : 'text-red-400'}`}>
              {signals.buildingRapport ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">Providing Value</span>
            <span className={`text-xs font-semibold ${signals.providingValue ? 'text-green-400' : 'text-red-400'}`}>
              {signals.providingValue ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-300">Listening (not talking too much)</span>
            <span className={`text-xs font-semibold ${!signals.talkingTooMuch ? 'text-green-400' : 'text-red-400'}`}>
              {!signals.talkingTooMuch ? '✓' : '✗'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

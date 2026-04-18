/**
 * StrategicMomentCoach.tsx
 * Minimal real-time coaching overlay for strategic moments
 * Appears during the call when Marcus signals key opportunities
 */

import React from 'react';
import { X, Lightbulb, Target, MessageSquare, LogOut, CheckCircle, TrendingUp } from 'lucide-react';

interface StrategicMomentCoachProps {
  moment: {
    type: string;
    signal: string;
    timestamp: number;
  } | null;
  onDismiss: () => void;
}

const getMomentIcon = (type: string) => {
  switch (type) {
    case 'overtalking':
      return <MessageSquare className="w-5 h-5" />;
    case 'question_dodge':
      return <Target className="w-5 h-5" />;
    case 'permission_signal':
      return <Target className="w-5 h-5" />;
    case 'differentiation_ask':
      return <Lightbulb className="w-5 h-5" />;
    case 'pain_reveal':
      return <MessageSquare className="w-5 h-5" />;
    case 'soft_exit':
      return <LogOut className="w-5 h-5" />;
    case 'success':
    case 'good_balance':
    case 'rapport_built':
      return <CheckCircle className="w-5 h-5" />;
    case 'progress':
    case 'resistance_drop':
      return <TrendingUp className="w-5 h-5" />;
    default:
      return <Lightbulb className="w-5 h-5" />;
  }
};

const getMomentColor = (type: string) => {
  switch (type) {
    case 'overtalking':
      return 'from-amber-500/20 to-orange-500/20 border-amber-500/50';
    case 'question_dodge':
      return 'from-red-500/20 to-rose-500/20 border-red-500/50';
    case 'permission_signal':
      return 'from-green-500/20 to-emerald-500/20 border-green-500/50';
    case 'differentiation_ask':
      return 'from-blue-500/20 to-cyan-500/20 border-blue-500/50';
    case 'pain_reveal':
      return 'from-purple-500/20 to-pink-500/20 border-purple-500/50';
    case 'soft_exit':
      return 'from-orange-500/20 to-amber-500/20 border-orange-500/50';
    case 'success':
    case 'good_balance':
    case 'rapport_built':
      return 'from-emerald-500/20 to-green-500/20 border-emerald-500/50';
    case 'progress':
    case 'resistance_drop':
      return 'from-green-400/20 to-emerald-400/20 border-green-400/50';
    default:
      return 'from-gray-500/20 to-gray-600/20 border-gray-500/50';
  }
};

const getMomentLabel = (type: string) => {
  switch (type) {
    case 'overtalking':
      return 'Talk Less';
    case 'question_dodge':
      return 'Answer First';
    case 'permission_signal':
      return 'Permission Signal';
    case 'differentiation_ask':
      return 'Differentiation Moment';
    case 'pain_reveal':
      return 'Pain Revealed';
    case 'soft_exit':
      return 'Exit Signal';
    case 'success':
      return 'Nice Work!';
    case 'good_balance':
      return 'Great Balance';
    case 'rapport_built':
      return 'Rapport Building';
    case 'progress':
      return 'Progress Made';
    case 'resistance_drop':
      return 'Resistance Dropping';
    default:
      return 'Strategic Moment';
  }
};

export const StrategicMomentCoach: React.FC<StrategicMomentCoachProps> = ({ moment, onDismiss }) => {
  if (!moment) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`bg-gradient-to-br ${getMomentColor(moment.type)} backdrop-blur-sm border-2 rounded-xl shadow-2xl max-w-sm`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-black/10">
          <div className="flex items-center gap-2 text-black">
            {getMomentIcon(moment.type)}
            <span className="font-semibold text-sm">{getMomentLabel(moment.type)}</span>
          </div>
          <button
            onClick={onDismiss}
            className="text-black/60 hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Coaching Signal */}
        <div className="p-4">
          <p className="text-black text-sm font-medium leading-relaxed">
            {moment.signal}
          </p>
        </div>

        {/* Auto-dismiss indicator */}
        <div className="h-1 bg-black/10 rounded-b-xl overflow-hidden">
          <div 
            className="h-full bg-black/40 animate-shrink"
            style={{
              animation: 'shrink 8s linear forwards'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

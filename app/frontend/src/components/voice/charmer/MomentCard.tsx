/**
 * MomentCard.tsx
 * Displays a single pivotal moment from the call
 */

import React from 'react';
import { KeyMoment, MomentType, MomentClassification, ReasonTag } from './MomentExtractor';

interface MomentCardProps {
  moment: KeyMoment;
  isSelected: boolean;
  onClick: () => void;
}

const getClassificationLabel = (classification: MomentClassification): string => {
  switch (classification) {
    case 'best_moment': return 'Best Moment';
    case 'strong_move': return 'Strong Move';
    case 'turning_point': return 'Turning Point';
    case 'missed_opportunity': return 'Missed Opportunity';
    case 'mistake': return 'Mistake';
    case 'blunder': return 'Blunder';
  }
};

const getClassificationColor = (classification: MomentClassification): string => {
  switch (classification) {
    case 'best_moment': return 'text-emerald-500 bg-emerald-500/15 border-emerald-500/30';
    case 'strong_move': return 'text-green-400 bg-green-400/10 border-green-400/20';
    case 'turning_point': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    case 'missed_opportunity': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
    case 'mistake': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
    case 'blunder': return 'text-red-500 bg-red-500/15 border-red-500/30';
  }
};

const getClassificationIcon = (classification: MomentClassification): string => {
  switch (classification) {
    case 'best_moment': return '★';
    case 'strong_move': return '✓';
    case 'turning_point': return '↗';
    case 'missed_opportunity': return '~';
    case 'mistake': return '✗';
    case 'blunder': return '‼';
  }
};

const getTagColor = (tag: ReasonTag): string => {
  switch (tag) {
    case 'Trust': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Proof': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'Discovery': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    case 'Urgency': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'Clarity': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    case 'Fit': return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
    case 'Value': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
  }
};

export const MomentCard: React.FC<MomentCardProps> = ({ moment, isSelected, onClick }) => {
  const formatTimestamp = (timestamp: number): string => {
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-xl border transition-all
        ${isSelected 
          ? 'bg-white/10 border-white/30 shadow-lg' 
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Classification Icon */}
        <div className={`
          flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center text-lg font-bold
          ${getClassificationColor(moment.classification)}
        `}>
          {getClassificationIcon(moment.classification)}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header - Classification Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`
              text-xs px-2 py-0.5 rounded border font-semibold uppercase tracking-wide
              ${getClassificationColor(moment.classification)}
            `}>
              {getClassificationLabel(moment.classification)}
            </span>
            <span className="text-xs text-gray-500">
              Turn {moment.turnNumber}
            </span>
          </div>
          
          {/* Title (Chess-style decisive) */}
          <h3 className="text-white font-semibold text-sm mb-1 leading-snug">
            {moment.title}
          </h3>
          
          {/* Meta: reason + timestamp */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500">{moment.reasonTag}</span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-500">{formatTimestamp(moment.timestamp)}</span>
          </div>
        </div>
        
        {/* Arrow indicator when selected */}
        {isSelected && (
          <div className="flex-shrink-0 text-white">
            →
          </div>
        )}
      </div>
    </button>
  );
};

export default MomentCard;

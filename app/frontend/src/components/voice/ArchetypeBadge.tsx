import React from 'react';
import { Shield } from 'lucide-react';

interface ArchetypeBadgeProps {
  archetype_name?: string;
  archetype_emoji?: string;
  archetype_tagline?: string;
  vocal_quirks?: string[];
  size?: 'small' | 'medium' | 'large';
  showQuirks?: boolean;
}

/**
 * Displays premium personality archetype branding
 * Shows which behavioral template the AI prospect is using
 */
export const ArchetypeBadge: React.FC<ArchetypeBadgeProps> = ({
  archetype_name,
  archetype_emoji,
  archetype_tagline,
  vocal_quirks = [],
  size = 'medium',
  showQuirks = false
}) => {
  if (!archetype_name) return null;

  const sizeClasses = {
    small: 'text-sm py-1 px-3',
    medium: 'text-base py-2 px-4',
    large: 'text-lg py-3 px-6'
  };

  const emojiSizes = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl'
  };

  return (
    <div className="archetype-badge-container">
      {/* Main Badge */}
      <div className={`
        inline-flex items-center gap-3 
        ${sizeClasses[size]}
        bg-gradient-to-r from-red-600 to-red-700
        text-white font-bold rounded-lg
        shadow-lg border border-red-800
        transition-all hover:scale-105
      `}>
        {archetype_emoji && (
          <span className={`${emojiSizes[size]} leading-none`}>
            {archetype_emoji}
          </span>
        )}
        <div className="flex flex-col items-start">
          <span className="uppercase tracking-wide leading-tight">
            {archetype_name}
          </span>
          {archetype_tagline && size !== 'small' && (
            <span className="text-xs text-red-100 font-normal leading-tight mt-0.5">
              {archetype_tagline}
            </span>
          )}
        </div>
      </div>

      {/* Vocal Quirks Preview */}
      {showQuirks && vocal_quirks && vocal_quirks.length > 0 && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-900">
              Watch Out For:
            </span>
          </div>
          <ul className="space-y-1.5">
            {vocal_quirks.slice(0, 3).map((quirk, idx) => (
              <li key={idx} className="text-sm text-amber-800 flex items-start gap-2">
                <span className="text-amber-600 mt-0.5">•</span>
                <span>{quirk}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ArchetypeBadge;

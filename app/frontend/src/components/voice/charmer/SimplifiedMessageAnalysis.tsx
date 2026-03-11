/**
 * SimplifiedMessageAnalysis.tsx
 * Clean, focused message feedback with highlighting
 */

import React from 'react';

interface SimplifiedMessageAnalysisProps {
  userMessage: string;
  highlightStart?: number; // Character index where highlighting starts
  highlightEnd?: number; // Character index where highlighting ends
  whatHappened: string; // Brief, direct explanation
  whyItMatters: string; // Core principle (bold)
  betterApproach: string; // Concrete alternative
}

export const SimplifiedMessageAnalysis: React.FC<SimplifiedMessageAnalysisProps> = ({
  userMessage,
  highlightStart,
  highlightEnd,
  whatHappened,
  whyItMatters,
  betterApproach
}) => {
  // Render message with optional highlighting
  const renderMessage = () => {
    if (highlightStart === undefined || highlightEnd === undefined) {
      return <p className="text-gray-300 mb-4">{userMessage}</p>;
    }

    const before = userMessage.substring(0, highlightStart);
    const highlighted = userMessage.substring(highlightStart, highlightEnd);
    const after = userMessage.substring(highlightEnd);

    return (
      <p className="text-gray-300 mb-4">
        {before}
        <span className="bg-red-500/20 border-b-2 border-red-500 px-1">
          {highlighted}
        </span>
        {after}
      </p>
    );
  };

  return (
    <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
      {/* Message with highlighting */}
      <div className="mb-6">
        <h4 className="text-gray-500 text-sm mb-3">What you said:</h4>
        {renderMessage()}
      </div>

      {/* What happened */}
      <p className="text-gray-400 mb-4">
        {whatHappened}
      </p>

      {/* Why it matters */}
      <p className="text-gray-300 mb-6">
        <strong className="text-white">"{whyItMatters}"</strong>
      </p>

      {/* Better approach */}
      <div className="bg-blue-500/10 border-l-4 border-blue-500 rounded-r-xl p-4">
        <h4 className="text-blue-400 font-semibold mb-2 flex items-center gap-2">
          💡 Better Approach
        </h4>
        <p className="text-gray-300 text-sm">
          {betterApproach}
        </p>
      </div>
    </div>
  );
};

export default SimplifiedMessageAnalysis;

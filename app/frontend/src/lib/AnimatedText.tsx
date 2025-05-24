import React from 'react';
import StreamingText from './StreamingText';
import StreamingTextWords from './StreamingTextWords';

export type AnimationStyle = 'sentences' | 'words' | 'none';

interface AnimatedTextProps {
  content: string;
  onComplete?: () => void;
  responseKey?: string;
  animationStyle?: AnimationStyle;
  baseThrottleMs?: number;
  initialWordCount?: number;
}

/**
 * Wrapper component that supports multiple text animation styles
 */
const AnimatedText: React.FC<AnimatedTextProps> = ({
  content,
  onComplete,
  responseKey,
  animationStyle = 'sentences',
  baseThrottleMs = 200,
  initialWordCount = 5
}) => {
  // No animation, just render the content directly
  if (animationStyle === 'none' || !content) {
    return (
      <div className="text-gray-800" style={{ whiteSpace: 'pre-wrap' }}>
        {content}
      </div>
    );
  }
  
  // Word-by-word animation that transitions to chunks
  if (animationStyle === 'words') {
    return (
      <StreamingTextWords
        content={content}
        onComplete={onComplete}
        responseKey={responseKey}
        baseThrottleMs={baseThrottleMs}
        initialWordCount={initialWordCount}
      />
    );
  }
  
  // Default: sentence-by-sentence animation
  return (
    <StreamingText
      content={content}
      onComplete={onComplete}
      responseKey={responseKey}
      baseThrottleMs={baseThrottleMs}
    />
  );
};

export default AnimatedText; 
import React, { useEffect, useState, useRef } from 'react';

interface StreamingTextProps {
  content: string;
  isTyping?: boolean;
  onComplete?: () => void;
  baseThrottleMs?: number;
  staticMode?: boolean;
  responseKey?: string;
  animationMode?: string; // Not used but kept for compatibility
}

/**
 * Simplified text display with sentence-by-sentence animation
 */
const StreamingText: React.FC<StreamingTextProps> = ({
  content,
  onComplete,
  baseThrottleMs = 300,
  responseKey
}) => {
  const [sentences, setSentences] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);
  
  // Apply styles once on first render
  useEffect(() => {
    // Create stylesheet if it doesn't exist
    if (!document.getElementById('sentence-fade-styles')) {
      const style = document.createElement('style');
      style.id = 'sentence-fade-styles';
      style.innerHTML = `
        .sentence-container {
          position: relative;
        }
        .sentence {
          opacity: 0;
          transition: opacity 0.4s ease-out;
        }
        .sentence.visible {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
  
  // Reset animation when content or responseKey changes
  useEffect(() => {
    // Clear any existing timeouts
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset visibility and animation state
    setVisibleCount(0);
    completedRef.current = false;
    
    if (!content?.trim()) {
      setSentences([]);
      return;
    }
    
    // Split content into sentences using regex
    // This matches sentences ending with .!? and considers quotes/parentheses
    const regex = /[^.!?:;]+[.!?:;]+(?:["'\)\s]*)|(\.\.\.)|([\n\r]{2,})|[^.!?:;]+$/g;
    let matches = content.match(regex) || [];
    
    // If no matches or only one, split by newlines
    if (matches.length <= 1) {
      matches = content.split(/\n+/).filter(s => s.trim());
    }
    
    // Clean up the sentences
    const cleanedSentences = matches.map(s => s.trim()).filter(s => s);
    setSentences(cleanedSentences);
  }, [content, responseKey]);
  
  // Animate sentences appearing one by one
  useEffect(() => {
    if (sentences.length === 0) return;
    
    // If all sentences are visible, call onComplete
    if (visibleCount >= sentences.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }
    
    // Show next sentence after delay
    timerRef.current = setTimeout(() => {
      setVisibleCount(prev => prev + 1);
    }, baseThrottleMs);
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visibleCount, sentences.length, baseThrottleMs, onComplete]);
  
  // If no content, don't render anything
  if (!content?.trim() || sentences.length === 0) {
    return null;
  }
  
  return (
    <div className="sentence-container text-gray-800">
      {sentences.map((sentence, i) => (
        <span 
          key={i} 
          className={`sentence ${i < visibleCount ? 'visible' : ''}`}
          style={{ 
            display: 'inline',
            marginRight: sentence.match(/[.!?]$/) ? '0.3em' : '' 
          }}
        >
          {sentence}
        </span>
      ))}
    </div>
  );
};

export default StreamingText; 
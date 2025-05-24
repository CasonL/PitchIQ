import React, { useEffect } from 'react';

interface TypingEffectProps {
  text: string;
  speed?: number;
  onComplete?: () => void;
}

// No animation text display
export const TypingEffect: React.FC<TypingEffectProps> = ({ 
  text, 
  speed = 50,
  onComplete 
}) => {
  // CSS styles
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .typing-container {
        white-space: pre-wrap;
        word-break: break-word;
        position: relative;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Call onComplete immediately after mounting
  useEffect(() => {
    if (onComplete) {
      // Small timeout to ensure component is fully mounted
      setTimeout(onComplete, 10);
    }
  }, [onComplete]);
  
  // Simple render without any animation
  return (
    <div className="typing-container">
      {text}
    </div>
  );
}; 
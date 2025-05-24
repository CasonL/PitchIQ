import React, { useMemo } from 'react';
import { TypingEffect } from './TypingEffect';

interface MessageFormatterProps {
  content: string;
  isTyping?: boolean;
  onComplete?: () => void;
}

/**
 * Custom simple message renderer that preserves all spacing exactly as in the original text
 */
const renderPlainText = (text: string) => {
  // Normalize line endings for consistent display, but preserve all spaces
  const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Break paragraphs at double newlines
  const paragraphs = normalizedText.split(/\n\n+/);
  
  return (
    <React.Fragment>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="mb-2">
          {/* Handle single newlines as line breaks */}
          {paragraph.split('\n').map((line, j) => (
            <React.Fragment key={j}>
              {/* We don't modify the text at all - preserving exact spacing */}
              {line}
              {j < paragraph.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      ))}
    </React.Fragment>
  );
};

/**
 * Component for formatting and displaying message content consistently
 */
const MessageFormatter: React.FC<MessageFormatterProps> = ({ 
  content, 
  isTyping = false,
  onComplete
}) => {
  // Use the exact same content for both typing effect and regular display
  // No preprocessing or modifications to ensure consistency
  const contentToDisplay = useMemo(() => {
    // Only replace undefined/null with empty string, nothing else
    return content || '';
  }, [content]);
  
  // Render with typing effect or our custom plain text renderer
  return isTyping ? (
    <TypingEffect 
      text={contentToDisplay}
      speed={20}
      onComplete={onComplete}
    />
  ) : (
    <div className="text-gray-800">
      {renderPlainText(contentToDisplay)}
    </div>
  );
};

export default MessageFormatter; 
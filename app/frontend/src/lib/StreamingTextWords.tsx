import React, { useEffect, useState, useRef } from 'react';

interface StreamingTextWordsProps {
  content: string;
  onComplete?: () => void;
  baseThrottleMs?: number;
  responseKey?: string;
  initialWordCount?: number; // Number of words to animate individually
  middleChunkWordCount?: number; // Number of words to show in small chunks in the middle
  structureFormat?: boolean; // Whether to apply structured formatting to long responses
  userName?: string; // User's name for personalized greetings
  conversationalTone?: boolean; // Whether to apply conversational tone adjustments
}

/**
 * Text animation that reveals first few words individually, then shows chunks
 * with natural pauses after punctuation
 */
const StreamingTextWords: React.FC<StreamingTextWordsProps> = ({
  content,
  onComplete,
  baseThrottleMs = 100,
  responseKey,
  initialWordCount = 5,
  middleChunkWordCount = 10, // Default to 10 words in middle section
  structureFormat = false, // Default to no additional formatting
  userName = '',
  conversationalTone = true // Default to conversational tone
}) => {
  const [chunks, setChunks] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completedRef = useRef(false);
  const animationIdRef = useRef(0);
  
  // Create styles for animation
  useEffect(() => {
    if (!document.getElementById('word-fade-styles')) {
      const style = document.createElement('style');
      style.id = 'word-fade-styles';
      style.innerHTML = `
        .word-container {
          position: relative;
          white-space: pre-wrap;
          line-height: 1.6;
        }
        .word-chunk {
          opacity: 0;
          display: inline;
          transition: opacity 0.25s ease-out;
        }
        .word-chunk.visible {
          opacity: 1;
        }
        .section-header {
          font-weight: bold;
          margin-top: 16px;
          margin-bottom: 8px;
        }
        .bullet-point {
          display: flex;
          margin-left: 16px;
          margin-bottom: 4px;
        }
        .bullet-marker {
          margin-right: 8px;
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
  
  // Helper function to check if a chunk ends with punctuation followed by space
  const getPunctuationPauseTime = (text: string): number => {
    // Check for punctuation at the end of the chunk followed by space
    // Return pause time multiplier based on punctuation type
    
    // Period, exclamation, question mark (sentence endings) get longer pauses
    if (text.match(/[.!?](\s|$)/)) {
      return 4.0; // Increased pause for sentence endings (was 2.5)
    }
    
    // Medium pauses for semicolons, colons, em dashes
    if (text.match(/[;:—](\s|$)/)) {
      return 2.2; // Slightly increased (was 1.8)
    }
    
    // Short pauses for commas, parentheses, quotes
    if (text.match(/[,)"'](\s|$)/)) {
      return 1.6; // Slightly increased (was 1.4)
    }
    
    return 1.0; // No special punctuation, no extra pause
  };
  
  // Helper function to add the user's name to greetings
  const personalizeGreeting = (text: string): string => {
    if (!userName || !text) return text;
    
    // Common greeting patterns to personalize
    const greetingPatterns = [
      // Match patterns like "Hi there!" or "Hello!"
      /^(Hi|Hello|Hey)(\s+there)?(!|\.|,)/i,
      /^(Good\s+(morning|afternoon|evening))(!|\.|,)/i,
      /^(Welcome)(!|\.|,)/i
    ];
    
    // Check if text starts with a greeting
    let matchedGreeting = false;
    for (const pattern of greetingPatterns) {
      if (pattern.test(text)) {
        matchedGreeting = true;
        break;
      }
    }
    
    if (matchedGreeting) {
      // Replace the greeting with a personalized one
      return text.replace(
        /^(Hi|Hello|Hey|Good\s+(morning|afternoon|evening)|Welcome)(\s+there)?(!|\.|,)/i,
        (match, greeting, timeOfDay, there, punctuation) => {
          // Format the personalized greeting
          const personalGreeting = `${greeting}${there || ''} ${userName}${punctuation}`;
          return personalGreeting;
        }
      );
    }
    
    return text;
  };
  
  // Helper function to make text more conversational
  const makeConversational = (text: string): string => {
    if (!conversationalTone || !text) return text;
    
    // Replace formal/robotic phrases with more conversational ones
    const replacements = [
      // Less formal introductions
      [/I am your AI (sales ?coach|assistant)/gi, "I'm your AI $1"],
      [/I would like to/gi, "I'd like to"],
      [/Please provide/gi, "Could you share"],
      [/In order to/gi, "To"],
      [/Is it possible for you to/gi, "Can you"],
      [/Would you be willing to/gi, "Would you mind"],
      
      // Replace survey-like questions
      [/Please describe your product or service/gi, "Tell me a bit about what you're selling"],
      [/Could you please describe/gi, "What can you tell me about"],
      [/On a scale of 1-10/gi, "How would you rate"],
      
      // Add conversation fillers and transitions
      [/^(Let me know if)/gi, "Great! $1"],
      [/^(Based on)/gi, "So, $1"],
      [/^(Here are some)/gi, "I think $1"],
      
      // Make questions more direct and conversational
      [/What is your biggest challenge/gi, "What's been your biggest challenge"],
      [/What are your goals/gi, "What are you hoping to achieve"],
      
      // Remove unnecessary formality
      [/I would recommend/gi, "I recommend"],
      [/It is important to/gi, "It's important to"],
      [/There are several/gi, "There are a few"],
      
      // Add more natural transitions
      [/Additionally,/gi, "Also,"],
      [/Furthermore,/gi, "Plus,"],
      [/Therefore,/gi, "So,"],
      [/Consequently,/gi, "As a result,"],
      
      // Remove survey feel
      [/Please select from the following options/gi, "What do you think about these ideas"],
      [/Please answer the following questions/gi, "I'm curious about a few things"],
      [/Please respond to the following/gi, "I'd love to hear your thoughts on this"],
      
      // Add warmth
      [/Thank you for providing that information/gi, "Thanks for sharing that"],
      [/I understand/gi, "I see what you mean"]
    ];
    
    // Apply all replacements
    let result = text;
    for (const [pattern, replacement] of replacements) {
      result = result.replace(pattern, replacement as string);
    }
    
    return result;
  };
  
  // Helper function to fix common word run-togethers
  const preprocessText = (text: string): string => {
    if (!text) return '';
    
    // Detect and fix common word run-togethers (missing spaces)
    // First, look for lowercase+uppercase letter sequences which often indicate 
    // two words joined together (camelCase-like patterns)
    text = text.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Look for common prefixes/suffixes that might be joined to other words 
    const commonPrefixes = ['please', 'could', 'would', 'should', 'will', 'can', 'may'];
    const commonSuffixes = ['describe', 'explain', 'tell', 'share', 'provide', 'send', 'help'];
    
    // Create regex patterns for these common word combinations
    const prefixPattern = new RegExp(
      `(${commonPrefixes.join('|')})(${commonSuffixes.join('|')})`, 'gi'
    );
    
    // Fix patterns like "pleasedescribe" -> "please describe"
    text = text.replace(prefixPattern, '$1 $2');
    
    return text;
  };
  
  // Helper function to structure long content into sections
  const formatContentStructure = (text: string): string => {
    if (!text || !structureFormat) return text;
    
    // Check if text is long enough to warrant structuring (at least 200 characters)
    if (text.length < 200) return text;
    
    // Split into paragraphs
    const paragraphs = text.split(/\n+/).filter(p => p.trim());
    
    // If not enough paragraphs for structuring, return as is
    if (paragraphs.length < 2) return text;
    
    // Create sections (intro, middle with bullet points, conclusion)
    let structuredText = '';
    
    // Introduction - first paragraph or two
    const introCount = Math.min(1, paragraphs.length - 1);
    const introParagraphs = paragraphs.slice(0, introCount);
    structuredText += introParagraphs.join('\n\n');
    
    // Add section divider
    structuredText += '\n\n';
    
    // Middle content with bullet points
    const middleStartIndex = introCount;
    const middleEndIndex = paragraphs.length - 1; // Save last paragraph for conclusion
    
    // If we have middle paragraphs, convert to bullet points
    if (middleEndIndex > middleStartIndex) {
      // Create section header if multiple points
      if (middleEndIndex - middleStartIndex > 0) {
        structuredText += 'Key points:\n\n';
      }
      
      // Convert middle paragraphs to bullet points
      for (let i = middleStartIndex; i < middleEndIndex; i++) {
        const paragraph = paragraphs[i].trim();
        if (paragraph) {
          // Check if paragraph already starts with a bullet; if not, add one
          if (!paragraph.startsWith('•') && !paragraph.startsWith('-')) {
            structuredText += '• ' + paragraph + '\n\n';
          } else {
            structuredText += paragraph + '\n\n';
          }
        }
      }
    }
    
    // Conclusion - last paragraph
    const conclusion = paragraphs[paragraphs.length - 1];
    if (conclusion) {
      if (paragraphs.length > 2) {
        structuredText += 'In conclusion:\n\n';
      }
      structuredText += conclusion;
    }
    
    return structuredText;
  };
  
  // Parse content into words and chunks when content changes
  useEffect(() => {
    // Increment animation ID to invalidate existing animations
    animationIdRef.current += 1;
    
    // Clear any existing timeouts
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    // Reset visibility and animation state
    setVisibleCount(0);
    completedRef.current = false;
    
    if (!content?.trim()) {
      setChunks([]);
      return;
    }
    
    // Apply preprocessing to fix common word run-togethers
    const processedContent = preprocessText(content);
    
    // Apply conversational tone improvements
    const conversationalContent = makeConversational(processedContent);
    
    // Personalize greeting if a name is provided
    const personalizedContent = personalizeGreeting(conversationalContent);
    
    // Apply structural formatting for long responses
    const structuredContent = formatContentStructure(personalizedContent);
    
    // First pass: split content by new lines to preserve formatting
    const lines = structuredContent.split(/\n+/);
    const result: string[] = [];
    
    lines.forEach((line, lineIndex) => {
      // Skip empty lines but preserve paragraph breaks
      if (!line.trim()) {
        if (lineIndex > 0) {
          result.push('\n');
        }
        return;
      }
      
      // Handle section headers and bullet points specially
      if (structureFormat) {
        // Check for section headers
        if (line === 'Key points:' || line === 'In conclusion:') {
          result.push(`\n<section-header>${line}</section-header>\n`);
          return;
        }
        
        // Check for bullet points
        if (line.startsWith('• ') || line.startsWith('- ')) {
          const bulletMarker = line.substring(0, 2);
          const bulletContent = line.substring(2);
          result.push(`\n<bullet-start>${bulletMarker}</bullet-start>`);
          
          // Process bullet content as normal text
          const bulletWords = bulletContent.split(/\s+/).filter(w => w);
          
          // Show first few words individually
          const initialBulletWords = bulletWords.slice(0, Math.min(3, bulletWords.length));
          initialBulletWords.forEach((word, i) => {
            result.push(word + (i < initialBulletWords.length - 1 ? ' ' : ''));
          });
          
          // Process remaining words in bullet point
          if (bulletWords.length > initialBulletWords.length) {
            const remainingWords = bulletWords.slice(initialBulletWords.length);
            let chunkSize = 2;
            let currentIndex = 0;
            
            while (currentIndex < remainingWords.length) {
              const endIndex = Math.min(currentIndex + chunkSize, remainingWords.length);
              let chunk = '';
              
              for (let i = currentIndex; i < endIndex; i++) {
                chunk += remainingWords[i];
                if (i < endIndex - 1 || endIndex < remainingWords.length) {
                  chunk += ' ';
                }
              }
              
              result.push(chunk);
              currentIndex = endIndex;
              chunkSize = Math.min(chunkSize + 2, 10);
            }
          }
          
          result.push('\n');
          return;
        }
      }
      
      // Split line into words
      const words = line.split(/\s+/).filter(w => w);
      
      // Process words in this line
      let processedCount = 0;
      
      // For the first sentence of the first line, show individual words
      if (lineIndex === 0 && words.length > 0) {
        // Show initial words individually (up to initialWordCount)
        const initialWords = words.slice(0, Math.min(initialWordCount, words.length));
        initialWords.forEach((word, i) => {
          result.push(word + (i < initialWords.length - 1 ? ' ' : ''));
        });
        processedCount = initialWords.length;
      }
      
      // For remaining words in first line and all other lines
      if (processedCount < words.length) {
        const remainingWords = words.slice(processedCount);
        
        // Calculate how many words to process in the middle section with small chunks
        const middleWordCount = Math.min(middleChunkWordCount, remainingWords.length);
        const middleWords = remainingWords.slice(0, middleWordCount);
        
        // Process middle section with 2-3 word chunks
        let middleIndex = 0;
        while (middleIndex < middleWords.length) {
          // Use a fixed small chunk size (2-3 words) for the middle section
          const chunkSize = Math.min(2 + Math.floor(Math.random() * 2), middleWords.length - middleIndex); // 2-3 words
          const endIndex = middleIndex + chunkSize;
          
          // Create chunk
          let chunk = '';
          for (let i = middleIndex; i < endIndex; i++) {
            chunk += middleWords[i];
            if (i < endIndex - 1 || endIndex < middleWords.length) {
              chunk += ' ';
            }
          }
          
          result.push(chunk);
          middleIndex = endIndex;
        }
        
        // Now process any remaining words with increasing chunk sizes
        const finalWords = remainingWords.slice(middleWordCount);
        if (finalWords.length > 0) {
          let chunkSize = 3; // Start with slightly larger chunks
          let currentIndex = 0;
          
          while (currentIndex < finalWords.length) {
            const endIndex = Math.min(currentIndex + chunkSize, finalWords.length);
            
            // Create chunk
            let chunk = '';
            for (let i = currentIndex; i < endIndex; i++) {
              chunk += finalWords[i];
              if (i < endIndex - 1 || endIndex < finalWords.length) {
                chunk += ' ';
              }
            }
            
            result.push(chunk);
            
            // Move to next chunk
            currentIndex = endIndex;
            
            // Increase chunk size (fibonacci-like growth)
            chunkSize = Math.min(chunkSize + Math.ceil(chunkSize * 0.5), 25);
          }
        }
      }
      
      // Add line break if not the last line
      if (lineIndex < lines.length - 1) {
        result.push('\n');
      }
    });
    
    setChunks(result.filter(chunk => chunk !== ''));
  }, [content, responseKey, initialWordCount, middleChunkWordCount, structureFormat, userName, conversationalTone]);
  
  // Animate chunks appearing one by one
  useEffect(() => {
    if (chunks.length === 0) return;
    
    // If all chunks are visible, call onComplete
    if (visibleCount >= chunks.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
      return;
    }
    
    const currentAnimationId = animationIdRef.current;
    const currentChunk = chunks[visibleCount];
    
    // Calculate delay based on chunk characteristics and position
    let delay = baseThrottleMs;
    
    // Special handling for structural elements
    if (currentChunk.startsWith('<section-header>') || currentChunk.startsWith('<bullet-start>')) {
      delay = baseThrottleMs * 1.5; // Slightly longer pause for structure elements
    }
    // Apply different pacing for different parts of the text
    else if (visibleCount < initialWordCount) {
      // Individual words at the beginning appear faster
      delay = baseThrottleMs * 0.7;
      
      // Add punctuation-based pauses even for initial words
      const punctuationMultiplier = getPunctuationPauseTime(currentChunk);
      if (punctuationMultiplier > 1.0) {
        delay *= punctuationMultiplier;
      }
    } else {
      // Adjust timing based on content
      if (currentChunk === '\n') {
        // Longer pause at paragraph breaks
        delay = baseThrottleMs * 2.0;
      } else {
        // Check for punctuation pauses
        const punctuationMultiplier = getPunctuationPauseTime(currentChunk);
        
        // Calculate base delay based on chunk size
        const chunkWordCount = currentChunk.split(/\s+/).length;
        const sizeBasedDelay = baseThrottleMs * (0.8 + Math.min(chunkWordCount * 0.05, 0.5));
        
        // Apply punctuation multiplier
        delay = sizeBasedDelay * punctuationMultiplier;
      }
    }
    
    // Add slight variability to make timing feel more natural
    const jitter = Math.random() * 0.2 - 0.1; // ±10% variability
    delay = Math.max(30, delay * (1 + jitter));
    
    // Show next chunk after delay
    timerRef.current = setTimeout(() => {
      // Only proceed if still the current animation
      if (currentAnimationId === animationIdRef.current) {
        setVisibleCount(prev => prev + 1);
      }
    }, delay);
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [visibleCount, chunks, baseThrottleMs, initialWordCount, onComplete]);
  
  // Calculate if a space should be inserted between chunks
  const shouldAddSpace = (index: number, chunk: string) => {
    if (index >= chunks.length - 1) return false;
    if (chunk === '\n' || chunks[index + 1] === '\n') return false;
    return true;
  };
  
  // If no content, don't render anything
  if (!content?.trim() || chunks.length === 0) {
    return null;
  }
  
  return (
    <div className="word-container text-gray-800">
      {chunks.map((chunk, i) => {
        // Handle line breaks
        if (chunk === '\n') {
          return <br key={`br-${i}`} />;
        }
        
        // Handle section headers
        if (chunk.startsWith('<section-header>')) {
          const headerText = chunk.replace('<section-header>', '').replace('</section-header>', '');
          return (
            <div 
              key={`header-${i}`} 
              className={`section-header word-chunk ${i < visibleCount ? 'visible' : ''}`}
            >
              {headerText}
            </div>
          );
        }
        
        // Handle bullet points
        if (chunk.startsWith('<bullet-start>')) {
          const bulletMarker = chunk.replace('<bullet-start>', '').replace('</bullet-start>', '');
          return (
            <div 
              key={`bullet-${i}`} 
              className={`bullet-point word-chunk ${i < visibleCount ? 'visible' : ''}`}
            >
              <span className="bullet-marker">{bulletMarker}</span>
            </div>
          );
        }
        
        // Regular text chunks
        return (
          <span 
            key={i} 
            className={`word-chunk ${i < visibleCount ? 'visible' : ''}`}
          >
            {chunk}
          </span>
        );
      })}
    </div>
  );
};

export default StreamingTextWords; 
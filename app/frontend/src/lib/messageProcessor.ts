/**
 * Singleton class for processing messages
 */
export class MessageProcessor {
  private static instance: MessageProcessor;
  private continuationPhrases: string[] = [
    "Would you like to add more about your product, or should we move on to the buyer?",
    "Would you like to add anything else?",
    "Is there anything else you'd like to share?",
    "Is there anything else you'd like to add?",
    "Do you have any questions about this?",
    "Would you like to continue?",
    "Shall we continue?",
    "Ready to continue?",
    "Would you like me to continue?",
    "Should we proceed?",
    "Is there anything else you'd like to add, or can we continue?",
    "or can we continue?",
    "If you'd like to add anything else, feel free.",
    "Anything else you'd like to add?",
    "Can we continue?",
    "Would you like to proceed?",
    "Anything else to add before we continue?"
  ];

  private constructor() {}

  public static getInstance(): MessageProcessor {
    if (!MessageProcessor.instance) {
      MessageProcessor.instance = new MessageProcessor();
    }
    return MessageProcessor.instance;
  }

  /**
   * Process an AI response - includes removing continuation phrases
   */
  public processAIResponse(text: string): string {
    if (!text) return text;
    
    let processed = text;
    
    // Remove continuation phrases
    for (const phrase of this.continuationPhrases) {
      if (processed.endsWith(phrase)) {
        processed = processed.substring(0, processed.length - phrase.length).trim();
      }
    }
    
    // Also check for phrases that are near the end but might have punctuation after them
    for (const phrase of this.continuationPhrases) {
      const index = processed.indexOf(phrase);
      if (index !== -1 && index > processed.length - phrase.length - 30) {
        // Only trim if it's near the end of the message (increased from 20 to 30 characters)
        processed = processed.substring(0, index).trim();
        break;
      }
    }
    
    // No need to apply fixPunctuation
    
    return processed;
  }

  /**
   * Process a user message
   */
  public processUserMessage(text: string): string {
    if (!text) return text;
    
    // No need to apply fixPunctuation
    
    return text;
  }
} 
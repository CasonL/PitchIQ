/**
 * StrategicMomentDetector.ts
 * Client-side pattern detection for strategic moments
 * Complements LLM tagging with rule-based detection
 */

import { StrategicMoment } from './CharmerAIService';

interface ConversationContext {
  userMessage: string;
  marcusLastMessage: string;
  marcusLastEmotion: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export class StrategicMomentDetector {
  
  /**
   * Detect if user is overtalking based on:
   * - Message length vs Marcus's patience signals
   * - Marcus's emotion indicating impatience
   */
  static detectOvertalking(context: ConversationContext): StrategicMoment | null {
    const { userMessage, marcusLastEmotion, marcusLastMessage } = context;
    
    // Impatience signals from Marcus
    const impatienceSignals = [
      'frustrated', 'annoyed', 'worried', 'skeptical'
    ];
    
    const marcusShowingImpatience = impatienceSignals.includes(marcusLastEmotion);
    
    // Check if user's message is long (>150 chars) after Marcus showed impatience
    if (marcusShowingImpatience && userMessage.length > 150) {
      return {
        type: 'overtalking',
        signal: 'Keep it brief - Marcus is impatient'
      };
    }
    
    // NOTE: Removed hard-coded "busy" detection - too many false positives
    // (e.g., "I've got a minute" means HAS time, not busy)
    // Let LLM handle nuanced busy/time pressure detection via CharmerAIService
    
    return null;
  }
  
  /**
   * Detect if user dodged Marcus's direct question
   * Looks for question marks in Marcus's last message + no answer in user's response
   */
  static detectQuestionDodge(context: ConversationContext): StrategicMoment | null {
    const { userMessage, marcusLastMessage } = context;
    
    // Check if Marcus asked a question
    const marcusAskedQuestion = marcusLastMessage.includes('?');
    if (!marcusAskedQuestion) return null;
    
    // Extract Marcus's question
    const questionPatterns = [
      /what('s| is| are| do| did| does)/i,
      /why/i,
      /how('s| is| do| did| does)/i,
      /when/i,
      /who('s| is)/i,
      /can you/i,
      /could you/i,
      /would you/i,
      /are you/i,
      /do you/i,
      /did you/i
    ];
    
    const containsQuestionWord = questionPatterns.some(pattern => 
      pattern.test(marcusLastMessage)
    );
    
    if (!containsQuestionWord) return null;
    
    // Check if user pivoted to discovery instead of answering
    const discoveryPivots = [
      'let me ask you',
      'can i ask',
      'what about you',
      'tell me about',
      'i want to understand',
      'help me understand',
      'curious about'
    ];
    
    const userPivotedToDiscovery = discoveryPivots.some(pivot =>
      userMessage.toLowerCase().includes(pivot)
    );
    
    if (userPivotedToDiscovery) {
      return {
        type: 'question_dodge',
        signal: 'Answer Marcus\'s question first'
      };
    }
    
    return null;
  }
  
  /**
   * Main detection method - checks all patterns
   * Returns first detected strategic moment or null
   */
  static detectClientSideStrategicMoment(context: ConversationContext): StrategicMoment | null {
    // Check overtalking first (more urgent)
    const overtalkingMoment = this.detectOvertalking(context);
    if (overtalkingMoment) return overtalkingMoment;
    
    // Check question dodge
    const dodgeMoment = this.detectQuestionDodge(context);
    if (dodgeMoment) return dodgeMoment;
    
    return null;
  }
}

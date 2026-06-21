/**
 * EmotionResolver.ts
 * Fallback emotion detection based on content analysis
 * LLM should specify emotion in most cases - this is backup only
 */

import type { CharmerPhase, ConversationContext } from '../CharmerPhaseManager';
import type { AIResponse } from '../types/MarcusAI.types';

export class EmotionResolver {
  /**
   * Determine emotion based on phase and content (fallback only - LLM should specify)
   */
  static determineEmotion(
    content: string, 
    phase: CharmerPhase, 
    context: ConversationContext
  ): AIResponse['emotion'] {
    const lowerContent = content.toLowerCase();
    
    switch (phase) {
      case 'prospect':
        // Prospect mode: Natural reactions
        if (lowerContent.includes('in the middle') || lowerContent.includes('call you back')) {
          return 'neutral'; // Busy
        }
        if (lowerContent.includes('pretty cool') || lowerContent.includes('love it')) {
          return 'excited'; // Genuinely pumped
        }
        if (lowerContent.includes('that sounds') || lowerContent.includes('interesting')) {
          return 'interested'; // Paying attention
        }
        if (lowerContent.includes('heard that before')) {
          return 'skeptical'; // Dubious
        }
        if (lowerContent.includes('not sure')) {
          return 'worried'; // Uncertain
        }
        // Default: neutral/skeptical for cold calls, not cheerful
        return 'neutral';
        
      case 'coach':
        // Coach mode: Warm teaching
        if (lowerContent.includes('noticed') || lowerContent.includes('try')) {
          return 'warm'; // Genuinely caring
        }
        return 'neutral';
        
      case 'exit':
        return 'warm'; // Friendly goodbye
        
      default:
        return 'neutral'; // Changed from 'happy' - safer default
    }
  }
  
  /**
   * Get fallback response when API fails
   */
  static getFallbackResponse(phase: CharmerPhase): AIResponse {
    const fallbacks: Record<CharmerPhase, { content: string; emotion: AIResponse['emotion'] }> = {
      'prospect': {
        content: "Wait, who is this again? What's this about?",
        emotion: 'skeptical'
      },
      'coach': {
        content: "Here's what I noticed: focus on asking more open-ended questions. Try something like 'What's your biggest challenge right now?' instead of yes/no questions.",
        emotion: 'neutral'
      },
      'exit': {
        content: "I've gotta get back to what I was doing. Cheers!",
        emotion: 'warm'
      }
    };
    
    return {
      content: fallbacks[phase].content,
      emotion: fallbacks[phase].emotion,
      shouldTransitionPhase: false,
      generation_failed_fallback: true // Mark as fallback to prevent analytics pollution
    };
  }
}

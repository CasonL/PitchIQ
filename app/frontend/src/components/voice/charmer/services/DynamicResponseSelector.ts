/**
 * DynamicResponseSelector.ts
 * Selects Marcus's responses dynamically to avoid predictability
 */

import { ResponseVariationSystem, VariationContext } from '../prompts/ResponseVariationSystem';
import { MarcusScenario } from '../MarcusScenarios';
import { ConversationContext } from '../CharmerPhaseManager';

export interface ResponseSelectionContext {
  turnNumber: number;
  scenario?: MarcusScenario;
  conversationContext: ConversationContext;
  userMessage: string;
  previousResponses?: string[];
}

export class DynamicResponseSelector {
  private responseHistory: Map<string, string[]> = new Map();
  
  /**
   * Get a dynamic initial response based on context
   */
  getInitialResponse(context: ResponseSelectionContext): string {
    const { scenario, conversationContext, userMessage } = context;
    
    // Build variation context
    const variationContext: VariationContext = {
      turnNumber: 1,
      product: conversationContext.product,
      relationshipType: scenario?.relationshipHistory?.type,
      marcusTraits: scenario?.traits ? {
        painLevel: scenario.traits.painLevel,
        urgency: scenario.traits.urgency,
        openness: scenario.traits.openness
      } : undefined,
      lastUserMessage: userMessage,
      callVariationSeed: conversationContext.callVariationSeed || 50
    };
    
    // Check if email signup is mentioned
    const emailMentioned = userMessage.toLowerCase().includes('email') || 
                          userMessage.toLowerCase().includes('website') ||
                          userMessage.toLowerCase().includes('signed up');
    
    if (emailMentioned && scenario?.relationshipHistory?.type === 'email_signup_curious') {
      return ResponseVariationSystem.getEmailSignupResponse(variationContext);
    }
    
    // Otherwise use cold call variations
    return ResponseVariationSystem.getColdCallResponse(variationContext);
  }
  
  /**
   * Get a dynamic objection based on context and history
   */
  getObjection(
    objectionType: 'budget' | 'timing' | 'authority' | 'need' | 'trust',
    context: ResponseSelectionContext
  ): string {
    const variationContext: VariationContext = {
      turnNumber: context.turnNumber,
      product: context.conversationContext.product,
      marcusTraits: context.scenario?.traits ? {
        painLevel: context.scenario.traits.painLevel,
        urgency: context.scenario.traits.urgency,
        openness: context.scenario.traits.openness
      } : undefined,
      lastUserMessage: context.userMessage,
      callVariationSeed: context.conversationContext.callVariationSeed || 50
    };
    
    // Get varied objection
    const objection = ResponseVariationSystem.getObjectionResponse(objectionType, variationContext);
    
    // Personalize with context
    return ResponseVariationSystem.personalizeResponse(objection, variationContext);
  }
  
  /**
   * Check if a response pattern has been used recently
   */
  private hasRecentlyUsed(responsePattern: string, sessionId: string): boolean {
    const history = this.responseHistory.get(sessionId) || [];
    
    // Check last 3 responses for similar patterns
    const recentResponses = history.slice(-3);
    
    return recentResponses.some(response => {
      // Simple similarity check - could be made more sophisticated
      const pattern = responsePattern.toLowerCase();
      const prev = response.toLowerCase();
      
      // Check for key phrases
      if (pattern.includes('remember') && prev.includes('remember')) return true;
      if (pattern.includes('don\'t recall') && prev.includes('don\'t recall')) return true;
      if (pattern.includes('went with') && prev.includes('went with')) return true;
      if (pattern.includes('not a fit') && prev.includes('not a fit')) return true;
      
      return false;
    });
  }
  
  /**
   * Record a response to avoid repetition
   */
  recordResponse(response: string, sessionId: string): void {
    if (!this.responseHistory.has(sessionId)) {
      this.responseHistory.set(sessionId, []);
    }
    
    const history = this.responseHistory.get(sessionId)!;
    history.push(response);
    
    // Keep only last 10 responses per session
    if (history.length > 10) {
      history.shift();
    }
  }
  
  /**
   * Clear history for a session
   */
  clearSession(sessionId: string): void {
    this.responseHistory.delete(sessionId);
  }
  
  /**
   * Get response diversity score (0-1, higher is more diverse)
   */
  getDiversityScore(sessionId: string): number {
    const history = this.responseHistory.get(sessionId) || [];
    if (history.length < 2) return 1;
    
    // Calculate uniqueness of responses
    const uniquePatterns = new Set<string>();
    
    history.forEach(response => {
      const lower = response.toLowerCase();
      
      // Extract key patterns
      if (lower.includes('remember')) uniquePatterns.add('remember');
      if (lower.includes('don\'t recall') || lower.includes('don\'t remember')) uniquePatterns.add('forget');
      if (lower.includes('went with') || lower.includes('chose')) uniquePatterns.add('elsewhere');
      if (lower.includes('not a fit') || lower.includes('didn\'t work')) uniquePatterns.add('no-fit');
      if (lower.includes('budget')) uniquePatterns.add('budget');
      if (lower.includes('timing')) uniquePatterns.add('timing');
      if (lower.includes('busy') || lower.includes('swamped')) uniquePatterns.add('busy');
    });
    
    // Score based on pattern variety
    return Math.min(uniquePatterns.size / history.length, 1);
  }
}

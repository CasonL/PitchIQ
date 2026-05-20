/**
 * KnownFactsPromptBuilder.ts
 * Builds "facts Marcus knows" prompt to prevent repetitive questions
 */

import type { ConversationContext } from '../CharmerPhaseManager';

export class KnownFactsPromptBuilder {
  /**
   * Build FACTS MARCUS KNOWS section to prevent repeated questions
   */
  static buildKnownFactsPrompt(context?: ConversationContext): string {
    if (!context) return '';
    
    const facts: string[] = [];
    
    if (context.userName) {
      facts.push(`Their name: ${context.userName}`);
    }
    
    if (context.extractedCompany) {
      facts.push(`Company: ${context.extractedCompany}`);
    }
    
    if (context.product) {
      facts.push(`Product/Service: ${context.product}`);
    }
    
    if (context.extractedFeatures && context.extractedFeatures.length > 0) {
      facts.push(`Features mentioned: ${context.extractedFeatures.join(', ')}`);
    }
    
    if (context.memorablePhrases && context.memorablePhrases.length > 0) {
      facts.push(`Key claims they made: "${context.memorablePhrases.join('", "')}"`);
    }
    
    if (facts.length === 0) return '';
    
    let prompt = `\n\n---\n\n**FACTS YOU ALREADY KNOW (DON'T ASK ABOUT THESE AGAIN):**\n\n`;
    facts.forEach(fact => {
      prompt += `- ${fact}\n`;
    });
    
    prompt += `\n**CRITICAL MEMORY RULES:**\n`;
    prompt += `- Do not ask as if you missed information already provided\n`;
    prompt += `- Reference known facts naturally when skeptical or pushing back\n`;
    prompt += `- Be skeptical OF what they said, not ignorant that they said it\n`;
    prompt += `- If they repeat themselves, call it out\n\n`;
    
    return prompt;
  }
}

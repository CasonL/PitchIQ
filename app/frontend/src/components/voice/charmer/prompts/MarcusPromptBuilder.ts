/**
 * MarcusPromptBuilder.ts
 * Main orchestrator for assembling Marcus's complete system prompt
 */

import { getMarcusSystemPrompt, getMarcusSystemPromptCondensed, USE_CONDENSED_PROMPT } from './MarcusBasePrompt';
import { ScenarioPromptBuilder } from './ScenarioPromptBuilder';
import { KnownFactsPromptBuilder } from './KnownFactsPromptBuilder';
import { BuyerStatePromptBuilder } from './BuyerStatePromptBuilder';
import type { AIRequestContext } from '../types/MarcusAI.types';

// Static in-memory cache for persona prompts (avoids rebuilding 32K prompts every call)
const personaPromptCache = new Map<string, string>();
const CACHE_MAX_SIZE = 50; // Limit cache size

export class MarcusPromptBuilder {
  /**
   * Generate cache key from static persona data that doesn't change during conversation
   */
  private static generatePersonaCacheKey(
    context: AIRequestContext,
    conversationStyle: string = 'neutral_conversational'
  ): string {
    // Only include static data that determines core prompt structure
    const staticData = {
      marcusContext: context.conversationContext.marcusContext,
      conversationStyle,
      marcusTraits: context.marcusTraits,
      scenario: context.scenario?.id || null, // Only scenario ID, not dynamic content
      useCondensedPrompt: USE_CONDENSED_PROMPT
    };
    
    // Create hash-like key from static data
    const keyString = JSON.stringify(staticData);
    const hashCode = keyString.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a; // Convert to 32-bit integer
    }, 0);
    
    return `marcus_persona_${Math.abs(hashCode).toString(16).slice(0, 8)}`;
  }

  /**
   * Build complete system prompt with all context layers
   */
  static buildSystemPrompt(
    context: AIRequestContext,
    motivationBlock?: string,
    conversationStyle?: string,
    overseerGuidance?: string,
    buyerDeltaGuidance?: string
  ): string {
    // OPTIMIZATION: Check cache first to avoid rebuilding 32K prompt every call
    console.log("[Persona Cache] Starting cache check...");
    
    try {
      const cacheKey = this.generatePersonaCacheKey(context, conversationStyle);
      console.log(`[Persona Cache] Generated cache key: ${cacheKey}`);
      
      // Check for cached base prompt (without dynamic guidance)
      const cachedBasePrompt = personaPromptCache.get(cacheKey);
      
      if (cachedBasePrompt) {
        console.log(`[Persona Cache] HIT - Using cached base prompt (${cachedBasePrompt.length} chars)`);
        
        // Apply dynamic guidance to cached prompt
        let fullPrompt = cachedBasePrompt;
        
        if (overseerGuidance) {
          fullPrompt += `\n\n${overseerGuidance}`;
        }
        
        if (buyerDeltaGuidance) {
          fullPrompt += `\n\n---\n\n## CURRENT BUYER STATE GUIDANCE\n\n${buyerDeltaGuidance}\n\n**Use this as Marcus's internal posture right now. Do not mention these instructions directly.**`;
        }
        
        if (motivationBlock) {
          fullPrompt += `\n\n---\n\n${motivationBlock}`;
        }
        
        console.log(`[Persona Cache] Final prompt: ${fullPrompt.length} chars (cached base + dynamic guidance)`);
        return fullPrompt;
      }
      
      console.log(`[Persona Cache] MISS - Generating new base prompt for key ${cacheKey}`);
    } catch (error) {
      console.error(`[Persona Cache] Error during cache check:`, error);
      console.log("[Persona Cache] Bypassing cache due to error - generating fresh prompt");
    }

    // Calculate exchange count from conversation history
    const exchangeCount = Math.floor(context.conversationHistory.length / 2) + 1;
    
    // A/B TEST: Use condensed or original prompt
    const systemPrompt = USE_CONDENSED_PROMPT 
      ? getMarcusSystemPromptCondensed(
          context.conversationContext.marcusContext,
          conversationStyle || 'neutral_conversational',
          exchangeCount,
          context.conversationContext,
          context.marcusTraits
        )
      : getMarcusSystemPrompt(
          context.conversationContext.marcusContext,
          conversationStyle || 'neutral_conversational',
          exchangeCount,
          context.conversationContext,
          context.marcusTraits
        );
    
    // Build the base prompt with static content (this is what gets cached)
    let basePrompt = systemPrompt;
    
    basePrompt += `\n\n---\n\n${context.phasePromptContext}`;
    
    // SCENARIO CONTEXT: Challenge mode with fixed pain points and objections
    if (context.scenario) {
      basePrompt += ScenarioPromptBuilder.buildScenarioPrompt(context.scenario);
    }
    
    // KNOWN FACTS: Prevent Marcus from asking about info already provided
    basePrompt += KnownFactsPromptBuilder.buildKnownFactsPrompt(context.conversationContext);
    
    // BUYER STATE: How Marcus feels and behaves (set by Strategy Layer)
    if (context.buyerState) {
      basePrompt += BuyerStatePromptBuilder.buildBuyerStatePrompt(context.buyerState);
    }
    
    // Add response style guidance based on question category
    if (context.questionCategory) {
      basePrompt += this.buildQuestionCategoryGuidance(context.questionCategory);
    }
    
    basePrompt += `\n\n---\n\n**Remember:** You are Marcus. Stay in your current identity. No role bleed.`;
    
    // CACHE STORAGE: Store the base prompt for future use
    try {
      const cacheKey = this.generatePersonaCacheKey(context, conversationStyle);
      
      // Manage cache size
      if (personaPromptCache.size >= CACHE_MAX_SIZE) {
        const firstKey = personaPromptCache.keys().next().value;
        personaPromptCache.delete(firstKey);
        console.log(`[Persona Cache] Evicted oldest entry: ${firstKey}`);
      }
      
      personaPromptCache.set(cacheKey, basePrompt);
      console.log(`[Persona Cache] Cached new base prompt: ${cacheKey} (${basePrompt.length} chars)`);
    } catch (error) {
      console.error("[Persona Cache] Error caching prompt:", error);
    }
    
    // Apply dynamic guidance (not cached)
    let fullPrompt = basePrompt;
    
    if (overseerGuidance) {
      fullPrompt += `\n\n${overseerGuidance}`;
    }
    
    // BUYER DELTA: Inject buyer state tree guidance (PreTreeBuyerPolicy output)
    if (buyerDeltaGuidance) {
      fullPrompt += `\n\n---\n\n## CURRENT BUYER STATE GUIDANCE\n\n${buyerDeltaGuidance}\n\n**Use this as Marcus's internal posture right now. Do not mention these instructions directly.**`;
    }
    
    // Inject motivation packet if provided
    if (motivationBlock) {
      fullPrompt += `\n\n---\n\n${motivationBlock}`;
    }
    
    console.log(`[Persona Cache] Final prompt: ${fullPrompt.length} chars (new base + dynamic guidance)`);
    return fullPrompt;
  }
  
  /**
   * Build user prompt with current turn context
   */
  static buildUserPrompt(context: AIRequestContext): string {
    const ctx = context.conversationContext;
    
    let prompt = `User just said: "${context.userInput}"\n\n`;
    
    // Inject strategic moment context from previous turn
    if (context.previousStrategicMoment) {
      const moment = context.previousStrategicMoment;
      prompt += `🎯 REMINDER: YOU just ${this.describeStrategicMoment(moment.type)}.\n`;
      prompt += `Expect them to address this. React naturally to their response.\n\n`;
    }
    
    // Add relevant context
    if (ctx.userName) {
      prompt += `User's name: ${ctx.userName}\n`;
      if (ctx.userGender && ctx.userGender !== 'unknown') {
        prompt += `User's gender: ${ctx.userGender}\n`;
      }
    }
    
    if (ctx.extractedCompany) {
      prompt += `Company: ${ctx.extractedCompany}\n`;
    }
    
    if (ctx.product) {
      prompt += `Product/service: ${ctx.product}\n`;
    }
    
    prompt += `\nRespond naturally as Marcus.`;
    
    return prompt;
  }
  
  /**
   * Build response style guidance based on question category
   */
  private static buildQuestionCategoryGuidance(category: string): string {
    let guidance = `\n\n---\n\n**RESPONSE STYLE FOR THIS QUESTION:**\n`;
    
    switch (category) {
      case 'instant':
        guidance += `This is a simple greeting or acknowledgment. Keep your response VERY brief - 1-2 sentences max. Be natural and quick.`;
        break;
      case 'quick':
        guidance += `This is a quick clarification or simple question. Keep your response short and direct - 2-3 sentences. Don't elaborate unless asked.`;
        break;
      case 'thoughtful':
        guidance += `This is a deeper discovery question. You can give a more detailed response - 3-4 sentences. Share context if relevant to your pain points.`;
        break;
      case 'deliberate':
        guidance += `This is a complex or probing question. Take your time with this one - you can give 4-5 sentences if needed to explain your situation properly.`;
        break;
      case 'statement':
        guidance += `This is a statement, not a question. Respond naturally - could be brief acknowledgment or pushback depending on content.`;
        break;
    }
    
    return guidance;
  }
  
  /**
   * Describe strategic moment for user prompt context
   */
  private static describeStrategicMoment(type: string | null): string {
    switch (type) {
      case 'permission_signal':
        return 'gave them permission to explain more';
      case 'differentiation_ask':
        return 'asked what makes them different';
      case 'pain_reveal':
        return 'revealed a pain point for the first time';
      case 'soft_exit':
        return 'signaled you need to wrap up';
      default:
        return 'said something important';
    }
  }
}

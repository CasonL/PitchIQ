/**
 * MarcusPromptBuilder.ts
 * Main orchestrator for assembling Marcus's complete system prompt
 */

import { getMarcusSystemPrompt, getMarcusSystemPromptCondensed, USE_CONDENSED_PROMPT } from './MarcusBasePrompt';
import { ScenarioPromptBuilder } from './ScenarioPromptBuilder';
import { KnownFactsPromptBuilder } from './KnownFactsPromptBuilder';
import { BuyerStatePromptBuilder } from './BuyerStatePromptBuilder';
import type { AIRequestContext } from '../types/MarcusAI.types';

export class MarcusPromptBuilder {
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
    
    let fullPrompt = systemPrompt;
    
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
    
    fullPrompt += `\n\n---\n\n${context.phasePromptContext}`;
    
    // SCENARIO CONTEXT: Challenge mode with fixed pain points and objections
    if (context.scenario) {
      fullPrompt += ScenarioPromptBuilder.buildScenarioPrompt(context.scenario);
    }
    
    // KNOWN FACTS: Prevent Marcus from asking about info already provided
    fullPrompt += KnownFactsPromptBuilder.buildKnownFactsPrompt(context.conversationContext);
    
    // BUYER STATE: How Marcus feels and behaves (set by Strategy Layer)
    if (context.buyerState) {
      fullPrompt += BuyerStatePromptBuilder.buildBuyerStatePrompt(context.buyerState);
    }
    
    // Add response style guidance based on question category
    if (context.questionCategory) {
      fullPrompt += this.buildQuestionCategoryGuidance(context.questionCategory);
    }
    
    fullPrompt += `\n\n---\n\n**Remember:** You are Marcus. Stay in your current identity. No role bleed.`;
    
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

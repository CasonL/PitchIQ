/**
 * CharmerAIService.ts
 * Core AI service orchestrator for Marcus's responses
 * Refactored: Delegates to extracted modules for prompt building, streaming, and parsing
 */

import { CharmerPhase, ConversationContext } from './CharmerPhaseManager';
import { FirstUtterancePatternDetector, type PatternMatch } from './FirstUtterancePatternDetector';
import { MarcusContextNarrator } from './MarcusContextNarrator';
import { type BuyerState } from './StrategyLayer';
import { API_ENDPOINTS } from '@/config/apiEndpoints';

// Extracted modules
import { MarcusPromptBuilder } from './prompts/MarcusPromptBuilder';
import { MarcusResponseParser } from './parsing/MarcusResponseParser';
import { LLMStreamClient } from './streaming/LLMStreamClient';
import { EmotionResolver } from './utils/EmotionResolver';
import type { 
  AIRequestContext, 
  AIResponse, 
  SentenceStreamCallback,
  TacticalFollowUp
} from './types/MarcusAI.types';
import { MARCUS_AI_MODELS } from './types/MarcusAI.types';

// Export legacy types for backwards compatibility
export type { AIRequestContext, AIResponse, SentenceStreamCallback, TacticalFollowUp } from './types/MarcusAI.types';
export { MARCUS_AI_MODELS } from './types/MarcusAI.types';

export class CharmerAIService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private streamClient: LLMStreamClient;
  
  constructor(apiKey?: string, model?: keyof typeof MARCUS_AI_MODELS) {
    this.apiKey = apiKey || '';
    this.baseUrl = API_ENDPOINTS.OPENAI_CHAT;
    this.model = MARCUS_AI_MODELS[model || 'gpt-4o-mini'];
    this.streamClient = new LLMStreamClient(this.model);
  }
  
  /**
   * Pre-warm OpenAI's cache by sending a dummy request with the system prompt
   * Call this during phone ringing to eliminate Turn 2 delay
   */
  async prewarmCache(
    context: AIRequestContext,
    conversationStyle?: string
  ): Promise<void> {
    console.log('🔥 Pre-warming OpenAI cache during phone ring...');
    
    try {
      // Build the SAME system prompt that will be used in the actual call
      const systemPrompt = MarcusPromptBuilder.buildSystemPrompt(
        context,
        conversationStyle
      );
      
      // Send a minimal dummy request to cache the system prompt
      // OpenAI will cache the system prompt for ~5-10 minutes
      const dummyHistory = [];
      const dummyUserPrompt = 'Cache warm-up request';
      
      // Fire and forget - we don't care about the response
      this.streamClient.stream(
        systemPrompt,
        dummyHistory,
        dummyUserPrompt,
        undefined,
        1 // max_tokens: 1 to minimize cost and time
      ).catch(err => {
        console.log('⚠️ Cache warm-up failed (non-critical):', err);
      });
      
      console.log(`✅ Cache warm-up request sent (system prompt: ${systemPrompt.length} chars)`);
    } catch (error) {
      console.log('⚠️ Cache warm-up error (non-critical):', error);
    }
  }
  
  /**
   * Generate Marcus's response using selected AI model
   * OPTIMIZED: Dynamic content now goes in user prompt for OpenAI caching
   */
  async generateResponse(
    context: AIRequestContext,
    conversationStyle?: string,
    callBackstoryBlock?: string,
    buyerDeltaGuidance?: string,
    onFirstSentence?: SentenceStreamCallback
  ): Promise<AIResponse> {
    console.log(`🤖 Generating Marcus response for Phase ${context.phase} using ${this.model}`);
    
    try {
      // Build prompts using extracted modules
      // OPTIMIZED: System prompt is now static and cacheable by OpenAI
      const systemPrompt = MarcusPromptBuilder.buildSystemPrompt(
        context,
        conversationStyle
      );
      // Dynamic content goes in user prompt to enable caching
      const userPrompt = MarcusPromptBuilder.buildUserPrompt(
        context,
        buyerDeltaGuidance,
        callBackstoryBlock
      );
      
      console.log(`⏱️ System prompt: ${systemPrompt.length} chars, History: ${context.conversationHistory.length} msgs`);
      
      // Stream response
      const rawContent = await this.streamClient.stream(
        systemPrompt,
        context.conversationHistory,
        userPrompt,
        onFirstSentence,
        400 // max_tokens for actual responses (needs room for emotion + dialogue + complete META block)
      );
      
      // Parse response using extracted parser
      const parsed = MarcusResponseParser.parseResponse(rawContent, context);
      
      // Determine emotion (use LLM-specified or fallback)
      const emotion = parsed.emotion || EmotionResolver.determineEmotion(
        parsed.content,
        context.phase,
        context.conversationContext
      );
      
      console.log(`✅ Generated [${emotion}]: "${parsed.content.substring(0, 50)}..."`);
      
      return {
        content: parsed.content,
        emotion,
        shouldTransitionPhase: false,
        tacticalFollowUp: parsed.tacticalFollowUp,
        endCall: parsed.endCall,
        objection: parsed.objection,
        stateFeedback: parsed.stateFeedback,
        strategicMoment: parsed.stateFeedback.strategic_moment
      };
    } catch (error: any) {
      console.error('❌ Marcus AI generation failed:', error);
      return EmotionResolver.getFallbackResponse(context.phase);
    }
  }
  
  /**
   * Generate focused response for detected first utterance patterns
   */
  async generateFocusedResponse(
    context: AIRequestContext,
    motivationBlock?: string,
    conversationStyle?: string
  ): Promise<AIResponse> {
    console.log('⚡ Generating focused instant response');
    
    try {
      const systemPrompt = MarcusPromptBuilder.buildSystemPrompt(
        context,
        motivationBlock,
        conversationStyle
      );
      const userPrompt = MarcusPromptBuilder.buildUserPrompt(context);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...context.conversationHistory,
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 100
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      const emotion = EmotionResolver.determineEmotion(content, context.phase, context.conversationContext);
      
      console.log(`✅ Focused response [${emotion}]: "${content}"`);
      
      return {
        content,
        emotion,
        shouldTransitionPhase: false
      };
    } catch (error: any) {
      console.error('❌ Focused response failed:', error);
      return EmotionResolver.getFallbackResponse(context.phase);
    }
  }
}

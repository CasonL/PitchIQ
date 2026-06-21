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
  private _pregeneratedResponse: AIResponse | null = null;
  private _pregenerating: Promise<void> | null = null;
  
  constructor(apiKey?: string, model?: keyof typeof MARCUS_AI_MODELS) {
    this.apiKey = apiKey || '';
    this.baseUrl = API_ENDPOINTS.OPENAI_CHAT;
    this.model = MARCUS_AI_MODELS[model || 'gemini-flash'];
    this.streamClient = new LLMStreamClient(this.model);
  }

  /** Returns and clears any pre-generated response (for Turn 1 instant playback) */
  consumePregeneratedResponse(): AIResponse | null {
    const r = this._pregeneratedResponse;
    this._pregeneratedResponse = null;
    return r;
  }

  /** True while pre-generation is in flight */
  isPregenerating(): boolean {
    return this._pregenerating !== null;
  }

  /**
   * Pre-generate Turn 1 response during phone ring for instant playback on connect.
   * Replaces the broken max_tokens:1 cache warm approach.
   */
  async pregenerateFirstResponse(
    context: AIRequestContext,
    conversationStyle?: string,
    buyerDeltaGuidance?: string
  ): Promise<void> {
    console.log('🔥 Pre-generating Turn 1 response during phone ring...');
    this._pregeneratedResponse = null;

    this._pregenerating = (async () => {
      try {
        const systemPrompt = MarcusPromptBuilder.buildSystemPrompt(context, conversationStyle);
        const userPrompt = MarcusPromptBuilder.buildUserPrompt(context, buyerDeltaGuidance);

        console.log(`⏱️ [PreGen] System prompt: ${systemPrompt.length} chars`);

        const rawContent = await this.streamClient.stream(
          systemPrompt,
          context.conversationHistory,
          userPrompt,
          undefined,
          800
        );

        const parsed = MarcusResponseParser.parseResponse(rawContent, context);
        const emotion = parsed.emotion || EmotionResolver.determineEmotion(
          parsed.content, context.phase, context.conversationContext
        );

        this._pregeneratedResponse = {
          content: parsed.content,
          emotion,
          shouldTransitionPhase: false,
          tacticalFollowUp: parsed.tacticalFollowUp,
          endCall: parsed.endCall,
          objection: parsed.objection,
          stateFeedback: parsed.stateFeedback,
          strategicMoment: parsed.stateFeedback?.strategic_moment
        };

        console.log(`✅ [PreGen] Response ready: "${parsed.content.substring(0, 60)}..."`);
      } catch (err) {
        console.log('⚠️ [PreGen] Pre-generation failed (non-critical):', err);
        this._pregeneratedResponse = null;
      } finally {
        this._pregenerating = null;
      }
    })();

    return this._pregenerating;
  }

  /** @deprecated Use pregenerateFirstResponse instead */
  async prewarmCache(
    context: AIRequestContext,
    conversationStyle?: string
  ): Promise<void> {
    return this.pregenerateFirstResponse(context, conversationStyle);
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
        800 // max_tokens increased to allow complete thoughts + META blocks without truncation
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
          max_tokens: 400
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

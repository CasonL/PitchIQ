/**
 * MarcusPromptBuilder.ts
 * Main orchestrator for assembling Marcus's complete system prompt
 */

import { getMarcusSystemPrompt, getMarcusSystemPromptCondensed, USE_CONDENSED_PROMPT } from './MarcusBasePrompt';
import { getMarcusPatternPrompt, getMarcusMinimalPrompt } from './MarcusPatternPrompt';
import { ResponsePatternService } from './ResponsePatternService';
import { ActionCardRenderer, type MarcusActionCard } from './MarcusActionCard';
import { type ProductConversationPhysics } from './ProductConversationFitService';
import { ScenarioPromptBuilder } from './ScenarioPromptBuilder';
import { KnownFactsPromptBuilder } from './KnownFactsPromptBuilder';
import { BuyerStatePromptBuilder } from './BuyerStatePromptBuilder';
import type { ConversationContext } from '../CharmerPhaseManager';
import type { AIRequestContext } from '../CharmerAIService';

// DISABLED: Dangerous cache was caching dynamic turn content (KnownFacts, BuyerState, questionCategory)
// This caused Marcus to respond with stale state from previous turns - "Marcus just picked up" on turn 4
// const personaPromptCache = new Map<string, string>();
// const CACHE_MAX_SIZE = 50;

// A/B TEST: Pattern-matching vs philosophical prompts
export const USE_PATTERN_MATCHING = false; // TESTING: Fast pattern-matching for 1-2s response vs 4-5s philosophical

export class MarcusPromptBuilder {
  // REMOVED: generatePersonaCacheKey() - Cache was caching dynamic turn content!  
  // The "static" cache was actually caching:
  // - KnownFactsPrompt (changes as Marcus learns facts)
  // - BuyerStatePrompt (changes as buyer trust/resistance evolves)  
  // - questionCategory (changes based on user input)
  // - exchangeCount (increments every turn)
  // This caused "Turn 1 buyer state on Turn 4" bugs

  /**
   * Build complete system prompt with all context layers
   */
  static buildSystemPrompt(
    context: AIRequestContext,
    motivationBlock?: string,
    conversationStyle?: string,
    overseerGuidance?: string,
    buyerDeltaGuidance?: string,
    callBackstoryBlock?: string
  ): string {
    // NEW: Pattern-matching architecture for faster responses
    if (USE_PATTERN_MATCHING) {
      return this.buildPatternMatchingPrompt(
        context,
        motivationBlock,
        conversationStyle,
        overseerGuidance,
        buyerDeltaGuidance
      );
    }
    
    // CACHE DISABLED: Was caching dynamic content (KnownFacts, BuyerState, questionCategory) 
    // causing Marcus to use stale buyer state from previous turns
    const exchangeCount = Math.floor(context.conversationHistory.length / 2) + 1;
    console.log(`[No Cache] Building fresh philosophical prompt for turn ${exchangeCount}...`);
    
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
          context.marcusTraits,
          context.conversationContext.callVariationSeed
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
    
    // Log prompt size for monitoring
    console.log(`[Philosophical Prompt] Base prompt size: ${basePrompt.length} chars`);
    
    // CACHE DISABLED: Prevents stale buyer state, known facts, and question categories from being reused
    console.log(`[No Cache] Fresh base prompt generated: ${basePrompt.length} chars`);
    
    // Apply dynamic guidance (not cached)
    let fullPrompt = basePrompt;
    
    if (overseerGuidance) {
      fullPrompt += `\n\n${overseerGuidance}`;
    }
    
    // BUYER DELTA: Inject buyer state tree guidance (PreTreeBuyerPolicy output)
    if (buyerDeltaGuidance) {
      fullPrompt += `\n\n---\n\n## CURRENT BUYER STATE GUIDANCE\n\n${buyerDeltaGuidance}\n\n**Use this as Marcus's internal posture right now. Do not mention these instructions directly.**`;
    }
    
    // Inject call backstory if provided (from CallDetailsCreator)
    if (callBackstoryBlock) {
      fullPrompt += `\n\n${callBackstoryBlock}`;
    }
    
    // Inject motivation packet if provided
    if (motivationBlock) {
      fullPrompt += `\n\n---\n\n${motivationBlock}`;
    }
    
    console.log(`[Persona Cache] Final prompt: ${fullPrompt.length} chars (new base + dynamic guidance)`);
    return fullPrompt;
  }

  /**
   * NEW: Fast pattern-matching prompt builder
   * Replaces 31K philosophical guidance with compact pattern lookup
   */
  private static buildPatternMatchingPrompt(
    context: AIRequestContext,
    motivationBlock?: string,
    conversationStyle?: string,
    overseerGuidance?: string,
    buyerDeltaGuidance?: string
  ): string {
    console.log("[Pattern Matching] Building fast pattern-based prompt...");
    
    // Extract context for pattern generation
    const exchangeCount = Math.floor(context.conversationHistory.length / 2) + 1;
    const userName = context.conversationContext.userName;
    
    // Note: trustLevel and resistance are now handled by ResponsePatternService
    
    // Generate product-realistic action card based on buyer state + user input
    const responseGuidance = ResponsePatternService.generateActionCard(
      context.buyerState || this.getDefaultBuyerState(),
      context.conversationContext,
      context.userInput || "[conversation_start]",
      exchangeCount
    );
    
    console.log(`[Action Card] ${responseGuidance.productPhysics.archetype}: ${responseGuidance.actionCard.primaryAct} (${responseGuidance.actionCard.posture})`);
    
    // Log realism check results
    if (!responseGuidance.realismCheck.isRealistic) {
      console.log(`[Realism Guard] Fixed issues for ${responseGuidance.productPhysics.archetype}:`, responseGuidance.realismCheck.issues);
    }
    
    // Build compact action-card prompt with product context
    let patternPrompt = this.buildActionCardPrompt(
      responseGuidance.actionCard,
      responseGuidance.productPhysics,
      context.conversationContext.marcusContext,
      exchangeCount,
      context.conversationContext,
      context.marcusTraits
    );
    
    // ACTION CARD IS SINGLE SOURCE OF TRUTH in pattern mode
    // buyerDeltaGuidance is already incorporated into the actionCard generation
    // Adding both actionCard + buyerDeltaGuidance creates conflicting guidance
    
    // Only add overseer guidance if it's strategic (not operational buyer state)
    if (overseerGuidance && !overseerGuidance.toLowerCase().includes('buyer state')) {
      patternPrompt += `\n\n## STRATEGIC GUIDANCE:\n${overseerGuidance}`;
    }
    
    // Only add motivation if it's genuinely additional context
    if (motivationBlock && motivationBlock.length < 200) {
      patternPrompt += `\n\n## MOTIVATION:\n${motivationBlock}`;
    }
    
    console.log(`[Pattern Matching] Final prompt: ${patternPrompt.length} chars (target: <5K for fast processing)`);
    
    return patternPrompt;
  }
  
  /**
   * NEW: Build action-card driven prompt with product-category realism
   */
  private static buildActionCardPrompt(
    actionCard: MarcusActionCard,
    productPhysics: ProductConversationPhysics,
    marcusContext: 'B2B' | 'B2C',
    exchangeCount: number,
    conversationContext?: ConversationContext,
    marcusTraits?: any
  ): string {
    const userName = conversationContext?.userName;
    
    return `You are Marcus Stindle - real person, not AI. You run Stindle Consulting, have 14-year-old twins, don't sleep great.

## PRODUCT CONTEXT:
Seller is offering: ${productPhysics.archetype.replace(/_/g, ' ')}
Buyer evaluation criteria: ${productPhysics.buyerEvaluationCriteria.slice(0, 3).join(', ')}
Common concerns: ${productPhysics.commonObjections.slice(0, 2).join(', ')}

${ActionCardRenderer.toPromptInstructions(actionCard)}

## YOUR CURRENT REALITY:
${marcusTraits ? `- Current: ${marcusTraits.currentSolution} (${marcusTraits.satisfactionLevel}/10 satisfaction)
- Pain: ${marcusTraits.painLevel} ${marcusTraits.painPoints?.length > 0 ? `(hidden: ${marcusTraits.painPoints.join(', ')})` : ''}
- Budget: ${marcusTraits.budget}
- Urgency: ${marcusTraits.urgency} (${marcusTraits.decisionTimeframe})
- Concern: ${marcusTraits.primaryConcern}` : 'Standard consulting business situation'}

## SPEECH STYLE:
- Brief, natural responses (max ${actionCard.maxSentences} sentence${actionCard.maxSentences > 1 ? 's' : ''})
- "Yeah" / "Okay" / "Sure" / "Uh huh" 
- Grade 3 English: "use" not "utilize"
- Contractions: "I'm" not "I am"
- ${userName ? `Use "${userName}" occasionally` : 'Ask for their name if unknown'}

## CRITICAL EXECUTION RULES:
1. **Execute the action card** - perform the ${actionCard.primaryAct} naturally
2. **Stay in character** - you're Marcus, not a coach or helper
3. **Respect constraints** - follow reveal policy and sentence limits
4. **Be authentic** - use examples as tone guidance, not scripts
5. **Answer then act** - if they ask a question, answer briefly then execute action

## OUTPUT FORMAT:
[emotion] Your natural response
<META>{"followup":"text or null","end_call":false,"objections":[{"id":"type","severity":0-1,"satisfied":0-1}],"user_respect_level":0-1,"marcus_irritation_delta":-0.2 to 0.2,"purpose_clarity_delta":-0.2 to 0.2,"extracted_name":null,"extracted_company":null,"strategic_moment":null,"question_handling":{"user_asked_question":bool,"marcus_answered":bool,"deflection_reason":null}}</META>

**ALWAYS CLOSE THE META TAG.**

You are responding to exchange ${exchangeCount}. ${userName ? `You know this is ${userName}.` : 'Find out who this is.'} Execute your action card naturally.`;
  }
  
  /**
   * Default buyer state for pattern generation when none provided
   */
  private static getDefaultBuyerState() {
    return {
      resistanceLevel: 6,
      trustLevel: 0.3,
      clarity: 3,
      relevance: 2,
      urgency: 2,
      openness: 4,
      patience: 5,
      emotionalPosture: {
        canRevealBudget: false,
        canRevealPainPoints: false,
        canRevealDecisionProcess: false,
        canShowInterest: false,
        canAdmitConcerns: false,
        canRevealTimeline: false
      },
      disclosureGates: {
        canRevealBudget: false,
        canRevealPainPoints: false,
        canRevealDecisionProcess: false,
        canShowInterest: false,
        canAdmitConcerns: false,
        canRevealTimeline: false
      },
      objectionSatisfaction: {},
      shouldEscalateObjection: false,
      shouldForceExit: false,
      shouldShowConfusion: false,
      shouldShowDegradation: false,
      canDodgeQuestions: false,
      consecutiveInterestDrops: 0
    };
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

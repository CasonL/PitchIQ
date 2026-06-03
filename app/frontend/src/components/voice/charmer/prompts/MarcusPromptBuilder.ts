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
import { ResponseVariationSystem, VariationContext } from './ResponseVariationSystem';
import type { ConversationContext } from '../CharmerPhaseManager';
import type { AIRequestContext } from '../CharmerAIService';

// SMART CACHE: Separate static base personality (cacheable) from dynamic turn data (non-cacheable)
// Static: Marcus personality, speech patterns, general instructions
// Dynamic: KnownFacts, BuyerState, questionCategory, conversation history
const staticBasePromptCache = new Map<string, string>();
const CACHE_MAX_SIZE = 10; // One per scenario type

// A/B TEST: Pattern-matching vs philosophical prompts
export const USE_PATTERN_MATCHING = false; // TESTING: Fast pattern-matching for 1-2s response vs 4-5s philosophical

export class MarcusPromptBuilder {
  /**
   * Generate cache key for STATIC base personality only
   * Only includes: marcusContext, conversationStyle, scenario type
   * Excludes: exchangeCount, KnownFacts, BuyerState, questionCategory
   */
  private static generateStaticCacheKey(
    marcusContext: 'B2B' | 'B2C',
    conversationStyle: string,
    scenarioId?: string
  ): string {
    return `${marcusContext}_${conversationStyle}_${scenarioId || 'default'}`;
  }

  /**
   * Build complete system prompt with all context layers
   * OPTIMIZED FOR OPENAI CACHING: Static content first, dynamic content in conversation history
   */
  static buildSystemPrompt(
    context: AIRequestContext,
    conversationStyle?: string
  ): string {
    const exchangeCount = Math.floor(context.conversationHistory.length / 2) + 1;
    
    // CRITICAL: Use minimal prompt for Turn 1 to avoid 22s first-token latency
    // Turn 1 only needs: basic personality + scenario context
    // Full tree/buyer state/call details come in Turn 2+
    if (exchangeCount === 1) {
      return this.buildMinimalFirstTurnPrompt(context, conversationStyle);
    }
    
    // NEW: Pattern-matching architecture for faster responses
    if (USE_PATTERN_MATCHING) {
      return this.buildPatternMatchingPrompt(
        context,
        conversationStyle
      );
    }
    
    // SMART CACHE: Check if we have static base cached
    const cacheKey = this.generateStaticCacheKey(
      context.conversationContext.marcusContext,
      conversationStyle || 'neutral_conversational',
      context.scenario?.id
    );
    
    let staticBasePrompt = staticBasePromptCache.get(cacheKey);
    
    if (!staticBasePrompt) {
      console.log(`[Cache MISS] Building new static base prompt for ${cacheKey}...`);
      
      // A/B TEST: Use condensed or original prompt
      const systemPrompt = USE_CONDENSED_PROMPT 
        ? getMarcusSystemPromptCondensed(
            context.conversationContext.marcusContext,
            conversationStyle || 'neutral_conversational',
            1, // Use turn 1 for static prompt (no turn-specific guidance)
            context.conversationContext,
            context.marcusTraits
          )
        : getMarcusSystemPrompt(
            context.conversationContext.marcusContext,
            conversationStyle || 'neutral_conversational',
            1, // Use turn 1 for static prompt
            context.conversationContext,
            context.marcusTraits,
            context.conversationContext.callVariationSeed
          );
      
      // Build STATIC base prompt (personality + scenario only)
      staticBasePrompt = systemPrompt;
      staticBasePrompt += `\n\n---\n\n${context.phasePromptContext}`;
      
      // SCENARIO CONTEXT: Challenge mode with fixed pain points and objections
      if (context.scenario) {
        staticBasePrompt += ScenarioPromptBuilder.buildScenarioPrompt(context.scenario);
      }
      
      staticBasePrompt += `\n\n---\n\n**Remember:** You are Marcus. Stay in your current identity. No role bleed.`;
      
      // Cache the static base
      staticBasePromptCache.set(cacheKey, staticBasePrompt);
      console.log(`[Cache STORED] Static base: ${staticBasePrompt.length} chars`);
      
      // Limit cache size
      if (staticBasePromptCache.size > CACHE_MAX_SIZE) {
        const firstKey = staticBasePromptCache.keys().next().value;
        staticBasePromptCache.delete(firstKey);
      }
    } else {
      console.log(`[Cache HIT] Using cached static base (${staticBasePrompt.length} chars)`);
    }
    
    // OPTIMIZED: Return ONLY static content for OpenAI caching
    // Dynamic content (buyer state, known facts, etc.) will be injected via conversation history
    console.log(`[OpenAI Cache] Turn ${exchangeCount}: Static prompt ready (${staticBasePrompt.length} chars - CACHEABLE)`);
    return staticBasePrompt;
  }

  /**
   * NEW: Fast pattern-matching prompt builder
   * Replaces 31K philosophical guidance with compact pattern lookup
   */
  private static buildPatternMatchingPrompt(
    context: AIRequestContext,
    conversationStyle?: string
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
   * Build user prompt with dynamic context injected here instead of system prompt
   * This allows OpenAI to cache the static system prompt
   */
  static buildUserPrompt(
    context: AIRequestContext,
    buyerDeltaGuidance?: string,
    callBackstoryBlock?: string
  ): string {
    const ctx = context.conversationContext;
    let userPrompt = '';
    
    // DYNAMIC CONTEXT: Inject buyer state and call details here (not in system prompt)
    // This keeps the system prompt static and cacheable by OpenAI
    
    // Known facts about the conversation
    const knownFacts = KnownFactsPromptBuilder.buildKnownFactsPrompt(ctx);
    if (knownFacts) {
      userPrompt += `${knownFacts}\n\n`;
    }
    
    // Buyer state (how Marcus feels right now)
    if (context.buyerState) {
      const buyerStatePrompt = BuyerStatePromptBuilder.buildBuyerStatePrompt(context.buyerState);
      if (buyerStatePrompt) {
        userPrompt += `${buyerStatePrompt}\n\n`;
      }
    }
    
    // Buyer state tree guidance (from TreeDeltaManager)
    if (buyerDeltaGuidance) {
      userPrompt += `## CURRENT BUYER STATE GUIDANCE\n\n${buyerDeltaGuidance}\n\n**Use this as Marcus's internal posture right now. Do not mention these instructions directly.**\n\n`;
    }
    
    // Call backstory (how Marcus knows about this product)
    if (callBackstoryBlock) {
      userPrompt += `${callBackstoryBlock}\n\n`;
    }
    
    // Question category guidance
    if (context.questionCategory) {
      const categoryGuidance = this.buildQuestionCategoryGuidance(context.questionCategory);
      if (categoryGuidance) {
        userPrompt += `${categoryGuidance}\n\n`;
      }
    }
    
    // Inject strategic moment context from previous turn
    if (context.previousStrategicMoment) {
      const moment = context.previousStrategicMoment;
      userPrompt += `🎯 REMINDER: YOU just ${this.describeStrategicMoment(moment.type)}.\n`;
      userPrompt += `Expect them to address this. React naturally to their response.\n\n`;
    }
    
    // Add relevant context
    if (ctx.userName) {
      userPrompt += `User's name: ${ctx.userName}\n`;
      if (ctx.userGender && ctx.userGender !== 'unknown') {
        userPrompt += `User's gender: ${ctx.userGender}\n`;
      }
    }
    
    if (ctx.extractedCompany) {
      userPrompt += `Company: ${ctx.extractedCompany}\n`;
    }
    
    if (ctx.product) {
      userPrompt += `Product/service: ${ctx.product}\n`;
    }
    
    // The actual user input
    userPrompt += `\nThe user just said: "${context.userInput}"\n\nRespond as Marcus.`;
    
    return userPrompt;
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

  /**
   * CRITICAL: Minimal first-turn prompt to avoid 22s latency
   * Turn 1 only needs: basic Marcus personality + scenario traits
   * NO tree, NO buyer state, NO call details, NO known facts
   * Full system comes in Turn 2+ after tree generates in parallel
   */
  private static buildMinimalFirstTurnPrompt(
    context: AIRequestContext,
    conversationStyle?: string
  ): string {
    const scenario = context.scenario;
    const marcusContext = context.conversationContext.marcusContext;
    const traits = context.marcusTraits;
    
    let prompt = `You are Marcus, a ${marcusContext === 'B2B' ? 'business decision-maker' : 'consumer'}.

**YOUR PERSONALITY:**
- Skeptical and guarded when strangers call
- You don't have time for sales pitches
- You ask "what is this about?" when unclear
- You're polite but direct

**CURRENT SITUATION:**
${scenario ? `- Role: ${scenario.marcusRole}
- Mood: ${scenario.marcusMood}
- Context: ${scenario.painPoint || 'No immediate pain'}` : '- You received an unexpected call'}

${traits ? `**BUYER TRAITS:**
- Satisfaction: ${traits.satisfactionLevel}/10
- Pain level: ${traits.painLevel}
- Openness: ${traits.openness}
- Budget: ${traits.budget}
- Primary concern: ${traits.primaryConcern}
` : ''}
**INSTRUCTIONS:**
1. Answer the phone naturally - you don't know who this is yet
2. Keep your first response SHORT (1-2 sentences max)
3. Be guarded and ask what this is about if unclear
4. Don't be rude, but don't be enthusiastic either
5. Respond in first person as Marcus

**RESPONSE VARIATION RULES:**
- NEVER use the same response pattern repeatedly
- If they mention email signup, vary between: remembering clearly, not remembering, went elsewhere, wasn't a fit
- Mix up your objections: budget, timing, authority, satisfaction with current solution
- Vary your energy: sometimes distracted, sometimes skeptical, sometimes time-pressured
- Don't be predictable - real humans have different moods and reactions

**CRITICAL CHARACTER BOUNDARY:**
You are Marcus, a real person. NEVER mention "response types", "variations", "instructions", or any meta-language about how to respond. Only speak as Marcus would naturally speak.

${this.getVariationExamples(context)}

6. Start your response with an emotion in brackets like [neutral] or [skeptical]

Respond naturally to the caller's opening.`;

    console.log(`[Minimal Turn 1] Prompt: ${prompt.length} chars (vs ~33k normal)`);
    return prompt;
  }

  /**
   * Get variation examples based on context
   */
  private static getVariationExamples(context: AIRequestContext): string {
    const variationContext: VariationContext = {
      turnNumber: 1,
      product: context.conversationContext.product,
      relationshipType: context.scenario?.relationshipHistory?.type,
      marcusTraits: context.marcusTraits ? {
        painLevel: context.marcusTraits.painLevel,
        urgency: context.marcusTraits.urgency,
        openness: context.marcusTraits.openness
      } : undefined,
      lastUserMessage: context.userInput,
      callVariationSeed: context.conversationContext.callVariationSeed || 50
    };

    // Check if this is an email signup scenario
    if (context.scenario?.relationshipHistory?.type === 'email_signup_curious') {
      const seed = variationContext.callVariationSeed;
      
      // Force different responses based on seed - give Marcus a specific backstory
      if (seed < 17) {
        return `
**YOUR BACKSTORY:** You already found another solution for this need.
Respond naturally like someone who already solved their problem:
- "Oh that. Yeah, we actually went with someone else already."
- "Right, we ended up going in a different direction on that."
- "Yeah, we already found a solution for that. Thanks though."`;
      } else if (seed < 34) {
        return `
**YOUR BACKSTORY:** You looked into their offering but it wasn't the right fit.
Respond naturally like someone who investigated but moved on:
- "I looked into it but didn't see how it would work for us."
- "Yeah, I checked it out. Didn't really see the fit to be honest."
- "Oh right. Yeah, it didn't seem like what we were looking for."`;
      } else if (seed < 51) {
        return `
**YOUR BACKSTORY:** You don't really remember signing up for anything.
Respond naturally like someone who's genuinely confused:
- "I don't remember signing up for anything..."
- "My email? I don't recall that. You sure you have the right person?"
- "Hmm, doesn't ring a bell. When was this?"`;
      } else if (seed < 68) {
        return `
**YOUR BACKSTORY:** You were just casually browsing, not seriously looking.
Respond naturally like someone who was just curious:
- "Oh, I was just browsing around. Not really looking for anything specific."
- "Yeah, I was just curious what was out there. No real need right now."
- "I was just doing some research. We're not actively looking."`;
      } else {
        return `
**YOUR BACKSTORY:** You vaguely remember putting your email in somewhere.
Respond naturally like someone with a fuzzy memory:
- "Oh right, I think I put my email in somewhere... what was that about again?"
- "Yeah, I remember filling out something on your site. What was that for exactly?"
- "Oh yeah, the form. I was looking at... remind me what you guys do?"`;
      }
    }

    // For cold calls, use seed-based variations
    const seed = variationContext.callVariationSeed;
    if (seed < 30) {
      return `
**YOUR CURRENT MOOD:** ${seed < 15 ? 'You\'re distracted and busy right now.' : 'You\'re skeptical about unknown callers.'}
Respond naturally based on your mood:
${seed < 15 ? 
`- "Hold on, sorry. Yeah?"
- "One sec— yeah, hello?"
- "Sorry, yeah. What's up?"` :
`- "Yeah? Who's this."
- "Who gave you this number?"
- "I don't recognize this. Who is this?"`}

Answer the phone like someone in this mood would.`;
    }

    return `
**YOUR CURRENT MOOD:** You're in a normal, neutral state.
Answer the phone naturally and professionally:
- "Hello, Marcus speaking?"
- "Yeah, hello?"
- "Marcus here."

Keep it brief and natural.`;
  }
}

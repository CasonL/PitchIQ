/**
 * ResponsePatternService.ts
 * Converts abstract buyer psychology into concrete response patterns for fast LLM processing
 * 
 * ARCHITECTURE:
 * - Background systems (Tree, Overseer) do heavy reasoning
 * - This service converts reasoning into pattern-matching instructions
 * - Marcus LLM gets compact lookup tables instead of 31K philosophical guidance
 */

import type { BuyerState } from '../../../strategy/StrategyTypes';
import type { ConversationContext } from '../CharmerPhaseManager';
import { MarcusActionCard, MarcusActionCardFactory, MarcusPosture, MarcusResponseAct, type RevealPolicy } from './MarcusActionCard';
import { ProductConversationFitService, type ProductConversationPhysics } from './ProductConversationFitService';

// Input analysis results
export interface SellerInputAnalysis {
  detectedIntents: string[];
  keyTriggers: string[];
  primaryCategory: 'metric_claim' | 'feature_dump' | 'business_question' | 'value_prop' | 'objection_response' | 'unclear';
  confidence: number;
  hasMultipleTriggers: boolean;
}

// Enhanced service output with product-category realism
export interface ResponseGuidance {
  actionCard: MarcusActionCard;
  productPhysics: ProductConversationPhysics;
  stateTransitionLikely: boolean;
  nextExpectedInputs: string[];
  realismCheck: {
    isRealistic: boolean;
    issues: string[];
    suggestions: string[];
  };
}

export class ResponsePatternService {
  
  /**
   * MAIN METHOD: Convert buyer psychology into product-realistic action card
   * Now includes product-category realism to avoid SaaS questions for chemicals
   */
  static generateActionCard(
    buyerState: BuyerState,
    conversationContext: ConversationContext, 
    userInput: string,
    turnNumber: number
  ): ResponseGuidance {
    
    // Step 1: Analyze product being sold for conversation realism
    // Note: conversationHistory is not on ConversationContext, using userInput and context clues
    const conversationHistory = [
      conversationContext.userPitchTranscript || userInput,
      conversationContext.product || '',
      conversationContext.memorablePhrase || ''
    ].filter(Boolean);
    
    const productPhysics = ProductConversationFitService.analyzeProduct(
      userInput,
      conversationHistory
    );
    
    console.log(`[Product Analysis] Detected: ${productPhysics.archetype}`);
    
    // Step 2: Analyze seller input to understand intent
    const inputAnalysis = this.analyzeSellerInput(userInput);
    
    // Step 3: Determine Marcus's current posture from buyer state
    const posture = this.determinePosture(buyerState);
    
    // Step 4: Build reveal policy based on trust and buyer state
    const revealPolicy = this.buildRevealPolicy(buyerState);
    
    // Step 5: Generate product-realistic action card
    const actionCard = this.createProductRealisticActionCard(
      inputAnalysis,
      posture,
      buyerState,
      revealPolicy,
      productPhysics,
      turnNumber
    );
    
    // Step 6: Validate response realism (guard against SaaS questions for chemicals)
    const realismCheck = ProductConversationFitService.validateResponseRealism(
      actionCard.voiceExamples,
      productPhysics
    );
    
    // Step 7: Apply fixes if unrealistic
    if (!realismCheck.isRealistic) {
      console.warn(`[Realism Guard] Issues detected:`, realismCheck.issues);
      this.applyRealismFixes(actionCard, productPhysics, realismCheck);
    }
    
    return {
      actionCard,
      productPhysics,
      stateTransitionLikely: this.willStateChange(inputAnalysis, buyerState),
      nextExpectedInputs: this.predictNextSellerMoves(inputAnalysis, actionCard),
      realismCheck
    };
  }
  
  /**
   * Analyze seller input to understand what they're trying to do
   * This is INPUT CLASSIFICATION, not strategy (buyer state owns strategy)
   */
  private static analyzeSellerInput(input: string): SellerInputAnalysis {
    const lowerInput = input.toLowerCase();
    const detectedIntents: string[] = [];
    const keyTriggers: string[] = [];
    
    // Detect metric/outcome claims
    if (/\d+%|\d+\s*percent|increase.*\d+|save.*\d+|boost.*\d+/i.test(input)) {
      detectedIntents.push('bold_metric_claim');
      keyTriggers.push(...input.match(/\d+%|increase|save|boost|improve/gi) || []);
    }
    
    // Detect feature dumping
    if (/(features|includes|platform|dashboard|analytics|integrations).*?(features|includes|platform)/i.test(input) ||
        input.split(/[,.;]/).length > 3) {
      detectedIntents.push('feature_dump');
      keyTriggers.push('feature_list', 'lengthy_explanation');
    }
    
    // Detect business questions
    if (/(your team|how many|what.*using|current.*system|business.*challenges)/i.test(input)) {
      detectedIntents.push('business_question');
      keyTriggers.push(...input.match(/team|many|using|current|challenges/gi) || []);
    }
    
    // Detect vague value props
    if (/(improve|better|optimize|streamline|efficient)(?!.*how|.*specific)/i.test(input)) {
      detectedIntents.push('vague_value_prop');
      keyTriggers.push('generic_benefits');
    }
    
    // Determine primary category
    let primaryCategory: SellerInputAnalysis['primaryCategory'] = 'unclear';
    if (detectedIntents.includes('bold_metric_claim')) primaryCategory = 'metric_claim';
    else if (detectedIntents.includes('feature_dump')) primaryCategory = 'feature_dump';
    else if (detectedIntents.includes('business_question')) primaryCategory = 'business_question';
    else if (detectedIntents.includes('vague_value_prop')) primaryCategory = 'value_prop';
    
    return {
      detectedIntents,
      keyTriggers,
      primaryCategory,
      confidence: detectedIntents.length > 0 ? 0.8 : 0.3,
      hasMultipleTriggers: detectedIntents.length > 1
    };
  }
  
  /**
   * Convert buyer state to Marcus posture (TRANSLATE state, don't decide it)
   */
  private static determinePosture(buyerState: BuyerState): MarcusPosture {
    const trustLevel = buyerState.trustLevel || 0.3;
    const resistance = buyerState.resistanceLevel || 6;
    const patience = buyerState.patience || 5;
    
    // Map buyer state to posture (this is TRANSLATION, not decision-making)
    if (resistance >= 8) return "dismissive_busy";
    if (resistance >= 6 && patience < 4) return "mildly_annoyed";
    if (trustLevel < 0.4) return "guarded_professional";
    if (trustLevel >= 0.7 && buyerState.clarity && buyerState.clarity < 5) return "confused_seeking_clarity";
    if (trustLevel >= 0.6) return "cautiously_curious";
    if (resistance >= 5) return "skeptical_listening";
    if (trustLevel >= 0.8) return "genuinely_interested";
    
    return "guarded_professional"; // Safe default
  }
  
  /**
   * Build reveal policy from buyer state disclosure gates
   */
  private static buildRevealPolicy(buyerState: BuyerState): RevealPolicy {
    const gates = buyerState.disclosureGates;
    
    return {
      pain: gates?.canRevealPainPoints || false,
      budget: gates?.canRevealBudget || false,
      authority: gates?.canRevealDecisionProcess || false,
      timeline: gates?.canRevealTimeline || false,
      satisfaction: buyerState.trustLevel > 0.6,
      team_details: buyerState.trustLevel > 0.5
    };
  }
  
  /**
   * Create product-realistic action card (ENHANCED CORE METHOD)
   */
  private static createProductRealisticActionCard(
    analysis: SellerInputAnalysis,
    posture: MarcusPosture,
    buyerState: BuyerState,
    revealPolicy: RevealPolicy,
    productPhysics: ProductConversationPhysics,
    turnNumber: number
  ): MarcusActionCard {
    // Create base action card using existing logic
    let baseActionCard: MarcusActionCard;
    
    switch (analysis.primaryCategory) {
      case 'metric_claim':
        baseActionCard = MarcusActionCardFactory.forBoldMetricClaim(
          posture,
          buyerState.trustLevel || 0.3,
          (buyerState as any).hasBeenBurnedBefore || false
        );
        break;
        
      case 'feature_dump':
        baseActionCard = MarcusActionCardFactory.forFeatureDump(
          posture,
          buyerState.patience || 5
        );
        break;
        
      case 'business_question':
        baseActionCard = MarcusActionCardFactory.forBusinessInquiry(
          analysis.keyTriggers.join(' '),
          buyerState.trustLevel || 0.3,
          revealPolicy
        );
        break;
        
      default:
        baseActionCard = this.createFallbackActionCard(posture, buyerState, analysis);
        break;
    }
    
    // Apply product-specific response mapping
    return this.applyProductSpecificMapping(baseActionCard, productPhysics);
  }
  
  /**
   * Fallback action card for unclear inputs
   */
  private static createFallbackActionCard(
    posture: MarcusPosture,
    buyerState: BuyerState, 
    analysis: SellerInputAnalysis
  ): MarcusActionCard {
    return {
      posture,
      emotionalState: "confused_but_patient",
      primaryAct: "ask_clarity",
      backupAct: "check_time_pressure",
      maxSentences: 1,
      revealPolicy: {
        pain: false,
        budget: false,
        authority: false,
        timeline: false,
        satisfaction: false,
        team_details: false
      },
      sellerContext: {
        detectedIntent: "unclear_or_complex",
        keyTriggers: analysis.keyTriggers,
        conflictHandling: "ask_for_clarity_first"
      },
      voiceExamples: [
        "I'm not following. What are you selling?",
        "Hold on, what's this about?",
        "You lost me. What do you want?"
      ],
      avoidPhrases: [
        "Let me make sure I understand",
        "That's a lot of information"
      ],
      nextStateTarget: "clarity_requested",
      stateTransitionTriggers: ["explains_clearly", "continues_being_vague"]
    };
  }
  
  /**
   * Predict if this response will change buyer state
   */
  private static willStateChange(analysis: SellerInputAnalysis, buyerState: BuyerState): boolean {
    // High-confidence inputs more likely to shift state
    if (analysis.confidence > 0.7 && analysis.primaryCategory !== 'unclear') {
      return true;
    }
    
    // Multiple triggers = complex input = possible state change
    return analysis.hasMultipleTriggers;
  }
  
  /**
   * Predict likely seller follow-ups
   */
  private static predictNextSellerMoves(
    analysis: SellerInputAnalysis,
    actionCard: MarcusActionCard
  ): string[] {
    const predictions: string[] = [];
    
    if (actionCard.primaryAct === 'challenge_proof') {
      predictions.push('provides_case_study', 'deflects_proof_request', 'gives_testimonial');
    }
    
    if (actionCard.primaryAct === 'ask_clarity') {
      predictions.push('explains_offering', 'continues_being_vague', 'asks_qualifying_question');
    }
    
    return predictions;
  }
  
  /**
   * Apply product-specific response mapping to base action card
   */
  private static applyProductSpecificMapping(
    baseActionCard: MarcusActionCard,
    productPhysics: ProductConversationPhysics
  ): MarcusActionCard {
    
    // Map the primary response act to product-specific language
    const responseMapping = ProductConversationFitService.mapResponseAct(
      baseActionCard.primaryAct,
      productPhysics,
      {}
    );
    
    // Use product-specific phrasing if available, otherwise keep base card examples
    const productSpecificExamples = responseMapping.naturalPhrasing.length > 0 
      ? responseMapping.naturalPhrasing 
      : baseActionCard.voiceExamples;
    
    // Enhance avoid phrases with product-specific ones
    const enhancedAvoidPhrases = [
      ...baseActionCard.avoidPhrases,
      ...responseMapping.avoidPhrasing
    ];
    
    return {
      ...baseActionCard,
      voiceExamples: productSpecificExamples,
      avoidPhrases: enhancedAvoidPhrases,
      sellerContext: {
        ...baseActionCard.sellerContext,
        detectedIntent: `${baseActionCard.sellerContext.detectedIntent}_for_${productPhysics.archetype}`,
        keyTriggers: [...baseActionCard.sellerContext.keyTriggers, ...responseMapping.contextualFactors]
      }
    };
  }
  
  /**
   * Apply fixes when realism guard detects issues
   */
  private static applyRealismFixes(
    actionCard: MarcusActionCard,
    productPhysics: ProductConversationPhysics,
    realismCheck: { issues: string[], suggestions: string[] }
  ): void {
    
    console.log(`[Realism Fix] Applying fixes for ${productPhysics.archetype}:`, realismCheck.suggestions);
    
    // Replace unrealistic examples with product-appropriate ones
    if (realismCheck.suggestions.length > 0) {
      actionCard.voiceExamples = realismCheck.suggestions.slice(0, 3); // Take first 3 suggestions
    }
    
    // Add product-specific natural questions as fallbacks
    if (productPhysics.naturalQuestions.length > 0) {
      actionCard.voiceExamples.push(...productPhysics.naturalQuestions.slice(0, 2));
    }
    
    // Remove duplicate examples
    actionCard.voiceExamples = [...new Set(actionCard.voiceExamples)];
  }
  
  // Legacy compatibility - will be removed once action card system is fully deployed
  static generatePatterns(
    buyerState: BuyerState,
    conversationContext: ConversationContext,
    turnNumber: number,
    trustLevel: number,
    currentResistance: number
  ) {
    // Temporary bridge to new system
    const guidance = this.generateActionCard(
      buyerState,
      conversationContext,
      "[legacy_mode_placeholder]",
      turnNumber
    );
    
    // Convert action card back to old format for compatibility
    return {
      patterns: [{
        trigger: "fallback",
        response: guidance.actionCard.voiceExamples[0] || "Okay.",
        priority: 5
      }],
      fallbackBehavior: `Current posture: ${guidance.actionCard.posture} (${guidance.productPhysics.archetype})`,
      currentPosture: guidance.actionCard.posture,
      nextObjective: guidance.actionCard.nextStateTarget || "continue_conversation",
      stateTransitions: []
    };
  }
}

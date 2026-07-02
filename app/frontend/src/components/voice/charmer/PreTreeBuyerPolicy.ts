import { AvailabilityPolicy, type AvailabilityState } from './AvailabilityPolicy';
import {
  determineMode,
  modeFactories,
  type PreTreeContext,
  type PreTreeGuidance,
  type PreTreeMode,
  type BuyerLadderStage
} from './preTreeModes';

export type { PreTreeContext, PreTreeGuidance, PreTreeMode, BuyerLadderStage };
export { determineMode } from './preTreeModes';

/**
 * PreTreeBuyerPolicy
 *
 * Thin dispatcher that selects the current buyer-ladder mode and delegates
 * guidance generation to the mode factories in ./preTreeModes. The full ladder
 * now runs from ORIENT through TIMING/COMMITMENT so the buyer can actually
 * reach "I understand what you are selling" instead of getting stuck at
 * "category understood, value unclear".
 */
export class PreTreeBuyerPolicy {
  /**
   * Generate buyer guidance for the current pre-tree mode with availability overlay.
   */
  static generateGuidance(
    context: PreTreeContext,
    availability: AvailabilityState = 'available'
  ): PreTreeGuidance {
    const mode = determineMode(context);

    console.log('[PreTreeBuyerPolicy] Mode selection:', {
      mode,
      signals: {
        hasCompany: !!context.detectedCompany,
        hasProductName: !!context.detectedProductName,
        hasCategory: !!context.detectedCategory,
        hasFeatures: context.detectedFeatures.length > 0,
        confidence: context.productConfidence.confidence
      },
      beliefs: {
        understandsProduct: context.beliefState?.understandsProduct,
        valueClarity: context.beliefState?.valueClarity,
        trustsRep: context.beliefState?.trustsRep,
        seesRelevance: context.beliefState?.seesRelevance,
        urgency: context.beliefState?.urgency
      },
      turnNumber: context.turnNumber,
      note: 'Using signal clarity, not turn count'
    });

    const factory = modeFactories[mode];
    const baseGuidance = factory(context);

    if (availability !== 'available') {
      return {
        mode: baseGuidance.mode,
        stage: baseGuidance.stage,
        internalPosture: baseGuidance.internalPosture,
        promptGuidance: AvailabilityPolicy.constrainBehaviorGuidance(
          baseGuidance.promptGuidance,
          availability
        ),
        voiceExamples: AvailabilityPolicy.constrainVoiceExamples(
          baseGuidance.voiceExamples,
          availability,
          mode
        ),
        allowedTopics: availability === 'hard_exit' ? [] : baseGuidance.allowedTopics,
        developerNotes: baseGuidance.developerNotes
      };
    }

    console.log('[PreTreeGuidance]', {
      mode: baseGuidance.mode,
      stage: baseGuidance.stage,
      promptGuidanceCount: baseGuidance.promptGuidance.length,
      voiceExampleCount: baseGuidance.voiceExamples.length,
      developerNotesExcluded: Boolean(baseGuidance.developerNotes?.length),
      availability
    });

    return baseGuidance;
  }

  /**
   * Map pre-tree mode to suggested tree initialization state subtypes.
   */
  static getTreeInitializationHint(mode: PreTreeMode): string[] {
    const hints: Record<PreTreeMode, string[]> = {
      NO_PRODUCT_SIGNAL: ['guarded_skeptical', 'busy_professional'],
      COMPANY_KNOWN_PRODUCT_UNCLEAR: ['politely_curious', 'busy_professional'],
      CLARITY_SEEKING: ['politely_curious', 'guarded_skeptical'],
      CATEGORY_UNDERSTOOD_VALUE_UNCLEAR: ['guarded_skeptical', 'losing_interest'],
      VALUE_UNDERSTOOD_PROOF_UNCLEAR: ['interested_cautious', 'guarded_skeptical'],
      PROOF_UNDERSTOOD_FIT_UNCLEAR: ['interested_cautious', 'losing_interest'],
      FIT_UNDERSTOOD_MECHANICS_UNCLEAR: ['interested_cautious', 'guarded_skeptical'],
      MECHANICS_UNDERSTOOD_ECONOMICS_UNCLEAR: ['interested_cautious', 'price_concern'],
      ECONOMICS_UNDERSTOOD_TIMING_UNCLEAR: ['interested_cautious', 'timing_concern'],
      TIMING_CLEAR_COMMITMENT_READY: ['buying_signal', 'interested_cautious'],
      CLAIM_UNDERSTOOD_PROOF_UNCLEAR: ['interested_cautious', 'guarded_skeptical'],
      DISQUALIFIED_BY_REP: ['politely_curious', 'guarded_skeptical']
    };

    return hints[mode] ?? ['guarded_skeptical'];
  }
}

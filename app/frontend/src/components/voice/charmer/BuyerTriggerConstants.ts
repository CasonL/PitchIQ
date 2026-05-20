/**
 * BuyerTriggerConstants.ts
 * Shared trigger IDs for buyer state tree transitions
 * 
 * These IDs are used by:
 * - BuyerStateTree: Define hard/soft triggers in state definitions
 * - CharmerController: Map rep quality signals to trigger IDs
 * - TreeDeltaManager: Reference triggers in guidance generation
 */

/**
 * Hard trigger IDs - actions that force immediate state transitions
 */
export const HARD_TRIGGERS = {
  // Positive rep behaviors
  ASKS_GOOD_DISCOVERY_QUESTION: 'rep_asks_good_discovery_question',
  ASKS_PERMISSION_TO_CONTINUE: 'rep_asks_permission_to_continue',
  PROVIDES_SOCIAL_PROOF: 'rep_provides_social_proof',
  BUILDS_RAPPORT: 'rep_builds_rapport',
  PROVIDES_CLEAR_VALUE_STATEMENT: 'rep_provides_clear_value_statement',
  RESPECTS_TIME: 'rep_respects_time',
  DEMONSTRATES_GENUINE_CURIOSITY: 'rep_demonstrates_genuine_curiosity',
  
  // Negative rep behaviors
  LAUNCHES_INTO_PITCH_IMMEDIATELY: 'rep_launches_into_pitch_immediately',
  PUSHES_TOO_HARD: 'rep_pushes_too_hard',
  MAKES_BOLD_CLAIM_WITHOUT_PROOF: 'rep_makes_bold_claim_without_proof',
  FAILS_TO_ESTABLISH_RELEVANCE: 'rep_fails_to_establish_relevance'
} as const;

/**
 * Soft trigger IDs - actions that boost state confidence but don't force transitions
 */
export const SOFT_TRIGGERS = {
  PERSONALIZES_OPENING: 'rep_personalizes_opening',
  SOUNDS_SCRIPTED: 'rep_sounds_scripted',
  IGNORES_CONTEXT: 'rep_ignores_context',
  ASKS_ABOUT_TIMING: 'rep_asks_about_timing',
  OFFERS_TO_RESCHEDULE: 'rep_offers_to_reschedule',
  DEMONSTRATES_PRODUCT_UNDERSTANDING: 'rep_demonstrates_product_understanding',
  SHARES_RELEVANT_EXAMPLE: 'rep_shares_relevant_example',
  SHARES_METRICS: 'rep_shares_metrics',
  USES_JARGON: 'rep_uses_jargon',
  TOO_GENERIC: 'rep_too_generic',
  ASKS_PERMISSION: 'rep_asks_permission',
  IGNORES_OBJECTION: 'rep_ignores_objection',
  SOUNDS_DESPERATE: 'rep_sounds_desperate'
} as const;

/**
 * Seller signal IDs - tracked signals used by PreTreeBuyerPolicy and controllers
 */
export const SELLER_SIGNALS = {
  BOLD_METRIC_CLAIM: 'seller_bold_metric_claim',
  MENTIONED_COMPETITOR: 'seller_mentioned_competitor',
  ASKED_ABOUT_CURRENT_TOOLS: 'seller_asked_about_current_tools',
  MENTIONED_AI: 'seller_mentioned_ai',
  ASKED_DISCOVERY_QUESTION: 'seller_asked_discovery_question',
  PITCHED_BEFORE_DISCOVERY: 'seller_pitched_before_discovery',
  
  // Claim evaluation signals
  EXPLAINED_MECHANISM: 'seller_explained_mechanism',
  PROVIDED_PROOF: 'seller_provided_proof',
  VAGUE_CLAIM: 'seller_vague_claim',
  DODGED_MECHANICS: 'seller_dodged_mechanics'
} as const;

/**
 * Type-safe trigger ID unions
 */
export type HardTriggerId = typeof HARD_TRIGGERS[keyof typeof HARD_TRIGGERS];
export type SoftTriggerId = typeof SOFT_TRIGGERS[keyof typeof SOFT_TRIGGERS];
export type SellerSignalId = typeof SELLER_SIGNALS[keyof typeof SELLER_SIGNALS];
export type TriggerId = HardTriggerId | SoftTriggerId;

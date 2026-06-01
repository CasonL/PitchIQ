/**
 * BuyerState.types.ts
 * 
 * Single source of truth for Marcus's buyer state.
 * Nested structure to keep it readable and organized.
 * 
 * Architecture:
 * - Emotional: How Marcus feels right now (trust, patience, defensiveness)
 * - Belief: What Marcus thinks about the problem and solution
 * - Economic: Budget reality and perception
 * - Conversation: Real-time call dynamics
 */

// ============================================================================
// EMOTIONAL STATE
// ============================================================================

/**
 * How Marcus feels right now.
 * These are real-time emotional dynamics that shift during the conversation.
 */
export interface EmotionalState {
  openness: number;        // 0-100: Willingness to engage
  patience: number;        // 0-100: Time left before exit
  defensiveness: number;   // 0-100: How guarded Marcus is
  trust: number;           // 0-100: Belief in rep's credibility
  curiosity: number;       // 0-100: Interest in learning more
}

// ============================================================================
// BELIEF STATE
// ============================================================================

/**
 * What Marcus currently believes about the problem and solution.
 * These may be incomplete or wrong - the rep's job is to develop understanding.
 */
export interface BeliefState {
  perceivedProblemSeverity: number;  // 0-100: How bad does Marcus think the problem is
  perceivedSolutionFit: number;      // 0-100: Does this solve MY specific problem
  perceivedUrgency: number;          // 0-100: How soon does it need to be fixed
  trustInClaims: number;             // 0-100: Do I believe the value claims
  perceivedRisk: number;             // 0-100: What could go wrong
  switchingFriction: number;         // 0-100: How annoying would it be to change
  confidenceInNeed: number;          // 0-100: How sure is Marcus that he needs a solution
}

// ============================================================================
// ECONOMIC STATE
// ============================================================================

/**
 * Budget reality and Marcus's economic perception.
 * Concrete numbers, not vague "low/medium/high" labels.
 */
export interface EconomicState {
  // Business reality (scenario constants)
  currentSpendMonthly?: number;      // What Marcus spends now on current solution
  comfortableBudgetMonthly?: number; // What Marcus can spend without approval
  stretchBudgetMonthly?: number;     // Max Marcus could justify if value is clear
  approvalNeededAbove?: number;      // Dollar amount requiring team/boss approval
  actualProblemCostMonthly?: number; // True cost of the problem (Marcus may not know this)
  
  // Economic perception (dynamic)
  perceivedCurrentWasteMonthly?: number;       // What Marcus thinks he's losing now
  claimedPotentialSavingsMonthly?: number;     // What rep claimed (base value, never mutated)
  perceivedPotentialSavingsMonthly?: number;   // What Marcus believes (derived from claimed * trust * relevance)
  perceivedCostMonthly?: number;               // What Marcus thinks this will cost
  budgetPressure: number;                      // 0-100: How tight is budget right now
  willingnessToStretchBudget: number;          // 0-100: How flexible can Marcus be
  valueClarity: number;                        // 0-100: Does Marcus understand what he's getting
  paybackToleranceMonths?: number;             // How long Marcus will wait for ROI
}

// ============================================================================
// CONVERSATION STATE
// ============================================================================

/**
 * Real-time conversation dynamics.
 * Controls whether Marcus keeps talking, objects, or exits.
 */
export interface ConversationState {
  callFatigue: number;           // 0-100: How tired of this call is Marcus
  clarity: number;               // 0-100: Does Marcus understand what's being discussed
  turnCount: number;             // Number of turns in the conversation
  dominantBlocker?: ExitDriver;  // What's holding Marcus back most
  responseMode?: BuyerResponseMode; // How Marcus should respond
  
  // Warm-lead psychology (research-backed buyer behavior)
  autonomyDefense: number;       // 0-100: How much Marcus feels pushed/cornered (reactance theory)
  statusQuoShieldActive: boolean; // Is Marcus protecting current solution? (status quo bias)
  cognitiveLoad: number;         // 0-100: Information overload (cognitive load theory)
  relevanceConfidence: number;   // 0-100: Does rep understand Marcus's world? (source credibility)
  riskPerception: number;        // 0-100: How risky does change feel? (loss aversion)
}

// ============================================================================
// DECISION PROCESS STATE
// ============================================================================

/**
 * Authority and buying process state.
 * B2B buying without this is like building a car without steering.
 */
export interface DecisionProcessState {
  decisionAuthority: number;       // 0-100: Can Marcus make this decision alone
  influenceLevel: number;          // 0-100: How much influence does Marcus have
  knowsDecisionProcess: number;    // 0-100: Does Marcus understand his own buying process
  accessToEconomicBuyer: number;   // 0-100: Can Marcus reach the person with budget authority
}

// ============================================================================
// BUYER STATE (SINGLE SOURCE OF TRUTH)
// ============================================================================

/**
 * The complete buyer state.
 * This is the single source of truth for Marcus's decision-making.
 */
export interface BuyerState {
  emotional: EmotionalState;
  belief: BeliefState;
  economic: EconomicState;
  conversation: ConversationState;
  process: DecisionProcessState;
  
  // Legacy fields (keep for backward compatibility during migration)
  // TODO: Remove these once all code uses nested structure
  emotionalPosture?: EmotionalPosture;
  resistanceLevel?: number;
  disclosureGates?: DisclosureGates;
  objectionSatisfaction?: ObjectionSatisfaction;
  activeObjection?: string;
  shouldForceExit?: boolean;
  exitReason?: string;
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

export type EmotionalPosture = 
  | 'defensive' 
  | 'curious' 
  | 'skeptical' 
  | 'engaged' 
  | 'rushed'
  | 'guarded'
  | 'open'
  | 'testing'
  | 'impatient';

export type BuyerResponseMode =
  | 'open'
  | 'guarded'
  | 'skeptical'
  | 'curious'
  | 'objecting'
  | 'ending_call'
  | 'next_step_ready';

export type ExitDriver =
  | 'legitimacy_failure'    // Marcus doesn't believe rep has valid reason to call
  | 'relevance_failure'     // Product doesn't apply to Marcus's situation
  | 'economic_failure'      // Price/value equation doesn't work
  | 'timing_failure'        // Problem may be real, but not now
  | 'authority_failure'     // Marcus can't move the deal forward
  | 'conversation_fatigue'; // Rep has exhausted the buyer

export interface DisclosureGates {
  canRevealBudget: boolean;
  canRevealTimeline: boolean;
  canRevealPainPoints: boolean;
  canRevealDecisionProcess: boolean;
  canShowInterest: boolean;
  canAdmitConcerns: boolean;
}

export interface ObjectionSatisfaction {
  [key: string]: number; // 0.0 = unaddressed, 1.0 = satisfied
}

// ============================================================================
// STATE SNAPSHOT (FOR TRACING)
// ============================================================================

/**
 * Snapshot of buyer state at a specific turn.
 * Used for feedback generation and debugging.
 */
export interface BuyerStateSnapshot {
  turnId: string;
  emotional: EmotionalState;
  belief: BeliefState;
  economic: Partial<EconomicState>; // Partial because some fields are private
  conversation: ConversationState;
  timestamp: number;
}

/**
 * Trace of state changes for feedback generation.
 */
export interface BuyerStateTrace {
  turnId: string;
  repUtterance: string;
  buyerUtterance?: string;
  detectedBehaviors: string[]; // RepBehavior types
  stateBefore: BuyerStateSnapshot;
  stateAfter: BuyerStateSnapshot;
  dominantChange: string;
  explanation: string;
  evidence: {
    repQuote: string;
    buyerQuote?: string;
    confidence: 'low' | 'medium' | 'high';
  };
}

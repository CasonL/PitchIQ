/**
 * MarcusDecisionBrain.types.ts
 * 
 * Marcus's Decision Brain - A weighted buyer decision system with concrete economic anchors.
 * 
 * Philosophy:
 * - Marcus is a buyer with numbers, beliefs, uncertainty, and limited patience
 * - NOT a spreadsheet with vocal cords or a fake CFO calculator
 * - Decisions emerge from weighted factors, not deterministic formulas
 * - Reps discover the numbers through conversation, they're not handed them
 * 
 * Architecture:
 * - Layer 1: BusinessReality - Scenario facts (team size, current spend, actual problem cost)
 * - Layer 2: BuyerBeliefs - What Marcus currently thinks (may be incomplete or wrong)
 * - Layer 3: EconomicPerception - Budget and ROI perception
 * - Layer 4: ConversationState - Engagement, patience, fatigue
 */

// ============================================================================
// LAYER 1: BUSINESS REALITY
// ============================================================================

/**
 * Objective facts about Marcus's business situation.
 * These are scenario constants that don't change during the call.
 */
export interface BusinessReality {
  // Company context
  companySize?: number;
  teamSize?: number;
  industry?: string;
  
  // Current solution
  currentSolution?: string;
  currentSpendMonthly?: number;
  currentSatisfactionScore?: number; // 0-100 (how happy with current solution)
  contractLockedUntil?: string; // ISO date string
  
  // Budget constraints
  comfortableBudgetMonthly?: number; // What Marcus can spend without approval
  stretchBudgetMonthly?: number; // Max Marcus could justify if value is clear
  approvalNeededAbove?: number; // Dollar amount requiring team/boss approval
  
  // Problem reality
  knownProblem?: string; // The problem Marcus is aware of
  actualProblemCostMonthly?: number; // True cost (Marcus may not know this)
  problemFrequency?: 'rare' | 'occasional' | 'frequent' | 'constant';
  
  // Decision context
  decisionAuthority?: number; // 0-100 (100 = sole decision maker)
  politicalComplexity?: number; // 0-100 (how hard to justify internally)
}

// ============================================================================
// LAYER 2: BUYER BELIEFS
// ============================================================================

/**
 * What Marcus currently believes about the problem, solution, and situation.
 * These are dynamic and change based on the rep's performance.
 * 
 * CRITICAL: These may be incomplete or wrong. The rep's job is to develop
 * Marcus's understanding, not just pitch into the hidden truth.
 */
export interface BuyerBeliefs {
  // Problem perception
  perceivedProblemSeverity: number; // 0-100 (how bad does Marcus think the problem is)
  perceivedUrgency: number; // 0-100 (how soon does it need to be fixed)
  confidenceInNeed: number; // 0-100 (how sure is Marcus that he needs a solution)
  
  // Solution perception
  perceivedSolutionFit: number; // 0-100 (does this solve MY specific problem)
  perceivedRisk: number; // 0-100 (what could go wrong)
  switchingFriction: number; // 0-100 (how annoying would it be to change)
  
  // Trust
  trustInRep: number; // 0-100 (is this person credible and helpful)
  trustInProductClaims: number; // 0-100 (do I believe the value claims)
  confidenceInVendor: number; // 0-100 (is this company legitimate)
}

// ============================================================================
// LAYER 3: ECONOMIC PERCEPTION
// ============================================================================

/**
 * Marcus's perception of the economic equation.
 * This is where budget and ROI live, but filtered through trust and relevance.
 */
export interface EconomicPerception {
  // Current state perception
  perceivedCurrentWasteMonthly?: number; // What Marcus thinks he's losing now
  confidenceInWasteEstimate?: number; // 0-100 (how sure is he)
  
  // Solution economics
  perceivedPotentialSavingsMonthly?: number; // What Marcus thinks this could save
  perceivedCostMonthly?: number; // What Marcus thinks this will cost
  perceivedSetupCost?: number; // One-time cost perception
  
  // Budget psychology
  budgetPressure: number; // 0-100 (how tight is budget right now)
  willingnessToStretchBudget: number; // 0-100 (how flexible can Marcus be)
  paybackToleranceMonths?: number; // How long Marcus will wait for ROI
  
  // Value clarity
  valueClarity: number; // 0-100 (does Marcus understand what he's getting)
}

// ============================================================================
// LAYER 4: CONVERSATION STATE
// ============================================================================

/**
 * Real-time conversation dynamics.
 * Controls whether Marcus keeps talking, objects, or exits.
 */
export interface ConversationState {
  engagement: number; // 0-100 (how interested is Marcus right now)
  patience: number; // 0-100 (how much time does Marcus have left)
  defensiveness: number; // 0-100 (how guarded is Marcus)
  curiosity: number; // 0-100 (does Marcus want to learn more)
  clarity: number; // 0-100 (does Marcus understand what's being discussed)
  callFatigue: number; // 0-100 (how tired of this call is Marcus)
}

// ============================================================================
// DECISION BRAIN
// ============================================================================

/**
 * The complete Marcus Decision Brain.
 * Combines all four layers to make realistic buyer decisions.
 */
export interface MarcusDecisionBrain {
  businessReality: BusinessReality;
  buyerBeliefs: BuyerBeliefs;
  economicPerception: EconomicPerception;
  conversationState: ConversationState;
}

// ============================================================================
// EXIT LOGIC
// ============================================================================

/**
 * Six macro exit drivers (not 30 micro reasons).
 * Each exit has a dominant blocker that shapes the objection.
 */
export type ExitDriver = 
  | 'legitimacy_failure'    // Marcus doesn't believe rep has valid reason to call
  | 'relevance_failure'     // Product doesn't apply to Marcus's situation
  | 'economic_failure'      // Price/value equation doesn't work
  | 'timing_failure'        // Problem may be real, but not now
  | 'authority_failure'     // Marcus can't move the deal forward
  | 'conversation_fatigue'; // Rep has exhausted the buyer

export interface ExitDecision {
  shouldExit: boolean;
  driver?: ExitDriver;
  dominantBlocker?: string; // e.g., "budgetPressure", "lowTrustInClaims"
  secondaryBlocker?: string;
  exitMessage?: string; // What Marcus says when exiting
}

// ============================================================================
// STATE UPDATES
// ============================================================================

/**
 * Rep behaviors that trigger state changes.
 * These are detected by the system and update the decision brain.
 */
export type RepBehavior =
  | 'asks_trigger_question'        // Good discovery question
  | 'makes_unearned_roi_claim'     // Claims value before establishing trust
  | 'connects_to_specific_problem' // Shows understanding of Marcus's world
  | 'pitches_prematurely'          // Pitches before relevance established
  | 'asks_generic_question'        // Lazy discovery
  | 'shows_specific_understanding' // References Marcus's actual situation
  | 'makes_hyperbolic_claim'       // "300% ROI guaranteed"
  | 'contradicts_self'             // Says X, then says Y
  | 'criticizes_current_solution'  // Insults what Marcus uses now
  | 'overtalks'                    // Talks too long without asking
  | 'asks_about_current_spend'     // Discovers economic anchor
  | 'asks_about_problem_cost'      // Helps Marcus quantify the problem
  | 'validates_concern'            // Acknowledges Marcus's objection
  | 'pushes_after_rejection'       // Won't take no for an answer
  | 'provides_specific_proof'      // Concrete evidence, not claims
  | 'asks_permission'              // Respects Marcus's time
  | 'summarizes_understanding';    // Shows he's listening

/**
 * State change deltas triggered by rep behaviors.
 */
export interface StateChange {
  // Which beliefs/states to update
  trustInRep?: number;
  trustInProductClaims?: number;
  perceivedSolutionFit?: number;
  perceivedProblemSeverity?: number;
  perceivedUrgency?: number;
  perceivedRisk?: number;
  clarity?: number;
  defensiveness?: number;
  curiosity?: number;
  engagement?: number;
  patience?: number;
  callFatigue?: number;
  valueClarity?: number;
  willingnessToStretchBudget?: number;
}

// ============================================================================
// DECISION OUTPUTS
// ============================================================================

/**
 * Marcus's buying momentum calculation.
 * NOT a deterministic formula - guides the LLM, doesn't handcuff it.
 */
export interface BuyingMomentum {
  // Positive forces
  problemSeverity: number;
  relevanceFit: number;
  trust: number;
  urgency: number;
  valueClarity: number;
  
  // Negative forces
  perceivedRisk: number;
  switchingFriction: number;
  budgetPressure: number;
  decisionComplexity: number;
  callFatigue: number;
  
  // Net momentum
  netMomentum: number; // Sum of positive - sum of negative
  
  // Interpretation
  likelyResponseMode: 'open' | 'curious' | 'guarded_objection' | 'hard_objection' | 'exit';
  dominantBlocker?: string; // What's holding Marcus back most
  dominantDriver?: string; // What's pushing Marcus forward most
}

/**
 * Buying decision output.
 * Tells the system how Marcus should respond.
 */
export interface BuyingDecision {
  decision: 'interested' | 'curious' | 'skeptical' | 'not_interested' | 'exit';
  confidence: number; // 0-1 (how sure is Marcus about this decision)
  
  // Economic context
  willingnessToPay?: number; // Dollar amount Marcus would consider
  needsApproval?: boolean;
  
  // Next step
  nextStep?: 'book_meeting' | 'send_info' | 'need_approval' | 'not_now' | 'not_fit';
  
  // Objection context
  primaryObjection?: string;
  objectionStrength?: number; // 0-100
  
  // Exit context
  exitDecision?: ExitDecision;
}

// ============================================================================
// FEEDBACK INTEGRATION
// ============================================================================

/**
 * State-based feedback for coaching.
 * Explains: rep behavior -> buyer state change -> better action
 */
export interface StateBasedFeedback {
  repBehavior: RepBehavior;
  stateChange: StateChange;
  impact: 'positive' | 'negative' | 'neutral';
  explanation: string;
  betterAction?: string;
  tryThisInstead?: string;
}

/**
 * Concrete economic anchor for feedback.
 * Helps reps understand what they missed discovering.
 */
export interface EconomicAnchorFeedback {
  anchor: 'current_spend' | 'problem_cost' | 'budget_range' | 'approval_threshold';
  value?: number;
  discovered: boolean;
  impact: string; // How discovering this would have changed the call
  howToDiscover: string; // Example question to ask
}

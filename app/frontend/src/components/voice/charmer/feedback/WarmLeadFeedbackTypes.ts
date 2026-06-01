/**
 * Type definitions for warm-lead sales feedback system
 * 
 * PitchIQ focuses exclusively on warm leads - prospects who have shown
 * prior interest (website visit, content download, etc.) but have not
 * necessarily given explicit permission to be contacted.
 */

// ============================================================================
// WARM SIGNAL TYPES
// ============================================================================

/**
 * Types of warm signals that indicate prior interest
 */
export type WarmSignal =
  | 'website_visit'        // Just browsed the site
  | 'pricing_page'         // Looked at pricing
  | 'content_download'     // Downloaded whitepaper/guide
  | 'email_click'          // Clicked link in email
  | 'form_fill'            // Actually submitted contact info
  | 'demo_request'         // Explicitly asked for demo
  | 'unknown';             // Signal exists but unclear

// ============================================================================
// THREE-AXIS BUYER STATE MODEL
// ============================================================================

/**
 * AXIS 1: What defense mechanism is the buyer using?
 * 
 * Buyers use different shields to protect their time, autonomy, and
 * current processes. These are not permanent states - they can shift
 * based on how the rep handles the conversation.
 */
export type BuyerDefense =
  | 'none'                      // No active defense
  | 'recognition_gap'           // "I don't remember looking at your site"
  | 'autonomy_defense'          // "I'm not looking for a pitch"
  | 'status_quo_shield'         // "We're happy with current"
  | 'relevance_test'            // "What exactly do you do?"
  | 'risk_scan'                 // "We don't have time for this"
  | 'timing_defense'            // "Not a priority right now"
  | 'authority_deflection';     // "I'd have to talk to my team"

/**
 * AXIS 2: How engaged is the buyer in the conversation?
 * 
 * Engagement level indicates how open the buyer is to exploring
 * their situation. This is separate from defense mechanisms -
 * a buyer can be curious but still using a status quo shield.
 */
export type BuyerEngagement =
  | 'closed'           // Actively trying to end call
  | 'guarded'          // Protective, minimal responses
  | 'curious'          // Asking questions, but not committed
  | 'exploring'        // Actively discussing their situation
  | 'problem_aware'    // Acknowledging gaps/pain
  | 'next_step_open';  // Ready to commit to next action

/**
 * AXIS 3: What phase of the call are we in?
 * 
 * Call phases represent the natural progression of a warm-lead
 * conversation. Not all calls go through all phases.
 */
export type CallPhase =
  | 'opening'              // First 30 seconds
  | 'permission'           // Getting right to continue
  | 'trigger_discovery'    // Finding what prompted interest
  | 'problem_discovery'    // Uncovering operational pain
  | 'impact_development'   // Exploring consequences
  | 'solution_mapping'     // Connecting product to problem
  | 'next_step';           // Scheduling/committing

// ============================================================================
// REP BEHAVIOR DETECTION
// ============================================================================

/**
 * Common mistakes reps make on warm-lead calls
 */
export enum RepMistake {
  // Warm-lead specific mistakes
  IGNORED_WARM_SIGNAL = 'ignored_warm_signal',
  OVERCLAIMED_INTENT = 'overclaimed_intent',
  FAKE_PERMISSION = 'fake_permission',
  SKIPPED_TRIGGER_DISCOVERY = 'skipped_trigger_discovery',
  
  // Universal mistakes
  PREMATURE_PITCH = 'premature_pitch',
  UNEARNED_ROI_CLAIM = 'unearned_roi_claim',
  FOUGHT_STATUS_QUO = 'fought_status_quo',
  ASKED_TOO_LARGE_COMMITMENT = 'asked_too_large_commitment',
  GENERIC_DISCOVERY = 'generic_discovery',
  FEATURE_DUMPED = 'feature_dumped',
  IGNORED_BUYING_SIGNAL = 'ignored_buying_signal',
  FILLED_SILENCE = 'filled_silence',
  TALKED_PAST_OBJECTION = 'talked_past_objection'
}

/**
 * Positive behaviors reps demonstrate on warm-lead calls
 */
export enum RepStrength {
  USED_WARM_SIGNAL_CAREFULLY = 'used_warm_signal_carefully',
  PRESERVED_BUYER_CONTROL = 'preserved_buyer_control',
  ANSWERED_DIRECTLY = 'answered_directly',
  VALIDATED_STATUS_QUO = 'validated_status_quo',
  ASKED_TRIGGER_QUESTION = 'asked_trigger_question',
  ASKED_CONCRETE_DISCOVERY = 'asked_concrete_discovery',
  EXPLORED_CONSEQUENCES = 'explored_consequences',
  SUMMARIZED_BUYER_WORLD = 'summarized_buyer_world',
  MATCHED_NEXT_STEP_TO_PROBLEM = 'matched_next_step_to_problem',
  GAVE_EASY_OUT = 'gave_easy_out',
  USED_SILENCE_WELL = 'used_silence_well'
}

// ============================================================================
// MOMENT CONTEXT
// ============================================================================

/**
 * Evidence supporting an interpretation of buyer behavior
 */
export interface InterpretationEvidence {
  repQuote: string;
  buyerQuote: string;
  supportingContext: string;
  interpretationConfidence: 'low' | 'medium' | 'high';
  reasoning: string;
}

/**
 * Complete context for a single moment in the call
 */
export interface MomentContext {
  // Basic info
  timestamp: string;
  turnNumber: number;
  
  // What was said
  repUtterance: string;
  buyerUtterance: string;
  
  // Warm-lead context
  warmSignal: WarmSignal;
  daysAgoSignal?: number; // How many days ago was the signal?
  
  // Three-axis buyer state
  callPhase: CallPhase;
  buyerDefense: BuyerDefense;
  buyerEngagementBefore: BuyerEngagement;
  buyerEngagementAfter: BuyerEngagement;
  
  // Marcus's internal state changes
  metricDeltas: {
    trust: number;
    curiosity: number;
    urgency: number;
    clarity: number;
  };
  
  // What the rep did
  detectedMistakes: RepMistake[];
  detectedStrengths: RepStrength[];
  
  // Evidence for interpretations
  evidence: InterpretationEvidence;
}

// ============================================================================
// FEEDBACK OUTPUT
// ============================================================================

/**
 * Quiz question for reinforcing learning
 */
export interface QuizQuestion {
  question: string;
  options: Array<{
    text: string;
    correct: boolean;
    psychologyPrinciple: string; // Why this option is plausible
  }>;
  explanation: string;
  howResponse: string;
}

/**
 * Feedback for a single moment
 */
export interface MomentFeedback {
  momentId: string;
  timestamp: string;
  momentType: 'mistake' | 'turning' | 'win';
  
  // Practical feedback structure
  whatHappened: string;
  whyItDidntWork: string;
  whatToDoInstead: string;
  tryThisLine: string;
  whyItWorks: string;
  
  // Quiz reinforcement
  quiz: QuizQuestion;
  
  // Evidence
  evidence: InterpretationEvidence;
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Warm-lead specific scoring rubric
 */
export interface WarmLeadScore {
  // Warm-lead specific dimensions (0-100 each)
  warmSignalUse: number;         // Did rep acknowledge the signal appropriately?
  intentCalibration: number;     // Did rep calibrate buyer intent correctly?
  triggerDiscovery: number;      // Did rep find what prompted the visit?
  
  // Universal dimensions (0-100 each)
  autonomyPreservation: number;  // Did rep keep buyer in control?
  relevanceEstablishment: number; // Did rep connect to buyer's world?
  statusQuoHandling: number;     // Did rep handle "we're happy"?
  discoveryQuality: number;      // Did rep uncover real pain?
  impactDevelopment: number;     // Did rep create urgency ethically?
  productTiming: number;         // Did rep pitch at right time?
  nextStepFit: number;           // Did rep ask for right commitment?
  
  // Meta
  overallScore: number;
  confidence: 'low' | 'medium' | 'high';
  
  // Feedback
  strengths: string[];
  improvements: string[];
  criticalMoments: MomentFeedback[];
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * Input for generating feedback on a call
 */
export interface FeedbackGenerationInput {
  // Call metadata
  sessionId: string;
  warmSignal: WarmSignal;
  daysAgoSignal?: number;
  
  // Conversation history
  transcript: Array<{
    speaker: 'user' | 'marcus';
    text: string;
    timestamp: string;
  }>;
  
  // Marcus's state throughout the call
  marcusStateHistory: Array<{
    turnNumber: number;
    confidence: number;
    curiosity: number;
    urgency: number;
    clarity: number;
    currentNode: string;
  }>;
  
  // Detected moments (from existing system)
  criticalMoments: Array<{
    turnNumber: number;
    type: 'mistake' | 'objection';
    description: string;
  }>;
  
  successfulMoments: Array<{
    turnNumber: number;
    type: 'breakthrough' | 'win';
    description: string;
  }>;
}

/**
 * Complete feedback output for a call
 */
export interface FeedbackGenerationOutput {
  sessionId: string;
  score: WarmLeadScore;
  moments: MomentFeedback[];
  overallSummary: string;
  keyTakeaways: string[];
}

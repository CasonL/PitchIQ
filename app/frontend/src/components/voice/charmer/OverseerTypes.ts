/**
 * OverseerTypes.ts
 * Type definitions for the Marcus Overseer system
 * 
 * The Overseer is a SCENARIO ARCHITECT that runs in parallel to:
 * - Generate dynamic pain points Marcus can reveal
 * - Create red herrings to test discovery skills
 * - Inject hidden motivations beyond "I'm busy"
 * - Architect learning challenges, not just hard scenarios
 */

export type PainPointType = 
  | 'real'        // Actual pain user should uncover
  | 'red_herring' // False pain to test if user validates
  | 'hidden';     // Deep motivation user must earn

export interface DynamicPainPoint {
  type: PainPointType;
  category: 'technical' | 'business' | 'personal' | 'financial' | 'strategic';
  surfaceStatement: string;     // What Marcus can mention if asked
  deeperTruth: string;          // What he reveals if user digs deeper
  triggerCondition: string;     // When Marcus should mention this (e.g., "if user asks about growth")
  learningTest: string;         // What skill this tests (e.g., "open-ended questioning")
}

export interface HiddenMotivation {
  motivation: string;           // Marcus's real reason for resistance
  signalsToReveal: string[];    // Subtle hints Marcus can drop
  howToUncover: string;         // What user needs to do to discover this
  rewardForDiscovery: string;   // What Marcus shares if user finds it
}

export interface LearningChallenge {
  challengeType: 'discovery_trap' | 'pitch_too_early' | 'assumption_trap' | 'listening_test';
  description: string;          // What makes this challenging
  correctResponse: string;      // What user should do
  poorResponse: string;         // What bad sales technique looks like
  consequence: string;          // How Marcus reacts to poor technique
}

export interface DynamicMarcusContext {
  detectedProduct: string;           // What user is selling (detected from conversation)
  productCategory: string;           // e.g., "physical product", "service", "software"
  
  // Marcus's generated characteristics
  demographics: string[];            // ["6'2", 280lbs", "married", "40s", "runs small consulting firm"]
  lifestyle: string[];               // ["busy professional", "health conscious", "travels for work"]
  
  // Relationship to product
  directNeed: 'none' | 'low' | 'medium' | 'high';
  directNeedReason: string;          // Why Marcus does/doesn't need this directly
  
  // Indirect pathways (discovery rewards)
  indirectPathways: Array<{
    relationship: string;            // "sister", "wife", "colleague", "friend"
    context: string;                 // "Lives 25 min from recycling center"
    painPoint: string;               // "Complains about the drive every week"
    opportunityValue: string;        // "Could save her 2 hours/week"
  }>;
  
  // Current solution (creates competitive tension)
  currentSolution: string;           // What Marcus uses now
  satisfactionLevel: 'very satisfied' | 'satisfied' | 'neutral' | 'frustrated';
  
  // Emotional hooks
  emotionalHooks: string[];          // ["self-conscious about size", "guilty about not helping sister"]
}

export interface ScenarioArchitecture {
  // Dynamic Marcus context (generated from detected product)
  marcusContext: DynamicMarcusContext;
  
  // Dynamic content for Marcus
  painPoints: DynamicPainPoint[];
  hiddenMotivation: HiddenMotivation;
  
  // Learning design
  currentChallenge: LearningChallenge | null;
  nextChallenge: string;        // What's coming next in the learning arc
  
  // Context for Marcus
  whatUserJustDid: string;      // "User asked leading question"
  whatMarcusShouldDo: string;   // "Give short defensive answer"
  whyThisTeaches: string;       // "Tests if they can recover from bad discovery"
  
  // Conversation pathways (learning design)
  assumptionTraps: string[];    // What lazy sellers will assume
  discoveryRewards: string[];   // What good discovery uncovers
  
  // Metadata
  timestamp: number;
  confidence: number;           // 0-1
}

export interface OverseerAnalysisRequest {
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentResistance: number;
  currentPhase: string;
  exchangeCount: number;
  lastUserMessage: string;
  scenario?: any; // Marcus scenario context
}

export interface OverseerCache {
  lastArchitecture: ScenarioArchitecture | null;
  pendingAnalysis: Promise<ScenarioArchitecture> | null;
  lastUpdateTimestamp: number;
  establishedPainPoints: DynamicPainPoint[]; // Persist across turns
  revealedMotivations: string[];              // Track what user has discovered
}

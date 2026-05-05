/**
 * CallData.ts
 * TypeScript interfaces to replace 'any' types in Marcus demo
 * 
 * These types improve type safety without requiring CharmerController refactor
 */

import { CallMetrics } from '../CallMetrics';
import { MarcusScenario } from '../MarcusScenarios';

/**
 * Data passed to onCallComplete callback
 */
export interface CallCompletionData {
  duration: number;
  conversationExchanges?: ConversationExchange[];
  objectionData?: ObjectionData;
  buyerState?: BuyerStateSnapshot;
  finalResistance?: number;
  metrics?: CallMetrics;
  preAnalyzedMoments?: CriticalMoment[];
  hybridFeedbackAnalyses?: HybridFeedbackAnalysis[];
}

/**
 * Single conversation exchange
 */
export interface ConversationExchange {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  timestampMs?: number;  // Milliseconds from call start (for precise audio sync)
  emotion?: string;
  turnNumber?: number;   // Which turn this exchange belongs to
}

/**
 * Objection tracking data
 */
export interface ObjectionData {
  currentObjection?: string;
  objectionHistory: string[];
  resolutionCount: number;
  escalationCount: number;
}

/**
 * Snapshot of buyer psychological state
 */
export interface BuyerStateSnapshot {
  openness: number;        // 0-10
  resistance: number;      // 0-10
  patience: number;        // 0-10
  trust: number;          // 0-10
  interest: number;       // 0-10
  painAcknowledged: boolean;
  budgetDisclosed: boolean;
  timelineShared: boolean;
}

/**
 * Critical moment detected during call
 */
export interface CriticalMoment {
  type: 'opening_issue' | 'positive_shift' | 'negative_shift' | 'missed_opportunity' | 'unresolved_concern';
  turnNumber: number;
  userMessage: string;
  marcusResponse: string;
  issue?: string;
  impact?: string;
  suggestion?: string;
  timestamp?: number;
  // Audio playback sync (for call recordings)
  audioTimestamp?: number;   // Seconds into recording where this moment starts
  audioDuration?: number;     // Duration of this exchange in seconds
}

/**
 * Hybrid feedback combining rules + LLM analysis
 */
export interface HybridFeedbackAnalysis {
  turnNumber: number;
  userMessage: string;
  marcusResponse?: string;
  detectedSignals: DetectedSignal[];
  candidateMechanics: MechanicCandidate[];
  llmReasoning: string;
  finalIssue?: string;
  finalImpact?: string;
  finalSuggestion?: string;
  confidence: number;
}

/**
 * Signal detected by rule-based system
 */
export interface DetectedSignal {
  type: string;
  text: string;
  confidence: number;
  position?: 'opening' | 'middle' | 'closing';
}

/**
 * Mechanic candidate from signal analysis
 */
export interface MechanicCandidate {
  type: string;
  priority: number;
  effectDirection: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

/**
 * Feedback data stored in localStorage
 */
export interface StoredFeedbackData {
  duration: number;
  conversationExchanges?: ConversationExchange[];
  objectionData?: ObjectionData;
  buyerState?: BuyerStateSnapshot;
  finalResistance?: number;
  metrics?: CallMetrics;
  preAnalyzedMoments?: CriticalMoment[];
  hybridFeedbackAnalyses?: HybridFeedbackAnalysis[];
  timestamp: number;
  sessionId?: string;
  // Call recording (optional)
  recordingBlob?: Blob;           // Audio file of the call
  recordingStartTime?: number;    // performance.now() when recording started
}

/**
 * Active call state stored in localStorage
 */
export interface StoredCallState {
  scenario: MarcusScenario;
  timestamp: number;
  sessionId?: string;
}

/**
 * LLMBehaviorClassifier.types.ts
 * 
 * Types for LLM-assisted behavior classification.
 * 
 * Philosophy:
 * - LLMs judge meaning, code maintains state
 * - Targeted usage: only 4 nuanced behaviors
 * - Return structured evidence for feedback
 */

import { RepBehavior } from './RepBehaviorDetector';

/**
 * LLM tasks that require semantic understanding
 */
export type LLMClassificationTask =
  | 'validate_concern_quality'      // Did rep genuinely validate or just lip service?
  | 'earned_roi_claim'              // Was ROI claim earned or premature?
  | 'specific_problem_connection'   // Did rep show understanding or just parrot?
  | 'pitch_timing';                 // Was pitch earned given context?

/**
 * Classified behavior with evidence
 */
export interface ClassifiedBehavior {
  behavior: RepBehavior;
  confidence: number;        // 0-1
  evidence: string;          // Exact quote from rep
  reason: string;            // Why this was detected
}

/**
 * Suppressed behavior (detected by heuristic but rejected by LLM)
 */
export interface SuppressedBehavior {
  behavior: RepBehavior;
  reason: string;            // Why this was suppressed
}

/**
 * LLM classification result
 */
export interface LLMBehaviorClassification {
  behaviors: ClassifiedBehavior[];
  suppressedBehaviors?: SuppressedBehavior[];
  processingTimeMs?: number;
}

/**
 * Context for LLM classification
 */
export interface LLMClassificationContext {
  repUtterance: string;
  buyerLastUtterance?: string;
  recentHistory?: Array<{ role: 'rep' | 'buyer'; content: string }>;
  turnNumber: number;
  tasks: LLMClassificationTask[];
}

/**
 * LLM prompt template for behavior classification
 */
export interface BehaviorClassificationPrompt {
  task: LLMClassificationTask;
  systemPrompt: string;
  userPrompt: (context: LLMClassificationContext) => string;
  expectedBehaviors: RepBehavior[];
}

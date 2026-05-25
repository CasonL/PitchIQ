/**
 * BuyerStateTypes
 * Shared type definitions used by BuyerStateTree, BuyerStateProductNodes, and BuyerStateScoring.
 */

import { BuyerBeliefState } from './BuyerBeliefTracker';
import { ProductConversationPhysics } from './prompts/ProductConversationFitService';
import { ProductConfidence } from './ProductConfidenceDetector';

export type BuyerStateNodeLifecycle =
  | 'active'
  | 'selected'
  | 'expanded'
  | 'deprioritized'
  | 'dormant'
  | 'retired';

export type BuyerStateType =
  | 'initial_contact'
  | 'clarification'
  | 'distrust'
  | 'fit_concern'
  | 'timing_concern'
  | 'price_concern'
  | 'authority_concern'
  | 'current_solution_comparison'
  | 'risk_concern'
  | 'buying_signal'
  | 'exit_attempt';

export interface BuyerStateNode {
  nodeId: string;
  displayPath: string;
  stateType: BuyerStateType;
  stateSubtype: string | null;
  stateName: string;
  stateDescription: string;
  expectedBehaviors: string[];
  parentId: string | null;
  childIds: string[];
  depth: number;
  lifecycle: BuyerStateNodeLifecycle;
  baseConfidence: number;
  currentConfidence: number;
  hardTriggers: string[];
  softTriggers: string[];
  turnsInState: number;
  minTurnsBeforeTransition: number;
  createdTurn: number;
  lastSelectedTurn: number | null;
  retiredTurn: number | null;
}

export interface BuyerStateTransition {
  fromNodeId: string;
  toNodeId: string;
  confidence: number;
  reason: string;
  triggerType: 'hard' | 'soft' | 'natural';
}

export interface HardTriggerDetection {
  triggerId: string;
  detected: boolean;
  reason?: string;
}

export interface TreeGenerationConfig {
  productName: string | null;
  productCategory: string | null;
  productPhysics: ProductConversationPhysics;
  productConfidence?: ProductConfidence;
  beliefState: BuyerBeliefState;
  maxDepth: number;
  maxChildrenPerNode: number;
}

export interface CandidateScore {
  nodeId: string;
  stateType: BuyerStateType;
  stateSubtype: string | null;
  stateName: string;
  baseConfidence: number;
  beliefAlignment: number;
  triggerBonus: number;
  hardTriggerForced: boolean;
  lifecyclePenalty: number;
  depthPenalty: number;
  productPhysicsScore: number;
  finalScore: number;
  selected: boolean;
  reasonSelected?: string;
  reasonRejected?: string;
}

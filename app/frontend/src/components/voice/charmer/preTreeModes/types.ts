import type { BuyerBeliefState } from '../BuyerBeliefTracker';
import type { ProductConfidence } from '../ProductConfidenceDetector';
import type { SellerSignalId } from '../BuyerTriggerConstants';

export type PreTreeMode =
  | 'NO_PRODUCT_SIGNAL'
  | 'COMPANY_KNOWN_PRODUCT_UNCLEAR'
  | 'CLARITY_SEEKING'
  | 'CATEGORY_UNDERSTOOD_VALUE_UNCLEAR'
  | 'VALUE_UNDERSTOOD_PROOF_UNCLEAR'
  | 'PROOF_UNDERSTOOD_FIT_UNCLEAR'
  | 'FIT_UNDERSTOOD_MECHANICS_UNCLEAR'
  | 'MECHANICS_UNDERSTOOD_ECONOMICS_UNCLEAR'
  | 'ECONOMICS_UNDERSTOOD_TIMING_UNCLEAR'
  | 'TIMING_CLEAR_COMMITMENT_READY'
  | 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR'
  | 'DISQUALIFIED_BY_REP';

export type BuyerLadderStage =
  | 'ORIENT'
  | 'RELEVANCE'
  | 'CREDIBILITY'
  | 'VALUE'
  | 'MECHANICS'
  | 'ECONOMICS'
  | 'TIMING';

export interface PreTreeGuidance {
  mode: PreTreeMode;
  stage: BuyerLadderStage;
  internalPosture: string;
  promptGuidance: string[];
  voiceExamples: string[];
  allowedTopics: string[];
  developerNotes?: string[];
}

export interface PreTreeContext {
  productConfidence: ProductConfidence;
  beliefState: BuyerBeliefState;
  turnNumber: number;
  detectedCompany?: string;
  detectedProductName?: string;
  detectedProductDescription?: string;
  detectedCategory?: string;
  detectedFeatures: string[];
  recentSellerSignals: SellerSignalId[];
}

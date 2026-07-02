export type { PreTreeContext, PreTreeGuidance, PreTreeMode, BuyerLadderStage } from './types';
export { determineMode } from './determineMode';

export { generateNoProductSignalGuidance } from './noProductSignal';
export { generateCompanyKnownGuidance } from './companyKnown';
export { generateClaritySeekingGuidance } from './claritySeeking';
export { generateCategoryUnderstoodGuidance } from './categoryUnderstood';
export { generateValueUnderstoodGuidance } from './valueUnderstood';
export { generateProofUnderstoodGuidance } from './proofUnderstood';
export { generateFitUnderstoodGuidance } from './fitUnderstood';
export { generateMechanicsUnderstoodGuidance } from './mechanicsUnderstood';
export { generateEconomicsUnderstoodGuidance } from './economicsUnderstood';
export { generateTimingClearGuidance } from './timingClear';
export { generateClaimUnderstoodGuidance } from './claimUnderstood';
export { generateDisqualifiedByRepGuidance } from './disqualifiedByRep';

import type { PreTreeContext, PreTreeGuidance, PreTreeMode } from './types';
import { generateNoProductSignalGuidance } from './noProductSignal';
import { generateCompanyKnownGuidance } from './companyKnown';
import { generateClaritySeekingGuidance } from './claritySeeking';
import { generateCategoryUnderstoodGuidance } from './categoryUnderstood';
import { generateValueUnderstoodGuidance } from './valueUnderstood';
import { generateProofUnderstoodGuidance } from './proofUnderstood';
import { generateFitUnderstoodGuidance } from './fitUnderstood';
import { generateMechanicsUnderstoodGuidance } from './mechanicsUnderstood';
import { generateEconomicsUnderstoodGuidance } from './economicsUnderstood';
import { generateTimingClearGuidance } from './timingClear';
import { generateClaimUnderstoodGuidance } from './claimUnderstood';
import { generateDisqualifiedByRepGuidance } from './disqualifiedByRep';

export const modeFactories: Record<PreTreeMode, (context: PreTreeContext) => PreTreeGuidance> = {
  NO_PRODUCT_SIGNAL: generateNoProductSignalGuidance,
  COMPANY_KNOWN_PRODUCT_UNCLEAR: generateCompanyKnownGuidance,
  CLARITY_SEEKING: generateClaritySeekingGuidance,
  CATEGORY_UNDERSTOOD_VALUE_UNCLEAR: generateCategoryUnderstoodGuidance,
  VALUE_UNDERSTOOD_PROOF_UNCLEAR: generateValueUnderstoodGuidance,
  PROOF_UNDERSTOOD_FIT_UNCLEAR: generateProofUnderstoodGuidance,
  FIT_UNDERSTOOD_MECHANICS_UNCLEAR: generateFitUnderstoodGuidance,
  MECHANICS_UNDERSTOOD_ECONOMICS_UNCLEAR: generateMechanicsUnderstoodGuidance,
  ECONOMICS_UNDERSTOOD_TIMING_UNCLEAR: generateEconomicsUnderstoodGuidance,
  TIMING_CLEAR_COMMITMENT_READY: generateTimingClearGuidance,
  CLAIM_UNDERSTOOD_PROOF_UNCLEAR: generateClaimUnderstoodGuidance,
  DISQUALIFIED_BY_REP: generateDisqualifiedByRepGuidance
};

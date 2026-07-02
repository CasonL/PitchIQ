import { SELLER_SIGNALS } from '../BuyerTriggerConstants';
import type { PreTreeContext, PreTreeMode } from './types';

/**
 * Determine the current buyer ladder mode based on the seller's cumulative signals
 * and Marcus's belief state. The ladder progresses from ORIENT → RELEVANCE →
 * VALUE → CREDIBILITY → FIT → MECHANICS → ECONOMICS → TIMING.
 *
 * This is signal-based, not turn-based, so a single clear pitch can advance the
 * buyer multiple rungs while a vague turn can keep them at a lower rung.
 */
export function determineMode(context: PreTreeContext): PreTreeMode {
  const {
    productConfidence,
    beliefState,
    detectedCompany,
    detectedProductName,
    detectedProductDescription,
    detectedCategory,
    detectedFeatures,
    recentSellerSignals
  } = context;

  const recent = new Set(recentSellerSignals);

  const hasCompany = !!detectedCompany;
  const hasProductName = !!detectedProductName;
  const hasProductDescription = !!detectedProductDescription;
  const hasCategory = !!detectedCategory;
  const hasAnyProductSignal = hasProductName || hasProductDescription || detectedFeatures.length > 0;

  const understands = beliefState?.understandsProduct ?? 0;
  const seesRelevance = beliefState?.seesRelevance ?? 0;
  const valueClarity = beliefState?.valueClarity ?? 0;
  const trusts = beliefState?.trustsRep ?? 0;
  const urgency = beliefState?.urgency ?? 0;

  // Rep disqualification tactic always overrides the ladder - trigger curiosity, not combativeness.
  if (recent.has(SELLER_SIGNALS.DISQUALIFIED_BUYER)) {
    return 'DISQUALIFIED_BY_REP';
  }

  // Bold claim always overrides the ladder and demands immediate proof.
  if (recent.has(SELLER_SIGNALS.BOLD_METRIC_CLAIM)) {
    return 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR';
  }

  // ORIENT: no idea what this is about
  if (!hasCompany && !hasAnyProductSignal && productConfidence.confidence === 'none' && understands < 3) {
    return 'NO_PRODUCT_SIGNAL';
  }

  // ORIENT → RELEVANCE: company only, product still unclear
  if (hasCompany && !hasCategory && !hasProductDescription && productConfidence.confidence === 'low' && understands < 4) {
    return 'COMPANY_KNOWN_PRODUCT_UNCLEAR';
  }

  // RELEVANCE: category/type still unclear
  if (!hasCategory || (productConfidence.confidence === 'low' && !hasProductDescription) || understands < 5) {
    return 'CLARITY_SEEKING';
  }

  // VALUE: differentiation/value not yet clear
  if (valueClarity < 5 || !recent.has(SELLER_SIGNALS.EXPLAINED_VALUE)) {
    return 'CATEGORY_UNDERSTOOD_VALUE_UNCLEAR';
  }

  // CREDIBILITY: proof not yet established
  if (trusts < 5 || !recent.has(SELLER_SIGNALS.PROVIDED_PROOF)) {
    return 'VALUE_UNDERSTOOD_PROOF_UNCLEAR';
  }

  // FIT: not sure this applies to the buyer's situation
  if (seesRelevance < 6 || !recent.has(SELLER_SIGNALS.EXPLAINED_FIT)) {
    return 'PROOF_UNDERSTOOD_FIT_UNCLEAR';
  }

  // MECHANICS: how it works not yet explained
  if (!recent.has(SELLER_SIGNALS.EXPLAINED_MECHANISM)) {
    return 'FIT_UNDERSTOOD_MECHANICS_UNCLEAR';
  }

  // ECONOMICS: price/ROI not yet raised
  if (!recent.has(SELLER_SIGNALS.MENTIONED_PRICING)) {
    return 'MECHANICS_UNDERSTOOD_ECONOMICS_UNCLEAR';
  }

  // TIMING: urgency/next steps not yet established
  if (urgency < 5 || !recent.has(SELLER_SIGNALS.ASKED_TIMING)) {
    return 'ECONOMICS_UNDERSTOOD_TIMING_UNCLEAR';
  }

  // All ladder stages satisfied: buyer is ready to discuss commitment.
  return 'TIMING_CLEAR_COMMITMENT_READY';
}

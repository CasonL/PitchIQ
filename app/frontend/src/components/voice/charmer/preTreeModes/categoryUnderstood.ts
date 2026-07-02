import { SELLER_SIGNALS } from '../BuyerTriggerConstants';
import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateCategoryUnderstoodGuidance(context: PreTreeContext): PreTreeGuidance {
  const { detectedCategory, detectedProductName, productConfidence, recentSellerSignals } = context;
  const categoryLabel = detectedCategory || 'this type of solution';
  const productLabel = detectedProductName || 'this';
  const mentionedCompetitors = recentSellerSignals.includes(SELLER_SIGNALS.MENTIONED_COMPETITOR);

  const understandingClause = productConfidence.confidence === 'high' || productConfidence.confidence === 'medium'
    ? `You understand ${productLabel} is ${categoryLabel}`
    : `You think ${productLabel} is ${categoryLabel}, but you're not sure`;

  return {
    mode: 'CATEGORY_UNDERSTOOD_VALUE_UNCLEAR',
    stage: 'VALUE',
    internalPosture: `${understandingClause}, but you don't see what makes it different or why you'd need it. You're skeptical but not closed.`,
    promptGuidance: [
      'Ask how this is different from other options',
      'Remain professional but skeptical',
      'Do not reveal budget or decision authority',
      mentionedCompetitors ? 'Can mention alternatives if asked' : 'Do not volunteer current solution'
    ],
    voiceExamples: mentionedCompetitors
      ? ['"We\'ve looked at options. What makes you different?"', '"How\'s this better?"']
      : [`"${categoryLabel}... what makes you different?"`, '"What\'s your angle?"'],
    allowedTopics: ['differentiation', 'competitors', 'unique_value', 'use_cases', 'current_solution_high_level'],
    developerNotes: [
      'STAGE: RELEVANCE → CREDIBILITY → VALUE',
      'WHO questions recur: "Who else uses this?" "Who have you helped?"',
      'May mention having something in place - realistic once category is clear',
      'Pricing questions still premature (value not established)'
    ]
  };
}

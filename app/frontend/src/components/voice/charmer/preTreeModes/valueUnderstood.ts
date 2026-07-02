import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateValueUnderstoodGuidance(context: PreTreeContext): PreTreeGuidance {
  const productLabel = context.detectedProductName || 'this';

  return {
    mode: 'VALUE_UNDERSTOOD_PROOF_UNCLEAR',
    stage: 'CREDIBILITY',
    internalPosture: `You understand what ${productLabel} is and see the basic value, but you don't yet believe the claims. You need proof, examples, or credibility before you take it seriously.`,
    promptGuidance: [
      'Ask for proof or a real example',
      'Stay skeptical but open',
      'Do not reveal budget or authority yet'
    ],
    voiceExamples: [
      '"Who else has seen results from this?"',
      '"Got a real example?"'
    ],
    allowedTopics: ['proof', 'case_studies', 'customer_examples', 'metrics', 'credibility'],
    developerNotes: [
      'STAGE: CREDIBILITY',
      'Buyer has understood value; now needs to trust the claim',
      'Social proof, metrics, and customer examples are natural asks'
    ]
  };
}

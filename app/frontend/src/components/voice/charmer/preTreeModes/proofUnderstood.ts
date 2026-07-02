import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateProofUnderstoodGuidance(context: PreTreeContext): PreTreeGuidance {
  const productLabel = context.detectedProductName || 'this';

  return {
    mode: 'PROOF_UNDERSTOOD_FIT_UNCLEAR',
    stage: 'VALUE',
    internalPosture: `The claims about ${productLabel} sound credible, but you're not sure whether this actually applies to your specific situation or team.`,
    promptGuidance: [
      'Ask whether the result applies to a business like yours',
      'Share only limited context if asked directly',
      'Do not reveal budget or authority'
    ],
    voiceExamples: [
      '"Was that with a team like ours?"',
      '"Would that actually work in our setup?"'
    ],
    allowedTopics: ['fit', 'relevance', 'customer_similarity', 'use_case_match'],
    developerNotes: [
      'STAGE: VALUE/FIT',
      'Buyer accepts proof; now needs to see personal relevance',
      'Encourage buyer to ask about similar customers or scenarios'
    ]
  };
}

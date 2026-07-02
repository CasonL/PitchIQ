import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateEconomicsUnderstoodGuidance(context: PreTreeContext): PreTreeGuidance {
  const productLabel = context.detectedProductName || 'this';

  return {
    mode: 'ECONOMICS_UNDERSTOOD_TIMING_UNCLEAR',
    stage: 'TIMING',
    internalPosture: `The economics of ${productLabel} might make sense, but you're not sure if this is a priority right now or what the next step would be.`,
    promptGuidance: [
      'Ask about timing or next steps',
      'Remain cautious but open to a follow-up',
      'Do not commit to a purchase'
    ],
    voiceExamples: [
      '"What would the next step look like?"',
      '"When does this usually make sense?"'
    ],
    allowedTopics: ['timing', 'next_steps', 'priority', 'pilot'],
    developerNotes: [
      'STAGE: TIMING',
      'Buyer is evaluating when and how to move forward',
      'Low-friction next steps are natural'
    ]
  };
}

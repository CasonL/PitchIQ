import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateMechanicsUnderstoodGuidance(context: PreTreeContext): PreTreeGuidance {
  const productLabel = context.detectedProductName || 'this';

  return {
    mode: 'MECHANICS_UNDERSTOOD_ECONOMICS_UNCLEAR',
    stage: 'ECONOMICS',
    internalPosture: `You understand how ${productLabel} works, but you don't know if it's worth the investment. You're weighing the economics.`,
    promptGuidance: [
      'Ask about price, ROI, or investment naturally',
      'Do not commit to a budget',
      'Stay evaluative'
    ],
    voiceExamples: [
      '"What kind of investment are we talking about?"',
      '"How do you price it?"'
    ],
    allowedTopics: ['pricing', 'roi', 'budget', 'investment'],
    developerNotes: [
      'STAGE: ECONOMICS',
      'Buyer has enough understanding to evaluate cost vs value',
      'Pricing questions are now genuine, not premature'
    ]
  };
}

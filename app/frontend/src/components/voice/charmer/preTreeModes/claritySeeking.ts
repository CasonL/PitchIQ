import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateClaritySeekingGuidance(context: PreTreeContext): PreTreeGuidance {
  const productLabel = context.detectedProductName || 'this';

  return {
    mode: 'CLARITY_SEEKING',
    stage: 'RELEVANCE',
    internalPosture: `You're moderately busy and need to understand what category ${productLabel} belongs to before deciding whether it matters. Real buyers don't jump to pricing when they don't even know what's being sold - they clarify the category first.`,
    promptGuidance: [
      'Real buyers ask about WHAT something is before asking HOW MUCH it costs',
      'Your natural question: "What is this? Software? Training? Consulting?"',
      'Price questions come after you understand if this is even relevant to your world',
      'Keep it short - you\'re busy and this better be worth your time'
    ],
    voiceExamples: [
      context.detectedProductName ? `"Okay, so what exactly is ${context.detectedProductName}?"` : '"What is this? Software or what?"',
      '"Who\'s this even for?"'
    ],
    allowedTopics: ['product_type', 'target_buyer', 'problem_solved', 'delivery_model', 'basic_category'],
    developerNotes: [
      'STAGE: RELEVANCE - Buyer psychology: category before price',
      'Guideline-based: Trust model to understand buyer behavior',
      'No rigid "DO NOT" rules - just buyer logic'
    ]
  };
}

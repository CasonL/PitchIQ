import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateFitUnderstoodGuidance(context: PreTreeContext): PreTreeGuidance {
  const productLabel = context.detectedProductName || 'this';

  return {
    mode: 'FIT_UNDERSTOOD_MECHANICS_UNCLEAR',
    stage: 'MECHANICS',
    internalPosture: `You see the potential fit for ${productLabel}, but you don't understand how it actually works or what using it would look like day-to-day.`,
    promptGuidance: [
      'Ask how it works in practical terms',
      'Keep the question brief and direct',
      'Do not reveal detailed process or budget'
    ],
    voiceExamples: [
      '"Okay, but how does it actually work?"',
      '"What does that look like day-to-day?"'
    ],
    allowedTopics: ['mechanics', 'how_it_works', 'process', 'implementation'],
    developerNotes: [
      'STAGE: MECHANICS',
      'Buyer is interested enough to want to understand the mechanism',
      'Simple explanation request; avoid jargon-heavy responses'
    ]
  };
}

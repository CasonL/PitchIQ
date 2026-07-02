import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateTimingClearGuidance(context: PreTreeContext): PreTreeGuidance {
  const productLabel = context.detectedProductName || 'this';

  return {
    mode: 'TIMING_CLEAR_COMMITMENT_READY',
    stage: 'TIMING',
    internalPosture: `You understand what ${productLabel} is, how it works, and what it costs. You're open to moving forward if the next step is low-friction.`,
    promptGuidance: [
      'Be open to scheduling a next step',
      'Ask clarifying questions about the process',
      'Do not overcommit'
    ],
    voiceExamples: [
      '"Okay, I could do a quick demo next week."',
      '"Send me a calendar link and I\'ll take a look."'
    ],
    allowedTopics: ['next_steps', 'scheduling', 'demo', 'pilot', 'commitment'],
    developerNotes: [
      'STAGE: TIMING/COMMITMENT',
      'Buyer has crossed all major ladder stages',
      'Focus on concrete, low-pressure next steps'
    ]
  };
}

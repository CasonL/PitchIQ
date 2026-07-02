import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateNoProductSignalGuidance(context: PreTreeContext): PreTreeGuidance {
  const { turnNumber } = context;

  const posture = turnNumber <= 1
    ? "You just answered the phone. You have no idea who this is or why they're calling. You're skeptical about unsolicited calls."
    : "You still don't know what this call is about or how they got your number. You need legitimacy established.";

  return {
    mode: 'NO_PRODUCT_SIGNAL',
    stage: 'ORIENT',
    internalPosture: posture,
    promptGuidance: [
      'Brief, polite but skeptical',
      'Ask who is calling and what this is about',
      'Do not reveal business details',
      'Remain guarded and non-committal'
    ],
    voiceExamples: [
      '"Wait, who is this?"',
      '"What\'s this about?"'
    ],
    allowedTopics: ['who_is_calling', 'how_got_number', 'legitimacy', 'agenda', 'purpose'],
    developerNotes: [
      'STAGE: ORIENT - Gatekeeping before engagement',
      'Gatekeeping reflexes: legitimacy, time pressure, dismissive, default no',
      'These are defensive reflexes, NOT genuine objections',
      'Seller must earn right to present value'
    ]
  };
}

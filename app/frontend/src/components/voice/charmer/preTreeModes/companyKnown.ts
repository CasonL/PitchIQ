import type { PreTreeContext, PreTreeGuidance } from './types';

export function generateCompanyKnownGuidance(context: PreTreeContext): PreTreeGuidance {
  const companyLabel = context.detectedCompany || 'your company';

  return {
    mode: 'COMPANY_KNOWN_PRODUCT_UNCLEAR',
    stage: 'ORIENT',
    internalPosture: `You heard the company name ${companyLabel}, but you've never heard of them. You're skeptical about how they got your number and why they're calling.`,
    promptGuidance: [
      'Brief and guarded',
      'Ask what they sell in simple terms',
      'Do not reveal business details',
      'Do not make assumptions about product category'
    ],
    voiceExamples: [
      `"${companyLabel}? Never heard of you."`,
      '"Okay... what do you guys do?"'
    ],
    allowedTopics: ['who_is_calling', 'how_got_number', 'legitimacy', 'product_type', 'basic_explanation'],
    developerNotes: [
      'STAGE: ORIENT → RELEVANCE - Gatekeeping before engagement',
      'Gatekeeping reflexes available: legitimacy, time pressure, dismissive, default no',
      'If seller persists, ask what they sell',
      'Avoid using detectedProductName as company fallback'
    ]
  };
}

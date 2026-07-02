import type { PreTreeContext, PreTreeGuidance } from './types';

/**
 * Rep just used a negative-reverse-selling / disqualification tactic
 * ("not a good fit", "might not be for you", etc.). Real buyers meet this
 * with curiosity or mild insecurity, not combative defensiveness — they've
 * never been told they don't qualify before, so it stands out.
 */
export function generateDisqualifiedByRepGuidance(context: PreTreeContext): PreTreeGuidance {
  const productLabel = context.detectedProductName || 'this';

  return {
    mode: 'DISQUALIFIED_BY_REP',
    stage: 'RELEVANCE',
    internalPosture: `The rep just told you that you might not be a good fit for ${productLabel}. This is unexpected — most callers try to convince you, not talk you out of it. You're not angry or defensive; you're caught off guard and curious. Some small part of you wonders what makes you NOT qualify.`,
    promptGuidance: [
      'Do NOT argue that you deserve the pitch or defend why you might be a fit - that reads as needy, not skeptical',
      'React with genuine curiosity or mild surprise, not combativeness',
      'Ask what specifically makes you not a fit - you want to understand the reasoning',
      'Keep it short - a real person caught off guard doesn\'t monologue',
      'Do not raise a new unrelated objection in this turn; stay on the disqualification moment',
      'It is OK to feel a little insecure or want to know the criteria - that is a natural reaction, not weakness'
    ],
    voiceExamples: [
      '"Wait, why not?"',
      '"Huh. What makes you say that?"',
      '"Okay... what would make someone a good fit, then?"'
    ],
    allowedTopics: ['qualification_criteria', 'why_not_a_fit'],
    developerNotes: [
      'STAGE: RELEVANCE (ladder override)',
      'Triggered by rep using negative-reverse-selling / disqualification language',
      'Goal: prevent combative "prove I deserve this" escalation previously seen when treated as a generic objection',
      'Real buyers respond to being told they don\'t qualify with curiosity/insecurity, not argument'
    ]
  };
}

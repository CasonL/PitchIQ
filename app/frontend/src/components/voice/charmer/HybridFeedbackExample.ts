/**
 * HybridFeedbackExample.ts
 * Testing hybrid system on user's opener
 * Shows: Rules detect → LLM reasons → Context-aware feedback
 */

import { HybridFeedbackGenerator } from './HybridFeedbackGenerator';
import { BuyerState } from './StrategyLayer';

const generator = new HybridFeedbackGenerator();

// Mock buyer state for user's opener (cold call, high resistance)
const coldCallState: BuyerState = {
  emotionalPosture: 'guarded',
  resistanceLevel: 7,
  openness: 3,
  patience: 5,
  clarity: 2,
  relevance: 2,
  urgency: 3,
  trustLevel: 2,
  disclosureGates: {
    canRevealBudget: false,
    canRevealTimeline: false,
    canRevealPainPoints: false,
    canRevealDecisionProcess: false,
    canShowInterest: false,
    canAdmitConcerns: false
  },
  objectionSatisfaction: {
    proof: 0,
    fit: 0,
    customization: 0,
    trust: 0,
    value: 0,
    time: 0,
    budget: 0,
    authority: 0,
    timing: 0,
    status_quo: 0
  },
  shouldEscalateObjection: false,
  shouldForceExit: false,
  shouldShowConfusion: false
};

const userOpener = "Hi Marcus, it's Cason from PitchIQ. Do you have 5 minutes to talk about your sales team?";

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║  HYBRID SYSTEM TEST: User Opener                             ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

console.log('MESSAGE:', userOpener);
console.log('\nCONTEXT: Cold call, Marcus resistance 7/10, trust 2/10, utterance #1\n');

// This would call the LLM in production
async function testHybrid() {
  try {
    const feedback = await generator.generateFeedback({
      userMessage: userOpener,
      utteranceCount: 1,
      buyerState: coldCallState,
      conversationHistory: []
    });

    if (feedback) {
      console.log('=== HYBRID FEEDBACK OUTPUT ===\n');
      console.log(generator.formatForDisplay(feedback));
      
      console.log('\n=== DEBUG INFO ===\n');
      console.log(generator.getDebugInfo(feedback));
    }
  } catch (error) {
    console.error('Hybrid generation failed:', error);
    console.log('\nNote: This requires LLM API integration at /api/analyze-moment');
  }
}

// Mock expected LLM response for demonstration
const mockLLMResponse = `PRIMARY_ISSUE: You asked for time before giving Marcus any reason to stay on the line

EVIDENCE: Do you have 5 minutes; talk about your sales team; it's Cason from PitchIQ

WHY_THIS_MATTERS: Marcus is cold (trust 2/10) and guarded (resistance 7/10). When you lead with "do you have 5 minutes," his brain instantly categorizes this as a sales pitch. The early identity ("Cason from PitchIQ") confirms it's cold outreach. "Talk about your sales team" is too vague to justify the interruption. Resistance spikes because you're asking for time without earning it. The sequence triggers: "Stranger wants my time for unspecified topic" → immediate no.

BETTER_APPROACH: "I work with teams that struggle with rep ramp consistency—30% miss quota in month 3. Is onboarding speed on your radar right now?" [If he engages] "I'm Cason from PitchIQ."

SEQUENCE: Problem frame → Specificity → Relevance check → Identity (only after micro-interest)

REASONING: The rules correctly identified both identity_without_payoff and permission_without_value. However, in this cold context (resistance 7, trust 2), the permission ask is the primary killer. Early identity is less damaging than leading with a time ask. The vague topic ("your sales team") compounds the issue but isn't the root cause. The mechanistic failure: asking for a commitment (time) before establishing value. This is sequence, not rapport.`;

console.log('\n=== EXPECTED LLM REASONING ===\n');
console.log('Given the context (cold call, high resistance), the LLM would choose:');
console.log('PRIMARY: permission_without_value (asking for time before earning it)');
console.log('SECONDARY: identity_without_payoff compounds but doesn\'t dominate');
console.log('\nThe LLM uses buyer state to determine permission ask is worse than early identity in this specific context.');

export { generator, coldCallState, userOpener };

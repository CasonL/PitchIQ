/**
 * BuyerPromptComposer.ts
 * 
 * Turns hidden buyer state into compact prompt context for the LLM.
 * 
 * Philosophy:
 * - Code tracks state, LLM interprets it conversationally
 * - Don't reveal exact numbers to rep
 * - Give LLM enough context to perform the buyer naturally
 * - Keep it compact (LLMs don't need essays)
 */

import { BuyerState, BuyerResponseMode } from './BuyerState.types';
import { BuyerDecision } from './BuyerDecisionPolicy';

export class BuyerPromptComposer {
  /**
   * Compose buyer state into prompt context
   */
  static compose(state: BuyerState, decision: BuyerDecision): string {
    const { emotional, belief, economic, conversation } = state;

    return `
YOUR CURRENT INTERNAL STATE (hidden from rep):

EMOTIONAL STATE:
- Trust in rep: ${emotional.trust}/100 ${this.getTrustLabel(emotional.trust)}
- Defensiveness: ${emotional.defensiveness}/100 ${this.getDefensivenessLabel(emotional.defensiveness)}
- Patience: ${emotional.patience}/100 ${this.getPatienceLabel(emotional.patience)}
- Curiosity: ${emotional.curiosity}/100
- Openness: ${emotional.openness}/100

BELIEFS ABOUT PROBLEM & SOLUTION:
- Problem severity: ${belief.perceivedProblemSeverity}/100 ${this.getProblemSeverityLabel(belief.perceivedProblemSeverity)}
- Solution fit: ${belief.perceivedSolutionFit}/100 ${this.getSolutionFitLabel(belief.perceivedSolutionFit)}
- Urgency: ${belief.perceivedUrgency}/100
- Trust in claims: ${belief.trustInClaims}/100
- Perceived risk: ${belief.perceivedRisk}/100

ECONOMIC CONTEXT:
${this.composeEconomicContext(economic)}
- Budget pressure: ${economic.budgetPressure}/100 ${this.getBudgetPressureLabel(economic.budgetPressure)}
- Value clarity: ${economic.valueClarity}/100 ${this.getValueClarityLabel(economic.valueClarity)}
- Willingness to stretch budget: ${economic.willingnessToStretchBudget}/100

CONVERSATION STATE:
- Call fatigue: ${conversation.callFatigue}/100
- Clarity: ${conversation.clarity}/100 ${this.getClarityLabel(conversation.clarity)}
- Response mode: ${decision.responseMode}
- Main blocker: ${decision.dominantBlocker || 'none'}

BUYING MOMENTUM: ${decision.buyingMomentum.toFixed(0)} ${this.getMomentumLabel(decision.buyingMomentum)}

${this.composeResponseGuidance(decision.responseMode, decision.dominantBlocker)}

CRITICAL: Do not reveal exact hidden numbers. Respond naturally based on this state.
`;
  }

  /**
   * Compose economic context (only reveal what's set)
   */
  private static composeEconomicContext(economic: BuyerState['economic']): string {
    const lines: string[] = [];

    if (economic.currentSpendMonthly) {
      lines.push(`- Current spend: $${economic.currentSpendMonthly}/month`);
    }
    if (economic.comfortableBudgetMonthly) {
      lines.push(`- Comfortable budget: $${economic.comfortableBudgetMonthly}/month`);
    }
    if (economic.stretchBudgetMonthly) {
      lines.push(`- Stretch budget: $${economic.stretchBudgetMonthly}/month (if value is clear)`);
    }
    if (economic.actualProblemCostMonthly) {
      lines.push(`- Actual problem cost: ~$${economic.actualProblemCostMonthly}/month (you may not fully realize this)`);
    }

    return lines.length > 0 ? lines.join('\n') : '- No specific budget constraints set';
  }

  /**
   * Compose response guidance based on mode and blocker
   */
  private static composeResponseGuidance(mode: BuyerResponseMode, blocker?: string): string {
    const guidance: Record<BuyerResponseMode, string> = {
      open: `
GUIDANCE: You're engaged and open. Ask clarifying questions, show genuine interest, be collaborative.
If the value is clear and fits your needs, signal readiness for next steps.`,

      curious: `
GUIDANCE: You're interested but cautious. Ask probing questions, seek proof, test their understanding.
Don't commit yet, but stay engaged if they demonstrate value.`,

      skeptical: `
GUIDANCE: You're doubtful but listening. Challenge their claims, point out gaps, express concerns.
They need to earn your trust before you'll consider this seriously.`,

      guarded: `
GUIDANCE: You're defensive and protective. Keep responses brief, don't volunteer information.
They haven't earned the right to your time or attention yet.`,

      objecting: `
GUIDANCE: You have a specific concern that's blocking progress. Voice it clearly.
Main blocker: ${blocker}. This needs to be addressed before you'll move forward.`,

      ending_call: `
GUIDANCE: You're done with this call. Be polite but firm. Signal you need to go.
Don't be rude, but make it clear the conversation is over.`,

      next_step_ready: `
GUIDANCE: You see the value and want to move forward. Signal openness to next steps.
Ask about process, timeline, what's involved. Show you're ready to engage seriously.`
    };

    return guidance[mode];
  }

  // ============================================================================
  // LABEL HELPERS
  // ============================================================================

  private static getTrustLabel(trust: number): string {
    if (trust > 75) return '(high trust - believes rep is credible)';
    if (trust > 50) return '(moderate trust - cautiously optimistic)';
    if (trust > 25) return '(low trust - skeptical of rep)';
    return '(very low trust - rep has not earned credibility)';
  }

  private static getDefensivenessLabel(defensiveness: number): string {
    if (defensiveness > 75) return '(very guarded - protective of time/info)';
    if (defensiveness > 50) return '(somewhat guarded - cautious)';
    if (defensiveness > 25) return '(slightly defensive - testing rep)';
    return '(open - willing to engage)';
  }

  private static getPatienceLabel(patience: number): string {
    if (patience < 20) return '(almost out of patience - about to exit)';
    if (patience < 40) return '(patience wearing thin)';
    if (patience < 60) return '(moderate patience remaining)';
    return '(patient - willing to give time)';
  }

  private static getProblemSeverityLabel(severity: number): string {
    if (severity > 75) return '(critical problem - needs solution urgently)';
    if (severity > 50) return '(significant problem - worth addressing)';
    if (severity > 25) return '(minor problem - not urgent)';
    return '(barely a problem - not worth fixing)';
  }

  private static getSolutionFitLabel(fit: number): string {
    if (fit > 75) return '(excellent fit - this solves my exact problem)';
    if (fit > 50) return '(decent fit - could work for us)';
    if (fit > 25) return '(weak fit - not sure this applies)';
    return '(poor fit - doesn\'t solve my problem)';
  }

  private static getBudgetPressureLabel(pressure: number): string {
    if (pressure > 75) return '(very tight budget - hard to justify spend)';
    if (pressure > 50) return '(budget constrained - need strong ROI)';
    if (pressure > 25) return '(some budget flexibility)';
    return '(budget available if value is clear)';
  }

  private static getValueClarityLabel(clarity: number): string {
    if (clarity > 75) return '(crystal clear on value)';
    if (clarity > 50) return '(understand the value proposition)';
    if (clarity > 25) return '(vague sense of value)';
    return '(no idea what I\'m getting)';
  }

  private static getClarityLabel(clarity: number): string {
    if (clarity > 75) return '(fully understand what\'s being discussed)';
    if (clarity > 50) return '(mostly following the conversation)';
    if (clarity > 25) return '(somewhat confused)';
    return '(lost - don\'t understand what they\'re talking about)';
  }

  private static getMomentumLabel(momentum: number): string {
    if (momentum > 150) return '(strong positive - moving toward yes)';
    if (momentum > 50) return '(positive - interested and engaged)';
    if (momentum > -50) return '(neutral - could go either way)';
    if (momentum > -150) return '(negative - leaning toward no)';
    return '(strong negative - ready to exit)';
  }

  /**
   * Compose a compact state summary for logging/debugging
   */
  static composeDebugSummary(state: BuyerState, decision: BuyerDecision): string {
    return `[Trust: ${state.emotional.trust}/100 | Fit: ${state.belief.perceivedSolutionFit}/100 | Momentum: ${decision.buyingMomentum.toFixed(0)} | Mode: ${decision.responseMode} | Blocker: ${decision.dominantBlocker}]`;
  }

  /**
   * Compose state for feedback generation
   */
  static composeForFeedback(state: BuyerState): string {
    return `
Buyer State Summary:
- Trust in rep: ${state.emotional.trust}/100
- Solution fit: ${state.belief.perceivedSolutionFit}/100
- Problem severity: ${state.belief.perceivedProblemSeverity}/100
- Budget pressure: ${state.economic.budgetPressure}/100
- Value clarity: ${state.economic.valueClarity}/100
- Main blocker: ${state.conversation.dominantBlocker || 'none'}
`;
  }
}

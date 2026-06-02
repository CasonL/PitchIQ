/**
 * BuyerDecisionPolicy.ts
 * 
 * Decides what Marcus should do next based on buyer state.
 * Uses 6 macro exit drivers, not 30 micro reasons.
 * 
 * Philosophy:
 * - Exit decisions based on dominant blockers
 * - Response mode guides LLM behavior
 * - Buying momentum calculation (not deterministic formula)
 * - Clean macro logic, subtypes can exist within drivers
 */

import { BuyerState, ExitDriver, BuyerResponseMode } from './BuyerState.types';

export interface BuyerDecision {
  shouldExit: boolean;
  exitDriver?: ExitDriver;
  dominantBlocker?: string;
  secondaryBlocker?: string;
  responseMode: BuyerResponseMode;
  exitMessage?: string;
  buyingMomentum: number; // Net momentum score
}

export interface BuyingMomentum {
  // Positive forces
  problemSeverity: number;
  relevanceFit: number;
  trust: number;
  urgency: number;
  valueClarity: number;
  
  // Negative forces
  perceivedRisk: number;
  switchingFriction: number;
  budgetPressure: number;
  callFatigue: number;
  
  // Net result
  netMomentum: number;
  dominantDriver?: string;
  dominantBlocker?: string;
}

export class BuyerDecisionPolicy {
  /**
   * Determine what Marcus should do next
   */
  static decide(state: BuyerState): BuyerDecision {
    const momentum = this.calculateBuyingMomentum(state);
    const exitDecision = this.shouldExit(state, momentum);
    const responseMode = this.determineResponseMode(state, momentum);

    return {
      shouldExit: exitDecision.shouldExit,
      exitDriver: exitDecision.driver,
      dominantBlocker: momentum.dominantBlocker,
      secondaryBlocker: this.findSecondaryBlocker(state, momentum.dominantBlocker),
      responseMode,
      exitMessage: exitDecision.message,
      buyingMomentum: momentum.netMomentum
    };
  }

  /**
   * Calculate buying momentum from current state.
   * Uses weighted factors and dynamic adjustments.
   * This guides the LLM, doesn't handcuff it.
   */
  private static calculateBuyingMomentum(state: BuyerState): BuyingMomentum {
    const { emotional, belief, economic, conversation } = state;

    // Positive forces (what pushes Marcus toward buying)
    const problemSeverity = belief.perceivedProblemSeverity;
    const relevanceFit = belief.perceivedSolutionFit;
    const trust = (emotional.trust + belief.trustInClaims) / 2;
    const urgency = belief.perceivedUrgency;
    const valueClarity = economic.valueClarity;

    // Negative forces (what holds Marcus back)
    const perceivedRisk = belief.perceivedRisk;
    const switchingFriction = belief.switchingFriction;
    const budgetPressure = economic.budgetPressure;
    const callFatigue = conversation.callFatigue;

    // Dynamic weights based on context
    // Budget matters less when solution clearly solves a serious problem
    const budgetPressureWeight = 
      (relevanceFit > 75 && problemSeverity > 70) ? 0.5 : 1.2;
    
    // Fatigue matters more late in the call
    const fatigueWeight = conversation.turnCount > 8 ? 1.4 : 0.8;

    // Calculate weighted momentum (not all variables weigh the same)
    const positiveSum = 
      relevanceFit * 1.4 +
      problemSeverity * 1.2 +
      trust * 1.1 +
      valueClarity * 1.0 +
      urgency * 0.8;
    
    const negativeSum = 
      perceivedRisk * 1.2 +
      switchingFriction * 1.0 +
      budgetPressure * budgetPressureWeight +
      callFatigue * fatigueWeight;
    
    const netMomentum = positiveSum - negativeSum;

    // Find dominant driver and blocker
    const drivers = [
      { name: 'problemSeverity', value: problemSeverity },
      { name: 'relevanceFit', value: relevanceFit },
      { name: 'trust', value: trust },
      { name: 'urgency', value: urgency },
      { name: 'valueClarity', value: valueClarity }
    ];
    const dominantDriver = drivers.reduce((max, d) => d.value > max.value ? d : max).name;

    const blockers = [
      { name: 'perceivedRisk', value: perceivedRisk },
      { name: 'switchingFriction', value: switchingFriction },
      { name: 'budgetPressure', value: budgetPressure },
      { name: 'callFatigue', value: callFatigue }
    ];
    const dominantBlocker = blockers.reduce((max, b) => b.value > max.value ? b : max).name;

    return {
      problemSeverity,
      relevanceFit,
      trust,
      urgency,
      valueClarity,
      perceivedRisk,
      switchingFriction,
      budgetPressure,
      callFatigue,
      netMomentum,
      dominantDriver,
      dominantBlocker
    };
  }

  /**
   * Determine if Marcus should exit the call.
   * Uses 6 macro exit drivers with turn gates to prevent premature exits.
   */
  private static shouldExit(state: BuyerState, momentum: BuyingMomentum): {
    shouldExit: boolean;
    driver?: ExitDriver;
    message?: string;
  } {
    const { emotional, belief, economic, conversation, process } = state;

    // 1. LEGITIMACY FAILURE (can happen early)
    // Marcus doesn't believe rep has valid reason to call
    if (conversation.turnCount >= 1 &&
        emotional.trust < 25 && 
        emotional.defensiveness > 75) {
      return {
        shouldExit: true,
        driver: 'legitimacy_failure',
        message: "How did you get my information? I didn't sign up for this."
      };
    }

    // 2. RELEVANCE FAILURE (needs time to establish)
    // Product doesn't apply to Marcus's situation
    if (conversation.turnCount >= 4 &&
        belief.perceivedSolutionFit < 30 && 
        emotional.curiosity < 25) {
      return {
        shouldExit: true,
        driver: 'relevance_failure',
        message: "This doesn't sound like something we need."
      };
    }

    // 3. ECONOMIC FAILURE (needs value discussion first)
    // Price/value equation doesn't work
    if (conversation.turnCount >= 5 &&
        economic.budgetPressure > 80 && 
        belief.perceivedProblemSeverity < 60 &&
        belief.trustInClaims < 60) {
      return {
        shouldExit: true,
        driver: 'economic_failure',
        message: "That's way more than we could justify."
      };
    }

    // 4. TIMING FAILURE (needs context to assess urgency)
    // Problem may be real, but not now
    if (conversation.turnCount >= 7 &&
        belief.perceivedUrgency < 35) {
      return {
        shouldExit: true,
        driver: 'timing_failure',
        message: "Maybe later this year. Not a priority right now."
      };
    }

    // 5. AUTHORITY FAILURE (needs process discussion)
    // Marcus can't move the deal forward
    if (conversation.turnCount >= 5 &&
        process.decisionAuthority < 30 &&
        process.accessToEconomicBuyer < 30) {
      return {
        shouldExit: true,
        driver: 'authority_failure',
        message: "I'm not the person who handles that. You'd need to talk to [other person]."
      };
    }

    // 6. CONVERSATION FATIGUE (can happen anytime)
    // Rep has exhausted the buyer - MORE SENSITIVE after ignores_exit_signal
    if (conversation.turnCount >= 2 &&
        (emotional.patience < 30 || conversation.callFatigue > 75)) {
      return {
        shouldExit: true,
        driver: 'conversation_fatigue',
        message: "Listen, I have to go."
      };
    }

    return { shouldExit: false };
  }

  /**
   * Determine how Marcus should respond.
   * This guides the LLM's tone and behavior.
   */
  private static determineResponseMode(state: BuyerState, momentum: BuyingMomentum): BuyerResponseMode {
    const { emotional, belief } = state;

    // Exit mode - MORE SENSITIVE to match exit threshold
    if (emotional.patience < 30 || momentum.netMomentum < -200) {
      return 'ending_call';
    }

    // Ready for next step
    if (momentum.netMomentum > 150 && 
        belief.perceivedSolutionFit > 70 &&
        emotional.trust > 60) {
      return 'next_step_ready';
    }

    // Open and engaged
    if (momentum.netMomentum > 100 && emotional.defensiveness < 40) {
      return 'open';
    }

    // Curious but cautious
    if (emotional.curiosity > 50 && emotional.defensiveness < 60) {
      return 'curious';
    }

    // Actively objecting
    if (emotional.defensiveness > 70 || belief.perceivedRisk > 70) {
      return 'objecting';
    }

    // Skeptical but listening
    if (momentum.netMomentum > -50) {
      return 'skeptical';
    }

    // Default: guarded
    return 'guarded';
  }

  /**
   * Find the secondary blocker (second-highest negative force)
   */
  private static findSecondaryBlocker(state: BuyerState, dominantBlocker?: string): string | undefined {
    const blockers = [
      { name: 'perceivedRisk', value: state.belief.perceivedRisk },
      { name: 'switchingFriction', value: state.belief.switchingFriction },
      { name: 'budgetPressure', value: state.economic.budgetPressure },
      { name: 'callFatigue', value: state.conversation.callFatigue }
    ];

    // Remove dominant blocker
    const remaining = blockers.filter(b => b.name !== dominantBlocker);
    if (remaining.length === 0) return undefined;

    return remaining.reduce((max, b) => b.value > max.value ? b : max).name;
  }

  /**
   * Get a human-readable explanation of the decision
   */
  static explainDecision(decision: BuyerDecision): string {
    const { responseMode, buyingMomentum, dominantBlocker } = decision;

    if (decision.shouldExit) {
      return `Exit triggered: ${decision.exitDriver} (blocker: ${dominantBlocker})`;
    }

    const momentumLabel = 
      buyingMomentum > 100 ? 'strong positive' :
      buyingMomentum > 0 ? 'slight positive' :
      buyingMomentum > -100 ? 'slight negative' :
      'strong negative';

    return `Response mode: ${responseMode}, Momentum: ${momentumLabel} (${buyingMomentum.toFixed(0)}), Main blocker: ${dominantBlocker}`;
  }

  /**
   * Get exit message based on driver and blocker
   */
  static getExitMessage(driver: ExitDriver, dominantBlocker: string): string {
    const messages: Record<ExitDriver, Record<string, string>> = {
      legitimacy_failure: {
        default: "How did you get my information?",
        perceivedRisk: "I'm not comfortable with this call.",
        budgetPressure: "I didn't ask to be contacted about this."
      },
      relevance_failure: {
        default: "This doesn't sound like something we need.",
        perceivedRisk: "I don't think this is a fit for us.",
        switchingFriction: "We're happy with what we have."
      },
      economic_failure: {
        default: "That's way more than we could justify.",
        budgetPressure: "We don't have budget for this.",
        perceivedRisk: "The ROI doesn't make sense for us."
      },
      timing_failure: {
        default: "Maybe later this year.",
        budgetPressure: "Not a priority right now.",
        callFatigue: "I don't have time for this right now."
      },
      authority_failure: {
        default: "I'm not the person who handles that.",
        budgetPressure: "I'd need to run this by the team.",
        perceivedRisk: "This would need approval from [other person]."
      },
      conversation_fatigue: {
        default: "Listen, I have to go.",
        callFatigue: "I really need to wrap this up.",
        budgetPressure: "I don't think this is going anywhere."
      }
    };

    return messages[driver][dominantBlocker] || messages[driver].default;
  }
}

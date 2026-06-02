/**
 * BuyerStateTransitionEngine.ts
 * 
 * Applies state changes based on detected rep behaviors.
 * This is where the "rep did X → Marcus feels Y" logic lives.
 * 
 * Philosophy:
 * - Behavior-based deltas, not heuristics
 * - Trust affects value perception
 * - Relevance affects budget flexibility
 * - Problem severity affects patience
 * - Returns new state (immutable updates)
 */

import { BuyerState, EmotionalState, BeliefState, EconomicState, ConversationState } from './BuyerState.types';
import { RepBehavior } from './RepBehaviorDetector';

interface StateChange {
  // Emotional changes
  openness?: number;
  patience?: number;
  defensiveness?: number;
  trust?: number;
  curiosity?: number;
  
  // Belief changes
  perceivedProblemSeverity?: number;
  perceivedSolutionFit?: number;
  perceivedUrgency?: number;
  trustInClaims?: number;
  perceivedRisk?: number;
  switchingFriction?: number;
  confidenceInNeed?: number;
  
  // Economic changes
  budgetPressure?: number;
  willingnessToStretchBudget?: number;
  valueClarity?: number;
  
  // Conversation changes
  callFatigue?: number;
  clarity?: number;
  
  // Warm-lead psychology (research-backed)
  autonomyDefense?: number;        // Reactance theory
  statusQuoShieldActive?: boolean; // Status quo bias
  cognitiveLoad?: number;          // Cognitive load theory
  relevanceConfidence?: number;    // Source credibility
  riskPerception?: number;         // Loss aversion
}

export class BuyerStateTransitionEngine {
  /**
   * Apply behavior updates to buyer state
   */
  static applyBehaviors(state: BuyerState, behaviors: RepBehavior[]): BuyerState {
    let next = structuredClone(state);

    // Prevent behavior stacking - use priority selection
    const selectedBehaviors = this.selectPriorityBehaviors(behaviors);

    for (const behavior of selectedBehaviors) {
      const change = this.getStateChangeForBehavior(behavior);
      next = this.applyStateChange(next, change);
    }

    // Apply dynamic interactions after all behaviors
    next = this.applyDynamicInteractions(next);

    return this.clampState(next);
  }

  /**
   * Select priority behaviors to prevent stacking.
   * Only count the highest-value behavior in each category.
   */
  private static selectPriorityBehaviors(behaviors: RepBehavior[]): RepBehavior[] {
    const discoveryBehaviors: RepBehavior[] = [
      'asked_about_problem_cost',
      'asked_about_current_spend',
      'asked_concrete_discovery',
      'asked_trigger_question',
      'asked_follow_up',
      'asked_generic_question'
    ];

    const positioningBehaviors: RepBehavior[] = [
      'provides_specific_proof',
      'connects_to_specific_problem',
      'made_hyperbolic_claim',
      'made_unearned_roi_claim',
      'pitched_prematurely'
    ];

    const rapportBehaviors: RepBehavior[] = [
      'shows_specific_understanding',
      'summarizes_understanding',
      'validates_concern',
      'asks_permission'
    ];

    const negativeBehaviors: RepBehavior[] = [
      'contradicts_self',
      'criticizes_current_solution',
      'pushes_after_rejection',
      'overtalks',
      'ignores_warm_context',
      'dodges_legitimacy_question'
    ];

    const selected: RepBehavior[] = [];

    // Select highest priority from each category
    const discoveryMatch = this.selectHighestPriority(behaviors, discoveryBehaviors);
    if (discoveryMatch) selected.push(discoveryMatch);

    const positioningMatch = this.selectHighestPriority(behaviors, positioningBehaviors);
    if (positioningMatch) selected.push(positioningMatch);

    const rapportMatch = this.selectHighestPriority(behaviors, rapportBehaviors);
    if (rapportMatch) selected.push(rapportMatch);

    const negativeMatch = this.selectHighestPriority(behaviors, negativeBehaviors);
    if (negativeMatch) selected.push(negativeMatch);

    // Add any behaviors not in categories
    const categorized = [...discoveryBehaviors, ...positioningBehaviors, ...rapportBehaviors, ...negativeBehaviors];
    const uncategorized = behaviors.filter(b => !categorized.includes(b));
    selected.push(...uncategorized);

    return selected;
  }

  /**
   * Select highest priority behavior from a list
   */
  private static selectHighestPriority(detected: RepBehavior[], priority: RepBehavior[]): RepBehavior | null {
    for (const behavior of priority) {
      if (detected.includes(behavior)) {
        return behavior;
      }
    }
    return null;
  }

  /**
   * Map rep behaviors to state changes
   */
  private static getStateChangeForBehavior(behavior: RepBehavior): StateChange {
    const changes: Record<RepBehavior, StateChange> = {
      // Discovery behaviors
      asked_trigger_question: {
        clarity: 8,
        trust: 5,
        defensiveness: -5,
        curiosity: 8,
        openness: 5
      },
      asked_concrete_discovery: {
        clarity: 10,
        trust: 5,
        valueClarity: 8
      },
      asked_generic_question: {
        patience: -5,
        callFatigue: 5,
        openness: -3
      },
      asked_follow_up: {
        trust: 5,
        clarity: 5,
        curiosity: 3
      },
      asked_about_current_spend: {
        clarity: 10,
        trust: 5,
        valueClarity: 8
      },
      asked_about_problem_cost: {
        perceivedProblemSeverity: 8,
        perceivedUrgency: 5,
        clarity: 10,
        trust: 5
      },

      // Positioning behaviors
      pitched_prematurely: {
        defensiveness: 15,
        trust: -8,
        callFatigue: 10,
        openness: -10
      },
      made_unearned_roi_claim: {
        trustInClaims: -10,
        defensiveness: 8,
        perceivedRisk: 5
      },
      made_hyperbolic_claim: {
        trustInClaims: -15,
        trust: -8,
        perceivedRisk: 10
      },
      provides_specific_proof: {
        trustInClaims: 12,
        perceivedSolutionFit: 8,
        valueClarity: 10,
        perceivedRisk: -8
      },
      connects_to_specific_problem: {
        perceivedSolutionFit: 15,
        curiosity: 10,
        trust: 8,
        perceivedProblemSeverity: 5
      },

      // Rapport behaviors
      shows_specific_understanding: {
        trust: 10,
        defensiveness: -10,
        curiosity: 8,
        perceivedSolutionFit: 10
      },
      validates_concern: {
        defensiveness: -8,
        trust: 8,
        openness: 5
      },
      answers_question_directly: {
        clarity: 10,              // Marcus's question was answered
        trust: 5,                 // Rep is being responsive
        defensiveness: -5,
        curiosity: -3             // Question satisfied (slightly)
      },
      asks_permission: {
        defensiveness: -5,
        trust: 5,
        openness: 3
      },
      summarizes_understanding: {
        clarity: 10,
        trust: 8,
        defensiveness: -5,
        openness: 5
      },

      // Negative behaviors
      overtalks: {
        patience: -10,
        callFatigue: 12,
        openness: -8,
        defensiveness: 5
      },
      contradicts_self: {
        trust: -20,
        defensiveness: 15,
        perceivedRisk: 15
      },
      criticizes_current_solution: {
        defensiveness: 20,
        trust: -10,
        openness: -8
      },
      pushes_after_rejection: {
        defensiveness: 20,
        trust: -15,
        patience: -15,
        callFatigue: 15
      },
      ignores_exit_signal: {
        patience: -25,              // Marcus explicitly said he's not interested/has to go
        trust: -12,                 // Rep doesn't respect boundaries
        defensiveness: 15,
        callFatigue: 20,            // Exhausting to be ignored
        autonomyDefense: 12         // Triggers reactance - "I said no!"
      },
      ignores_warm_context: {
        trust: -8,
        defensiveness: 10,
        openness: -5
      },
      dodges_legitimacy_question: {
        trust: -15,
        defensiveness: 15,
        perceivedRisk: 10
      },
      handles_legitimacy_directly: {
        trust: 10,
        defensiveness: -8,
        openness: 8
      },

      // Warm-lead specific
      validated_status_quo: {
        trust: 7,
        defensiveness: -8,
        openness: 5
      },
      asked_too_large_commitment: {
        defensiveness: 10,
        perceivedRisk: 8,
        patience: -5
      },
      
      // Warm-lead psychology (research-backed)
      violates_autonomy: {
        autonomyDefense: 15,        // Reactance theory: pushes back when cornered
        defensiveness: 12,
        trust: -8,
        openness: -10,
        patience: -8
      },
      creates_cognitive_overload: {
        cognitiveLoad: 20,          // Cognitive load theory: too much info = shutdown
        clarity: -15,
        callFatigue: 12,
        patience: -10,
        defensiveness: 8
      },
      triggers_status_quo_shield: {
        statusQuoShieldActive: true, // Status quo bias: protects current solution
        defensiveness: 15,
        trust: -10,
        openness: -12,
        perceivedRisk: 10
      },
      demonstrates_relevance: {
        relevanceConfidence: 15,     // Source credibility: rep understands my world
        trust: 10,
        defensiveness: -10,
        curiosity: 10,
        perceivedSolutionFit: 8
      },
      reduces_perceived_risk: {
        riskPerception: -12,         // Loss aversion: makes change feel safer
        defensiveness: -8,
        openness: 8,
        perceivedRisk: -10,
        willingnessToStretchBudget: 5
      },
      explores_ambivalence: {
        defensiveness: -10,          // Motivational interviewing: surfaces both sides
        trust: 8,
        openness: 10,
        curiosity: 5
      },
      enables_self_persuasion: {
        perceivedProblemSeverity: 12, // Commitment consistency: buyer owns the insight
        perceivedUrgency: 8,
        trust: 10,
        confidenceInNeed: 10
      }
    };

    return changes[behavior] || {};
  }

  /**
   * Apply state change deltas to buyer state
   */
  private static applyStateChange(state: BuyerState, change: StateChange): BuyerState {
    const next = structuredClone(state);

    // Apply emotional changes
    if (change.openness !== undefined) {
      next.emotional.openness += change.openness;
    }
    if (change.patience !== undefined) {
      next.emotional.patience += change.patience;
    }
    if (change.defensiveness !== undefined) {
      next.emotional.defensiveness += change.defensiveness;
    }
    if (change.trust !== undefined) {
      next.emotional.trust += change.trust;
    }
    if (change.curiosity !== undefined) {
      next.emotional.curiosity += change.curiosity;
    }

    // Apply belief changes
    if (change.perceivedProblemSeverity !== undefined) {
      next.belief.perceivedProblemSeverity += change.perceivedProblemSeverity;
    }
    if (change.perceivedSolutionFit !== undefined) {
      next.belief.perceivedSolutionFit += change.perceivedSolutionFit;
    }
    if (change.perceivedUrgency !== undefined) {
      next.belief.perceivedUrgency += change.perceivedUrgency;
    }
    if (change.trustInClaims !== undefined) {
      next.belief.trustInClaims += change.trustInClaims;
    }
    if (change.perceivedRisk !== undefined) {
      next.belief.perceivedRisk += change.perceivedRisk;
    }
    if (change.switchingFriction !== undefined) {
      next.belief.switchingFriction += change.switchingFriction;
    }
    if (change.confidenceInNeed !== undefined) {
      next.belief.confidenceInNeed += change.confidenceInNeed;
    }

    // Apply economic changes
    if (change.budgetPressure !== undefined) {
      next.economic.budgetPressure += change.budgetPressure;
    }
    if (change.willingnessToStretchBudget !== undefined) {
      next.economic.willingnessToStretchBudget += change.willingnessToStretchBudget;
    }
    if (change.valueClarity !== undefined) {
      next.economic.valueClarity += change.valueClarity;
    }

    // Apply conversation changes
    if (change.callFatigue !== undefined) {
      next.conversation.callFatigue += change.callFatigue;
    }
    if (change.clarity !== undefined) {
      next.conversation.clarity += change.clarity;
    }
    
    // Apply warm-lead psychology changes
    if (change.autonomyDefense !== undefined) {
      next.conversation.autonomyDefense += change.autonomyDefense;
    }
    if (change.statusQuoShieldActive !== undefined) {
      next.conversation.statusQuoShieldActive = change.statusQuoShieldActive;
    }
    if (change.cognitiveLoad !== undefined) {
      next.conversation.cognitiveLoad += change.cognitiveLoad;
    }
    if (change.relevanceConfidence !== undefined) {
      next.conversation.relevanceConfidence += change.relevanceConfidence;
    }
    if (change.riskPerception !== undefined) {
      next.conversation.riskPerception += change.riskPerception;
    }

    return next;
  }

  /**
   * Apply dynamic interactions between state components.
   * This is where the "web of numbers" comes alive.
   */
  private static applyDynamicInteractions(state: BuyerState): BuyerState {
    const next = structuredClone(state);

    // 1. Trust affects value perception
    // Derive perceived savings from claimed savings (never mutate the base value)
    if (next.economic.claimedPotentialSavingsMonthly !== undefined) {
      const trustMultiplier = next.belief.trustInClaims / 100;
      const relevanceMultiplier = next.belief.perceivedSolutionFit / 100;
      const clarityMultiplier = next.economic.valueClarity / 100;
      
      next.economic.perceivedPotentialSavingsMonthly =
        next.economic.claimedPotentialSavingsMonthly * trustMultiplier * relevanceMultiplier * clarityMultiplier;
    }

    // 2. Relevance affects budget flexibility
    // If solution fits well and problem is severe, budget becomes flexible
    if (next.belief.perceivedSolutionFit > 80 && next.belief.perceivedProblemSeverity > 70) {
      next.economic.willingnessToStretchBudget = Math.min(
        100,
        next.economic.willingnessToStretchBudget + 25
      );
    }

    // 3. Problem severity affects patience
    // If problem is vague, Marcus gets annoyed faster
    if (next.belief.perceivedProblemSeverity < 30) {
      next.emotional.patience = Math.max(0, next.emotional.patience - 10);
    }

    // 4. Low trust + high defensiveness = increased risk perception
    if (next.emotional.trust < 40 && next.emotional.defensiveness > 60) {
      next.belief.perceivedRisk = Math.min(100, next.belief.perceivedRisk + 10);
    }

    // 5. High clarity + high solution fit = increased confidence in need
    if (next.conversation.clarity > 70 && next.belief.perceivedSolutionFit > 70) {
      next.belief.confidenceInNeed = Math.min(100, next.belief.confidenceInNeed + 15);
    }

    return next;
  }

  /**
   * Clamp all state values to 0-100 range
   */
  private static clampState(state: BuyerState): BuyerState {
    const clamp = (value: number) => Math.max(0, Math.min(100, value));

    return {
      ...state,
      emotional: {
        openness: clamp(state.emotional.openness),
        patience: clamp(state.emotional.patience),
        defensiveness: clamp(state.emotional.defensiveness),
        trust: clamp(state.emotional.trust),
        curiosity: clamp(state.emotional.curiosity)
      },
      belief: {
        perceivedProblemSeverity: clamp(state.belief.perceivedProblemSeverity),
        perceivedSolutionFit: clamp(state.belief.perceivedSolutionFit),
        perceivedUrgency: clamp(state.belief.perceivedUrgency),
        trustInClaims: clamp(state.belief.trustInClaims),
        perceivedRisk: clamp(state.belief.perceivedRisk),
        switchingFriction: clamp(state.belief.switchingFriction),
        confidenceInNeed: clamp(state.belief.confidenceInNeed)
      },
      economic: {
        ...state.economic,
        budgetPressure: clamp(state.economic.budgetPressure),
        willingnessToStretchBudget: clamp(state.economic.willingnessToStretchBudget),
        valueClarity: clamp(state.economic.valueClarity)
      },
      conversation: {
        ...state.conversation,
        callFatigue: clamp(state.conversation.callFatigue),
        clarity: clamp(state.conversation.clarity),
        autonomyDefense: clamp(state.conversation.autonomyDefense),
        cognitiveLoad: clamp(state.conversation.cognitiveLoad),
        relevanceConfidence: clamp(state.conversation.relevanceConfidence),
        riskPerception: clamp(state.conversation.riskPerception)
      },
      process: {
        decisionAuthority: clamp(state.process.decisionAuthority),
        influenceLevel: clamp(state.process.influenceLevel),
        knowsDecisionProcess: clamp(state.process.knowsDecisionProcess),
        accessToEconomicBuyer: clamp(state.process.accessToEconomicBuyer)
      }
    };
  }

  /**
   * Get a human-readable explanation of what changed
   */
  static explainChanges(before: BuyerState, after: BuyerState, behaviors: RepBehavior[]): string {
    const changes: string[] = [];

    // Find biggest changes
    const emotionalDelta = Math.abs(after.emotional.trust - before.emotional.trust);
    const beliefDelta = Math.abs(after.belief.perceivedSolutionFit - before.belief.perceivedSolutionFit);
    const economicDelta = Math.abs(after.economic.valueClarity - before.economic.valueClarity);

    if (emotionalDelta > 5) {
      const direction = after.emotional.trust > before.emotional.trust ? 'increased' : 'decreased';
      changes.push(`Trust ${direction} by ${emotionalDelta.toFixed(0)} points`);
    }

    if (beliefDelta > 5) {
      const direction = after.belief.perceivedSolutionFit > before.belief.perceivedSolutionFit ? 'increased' : 'decreased';
      changes.push(`Solution fit ${direction} by ${beliefDelta.toFixed(0)} points`);
    }

    if (economicDelta > 5) {
      const direction = after.economic.valueClarity > before.economic.valueClarity ? 'increased' : 'decreased';
      changes.push(`Value clarity ${direction} by ${economicDelta.toFixed(0)} points`);
    }

    if (changes.length === 0) {
      return 'Minor state adjustments';
    }

    return changes.join(', ');
  }
}

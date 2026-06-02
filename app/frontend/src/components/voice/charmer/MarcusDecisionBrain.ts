/**
 * MarcusDecisionBrain.ts
 * 
 * Implementation of Marcus's Decision Brain - a weighted buyer decision system.
 * 
 * Key Principles:
 * 1. Code maintains the state, LLM interprets it conversationally
 * 2. Concrete economic anchors, not vague "low/medium/high"
 * 3. Weighted factors guide decisions, not deterministic formulas
 * 4. Six macro exit drivers, not 30 micro reasons
 * 5. State updates based on detected rep behaviors
 */

import {
  MarcusDecisionBrain as DecisionBrainState,
  BusinessReality,
  BuyerBeliefs,
  EconomicPerception,
  ConversationState,
  RepBehavior,
  StateChange,
  BuyingMomentum,
  BuyingDecision,
  ExitDecision,
  ExitDriver,
  StateBasedFeedback
} from './types/MarcusDecisionBrain.types';

export class MarcusDecisionBrain {
  private state: DecisionBrainState;
  private stateHistory: Array<{ turn: number; state: DecisionBrainState }> = [];
  private behaviorHistory: Array<{ turn: number; behavior: RepBehavior; change: StateChange }> = [];

  constructor(initialState: Partial<DecisionBrainState>) {
    this.state = this.initializeState(initialState);
  }

  /**
   * Initialize the decision brain with scenario-specific values
   */
  private initializeState(initial: Partial<DecisionBrainState>): DecisionBrainState {
    return {
      businessReality: {
        companySize: initial.businessReality?.companySize,
        teamSize: initial.businessReality?.teamSize,
        industry: initial.businessReality?.industry,
        currentSolution: initial.businessReality?.currentSolution,
        currentSpendMonthly: initial.businessReality?.currentSpendMonthly,
        currentSatisfactionScore: initial.businessReality?.currentSatisfactionScore ?? 50,
        contractLockedUntil: initial.businessReality?.contractLockedUntil,
        comfortableBudgetMonthly: initial.businessReality?.comfortableBudgetMonthly,
        stretchBudgetMonthly: initial.businessReality?.stretchBudgetMonthly,
        approvalNeededAbove: initial.businessReality?.approvalNeededAbove,
        knownProblem: initial.businessReality?.knownProblem,
        actualProblemCostMonthly: initial.businessReality?.actualProblemCostMonthly,
        problemFrequency: initial.businessReality?.problemFrequency ?? 'occasional',
        decisionAuthority: initial.businessReality?.decisionAuthority ?? 70,
        politicalComplexity: initial.businessReality?.politicalComplexity ?? 30
      },
      buyerBeliefs: {
        perceivedProblemSeverity: initial.buyerBeliefs?.perceivedProblemSeverity ?? 40,
        perceivedUrgency: initial.buyerBeliefs?.perceivedUrgency ?? 35,
        confidenceInNeed: initial.buyerBeliefs?.confidenceInNeed ?? 40,
        perceivedSolutionFit: initial.buyerBeliefs?.perceivedSolutionFit ?? 20,
        perceivedRisk: initial.buyerBeliefs?.perceivedRisk ?? 55,
        switchingFriction: initial.buyerBeliefs?.switchingFriction ?? 60,
        trustInRep: initial.buyerBeliefs?.trustInRep ?? 50,
        trustInProductClaims: initial.buyerBeliefs?.trustInProductClaims ?? 30,
        confidenceInVendor: initial.buyerBeliefs?.confidenceInVendor ?? 40
      },
      economicPerception: {
        perceivedCurrentWasteMonthly: initial.economicPerception?.perceivedCurrentWasteMonthly,
        confidenceInWasteEstimate: initial.economicPerception?.confidenceInWasteEstimate ?? 30,
        perceivedPotentialSavingsMonthly: initial.economicPerception?.perceivedPotentialSavingsMonthly,
        perceivedCostMonthly: initial.economicPerception?.perceivedCostMonthly,
        perceivedSetupCost: initial.economicPerception?.perceivedSetupCost,
        budgetPressure: initial.economicPerception?.budgetPressure ?? 60,
        willingnessToStretchBudget: initial.economicPerception?.willingnessToStretchBudget ?? 30,
        paybackToleranceMonths: initial.economicPerception?.paybackToleranceMonths ?? 6,
        valueClarity: initial.economicPerception?.valueClarity ?? 20
      },
      conversationState: {
        engagement: initial.conversationState?.engagement ?? 45,
        patience: initial.conversationState?.patience ?? 65,
        defensiveness: initial.conversationState?.defensiveness ?? 40,
        curiosity: initial.conversationState?.curiosity ?? 35,
        clarity: initial.conversationState?.clarity ?? 30,
        callFatigue: initial.conversationState?.callFatigue ?? 0
      }
    };
  }

  /**
   * Apply a state change based on detected rep behavior
   */
  applyBehavior(behavior: RepBehavior, turnNumber: number): StateChange {
    const change = this.getStateChangeForBehavior(behavior);
    this.applyStateChange(change);
    
    this.behaviorHistory.push({ turn: turnNumber, behavior, change });
    this.stateHistory.push({ turn: turnNumber, state: { ...this.state } });
    
    console.log(`🧠 [DecisionBrain] Turn ${turnNumber}: ${behavior}`);
    console.log(`   State changes:`, change);
    
    return change;
  }

  /**
   * Map rep behaviors to state changes
   */
  private getStateChangeForBehavior(behavior: RepBehavior): StateChange {
    const changes: Record<RepBehavior, StateChange> = {
      asks_trigger_question: {
        clarity: 8,
        trustInRep: 5,
        defensiveness: -5,
        curiosity: 8,
        engagement: 5
      },
      makes_unearned_roi_claim: {
        trustInProductClaims: -10,
        defensiveness: 8,
        perceivedRisk: 5
      },
      connects_to_specific_problem: {
        perceivedSolutionFit: 15,
        curiosity: 10,
        trustInRep: 8,
        perceivedProblemSeverity: 5
      },
      pitches_prematurely: {
        defensiveness: 15,
        trustInRep: -8,
        callFatigue: 10,
        engagement: -10
      },
      asks_generic_question: {
        patience: -5,
        callFatigue: 5,
        engagement: -3
      },
      shows_specific_understanding: {
        trustInRep: 10,
        defensiveness: -10,
        curiosity: 8,
        perceivedSolutionFit: 10
      },
      makes_hyperbolic_claim: {
        trustInProductClaims: -15,
        trustInRep: -8,
        perceivedRisk: 10
      },
      contradicts_self: {
        trustInRep: -20,
        defensiveness: 15,
        perceivedRisk: 15
      },
      criticizes_current_solution: {
        defensiveness: 20,
        trustInRep: -10,
        engagement: -8
      },
      overtalks: {
        patience: -10,
        callFatigue: 12,
        engagement: -8,
        defensiveness: 5
      },
      asks_about_current_spend: {
        clarity: 10,
        trustInRep: 5,
        valueClarity: 8
      },
      asks_about_problem_cost: {
        perceivedProblemSeverity: 8,
        perceivedUrgency: 5,
        clarity: 10,
        trustInRep: 5
      },
      validates_concern: {
        defensiveness: -8,
        trustInRep: 8,
        engagement: 5
      },
      pushes_after_rejection: {
        defensiveness: 20,
        trustInRep: -15,
        patience: -15,
        callFatigue: 15
      },
      provides_specific_proof: {
        trustInProductClaims: 12,
        perceivedSolutionFit: 8,
        valueClarity: 10,
        perceivedRisk: -8
      },
      asks_permission: {
        defensiveness: -5,
        trustInRep: 5,
        engagement: 3
      },
      summarizes_understanding: {
        clarity: 10,
        trustInRep: 8,
        defensiveness: -5,
        engagement: 5
      }
    };

    return changes[behavior] || {};
  }

  /**
   * Apply state change deltas to the current state
   */
  private applyStateChange(change: StateChange): void {
    const clamp = (value: number, min: number = 0, max: number = 100) => 
      Math.max(min, Math.min(max, value));

    // Update buyer beliefs
    if (change.trustInRep !== undefined) {
      this.state.buyerBeliefs.trustInRep = clamp(
        this.state.buyerBeliefs.trustInRep + change.trustInRep
      );
    }
    if (change.trustInProductClaims !== undefined) {
      this.state.buyerBeliefs.trustInProductClaims = clamp(
        this.state.buyerBeliefs.trustInProductClaims + change.trustInProductClaims
      );
    }
    if (change.perceivedSolutionFit !== undefined) {
      this.state.buyerBeliefs.perceivedSolutionFit = clamp(
        this.state.buyerBeliefs.perceivedSolutionFit + change.perceivedSolutionFit
      );
    }
    if (change.perceivedProblemSeverity !== undefined) {
      this.state.buyerBeliefs.perceivedProblemSeverity = clamp(
        this.state.buyerBeliefs.perceivedProblemSeverity + change.perceivedProblemSeverity
      );
    }
    if (change.perceivedUrgency !== undefined) {
      this.state.buyerBeliefs.perceivedUrgency = clamp(
        this.state.buyerBeliefs.perceivedUrgency + change.perceivedUrgency
      );
    }
    if (change.perceivedRisk !== undefined) {
      this.state.buyerBeliefs.perceivedRisk = clamp(
        this.state.buyerBeliefs.perceivedRisk + change.perceivedRisk
      );
    }

    // Update conversation state
    if (change.clarity !== undefined) {
      this.state.conversationState.clarity = clamp(
        this.state.conversationState.clarity + change.clarity
      );
    }
    if (change.defensiveness !== undefined) {
      this.state.conversationState.defensiveness = clamp(
        this.state.conversationState.defensiveness + change.defensiveness
      );
    }
    if (change.curiosity !== undefined) {
      this.state.conversationState.curiosity = clamp(
        this.state.conversationState.curiosity + change.curiosity
      );
    }
    if (change.engagement !== undefined) {
      this.state.conversationState.engagement = clamp(
        this.state.conversationState.engagement + change.engagement
      );
    }
    if (change.patience !== undefined) {
      this.state.conversationState.patience = clamp(
        this.state.conversationState.patience + change.patience
      );
    }
    if (change.callFatigue !== undefined) {
      this.state.conversationState.callFatigue = clamp(
        this.state.conversationState.callFatigue + change.callFatigue
      );
    }

    // Update economic perception
    if (change.valueClarity !== undefined) {
      this.state.economicPerception.valueClarity = clamp(
        this.state.economicPerception.valueClarity + change.valueClarity
      );
    }
    if (change.willingnessToStretchBudget !== undefined) {
      this.state.economicPerception.willingnessToStretchBudget = clamp(
        this.state.economicPerception.willingnessToStretchBudget + change.willingnessToStretchBudget
      );
    }

    // Dynamic interactions - trust affects value perception
    if (change.trustInProductClaims !== undefined && this.state.economicPerception.perceivedPotentialSavingsMonthly) {
      const trustMultiplier = this.state.buyerBeliefs.trustInProductClaims / 100;
      this.state.economicPerception.perceivedPotentialSavingsMonthly *= trustMultiplier;
    }

    // Relevance affects budget flexibility
    if (this.state.buyerBeliefs.perceivedSolutionFit > 80 && 
        this.state.buyerBeliefs.perceivedProblemSeverity > 70) {
      this.state.economicPerception.willingnessToStretchBudget = clamp(
        this.state.economicPerception.willingnessToStretchBudget + 25
      );
    }

    // Problem severity affects patience
    if (this.state.buyerBeliefs.perceivedProblemSeverity < 30 && change.clarity && change.clarity < 0) {
      this.state.conversationState.patience = clamp(
        this.state.conversationState.patience - 15
      );
    }
  }

  /**
   * Calculate buying momentum from current state
   */
  calculateBuyingMomentum(): BuyingMomentum {
    const { buyerBeliefs, economicPerception, conversationState, businessReality } = this.state;

    // Positive forces
    const problemSeverity = buyerBeliefs.perceivedProblemSeverity;
    const relevanceFit = buyerBeliefs.perceivedSolutionFit;
    const trust = (buyerBeliefs.trustInRep + buyerBeliefs.trustInProductClaims) / 2;
    const urgency = buyerBeliefs.perceivedUrgency;
    const valueClarity = economicPerception.valueClarity;

    // Negative forces
    const perceivedRisk = buyerBeliefs.perceivedRisk;
    const switchingFriction = buyerBeliefs.switchingFriction;
    const budgetPressure = economicPerception.budgetPressure;
    const decisionComplexity = businessReality.politicalComplexity || 30;
    const callFatigue = conversationState.callFatigue;

    // Calculate net momentum
    const positiveSum = problemSeverity + relevanceFit + trust + urgency + valueClarity;
    const negativeSum = perceivedRisk + switchingFriction + budgetPressure + decisionComplexity + callFatigue;
    const netMomentum = positiveSum - negativeSum;

    // Find dominant blocker and driver
    const blockers = [
      { name: 'perceivedRisk', value: perceivedRisk },
      { name: 'switchingFriction', value: switchingFriction },
      { name: 'budgetPressure', value: budgetPressure },
      { name: 'decisionComplexity', value: decisionComplexity },
      { name: 'callFatigue', value: callFatigue }
    ];
    const dominantBlocker = blockers.reduce((max, b) => b.value > max.value ? b : max).name;

    const drivers = [
      { name: 'problemSeverity', value: problemSeverity },
      { name: 'relevanceFit', value: relevanceFit },
      { name: 'trust', value: trust },
      { name: 'urgency', value: urgency },
      { name: 'valueClarity', value: valueClarity }
    ];
    const dominantDriver = drivers.reduce((max, d) => d.value > max.value ? d : max).name;

    // Determine likely response mode
    let likelyResponseMode: BuyingMomentum['likelyResponseMode'];
    if (netMomentum > 100) {
      likelyResponseMode = 'open';
    } else if (netMomentum > 0) {
      likelyResponseMode = 'curious';
    } else if (netMomentum > -100) {
      likelyResponseMode = 'guarded_objection';
    } else if (netMomentum > -200) {
      likelyResponseMode = 'hard_objection';
    } else {
      likelyResponseMode = 'exit';
    }

    return {
      problemSeverity,
      relevanceFit,
      trust,
      urgency,
      valueClarity,
      perceivedRisk,
      switchingFriction,
      budgetPressure,
      decisionComplexity,
      callFatigue,
      netMomentum,
      likelyResponseMode,
      dominantBlocker,
      dominantDriver
    };
  }

  /**
   * Determine if Marcus should exit and why
   */
  shouldExit(): ExitDecision {
    const { buyerBeliefs, conversationState, economicPerception } = this.state;
    const momentum = this.calculateBuyingMomentum();

    // 1. Legitimacy failure
    if (buyerBeliefs.trustInRep < 25 && conversationState.defensiveness > 75) {
      return {
        shouldExit: true,
        driver: 'legitimacy_failure',
        dominantBlocker: 'trustInRep',
        exitMessage: "How did you get my information? I didn't sign up for this."
      };
    }

    // 2. Relevance failure
    if (buyerBeliefs.perceivedSolutionFit < 30 && conversationState.curiosity < 25) {
      return {
        shouldExit: true,
        driver: 'relevance_failure',
        dominantBlocker: 'perceivedSolutionFit',
        exitMessage: "This doesn't sound like something we need."
      };
    }

    // 3. Economic failure
    if (economicPerception.budgetPressure > 80 && 
        buyerBeliefs.perceivedProblemSeverity < 60 &&
        buyerBeliefs.trustInProductClaims < 60) {
      return {
        shouldExit: true,
        driver: 'economic_failure',
        dominantBlocker: 'budgetPressure',
        exitMessage: "That's way more than we could justify."
      };
    }

    // 4. Timing failure
    if (buyerBeliefs.perceivedUrgency < 35) {
      return {
        shouldExit: true,
        driver: 'timing_failure',
        dominantBlocker: 'perceivedUrgency',
        exitMessage: "Maybe later this year. Not a priority right now."
      };
    }

    // 5. Authority failure
    if ((this.state.businessReality.decisionAuthority || 0) < 30) {
      return {
        shouldExit: true,
        driver: 'authority_failure',
        dominantBlocker: 'decisionAuthority',
        exitMessage: "I'm not the person who handles that. You'd need to talk to [other person]."
      };
    }

    // 6. Conversation fatigue
    if (conversationState.patience < 20 || conversationState.callFatigue > 85) {
      return {
        shouldExit: true,
        driver: 'conversation_fatigue',
        dominantBlocker: momentum.dominantBlocker,
        exitMessage: "Listen, I have to go."
      };
    }

    return { shouldExit: false };
  }

  /**
   * Get current state for prompt injection
   */
  getStateForPrompt(): string {
    const { businessReality, buyerBeliefs, economicPerception, conversationState } = this.state;
    const momentum = this.calculateBuyingMomentum();

    return `
YOUR CURRENT MENTAL STATE (hidden from rep):

BUSINESS REALITY:
${businessReality.currentSolution ? `- Current solution: ${businessReality.currentSolution} ($${businessReality.currentSpendMonthly}/month, ${businessReality.currentSatisfactionScore}/100 satisfaction)` : ''}
${businessReality.comfortableBudgetMonthly ? `- Comfortable budget: $${businessReality.comfortableBudgetMonthly}/month` : ''}
${businessReality.stretchBudgetMonthly ? `- Stretch budget: $${businessReality.stretchBudgetMonthly}/month (if value is clear)` : ''}
${businessReality.approvalNeededAbove ? `- Need approval above: $${businessReality.approvalNeededAbove}` : ''}
${businessReality.actualProblemCostMonthly ? `- Actual problem cost: ~$${businessReality.actualProblemCostMonthly}/month (you may not fully realize this)` : ''}

YOUR CURRENT BELIEFS:
- Problem severity: ${buyerBeliefs.perceivedProblemSeverity}/100
- Solution fit: ${buyerBeliefs.perceivedSolutionFit}/100
- Urgency: ${buyerBeliefs.perceivedUrgency}/100
- Trust in rep: ${buyerBeliefs.trustInRep}/100
- Trust in claims: ${buyerBeliefs.trustInProductClaims}/100
- Perceived risk: ${buyerBeliefs.perceivedRisk}/100

CONVERSATION STATE:
- Engagement: ${conversationState.engagement}/100
- Patience: ${conversationState.patience}/100
- Defensiveness: ${conversationState.defensiveness}/100
- Curiosity: ${conversationState.curiosity}/100
- Clarity: ${conversationState.clarity}/100
- Call fatigue: ${conversationState.callFatigue}/100

BUYING MOMENTUM: ${momentum.netMomentum.toFixed(0)} (${momentum.likelyResponseMode})
- Main blocker: ${momentum.dominantBlocker}
- Main driver: ${momentum.dominantDriver}

Respond naturally based on these numbers. If solution fit is low, be skeptical. If trust is low, be guarded. If patience is low, wrap up.
`;
  }

  /**
   * Get current state snapshot
   */
  getState(): DecisionBrainState {
    return { ...this.state };
  }

  /**
   * Get behavior history for feedback generation
   */
  getBehaviorHistory(): Array<{ turn: number; behavior: RepBehavior; change: StateChange }> {
    return [...this.behaviorHistory];
  }
}

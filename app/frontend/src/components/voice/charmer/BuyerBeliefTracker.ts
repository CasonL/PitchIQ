/**
 * BuyerBeliefTracker
 * 
 * Tracks Marcus's evolving beliefs about the product, rep, and value proposition.
 * Updates every turn based on conversation quality and content.
 * Used by BuyerStateTree to score which buyer states are most realistic next.
 * 
 * Phase 1: 6 simple dimensions
 * Phase 2+: Expand with authority, budget fit, current solution attachment, risk sensitivity
 */

export interface BuyerBeliefState {
  understandsProduct: number;    // 0-10: Does Marcus get what's being sold?
  seesRelevance: number;          // 0-10: Does it apply to his business?
  trustsRep: number;              // 0-10: Does he trust the caller?
  painClarity: number;            // 0-10: Does he understand his own pain?
  valueClarity: number;           // 0-10: Does he see the value proposition?
  urgency: number;                // 0-10: Does he feel time pressure?
  
  updatedTurn: number;
}

export class BuyerBeliefTracker {
  private beliefState: BuyerBeliefState;
  private currentTurn: number = 0;
  
  // Movement caps per turn to prevent too-rapid belief changes
  private readonly MAX_INCREASE_PER_TURN = 2.5;
  private readonly MAX_DECREASE_PER_TURN = -1.5;
  
  constructor() {
    this.beliefState = {
      understandsProduct: 0,
      seesRelevance: 0,
      trustsRep: 0,
      painClarity: 0,
      valueClarity: 0,
      urgency: 0,
      updatedTurn: 0
    };
  }
  
  /**
   * Update belief state based on user utterance and conversation context
   */
  updateBeliefs(
    userUtterance: string,
    turnNumber: number,
    repQuality: {
      buildingRapport?: boolean;
      askedDiscovery?: boolean;
      sharingValue?: boolean;
      demonstratingProof?: boolean;
    },
    productCategory: string | null
  ): BuyerBeliefState {
    this.currentTurn = turnNumber;
    
    const previousState = { ...this.beliefState };
    
    // Track per-dimension changes for capping
    const changes: Record<keyof Omit<BuyerBeliefState, 'updatedTurn'>, number> = {
      understandsProduct: 0,
      seesRelevance: 0,
      trustsRep: 0,
      painClarity: 0,
      valueClarity: 0,
      urgency: 0
    };
    
    // Update each belief dimension (passing changes object)
    this.updateProductUnderstanding(userUtterance, productCategory, changes);
    this.updateRelevance(userUtterance, productCategory, repQuality, changes);
    this.updateTrust(userUtterance, repQuality, turnNumber, changes);
    this.updatePainClarity(userUtterance, repQuality, changes);
    this.updateValueClarity(userUtterance, repQuality, changes);
    this.updateUrgency(userUtterance, repQuality, changes);
    
    // Apply capped changes
    this.applyChangesWithCaps(changes);
    
    this.beliefState.updatedTurn = turnNumber;
    
    this.logUpdate(previousState, repQuality);
    
    return { ...this.beliefState };
  }
  
  /**
   * Get current belief state
   */
  getCurrentBeliefs(): BuyerBeliefState {
    return { ...this.beliefState };
  }
  
  /**
   * Update product understanding based on explanation quality
   */
  private updateProductUnderstanding(
    utterance: string,
    category: string | null,
    changes: Record<string, number>
  ): void {
    const lower = utterance.toLowerCase();
    
    // Clear product description increases understanding
    const hasProductDescription = /\b(we (offer|provide|sell|have)|our (product|platform|solution|tool|software)|this (is|does|helps)|designed (for|to))\b/i.test(utterance);
    if (hasProductDescription) {
      changes.understandsProduct += 2;
    }
    
    // Feature explanations increase understanding
    const hasFeatureExplanation = /\b(integrat(e|ion)|automat(e|ion)|real-time|dashboard|analytics|ai-powered|custom)\b/i.test(lower);
    if (hasFeatureExplanation) {
      changes.understandsProduct += 1.5;
    }
    
    // Use case examples increase understanding significantly
    const hasUseCase = /\b(for example|specifically|such as|like when|imagine)\b/i.test(lower);
    if (hasUseCase) {
      changes.understandsProduct += 2.5;
    }
    
    // Category detection adds baseline understanding (one-time boost)
    if (category && this.beliefState.understandsProduct < 3) {
      changes.understandsProduct += (3 - this.beliefState.understandsProduct);
    }
    
    // Vague language reduces understanding
    const isVague = /\b(stuff|thing|helps you|make things better|optimize|solutions)\b/i.test(lower);
    if (isVague && !hasProductDescription) {
      changes.understandsProduct -= 1;
    }
    
    // Jargon-heavy language without explanation reduces understanding
    const hasJargon = /\b(synergy|leverage|paradigm|holistic|cutting-edge|next-generation|revolutionary)\b/i.test(lower);
    const hasExplanation = hasUseCase || /\b(which means|in other words|basically|essentially)\b/i.test(lower);
    if (hasJargon && !hasExplanation) {
      changes.understandsProduct -= 0.5;
    }
  }
  
  /**
   * Update relevance based on persona fit and pain point alignment
   */
  private updateRelevance(
    utterance: string,
    category: string | null,
    repQuality: any,
    changes: Record<string, number>
  ): void {
    const lower = utterance.toLowerCase();
    
    // Mentions of Marcus's industry/role increase relevance
    const mentionsRelevantContext = /\b(sales|b2b|saas|team|company like yours|businesses like|similar to you)\b/i.test(lower);
    if (mentionsRelevantContext) {
      changes.seesRelevance += 2;
    }
    
    // Specific pain points that resonate
    const mentionsPainPoint = /\b(challenge|problem|struggle|waste time|losing deals|inefficient|manual)\b/i.test(lower);
    if (mentionsPainPoint) {
      changes.seesRelevance += 2.5;
    }
    
    // Generic pitching reduces relevance
    const isGenericPitch = /\b(everyone|all companies|any business|anyone who)\b/i.test(lower);
    if (isGenericPitch) {
      changes.seesRelevance -= 1;
    }
    
    // Pitching without discovery when pain is still unclear reduces relevance
    const isPitchingOnly = /\b(we (offer|provide|have)|our (product|platform))\b/i.test(lower);
    const isAsking = /\?/.test(utterance);
    if (isPitchingOnly && !isAsking && !repQuality.askedDiscovery && this.beliefState.painClarity < 3) {
      changes.seesRelevance -= 0.5;
    }
  }
  
  /**
   * Update trust based on rapport building and professionalism
   */
  private updateTrust(
    utterance: string,
    repQuality: { buildingRapport?: boolean },
    turnNumber: number,
    changes: Record<string, number>
  ): void {
    const lower = utterance.toLowerCase();
    
    // Proper introduction builds trust (handle curly apostrophes from voice transcripts)
    if (turnNumber === 1) {
      const hasProperIntro = /\b(my name is|i[''']m \w+|this is \w+ (from|with))\b/i.test(utterance);
      if (hasProperIntro) {
        changes.trustsRep += 2;
      } else {
        changes.trustsRep -= 1;
      }
    }
    
    // Rapport building increases trust
    if (repQuality.buildingRapport) {
      changes.trustsRep += 1;
    }
    
    // Social proof builds trust
    const hasSocialProof = /\b(customers like|companies like|helped \d+|case study|customer|client)\b/i.test(lower);
    if (hasSocialProof) {
      changes.trustsRep += 1.5;
    }
    
    // Bold claims without proof reduce trust
    const hasBoldClaim = /\b(guarantee|ensure|always|never|best|top|leading|definitely)\b/i.test(lower);
    const hasProof = /\b(because|for example|data shows|we found|specifically)\b/i.test(lower);
    if (hasBoldClaim && !hasProof) {
      changes.trustsRep -= 1.5;
    }
    
    // Stacked questions reduce trust (feels interrogating)
    const questionCount = (utterance.match(/\?/g) || []).length;
    if (questionCount >= 3) {
      changes.trustsRep -= 0.5;
    }
  }
  
  /**
   * Update pain clarity based on discovery questions and pain discussion
   */
  private updatePainClarity(
    utterance: string,
    repQuality: { askedDiscovery?: boolean },
    changes: Record<string, number>
  ): void {
    const lower = utterance.toLowerCase();
    
    // Discovery questions help Marcus articulate pain (reduced from +2 to +1)
    if (repQuality.askedDiscovery) {
      changes.painClarity += 1;
    }
    
    // Rep mentions specific pain points Marcus might have
    const mentionsSpecificPain = /\b(waste time|losing deals|manual process|inefficient|lack of visibility|hard to track|difficult to)\b/i.test(lower);
    if (mentionsSpecificPain) {
      changes.painClarity += 1.5;
    }
    
    // Rep asks "what's your biggest challenge" type questions
    const asksAboutPain = /\b(what[''']s|what is) (your|the) (biggest|main|current) (challenge|problem|issue|struggle)|how (do|are) you (currently|handling|managing)\b/i.test(lower);
    if (asksAboutPain) {
      changes.painClarity += 2.5;
    }
  }
  
  /**
   * Update value clarity based on value proposition communication
   */
  private updateValueClarity(
    utterance: string,
    repQuality: { sharingValue?: boolean; demonstratingProof?: boolean },
    changes: Record<string, number>
  ): void {
    const lower = utterance.toLowerCase();
    
    // Value sharing increases clarity
    if (repQuality.sharingValue) {
      changes.valueClarity += 2;
    }
    
    // Specific ROI/outcomes increase value clarity
    const hasROI = /\b(increase|improve|reduce|save|boost|grow) (by )?\d+[-–]?\d*%|save \d+ hours|increase revenue|reduce costs/i.test(lower);
    if (hasROI) {
      changes.valueClarity += 3;
    }
    
    // Proof/evidence strengthens value clarity
    if (repQuality.demonstratingProof) {
      changes.valueClarity += 2;
    }
    
    // Concrete examples help
    const hasConcreteExample = /\b(for example|one customer|imagine|specifically|case study)\b/i.test(lower);
    if (hasConcreteExample) {
      changes.valueClarity += 1.5;
    }
    
    // Generic value statements without specifics barely help
    const hasGenericValue = /\b(helps you|makes things better|improves performance|increases efficiency)\b/i.test(lower);
    const hasSpecifics = /\b(by \d+%|\d+ hours|specifically|for example)\b/i.test(lower);
    if (hasGenericValue && !hasSpecifics) {
      changes.valueClarity += 0.3;
    }
    
    // Repeating same value point reduces impact (detect if value hasn't changed much recently)
    if (repQuality.sharingValue && this.beliefState.valueClarity > 6 && this.currentTurn > 5) {
      changes.valueClarity -= 0.5; // Diminishing returns on repeated value statements
    }
  }
  
  /**
   * Update urgency based on time-sensitive language
   */
  private updateUrgency(
    utterance: string,
    repQuality: any,
    changes: Record<string, number>
  ): void {
    const lower = utterance.toLowerCase();
    
    // Time-sensitive language increases urgency
    const hasUrgency = /\b(right now|currently|today|this quarter|this month|urgent|soon|immediately|before)\b/i.test(lower);
    if (hasUrgency) {
      changes.urgency += 1.5;
    }
    
    // Consequences of inaction increase urgency
    const hasConsequence = /\b(losing|wasting|missing out|behind|competitors|risk|deadline)\b/i.test(lower);
    if (hasConsequence) {
      changes.urgency += 2;
    }
    
    // Artificial urgency tactics reduce trust and urgency feels forced
    const hasArtificialUrgency = /\b(limited time|offer expires|only \d+ spots|act now|hurry)\b/i.test(lower);
    if (hasArtificialUrgency) {
      changes.urgency -= 1;
      changes.trustsRep -= 1;
    }
  }
  
  /**
   * Apply changes with per-turn movement caps
   */
  private applyChangesWithCaps(changes: Record<string, number>): void {
    const dimensions = Object.keys(changes) as Array<keyof typeof changes>;
    
    dimensions.forEach(dim => {
      let change = changes[dim];
      
      // Cap increases and decreases
      if (change > this.MAX_INCREASE_PER_TURN) {
        change = this.MAX_INCREASE_PER_TURN;
      } else if (change < this.MAX_DECREASE_PER_TURN) {
        change = this.MAX_DECREASE_PER_TURN;
      }
      
      // Apply capped change
      const newValue = this.beliefState[dim] + change;
      this.beliefState[dim] = Math.max(0, Math.min(10, newValue));
    });
    
    // Special cap: urgency stays low early in calls
    if (this.currentTurn <= 3 && this.beliefState.urgency > 2) {
      this.beliefState.urgency = 2;
    }
  }
  
  /**
   * Log belief state changes
   */
  private logUpdate(
    previousState: BuyerBeliefState,
    repQuality: {
      buildingRapport?: boolean;
      askedDiscovery?: boolean;
      sharingValue?: boolean;
      demonstratingProof?: boolean;
    }
  ): void {
    const changes: string[] = [];
    
    const dimensions = [
      'understandsProduct',
      'seesRelevance',
      'trustsRep',
      'painClarity',
      'valueClarity',
      'urgency'
    ] as const;
    
    dimensions.forEach(dim => {
      const prev = previousState[dim];
      const curr = this.beliefState[dim];
      const delta = curr - prev;
      
      if (Math.abs(delta) >= 0.5) {
        const arrow = delta > 0 ? '↑' : '↓';
        changes.push(`${dim}: ${curr.toFixed(1)}${arrow}`);
      }
    });
    
    // Log repQuality flags
    const flags: string[] = [];
    if (repQuality.buildingRapport) flags.push('rapport');
    if (repQuality.askedDiscovery) flags.push('discovery');
    if (repQuality.sharingValue) flags.push('value');
    if (repQuality.demonstratingProof) flags.push('proof');
    
    console.log(`📊 [BeliefState] Turn ${this.currentTurn}${flags.length > 0 ? ` [${flags.join(', ')}]` : ''}:`);
    
    if (changes.length > 0) {
      console.log(`  ${changes.join(', ')}`);
    } else {
      console.log(`  No significant changes`);
    }
    
    // Show full state every 5 turns for reference
    if (this.currentTurn % 5 === 0) {
      console.log(`  Full state: understand=${this.beliefState.understandsProduct.toFixed(1)}, relevance=${this.beliefState.seesRelevance.toFixed(1)}, trust=${this.beliefState.trustsRep.toFixed(1)}, pain=${this.beliefState.painClarity.toFixed(1)}, value=${this.beliefState.valueClarity.toFixed(1)}, urgency=${this.beliefState.urgency.toFixed(1)}`);
    }
  }
  
  /**
   * Reset state (for testing or new conversation)
   */
  reset(): void {
    this.beliefState = {
      understandsProduct: 0,
      seesRelevance: 0,
      trustsRep: 0,
      painClarity: 0,
      valueClarity: 0,
      urgency: 0,
      updatedTurn: 0
    };
    this.currentTurn = 0;
  }
  
  // TODO Phase 2+: Add more belief dimensions
  // - hasAuthority: number (0-10): Can Marcus make the decision?
  // - budgetFit: number (0-10): Does this fit Marcus's budget constraints?
  // - currentSolutionAttachment: number (0-10): How attached is Marcus to current solution?
  // - riskSensitivity: number (0-10): How risk-averse is Marcus about switching?
  // - decisionTimeframe: number (0-10): How quickly can/will Marcus decide?
}

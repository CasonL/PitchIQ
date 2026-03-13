import { AnswerEvaluator, AnswerImpact } from './AnswerEvaluator';

export type EmotionalPosture = 
  | 'defensive' 
  | 'curious' 
  | 'skeptical' 
  | 'engaged' 
  | 'rushed'
  | 'guarded'
  | 'open'
  | 'testing'
  | 'impatient';

export interface DisclosureGates {
  canRevealBudget: boolean;
  canRevealTimeline: boolean;
  canRevealPainPoints: boolean;
  canRevealDecisionProcess: boolean;
  canShowInterest: boolean;
  canAdmitConcerns: boolean;
}

// BUYER STATE: How Marcus actually feels and behaves (drives responses)
export interface BuyerState {
  emotionalPosture: EmotionalPosture;
  resistanceLevel: number; // 0-10, how guarded/skeptical
  openness: number; // 0-10, willingness to engage
  patience: number; // 0-10, how much time left before exit
  clarity: number; // 0-10, understanding of what rep is offering
  relevance: number; // 0-10, perceived fit to their needs
  urgency: number; // 0-10, perceived need to solve problem
  trustLevel: number; // 0-10, belief in vendor credibility
  disclosureGates: DisclosureGates;
  // Objection tracking with partial satisfaction (0.0 = unaddressed, 1.0 = satisfied)
  activeObjection?: ObjectionType; // Current objection Marcus is focused on
  objectionSatisfaction: ObjectionSatisfaction;
  lastAcknowledgment?: string; // What Marcus should acknowledge from last answer
  // Behavioral triggers
  shouldEscalateObjection: boolean;
  objectionEscalationTheme?: string;
  objectionCount?: number;
  shouldForceExit: boolean;
  exitReason?: string;
  shouldShowConfusion: boolean;
}

// COACHING ASSESSMENT: What the coach thinks about rep performance (for post-call)
export interface CoachingAssessment {
  trainingObjective: string;
  identifiedIssues: string[];
  repStrengths: string[];
  questionsAskedWithoutProgress: number;
  talkRatio: number; // % of time rep talked vs listened
  discoveryAttempts: number;
  rapportBuilding: boolean;
  pitchingTooEarly: boolean;
  handledObjectionsWell: boolean;
  overallQuality: number; // 0-10
}

// COMBINED OUTPUT: Both buyer response and coaching data
export interface StrategyOutput {
  buyerState: BuyerState;
  coachingAssessment: CoachingAssessment;
}

// Objection taxonomy
export type ObjectionType = 
  | 'proof' // Need evidence, case studies, results
  | 'fit' // Relevance to their specific situation
  | 'customization' // Generic vs tailored concern
  | 'trust' // Belief in vendor/product credibility
  | 'value' // ROI, cost justification
  | 'time' // Bandwidth, schedule constraints
  | 'budget' // Financial constraints
  | 'authority' // Decision-making power
  | 'timing' // Not the right time
  | 'status_quo'; // Happy with current solution

// Plain object for objection tracking (avoids Map serialization issues)
export type ObjectionSatisfaction = {
  proof: number;        // 0.0 = completely unaddressed, 1.0 = fully satisfied
  fit: number;
  customization: number;
  trust: number;
  value: number;
  time: number;
  budget: number;
  authority: number;
  timing: number;
  status_quo: number;
};

export interface StrategyContext {
  phase: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  userInput: string;
  utteranceCount: number; // Total utterances in this call
  lastObjection?: string; // Last objection Marcus raised
  repQualitySignals: {
    askedDiscovery: boolean;
    buildingRapport: boolean;
    talkingTooMuch: boolean;
    makingAssumptions: boolean;
    providingValue: boolean;
  };
  // Marcus's randomized traits for this call
  marcusTraits?: {
    painLevel: string;
    urgency: string;
    budget: string;
    openness: string;
    initialResistance: number;
    resistanceVolatility: number;
    satisfactionLevel: number;
    painPoints: string[];
    // Architect can force impatience early (e.g., "Marcus has a meeting in 20 minutes")
    forceImpatientAtUtterance?: number;
    hasUpcomingObligation?: boolean;
  };
}

export class StrategyLayer {
  private buyerState: BuyerState;
  private coachingAssessment: CoachingAssessment;
  private questionsAsked: number = 0;
  private lastResistanceLevel: number = 6;
  private consecutiveIncoherentTurns: number = 0;
  private totalUtterances: number = 0;
  private repWordCount: number = 0;
  private marcusWordCount: number = 0;
  private lastRepAnswer: string = '';

  constructor() {
    this.buyerState = this.getDefaultBuyerState();
    this.coachingAssessment = this.getDefaultCoachingAssessment();
  }

  async determineStrategy(context: StrategyContext): Promise<StrategyOutput> {
    const { phase, conversationHistory, userInput, utteranceCount, repQualitySignals, marcusTraits } = context;

    // Track questions asked
    const hasQuestion = /\?|\b(what|how|why|tell me|can you|would you|could you)\b/i.test(userInput);
    if (hasQuestion) {
      this.questionsAsked++;
    }

    // Use trait-based resistance if available, otherwise fallback to default
    const baseResistance = marcusTraits 
      ? marcusTraits.initialResistance 
      : this.calculateBaseResistance(phase);
    
    const resistanceModifiers = this.calculateResistanceModifiers(repQualitySignals, conversationHistory);
    
    // Apply trait volatility to modifier effect (if available)
    const volatilityMultiplier = marcusTraits?.resistanceVolatility ?? 1.0;
    const adjustedModifiers = resistanceModifiers * volatilityMultiplier;
    
    const finalResistance = Math.max(0, Math.min(10, baseResistance + adjustedModifiers));
    
    // Track progress: resistance dropping or good discovery signals
    const progressMade = finalResistance < this.lastResistanceLevel - 0.5 || 
        (repQualitySignals.askedDiscovery && repQualitySignals.buildingRapport);
    this.lastResistanceLevel = finalResistance;

    // IMPATIENCE LOGIC: Multiple triggers to save on API costs
    // 1. Question-based: 10+ questions without making progress
    const questionImpatience = this.questionsAsked >= 10 && !progressMade;
    
    // 2. Utterance-based: 15+ utterances AND high resistance (> 7) = going nowhere
    const utteranceImpatience = utteranceCount >= 15 && finalResistance > 7;
    
    // 3. Architect override: Force impatience at specific utterance (e.g., "has meeting soon")
    const forcedImpatience = marcusTraits?.forceImpatientAtUtterance 
      ? utteranceCount >= marcusTraits.forceImpatientAtUtterance
      : false;
    
    const isImpatient = questionImpatience || utteranceImpatience || forcedImpatience;
    const questionsAskedWithoutProgress = progressMade ? 0 : this.questionsAsked;
    
    if (utteranceImpatience && !questionImpatience) {
      console.log(`⏰ [Strategy] Utterance impatience triggered: ${utteranceCount} utterances with ${finalResistance.toFixed(1)}/10 resistance`);
    }
    if (forcedImpatience) {
      console.log(`⏰ [Strategy] Architect forced impatience at utterance ${utteranceCount}`);
    }

    const emotionalPosture = this.determineEmotionalPosture(
      phase,
      finalResistance,
      userInput,
      repQualitySignals,
      isImpatient
    );

    const disclosureGates = this.determineDisclosureGates(
      phase,
      finalResistance,
      repQualitySignals,
      conversationHistory
    );

    const trainingObjective = this.determineTrainingObjective(
      phase,
      repQualitySignals,
      conversationHistory
    );

    const allowedRepMistakes = this.determineAllowedMistakes(phase, repQualitySignals);

    const withhold = this.shouldWithholdProgress(
      phase,
      repQualitySignals,
      conversationHistory,
      finalResistance
    );

    // Evaluate rep's answer against active objection (if any)
    let answerImpact: AnswerImpact | null = null;
    if (this.buyerState.activeObjection && userInput !== this.lastRepAnswer) {
      answerImpact = await AnswerEvaluator.evaluate(
        userInput,
        this.buyerState.activeObjection,
        this.buyerState.objectionSatisfaction[this.buyerState.activeObjection],
        {
          buyerClarityLevel: this.buyerState.clarity || 3,
          buyerTrustLevel: this.buyerState.trustLevel,
          conversationHistory
        },
        context.lastObjection // Pass Marcus's actual objection text for context
      );
      this.lastRepAnswer = userInput;
    }

    // NEW: Detect escalation and exit triggers
    const escalation = this.detectObjectionEscalation(context);
    const exitTrigger = this.detectExitTrigger(utteranceCount, finalResistance);
    const confusion = this.detectRepIncoherence(userInput);

    // Calculate buyer state variables (how Marcus feels/behaves)
    let openness = this.calculateOpenness(repQualitySignals, finalResistance);
    let patience = this.calculatePatience(utteranceCount, finalResistance, progressMade);
    let clarity = this.calculateClarity(conversationHistory, repQualitySignals);
    let relevance = this.calculateRelevance(repQualitySignals, finalResistance);
    let trustLevel = this.buyerState.trustLevel;
    const urgency = marcusTraits ? this.mapTraitToUrgency(marcusTraits.urgency) : 2;

    // Apply answer impact if rep addressed objection
    let updatedSatisfaction = this.buyerState.objectionSatisfaction;
    let lastAcknowledgment: string | undefined = undefined;
    
    if (answerImpact && answerImpact.addressed) {
      const impact = AnswerEvaluator.applyImpact(
        this.buyerState.objectionSatisfaction,
        clarity,
        relevance,
        trustLevel,
        answerImpact,
        this.buyerState.activeObjection!
      );
      
      updatedSatisfaction = impact.satisfaction;
      clarity = impact.clarity;
      relevance = impact.relevance;
      trustLevel = impact.trustLevel;
      lastAcknowledgment = answerImpact.specificAcknowledgment;
      
      console.log(`✅ [Answer Impact] ${this.buyerState.activeObjection} satisfaction: ${this.buyerState.objectionSatisfaction[this.buyerState.activeObjection!].toFixed(2)} → ${updatedSatisfaction[this.buyerState.activeObjection!].toFixed(2)}`);
      console.log(`   Clarity: ${this.buyerState.clarity} → ${clarity}, Relevance: ${this.buyerState.relevance} → ${relevance}, Trust: ${this.buyerState.trustLevel.toFixed(1)} → ${trustLevel.toFixed(1)}`);
    }

    // Update buyer state
    this.buyerState = {
      emotionalPosture,
      resistanceLevel: finalResistance,
      openness,
      patience,
      clarity,
      relevance,
      urgency,
      trustLevel,
      disclosureGates,
      activeObjection: this.buyerState.activeObjection,
      objectionSatisfaction: updatedSatisfaction,
      lastAcknowledgment,
      shouldEscalateObjection: escalation.should,
      objectionEscalationTheme: escalation.theme,
      objectionCount: escalation.count,
      shouldForceExit: exitTrigger.should,
      exitReason: exitTrigger.reason,
      shouldShowConfusion: confusion
    };

    // Update coaching assessment (what coach thinks)
    const userTurns = conversationHistory.filter(t => t.role === 'user');
    const userWords = userTurns.reduce((sum, t) => sum + t.content.split(/\s+/).length, 0);
    const marcusTurns = conversationHistory.filter(t => t.role === 'assistant');
    const marcusWords = marcusTurns.reduce((sum, t) => sum + t.content.split(/\s+/).length, 0);
    const talkRatio = (userWords + marcusWords) > 0 ? userWords / (userWords + marcusWords) : 0.5;

    this.coachingAssessment = {
      trainingObjective,
      identifiedIssues: allowedRepMistakes,
      repStrengths: this.identifyStrengths(repQualitySignals, progressMade),
      questionsAskedWithoutProgress,
      talkRatio,
      discoveryAttempts: this.questionsAsked,
      rapportBuilding: repQualitySignals.buildingRapport,
      pitchingTooEarly: withhold.should,
      handledObjectionsWell: progressMade && this.questionsAsked > 0,
      overallQuality: this.calculateOverallQuality(repQualitySignals, finalResistance, progressMade)
    };

    console.log(`🎯 [Strategy] Buyer: ${emotionalPosture} | Resistance: ${finalResistance}/10 | Openness: ${openness}/10 | Patience: ${patience}/10`);
    console.log(`🔒 [Strategy] Disclosure: Budget=${disclosureGates.canRevealBudget}, Pain=${disclosureGates.canRevealPainPoints}, Interest=${disclosureGates.canShowInterest}`);
    console.log(`📊 [Coaching] Objective: ${trainingObjective} | Quality: ${this.coachingAssessment.overallQuality}/10 | Issues: ${allowedRepMistakes.length}`);

    return {
      buyerState: this.buyerState,
      coachingAssessment: this.coachingAssessment
    };
  }

  private calculateBaseResistance(phase: number): number {
    switch (phase) {
      case 1: return 6;
      case 2: return 4;
      case 3: return 7;
      default: return 5;
    }
  }

  private calculateResistanceModifiers(
    signals: StrategyContext['repQualitySignals'],
    history: Array<{ role: string; content: string }>
  ): number {
    let modifier = 0;

    // Only penalize talking too much if NOT asking discovery questions
    // Qualification questions can be detailed - that's good, not bad
    if (signals.talkingTooMuch && !signals.askedDiscovery) modifier += 2;
    if (signals.makingAssumptions) modifier += 1;
    if (signals.askedDiscovery) modifier -= 1;
    if (signals.buildingRapport) modifier -= 1;
    if (signals.providingValue) modifier -= 2;

    const repTurnCount = history.filter(t => t.role === 'user').length;
    if (repTurnCount > 8 && !signals.providingValue) {
      modifier += 1;
    }

    return modifier;
  }

  private determineEmotionalPosture(
    phase: number,
    resistance: number,
    userInput: string,
    signals: StrategyContext['repQualitySignals'],
    isImpatient: boolean = false
  ): EmotionalPosture {
    // CRITICAL: If user has asked 10+ questions with no progress, Marcus gets impatient
    if (isImpatient) {
      return 'impatient';
    }
    const isPitching = /\b(we help|we provide|our solution|what we do|let me tell you)\b/i.test(userInput);
    const isAsking = /\b(what|how|when|why|tell me|can you|would you)\b/i.test(userInput);
    const isPushy = /\b(just|only|quick|few minutes|won't take long)\b/i.test(userInput);

    if (phase === 1) {
      if (isPushy || signals.makingAssumptions) return 'defensive';
      if (resistance >= 7) return 'guarded';
      if (isAsking && signals.buildingRapport) return 'curious';
      if (resistance <= 4) return 'open';
      return 'skeptical';
    }

    if (phase === 2) {
      if (signals.providingValue) return 'engaged';
      if (!signals.askedDiscovery) return 'testing';
      if (resistance >= 6) return 'skeptical';
      return 'curious';
    }

    if (phase === 3) {
      if (isPitching && !signals.providingValue) return 'defensive';
      if (resistance >= 8) return 'guarded';
      return 'testing';
    }

    return 'skeptical';
  }

  private determineDisclosureGates(
    phase: number,
    resistance: number,
    signals: StrategyContext['repQualitySignals'],
    history: Array<{ role: string; content: string }>
  ): DisclosureGates {
    const turnCount = history.filter(t => t.role === 'user').length;
    
    // BUYER LOGIC ONLY: Disclosure based on trust, clarity, and emotional state
    // NOT based on coaching milestones like "askedDiscovery"
    const trustLevel = this.buyerState.trustLevel;
    const clarity = this.buyerState.clarity || 3;
    const openness = this.buyerState.openness || 4;

    if (phase === 1) {
      // Early phase: very guarded, only show interest if low resistance
      return {
        canRevealBudget: false,
        canRevealTimeline: false,
        canRevealPainPoints: false,
        canRevealDecisionProcess: false,
        canShowInterest: resistance <= 5 && openness >= 5,
        canAdmitConcerns: false
      };
    }

    if (phase === 2) {
      // Mid phase: open up based on trust and clarity, not coaching signals
      return {
        canRevealBudget: false,
        canRevealTimeline: trustLevel >= 6 && resistance <= 6,
        canRevealPainPoints: trustLevel >= 5 && clarity >= 4, // Trust + understanding
        canRevealDecisionProcess: trustLevel >= 7 && resistance <= 5,
        canShowInterest: resistance <= 6 && openness >= 4,
        canAdmitConcerns: trustLevel >= 6 && clarity >= 5
      };
    }

    if (phase === 3) {
      // Late phase: willing to share if they trust you and understand the offer
      return {
        canRevealBudget: trustLevel >= 7 && clarity >= 6,
        canRevealTimeline: resistance <= 6,
        canRevealPainPoints: trustLevel >= 5, // Just need basic trust
        canRevealDecisionProcess: trustLevel >= 7 && resistance <= 5,
        canShowInterest: resistance <= 7 || trustLevel >= 6,
        canAdmitConcerns: trustLevel >= 6
      };
    }

    return this.getDefaultBuyerState().disclosureGates;
  }

  private determineTrainingObjective(
    phase: number,
    signals: StrategyContext['repQualitySignals'],
    history: Array<{ role: string; content: string }>
  ): string {
    if (phase === 1) {
      if (signals.talkingTooMuch) {
        return 'Teach rep to ask questions instead of talking';
      }
      if (!signals.buildingRapport) {
        return 'Teach rep to build rapport before asking business questions';
      }
      return 'Teach rep to earn the right to ask discovery questions';
    }

    if (phase === 2) {
      if (!signals.askedDiscovery) {
        return 'Teach rep to ask discovery questions';
      }
      if (signals.makingAssumptions) {
        return 'Teach rep to verify assumptions with questions';
      }
      if (!signals.providingValue) {
        return 'Teach rep to provide insights, not just collect information';
      }
      return 'Reward good discovery with deeper disclosure';
    }

    if (phase === 3) {
      if (signals.talkingTooMuch) {
        return 'Teach rep that objections come from too much talking';
      }
      return 'Teach rep to handle objections with questions, not pitches';
    }

    return 'Default training objective';
  }

  private determineAllowedMistakes(
    phase: number,
    signals: StrategyContext['repQualitySignals']
  ): string[] {
    const allowed: string[] = [];

    if (phase === 1) {
      allowed.push('Weak opening line');
      if (!signals.buildingRapport) {
        allowed.push('Asking business questions too early');
      }
      allowed.push('Not establishing credibility');
    }

    if (phase === 2) {
      if (!signals.askedDiscovery) {
        allowed.push('Not asking discovery questions');
      }
      if (signals.makingAssumptions) {
        allowed.push('Making assumptions without verification');
      }
      allowed.push('Talking more than listening');
    }

    if (phase === 3) {
      allowed.push('Weak value proposition');
      allowed.push('Not addressing objections with questions');
      allowed.push('Pitching instead of problem-solving');
    }

    return allowed;
  }

  private shouldWithholdProgress(
    phase: number,
    signals: StrategyContext['repQualitySignals'],
    history: Array<{ role: string; content: string }>,
    resistance: number
  ): { should: boolean; reason?: string } {
    if (phase === 1) {
      if (signals.talkingTooMuch && !signals.buildingRapport) {
        return {
          should: true,
          reason: 'Rep is pitching, not building rapport - block progression'
        };
      }
    }

    if (phase === 2) {
      const turnCount = history.filter(t => t.role === 'user').length;
      
      if (turnCount >= 4 && !signals.askedDiscovery) {
        return {
          should: true,
          reason: 'Rep has not asked discovery questions - withhold deeper info'
        };
      }
      
      if (signals.makingAssumptions && !signals.providingValue) {
        return {
          should: true,
          reason: 'Rep making assumptions without providing value - stay surface level'
        };
      }
    }

    if (phase === 3) {
      if (resistance >= 8 && signals.talkingTooMuch) {
        return {
          should: true,
          reason: 'Rep triggered defensive response - withhold positive signals'
        };
      }
    }

    return { should: false };
  }

  /**
   * Detect if an objection has been repeated 3+ times and should escalate
   */
  private detectObjectionEscalation(context: StrategyContext): {
    should: boolean;
    theme?: string;
    count?: number;
  } {
    if (!context.lastObjection) {
      return { should: false };
    }

    const theme = this.extractObjectionTheme(context.lastObjection) as ObjectionType;
    
    // Track this objection in buyer state
    const currentSatisfaction = this.buyerState.objectionSatisfaction[theme];
    const currentCount = Math.floor((1 - currentSatisfaction) * 5); // 1.0->0, 0.8->1, 0.6->2, 0.4->3, 0.2->4, 0.0->5
    
    // Objection raised again - decrease satisfaction (rep hasn't addressed it well enough)
    const newSatisfaction = Math.max(0, currentSatisfaction - 0.2);
    this.buyerState.objectionSatisfaction[theme] = newSatisfaction;

    // Update trust based on objection handling
    if (currentCount > 1) {
      this.buyerState.trustLevel = Math.max(0, this.buyerState.trustLevel - 0.5);
    }

    if (currentCount >= 3) {
      console.log(`🔥 [Strategy] Objection "${theme}" repeated ${currentCount} times (satisfaction: ${newSatisfaction.toFixed(2)}) - ESCALATING`);
      return {
        should: true,
        theme,
        count: currentCount
      };
    }

    return { should: false };
  }

  /**
   * Extract core theme from objection text
   */
  private extractObjectionTheme(objectionText: string): ObjectionType {
    const lower = objectionText.toLowerCase();
    
    if (/\b(proof|evidence|work|results?|roi|show me)\b/.test(lower)) return 'proof';
    if (/\b(trust|believe|sure|know|guarantee)\b/.test(lower)) return 'trust';
    if (/\b(time|busy|bandwidth|schedule)\b/.test(lower)) return 'time';
    if (/\b(budget|cost|price|afford|expensive)\b/.test(lower)) return 'budget';
    if (/\b(fit|right|relevant|applicable)\b/.test(lower)) return 'fit';
    if (/\b(generic|cookie.?cutter|customiz|tailored)\b/.test(lower)) return 'customization';
    if (/\b(value|worth|roi|return)\b/.test(lower)) return 'value';
    if (/\b(decision|authority|approve)\b/.test(lower)) return 'authority';
    if (/\b(timing|not now|later)\b/.test(lower)) return 'timing';
    if (/\b(current|existing|happy with|working)\b/.test(lower)) return 'status_quo';
    
    return 'trust'; // Default to trust if unclear
  }

  /**
   * Detect if patience is exhausted and call should end
   */
  private detectExitTrigger(utteranceCount: number, resistance: number): {
    should: boolean;
    reason?: string;
  } {
    // Exit if: high utterances + high resistance + low trust
    if (utteranceCount > 15 && resistance > 7 && this.buyerState.trustLevel < 4) {
      console.log(`🚪 [Strategy] Exit triggered: ${utteranceCount} utterances, ${resistance}/10 resistance, ${this.buyerState.trustLevel}/10 trust`);
      return {
        should: true,
        reason: 'Patience exhausted - too many exchanges without progress'
      };
    }

    // Exit if any objection has very low satisfaction (< 0.2 = repeated 4+ times)
    const objectionValues = Object.values(this.buyerState.objectionSatisfaction);
    const minSatisfaction = objectionValues.length > 0 ? Math.min(...objectionValues) : 1.0;
    if (minSatisfaction < 0.2) {
      return {
        should: true,
        reason: 'Same objection raised 4+ times without resolution'
      };
    }

    return { should: false };
  }

  /**
   * Detect if rep is being incoherent
   */
  private detectRepIncoherence(userInput: string): boolean {
    const wordCount = userInput.split(/\s+/).length;
    
    // Very short responses that don't make sense
    if (wordCount < 3) {
      this.consecutiveIncoherentTurns++;
      return this.consecutiveIncoherentTurns >= 2;
    }

    // Fragmented speech patterns
    const fragmentPatterns = [
      /\b(um|uh|er|ah)\b.*\b(um|uh|er|ah)\b/, // Multiple fillers
      /\.\.\.|…/, // Trailing off
      /^(and|but|so|or)\b/i, // Starting with conjunction
      /(\w+)\s+\1\s+\1/ // Word repeated 3+ times
    ];

    const isFragmented = fragmentPatterns.some(pattern => pattern.test(userInput));
    
    if (isFragmented) {
      this.consecutiveIncoherentTurns++;
    } else {
      this.consecutiveIncoherentTurns = 0; // Reset on coherent turn
    }

    if (this.consecutiveIncoherentTurns >= 2) {
      console.log(`🤔 [Strategy] Rep incoherence detected: ${this.consecutiveIncoherentTurns} consecutive unclear turns`);
      return true;
    }

    return false;
  }

  getCurrentBuyerState(): BuyerState {
    return { ...this.buyerState };
  }

  getCurrentCoachingAssessment(): CoachingAssessment {
    return { ...this.coachingAssessment };
  }

  private getDefaultBuyerState(): BuyerState {
    return {
      emotionalPosture: 'skeptical',
      resistanceLevel: 6,
      openness: 4,
      patience: 8,
      clarity: 3,
      relevance: 3,
      urgency: 2,
      trustLevel: 5,
      disclosureGates: {
        canRevealBudget: false,
        canRevealTimeline: false,
        canRevealPainPoints: false,
        canRevealDecisionProcess: false,
        canShowInterest: false,
        canAdmitConcerns: false
      },
      activeObjection: undefined,
      objectionSatisfaction: {
        proof: 1.0,
        fit: 1.0,
        customization: 1.0,
        trust: 1.0,
        value: 1.0,
        time: 1.0,
        budget: 1.0,
        authority: 1.0,
        timing: 1.0,
        status_quo: 1.0
      },
      lastAcknowledgment: undefined,
      shouldEscalateObjection: false,
      shouldForceExit: false,
      shouldShowConfusion: false
    };
  }

  private getDefaultCoachingAssessment(): CoachingAssessment {
    return {
      trainingObjective: 'Baseline training scenario',
      identifiedIssues: [],
      repStrengths: [],
      questionsAskedWithoutProgress: 0,
      talkRatio: 0.5,
      discoveryAttempts: 0,
      rapportBuilding: false,
      pitchingTooEarly: false,
      handledObjectionsWell: false,
      overallQuality: 5
    };
  }

  // Calculate buyer state variables
  private calculateOpenness(signals: StrategyContext['repQualitySignals'], resistance: number): number {
    let openness = 10 - resistance; // Inverse of resistance
    if (signals.buildingRapport) openness += 1;
    if (signals.askedDiscovery) openness += 1;
    return Math.max(0, Math.min(10, openness));
  }

  private calculatePatience(utteranceCount: number, resistance: number, progressMade: boolean): number {
    let patience = 10 - (utteranceCount * 0.3); // Decays with time
    if (resistance > 7) patience -= 2; // High resistance drains patience
    if (progressMade) patience += 1; // Progress restores patience
    return Math.max(0, Math.min(10, patience));
  }

  private calculateClarity(history: Array<{ role: string; content: string }>, signals: StrategyContext['repQualitySignals']): number {
    let clarity = 3; // Start low
    if (signals.providingValue) clarity += 2;
    if (history.length > 4) clarity += 1; // More context = more clarity
    if (signals.makingAssumptions) clarity -= 1; // Assumptions reduce clarity
    return Math.max(0, Math.min(10, clarity));
  }

  private calculateRelevance(signals: StrategyContext['repQualitySignals'], resistance: number): number {
    let relevance = 3; // Start low
    if (signals.askedDiscovery) relevance += 2; // Discovery increases relevance
    if (signals.providingValue) relevance += 2;
    if (resistance < 5) relevance += 1; // Low resistance suggests relevance
    return Math.max(0, Math.min(10, relevance));
  }

  private mapTraitToUrgency(urgency: string): number {
    const map: Record<string, number> = {
      'low': 2,
      'medium': 5,
      'high': 8,
      'critical': 10
    };
    return map[urgency] || 2;
  }

  private identifyStrengths(signals: StrategyContext['repQualitySignals'], progressMade: boolean): string[] {
    const strengths: string[] = [];
    if (signals.buildingRapport) strengths.push('Building rapport effectively');
    if (signals.askedDiscovery) strengths.push('Asking discovery questions');
    if (signals.providingValue) strengths.push('Providing relevant insights');
    if (progressMade) strengths.push('Making measurable progress');
    return strengths;
  }

  private calculateOverallQuality(signals: StrategyContext['repQualitySignals'], resistance: number, progressMade: boolean): number {
    let quality = 5; // Start neutral
    if (signals.buildingRapport) quality += 1;
    if (signals.askedDiscovery) quality += 1;
    if (signals.providingValue) quality += 1;
    if (progressMade) quality += 1;
    if (signals.talkingTooMuch) quality -= 1;
    if (signals.makingAssumptions) quality -= 1;
    if (resistance < 5) quality += 1; // Successfully reduced resistance
    return Math.max(0, Math.min(10, quality));
  }

  /**
   * Set the active objection when Marcus raises one
   */
  setActiveObjection(objectionText: string): ObjectionType {
    const objectionType = this.extractObjectionTheme(objectionText);
    this.buyerState.activeObjection = objectionType;
    // Reset satisfaction for this objection if it's newly raised
    if (this.buyerState.objectionSatisfaction[objectionType] > 0.8) {
      this.buyerState.objectionSatisfaction[objectionType] = 0.3; // Start low when first raised
    }
    return objectionType;
  }

  /**
   * Get objection data for post-call feedback
   */
  getObjectionData() {
    // Calculate how many times each objection was raised based on satisfaction decay
    const objectionCounts: Record<string, number> = {};
    Object.entries(this.buyerState.objectionSatisfaction).forEach(([type, satisfaction]) => {
      // Each 0.2 decrease = 1 repeat (1.0->0, 0.8->1, 0.6->2, 0.4->3, 0.2->4, 0.0->5)
      objectionCounts[type] = Math.floor((1 - satisfaction) * 5);
    });

    return {
      activeObjection: this.buyerState.activeObjection,
      objectionSatisfaction: this.buyerState.objectionSatisfaction,
      objectionCounts
    };
  }

  analyzeRepQuality(
    userInput: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): StrategyContext['repQualitySignals'] {
    const userTurns = conversationHistory.filter(t => t.role === 'user');
    const totalUserWords = userTurns.reduce((sum, turn) => sum + turn.content.split(/\s+/).length, 0);
    const assistantTurns = conversationHistory.filter(t => t.role === 'assistant');
    const totalAssistantWords = assistantTurns.reduce((sum, turn) => sum + turn.content.split(/\s+/).length, 0);

    const askedDiscovery = /\b(what|how|why|tell me|can you|would you|walk me through|describe|biggest challenge|pain point|goal|struggle)\b/i.test(
      userTurns.slice(-3).map(t => t.content).join(' ')
    );

    // Building rapport includes: greetings, acknowledgments, AND following up on what Marcus said
    const hasFollowUpQuestion = /\b(you (mentioned|said)|how (is|are|do you like|happy are you)|what (about|do you think)|tell me about your)\b/i.test(
      userTurns.slice(-2).map(t => t.content).join(' ')
    );
    
    const buildingRapport = /\b(how are you|how's|great to|nice to|appreciate|thank|understand|makes sense|is this|are you)\b/i.test(
      userTurns.slice(-2).map(t => t.content).join(' ')
    ) || hasFollowUpQuestion;

    const talkingTooMuch = totalUserWords > totalAssistantWords * 1.5;

    const makingAssumptions = /\b(i assume|probably|i bet|you must|i'm sure you|most companies)\b/i.test(userInput);

    const providingValue = /\b(what i've seen|in my experience|companies like yours|challenge with|common issue|interesting|insight)\b/i.test(
      userTurns.slice(-2).map(t => t.content).join(' ')
    );

    return {
      askedDiscovery,
      buildingRapport,
      talkingTooMuch,
      makingAssumptions,
      providingValue
    };
  }
}

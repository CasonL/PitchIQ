export type EmotionalPosture = 
  | 'defensive' 
  | 'curious' 
  | 'skeptical' 
  | 'engaged' 
  | 'rushed'
  | 'guarded'
  | 'open'
  | 'testing';

export interface DisclosureGates {
  canRevealBudget: boolean;
  canRevealTimeline: boolean;
  canRevealPainPoints: boolean;
  canRevealDecisionProcess: boolean;
  canShowInterest: boolean;
  canAdmitConcerns: boolean;
}

export interface StrategyConstraints {
  emotionalPosture: EmotionalPosture;
  resistanceLevel: number;
  disclosureGates: DisclosureGates;
  trainingObjective: string;
  allowedRepMistakes: string[];
  shouldWithholdProgress: boolean;
  withholdReason?: string;
}

export interface StrategyContext {
  phase: number;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  userInput: string;
  repQualitySignals: {
    askedDiscovery: boolean;
    buildingRapport: boolean;
    talkingTooMuch: boolean;
    makingAssumptions: boolean;
    providingValue: boolean;
  };
}

export class StrategyLayer {
  private currentConstraints: StrategyConstraints;

  constructor() {
    this.currentConstraints = this.getDefaultConstraints();
  }

  determineStrategy(context: StrategyContext): StrategyConstraints {
    const { phase, conversationHistory, userInput, repQualitySignals } = context;

    const baseResistance = this.calculateBaseResistance(phase);
    
    const resistanceModifiers = this.calculateResistanceModifiers(repQualitySignals, conversationHistory);
    const finalResistance = Math.max(0, Math.min(10, baseResistance + resistanceModifiers));

    const emotionalPosture = this.determineEmotionalPosture(
      phase,
      finalResistance,
      userInput,
      repQualitySignals
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

    this.currentConstraints = {
      emotionalPosture,
      resistanceLevel: finalResistance,
      disclosureGates,
      trainingObjective,
      allowedRepMistakes,
      shouldWithholdProgress: withhold.should,
      withholdReason: withhold.reason
    };

    console.log(`🎯 [Strategy] Posture: ${emotionalPosture} | Resistance: ${finalResistance}/10 | Objective: ${trainingObjective}`);
    console.log(`🔒 [Strategy] Disclosure: Budget=${disclosureGates.canRevealBudget}, Pain=${disclosureGates.canRevealPainPoints}, Interest=${disclosureGates.canShowInterest}`);
    
    if (withhold.should) {
      console.log(`⛔ [Strategy] Withholding progress: ${withhold.reason}`);
    }

    return this.currentConstraints;
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

    if (signals.talkingTooMuch) modifier += 2;
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
    signals: StrategyContext['repQualitySignals']
  ): EmotionalPosture {
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

    if (phase === 1) {
      return {
        canRevealBudget: false,
        canRevealTimeline: false,
        canRevealPainPoints: false,
        canRevealDecisionProcess: false,
        canShowInterest: resistance <= 4 && signals.buildingRapport,
        canAdmitConcerns: false
      };
    }

    if (phase === 2) {
      const earnedTrust = signals.askedDiscovery && turnCount >= 3;
      
      return {
        canRevealBudget: false,
        canRevealTimeline: earnedTrust && resistance <= 5,
        canRevealPainPoints: earnedTrust && resistance <= 6,
        canRevealDecisionProcess: earnedTrust && resistance <= 4,
        canShowInterest: resistance <= 5,
        canAdmitConcerns: earnedTrust && signals.providingValue
      };
    }

    if (phase === 3) {
      const strongRapport = resistance <= 4 && signals.providingValue;
      
      return {
        canRevealBudget: strongRapport && signals.askedDiscovery,
        canRevealTimeline: resistance <= 6,
        canRevealPainPoints: true,
        canRevealDecisionProcess: strongRapport,
        canShowInterest: resistance <= 7,
        canAdmitConcerns: strongRapport
      };
    }

    return this.getDefaultConstraints().disclosureGates;
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

  getCurrentConstraints(): StrategyConstraints {
    return { ...this.currentConstraints };
  }

  private getDefaultConstraints(): StrategyConstraints {
    return {
      emotionalPosture: 'skeptical',
      resistanceLevel: 5,
      disclosureGates: {
        canRevealBudget: false,
        canRevealTimeline: false,
        canRevealPainPoints: false,
        canRevealDecisionProcess: false,
        canShowInterest: false,
        canAdmitConcerns: false
      },
      trainingObjective: 'Baseline training scenario',
      allowedRepMistakes: [],
      shouldWithholdProgress: false
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

    const buildingRapport = /\b(how are you|how's|great to|nice to|appreciate|thank|understand|makes sense)\b/i.test(
      userTurns.slice(-2).map(t => t.content).join(' ')
    );

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

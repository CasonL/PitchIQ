export type JudgmentAction = 'speak' | 'wait' | 'suppress' | 'hold';

export interface JudgmentDecision {
  action: JudgmentAction;
  reason: string;
  delayMs?: number;
  confidence: number;
  suppressedResponse?: string;
  holdUntil?: 'user_continues' | 'strategy_timeout' | 'cognitive_complete';
}

export interface JudgmentContext {
  userInput: string;
  preGeneratedResponse?: string;
  questionRisk: 'low' | 'medium' | 'high';
  momentType: 'reflex' | 'judgment' | 'strategic';
  prospectState: 'open' | 'guarded' | 'testing' | 'closing';
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  timeSinceLastUserSpeech: number;
  marcusJustSpoke: boolean;
  // Witness data - inputs, not decisions
  sentenceComplete?: boolean;
  sentenceCompleteness?: { isComplete: boolean; reason: string; confidence: number };
  cognitiveComplete?: boolean;
  cognitiveCompleteness?: { isCognitivelyComplete: boolean; reason: string; confidence: number; signals: any };
}

export interface SuppressionLog {
  timestamp: number;
  userInput: string;
  suppressedResponse: string;
  reason: string;
  decision: JudgmentDecision;
}

export class JudgmentGate {
  private suppressionLog: SuppressionLog[] = [];

  judge(context: JudgmentContext): JudgmentDecision {
    const {
      userInput,
      preGeneratedResponse,
      questionRisk,
      momentType,
      prospectState,
      conversationHistory,
      timeSinceLastUserSpeech,
      marcusJustSpoke,
      sentenceComplete,
      sentenceCompleteness,
      cognitiveComplete,
      cognitiveCompleteness
    } = context;

    if (marcusJustSpoke && timeSinceLastUserSpeech < 500) {
      return {
        action: 'suppress',
        reason: 'Too soon after Marcus spoke - likely echo or interruption artifact',
        confidence: 0.95,
        suppressedResponse: preGeneratedResponse
      };
    }

    // WITNESS DATA: Sentence completeness is an input, not a decision
    if (sentenceComplete === false && sentenceCompleteness) {
      return {
        action: 'wait',
        reason: `Grammatically incomplete: ${sentenceCompleteness.reason}`,
        delayMs: 2000,
        confidence: sentenceCompleteness.confidence
      };
    }

    // WITNESS DATA: Cognitive completeness - thought may not have landed yet
    if (cognitiveComplete === false && cognitiveCompleteness) {
      const signals = cognitiveCompleteness.signals;
      
      // HOLD for hedging or strategic ambiguity - timeout prevents deadlock
      if (signals.isHedging || signals.isAmbiguous) {
        return {
          action: 'hold',
          reason: `Cognitive incompleteness: ${cognitiveCompleteness.reason}`,
          holdUntil: 'user_continues',
          delayMs: 700, // Escape hatch: timeout then clarify
          confidence: cognitiveCompleteness.confidence
        };
      }

      // HOLD for strategic pause - teaches silence as technique
      if (signals.strategicPause) {
        return {
          action: 'hold',
          reason: 'Strategic pause detected - intentional silence has training value here',
          holdUntil: 'strategy_timeout',
          delayMs: 3000, // Longer timeout for strategic training moments
          confidence: 0.75
        };
      }

      // WAIT for thinking or followup invitation
      if (signals.isThinking || signals.invitesFollowup) {
        return {
          action: 'wait',
          reason: cognitiveCompleteness.reason,
          delayMs: 1200,
          confidence: cognitiveCompleteness.confidence
        };
      }
    }

    const userSentiment = this.detectSentiment(userInput);
    const isThinking = this.detectThinkingPattern(userInput);

    if (isThinking) {
      return {
        action: 'wait',
        reason: 'User appears to be thinking or formulating - wait for complete thought',
        delayMs: 800,
        confidence: 0.85
      };
    }

    if (momentType === 'reflex' && questionRisk === 'low') {
      return {
        action: 'speak',
        reason: 'Low-risk reflex moment - immediate response appropriate',
        confidence: 0.9
      };
    }

    if (momentType === 'judgment') {
      return {
        action: 'speak',
        reason: 'Judgment moment - natural AI generation provides sufficient timing',
        confidence: 0.85
      };
    }

    if (momentType === 'strategic') {
      const requiresDeliberation = questionRisk === 'high' || prospectState === 'closing';

      if (requiresDeliberation) {
        return {
          action: 'speak',
          reason: 'Strategic response ready - no artificial delay needed',
          delayMs: 0,
          confidence: 0.88
        };
      }

      return {
        action: 'speak',
        reason: 'Strategic response ready with acceptable timing',
        delayMs: 0,
        confidence: 0.8
      };
    }

    return {
      action: 'speak',
      reason: 'Default - proceed with natural timing',
      confidence: 0.7
    };
  }

  private detectSentiment(text: string): 'defensive' | 'curious' | 'neutral' | 'positive' {
    const defensivePatterns = /\b(but|however|actually|honestly|frankly|look|listen|understand|busy|time)\b/i;
    const curiousPatterns = /\b(interesting|tell me|how|what|why|curious|wondering)\b/i;
    const positivePatterns = /\b(great|good|nice|appreciate|thanks|sounds good)\b/i;

    if (defensivePatterns.test(text)) return 'defensive';
    if (curiousPatterns.test(text)) return 'curious';
    if (positivePatterns.test(text)) return 'positive';
    return 'neutral';
  }

  private detectThinkingPattern(text: string): boolean {
    const thinkingPatterns = [
      /\b(um|uh|hmm|let me think|give me a second|hold on)\b/i,
      /\.\.\.|…/,
      /^(well|so|like)\s/i
    ];

    return thinkingPatterns.some(pattern => pattern.test(text));
  }

  private checkMarcusDominance(recentHistory: Array<{ role: string; content: string }>): boolean {
    let marcusWordCount = 0;
    let userWordCount = 0;

    recentHistory.forEach(turn => {
      const wordCount = turn.content.split(/\s+/).length;
      if (turn.role === 'assistant') {
        marcusWordCount += wordCount;
      } else {
        userWordCount += wordCount;
      }
    });

    const ratio = userWordCount > 0 ? marcusWordCount / userWordCount : 999;
    return ratio > 2.0;
  }

  private isProbingForWeakness(text: string): boolean {
    const probingPatterns = [
      /\bwhy should\b/i,
      /\bwhat makes you\b/i,
      /\bhow do you know\b/i,
      /\bprove\b/i,
      /\bconvince me\b/i,
      /\bnot sure (if|that|about)\b/i,
      /\bskeptical\b/i
    ];

    return probingPatterns.some(pattern => pattern.test(text));
  }

  logSuppression(
    userInput: string,
    suppressedResponse: string,
    decision: JudgmentDecision
  ): void {
    this.suppressionLog.push({
      timestamp: Date.now(),
      userInput,
      suppressedResponse,
      reason: decision.reason,
      decision
    });

    console.log(`🛑 [Suppression] ${decision.reason}`);
    console.log(`   User: "${userInput.substring(0, 60)}..."`);
    console.log(`   Suppressed: "${suppressedResponse.substring(0, 60)}..."`);
  }

  getSuppressionLog(): SuppressionLog[] {
    return [...this.suppressionLog];
  }

  clearSuppressionLog(): void {
    this.suppressionLog = [];
  }

  assessRisk(userInput: string, conversationHistory: Array<{ role: string; content: string }>): {
    risk: 'low' | 'medium' | 'high';
    momentType: 'reflex' | 'judgment' | 'strategic';
    reason: string;
  } {
    const wordCount = userInput.split(/\s+/).length;
    const hasQuestionMark = /\?/.test(userInput);

    const isGreeting = /^(hey|hi|hello|how are you|what's up)/i.test(userInput);
    const isConfirmation = /\b(right|okay|sure|yes|yeah|got it)\b/i.test(userInput);
    const isSimpleYesNo = /^(are|is|do|does|did|can|could|will|would)\s/i.test(userInput) && wordCount <= 8;

    if (isGreeting || isConfirmation || (isSimpleYesNo && !this.hasAmbiguity(userInput))) {
      return {
        risk: 'low',
        momentType: 'reflex',
        reason: 'Simple rapport or confirmation question'
      };
    }

    const isObjection = /\b(why should|what makes you|not interested|don't need|too expensive|already have)\b/i.test(userInput);
    const isPricingQuestion = /\b(cost|price|pricing|expensive|budget|investment)\b/i.test(userInput);
    const isCommitmentQuestion = /\b(commitment|contract|guarantee|promise)\b/i.test(userInput);

    if (isObjection || isPricingQuestion || isCommitmentQuestion) {
      return {
        risk: 'high',
        momentType: 'strategic',
        reason: 'Objection, pricing, or commitment question - high training value'
      };
    }

    const isClarification = /\b(what do you mean|can you explain|like what|such as|for example)\b/i.test(userInput);
    const isRecall = /\b(you said|remember|earlier|before|didn't you)\b/i.test(userInput);

    if (isClarification || isRecall) {
      return {
        risk: 'medium',
        momentType: 'judgment',
        reason: 'Clarification or recall - requires accuracy but not strategic'
      };
    }

    const isDiscovery = /\b(biggest challenge|pain point|struggle|problem|issue|goal|objective)\b/i.test(userInput);
    const isProbing = /\b(tell me about|walk me through|describe|explain)\b/i.test(userInput);

    if (isDiscovery || isProbing || (hasQuestionMark && wordCount > 10)) {
      return {
        risk: 'high',
        momentType: 'strategic',
        reason: 'Discovery or complex probing question'
      };
    }

    return {
      risk: 'medium',
      momentType: 'judgment',
      reason: 'Default assessment - requires consideration'
    };
  }

  private hasAmbiguity(text: string): boolean {
    const ambiguousPatterns = [
      /\b(maybe|perhaps|might|could be|not sure|depends)\b/i,
      /\b(or|either)\b/
    ];

    return ambiguousPatterns.some(pattern => pattern.test(text));
  }
}

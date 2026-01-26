export type QuestionCategory = 'instant' | 'quick' | 'thoughtful' | 'deliberate' | 'statement';

export interface QuestionClassification {
  category: QuestionCategory;
  thinkingTime: number;
  confidence: number;
  questionType: string;
}

export interface QuestionPattern {
  patterns: RegExp[];
  category: QuestionCategory;
  thinkingTime: number;
  type: string;
  priority: number;
}

export class QuestionClassifier {
  private static readonly PATTERNS: QuestionPattern[] = [
    {
      patterns: [
        /^(hey|hi|hello|yo|sup|what's up|wassup|howdy)/i,
        /^how (are|is) (you|it|things|everything)/i,
        /^how('s| is) it going/i,
        /^(good|great|nice|awesome) (to|meeting|talking)/i,
      ],
      category: 'instant',
      thinkingTime: 150,
      type: 'greeting',
      priority: 10,
    },
    {
      patterns: [
        /\b(right|correct|yeah|yep|okay|ok|sure|exactly|absolutely)\??$/i,
        /^(you know|ya know|make sense|sound good|fair enough)/i,
        /^does that (make sense|work|sound good)/i,
      ],
      category: 'instant',
      thinkingTime: 100,
      type: 'confirmation_seeking',
      priority: 10,
    },
    {
      patterns: [
        /^(are you|is it|do you have|got) .{0,30}\?$/i,
        /^(is|are|do|does|did|can|could|will|would) (you|it|this|that|there)/i,
      ],
      category: 'instant',
      thinkingTime: 200,
      type: 'simple_yes_no',
      priority: 8,
    },
    {
      patterns: [
        /^what do you mean/i,
        /^can you (explain|clarify|elaborate)/i,
        /^(like what|such as|for example|meaning)/i,
        /^(sorry|what|huh|come again)/i,
      ],
      category: 'quick',
      thinkingTime: 500,
      type: 'clarification',
      priority: 9,
    },
    {
      patterns: [
        /^(remember|recall|didn't you|you said)/i,
        /^(when|where) (are|is|do|did) (you|we)/i,
        /^(what time|what day|which day)/i,
      ],
      category: 'quick',
      thinkingTime: 600,
      type: 'recall',
      priority: 7,
    },
    {
      patterns: [
        /^what (are|is) (your|the) (biggest|main|primary|key) (challenge|problem|issue|pain|struggle)/i,
        /^(tell me|walk me through|describe) (your|the) (process|workflow|system)/i,
        /^how (do|does) (you|your team|your company) (currently|typically|usually)/i,
        /^what (does|do) (you|your team|it) (look like|involve|entail)/i,
      ],
      category: 'thoughtful',
      thinkingTime: 1200,
      type: 'discovery',
      priority: 6,
    },
    {
      patterns: [
        /^what (do you think|are your thoughts|'s your take)/i,
        /^how do you feel about/i,
        /^(would you say|in your opinion|from your perspective)/i,
      ],
      category: 'thoughtful',
      thinkingTime: 1000,
      type: 'opinion',
      priority: 6,
    },
    {
      patterns: [
        /^what('s| is) the difference between/i,
        /^how (does|do) (this|that|it|they) compare/i,
        /^(this versus|vs|compared to)/i,
      ],
      category: 'thoughtful',
      thinkingTime: 1100,
      type: 'comparison',
      priority: 6,
    },
    {
      patterns: [
        /^how (much|expensive|affordable) (does it cost|is it|do you charge)/i,
        /^what('s| is) (the|your) (price|pricing|cost)/i,
        /^(can|could) (you|we) (talk about|discuss) (pricing|cost|budget)/i,
      ],
      category: 'deliberate',
      thinkingTime: 1800,
      type: 'pricing',
      priority: 5,
    },
    {
      patterns: [
        /^why should (i|we)/i,
        /^what makes you (different|special|better)/i,
        /^(why|how) (would|should|could) (this|that|it) (work|help)/i,
        /^(i'm|we're) (not sure|concerned|worried|skeptical)/i,
      ],
      category: 'deliberate',
      thinkingTime: 1600,
      type: 'objection',
      priority: 5,
    },
    {
      patterns: [
        /^how would (you|we) (handle|deal with|approach)/i,
        /^what if (we|i|you)/i,
        /^(suppose|imagine|let's say) (that|we|you)/i,
      ],
      category: 'deliberate',
      thinkingTime: 1700,
      type: 'hypothetical',
      priority: 5,
    },
  ];

  static classify(text: string): QuestionClassification {
    const trimmed = text.trim();
    
    if (!trimmed.endsWith('?') && !this.hasQuestionPattern(trimmed)) {
      return {
        category: 'statement',
        thinkingTime: 0,
        confidence: 1.0,
        questionType: 'statement',
      };
    }

    const matches = this.PATTERNS
      .map(pattern => ({
        pattern,
        match: pattern.patterns.some(p => p.test(trimmed)),
      }))
      .filter(m => m.match)
      .sort((a, b) => b.pattern.priority - a.pattern.priority);

    if (matches.length > 0) {
      const best = matches[0].pattern;
      return {
        category: best.category,
        thinkingTime: best.thinkingTime,
        confidence: 0.8 + (best.priority / 50),
        questionType: best.type,
      };
    }

    return this.getDefaultClassification(trimmed);
  }

  private static hasQuestionPattern(text: string): boolean {
    const questionWords = /^(what|when|where|who|why|how|which|whose|whom|can|could|would|should|is|are|do|does|did|will|have|has)/i;
    return questionWords.test(text);
  }

  private static getDefaultClassification(text: string): QuestionClassification {
    const wordCount = text.split(/\s+/).length;
    
    if (wordCount <= 5) {
      return {
        category: 'quick',
        thinkingTime: 500,
        confidence: 0.5,
        questionType: 'short_question',
      };
    } else if (wordCount <= 15) {
      return {
        category: 'thoughtful',
        thinkingTime: 1000,
        confidence: 0.5,
        questionType: 'medium_question',
      };
    } else {
      return {
        category: 'deliberate',
        thinkingTime: 1500,
        confidence: 0.5,
        questionType: 'long_question',
      };
    }
  }

  static getResponseStrategy(classification: QuestionClassification): {
    shouldSpeculate: boolean;
    speculationTrigger: 'immediate' | 'early' | 'normal';
    allowInterruption: boolean;
  } {
    switch (classification.category) {
      case 'instant':
        return {
          shouldSpeculate: true,
          speculationTrigger: 'immediate',
          allowInterruption: false,
        };
      
      case 'quick':
        return {
          shouldSpeculate: true,
          speculationTrigger: 'early',
          allowInterruption: false,
        };
      
      case 'thoughtful':
        return {
          shouldSpeculate: false,
          speculationTrigger: 'normal',
          allowInterruption: true,
        };
      
      case 'deliberate':
        return {
          shouldSpeculate: false,
          speculationTrigger: 'normal',
          allowInterruption: true,
        };
      
      case 'statement':
      default:
        return {
          shouldSpeculate: false,
          speculationTrigger: 'normal',
          allowInterruption: true,
        };
    }
  }
}

/**
 * SignalDetector.ts
 * Detects multiple surface-level signals in a single message
 * Foundation for multi-mechanic analysis
 */

export interface DetectedSignal {
  type: SignalType;
  confidence: number;
  text: string;
  position: number;
  pattern: string;
  metadata?: Record<string, any>;
}

export type SignalType =
  | 'permission_ask'
  | 'value_statement'
  | 'context_statement'
  | 'relevance_claim'
  | 'specificity_high'
  | 'specificity_medium'
  | 'specificity_low'
  | 'discovery_question'
  | 'close_ended_question'
  | 'feature_mention'
  | 'outcome_mention'
  | 'softened_claim'
  | 'definitive_claim'
  | 'greeting'
  | 'acknowledgment'
  | 'assumption_marker'
  | 'filler_opening'
  | 'apologetic_language'
  | 'pitch_marker'
  | 'rapport_token';

interface SignalPattern {
  type: SignalType;
  regex: RegExp;
  confidence: number;
  extractText?: (match: RegExpMatchArray, fullMessage: string) => string;
  metadata?: (match: RegExpMatchArray) => Record<string, any>;
}

export class SignalDetector {
  private patterns: SignalPattern[] = [
    {
      type: 'permission_ask',
      regex: /\b(do you have|can i take|is this a good time|got a (few )?minutes?|have a (quick )?(moment|second|minute))\b/gi,
      confidence: 0.95,
      extractText: (match, msg) => {
        const start = msg.toLowerCase().indexOf(match[0].toLowerCase());
        const sentence = this.extractSentence(msg, start);
        return sentence;
      }
    },
    {
      type: 'value_statement',
      regex: /\b(help (you|teams?|companies)|improve|reduce|increase|solve|fix|enable|deliver|provide)\s+[^.!?]{10,}/gi,
      confidence: 0.85,
      extractText: (match) => match[0],
      metadata: (match) => ({
        hasMetric: /\d+(%|percent|x|times|days|weeks|months)/i.test(match[0])
      })
    },
    {
      type: 'context_statement',
      regex: /\b(i work with|we work with|i help|we help|i specialize in|our focus is)\b/gi,
      confidence: 0.90,
      extractText: (match, msg) => {
        const start = msg.toLowerCase().indexOf(match[0].toLowerCase());
        return this.extractSentence(msg, start);
      }
    },
    {
      type: 'relevance_claim',
      regex: /\b(thought (this|it) might be|this (could|might) be|relevant to|applies to|fits your)\b/gi,
      confidence: 0.80,
      extractText: (match) => match[0]
    },
    {
      type: 'specificity_high',
      regex: /\b\d+(%|percent|x|times|\$|dollars|days|weeks|months|hours)\b/gi,
      confidence: 0.95,
      extractText: (match) => match[0]
    },
    {
      type: 'specificity_medium',
      regex: /\b(sales teams?|onboarding|ramp time|cold calls?|discovery|objection handling|positioning)\b/gi,
      confidence: 0.70,
      extractText: (match) => match[0]
    },
    {
      type: 'specificity_low',
      regex: /\b(your (business|company|team|process)|talk about your|discuss your|about your)\b/gi,
      confidence: 0.85,
      extractText: (match) => match[0]
    },
    {
      type: 'discovery_question',
      regex: /\b(what|how|why|tell me (about|more)|walk me through|help me understand|describe|biggest challenge)\b[^.!?]*\?/gi,
      confidence: 0.90,
      extractText: (match, msg) => {
        const start = msg.toLowerCase().indexOf(match[0].toLowerCase());
        return this.extractSentence(msg, start);
      }
    },
    {
      type: 'close_ended_question',
      regex: /\b(do you|can you|will you|are you|is (it|this|that)|have you|would you|did you)\b[^.!?]*\?/gi,
      confidence: 0.95,
      extractText: (match, msg) => {
        const start = msg.toLowerCase().indexOf(match[0].toLowerCase());
        return this.extractSentence(msg, start);
      }
    },
    {
      type: 'feature_mention',
      regex: /\b(feature|includes?|comes with|has|provides?|offers?|equipped with)\b/gi,
      confidence: 0.85,
      extractText: (match) => match[0]
    },
    {
      type: 'outcome_mention',
      regex: /\b(you'll (be able to|see|get)|you can|this means|the result is|which lets you|enabling you to)\b/gi,
      confidence: 0.80,
      extractText: (match) => match[0]
    },
    {
      type: 'softened_claim',
      regex: /\b(might|could|maybe|possibly|perhaps|thought (this|it) might|tend to|often|sometimes)\b/gi,
      confidence: 0.75,
      extractText: (match) => match[0]
    },
    {
      type: 'definitive_claim',
      regex: /\b(will|definitely|guaranteed|always|certainly|absolutely|proven to)\b/gi,
      confidence: 0.85,
      extractText: (match) => match[0]
    },
    {
      type: 'greeting',
      regex: /^(hey|hi|hello|good (morning|afternoon|evening))\b/i,
      confidence: 0.95,
      extractText: (match) => match[0]
    },
    {
      type: 'acknowledgment',
      regex: /\b(understand|makes sense|appreciate|thank you|got it|i see|that's (fair|good|interesting))\b/gi,
      confidence: 0.80,
      extractText: (match) => match[0]
    },
    {
      type: 'assumption_marker',
      regex: /\b(i assume|probably|i bet|you must|i'm sure you|most (companies|teams))\b/gi,
      confidence: 0.90,
      extractText: (match) => match[0]
    },
    {
      type: 'filler_opening',
      regex: /^(so|um|uh|basically|well|like|anyway)\s+/i,
      confidence: 0.95,
      extractText: (match) => match[0]
    },
    {
      type: 'apologetic_language',
      regex: /\b(sorry (to|for)|just wanted to|don't mean to|hate to bother|quick question|won't take long)\b/gi,
      confidence: 0.90,
      extractText: (match) => match[0]
    },
    {
      type: 'pitch_marker',
      regex: /\b(from ([\w\s]+)?(company|corp|inc|llc|solutions)|calling (from|about)|i'm with)\b/gi,
      confidence: 0.85,
      extractText: (match) => match[0]
    },
    {
      type: 'rapport_token',
      regex: /\b(how are you|how's (it|everything|things)|hope you're (well|doing well)|how have you been)\b/gi,
      confidence: 0.90,
      extractText: (match) => match[0]
    }
  ];

  detect(message: string): DetectedSignal[] {
    const signals: DetectedSignal[] = [];

    for (const pattern of this.patterns) {
      const matches = this.findAllMatches(message, pattern.regex);
      
      for (const match of matches) {
        const position = match.index || 0;
        const text = pattern.extractText 
          ? pattern.extractText(match, message)
          : match[0];
        
        const metadata = pattern.metadata 
          ? pattern.metadata(match)
          : undefined;

        signals.push({
          type: pattern.type,
          confidence: pattern.confidence,
          text: text.trim(),
          position,
          pattern: pattern.regex.source,
          metadata
        });
      }
    }

    return this.deduplicateSignals(signals);
  }

  private findAllMatches(text: string, regex: RegExp): RegExpMatchArray[] {
    const matches: RegExpMatchArray[] = [];
    const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
    
    let match: RegExpExecArray | null;
    while ((match = globalRegex.exec(text)) !== null) {
      matches.push(match as RegExpMatchArray);
    }
    
    return matches;
  }

  private extractSentence(message: string, startPos: number): string {
    let sentenceStart = message.lastIndexOf('.', startPos);
    if (sentenceStart === -1) sentenceStart = 0;
    else sentenceStart += 1;

    let sentenceEnd = message.indexOf('.', startPos);
    if (sentenceEnd === -1) {
      sentenceEnd = message.indexOf('?', startPos);
      if (sentenceEnd === -1) {
        sentenceEnd = message.indexOf('!', startPos);
        if (sentenceEnd === -1) {
          sentenceEnd = message.length;
        }
      }
    }

    return message.substring(sentenceStart, sentenceEnd + 1).trim();
  }

  private deduplicateSignals(signals: DetectedSignal[]): DetectedSignal[] {
    const seen = new Set<string>();
    return signals.filter(signal => {
      const key = `${signal.type}:${signal.position}:${signal.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  getSignalsByType(signals: DetectedSignal[], type: SignalType): DetectedSignal[] {
    return signals.filter(s => s.type === type);
  }

  getHighConfidenceSignals(signals: DetectedSignal[], threshold: number = 0.85): DetectedSignal[] {
    return signals.filter(s => s.confidence >= threshold);
  }

  sortByPosition(signals: DetectedSignal[]): DetectedSignal[] {
    return [...signals].sort((a, b) => a.position - b.position);
  }

  sortByConfidence(signals: DetectedSignal[]): DetectedSignal[] {
    return [...signals].sort((a, b) => b.confidence - a.confidence);
  }
}

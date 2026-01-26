export interface CognitiveAnalysis {
  isCognitivelyComplete: boolean;
  reason: string;
  confidence: number;
  signals: {
    isHedging: boolean;
    isAmbiguous: boolean;
    isThinking: boolean;
    invitesFollowup: boolean;
    strategicPause: boolean;
  };
}

export class CognitiveCompletenessAnalyzer {
  
  static analyze(text: string, conversationContext?: Array<{ role: 'user' | 'assistant'; content: string }>): CognitiveAnalysis {
    const trimmed = text.trim().toLowerCase();
    
    // EARLY EXIT: Farewells and call-ending statements are always complete
    if (this.detectFarewell(trimmed)) {
      return {
        isCognitivelyComplete: true,
        reason: 'Farewell or call-ending statement - complete thought',
        confidence: 0.95,
        signals: {
          isHedging: false,
          isAmbiguous: false,
          isThinking: false,
          invitesFollowup: false,
          strategicPause: false
        }
      };
    }
    
    const signals = {
      isHedging: this.detectHedging(trimmed),
      isAmbiguous: this.detectAmbiguity(trimmed),
      isThinking: this.detectThinking(trimmed),
      invitesFollowup: this.detectFollowupInvitation(trimmed),
      strategicPause: this.detectStrategicPause(trimmed)
    };

    // CRITICAL: Detect "committed ask" - hedging in delivery doesn't invalidate clear questions
    const hasAskCue = this.detectCommittedAsk(trimmed);
    const endsWithCommitment = hasAskCue;

    // Ambiguity (single word responses) always incomplete
    if (signals.isAmbiguous) {
      return {
        isCognitivelyComplete: false,
        reason: 'Strategic ambiguity - prospect may be testing or withholding',
        confidence: 0.8,
        signals
      };
    }

    // Explicit thinking patterns (um, uh, let me think) = incomplete
    if (signals.isThinking && !endsWithCommitment) {
      return {
        isCognitivelyComplete: false,
        reason: 'Thinking patterns indicate formulating, not landing',
        confidence: 0.85,
        signals
      };
    }

    // Hedging is only incomplete if there's NO clear ask/commitment
    if (signals.isHedging && !endsWithCommitment) {
      return {
        isCognitivelyComplete: false,
        reason: 'Hedging language suggests incomplete commitment to thought',
        confidence: 0.75,
        signals
      };
    }

    // Followup invitations suggest waiting
    if (signals.invitesFollowup) {
      return {
        isCognitivelyComplete: false,
        reason: 'Statement invites or expects followup - waiting shows engagement',
        confidence: 0.7,
        signals
      };
    }

    // Strategic pauses have training value
    if (signals.strategicPause) {
      return {
        isCognitivelyComplete: false,
        reason: 'Strategic pause moment - silence has training value here',
        confidence: 0.65,
        signals
      };
    }

    return {
      isCognitivelyComplete: true,
      reason: 'Thought appears to have landed - safe to respond',
      confidence: 0.8,
      signals
    };
  }

  private static detectHedging(text: string): boolean {
    const hedgingPatterns = [
      /\bi guess\b/,
      /\bmaybe\b/,
      /\bperhaps\b/,
      /\bkind of\b/,
      /\bsort of\b/,
      /\bprobably\b/,
      /\bcould be\b/,
      /\bmight be\b/,
      /\bnot sure\b/,
      /\bi don't know\b/,
      /\bi suppose\b/,
      /\bpossibly\b/,
      /\bi think so\b/,
      /\bseems like\b/,
      /\bwhatever\b$/,
      /\bi mean\b/
    ];

    return hedgingPatterns.some(pattern => pattern.test(text));
  }

  private static detectAmbiguity(text: string): boolean {
    const ambiguityPatterns = [
      /^yeah\.?\s*$/,
      /^okay\.?\s*$/,
      /^sure\.?\s*$/,
      /^right\.?\s*$/,
      /^interesting\.?\s*$/,
      /^that's interesting\.?\s*$/,
      /^i see\.?\s*$/,
      /^got it\.?\s*$/,
      /^makes sense\.?\s*$/,
      /^fair enough\.?\s*$/,
      /^huh\.?\s*$/,
      /^hm+\.?\s*$/,
      /^well\.?\s*$/,
      /^so\.?\s*$/,
      /^alright\.?\s*$/,
      /^cool\.?\s*$/
    ];

    const endsWithTrailingThought = /\.\.\.$|…$/;
    
    if (ambiguityPatterns.some(pattern => pattern.test(text))) {
      return true;
    }

    if (endsWithTrailingThought.test(text)) {
      return true;
    }

    const words = text.split(/\s+/);
    if (words.length <= 3 && !text.includes('?')) {
      return true;
    }

    return false;
  }

  private static detectThinking(text: string): boolean {
    const thinkingPatterns = [
      /^um+\.?\s*/,
      /^uh+\.?\s*/,
      /^er+\.?\s*/,
      /\blet me think\b/,
      /\blet me see\b/,
      /\bhow do i put this\b/,
      /\bhow can i say\b/,
      /\bwhat's the word\b/,
      /\byou know what i mean\b/,
      /\byou know\b$/,
      /\blike\b.*\blike\b/,
      /\bso+\b.*\bso+\b/
    ];

    return thinkingPatterns.some(pattern => pattern.test(text));
  }

  private static detectFollowupInvitation(text: string): boolean {
    const followupInvitations = [
      /\bwhat do you think\??\s*$/,
      /\bmake sense\??\s*$/,
      /\bsound good\??\s*$/,
      /\bfair\??\s*$/,
      /\bright\??\s*$/,
      /\byou know\??\s*$/,
      /\bor\b$/,
      /\bbut\b$/,
      /\band\b$/
    ];

    const endsWithHangingConjunction = /\b(or|and|but|so)\b\.?\s*$/;
    
    return followupInvitations.some(pattern => pattern.test(text)) || 
           endsWithHangingConjunction.test(text);
  }

  private static detectStrategicPause(text: string): boolean {
    const strategicPausePatterns = [
      /\bi'll have to think about (that|it)\b/,
      /\bneed to consider\b/,
      /\bneed to discuss (this|that|it)\b/,
      /\btalk to my (team|partner|boss)\b/,
      /\brun (this|that|it) by\b/,
      /\bnot ready to commit\b/,
      /\bdon't want to rush\b/,
      /\bneed more time\b/,
      /\blet me get back to you\b/
    ];

    const politeResistance = /^(yeah|well|okay|sure|right),?\s+(but|however|though)\b/;

    return strategicPausePatterns.some(pattern => pattern.test(text)) ||
           politeResistance.test(text);
  }

  /**
   * Detect farewell or call-ending statements
   * These are always complete thoughts and should never trigger HOLD
   */
  private static detectFarewell(text: string): boolean {
    const farewellPatterns = [
      /^(bye|goodbye|see you|talk soon|take care|catch you later|later|peace|cheers)/,
      /\b(bye|goodbye|see you|talk soon|take care|have a good|wish you|all the best)\b/,
      /\b(not waste|won't waste|don't want to waste).*time\b/,
      /\b(appreciate|thanks for).*(time|chat|conversation|call)\b/,
      /\b(good catching up|great meeting|nice talking|pleasure speaking)\b/
    ];
    
    return farewellPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Detect if user has made a "committed ask" - a clear question, request, offer, or proposal
   * Multiple cues: punctuation, modal verbs, wh-words, imperatives, discourse markers, offers
   * If ANY of these are present, hedging becomes style, not incompleteness
   */
  private static detectCommittedAsk(text: string): boolean {
    // Punctuation cue: ends with question mark
    const endsWithQuestion = /\?\s*$/.test(text);
    
    // Wh-word questions: what, why, how, when, where, who, which
    const hasWhWord = /\b(what|why|how|when|where|who|which|whose)\b/.test(text);
    
    // Modal request verbs: can/could/would/may/should you/I
    const hasModalRequest = /\b(can|could|would|may|should|will)\s+(you|i|we)\b/.test(text);
    
    // Do/does/did questions
    const hasDoQuestion = /\b(do|does|did|are|is|was|were)\s+you\b/.test(text);
    
    // Imperative requests: tell me, walk me through, help me, show me, explain
    const hasImperative = /\b(tell|walk|help|show|explain|describe|give)\s+me\b/.test(text);
    
    // Discourse markers: my question is, I'm wondering, I'm curious, I wanted to ask
    const hasDiscourseMarker = /\b(my question|i'm wondering|i'm curious|i wanted to ask|i was wondering|wondering if)\b/.test(text);
    
    // "Let me ask" constructions
    const hasLetMeAsk = /\blet me ask\b/.test(text);
    
    // SALES OFFERS/PROPOSALS - these are complete commitments even with hedging
    const hasOffer = /\b(meet up|grab coffee|hop on a call|schedule|set up a time|reach out|follow up|send you|share|get together)\b/.test(text);
    const hasProposal = /\b(i can|we can|i could|we could|i'd be happy to|we'd love to|let me|i'll)\b/.test(text);
    const hasActionClosure = /\b(let me know|feel free|sound good|work for you|make sense|thoughts)\b/.test(text);
    
    return endsWithQuestion || 
           hasWhWord || 
           hasModalRequest || 
           hasDoQuestion || 
           hasImperative || 
           hasDiscourseMarker ||
           hasLetMeAsk ||
           hasOffer ||
           hasProposal ||
           hasActionClosure;
  }

  static shouldHold(analysis: CognitiveAnalysis): boolean {
    return !analysis.isCognitivelyComplete && analysis.confidence >= 0.65;
  }
}

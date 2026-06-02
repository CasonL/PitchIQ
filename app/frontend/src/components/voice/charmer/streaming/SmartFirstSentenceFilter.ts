/**
 * SmartFirstSentenceFilter.ts
 * Context-aware regex patterns to determine if first sentence is safe to stream
 * Removes hard-coded backchannel restrictions while preventing Marcus from saying wrong things
 */

export interface StreamingContext {
  phase: 'prospect' | 'coach' | 'exit';
  turnNumber: number;
  userInput: string;
  lastMarcusMessage?: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  hasUserName: boolean;
  buyerState?: {
    resistanceLevel?: number;
    patience?: number;
    openness?: number;
  };
  questionCategory?: string;
}

export class SmartFirstSentenceFilter {
  /**
   * Determine if first sentence is safe to stream based on call context
   * Returns true if sentence aligns with expected Marcus behavior
   */
  static isSafeToStream(firstSentence: string, context: StreamingContext): boolean {
    const normalized = firstSentence.trim().toLowerCase();
    
    // ALWAYS SAFE: Simple acknowledgments (original safe backchannels)
    if (this.isSimpleAcknowledgment(normalized)) {
      console.log('✅ [Stream] Simple acknowledgment');
      return true;
    }
    
    // TURN 1: Marcus greeting patterns
    if (context.turnNumber === 1) {
      if (this.isGreeting(normalized)) {
        console.log('✅ [Stream] Turn 1 greeting');
        return true;
      }
      console.log('⏸️ [Block] Turn 1 non-greeting');
      return false;
    }
    
    // USER ASKED A QUESTION: Marcus should answer or deflect
    if (this.userAskedQuestion(context.userInput)) {
      // Safe: Direct answers, clarifying questions, or deflections
      if (this.isAnswerPattern(normalized) || 
          this.isClarifyingQuestion(normalized) ||
          this.isDeflection(normalized)) {
        console.log('✅ [Stream] Response to user question');
        return true;
      }
      // Don't block yet - check other patterns below
    }
    
    // USER MADE A PITCH: Marcus should react naturally
    if (this.isPitchPattern(context.userInput)) {
      // Safe: Reactions, questions, objections
      if (this.isReaction(normalized) || 
          this.isFollowUpQuestion(normalized) ||
          this.isObjection(normalized)) {
        console.log('✅ [Stream] Natural reaction to pitch');
        return true;
      }
      // Don't block yet - check other patterns below
    }
    
    // USER INTRODUCED THEMSELVES: Marcus should acknowledge
    if (this.isIntroduction(context.userInput) && !context.hasUserName) {
      if (this.isNameAcknowledgment(normalized)) {
        console.log('✅ [Stream] Name acknowledgment');
        return true;
      }
      // Don't block yet - check other patterns below
    }
    
    // USER GAVE PROOF/CASE STUDY: Marcus should react
    if (this.isProofProvided(context.userInput)) {
      if (this.isProofReaction(normalized)) {
        console.log('✅ [Stream] Reaction to proof');
        return true;
      }
      // Don't block yet - check other patterns below
    }
    
    // HIGH RESISTANCE: Marcus should be skeptical/brief
    if (context.buyerState && context.buyerState.resistanceLevel && context.buyerState.resistanceLevel > 7) {
      if (this.isSkepticalResponse(normalized) || this.isSimpleAcknowledgment(normalized)) {
        console.log('✅ [Stream] High resistance response');
        return true;
      }
      console.log('⏸️ [Block] Too friendly for high resistance');
      return false;
    }
    
    // LOW PATIENCE: Marcus should be brief/impatient
    if (context.buyerState && context.buyerState.patience && context.buyerState.patience < 3) {
      if (this.isImpatientResponse(normalized) || this.isExitSignal(normalized)) {
        console.log('✅ [Stream] Low patience response');
        return true;
      }
      console.log('⏸️ [Block] Too patient for low patience state');
      return false;
    }
    
    // DEFAULT: Allow common conversational patterns
    if (this.isCommonConversationalPattern(normalized)) {
      console.log('✅ [Stream] Common conversational pattern');
      return true;
    }
    
    // FALLBACK: Block if we're not confident
    console.log(`⏸️ [Block] No matching pattern for: "${firstSentence.substring(0, 40)}..."`);
    return false;
  }
  
  // ===== PATTERN DETECTORS =====
  
  private static isSimpleAcknowledgment(text: string): boolean {
    const patterns = [
      /^(mm|mmhm|mhm)\.?$/,
      /^(okay|ok|alright|right|yeah|yep|sure|got it|i hear you|uh-huh)\.?$/,
      /^(interesting|i see|fair enough|makes sense)\.?$/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isGreeting(text: string): boolean {
    const patterns = [
      /^(hello|hi|hey|good morning|good afternoon)/,
      /^(this is|it's|speaking|marcus here)/,
      /^(who'?s this|who am i speaking with)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static userAskedQuestion(userInput: string): boolean {
    return userInput.includes('?') || 
           /^(how|what|why|when|where|who|can you|could you|do you|are you|is this|tell me|explain)/i.test(userInput);
  }
  
  private static isAnswerPattern(text: string): boolean {
    const patterns = [
      /^(yeah|yes|no|not really|kind of|sort of)/,
      /^(we'?re using|we have|we use|we do|we don't)/,
      /^(it'?s|that'?s|this is)/,
      /^(i mean|honestly|to be honest|look)/,
      /^(uh|um|well|so)/,  // Thinking/filler before answer
      /^(i'?m|i don't|i do)/  // First-person answers
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isClarifyingQuestion(text: string): boolean {
    const patterns = [
      /^(what do you mean|like what|such as|can you give me an example)/,
      /^(how so|in what way|how does that)/,
      /^(wait|hold on|sorry)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isDeflection(text: string): boolean {
    const patterns = [
      /^(i'?m not sure|i don't know|that'?s a good question)/,
      /^(maybe|possibly|it depends)/,
      /^(why do you ask|what makes you)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isPitchPattern(userInput: string): boolean {
    const pitchKeywords = /\b(we help|we do|our (product|solution|platform|tool|service)|it (works|helps|does|gives|provides)|you can|you'?ll be able to)\b/i;
    return pitchKeywords.test(userInput) && userInput.split(/\s+/).length > 15;
  }
  
  private static isReaction(text: string): boolean {
    const patterns = [
      /^(okay|alright|i see|interesting|huh|oh)/,
      /^(that sounds|sounds like)/,
      /^(so you'?re saying|so it'?s)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isFollowUpQuestion(text: string): boolean {
    const patterns = [
      /^(how|what|why|when)/,
      /^(and|but|so) (how|what|why)/,
      /^(okay,? but|alright,? but|sure,? but)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isObjection(text: string): boolean {
    const patterns = [
      /^(i'?m not sure|i don't think|i'?m not convinced)/,
      /^(we already have|we'?re using|we'?re happy with)/,
      /^(that'?s|this is) (expensive|a lot|too much)/,
      /^(i don't see|i'?m not seeing)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isIntroduction(userInput: string): boolean {
    return /\b(it'?s|this is|my name is|i'?m|call me)\s+[A-Z]/i.test(userInput) ||
           /\b[A-Z][a-z]+\s+from\s+/i.test(userInput);
  }
  
  private static isNameAcknowledgment(text: string): boolean {
    const patterns = [
      /^(nice to meet you|good to meet you|pleasure)/,
      /^(hi|hey|hello),?\s+[a-z]+/,  // "Hi Jason"
      /^(thanks for|appreciate you)/,
      /^(alright|okay|cool),?\s+[a-z]+/  // "Alright Jason"
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isProofProvided(userInput: string): boolean {
    const proofPatterns = /\b(company|customer|client|team|organization)\s+(\w+\s+){0,3}(saw|achieved|got|reached|increased|improved|reduced)\b/i;
    const examplePatterns = /\b(for example|such as|case study|real example|like)\b/i;
    return proofPatterns.test(userInput) || examplePatterns.test(userInput);
  }
  
  private static isProofReaction(text: string): boolean {
    const patterns = [
      /^(okay|interesting|i see|that'?s good)/,
      /^(how|what|who) (long|much|many)/,  // "How long did that take?"
      /^(and|but) (how|what|why)/,
      /^(still|but|however)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isSkepticalResponse(text: string): boolean {
    const patterns = [
      /^(i don't know|i'?m not sure|maybe)/,
      /^(we'?ll see|i'?ll think about it)/,
      /^(that'?s what they all say|i'?ve heard that before)/,
      /^(uh-huh|sure|right)\.?$/  // Dismissive short responses
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isImpatientResponse(text: string): boolean {
    const patterns = [
      /^(look|listen|okay)/,
      /^(i (really )?need to|i (really )?have to|i should)/,
      /^(can you just|just send|just email)/,
      /^(i don't have time|i'?m busy)/,
      /^i'?m (busy|swamped|tied up|in the middle)/  // Busy variations
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isExitSignal(text: string): boolean {
    const patterns = [
      /^(i (really )?need to go|i (really )?have to run|i should get going)/,
      /^(thanks but|i appreciate it but)/,
      /^(let me think about it|send me)/,
      /^(i'?ll|we'?ll) (pass|be in touch|reach out)/
    ];
    return patterns.some(p => p.test(text));
  }
  
  private static isCommonConversationalPattern(text: string): boolean {
    const patterns = [
      /^(so|well|look|listen|honestly|to be honest)/,
      /^(i mean|i think|i feel like)/,
      /^(yeah|yes|no|not really),/,  // Followed by elaboration
      /^(that'?s|this is|it'?s) (a|the|not)/,
      /^(okay|alright|sure),/,  // Followed by elaboration
      /^(i'?m|i don't|i do|i have|i haven't)/,  // First-person statements
      /^(thanks|thank you|appreciate)/  // Gratitude
    ];
    return patterns.some(p => p.test(text));
  }
}

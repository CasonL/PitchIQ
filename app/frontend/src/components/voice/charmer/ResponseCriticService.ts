/**
 * ResponseCriticService.ts
 * Fast, rule-based detection of "AI smell" in Marcus's responses
 * 
 * No LLM calls - pure heuristics for speed
 * Shared by both single-LLM and multi-model architectures
 */

export interface CriticScore {
  human_score: number;        // 0-100 (higher = more human-like)
  flags: string[];            // Issues detected
  length_ok: boolean;
  word_count: number;
  question_count: number;
  helpfulness_penalty: number;
  character_fidelity: number;
  naturalness: number;
}

export interface CriticContext {
  userLastMessage: string;
  marcusIrritation: number;   // 0-10
  trustLevel: number;         // 0-100
  exchangeCount: number;
}

export class ResponseCriticService {
  
  /**
   * Fast critique of a response - NO LLM CALL
   * Returns score + actionable flags
   */
  critiqueFast(response: string, context: CriticContext): CriticScore {
    const flags: string[] = [];
    let helpfulness_penalty = 0;
    let character_fidelity = 100;
    let naturalness = 100;
    
    // 1. LENGTH CHECK (humans are brief in calls)
    const word_count = this.countWords(response);
    const length_ok = word_count <= 40;
    
    if (word_count > 40) {
      flags.push('too_long');
      naturalness -= 15;
    }
    if (word_count > 60) {
      flags.push('way_too_long');
      naturalness -= 25;
    }
    
    // 2. QUESTION COUNT (humans ask 0-1 questions per turn, not 3)
    const question_count = (response.match(/\?/g) || []).length;
    if (question_count > 1) {
      flags.push('too_many_questions');
      naturalness -= 20;
    }
    
    // 3. AI SMELL DETECTION
    const aiSmellDetected = this.detectAISmell(response);
    if (aiSmellDetected.detected) {
      flags.push('ai_smell');
      helpfulness_penalty += 30;
      character_fidelity -= 40;
      aiSmellDetected.patterns.forEach(p => flags.push(`ai_smell:${p}`));
    }
    
    // 4. OVER-MIRRORING (copying user's language too much)
    if (this.detectOverMirroring(response, context.userLastMessage)) {
      flags.push('over_mirroring');
      naturalness -= 15;
    }
    
    // 5. HELPFULNESS DETECTION (Marcus shouldn't be helpful)
    const helpfulnessDetected = this.detectHelpfulness(response);
    if (helpfulnessDetected) {
      flags.push('too_helpful');
      helpfulness_penalty += 25;
      character_fidelity -= 30;
    }
    
    // 6. STRUCTURE DETECTION (lists, bullets, paragraphs = AI)
    if (this.detectStructuredFormatting(response)) {
      flags.push('structured_formatting');
      naturalness -= 20;
      flags.push('ai_smell:structure');
    }
    
    // 7. EMOTION MISMATCH (if Marcus is irritated but response is cheerful)
    if (this.detectEmotionMismatch(response, context)) {
      flags.push('emotion_mismatch');
      character_fidelity -= 25;
    }
    
    // 8. OVER-EXPLAINING (humans don't explain everything)
    if (this.detectOverExplaining(response)) {
      flags.push('over_explaining');
      helpfulness_penalty += 15;
      naturalness -= 10;
    }
    
    // 9. TOO PERFECT GRAMMAR (humans use fragments, contractions)
    if (this.detectPerfectGrammar(response)) {
      flags.push('too_perfect');
      naturalness -= 10;
    }
    
    // Calculate composite human_score
    const human_score = Math.max(0, Math.min(100,
      100 - helpfulness_penalty - (100 - character_fidelity) - (100 - naturalness)
    ));
    
    return {
      human_score,
      flags,
      length_ok,
      word_count,
      question_count,
      helpfulness_penalty,
      character_fidelity,
      naturalness
    };
  }
  
  /**
   * Detect classic AI assistant patterns
   */
  private detectAISmell(text: string): { detected: boolean; patterns: string[] } {
    const patterns: Array<{ regex: RegExp; name: string }> = [
      { regex: /as an? (ai|language model|assistant)/i, name: 'ai_identity' },
      { regex: /i (can help|understand|appreciate) (that|you)/i, name: 'helper_language' },
      { regex: /let me (explain|break|clarify|walk you through)/i, name: 'explainer_mode' },
      { regex: /here('?s| is) (what|how|why|the thing)/i, name: 'here_is_pattern' },
      { regex: /(first(ly)?|second(ly)?|third(ly)?|finally)[,:]/i, name: 'list_markers' },
      { regex: /in summary|to summarize|to clarify/i, name: 'meta_language' },
      { regex: /\b(essentially|basically|fundamentally)\b/i, name: 'academic_hedges' },
      { regex: /happy to|glad to|would love to|more than happy/i, name: 'eager_helper' },
      { regex: /absolutely|definitely|certainly|of course/i, name: 'over_agreement' },
      { regex: /it sounds like|it seems like|it appears/i, name: 'therapist_language' },
      { regex: /what('?s| is) on your mind/i, name: 'therapist_opener' },
      { regex: /how can i (help|assist|support) you/i, name: 'customer_service' },
      { regex: /what (brings you|can i do for you)/i, name: 'service_desk' },
      { regex: /is there anything (else )?(i can|you need)/i, name: 'checkout_clerk' },
      { regex: /what (got you|made you|brought you) (interested|thinking|curious)/i, name: 'therapist_curiosity' },
      { regex: /tell me (more about|about) (that|what|how|why)/i, name: 'therapist_probe' },
      { regex: /what are (you|we) (diving into|talking about|discussing)/i, name: 'facilitator_mode' }
    ];
    
    const detected_patterns: string[] = [];
    for (const { regex, name } of patterns) {
      if (regex.test(text)) {
        detected_patterns.push(name);
      }
    }
    
    return {
      detected: detected_patterns.length > 0,
      patterns: detected_patterns
    };
  }
  
  /**
   * Detect if response mirrors user's language too closely
   */
  private detectOverMirroring(response: string, userMessage: string): boolean {
    const userWords = this.extractContentWords(userMessage);
    const responseWords = this.extractContentWords(response);
    
    if (userWords.length < 3) return false; // Too short to judge
    
    // Count how many user words appear in response
    const overlap = userWords.filter(w => responseWords.includes(w));
    const overlapRatio = overlap.length / userWords.length;
    
    // If >50% of user's unique words appear in response = suspicious
    return overlapRatio > 0.5 && overlap.length > 3;
  }
  
  /**
   * Extract meaningful content words (not stopwords)
   */
  private extractContentWords(text: string): string[] {
    const stopwords = new Set([
      'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'to', 'of', 'in', 'on', 'at', 'by',
      'for', 'with', 'about', 'as', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'under', 'again', 'further',
      'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
      'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
      'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just'
    ]);
    
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w));
  }
  
  /**
   * Detect helpfulness (explaining, offering assistance, volunteering info)
   */
  private detectHelpfulness(text: string): boolean {
    const helpfulPatterns = [
      /let me (help|show|tell|explain)/i,
      /i('d| would) (be happy|love|like) to/i,
      /what i can do is/i,
      /here('?s| is) what (i suggest|we can do|you could)/i,
      /the way (this|it|that) works is/i,
      /basically what (happens|you do) is/i,
      /you (could|should|might want to)/i,
      /have you (considered|thought about|tried)/i
    ];
    
    return helpfulPatterns.some(p => p.test(text));
  }
  
  /**
   * Detect structured formatting (lists, bullets, numbered items)
   */
  private detectStructuredFormatting(text: string): boolean {
    return /\n\n|\n[-•*]|\n\d+\./.test(text);
  }
  
  /**
   * Detect emotion mismatch with Marcus's state
   */
  private detectEmotionMismatch(text: string, context: CriticContext): boolean {
    // If Marcus is irritated (>6) but response sounds cheerful
    if (context.marcusIrritation > 6) {
      const cheerfulMarkers = /great|awesome|love|excited|happy|wonderful/i;
      if (cheerfulMarkers.test(text)) {
        return true;
      }
    }
    
    // If Marcus has low trust but response is overly open
    if (context.trustLevel < 30) {
      const overlyOpenMarkers = /let me tell you|here's the thing|honestly|between you and me/i;
      if (overlyOpenMarkers.test(text)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Detect over-explaining (humans don't explain every detail)
   */
  private detectOverExplaining(text: string): boolean {
    const explainerMarkers = [
      /the reason (is|being|why)/i,
      /what (that means|this means) is/i,
      /in other words/i,
      /to put it (simply|another way)/i,
      /the point (is|being)/i
    ];
    
    return explainerMarkers.some(p => p.test(text));
  }
  
  /**
   * Detect overly perfect grammar (humans use fragments, contractions)
   */
  private detectPerfectGrammar(text: string): boolean {
    // Check for lack of contractions in longer responses
    const hasContractions = /\b(I'm|you're|it's|that's|don't|won't|can't|I've|we're)\b/.test(text);
    const wordCount = this.countWords(text);
    
    if (wordCount > 20 && !hasContractions) {
      return true; // Suspiciously formal
    }
    
    // Check for overly complete sentences (no fragments)
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 2) {
      // Real humans use fragments like "Not sure." "Maybe." "Huh."
      const hasFragments = sentences.some(s => this.countWords(s) < 4);
      if (!hasFragments) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(w => w.length > 0).length;
  }
  
  /**
   * Generate human-readable summary of critique
   */
  generateSummary(score: CriticScore): string {
    if (score.human_score >= 80) {
      return `Strong (${score.human_score}/100) - Feels human`;
    } else if (score.human_score >= 60) {
      return `Decent (${score.human_score}/100) - Minor issues: ${score.flags.slice(0, 2).join(', ')}`;
    } else if (score.human_score >= 40) {
      return `Weak (${score.human_score}/100) - AI smell detected: ${score.flags.slice(0, 3).join(', ')}`;
    } else {
      return `Failed (${score.human_score}/100) - Major problems: ${score.flags.join(', ')}`;
    }
  }
}

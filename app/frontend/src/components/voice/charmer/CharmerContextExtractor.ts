/**
 * CharmerContextExtractor.ts
 * Extracts key information from user speech for Marcus's coaching
 */

export interface ExtractedInfo {
  name?: string;
  product?: string;
  targetAudience?: string;
  memorablePhrase?: string;
  detectedIssues: CoachingIssue[];
  strengths: string[];
}

export type CoachingIssueType = 
  | 'close-ended'
  | 'feature-dump'
  | 'weak-opening'
  | 'vague'
  | 'no-discovery'
  | 'too-fast'
  | 'apologetic'
  | 'feature-focus';

export interface CoachingIssue {
  type: CoachingIssueType;
  example: string;
  feedback: string;
}

export class CharmerContextExtractor {
  /**
   * Extract user's name from transcript
   */
  static extractName(transcript: string, currentName?: string): string | null {
    // First check for name corrections (higher priority)
    const correction = this.detectNameCorrection(transcript);
    if (correction) {
      console.log(`🔄 Name corrected: ${currentName} → ${correction}`);
      return correction;
    }
    
    // Patterns: "I'm X", "My name is X", "This is X", "X here"
    const patterns = [
      /(?:i'm|i am)\s+([A-Z][a-z]+)/i,
      /(?:my name is|my name's)\s+([A-Z][a-z]+)/i,
      /(?:this is|it's)\s+([A-Z][a-z]+)/i,
      /^([A-Z][a-z]+)(?:\s+here|\s+speaking)/i
    ];
    
    for (const pattern of patterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Filter out common false positives and non-names
        const blacklist = [
          'Hello', 'Hi', 'Hey', 'Yes', 'Yeah', 'Sure', 'Okay', 'Thanks', 'Great', 'Good', 'Fine',
          'Interesting', 'Sorry', 'Please', 'Welcome', 'Excuse', 'Pardon', 'Maybe', 'Perfect',
          'Exactly', 'Absolutely', 'Definitely', 'Actually', 'Really', 'Truly', 'Honestly'
        ];
        if (!blacklist.includes(name)) {
          console.log(`✅ Extracted name: ${name}`);
          return name;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Detect name corrections like "it's actually Kason" or "no it's Kason"
   */
  static detectNameCorrection(transcript: string): string | null {
    const correctionPatterns = [
      /(?:it's|its)\s+(?:actually|spelled)\s+([A-Z][a-z]+)/i,
      /(?:no|actually|correction)\s+(?:it's|its|my name is)\s+([A-Z][a-z]+)/i,
      /(?:my name is actually|my name's actually)\s+([A-Z][a-z]+)/i,
      /(?:it's|its)\s+([A-Z][a-z]+)\s+not\s+[A-Z][a-z]+/i, // "it's Kason not Carson"
      /not\s+[A-Z][a-z]+\s+(?:it's|its)\s+([A-Z][a-z]+)/i  // "not Carson it's Kason"
    ];
    
    for (const pattern of correctionPatterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  /**
   * Extract product/service from pitch
   */
  static extractProduct(transcript: string): string | null {
    // Patterns: "I help X with Y", "We offer X", "My product is X", "I sell X"
    const patterns = [
      /(?:i help|we help)\s+.+?\s+(?:with|to|by)\s+(.+?)(?:\.|,|$)/i,
      /(?:my product is|our product is|i sell|we sell)\s+(.+?)(?:\.|,|$)/i,
      /(?:we offer|i offer|we provide)\s+(.+?)(?:\.|,|$)/i,
      /(?:it's|its)\s+(?:a|an)\s+(.+?)(?:\s+that|\s+for|\.|,|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const product = match[1].trim().substring(0, 100); // Limit length
        console.log(`✅ Extracted product: ${product}`);
        return product;
      }
    }
    
    return null;
  }
  
  /**
   * Detect coaching issues in user's pitch
   */
  static detectCoachingIssues(transcript: string): CoachingIssue[] {
    const issues: CoachingIssue[] = [];
    const lowerTranscript = transcript.toLowerCase();
    
    // Issue 1: Close-Ended Questions
    const closeEndedPatterns = [
      /\b(do you|can you|will you|are you|is it|have you|would you)\b/gi
    ];
    
    for (const pattern of closeEndedPatterns) {
      const matches = transcript.match(pattern);
      if (matches && matches.length > 0) {
        const example = matches[0];
        issues.push({
          type: 'close-ended',
          example,
          feedback: "That yes/no question? Almost lost me there."
        });
        break; // Only report once
      }
    }
    
    // Issue 2: Feature Dumps (listing 3+ features without pain connection)
    const featureWords = lowerTranscript.match(/\b(feature|includes?|comes with|has|provides?)\b/g);
    if (featureWords && featureWords.length >= 3) {
      issues.push({
        type: 'feature-dump',
        example: featureWords.join(', '),
        feedback: "You listed features without connecting them to what I care about."
      });
    }
    
    // Issue 3: Weak Openings (filler words at start)
    const weakOpeningPatterns = /^(so|um|uh|basically|well|like)\s+/i;
    const match = transcript.match(weakOpeningPatterns);
    if (match) {
      issues.push({
        type: 'weak-opening',
        example: match[0],
        feedback: "Those filler words at the start weakened your confidence."
      });
    }
    
    // Issue 4: Vague Claims (no numbers/specifics)
    const vaguePatterns = [
      /\b(better results|improve|help you succeed|increase|enhance|optimize)\b/gi
    ];
    
    let hasVagueClaim = false;
    const hasSpecifics = /\b\d+(%|percent|x|times|dollars|days|weeks|months)\b/i.test(transcript);
    
    for (const pattern of vaguePatterns) {
      if (pattern.test(transcript) && !hasSpecifics) {
        hasVagueClaim = true;
        break;
      }
    }
    
    if (hasVagueClaim) {
      issues.push({
        type: 'vague',
        example: 'improve sales, better results',
        feedback: "That felt vague. Add a number—'30% more deals in 90 days' beats 'improve sales.'"
      });
    }
    
    // Issue 5: No Discovery Questions
    const discoveryPatterns = /\b(what|how|why|tell me about|help me understand|walk me through)\b/gi;
    const hasDiscovery = discoveryPatterns.test(transcript);
    
    if (!hasDiscovery && transcript.length > 100) {
      issues.push({
        type: 'no-discovery',
        example: 'No questions asked',
        feedback: "You didn't ask me a single question about my situation. How'd you know I needed this?"
      });
    }
    
    // Issue 6: Apologetic Language
    const apologeticPatterns = /\b(sorry to bother|just wanted to|if you have time|don't mean to interrupt)\b/gi;
    const apoMatch = transcript.match(apologeticPatterns);
    if (apoMatch) {
      issues.push({
        type: 'apologetic',
        example: apoMatch[0],
        feedback: "That apology at the start—you gave me permission to ignore you before you even started."
      });
    }
    
    // Issue 7: Feature Focus Without Outcome
    const outcomePatterns = /\b(you'll be able to|you can|this means|the result is|you'll see)\b/gi;
    const hasOutcome = outcomePatterns.test(transcript);
    const hasFeatures = /\b(it has|includes|comes with|features?)\b/gi.test(transcript);
    
    if (hasFeatures && !hasOutcome && transcript.length > 80) {
      issues.push({
        type: 'feature-focus',
        example: 'Listed features without outcomes',
        feedback: "You told me what it does. But you never told me what changes for me if I buy it."
      });
    }
    
    console.log(`🔍 Detected ${issues.length} coaching issues:`, issues.map(i => i.type));
    return issues;
  }
  
  /**
   * Identify strengths in user's pitch
   */
  static identifyStrengths(transcript: string): string[] {
    const strengths: string[] = [];
    
    // Strength 1: Open-ended questions
    const openEndedPatterns = /\b(what|how|why|tell me about|help me understand|walk me through)\b/gi;
    if (openEndedPatterns.test(transcript)) {
      strengths.push("Used open-ended questions that invite conversation");
    }
    
    // Strength 2: Specific numbers/metrics
    if (/\b\d+(%|percent|x|times|dollars|days|weeks|months)\b/i.test(transcript)) {
      strengths.push("Included specific numbers and metrics");
    }
    
    // Strength 3: Emotional/outcome language
    const emotionalPatterns = /\b(confident|peace of mind|freedom|control|relief|excited|transform)\b/gi;
    if (emotionalPatterns.test(transcript)) {
      strengths.push("Connected to emotional outcomes, not just features");
    }
    
    // Strength 4: Client-focused language (more "you" than "I/we")
    const youCount = (transcript.match(/\byou\b/gi) || []).length;
    const iWeCount = (transcript.match(/\b(i|we)\b/gi) || []).length;
    
    if (youCount > iWeCount && youCount > 3) {
      strengths.push("Kept focus on the client ('you') rather than yourself");
    }
    
    // Strength 5: Story or example
    const storyPatterns = /\b(imagine|picture this|for example|one of my clients|recently)\b/gi;
    if (storyPatterns.test(transcript)) {
      strengths.push("Used storytelling or examples to illustrate value");
    }
    
    console.log(`✨ Identified ${strengths.length} strengths`);
    return strengths;
  }
  
  /**
   * Extract a memorable phrase from the pitch (for Marcus to quote back)
   */
  static extractMemorablePhrase(transcript: string): string | null {
    // Look for phrases that:
    // 1. Are 5-15 words long
    // 2. Contain emotional or specific language
    // 3. Sound like a value proposition
    
    const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    
    for (const sentence of sentences) {
      const wordCount = sentence.split(/\s+/).length;
      
      if (wordCount >= 5 && wordCount <= 15) {
        // Check if it contains value/emotional language
        const valuePhrases = /\b(help|transform|enable|empower|provide|deliver|solve|fix|improve|create)\b/i;
        const emotionalPhrases = /\b(confident|freedom|peace|control|relief|excited|clear|simple)\b/i;
        const specificPhrases = /\b(consultant|entrepreneur|business|company|client|customer)\b/i;
        
        if (valuePhrases.test(sentence) || emotionalPhrases.test(sentence) || specificPhrases.test(sentence)) {
          console.log(`💬 Extracted memorable phrase: "${sentence}"`);
          return sentence;
        }
      }
    }
    
    // Fallback: Return first non-trivial sentence
    if (sentences.length > 0 && sentences[0].split(/\s+/).length >= 5) {
      return sentences[0];
    }
    
    return null;
  }
  
  /**
   * Full extraction from transcript
   */
  static extractAll(transcript: string, currentName?: string): ExtractedInfo {
    return {
      name: this.extractName(transcript, currentName),
      product: this.extractProduct(transcript),
      memorablePhrase: this.extractMemorablePhrase(transcript),
      detectedIssues: this.detectCoachingIssues(transcript),
      strengths: this.identifyStrengths(transcript)
    };
  }
  
  /**
   * Pick ONE issue to mention (Marcus only gives one critique per call)
   */
  static pickOneIssue(issues: CoachingIssue[]): CoachingIssue | null {
    if (issues.length === 0) return null;
    
    // Priority order (most impactful to least)
    const priorityOrder: CoachingIssueType[] = [
      'no-discovery',      // Biggest miss
      'close-ended',       // Very common and fixable
      'apologetic',        // Undermines everything
      'vague',            // Credibility killer
      'feature-dump',     // Common mistake
      'weak-opening',     // First impression matters
      'feature-focus',    // Missing outcome
      'too-fast'          // Delivery issue
    ];
    
    for (const priority of priorityOrder) {
      const issue = issues.find(i => i.type === priority);
      if (issue) {
        console.log(`🎯 Selected coaching issue: ${issue.type}`);
        return issue;
      }
    }
    
    // Fallback: first issue
    return issues[0];
  }
  
  /**
   * Pick ONE strength to mention
   */
  static pickOneStrength(strengths: string[], transcript: string): string | null {
    if (strengths.length === 0) {
      // If no detected strengths, try to find something positive
      if (transcript.length > 50) {
        return "You got through the core idea clearly";
      }
      return null;
    }
    
    // Return first strength (usually most prominent)
    return strengths[0];
  }
}

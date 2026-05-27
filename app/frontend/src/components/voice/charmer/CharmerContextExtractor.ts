/**
 * CharmerContextExtractor.ts
 * Extracts key information from user speech for Marcus's coaching
 */

/**
 * Rich mechanistic detection - explains WHY something is wrong
 */
export interface DetectedMechanic {
  type: string;                    // e.g., 'permission_ask_without_value'
  evidence: string;                // Exact quote that triggered detection
  mechanism: string;               // Sales psychology principle violated
  marcusImpact: string;            // How this affects Marcus (his internal response)
  confidence: number;              // 0.0-1.0, how certain we are
  severity: 'minor' | 'moderate' | 'critical';  // Impact level
  recommendedFix?: string;         // Optional: what to do instead
}

export interface ExtractedInfo {
  name?: string;
  gender?: 'male' | 'female' | 'unknown';
  product?: string;
  targetAudience?: string;
  memorablePhrase?: string;
  detectedIssues: CoachingIssue[];  // Legacy - will phase out
  detectedMechanics: DetectedMechanic[];  // Rich detection
  strengths: string[];
}

export type CoachingIssueType = 
  | 'premature-pitch'
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
   * Detect gender from name
   */
  static detectGender(name: string): 'male' | 'female' | 'unknown' {
    const nameLower = name.toLowerCase();
    
    const maleNames = ['john', 'james', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles',
                       'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua', 'kenneth',
                       'kevin', 'brian', 'george', 'edward', 'ronald', 'timothy', 'jason', 'jeffrey', 'ryan', 'jacob',
                       'marcus', 'cason', 'kayson', 'alex', 'chris', 'sam', 'mike', 'dave', 'steve', 'tom', 'ben'];
    
    const femaleNames = ['mary', 'patricia', 'jennifer', 'linda', 'barbara', 'elizabeth', 'susan', 'jessica', 'sarah',
                         'karen', 'nancy', 'lisa', 'betty', 'margaret', 'sandra', 'ashley', 'kimberly', 'emily', 'donna',
                         'michelle', 'dorothy', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'sharon',
                         'laura', 'cynthia', 'kathleen', 'amy', 'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma',
                         'nicole', 'helen', 'samantha', 'katherine', 'christine', 'debra', 'rachel', 'catherine', 'carolyn',
                         'janet', 'ruth', 'maria', 'heather', 'diane', 'virginia', 'julie', 'joyce', 'victoria', 'olivia'];
    
    if (maleNames.includes(nameLower)) return 'male';
    if (femaleNames.includes(nameLower)) return 'female';
    
    // Check common endings
    if (nameLower.endsWith('a') || nameLower.endsWith('ie') || nameLower.endsWith('ine')) return 'female';
    
    return 'unknown';
  }
  
  /**
   * Extract user's name from transcript
   * Only extracts during Turn 1 or explicit corrections
   * After Turn 1, name is LOCKED unless explicit correction detected
   */
  static extractName(transcript: string, currentName?: string, utteranceCount: number = 0): string | null {
    // Always check for explicit name corrections (can happen anytime)
    const correction = this.detectNameCorrection(transcript);
    if (correction) {
      console.log(`🔄 Name corrected: ${currentName} → ${correction}`);
      return correction;
    }
    
    // If we already have a name from Turn 1, it's LOCKED - only corrections allowed
    if (currentName && utteranceCount > 1) {
      console.log(`🔒 Name locked after Turn 1: ${currentName} (utterance ${utteranceCount})`);
      return null;
    }
    
    // CRITICAL: Check transcript quality on Turn 1 - don't trust garbled STT
    const isGarbled = utteranceCount === 1 && (
      transcript.length > 180 ||
      /\b(your you know|website your|your your|um um|uh uh|you you|the the){1,}/i.test(transcript) ||
      /\b(um|uh|like|you know){3,}/i.test(transcript)
    );
    
    if (isGarbled && utteranceCount === 1) {
      console.log(`⚠️ Turn 1 garbled transcript detected - deferring name extraction`);
      console.log(`   Transcript: "${transcript.substring(0, 100)}..."`);
      return null;
    }
    
    // PRIORITY 1: "[Name] from [Company]" pattern (most reliable, Turn 1 only)
    // Only use this pattern on Turn 1 to avoid false positives like "team go from A to Z"
    // Case-sensitive [A-Z] to ensure proper capitalization
    if (utteranceCount <= 1) {
      const fromCompanyPattern = /(?:^|[.!?\s])([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\s+from\s+[A-Z][\w&.-]+/;
      const fromMatch = transcript.match(fromCompanyPattern);
      if (fromMatch && fromMatch[1]) {
        const name = fromMatch[1].trim();
        if (this.isValidName(name)) {
          console.log(`✅ Extracted name (from company): ${name}`);
          return name;
        }
      }
    }
    
    // PRIORITY 2: Other patterns (with negative lookahead for common verbs)
    // Case-sensitive [A-Z] patterns for stricter matching
    const patterns = [
      /(?:my name is|my name's)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)/,
      // "I'm [Name]" but NOT "I'm gonna/calling/trying/etc"
      /(?:I'm|I am)\s+(?!gonna|wanna|gotta|calling|trying|reaching|following|checking|looking|here|just|actually)([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)/,
      /(?:this is)\s+([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)/,
      /^([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)\s+(?:here|calling|speaking)/
    ];
    
    for (const pattern of patterns) {
      const match = transcript.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        if (this.isValidName(name)) {
          console.log(`✅ Extracted name: ${name}`);
          return name;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Validate extracted name against denylist
   */
  private static isValidName(name: string): boolean {
    const nameLower = name.toLowerCase().trim();
    
    // Exact match denylist (use Set for O(1) lookup)
    const exactDenylist = new Set([
      'me', 'myself', 'i',
      'mainly', 'actually', 'basically', 'just', 'really', 'truly', 'honestly',
      'hello', 'hi', 'hey', 'yes', 'yeah', 'sure', 'okay', 'thanks', 'great',
      'good', 'fine', 'interesting', 'sorry', 'please', 'welcome', 'excuse',
      'pardon', 'maybe', 'perfect', 'exactly', 'absolutely', 'definitely',
      'that', 'this', 'pretty', 'very', 'quite', 'rather', 'fairly', 'somewhat',
      'going', 'gone', 'been', 'getting', 'doing', 'having', 'being', 'working',
      'making', 'taking', 'coming', 'keeping', 'part', 'reason', 'thing',
      'something', 'anything', 'nothing', 'everything', 'someone', 'anyone',
      'everyone', 'nobody', 'somebody', 'wondering', 'curious', 'looking',
      'trying', 'calling', 'reaching', 'following', 'asking', 'telling',
      'saying', 'thinking', 'gonna', 'wanna', 'gotta', 'kinda', 'sorta',
      'hafta', 'oughta', 'lemme', 'gimme',
      'it', 'is', 'am', 'at', 'in', 'on', 'to', 'be', 'do', 'so', 'we', 'he', 'she'
    ]);
    
    // Multi-word phrase denylist (only use .includes() for these)
    const phraseDenylist = [
      'gonna check',
      'wanna talk',
      'gotta run',
      'check you',
      'check in',
      'follow up'
    ];
    
    // Exact match check
    if (exactDenylist.has(nameLower)) {
      return false;
    }
    
    // Phrase check (only for multi-word garbage)
    if (phraseDenylist.some(phrase => nameLower.includes(phrase))) {
      return false;
    }
    
    // Name should be at least 2 chars
    if (name.length < 2) {
      return false;
    }
    
    return true;
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
   * Detect coaching issues in user's speech
   * Now context-aware: uses actual conversation quotes
   */
  static detectCoachingIssues(transcript: string, conversationHistory: Array<{role: string; content: string}> = [], utteranceCount: number = 1): CoachingIssue[] {
    const issues: CoachingIssue[] = [];
    const lowerTranscript = transcript.toLowerCase();
    
    // Get Marcus's last message for context-aware feedback
    const marcusMessages = conversationHistory.filter(m => m.role === 'assistant');
    const lastMarcusMessage = marcusMessages.length > 0 ? marcusMessages[marcusMessages.length - 1].content : null;
    
    // Issue 0: Premature Pitch (company/product mentioned in first 2 utterances before rapport)
    if (utteranceCount <= 2) {
      const prematurePitchPatterns = [
        /\bfrom\s+[\w\s]+(company|corp|inc|llc|co\.|solutions|consulting|group|services)/i,
        /\b(calling|reaching out)\s+(from|about|regarding)\s+[\w\s]+/i,
        /\bI'm\s+with\s+[\w\s]+(company|corp|inc|llc|co\.|solutions|consulting|group)/i,
        /\b(selling|offer|provide|help you with|specialize in)\b/i
      ];
      
      for (const pattern of prematurePitchPatterns) {
        if (pattern.test(transcript)) {
          issues.push({
            type: 'premature-pitch',
            example: transcript.substring(0, 50) + '...',
            feedback: "You pitched before building rapport. Lead with permission or curiosity, not your company name. Build trust FIRST."
          });
          break;
        }
      }
    }
    
    // Issue 1: Close-Ended Questions
    const closeEndedPatterns = [
      /\b(do you|can you|will you|are you|is it|have you|would you)\b/gi
    ];
    
    for (const pattern of closeEndedPatterns) {
      const matches = transcript.match(pattern);
      if (matches && matches.length > 0) {
        const example = matches[0];
        // Find the actual sentence containing the close-ended question
        const sentences = transcript.split(/[.!?]+/);
        const questionSentence = sentences.find(s => s.toLowerCase().includes(example.toLowerCase()));
        const actualQuestion = questionSentence ? questionSentence.trim() + '?' : example;
        
        issues.push({
          type: 'close-ended',
          example: actualQuestion,
          feedback: lastMarcusMessage 
            ? `I asked "${lastMarcusMessage.substring(0, 60)}..." and you responded with "${actualQuestion}" - that's a yes/no question. I can dodge that with one word.`
            : `"${actualQuestion}" - that's a yes/no question. I can dodge that with one word. Ask 'what' or 'how' instead.`
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
      const filler = match[0];
      const restOfSentence = transcript.substring(filler.length, 60).trim();
      issues.push({
        type: 'weak-opening',
        example: `"${filler}${restOfSentence}..."`,
        feedback: `Starting with "${filler}${restOfSentence}..." - those filler words weakened your confidence. Own your opening.`
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
      // Find the actual vague claim in the transcript
      const vagueClaim = transcript.match(/\b(better results|improve|help you succeed|increase|enhance|optimize)[^.!?]*/i)?.[0] || 'vague claim';
      issues.push({
        type: 'vague',
        example: `"${vagueClaim}"`,
        feedback: `"${vagueClaim}" - that felt vague. Add a number. '30% more deals in 90 days' beats 'improve sales.'`
      });
    }
    
    // Issue 5: No Discovery Questions
    const discoveryPatterns = /\b(what|how|why|tell me about|help me understand|walk me through)\b/gi;
    const hasDiscovery = discoveryPatterns.test(transcript);
    
    if (!hasDiscovery && transcript.length > 100) {
      // Extract what they said instead of asking
      const firstSentence = transcript.split(/[.!?]+/)[0].trim();
      issues.push({
        type: 'no-discovery',
        example: `"${firstSentence}${firstSentence.length < transcript.length ? '...' : ''}"`,
        feedback: lastMarcusMessage
          ? `I said "${lastMarcusMessage.substring(0, 50)}..." and you launched into "${firstSentence}..." - didn't ask me a single question about MY situation. How'd you know I needed this?`
          : `You told me "${firstSentence}..." but didn't ask me anything about MY situation. How'd you know I needed this?`
      });
    }
    
    // Issue 6: Apologetic Language
    const apologeticPatterns = /\b(sorry to bother|just wanted to|if you have time|don't mean to interrupt)\b/gi;
    const apoMatch = transcript.match(apologeticPatterns);
    if (apoMatch) {
      const apology = apoMatch[0];
      issues.push({
        type: 'apologetic',
        example: `"${apology}"`,
        feedback: `"${apology}" at the start? You gave me permission to ignore you before you even started. Own your value.`
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
   * Rich mechanistic detection - explains WHY patterns are problematic
   */
  static detectMechanics(
    transcript: string,
    conversationHistory: Array<{role: string; content: string}> = [],
    utteranceCount: number = 0
  ): DetectedMechanic[] {
    const mechanics: DetectedMechanic[] = [];
    const lowerTranscript = transcript.toLowerCase();
    
    // Get last Marcus message for context
    const lastMarcusMessage = conversationHistory.length > 0 
      ? conversationHistory[conversationHistory.length - 1]?.content 
      : null;
    
    // MECHANIC 1: Permission ask without value
    // Pattern: Asking for time/permission before establishing why they should care
    const permissionPatterns = [
      /do you have (a few|five|10|\d+) (minutes|mins|seconds)/i,
      /can I (have|take|grab|steal) (a|your) (minute|moment|second)/i,
      /is (this|now) a (good|bad) time/i
    ];
    
    for (const pattern of permissionPatterns) {
      const match = transcript.match(pattern);
      if (match) {
        const hasValueProp = /\b(help|save|increase|improve|reduce|solve)\b/i.test(transcript);
        const hasRelevance = /\b(you|your)\b/i.test(transcript.substring(0, match.index || 0));
        
        if (!hasValueProp || !hasRelevance) {
          mechanics.push({
            type: 'permission_ask_without_value',
            evidence: match[0],
            mechanism: 'Asked for time commitment before establishing relevance or value',
            marcusImpact: 'Triggers defensive posture - stranger asking for my time without earning the right',
            confidence: 0.9,
            severity: 'critical',
            recommendedFix: 'Lead with a micro-value statement first: "Quick call - we help [outcome]. Worth 2 minutes?"'
          });
          break;
        }
      }
    }
    
    // MECHANIC 2: Close-ended without value
    // Pattern: Yes/no question that doesn't lead anywhere
    const closeEndedPatterns = [
      { pattern: /(do you|are you|have you|can you|would you|will you)\s+[^?]+\?/i, type: 'binary' },
      { pattern: /(is it|is this|is that)\s+[^?]+\?/i, type: 'binary' }
    ];
    
    for (const { pattern, type } of closeEndedPatterns) {
      const match = transcript.match(pattern);
      if (match) {
        const question = match[0].trim();
        const hasDiscovery = /\b(what|how|why|tell me|walk me through)\b/i.test(transcript);
        
        if (!hasDiscovery) {
          mechanics.push({
            type: 'close_ended_without_value',
            evidence: question,
            mechanism: 'Binary question allows one-word dismissal without opening conversation',
            marcusImpact: 'Can dodge with "no" or "yes" - doesn\'t invite me to explain my situation',
            confidence: 0.85,
            severity: 'moderate',
            recommendedFix: 'Switch to open-ended: "What" or "How" questions that require explanation'
          });
          break;
        }
      }
    }
    
    // MECHANIC 3: No discovery (talking AT instead of WITH)
    // Pattern: Long message with no questions about Marcus's situation
    const hasDiscoveryQuestion = /\b(what|how|why|tell me about|help me understand|walk me through)\b/i.test(transcript);
    const wordCount = transcript.split(/\s+/).length;
    
    if (!hasDiscoveryQuestion && wordCount > 30) {
      const firstSentence = transcript.split(/[.!?]+/)[0].trim();
      const hasPitch = /\b(we help|I help|our product|we offer|we provide)\b/i.test(transcript);
      
      if (hasPitch) {
        mechanics.push({
          type: 'no_discovery',
          evidence: firstSentence.substring(0, 80) + (firstSentence.length > 80 ? '...' : ''),
          mechanism: 'Pitched solution without understanding buyer\'s current situation or needs',
          marcusImpact: 'Feels like you\'re reading a script - you don\'t know if I even have this problem',
          confidence: 0.88,
          severity: 'critical',
          recommendedFix: 'Ask about their current state first: "How are you handling [X] right now?"'
        });
      }
    }
    
    // MECHANIC 4: Identity without payoff
    // Pattern: "I'm X from Y" followed immediately by pitch, no permission earned
    if (utteranceCount <= 2) {
      const identityPattern = /(i'm|i am|this is|my name is)\s+\w+\s+(?:from|with|at)\s+\w+/i;
      const identityMatch = transcript.match(identityPattern);
      
      if (identityMatch) {
        const afterIdentity = transcript.substring((identityMatch.index || 0) + identityMatch[0].length);
        const immediatelyPitches = /^[^.!?]{0,20}(we help|I help|we provide|our product)/i.test(afterIdentity);
        
        if (immediatelyPitches) {
          mechanics.push({
            type: 'identity_without_payoff',
            evidence: identityMatch[0],
            mechanism: 'Stated identity then immediately pitched - pattern matches telemarketer script',
            marcusImpact: 'Trust drops - this is clearly a cold pitch, not a conversation',
            confidence: 0.92,
            severity: 'critical',
            recommendedFix: 'Break the script pattern - acknowledge it\'s a cold call or lead with curiosity'
          });
        }
      }
    }
    
    // MECHANIC 5: Vague value without specifics
    // Pattern: Claims outcomes but no numbers or proof
    const vagueValuePatterns = /(improve|increase|enhance|optimize|boost|grow)\s+(?:your|the)?\s*(sales|revenue|performance|results)/i;
    const vagueMatch = transcript.match(vagueValuePatterns);
    
    if (vagueMatch) {
      const hasSpecifics = /\d+\s*(%|percent|x|times|dollars|days|weeks)/i.test(transcript);
      const hasProof = /\b(client|customer|case study|example)\b/i.test(transcript);
      
      if (!hasSpecifics && !hasProof) {
        mechanics.push({
          type: 'vague_value_claim',
          evidence: vagueMatch[0],
          mechanism: 'Value claim without quantification or proof',
          marcusImpact: 'Sounds like every other vendor - generic claims trigger skepticism',
          confidence: 0.80,
          severity: 'moderate',
          recommendedFix: 'Add specific number: "30% more deals in 90 days" or reference proof: "Client X saw..."'
        });
      }
    }
    
    console.log(`🔧 Detected ${mechanics.length} mechanics with rich context`);
    return mechanics;
  }
  
  /**
   * Full extraction from transcript
   */
  static extractAll(
    transcript: string, 
    currentName?: string, 
    utteranceCount: number = 0,
    conversationHistory: Array<{role: string; content: string}> = []
  ): ExtractedInfo {
    return {
      name: this.extractName(transcript, currentName, utteranceCount),
      product: this.extractProduct(transcript),
      memorablePhrase: this.extractMemorablePhrase(transcript),
      detectedIssues: this.detectCoachingIssues(transcript, conversationHistory, utteranceCount),
      detectedMechanics: this.detectMechanics(transcript, conversationHistory, utteranceCount),
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
      'premature-pitch',   // Fatal mistake - pitch before rapport
      'no-discovery',      // Biggest miss
      'apologetic',        // Undermines everything
      'close-ended',       // Very common and fixable
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

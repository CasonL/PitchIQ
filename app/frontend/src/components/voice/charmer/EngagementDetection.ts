/**
 * EngagementDetection.ts
 * Detect user engagement quality to determine earned vs unearned silence
 */

/**
 * Detect if user response is minimal/non-substantive
 * Minimal responses don't earn thinking time
 */
export function isMinimalResponse(text: string): boolean {
  const trimmed = text.trim().toLowerCase();
  
  // Single-word minimal responses
  const minimalWords = [
    'yes', 'yeah', 'yep', 'yup', 'sure', 'okay', 'ok', 'k',
    'no', 'nope', 'nah', 'mhmm', 'mmm', 'uh huh', 'uhuh',
    'right', 'gotcha', 'got it', 'cool', 'nice', 'great',
    'alright', 'fine', 'whatever', 'maybe', 'possibly'
  ];
  
  if (minimalWords.includes(trimmed)) return true;
  
  // Very short responses (under 5 words, under 20 chars)
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 5 && trimmed.length < 20) return true;
  
  return false;
}

/**
 * Calculate user effort quality score (0-1)
 * Higher score = earned silence (Marcus waits patiently)
 * Lower score = unearned silence (Marcus gets confused/annoyed)
 */
export function calculateEffortQuality(
  text: string,
  hasQuestion: boolean,
  isDetailed: boolean
): number {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).length;
  
  // Base score on response length
  let score = 0.5;
  
  // Length scoring (thoughtful responses earn patience)
  if (wordCount >= 20) score += 0.3;
  else if (wordCount >= 10) score += 0.2;
  else if (wordCount >= 5) score += 0.1;
  else score -= 0.2; // Very short = low effort
  
  // Question asking shows engagement (earns patience)
  if (hasQuestion) score += 0.2;
  
  // Detailed/specific responses earn patience
  if (isDetailed) score += 0.1;
  
  // Minimal responses don't earn patience
  if (isMinimalResponse(text)) score -= 0.4;
  
  // Clamp to 0-1
  return Math.max(0, Math.min(1, score));
}

/**
 * Detect if user asked a thoughtful question
 * Good questions earn patient silence
 */
export function hasThoughtfulQuestion(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Question words
  const hasQuestionWord = /\b(how|what|why|when|where|which|who|could|would|can|will)\b/.test(lowerText);
  
  // Question mark
  const hasQuestionMark = /\?/.test(text);
  
  // Question patterns that show engagement
  const thoughtfulPatterns = [
    /how (do|does|did|would|can)/i,
    /what (is|are|would|if|about)/i,
    /why (do|does|did|would|is|are)/i,
    /could you (explain|tell|walk|elaborate)/i,
    /can you (help|show|demonstrate)/i,
    /i'?m curious about/i,
    /wondering (if|about|how)/i
  ];
  
  const hasThoughtfulPattern = thoughtfulPatterns.some(p => p.test(text));
  
  return (hasQuestionWord || hasQuestionMark) && text.length > 15 && hasThoughtfulPattern;
}

/**
 * Detect if response is vague/non-committal
 * Vague responses accumulate and trigger impatience
 */
export function isVagueResponse(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  
  const vaguePatterns = [
    /^(just|so|well|um|uh|hmm)/,
    /not sure/i,
    /maybe/i,
    /i guess/i,
    /kind of/i,
    /sort of/i,
    /i don'?t know/i,
    /whatever/i,
    /just calling to/i,
    /just wanted to/i,
    /just checking/i
  ];
  
  return vaguePatterns.some(p => p.test(lowerText)) && text.split(/\s+/).length < 15;
}

/**
 * Determine silence reaction type based on earned/unearned
 */
export function getSilenceReactionType(
  userEffortQuality: number,
  consecutiveMinimalResponses: number,
  irritationLevel: number
): 'patient' | 'confused' | 'annoyed' | 'done' {
  // High effort = earned silence → patient
  if (userEffortQuality >= 0.7) {
    return 'patient';
  }
  
  // Pattern of minimal responses → done
  if (consecutiveMinimalResponses >= 3 || irritationLevel >= 0.8) {
    return 'done';
  }
  
  // Low effort + medium irritation → annoyed
  if (userEffortQuality < 0.4 && irritationLevel >= 0.5) {
    return 'annoyed';
  }
  
  // Low effort but not yet annoyed → confused
  if (userEffortQuality < 0.5) {
    return 'confused';
  }
  
  // Default
  return 'patient';
}

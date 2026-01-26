/**
 * QuestionDetector.ts
 * Detect and classify questions (open-ended vs closed)
 */

export interface QuestionAnalysis {
  text: string;
  timestamp: number;
  isOpenEnded: boolean;
  isFollowUp: boolean;
}

/**
 * Detect if text contains a question
 */
export function containsQuestion(text: string): boolean {
  // Check for question mark
  if (text.includes('?')) return true;
  
  // Check for question patterns without ?
  const questionPatterns = [
    /^(how|what|why|when|where|who|which|could you|can you|would you|will you|do you|did you|have you|are you|is there|tell me)/i,
    /\b(how|what|why) (do|did|does|would|could|should|can|is|are|was|were)\b/i
  ];
  
  return questionPatterns.some(pattern => pattern.test(text.trim()));
}

/**
 * Determine if question is open-ended (requires elaboration) vs closed (yes/no)
 */
export function isOpenEndedQuestion(text: string): boolean {
  const lowerText = text.toLowerCase().trim();
  
  // Strong open-ended signals
  const openEndedStarters = [
    /^how (do|did|does|would|could|can|should)/,
    /^what (is|are|was|were|would|could|can)/,
    /^why (do|did|does|would|could|is|are)/,
    /^tell me (about|how|what|why)/,
    /^describe/,
    /^explain/,
    /^walk me through/,
    /^talk (to )?me about/,
    /^can you (tell|explain|describe|walk)/
  ];
  
  if (openEndedStarters.some(pattern => pattern.test(lowerText))) {
    return true;
  }
  
  // Closed question signals (yes/no, binary choice)
  const closedPatterns = [
    /^(do|does|did|is|are|was|were|can|could|would|will|should|have|has|had) you\b/,
    /^is (it|there|that|this)\b/,
    /^are (they|you|there|those)\b/,
    /^(do|does) (it|this|that)\b/
  ];
  
  if (closedPatterns.some(pattern => pattern.test(lowerText))) {
    return false;
  }
  
  // Default: if starts with "how", "what", "why" = open-ended
  if (/^(how|what|why)\b/.test(lowerText)) {
    return true;
  }
  
  // Default: closed
  return false;
}

/**
 * Determine if question is a follow-up (references previous conversation)
 */
export function isFollowUpQuestion(
  text: string, 
  previousUserText: string,
  previousMarcusText: string
): boolean {
  const lowerText = text.toLowerCase();
  
  // Follow-up signals
  const followUpPatterns = [
    /\b(and|also|but|so)\b.*\?/,
    /\b(that|this|those|these)\b/,
    /\b(you (mentioned|said|talked about)|you just)\b/,
    /\b(about that|on that|regarding that)\b/,
    /\b(can you (elaborate|expand|say more))\b/,
    /\b(what (else|more|about))\b/,
    /^(and|but|so)\b/
  ];
  
  if (followUpPatterns.some(pattern => pattern.test(lowerText))) {
    return true;
  }
  
  // Check if question references words from Marcus's last response
  if (previousMarcusText) {
    const marcusWords = previousMarcusText.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4); // Only meaningful words
    
    const hasReference = marcusWords.some(word => 
      lowerText.includes(word) && 
      !['could', 'would', 'should', 'about', 'think'].includes(word)
    );
    
    if (hasReference) return true;
  }
  
  return false;
}

/**
 * Analyze a user utterance for questions
 */
export function analyzeUserQuestions(
  userText: string,
  previousUserText: string,
  previousMarcusText: string,
  timestamp: number
): QuestionAnalysis[] {
  const questions: QuestionAnalysis[] = [];
  
  // Split by sentences
  const sentences = userText.split(/[.!]+/).map(s => s.trim()).filter(s => s.length > 0);
  
  for (const sentence of sentences) {
    if (containsQuestion(sentence)) {
      questions.push({
        text: sentence,
        timestamp,
        isOpenEnded: isOpenEndedQuestion(sentence),
        isFollowUp: isFollowUpQuestion(sentence, previousUserText, previousMarcusText)
      });
    }
  }
  
  return questions;
}

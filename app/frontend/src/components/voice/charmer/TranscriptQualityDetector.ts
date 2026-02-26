/**
 * TranscriptQualityDetector
 * 
 * Detects when Deepgram transcripts are likely garbled or low-quality
 * so Marcus can respond naturally ("Sorry, didn't catch that") instead of
 * treating garbled content as legitimate speech.
 */

export interface QualityAssessment {
  isLikelyGarbled: boolean;
  confidence: number;
  issues: string[];
}

export class TranscriptQualityDetector {
  /**
   * Detect if transcript is likely garbled/poor quality
   */
  static assess(transcript: string): QualityAssessment {
    const issues: string[] = [];
    let garbageScore = 0;
    
    // Normalize
    const text = transcript.toLowerCase().trim();
    const words = text.split(/\s+/);
    
    // Issue 1: Repeated words/phrases (like "optimum optimum" or "something you've been noticing something you've been noticing")
    const repeatedWords = this.detectRepeatedSequences(words);
    if (repeatedWords.length > 0) {
      issues.push(`repeated_sequences: ${repeatedWords.join(', ')}`);
      garbageScore += 0.4;
    }
    
    // Issue 2: Very high ratio of duplicate words (not normal repetition for emphasis)
    const duplicateRatio = this.getDuplicateWordRatio(words);
    if (duplicateRatio > 0.3) { // More than 30% of words are duplicates
      issues.push(`high_duplication: ${Math.round(duplicateRatio * 100)}%`);
      garbageScore += 0.3;
    }
    
    // Issue 3: Unusual word sequences (gibberish detection)
    const hasGibberish = this.containsGibberish(words);
    if (hasGibberish) {
      issues.push('gibberish_detected');
      garbageScore += 0.4;
    }
    
    // Issue 4: Very short repetitive fragments
    if (words.length >= 5 && new Set(words).size <= 3) {
      issues.push('too_repetitive');
      garbageScore += 0.5;
    }
    
    const isLikelyGarbled = garbageScore >= 0.4;
    
    return {
      isLikelyGarbled,
      confidence: Math.min(garbageScore, 1.0),
      issues
    };
  }
  
  /**
   * Detect repeated word sequences (2+ words)
   */
  private static detectRepeatedSequences(words: string[]): string[] {
    const repeated: string[] = [];
    
    // Check for 2-word sequences
    for (let i = 0; i < words.length - 3; i++) {
      const seq1 = `${words[i]} ${words[i + 1]}`;
      const seq2 = `${words[i + 2]} ${words[i + 3]}`;
      
      if (seq1 === seq2) {
        repeated.push(seq1);
      }
    }
    
    // Check for 3-word sequences
    for (let i = 0; i < words.length - 5; i++) {
      const seq1 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      const seq2 = `${words[i + 3]} ${words[i + 4]} ${words[i + 5]}`;
      
      if (seq1 === seq2) {
        repeated.push(seq1);
      }
    }
    
    return [...new Set(repeated)];
  }
  
  /**
   * Calculate ratio of duplicate words
   */
  private static getDuplicateWordRatio(words: string[]): number {
    if (words.length === 0) return 0;
    
    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });
    
    let duplicateCount = 0;
    wordCounts.forEach(count => {
      if (count > 1) duplicateCount += count - 1;
    });
    
    return duplicateCount / words.length;
  }
  
  /**
   * Detect gibberish patterns
   */
  private static containsGibberish(words: string[]): boolean {
    // Very basic check: words with unusual letter patterns
    const gibberishPatterns = [
      /^[bcdfghjklmnpqrstvwxyz]{4,}$/i, // Too many consonants
      /(.)\1{3,}/, // Same letter repeated 4+ times
    ];
    
    for (const word of words) {
      for (const pattern of gibberishPatterns) {
        if (pattern.test(word) && word.length > 3) {
          return true;
        }
      }
    }
    
    return false;
  }
}

export interface CompletenessAnalysis {
  isComplete: boolean;
  reason: string;
  confidence: number;
}

export class SentenceCompletenessAnalyzer {
  
  static analyze(text: string): CompletenessAnalysis {
    const trimmed = text.trim();
    
    if (!trimmed) {
      return { isComplete: false, reason: 'Empty text', confidence: 1.0 };
    }

    const lastChar = trimmed[trimmed.length - 1];
    
    // EARLY EXIT: Questions ending with ? are complete
    if (lastChar === '?') {
      return {
        isComplete: true,
        reason: 'Question ending with ?',
        confidence: 0.95
      };
    }
    
    const words = trimmed.split(/\s+/);
    // Strip ALL punctuation including ellipsis (...), periods, commas, etc.
    const lastWord = words[words.length - 1]?.toLowerCase().replace(/[.,!?;:]+$/g, '').replace(/\.{2,}/g, '');
    const lastTwoWords = words.slice(-2).map(w => w.toLowerCase().replace(/[.,!?;:]+$/g, '').replace(/\.{2,}/g, ''));

    if (/[,;:]$/.test(trimmed)) {
      return { 
        isComplete: false, 
        reason: 'Ends with continuation punctuation (comma, semicolon, colon)', 
        confidence: 0.95 
      };
    }

    const subordinatingConjunctions = [
      'although', 'because', 'before', 'after', 'when', 'while', 'if', 'unless',
      'since', 'until', 'though', 'whereas', 'wherever', 'whenever', 'whether'
    ];
    
    if (subordinatingConjunctions.includes(lastWord)) {
      return {
        isComplete: false,
        reason: `Ends with subordinating conjunction: "${lastWord}" (introduces dependent clause)`,
        confidence: 0.9
      };
    }

    const coordinatingConjunctions = ['and', 'but', 'or', 'so', 'yet', 'for', 'nor'];
    
    if (coordinatingConjunctions.includes(lastWord)) {
      return {
        isComplete: false,
        reason: `Ends with coordinating conjunction: "${lastWord}" (expecting continuation)`,
        confidence: 0.85
      };
    }

    const prepositions = [
      'at', 'in', 'on', 'for', 'with', 'from', 'by', 'about', 'like',
      'of', 'into', 'onto', 'through', 'during', 'after', 'before', 'between',
      'among', 'without', 'around', 'behind', 'across', 'over', 'under', 'near'
    ];
    
    if (prepositions.includes(lastWord)) {
      return {
        isComplete: false,
        reason: `Ends with preposition: "${lastWord}" (needs object)`,
        confidence: 0.8
      };
    }

    const infinitivePatterns = [
      ['looking', 'to'],
      ['trying', 'to'],
      ['going', 'to'],
      ['want', 'to'],
      ['need', 'to'],
      ['have', 'to'],
      ['got', 'to'],
      ['used', 'to'],
      ['like', 'to'],
      ['love', 'to'],
      ['hope', 'to'],
      ['plan', 'to'],
      ['able', 'to']
    ];
    
    for (const pattern of infinitivePatterns) {
      if (lastTwoWords.length >= 2 && 
          lastTwoWords[0] === pattern[0] && 
          lastTwoWords[1] === 'to') {
        return {
          isComplete: false,
          reason: `Ends with infinitive pattern: "${pattern[0]} to" (needs verb)`,
          confidence: 0.9
        };
      }
    }

    const transitiveVerbs = [
      'asking', 'telling', 'saying', 'giving', 'showing', 'helping', 'making',
      'doing', 'getting', 'taking', 'bringing', 'finding', 'seeing', 'hearing',
      'knowing', 'thinking', 'wanting', 'needing', 'having', 'using', 'trying',
      'creating', 'building', 'writing', 'reading', 'sending', 'receiving'
    ];
    
    if (transitiveVerbs.includes(lastWord)) {
      return {
        isComplete: false,
        reason: `Ends with transitive verb: "${lastWord}" (needs direct object)`,
        confidence: 0.85
      };
    }

    const linkingVerbPhrases = [
      ['is', 'that'],
      ['is', 'what'],
      ['is', 'how'],
      ['is', 'why'],
      ['is', 'where'],
      ['is', 'when'],
      ['are', 'that'],
      ['are', 'what'],
      ['was', 'that'],
      ['was', 'what']
    ];
    
    for (const phrase of linkingVerbPhrases) {
      if (lastTwoWords.length >= 2 && 
          lastTwoWords[0] === phrase[0] && 
          lastTwoWords[1] === phrase[1]) {
        return {
          isComplete: false,
          reason: `Ends with linking verb phrase: "${phrase.join(' ')}" (incomplete predicate)`,
          confidence: 0.9
        };
      }
    }

    const incompletePhraseEndings = [
      ['what', 'we'],
      ['what', "we're"],
      ['what', "i'm"],
      ['what', 'i'],
      ['that', 'we'],
      ['that', "we're"],
      ['that', 'i'],
      ['how', 'we'],
      ['how', 'i'],
      ['why', 'we'],
      ['why', 'i'],
      ['where', 'we'],
      ['where', 'i']
    ];
    
    for (const phrase of incompletePhraseEndings) {
      if (lastTwoWords.length >= 2 && 
          lastTwoWords[0] === phrase[0] && 
          lastTwoWords[1] === phrase[1]) {
        return {
          isComplete: false,
          reason: `Ends with incomplete interrogative phrase: "${phrase.join(' ')}" (expecting continuation)`,
          confidence: 0.85
        };
      }
    }

    const modalVerbs = ['will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall'];
    
    if (modalVerbs.includes(lastWord)) {
      return {
        isComplete: false,
        reason: `Ends with modal verb: "${lastWord}" (needs main verb)`,
        confidence: 0.9
      };
    }

    const auxiliaryVerbs = ['am', 'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did'];
    
    if (auxiliaryVerbs.includes(lastWord)) {
      const prevWord = words[words.length - 2]?.toLowerCase().replace(/[.,!?;:]/g, '');
      
      if (prevWord && !['who', 'what', 'when', 'where', 'why', 'how', 'you', 'we', 'they', 'i'].includes(prevWord)) {
        return {
          isComplete: false,
          reason: `Ends with auxiliary verb: "${lastWord}" (needs main verb or complement)`,
          confidence: 0.75
        };
      }
    }

    const relativePronouns = ['who', 'which', 'that', 'whose', 'whom'];
    
    if (relativePronouns.includes(lastWord)) {
      return {
        isComplete: false,
        reason: `Ends with relative pronoun: "${lastWord}" (introduces relative clause)`,
        confidence: 0.85
      };
    }

    const articles = ['a', 'an', 'the'];
    
    if (articles.includes(lastWord)) {
      return {
        isComplete: false,
        reason: `Ends with article: "${lastWord}" (needs noun)`,
        confidence: 0.95
      };
    }

    const possessivePronouns = ['my', 'your', 'his', 'her', 'its', 'our', 'their'];
    
    if (possessivePronouns.includes(lastWord)) {
      return {
        isComplete: false,
        reason: `Ends with possessive pronoun: "${lastWord}" (needs noun)`,
        confidence: 0.9
      };
    }

    const demonstratives = ['this', 'that', 'these', 'those'];
    
    if (demonstratives.includes(lastWord)) {
      const secondLastWord = words[words.length - 2]?.toLowerCase();
      if (!secondLastWord || !['is', 'was', 'are', 'were'].includes(secondLastWord)) {
        return {
          isComplete: false,
          reason: `Ends with demonstrative: "${lastWord}" (likely needs noun)`,
          confidence: 0.6
        };
      }
    }

    if (/[.!?]$/.test(trimmed)) {
      const sentenceEndPattern = /^[A-Z].*[.!?]$/;
      if (sentenceEndPattern.test(trimmed)) {
        return {
          isComplete: true,
          reason: 'Ends with sentence-ending punctuation and starts with capital letter',
          confidence: 0.9
        };
      }
    }

    const hasCompletePunctuation = /[.!?]$/.test(trimmed);
    const hasCapitalStart = /^[A-Z]/.test(trimmed);
    
    if (!hasCompletePunctuation) {
      return {
        isComplete: false,
        reason: 'Missing sentence-ending punctuation (. ! ?)',
        confidence: 0.5
      };
    }
    
    if (!hasCapitalStart) {
      return {
        isComplete: false,
        reason: 'Does not start with capital letter',
        confidence: 0.4
      };
    }

    return {
      isComplete: true,
      reason: 'Appears to be a complete sentence',
      confidence: 0.7
    };
  }

  static shouldWaitForMore(text: string): boolean {
    const analysis = this.analyze(text);
    return !analysis.isComplete && analysis.confidence >= 0.7;
  }
}

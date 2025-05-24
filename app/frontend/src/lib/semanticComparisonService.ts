/**
 * Semantic Comparison Service
 * 
 * This service provides simplified functions for comparing user responses
 * against concept vectors to measure semantic understanding.
 * 
 * It works as a standalone module that can be integrated with the achievement
 * evaluator or used directly.
 */

/**
 * Calculate cosine similarity between two vectors
 * @param vec1 First vector
 * @param vec2 Second vector
 * @returns Similarity score between -1 and 1
 */
export const calculateCosineSimilarity = (vec1: number[], vec2: number[]): number => {
  if (vec1.length === 0 || vec2.length === 0) {
    return 0;
  }
  
  // If vectors have different lengths, use the shorter length
  const length = Math.min(vec1.length, vec2.length);
  
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (let i = 0; i < length; i++) {
    dotProduct += vec1[i] * vec2[i];
    magnitude1 += vec1[i] * vec1[i];
    magnitude2 += vec2[i] * vec2[i];
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  return dotProduct / (magnitude1 * magnitude2);
};

/**
 * Lightweight version of semantic text similarity that works without embeddings
 * This helps us integrate with existing code without changing the component
 */
export const calculateTextSimilarity = (text1: string, text2: string): number => {
  if (!text1 || !text2) return 0;
  
  // Normalize texts for comparison
  const normalize = (text: string): string[] => {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
  };
  
  const words1 = normalize(text1);
  const words2 = normalize(text2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Calculate term frequency
  const tf1: Record<string, number> = {};
  const tf2: Record<string, number> = {};
  
  words1.forEach(word => {
    tf1[word] = (tf1[word] || 0) + 1;
  });
  
  words2.forEach(word => {
    tf2[word] = (tf2[word] || 0) + 1;
  });
  
  // Get all unique terms
  const allTerms = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
  
  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  allTerms.forEach(term => {
    const freq1 = tf1[term] || 0;
    const freq2 = tf2[term] || 0;
    
    dotProduct += freq1 * freq2;
    magnitude1 += freq1 * freq1;
    magnitude2 += freq2 * freq2;
  });
  
  // Calculate cosine similarity
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  // Return value between 0 and 1
  return dotProduct / (magnitude1 * magnitude2);
};

/**
 * Domain-specific concept description for semantic comparison
 */
export const getDomainDescription = (conceptKey: string): string => {
  const conceptDescriptions: Record<string, string> = {
    // Product concepts
    'product_basics': 'A core product or service that a business sells or offers to customers, including its main purpose and general functionality.',
    'product_problems': 'The specific customer problems, pain points, and challenges that a product or service is designed to solve.',
    'product_features': 'The key capabilities, functionalities, and features that a product or service provides to users.',
    'product_differentiation': 'The unique selling points and advantages that differentiate a product from competitors in the market.',
    
    // Market concepts
    'market_identification': 'Defining the target market segments, industries, and customer groups for a business.',
    'buyer_persona': 'Detailed profiles of ideal customers including demographics, job roles, responsibilities, and behaviors.',
    'pain_points': 'Specific challenges, frustrations, and difficulties that customers experience which the product addresses.',
    'buyer_motivations': 'The underlying factors, goals, and needs that drive customer purchasing decisions.',
    
    // Sales context concepts
    'sales_cycle': 'The process and timeline for converting prospects into customers, including key stages and milestones.',
    'decision_process': 'How buying decisions are made within customer organizations, including stakeholders and approval processes.',
    'objection_handling': 'Common concerns, hesitations, and objections raised by prospects and strategies to address them.',
    'competitive_landscape': 'Understanding competitors, market positioning, and how the solution compares to alternatives.'
  };
  
  return conceptDescriptions[conceptKey] || '';
};

/**
 * Calculate semantic similarity between text and concept
 * Simplified version that works without embeddings
 */
export const getConceptSimilarity = (text: string, conceptKey: string): number => {
  const conceptDescription = getDomainDescription(conceptKey);
  if (!conceptDescription) return 0;
  
  // Calculate similarity
  const similarity = calculateTextSimilarity(text, conceptDescription);
  
  // Scale to make it more useful (raw similarity tends to be low)
  // Map 0-0.3 similarity to 0-100 scale
  return Math.min(100, Math.round(similarity * 333));
};

/**
 * Evaluates how well a text demonstrates understanding of a business concept
 * This is a hybrid approach that uses both keyword matching and semantic similarity
 */
export const evaluateBusinessConcept = (text: string, conceptKey: string): number => {
  // Basic validation
  if (!text || text.trim().length < 10) return 0;
  
  // Get concept-specific keywords
  const keywords = getConceptKeywords(conceptKey);
  
  // Calculate keyword match score (0-60 points)
  const keywordScore = calculateKeywordScore(text, keywords);
  
  // Calculate semantic similarity score (0-40 points)
  const semanticScore = getConceptSimilarity(text, conceptKey) * 0.4;
  
  // Combine scores
  return Math.min(100, Math.round(keywordScore + semanticScore));
};

/**
 * Get relevant keywords for a concept
 */
const getConceptKeywords = (conceptKey: string): string[] => {
  const keywordMap: Record<string, string[]> = {
    // Product concepts
    'product_basics': ['product', 'service', 'offer', 'provide', 'solution', 'tool', 'platform', 'application'],
    'product_problems': ['problem', 'challenge', 'issue', 'solve', 'address', 'pain', 'struggle', 'difficulty', 'overcome'],
    'product_features': ['feature', 'capability', 'function', 'benefit', 'advantage', 'component', 'characteristic'],
    'product_differentiation': ['unique', 'different', 'advantage', 'competitive', 'better', 'superior', 'distinct', 'special'],
    
    // Market concepts
    'market_identification': ['market', 'segment', 'industry', 'sector', 'audience', 'demographic', 'customer', 'target'],
    'buyer_persona': ['buyer', 'customer', 'client', 'user', 'profile', 'persona', 'role', 'title', 'position', 'decision'],
    'pain_points': ['pain', 'frustration', 'challenge', 'problem', 'struggle', 'difficulty', 'concern', 'issue'],
    'buyer_motivations': ['motivation', 'goal', 'objective', 'need', 'want', 'desire', 'priority', 'value', 'care'],
    
    // Sales context concepts
    'sales_cycle': ['cycle', 'process', 'pipeline', 'stage', 'step', 'timeline', 'duration', 'length', 'time'],
    'decision_process': ['decision', 'process', 'approval', 'stakeholder', 'committee', 'evaluate', 'criteria', 'factor'],
    'objection_handling': ['objection', 'concern', 'hesitation', 'resistance', 'pushback', 'question', 'doubt', 'skepticism'],
    'competitive_landscape': ['competitor', 'alternative', 'comparison', 'market', 'industry', 'player', 'rivalry', 'versus']
  };
  
  return keywordMap[conceptKey] || [];
};

/**
 * Calculate score based on keyword matches
 */
const calculateKeywordScore = (text: string, keywords: string[]): number => {
  if (!text || !keywords.length) return 0;
  
  const normalizedText = text.toLowerCase();
  const matchedKeywords = keywords.filter(keyword => 
    normalizedText.includes(keyword.toLowerCase())
  );
  
  // Calculate score based on percentage of matched keywords
  // 60 points maximum for keywords
  return Math.min(60, Math.round((matchedKeywords.length / keywords.length) * 80));
};

/**
 * semanticComparisonService.ts
 * 
 * Service for semantic text comparison and concept evaluation
 * using natural language processing techniques.
 */

// Constants for weighting different comparison techniques
const KEYWORD_WEIGHT = 0.4;
const SIMILARITY_WEIGHT = 0.5;
const LENGTH_WEIGHT = 0.1;

/**
 * Compares two texts semantically to determine their similarity
 * Uses a combination of keyword matching and text processing techniques
 * 
 * @param text1 First text to compare
 * @param text2 Second text to compare
 * @returns Promise<number> Similarity score between 0-1
 */
export const compareTextSemantically = async (
  text1: string, 
  text2: string
): Promise<number> => {
  if (!text1 || !text2) return 0;
  
  // Normalize texts by converting to lowercase and removing punctuation
  const normalize = (text: string): string[] => 
    text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter out very short words
  
  const words1 = normalize(text1);
  const words2 = normalize(text2);
  
  // Empty texts can't be compared
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Calculate keyword overlap score
  const keywordOverlap = calculateKeywordOverlap(words1, words2);
  
  // Calculate n-gram similarity
  const ngramSimilarity = calculateNGramSimilarity(text1.toLowerCase(), text2.toLowerCase());
  
  // Calculate length ratio factor (penalizes very short responses)
  const lengthRatio = Math.min(words1.length / 15, 1); // Max out at 15 words
  
  // Combine scores with weights
  return (
    (keywordOverlap * KEYWORD_WEIGHT) +
    (ngramSimilarity * SIMILARITY_WEIGHT) + 
    (lengthRatio * LENGTH_WEIGHT)
  );
};

/**
 * Calculates keyword overlap between two word lists
 * 
 * @param words1 First set of words
 * @param words2 Second set of words
 * @returns number Overlap score between 0-1
 */
const calculateKeywordOverlap = (words1: string[], words2: string[]): number => {
  if (words1.length === 0 || words2.length === 0) return 0;
  
  // Create sets of unique words
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  // Count overlapping words
  let overlap = 0;
  for (const word of set1) {
    if (set2.has(word)) {
      overlap++;
    }
  }
  
  // Normalize by size of the smaller set
  return overlap / Math.min(set1.size, set2.size);
};

/**
 * Calculates n-gram similarity between two texts
 * 
 * @param text1 First text
 * @param text2 Second text
 * @returns number Similarity score between 0-1
 */
const calculateNGramSimilarity = (text1: string, text2: string): number => {
  // Extract bi-grams and tri-grams from each text
  const text1Bigrams = extractNGrams(text1, 2);
  const text2Bigrams = extractNGrams(text2, 2);
  const text1Trigrams = extractNGrams(text1, 3);
  const text2Trigrams = extractNGrams(text2, 3);
  
  // Calculate similarity for each n-gram type
  const bigramSimilarity = calculateSetSimilarity(text1Bigrams, text2Bigrams);
  const trigramSimilarity = calculateSetSimilarity(text1Trigrams, text2Trigrams);
  
  // Weighted combination (trigrams are better for phrase matching)
  return (bigramSimilarity * 0.4) + (trigramSimilarity * 0.6);
};

/**
 * Extracts n-grams from text
 * 
 * @param text Input text
 * @param n Size of n-gram
 * @returns Set<string> Set of n-grams
 */
const extractNGrams = (text: string, n: number): Set<string> => {
  const ngrams = new Set<string>();
  if (text.length < n) return ngrams;
  
  for (let i = 0; i <= text.length - n; i++) {
    ngrams.add(text.substring(i, i + n));
  }
  
  return ngrams;
};

/**
 * Calculates Jaccard similarity between two sets
 * 
 * @param set1 First set
 * @param set2 Second set
 * @returns number Similarity score between 0-1
 */
const calculateSetSimilarity = (set1: Set<string>, set2: Set<string>): number => {
  if (set1.size === 0 || set2.size === 0) return 0;
  
  // Calculate intersection
  const intersection = new Set<string>();
  for (const item of set1) {
    if (set2.has(item)) {
      intersection.add(item);
    }
  }
  
  // Calculate union
  const union = new Set<string>([...set1, ...set2]);
  
  // Jaccard similarity: intersection size / union size
  return intersection.size / union.size;
};

/**
 * Business concept evaluation map
 * Maps concept keys to evaluation phrases that should be present
 */
const CONCEPT_EVAL_MAP: Record<string, string[]> = {
  // Product stage
  "unique_value_prop": [
    "different from competitors", "unique", "special", "proprietary", 
    "exclusive", "innovative", "patented", "stands out", "advantage"
  ],
  "pain_points": [
    "problem", "pain", "challenge", "struggle", "difficulty", 
    "obstacle", "frustration", "issue", "need", "solves"
  ],
  "feature_benefit": [
    "feature", "benefit", "advantage", "provides", "delivers", 
    "offers", "enables", "allows", "helps", "improves"
  ],
  
  // Market stage
  "market_identification": [
    "market", "industry", "sector", "segment", "niche", 
    "demographic", "audience", "customers", "users", "target"
  ],
  "buyer_persona": [
    "buyer", "customer", "client", "user", "demographic", 
    "persona", "profile", "role", "decision-maker", "purchaser"
  ],
  "competitive_landscape": [
    "competitor", "alternative", "market position", "industry leader", 
    "market share", "competition", "differentiator", "comparison"
  ],
  
  // Sales context
  "sales_process": [
    "process", "pipeline", "journey", "cycle", "stages", 
    "steps", "conversion", "acquisition", "funnel", "approach"
  ],
  "objection_handling": [
    "objection", "concern", "hesitation", "obstacle", "resistance", 
    "pushback", "question", "doubt", "reservation", "challenge"
  ],
  "value_communication": [
    "value", "roi", "return", "benefits", "results", 
    "outcome", "impact", "success", "achievement", "effectiveness"
  ]
};

/**
 * Evaluates how well a text addresses a specific business concept
 * Uses a hybrid approach of concept keywords and semantic matching
 * 
 * @param text Text to evaluate
 * @param conceptKey Key identifying the business concept
 * @returns number Score between 0-1
 */
export const evaluateBusinessConceptSemantic = (text: string, conceptKey: string): number => {
  if (!text || !conceptKey || text.trim().length < 10) {
    return 0;
  }
  
  // Get the concept phrases to look for
  const conceptPhrases = CONCEPT_EVAL_MAP[conceptKey];
  if (!conceptPhrases || conceptPhrases.length === 0) {
    console.warn(`No concept phrases defined for: ${conceptKey}`);
    return 0;
  }
  
  // Normalize text
  const normalizedText = text.toLowerCase();
  
  // Count phrase matches
  let matchCount = 0;
  for (const phrase of conceptPhrases) {
    if (normalizedText.includes(phrase.toLowerCase())) {
      matchCount++;
    }
  }
  
  // Calculate match percentage (bonus for multiple matches)
  const baseScore = matchCount / conceptPhrases.length;
  
  // Apply text quality modifiers
  const wordCount = normalizedText.split(/\s+/).length;
  const lengthModifier = Math.min(wordCount / 30, 1); // Max out at 30 words
  
  return baseScore * (0.7 + (0.3 * lengthModifier));
};

/**
 * Gets keywords for a concept from the concept evaluation map
 * 
 * @param concept The concept to get keywords for
 * @returns string[] Array of keywords for the concept
 */
const getKeywordsForConcept = (concept: string): string[] => {
  if (!CONCEPT_EVAL_MAP[concept]) return [];
  return CONCEPT_EVAL_MAP[concept];
};

/**
 * Evaluates a text input against specified business concept keywords
 * and returns a score indicating how well it matches
 * 
 * @param text The user's input text to evaluate
 * @param concept The business concept to evaluate against
 * @returns A number between 0-100 representing the match score
 */
export const evaluateBusinessConceptKeywords = (text: string, concept: string): number => {
  if (!text || !concept) return 0;
  
  const normalizedText = text.toLowerCase();
  
  // Get keywords for the specified concept
  const keywords = getKeywordsForConcept(concept);
  if (!keywords || keywords.length === 0) return 0;
  
  // Count how many keywords match
  const matchedKeywords = keywords.filter(keyword => 
    normalizedText.includes(keyword.toLowerCase())
  );
  
  // Return score out of 100 with a max of 60 for pure keyword matching
  // This leaves room for semantic matching to contribute additional points
  return Math.min(60, Math.round((matchedKeywords.length / keywords.length) * 80));
}; 
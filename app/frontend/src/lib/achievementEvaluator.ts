/**
 * Achievement Evaluator
 * 
 * This module evaluates user responses against predefined achievement criteria
 * using semantic understanding to measure progress in different sales competency areas.
 */

import { getTextConceptSimilarity, calculateEmbeddingSimilarity, getEmbedding } from './embeddingService';

// Simple in-memory cache for concept embeddings
const conceptEmbeddingCache: Record<string, number[]> = {}; // Cache object { conceptText: embeddingVector }

// Define achievement categories
export type AchievementCategory = 'product' | 'market' | 'sales' | 'communication';

// Achievement definition
export interface Achievement {
  id: string;
  name: string;
  category: AchievementCategory;
  description: string;
  keywords: string[];
  conceptPhrase: string;
  relatedQuestions: string[];
}

// Define achievements
export const achievements: Achievement[] = [
  // Product knowledge achievements
  {
    id: 'product_basics',
    name: 'Product Fundamentals',
    category: 'product',
    description: 'Understanding of core product offering and purpose',
    keywords: ['product', 'service', 'offering', 'purpose', 'solution'],
    conceptPhrase: 'identity of product or service sold',
    relatedQuestions: ['What does your product or service do?', 'What problem does your solution solve?']
  },
  {
    id: 'product_features',
    name: 'Product Features',
    category: 'product',
    description: 'Knowledge of key product features and capabilities',
    keywords: ['feature', 'capability', 'functionality', 'technology', 'module'],
    conceptPhrase: 'specific functions capabilities components how it works technology',
    relatedQuestions: ['What are your key product features?', 'What capabilities does your product offer?']
  },
  {
    id: 'product_problems',
    name: 'Problem Recognition',
    category: 'product',
    description: 'Understanding of the problems your product solves',
    keywords: ['problem', 'challenge', 'pain point', 'need', 'issue'],
    conceptPhrase: 'customer pain problem challenge needs solution addresses benefit',
    relatedQuestions: ['What problems does your product solve?', 'What pain points do you address?']
  },
  {
    id: 'product_differentiation',
    name: 'Product Differentiation',
    category: 'product',
    description: 'Ability to articulate unique value proposition',
    keywords: ['unique', 'different', 'competitor', 'alternative', 'advantage'],
    conceptPhrase: 'unique different advantage competitor comparison alternative value proposition',
    relatedQuestions: ['How is your product different from alternatives?', 'What makes your solution unique?']
  },

  // Market understanding achievements
  {
    id: 'market_identification',
    name: 'Market Understanding',
    category: 'market',
    description: 'Knowledge of target market segments',
    keywords: ['market', 'segment', 'industry', 'sector', 'vertical'],
    conceptPhrase: 'We target specific market segments and industries with our product offering',
    relatedQuestions: ['What markets do you serve?', 'Which industries do you target?']
  },
  {
    id: 'buyer_persona',
    name: 'Buyer Personas',
    category: 'market',
    description: 'Understanding of ideal customer profiles',
    keywords: ['buyer', 'customer', 'profile', 'persona', 'role', 'title'],
    conceptPhrase: 'Our ideal customers have specific roles, responsibilities, and characteristics',
    relatedQuestions: ['Who is your ideal customer?', 'What roles typically purchase your solution?']
  },
  {
    id: 'pain_points',
    name: 'Customer Pain Points',
    category: 'market',
    description: 'Recognition of customer challenges and pain points',
    keywords: ['pain', 'challenge', 'struggle', 'frustration', 'problem'],
    conceptPhrase: 'Our customers face specific challenges and pain points in their business operations',
    relatedQuestions: ['What pain points do your customers experience?', 'What challenges do your customers face?']
  },
  {
    id: 'buyer_motivations',
    name: 'Buyer Motivations',
    category: 'market',
    description: 'Understanding of buyer decision factors',
    keywords: ['motivation', 'reason', 'goal', 'objective', 'outcome'],
    conceptPhrase: 'Customers buy our solution for specific reasons to achieve particular goals or outcomes',
    relatedQuestions: ['Why do customers buy your product?', 'What motivates purchase decisions?']
  },

  // Sales process achievements
  {
    id: 'sales_cycle',
    name: 'Sales Process',
    category: 'sales',
    description: 'Knowledge of sales cycle and process stages',
    keywords: ['process', 'cycle', 'stage', 'pipeline', 'conversion'],
    conceptPhrase: 'Our sales process has specific stages with defined activities and conversion points',
    relatedQuestions: ['What does your sales process look like?', 'How long is your typical sales cycle?']
  },
  {
    id: 'decision_process',
    name: 'Decision Process',
    category: 'sales',
    description: 'Understanding of customer decision-making process',
    keywords: ['decision', 'committee', 'criteria', 'evaluation', 'approval'],
    conceptPhrase: 'Customers follow a specific decision process with multiple stakeholders and criteria',
    relatedQuestions: ['How do customers make purchase decisions?', 'Who is involved in the buying process?']
  },
  {
    id: 'objection_handling',
    name: 'Objection Handling',
    category: 'sales',
    description: 'Ability to address common sales objections',
    keywords: ['objection', 'concern', 'hesitation', 'question', 'pushback'],
    conceptPhrase: 'We effectively address common objections and concerns during the sales process',
    relatedQuestions: ['What objections do you commonly hear?', 'How do you handle customer concerns?']
  },
  {
    id: 'competitive_landscape',
    name: 'Competitive Awareness',
    category: 'sales',
    description: 'Knowledge of competitive landscape and positioning',
    keywords: ['competitor', 'alternative', 'comparison', 'versus', 'competition'],
    conceptPhrase: 'We understand our competitors and how to position against alternatives in the market',
    relatedQuestions: ['Who are your main competitors?', 'How do you position against alternatives?']
  }
];

/**
 * Maps achievement IDs to their concept phrases for easy lookup
 */
const conceptKeywords: Record<string, string> = achievements.reduce((acc, achievement) => {
  acc[achievement.id] = achievement.conceptPhrase;
  return acc;
}, {} as Record<string, string>);

/**
 * Evaluates a user response against achievement criteria
 * 
 * @param text User's response text
 * @param achievementId ID of the achievement to evaluate
 * @param userTextEmbedding Pre-calculated embedding for the user's text
 * @returns Promise that resolves to a score (0-100)
 */
export const evaluateAchievement = async (
  text: string,
  achievementId: string,
  userTextEmbedding: number[] | null
): Promise<number> => {
  // If embedding wasn't passed or failed previously, maybe default to keyword?
  if (!userTextEmbedding) {
      console.warn(` -> No user text embedding provided for ${achievementId}, using keyword fallback.`);
      return evaluateAchievementKeywords(text, achievementId);
  }
  try {
    // Use semantic evaluation as the primary method, passing the embedding
    return await evaluateAchievementSemantic(text, achievementId, userTextEmbedding);
  } catch (error) {
    console.error('Error in semantic evaluation, falling back to keyword analysis:', error);
    
    // Fall back to keyword analysis if semantic evaluation fails
    return evaluateAchievementKeywords(text, achievementId);
  }
};

/**
 * Semantically evaluates text against a concept using embeddings
 */
const evaluateAchievementSemantic = async (
  text: string,
  achievementId: string,
  userTextEmbedding: number[]
): Promise<number> => {
  const conceptText = conceptKeywords[achievementId] || achievementId;
  let finalScore = 0; // Initialize finalScore here

  try {
    // --- Use the pre-calculated user text embedding --- 
    // const textEmbedding = await getEmbedding(text); // REMOVED THIS LINE
    const textEmbedding = userTextEmbedding; // Use passed-in embedding

    // Get embedding for concept text (use cache)
    let conceptEmbedding = conceptEmbeddingCache[conceptText];
    if (!conceptEmbedding) {
      console.log(` -> Cache miss for concept: ${conceptText.substring(0,40)}... Fetching embedding.`);
      conceptEmbedding = await getEmbedding(conceptText);
      conceptEmbeddingCache[conceptText] = conceptEmbedding; // Store in cache
    } else {
      // console.log(` -> Cache hit for concept: ${conceptText.substring(0,40)}...`); // Optional: log cache hits
    }
    
    // Calculate raw similarity (0.0 to 1.0)
    const similarity = calculateEmbeddingSimilarity(textEmbedding, conceptEmbedding);
    
    // Define base similarity thresholds needed to score points
    const BASE_THRESHOLD_BASICS = 0.45; // Lower threshold for basic identification (Adjust as needed)
    const BASE_THRESHOLD_DETAIL = 0.70; // Higher threshold for more detailed topics (Adjust as needed)

    let score = 0; // Temporary variable for threshold calculation
    // Apply threshold and scaling based on achievement type
    switch (achievementId) {
      case 'product_basics':
      case 'market_identification': 
        if (similarity >= BASE_THRESHOLD_BASICS) {
          score = Math.round(((similarity - BASE_THRESHOLD_BASICS) / (1.0 - BASE_THRESHOLD_BASICS)) * 100);
        }
        break;
      // Add other basic IDs if necessary
      case 'product_problems':
      case 'product_features':
      case 'product_differentiation':
      case 'buyer_persona':
      case 'pain_points':
      case 'buyer_motivations':
      case 'sales_cycle':
      case 'decision_process':
      case 'objection_handling':
      case 'competitive_landscape':
      // Add other detailed IDs if necessary
      default: // Default to requiring higher similarity
        if (similarity >= BASE_THRESHOLD_DETAIL) {
          score = Math.round(((similarity - BASE_THRESHOLD_DETAIL) / (1.0 - BASE_THRESHOLD_DETAIL)) * 100);
        }
        break;
    }

    finalScore = score; // Assign threshold score to finalScore
    console.log(` -> Similarity: ${similarity.toFixed(3)}, Threshold applied for ${achievementId}. Initial Score: ${finalScore}`);

    // --- Apply Linguistic Modifiers --- 
    const lowerText = text.toLowerCase();
    if (achievementId === 'product_differentiation') {
      const differentiationKeywords = ['better', 'faster', 'unique', 'more ', ' less ', ' than ', 'different', 'advantage', 'unlike', 'compare', 'competitor', 'alternative'];
      const hasDifferentiationLang = differentiationKeywords.some(kw => lowerText.includes(kw));
      if (hasDifferentiationLang) {
        const boostFactor = 1.2;
        finalScore = Math.round(finalScore * boostFactor);
        console.log(` -> Differentiation language found. Applied boost (${boostFactor}). Adjusted Score: ${finalScore}`);
      } else if (score > 65) { // Check original threshold score here
        const penaltyFactor = 0.85;
        finalScore = Math.round(finalScore * penaltyFactor);
        console.log(` -> High score but no specific differentiation language. Applied penalty (${penaltyFactor}). Adjusted Score: ${finalScore}`);
      }
    }
    // Add other linguistic modifiers here if needed
    // --- End Linguistic Modifiers --- 

  } catch (error) {
    console.error(`Error during semantic evaluation for ${achievementId}:`, error);
    // Fallback to keyword analysis only if semantic evaluation throws an error
    console.log(` -> Semantic evaluation failed, falling back to keywords for ${achievementId}`);
    finalScore = evaluateAchievementKeywords(text, achievementId); // Assign fallback to finalScore
  }
  
  // Return final score, ensuring it's capped at 100
  return Math.min(Math.max(0, finalScore), 100); // Ensure score is between 0 and 100
};

/**
 * Evaluates text against achievement keywords as a fallback method
 */
const evaluateAchievementKeywords = (
  text: string,
  achievementId: string
): number => {
  // Find the achievement
  const achievement = achievements.find(a => a.id === achievementId);
  if (!achievement) return 0;
  
  // Normalize text
  const normalizedText = text.toLowerCase();
  
  // Count keyword matches
  let matches = 0;
  for (const keyword of achievement.keywords) {
    if (normalizedText.includes(keyword.toLowerCase())) {
      matches++;
    }
  }
  
  // Calculate score based on keyword density
  const maxMatches = achievement.keywords.length;
  const matchRatio = matches / maxMatches;
  
  // Scale to 0-80 (keyword analysis is less accurate than semantic)
  return Math.min(Math.round(matchRatio * 80), 80);
};

/**
 * Evaluates all achievements for a given text
 * 
 * @param text User's response text
 * @returns Promise that resolves to a record of achievement scores
 */
export const evaluateAllAchievements = async (
  text: string
): Promise<Record<string, number>> => {
  const results: Record<string, number> = {};
  
  // Evaluate each achievement in parallel
  const evaluations = await Promise.all(
    achievements.map(async achievement => {
      const score = await evaluateAchievement(text, achievement.id, null);
      return { id: achievement.id, score };
    })
  );
  
  // Convert array of results to record
  evaluations.forEach(({ id, score }) => {
    results[id] = score;
  });
  
  return results;
};

/**
 * Gets achievements with low scores that need improvement
 * 
 * @param scores Record of achievement scores
 * @param threshold Threshold below which scores are considered low
 * @returns Array of achievement IDs with low scores
 */
export const getAchievementsNeedingImprovement = (
  scores: Record<string, number>,
  threshold = 50
): string[] => {
  return Object.entries(scores)
    .filter(([_, score]) => score < threshold)
    .map(([id, _]) => id);
};

/**
 * Gets the next best achievement to focus on
 * 
 * @param scores Current achievement scores
 * @returns ID of the achievement to focus on next
 */
export const getNextFocusAchievement = (
  scores: Record<string, number>
): string => {
  // Prioritize achievements with low scores
  const needsImprovement = getAchievementsNeedingImprovement(scores);
  
  if (needsImprovement.length === 0) {
    // If all scores are good, focus on the lowest
    const lowestId = Object.entries(scores)
      .sort(([_, scoreA], [__, scoreB]) => scoreA - scoreB)
      .map(([id, _]) => id)[0];
    
    return lowestId || achievements[0].id;
  }
  
  // Return the first achievement needing improvement
  return needsImprovement[0];
}; 
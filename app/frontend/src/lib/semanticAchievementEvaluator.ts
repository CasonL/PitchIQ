/**
 * Semantic Achievement Evaluator
 * 
 * This module provides async functions for evaluating achievements
 * using a hybrid of semantic understanding and keyword detection.
 * It's designed to be a drop-in replacement for the existing evaluator.
 */

import { evaluateBusinessConcept } from './semanticComparisonService';
import { evaluateAchievement } from './achievementEvaluator';
import { compareTextSemantically } from './semanticComparisonService';

/**
 * Lightweight achievement evaluation that incorporates semantic understanding
 * while maintaining backward compatibility with existing code
 * 
 * @param text The user's response to evaluate
 * @param achievementId The ID of the achievement to evaluate against
 * @returns A score from 0-100 indicating match with achievement criteria
 */
export const evaluateAchievementHybrid = async (
  text: string, 
  achievementId: string
): Promise<number> => {
  try {
    // Get the keyword-based score (0-100)
    const keywordScore = evaluateAchievement(text, achievementId);
    
    // Get the semantic match score (0-100)
    const conceptDescription = ACHIEVEMENT_CONCEPTS[achievementId];
    if (!conceptDescription) {
      console.warn(`No concept description found for achievement: ${achievementId}`);
      return keywordScore; // Fallback to just keyword score
    }
    
    // Calculate semantic score from the comparison result (0-100)
    const semanticScore = await compareTextSemantically(text, conceptDescription) * 100;
    
    // Combine scores with weights
    const combinedScore = Math.round(
      (semanticScore * SEMANTIC_WEIGHT) + 
      (keywordScore * KEYWORD_WEIGHT)
    );
    
    console.log(`Achievement evaluation for ${achievementId}:`, {
      keywordScore,
      semanticScore,
      combinedScore
    });
    
    // Cap at 100
    return Math.min(100, combinedScore);
  } catch (error) {
    console.error('Error in hybrid achievement evaluation:', error);
    // Fallback to traditional evaluation
    return evaluateAchievement(text, achievementId);
  }
};

/**
 * Calculate a modifier based on text quality indicators
 * @param text The text to analyze
 * @returns A multiplier between 0.5 and 1.2
 */
const calculateQualityModifier = (text: string): number => {
  if (!text) return 0.5;
  
  const normalizedText = text.toLowerCase().trim();
  
  // Basic linguistic features
  const wordCount = normalizedText.split(/\s+/).filter(Boolean).length;
  const sentenceCount = normalizedText.split(/[.!?]+/).filter(Boolean).length;
  const averageWordLength = normalizedText.replace(/\s+/g, '').length / wordCount;
  
  // Check for domain-specific terminology
  const domainTerms = [
    'roi', 'kpi', 'b2b', 'b2c', 'saas', 'mrr', 'arr', 'cac', 'ltv', 'churn',
    'pipeline', 'conversion', 'retention', 'acquisition', 'nurture', 'funnel',
    'objection', 'pricing', 'subscription', 'upsell', 'cross-sell', 'revenue'
  ];
  
  const termMatches = domainTerms.filter(term => 
    normalizedText.includes(term.toLowerCase())
  ).length;
  
  // Calculate modifier components
  
  // Word count component (0.5-1.1)
  // Rewards longer responses up to a point
  const wordCountModifier = Math.min(1.1, 0.5 + (wordCount / 120) * 0.6);
  
  // Text structure component (0.8-1.1)
  // Rewards multiple sentences and proper structure
  const structureModifier = Math.min(1.1, 0.8 + (sentenceCount / 8) * 0.3);
  
  // Domain expertise component (1.0-1.2)
  // Rewards using domain-specific terminology
  const expertiseModifier = 1.0 + Math.min(0.2, termMatches * 0.04);
  
  // Combine modifiers with reasonable weighting
  return (wordCountModifier * 0.4) + (structureModifier * 0.3) + (expertiseModifier * 0.3);
};

/**
 * Simple fallback keyword-based evaluation
 * Used only if the semantic evaluation fails
 */
const fallbackKeywordEvaluation = (text: string, achievementId: string): number => {
  if (!text) return 0;
  
  const cleanText = text.trim().toLowerCase();
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
  
  // Minimum word counts for meaningful responses
  const minWords: Record<string, number> = {
    product_basics: 8,
    product_problems: 15,
    product_features: 20, 
    product_differentiation: 25,
    market_identification: 8,
    buyer_persona: 15,
    pain_points: 20,
    buyer_motivations: 25,
    sales_cycle: 8,
    decision_process: 15,
    objection_handling: 20,
    competitive_landscape: 25
  };
  
  // If text is too short, score it very low
  if (wordCount < minWords[achievementId]) {
    return Math.round((wordCount / minWords[achievementId]) * 15); // Max 15 points for short responses
  }
  
  // Keywords from the comparison service
  const keywords = getKeywords(achievementId);
  
  // Count matching keywords
  const matchingKeywords = keywords.filter(keyword => 
    cleanText.includes(keyword.toLowerCase())
  ).length;
  
  // Calculate simple score based on keyword density and word count
  const keywordDensity = matchingKeywords / keywords.length;
  const densityScore = keywordDensity * 60; // Up to 60 points for keywords
  
  // Word count score (up to 20 points)
  const wordCountRatio = Math.min(1, wordCount / (minWords[achievementId] * 2));
  const wordCountScore = wordCountRatio * 20;
  
  // Simple specificity score (up to 20 points)
  const avgWordLength = cleanText.replace(/\s+/g, '').length / wordCount;
  const sentenceCount = cleanText.split(/[.!?]+/).filter(Boolean).length;
  const specificityScore = Math.min(20, ((avgWordLength - 3) * 5) + (sentenceCount * 2));
  
  // Total score
  return Math.min(100, Math.round(densityScore + wordCountScore + specificityScore));
};

/**
 * Get keywords for fallback evaluation
 */
const getKeywords = (achievementId: string): string[] => {
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
  
  return keywordMap[achievementId] || [];
};

/**
 * Dictionary of concept descriptions for each achievement
 * These are used for semantic matching
 */
const ACHIEVEMENT_CONCEPTS: Record<string, string> = {
  // Product stage concepts
  "unique_value_prop": "Clear statement of what makes the product unique, special, or better than alternatives",
  "pain_points": "Description of problems, challenges, or pain points that the product solves for customers",
  "feature_benefit": "Explanation of product features and their specific benefits to users",
  
  // Market stage concepts  
  "market_identification": "Clearly defined target market, industry, or customer segments",
  "buyer_persona": "Detailed description of ideal customer, their role, needs and motivations",
  "competitive_landscape": "Understanding of competitors, market position, and competitive advantages",
  
  // Sales context concepts
  "sales_process": "Description of the sales process, buying cycle, or customer journey",
  "objection_handling": "Addressing common customer objections or hesitations during sales",
  "value_communication": "Effective ways to communicate value and ROI to potential customers"
};

/**
 * Weight for balancing keyword vs semantic evaluation
 * Higher means more weight on semantic understanding
 */
const SEMANTIC_WEIGHT = 0.65;
const KEYWORD_WEIGHT = 0.35;

/**
 * Identifies which achievements are relevant to the given text
 * by checking semantic similarity to all achievement concepts
 * 
 * @param text User input to analyze
 * @returns Promise<string[]> Achievement IDs that are relevant
 */
export const identifyRelevantAchievements = async (
  text: string
): Promise<string[]> => {
  try {
    const relevanceThreshold = 0.60; // Minimum similarity to be considered relevant
    const relevantAchievements: string[] = [];
    
    for (const [achievementId, conceptDescription] of Object.entries(ACHIEVEMENT_CONCEPTS)) {
      const similarity = await compareTextSemantically(text, conceptDescription);
      
      if (similarity >= relevanceThreshold) {
        relevantAchievements.push(achievementId);
      }
    }
    
    return relevantAchievements;
  } catch (error) {
    console.error('Error identifying relevant achievements:', error);
    return [];
  }
}; 
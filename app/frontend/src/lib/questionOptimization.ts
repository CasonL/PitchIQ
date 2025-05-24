/**
 * Question Optimization System
 * 
 * This module provides analytics-driven question optimization to prioritize
 * questions based on insight density, completion rates, and other metrics.
 */

/**
 * Question metrics for analytics
 */
export interface QuestionMetrics {
  id: string;
  text: string;
  completionRate: number;
  insightDensity: number;
  averageResponseLength: number;
  averageResponseTime: number;
  confidenceScore: number;
  category: string;
  lastAsked?: Date;
}

/**
 * Question response data
 */
export interface QuestionResponse {
  questionId: string;
  responseText: string;
  responseTime: number;
  timestamp: Date;
  skipped: boolean;
  insights: string[];
}

// In-memory analytics store (would be persisted to server in production)
let questionMetricsStore: QuestionMetrics[] = [];
let responseStore: QuestionResponse[] = [];

/**
 * Optimizes question order based on analytics metrics
 * 
 * @param questions Array of question objects or strings to optimize
 * @param metrics Question metrics to use for optimization
 * @returns Optimized array of questions
 */
export const optimizeQuestionOrder = <T extends string | { id: string; text: string }>(
  questions: T[],
  metrics: QuestionMetrics[] = questionMetricsStore
): T[] => {
  // If no metrics are available, return questions in original order
  if (!metrics.length) return questions;

  // Create a map of question IDs to metrics for efficient lookup
  const metricMap = new Map<string, QuestionMetrics>();
  metrics.forEach(metric => {
    metricMap.set(metric.id, metric);
  });

  // Define scoring function for questions
  const getQuestionScore = (question: T): number => {
    // Get question ID
    const questionId = typeof question === 'string' 
      ? question 
      : question.id;
    
    // Look up metrics for this question
    const metric = metricMap.get(questionId);
    if (!metric) return 0;
    
    // Calculate composite score prioritizing insight density and completion rate
    // Add recency bias (questions not asked recently get higher scores)
    let score = (metric.insightDensity * 0.5) + 
                (metric.completionRate * 0.3) + 
                (metric.confidenceScore * 0.2);
    
    // Add recency penalty if question was asked recently
    if (metric.lastAsked) {
      const daysSinceAsked = (Date.now() - metric.lastAsked.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceAsked < 7) {
        score *= (daysSinceAsked / 7); // Scale down score for recently asked questions
      }
    }
    
    return score;
  };

  // Clone and sort the questions array based on scores
  return [...questions].sort((a, b) => {
    const scoreA = getQuestionScore(a);
    const scoreB = getQuestionScore(b);
    return scoreB - scoreA; // Higher scores first
  });
};

/**
 * Tracks a question response to update metrics
 * 
 * @param response Question response data
 */
export const trackQuestionResponse = (response: QuestionResponse): void => {
  // Add to response store
  responseStore.push(response);
  
  // Update metrics for this question
  updateMetricsForQuestion(response.questionId);
};

/**
 * Updates metrics for a specific question based on collected responses
 * 
 * @param questionId ID of the question to update metrics for
 */
const updateMetricsForQuestion = (questionId: string): void => {
  // Get all responses for this question
  const questionResponses = responseStore.filter(r => r.questionId === questionId);
  if (questionResponses.length === 0) return;
  
  // Calculate metrics
  const totalResponses = questionResponses.length;
  const completedResponses = questionResponses.filter(r => !r.skipped).length;
  const completionRate = completedResponses / totalResponses;
  
  const nonSkippedResponses = questionResponses.filter(r => !r.skipped);
  const averageResponseLength = nonSkippedResponses.length > 0
    ? nonSkippedResponses.reduce((sum, r) => sum + r.responseText.length, 0) / nonSkippedResponses.length
    : 0;
  
  const averageResponseTime = nonSkippedResponses.length > 0
    ? nonSkippedResponses.reduce((sum, r) => sum + r.responseTime, 0) / nonSkippedResponses.length
    : 0;
  
  const insightDensity = nonSkippedResponses.length > 0
    ? nonSkippedResponses.reduce((sum, r) => sum + (r.insights.length / Math.max(1, r.responseText.length / 100)), 0) / nonSkippedResponses.length
    : 0;
  
  // Find existing metric or create new one
  const existingMetricIndex = questionMetricsStore.findIndex(m => m.id === questionId);
  
  if (existingMetricIndex >= 0) {
    // Update existing metric
    questionMetricsStore[existingMetricIndex] = {
      ...questionMetricsStore[existingMetricIndex],
      completionRate,
      averageResponseLength,
      averageResponseTime,
      insightDensity,
      lastAsked: questionResponses[questionResponses.length - 1].timestamp
    };
  } else {
    // Add new metric (with placeholder values for missing fields)
    questionMetricsStore.push({
      id: questionId,
      text: questionResponses[0]?.responseText.substring(0, 50) || questionId,
      completionRate,
      averageResponseLength,
      averageResponseTime,
      insightDensity,
      confidenceScore: 0.5, // Default confidence score
      category: 'unknown',
      lastAsked: questionResponses[questionResponses.length - 1].timestamp
    });
  }
};

/**
 * Gets the next best question from a category based on metrics
 * 
 * @param category Category to select from
 * @param askedQuestionIds IDs of questions already asked
 * @param questions Available questions to choose from
 * @returns The next best question to ask
 */
export const getNextBestQuestion = <T extends { id: string; text: string; category: string }>(
  category: string,
  askedQuestionIds: string[],
  questions: T[]
): T | null => {
  // Filter questions by category and not already asked
  const availableQuestions = questions.filter(q => 
    q.category === category && !askedQuestionIds.includes(q.id)
  );
  
  if (availableQuestions.length === 0) return null;
  
  // Optimize the order of available questions
  const optimizedQuestions = optimizeQuestionOrder(availableQuestions);
  
  // Return the first (highest-scoring) question
  return optimizedQuestions[0];
};

/**
 * Gets metrics for a specific question
 * 
 * @param questionId ID of the question
 * @returns Metrics for the question or null if not found
 */
export const getQuestionMetrics = (questionId: string): QuestionMetrics | null => {
  return questionMetricsStore.find(m => m.id === questionId) || null;
};

/**
 * Gets all metrics for questions in a specific category
 * 
 * @param category Category to filter by
 * @returns Array of metrics for questions in the category
 */
export const getMetricsByCategory = (category: string): QuestionMetrics[] => {
  return questionMetricsStore.filter(m => m.category === category);
};

/**
 * Identifies knowledge gaps based on question metrics
 * 
 * @param threshold Confidence threshold below which to consider a gap
 * @returns Array of question IDs with low confidence scores
 */
export const identifyKnowledgeGaps = (threshold: number = 0.4): string[] => {
  return questionMetricsStore
    .filter(m => m.confidenceScore < threshold)
    .map(m => m.id);
};

/**
 * Updates the confidence score for a specific question
 * 
 * @param questionId ID of the question
 * @param confidenceScore New confidence score (0-1)
 */
export const updateConfidenceScore = (questionId: string, confidenceScore: number): void => {
  const index = questionMetricsStore.findIndex(m => m.id === questionId);
  if (index >= 0) {
    questionMetricsStore[index].confidenceScore = confidenceScore;
  }
};

/**
 * Resets all metrics (for testing or user reset)
 */
export const resetMetrics = (): void => {
  questionMetricsStore = [];
  responseStore = [];
};

/**
 * Gets all stored question metrics.
 * @returns Array of all question metrics
 */
export const getAllQuestionMetrics = (): QuestionMetrics[] => {
  return questionMetricsStore;
};

/**
 * Main analytics namespace for question optimization
 * Now placed after all function declarations to avoid reference errors
 */
export const questionAnalytics = {
  getMetrics: getQuestionMetrics,
  getMetricsByCategory,
  trackResponse: trackQuestionResponse,
  identifyGaps: identifyKnowledgeGaps,
  resetData: resetMetrics,
  getBestQuestion: getNextBestQuestion,
  optimizeOrder: optimizeQuestionOrder,
  getAllMetrics: getAllQuestionMetrics
}; 
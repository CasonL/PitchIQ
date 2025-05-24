/**
 * Contextual Question Generator
 * 
 * This module provides advanced contextual question generation capabilities,
 * allowing for more natural and personalized conversation flow.
 */

import { getEmbedding, calculateEmbeddingSimilarity } from './embeddingService';
import { questionAnalytics } from './questionOptimization';

/**
 * Generates a contextually enhanced question based on user's previous answers
 * 
 * @param baseQuestion The original question to enhance
 * @param previousAnswers Array of previous Q&A pairs
 * @param detectedConcepts Array of concept keywords detected in the conversation
 * @returns Enhanced question with contextual references
 */
export const generateContextualQuestion = async (
  baseQuestion: string,
  previousAnswers: { text: string; question: string }[],
  detectedConcepts: string[] = []
): Promise<string> => {
  try {
    // Make API call to generate enhanced question
    const response = await fetch('/api/generate-contextual-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseQuestion,
        previousAnswers: previousAnswers.slice(-3), // Only use last 3 answers
        detectedConcepts
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.enhancedQuestion || baseQuestion;
  } catch (error) {
    console.error('Error generating contextual question:', error);
    
    // Fall back to local enhancement
    return enhanceQuestionLocally(baseQuestion, previousAnswers, detectedConcepts);
  }
};

/**
 * Local fallback for enhancing questions with context
 */
const enhanceQuestionLocally = (
  baseQuestion: string,
  previousAnswers: { text: string; question: string }[],
  detectedConcepts: string[]
): string => {
  if (previousAnswers.length === 0) return baseQuestion;
  
  // Extract the most relevant previous answer
  const relevantAnswer = findMostRelevantAnswer(previousAnswers, baseQuestion);
  if (!relevantAnswer) return baseQuestion;
  
  // Extract key insight from the relevant answer
  const insight = extractKeyInsight(relevantAnswer.text);
  
  // Create reference to previous answer
  const references = [
    `Based on what you shared about ${insight}, ${baseQuestion.toLowerCase()}`,
    `You mentioned ${insight}. With that in mind, ${baseQuestion.toLowerCase()}`,
    `Given your experience with ${insight}, ${baseQuestion.toLowerCase()}`,
    `Considering your point about ${insight}, ${baseQuestion.toLowerCase()}`,
    `Building on your thoughts about ${insight}, ${baseQuestion.toLowerCase()}`
  ];
  
  // Select a reference style based on question type
  const isOpenQuestion = baseQuestion.trim().endsWith('?');
  const referenceIndex = isOpenQuestion ? Math.floor(Math.random() * references.length) : 0;
  
  return references[referenceIndex];
};

/**
 * Finds the most relevant previous answer to the current question
 */
const findMostRelevantAnswer = (
  previousAnswers: { text: string; question: string }[],
  currentQuestion: string
): { text: string; question: string } | null => {
  if (previousAnswers.length === 0) return null;
  
  // For simplicity, use the most recent substantive answer
  // In production, this would use semantic similarity
  const substantiveAnswers = previousAnswers.filter(
    answer => answer.text.split(' ').length > 5
  );
  
  if (substantiveAnswers.length === 0) {
    return previousAnswers[previousAnswers.length - 1];
  }
  
  return substantiveAnswers[substantiveAnswers.length - 1];
};

/**
 * Extracts a key insight from text
 */
const extractKeyInsight = (text: string): string => {
  // Clean up the text
  const cleanText = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
    
  // Split into words
  const words = cleanText.split(' ');
  
  // Define stopwords
  const stopwords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
    'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'shall', 'should',
    'can', 'could', 'may', 'might', 'must', 'to', 'of', 'in', 'on', 'at', 'by', 'for',
    'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after'
  ]);
  
  // Find sequences of meaningful words (non-stopwords)
  let currentPhrase = [];
  const phrases = [];
  
  for (const word of words) {
    if (word.length > 2 && !stopwords.has(word)) {
      currentPhrase.push(word);
    } else if (currentPhrase.length > 0) {
      if (currentPhrase.length >= 2) {
        phrases.push(currentPhrase.join(' '));
      }
      currentPhrase = [];
    }
  }
  
  if (currentPhrase.length >= 2) {
    phrases.push(currentPhrase.join(' '));
  }
  
  // If we found meaningful phrases, return the first one
  if (phrases.length > 0) {
    return phrases[0];
  }
  
  // As a fallback, find the longest word that's not a stopword
  const meaningfulWords = words.filter(word => word.length > 3 && !stopwords.has(word));
  
  if (meaningfulWords.length > 0) {
    // Sort by length and return the longest word
    meaningfulWords.sort((a, b) => b.length - a.length);
    return meaningfulWords[0];
  }
  
  // Ultimate fallback
  return "what you shared";
};

/**
 * Analyzes conversation to identify areas that need more exploration
 * 
 * @param achievementScores Current achievement scores
 * @param previousAnswers Previous conversation history
 * @returns Topics that would benefit from further discussion
 */
export const identifyExplorationTopics = (
  achievementScores: Record<string, number>,
  previousAnswers: { text: string; question: string }[]
): string[] => {
  // Find achievement areas with low scores
  const lowScoreAreas = Object.entries(achievementScores)
    .filter(([_, score]) => score < 40)
    .map(([id, _]) => id);
  
  if (lowScoreAreas.length === 0) return [];
  
  // Map achievement IDs to topic areas
  const topicMapping: Record<string, string> = {
    'product_basics': 'core product offering',
    'product_problems': 'problems your product solves',
    'product_features': 'key product features',
    'product_differentiation': 'unique selling points',
    'market_identification': 'target market segments',
    'buyer_persona': 'ideal customer profile',
    'pain_points': 'customer pain points',
    'buyer_motivations': 'customer purchase motivations',
    'sales_cycle': 'sales process stages',
    'decision_process': 'customer decision factors',
    'objection_handling': 'common sales objections',
    'competitive_landscape': 'competitive positioning'
  };
  
  // Convert achievement IDs to topic names
  return lowScoreAreas
    .map(id => topicMapping[id])
    .filter(Boolean);
};

/**
 * Generates a follow-up question based on the current conversation state
 * 
 * @param currentQuestion Current question being asked
 * @param userResponse User's response to the current question
 * @param achievementScores Current achievement scores
 * @returns A follow-up question or null if no follow-up is needed
 */
export const generateFollowUpQuestion = async (
  currentQuestion: string,
  userResponse: string,
  achievementScores: Record<string, number>
): Promise<string | null> => {
  // Don't generate follow-ups for very short responses
  if (userResponse.split(' ').length < 8) return null;
  
  try {
    // Try API-based generation first
    const response = await fetch('/api/generate-followup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentQuestion,
        userResponse,
        achievementScores
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.followUpQuestion;
  } catch (error) {
    console.error('Error generating follow-up question:', error);
    
    // Fall back to local generation
    return generateLocalFollowUp(currentQuestion, userResponse);
  }
};

/**
 * Local fallback for generating follow-up questions
 */
const generateLocalFollowUp = (
  currentQuestion: string,
  userResponse: string
): string | null => {
  // Extract an insight to follow up on
  const insight = extractKeyInsight(userResponse);
  
  // Generic follow-up templates
  const followUpTemplates = [
    `Could you tell me more about how ${insight} specifically benefits your customers?`,
    `How does ${insight} differentiate you from competitors in your market?`,
    `What challenges have you faced when communicating about ${insight} to prospects?`,
    `How do you typically measure the success or impact of ${insight}?`,
    `Could you give an example of how ${insight} has helped a specific customer?`,
    `How do customers typically respond when you discuss ${insight}?`
  ];
  
  // Select a random template
  return followUpTemplates[Math.floor(Math.random() * followUpTemplates.length)];
};

/**
 * Optimizes question selection based on user's conversation history
 * 
 * @param availableQuestions Array of available questions to choose from
 * @param previousAnswers Previous conversation history
 * @param achievementScores Current achievement scores
 * @returns The most appropriate next question
 */
export const selectOptimalQuestion = (
  availableQuestions: { id: string; text: string }[],
  previousAnswers: { text: string; question: string }[],
  achievementScores: Record<string, number>
): { id: string; text: string } => {
  if (availableQuestions.length === 0) {
    return { 
      id: 'fallback', 
      text: "Let's continue our conversation. What aspect of your sales process would you like to discuss next?" 
    };
  }
  
  // Get metrics for all questions
  const allMetrics = questionAnalytics.getAllMetrics();
  
  // Find low-scoring achievement areas
  const lowScoreAreas = Object.entries(achievementScores)
    .filter(([_, score]) => score < 40)
    .map(([id, _]) => id);
  
  // Prioritize questions related to low-scoring areas
  const prioritizedQuestions = availableQuestions
    .map(question => {
      // Calculate a priority score based on:
      // 1. Relation to low-scoring achievements
      // 2. Question effectiveness metrics
      // 3. Time since last asked about this topic
      
      // Start with base priority
      let priority = 1;
      
      // Boost priority for questions related to low-scoring areas
      const relatedToLowScore = lowScoreAreas.some(area => 
        question.id.includes(area) || question.text.toLowerCase().includes(area)
      );
      
      if (relatedToLowScore) {
        priority *= 2;
      }
      
      // Adjust based on question metrics if available
      const metrics = allMetrics.find(m => m.id === question.id);
      if (metrics) {
        // Boost for questions with high insight density
        priority *= (1 + metrics.insightDensity);
        
        // Penalize questions with low completion rate
        if (metrics.completionRate < 0.5) {
          priority *= 0.8;
        }
      }
      
      // Penalize recently asked questions
      const wasRecentlyAsked = previousAnswers
        .slice(-3)
        .some(a => a.question.includes(question.text));
      
      if (wasRecentlyAsked) {
        priority *= 0.5;
      }
      
      return { ...question, priority };
    })
    .sort((a, b) => b.priority - a.priority);
  
  // Return the highest priority question
  return {
    id: prioritizedQuestions[0].id,
    text: prioritizedQuestions[0].text
  };
};

/**
 * Determines if the conversation needs a change of direction
 * 
 * @param userResponses Recent user responses
 * @param currentTopic Current conversation topic
 * @returns Whether to change topics and suggested new topic
 */
export const shouldChangeTopic = (
  userResponses: string[],
  currentTopic: string
): { shouldChange: boolean; suggestedTopic: string | null } => {
  if (userResponses.length < 2) {
    return { shouldChange: false, suggestedTopic: null };
  }
  
  // Check for signs of disengagement
  const lastResponse = userResponses[userResponses.length - 1].toLowerCase();
  const secondLastResponse = userResponses[userResponses.length - 2].toLowerCase();
  
  // Signs of disengagement
  const shortResponses = lastResponse.split(' ').length < 5 && secondLastResponse.split(' ').length < 5;
  const hasDisengagementMarkers = /don't know|not sure|can we move on|next topic|something else/.test(lastResponse);
  
  if (shortResponses || hasDisengagementMarkers) {
    // Suggest a different topic
    const topics = [
      'product features',
      'customer needs',
      'sales approach',
      'objection handling',
      'competitive positioning'
    ].filter(topic => topic !== currentTopic);
    
    const suggestedTopic = topics[Math.floor(Math.random() * topics.length)];
    return { shouldChange: true, suggestedTopic };
  }
  
  return { shouldChange: false, suggestedTopic: null };
}; 
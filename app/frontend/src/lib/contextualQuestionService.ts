/**
 * Contextual Question Service
 * 
 * This module provides functionality to enhance questions with contextual information
 * from previous answers and user progress, making conversations more natural and connected.
 */

interface ContextualAnswer {
  text: string;
  question: string;
}

/**
 * Enhances a question with contextual information from previous answers
 * 
 * @param baseQuestion The original question to enhance
 * @param previousAnswers Array of previous Q&A pairs for context
 * @param stage Current conversation stage
 * @returns Promise that resolves to an enhanced question
 */
export const enhanceQuestionWithContext = async (
  baseQuestion: string,
  previousAnswers: ContextualAnswer[],
  stage: string
): Promise<string> => {
  try {
    // If we have no previous answers, return the base question
    if (!previousAnswers || previousAnswers.length === 0) {
      return baseQuestion;
    }

    // Call the API to generate a contextual question
    const response = await fetch('/api/generate-contextual-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseQuestion,
        previousAnswers: previousAnswers.slice(-3), // Use last 3 answers for context
        stage
      }),
    });

    if (!response.ok) {
      console.warn('Failed to generate contextual question:', response.status);
      return baseQuestion; // Fallback to base question
    }

    const data = await response.json();
    return data.enhancedQuestion || baseQuestion;
  } catch (error) {
    console.error('Error generating contextual question:', error);
    
    // Fallback: Add simple contextual references to the question
    return addSimpleContext(baseQuestion, previousAnswers);
  }
};

/**
 * Fallback method that adds simple contextual references to questions
 * without requiring an API call
 */
const addSimpleContext = (
  baseQuestion: string,
  previousAnswers: ContextualAnswer[]
): string => {
  // If we have no previous answers, return the base question
  if (!previousAnswers || previousAnswers.length === 0) {
    return baseQuestion;
  }

  // Get the most recent answer
  const latestAnswer = previousAnswers[previousAnswers.length - 1];
  
  // Simple enhancements for different question types
  if (baseQuestion.toLowerCase().includes('feature') || 
      baseQuestion.toLowerCase().includes('capability')) {
    return `Building on what you shared about ${extractTopic(latestAnswer.text)}, ${baseQuestion}`;
  }
  
  if (baseQuestion.toLowerCase().includes('customer') || 
      baseQuestion.toLowerCase().includes('market')) {
    return `Based on your previous description, ${baseQuestion}`;
  }
  
  if (baseQuestion.toLowerCase().includes('compete') || 
      baseQuestion.toLowerCase().includes('position')) {
    return `Given what you've told me about your offering, ${baseQuestion}`;
  }
  
  // Default enhancement
  return `Let's continue our discussion. ${baseQuestion}`;
};

/**
 * Extracts the main topic from a text snippet
 */
const extractTopic = (text: string): string => {
  // Simplified implementation - extract first noun phrase or use first few words
  const firstSentence = text.split('.')[0];
  if (firstSentence.length < 15) {
    return firstSentence;
  }
  return firstSentence.substring(0, 30).trim() + '...';
};

/**
 * Generates a contextual follow-up question based on a user's answer
 * 
 * @param answer User's most recent answer
 * @param question The question that prompted the answer
 * @param previousAnswers Array of previous Q&A pairs for context
 * @param stage Current conversation stage
 * @returns Promise that resolves to a follow-up question
 */
export const getContextualFollowUp = async (
  answer: string,
  question: string,
  previousAnswers: ContextualAnswer[],
  stage: string
): Promise<string> => {
  try {
    // Call the API to generate a follow-up question
    const response = await fetch('/api/generate-followup-question', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answer,
        question,
        previousAnswers: previousAnswers.slice(-3), // Use last 3 answers for context
        stage
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.followUpQuestion;
  } catch (error) {
    console.error('Error generating follow-up question:', error);
    
    // Fallback: Generate a simple follow-up
    return generateSimpleFollowUp(answer, question, stage);
  }
};

/**
 * Fallback method that generates simple follow-up questions
 * without requiring an API call
 */
const generateSimpleFollowUp = (
  answer: string,
  question: string,
  stage: string
): string => {
  // Predefined follow-ups by stage
  const followUps: Record<string, string[]> = {
    product: [
      "Could you tell me more about how your product delivers this value?",
      "How do customers typically use this feature?",
      "What feedback have you received about this aspect of your product?"
    ],
    market_and_buyer: [
      "How did you identify this target market?",
      "What specific needs do these customers have?",
      "How do you reach these customers effectively?"
    ],
    sales_context: [
      "How does your team typically handle this part of the sales process?",
      "What objections do you hear most frequently at this stage?",
      "How does this approach compare to your competitors?"
    ],
    complete: [
      "Would you like to explore this area further in our practice scenarios?",
      "How comfortable are you with this aspect of your sales approach?",
      "What aspect of this would you like to focus on improving?"
    ]
  };
  
  // Get relevant follow-ups for this stage
  const relevantFollowUps = followUps[stage] || followUps.complete;
  
  // Select a random follow-up
  const randomIndex = Math.floor(Math.random() * relevantFollowUps.length);
  return relevantFollowUps[randomIndex];
};

/**
 * Extracts key insights from previous conversation for context awareness
 * 
 * @param previousAnswers Array of previous answers with their questions
 * @returns Object with extracted insights by category
 */
export const extractConversationInsights = (
  previousAnswers: {text: string; question: string}[]
): Record<string, string> => {
  const insights: Record<string, string> = {
    product: '',
    market: '',
    process: '',
    challenges: ''
  };
  
  // Simple keyword-based categorization
  const categoryKeywords: Record<string, string[]> = {
    product: ['product', 'service', 'offer', 'solution', 'feature', 'capability', 'unique'],
    market: ['customer', 'market', 'buyer', 'audience', 'segment', 'target', 'industry'],
    process: ['process', 'sales', 'cycle', 'approach', 'method', 'timeline', 'steps'],
    challenges: ['challenge', 'objection', 'concern', 'competitor', 'problem', 'issue', 'difficult']
  };
  
  for (const answer of previousAnswers) {
    const text = answer.text.toLowerCase();
    
    // Check each category
    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (text.includes(keyword) && text.length > insights[category].length) {
          insights[category] = answer.text;
          break;
        }
      }
    }
  }
  
  return insights;
}; 
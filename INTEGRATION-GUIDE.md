# Semantic and Contextual Enhancement Integration Guide

This guide explains how to integrate the new semantic understanding and contextual questioning features into the existing AISummaryCard component.

## Features Implemented

1. **Semantic Understanding**: Enhanced ability to understand user responses by analyzing their meaning, not just keywords.
2. **Contextual Questions**: Questions that reference previous answers to create a more natural conversation flow.
3. **Intelligent Follow-ups**: AI-generated follow-up questions that explore interesting details in user responses.

## Integration Points

### 1. Semantic Achievement Evaluation

To use the enhanced semantic achievement evaluation:

```tsx
// In AISummaryCard.tsx

// Import the evaluator
import { evaluateAchievementHybrid } from '../../lib/achievementEvaluator';

// Replace the existing achievement evaluation function with the async version
const evaluateAchievements = async (text: string, achievementId: string): Promise<number> => {
  try {
    // Use the new hybrid evaluation that combines keywords and semantics
    return await evaluateAchievementHybrid(text, achievementId);
  } catch (error) {
    console.error(`Error evaluating achievement ${achievementId}:`, error);
    // Fallback to 0 if there's an error
    return 0;
  }
};
```

### 2. Using Thinking Indicators for Better UX

To show a thinking indicator while processing responses:

```tsx
// In AISummaryCard.tsx

// Import the TypingDots component
import TypingDots from '../TypingDots';

// Add a new state variable for thinking indicator
const [isThinking, setIsThinking] = useState(false);

// In the message rendering section
{messages.map(message => (
  <div key={message.id} className={`message ${message.isUser ? 'user' : 'ai'}`}>
    {message.isThinking ? (
      <div className="ai-message thinking">
        <TypingDots />
      </div>
    ) : (
      <MessageFormatter content={message.content} isUserMessage={message.isUser} />
    )}
  </div>
))}
```

### 3. Enhancing Questions with Context

To enhance questions with context from previous responses:

```tsx
// In the part where you ask the next question
import { enhanceQuestionWithContext } from '../../lib/contextualQuestionService';

// Create a function to ask an enhanced question
const askEnhancedQuestion = async (baseQuestion: string) => {
  setIsThinking(true);
  
  // Add a thinking message
  const thinkingMessageId = Date.now().toString();
  const thinkingMessage = {
    id: thinkingMessageId,
    content: '',
    isUser: false,
    timestamp: new Date(),
    isThinking: true
  };
  
  setMessages(prev => [...prev, thinkingMessage]);
  
  try {
    // Get previous answers for context
    const previousAnswers = messages
      .filter(m => m.isUser)
      .slice(-3)
      .map(m => ({ 
        text: m.content, 
        question: messages
          .filter(q => !q.isUser)
          .find(q => 
            q.timestamp < m.timestamp && 
            !messages.some(msg => 
              !msg.isUser && 
              msg.timestamp > q.timestamp && 
              msg.timestamp < m.timestamp
            )
          )?.content || ''
      }));
    
    // Enhance the question with context
    const enhancedQuestion = await enhanceQuestionWithContext(
      baseQuestion,
      previousAnswers,
      onboardingData.stage
    );
    
    // Replace thinking message with the enhanced question
    setMessages(prev => 
      prev.map(m => 
        m.id === thinkingMessageId 
          ? {
              ...m, 
              content: enhancedQuestion,
              isThinking: false
            }
          : m
      )
    );
  } catch (error) {
    console.error('Error enhancing question:', error);
    
    // Replace thinking message with the base question
    setMessages(prev => 
      prev.map(m => 
        m.id === thinkingMessageId 
          ? {
              ...m, 
              content: baseQuestion,
              isThinking: false
            }
          : m
      )
    );
  } finally {
    setIsThinking(false);
  }
};
```

### 4. Generating Follow-up Questions

To generate contextual follow-up questions based on user responses:

```tsx
// In the handleSendMessage function after receiving a user message
import { getContextualFollowUp } from '../../lib/contextualQuestionService';

// After processing user response
const generateFollowUp = async (userResponse: string, currentQuestion: string) => {
  // Only generate follow-ups if we're not already showing a continue button
  if (showContinueButton) return;
  
  try {
    // Get previous answers for context
    const previousAnswers = messages
      .filter(m => m.isUser)
      .slice(-3)
      .map(m => ({ 
        text: m.content, 
        question: getQuestionForAnswer(m) 
      }));
    
    // Get a follow-up question
    const followUpQuestion = await getContextualFollowUp(
      userResponse,
      currentQuestion,
      previousAnswers,
      onboardingData.stage
    );
    
    if (followUpQuestion) {
      // Add a short delay before asking follow-up
      setTimeout(() => {
        addAIMessage(followUpQuestion);
      }, 1000);
    }
  } catch (error) {
    console.error('Error generating follow-up:', error);
  }
};

// Helper to find the question that led to an answer
const getQuestionForAnswer = (answerMessage: Message): string => {
  const answerTime = answerMessage.timestamp.getTime();
  
  // Find the most recent AI message before this answer
  const question = messages
    .filter(m => !m.isUser && m.timestamp.getTime() < answerTime)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    
  return question?.content || '';
};
```

## Integration Flow

1. When the user enters the onboarding process:
   - Use semantic achievement evaluation for better understanding
   - Show thinking indicators for a more natural conversation feel
   
2. When asking questions:
   - Enhance base questions with context from previous answers
   - Use animated text for a more engaging experience
   
3. After user responses:
   - Analyze achievements using semantic understanding
   - Generate follow-up questions for deeper insights
   - Show progress in the achievement panel

## Additional Notes

- The semantic evaluation happens asynchronously, so all functions that use it need to be async
- The file structure supports fallbacks if API calls fail
- The typing animation provides a more natural conversational feel

By integrating these features, the onboarding process will feel more like a natural conversation with a coach who listens, understands, and asks insightful questions that build on what the user has shared. 
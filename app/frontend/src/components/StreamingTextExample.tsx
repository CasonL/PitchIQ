import React, { useState } from 'react';
import AnimatedText from '../lib/AnimatedText';

const exampleMarkdown = `
# Sales Training AI

## Key Benefits

This AI-powered solution helps your sales team learn and improve by:

1. Simulating real customer conversations
2. Providing instant feedback on responses
3. Analyzing patterns in objection handling

### How it works

The system uses natural language processing to understand customer queries and salesperson responses. It then evaluates:

* Tone and empathy
* Product knowledge accuracy
* Solution fit for customer needs

> "This tool has increased our team's close rate by 27% in just three months by improving how they handle common objections." — Sarah, Sales Director

Let's get started with your training session!
`;

const StreamingTextExample: React.FC = () => {
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [resetKey, setResetKey] = useState<number>(0);
  const [animationStyle, setAnimationStyle] = useState<'words' | 'sentences'>('words');
  
  const handleReset = () => {
    setResetKey(prev => prev + 1);
    setIsComplete(false);
  };
  
  const handleComplete = () => {
    setIsComplete(true);
  };
  
  const toggleAnimationStyle = () => {
    setAnimationStyle(prev => prev === 'words' ? 'sentences' : 'words');
    handleReset();
  };
  
  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md">
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Text Animation Demo</h2>
        
        <div className="flex justify-between mb-4">
          <button
            onClick={toggleAnimationStyle}
            className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            {animationStyle === 'words' ? 'Switch to Sentences' : 'Switch to Words'}
          </button>
          
          <button
            onClick={handleReset}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
          >
            Reset
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          This demo shows a natural reading animation that {animationStyle === 'words' 
            ? 'starts with individual words, then accelerates to larger chunks' 
            : 'reveals content sentence by sentence'}
        </p>
      </div>
      
      <div className="border rounded-lg p-4 bg-gray-50">
        <AnimatedText
          content={exampleMarkdown}
          onComplete={handleComplete}
          responseKey={`${animationStyle}-${resetKey}`}
          animationStyle={animationStyle}
          baseThrottleMs={100}
          initialWordCount={6}
        />
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        {isComplete ? 
          'Animation complete!' : 
          'Animating...'
        }
      </div>
    </div>
  );
};

export default StreamingTextExample; 
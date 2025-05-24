import React from 'react';
import { cn } from "@/lib/utils";

// Component props
interface ConversationModeSelectorProps {
  mode: 'guided' | 'direct';
  onChange: (mode: 'guided' | 'direct') => void;
  className?: string;
}

/**
 * ConversationModeSelector component
 * 
 * This component allows users to switch between guided and direct conversation modes.
 * - Guided mode: The AI coach guides the conversation with structured questions
 * - Direct mode: Users can ask anything without following a structured flow
 */
const ConversationModeSelector: React.FC<ConversationModeSelectorProps> = ({
  mode,
  onChange,
  className = ''
}) => {
  return (
    <div className={cn("bg-muted/20 rounded-lg p-3", className)}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-sm">
          <span className="font-medium">Conversation Mode:</span>
          <span className="text-muted-foreground ml-2">Choose how the AI coach interacts with you</span>
        </div>
        
        <div className="flex rounded-lg overflow-hidden border">
          <button
            onClick={() => onChange('guided')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'guided' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted/50 hover:bg-muted/70'
            }`}
          >
            Guide Me
          </button>
          <button
            onClick={() => onChange('direct')}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'direct' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted/50 hover:bg-muted/70'
            }`}
          >
            Direct Mode
          </button>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-muted-foreground">
        {mode === 'guided' 
          ? 'The AI coach will guide you through topics to help build your sales skills step-by-step.'
          : 'The AI coach will respond directly to your questions without structuring the conversation.'}
      </div>
    </div>
  );
};

/**
 * Returns a context-aware encouragement message based on the current stage
 */
export const getEncouragementForStage = (stage: string): string => {
  const encouragements = {
    product: [
      "I'd love to hear more details about your solution.",
      "What else makes your product or service stand out?",
      "Could you elaborate on how customers use your product?"
    ],
    market_and_buyer: [
      "Can you tell me more about your ideal customers?",
      "What specific needs drive people to seek your solution?",
      "How do you identify promising prospects?"
    ],
    sales_context: [
      "What else should I know about your sales environment?",
      "How do competitors typically position against you?",
      "What other objections do you commonly face?"
    ],
    complete: [
      "Is there anything specific about your business you'd like to explore?",
      "What aspect of your sales process would you like to improve most?",
      "What sales challenges are you facing right now?"
    ]
  };
  
  // Get relevant encouragements based on stage
  const relevantEncouragements = encouragements[stage as keyof typeof encouragements] || encouragements.complete;
  
  // Return a random encouragement
  return relevantEncouragements[Math.floor(Math.random() * relevantEncouragements.length)];
};

export default ConversationModeSelector; 
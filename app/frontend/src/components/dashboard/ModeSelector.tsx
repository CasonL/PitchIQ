import React from 'react';

interface ModeSelectorProps {
  conversationMode: 'guided' | 'direct';
  setConversationMode: (mode: 'guided' | 'direct') => void;
}

/**
 * ModeSelector Component
 * 
 * Allows users to switch between guided and direct conversation modes.
 * 
 * @param conversationMode Current mode ('guided' or 'direct')
 * @param setConversationMode Function to change the conversation mode
 */
const ModeSelector: React.FC<ModeSelectorProps> = ({ 
  conversationMode, 
  setConversationMode 
}) => {
  return (
    <div className="flex flex-col space-y-2 p-3 bg-white border rounded-lg shadow-sm">
      <h3 className="font-medium text-sm text-gray-800">Conversation Style</h3>
      
      <div className="flex space-x-2 text-xs">
        <button
          onClick={() => setConversationMode('guided')}
          className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors ${
            conversationMode === 'guided'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5"
            >
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
            Guided
          </div>
          <div className="mt-1 text-xs opacity-80">
            {conversationMode === 'guided' ? "Active" : "AI-led conversation"}
          </div>
        </button>
        
        <button
          onClick={() => setConversationMode('direct')}
          className={`flex-1 py-2 px-3 rounded-md font-medium transition-colors ${
            conversationMode === 'direct'
              ? 'bg-primary text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <div className="flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1.5"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Direct
          </div>
          <div className="mt-1 text-xs opacity-80">
            {conversationMode === 'direct' ? "Active" : "You lead the conversation"}
          </div>
        </button>
      </div>
      
      <p className="text-xs text-gray-500 mt-1">
        {conversationMode === 'guided' 
          ? "The AI coach will guide you through a structured conversation to build your knowledge profile."
          : "Ask questions directly and lead the conversation in any direction you want."}
      </p>
    </div>
  );
};

export default ModeSelector; 
/**
 * LiveConversation.tsx
 * Real-time conversation display during Marcus calls
 * Features clickable messages with AI-generated feedback
 */

import React, { useState, useEffect, useRef } from 'react';
import { MessageFeedbackModal } from './MessageFeedbackModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface LiveConversationProps {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  scenario?: any;
}

export const LiveConversation: React.FC<LiveConversationProps> = ({
  messages,
  scenario
}) => {
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showPulse, setShowPulse] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check localStorage for pulse dismissal
  useEffect(() => {
    const hasClickedMessage = localStorage.getItem('pitchiq_message_clicked');
    if (hasClickedMessage === 'true') {
      setShowPulse(false);
    }
  }, []);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleMessageClick = (message: { role: 'user' | 'assistant'; content: string }, index: number) => {
    // First click removes pulse forever
    if (showPulse) {
      setShowPulse(false);
      localStorage.setItem('pitchiq_message_clicked', 'true');
    }
    
    // Open feedback modal
    setSelectedMessage({
      ...message,
      timestamp: Date.now() - (messages.length - index) * 10000 // Approximate timestamp
    });
  };
  
  if (messages.length === 0) {
    return null;
  }
  
  return (
    <>
      <div className="w-full max-w-2xl mx-auto mt-6 mb-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {messages.map((message, index) => {
              const isUser = message.role === 'user';
              
              return (
                <div
                  key={index}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <button
                    onClick={() => handleMessageClick(message, index)}
                    className={`
                      max-w-[80%] px-4 py-3 rounded-2xl text-left
                      transition-all duration-200 hover:scale-[1.02]
                      ${isUser 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300'
                      }
                      ${showPulse ? 'animate-pulse-subtle' : ''}
                    `}
                  >
                    <p className="text-sm leading-relaxed">
                      {message.content}
                    </p>
                  </button>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {showPulse && messages.length > 0 && (
          <div className="text-center mt-3">
            <p className="text-xs text-gray-500 animate-pulse">
              💡 Click any message for detailed feedback
            </p>
          </div>
        )}
      </div>
      
      {selectedMessage && (
        <MessageFeedbackModal
          message={selectedMessage}
          scenario={scenario}
          conversationHistory={messages}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </>
  );
};

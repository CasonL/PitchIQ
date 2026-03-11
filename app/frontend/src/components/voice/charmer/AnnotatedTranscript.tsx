/**
 * AnnotatedTranscript.tsx
 * Shows conversation transcript with inline coaching annotations
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { ConversationExchange } from './ConversationTranscript';
import { MessageFeedbackModal } from './MessageFeedbackModal';

interface CoachingAnnotation {
  type: 'error' | 'warning' | 'success' | 'insight';
  message: string;
  suggestion?: string;
}

interface AnnotatedExchangeProps {
  exchange: ConversationExchange;
  nextExchange?: ConversationExchange;
  annotation?: CoachingAnnotation;
  resistanceChange?: number;
  showPulse: boolean;
  onMessageClick: (exchange: ConversationExchange) => void;
}

const AnnotatedExchange: React.FC<AnnotatedExchangeProps> = ({
  exchange,
  nextExchange,
  annotation,
  resistanceChange,
  showPulse,
  onMessageClick
}) => {
  const [showSuggestion, setShowSuggestion] = useState(false);
  
  const formatTime = (timestamp: number): string => {
    const mins = Math.floor(timestamp / 60);
    const secs = Math.floor(timestamp % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getAnnotationIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'success': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'insight': return <TrendingUp className="w-4 h-4 text-blue-400" />;
      default: return null;
    }
  };
  
  const getAnnotationColor = (type: string) => {
    switch (type) {
      case 'error': return 'border-red-500/30 bg-red-500/5';
      case 'warning': return 'border-yellow-500/30 bg-yellow-500/5';
      case 'success': return 'border-green-500/30 bg-green-500/5';
      case 'insight': return 'border-blue-500/30 bg-blue-500/5';
      default: return 'border-white/10 bg-white/5';
    }
  };
  
  const isUser = exchange.speaker === 'user';
  
  return (
    <div className="mb-4">
      {/* Exchange */}
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
          <div className="flex items-center gap-2 px-2">
            <span className="text-xs text-gray-500">
              {formatTime(exchange.timestamp)}
            </span>
            <span className="text-xs text-gray-400">
              {isUser ? 'You' : 'Marcus'}
            </span>
            {resistanceChange !== undefined && resistanceChange !== 0 && (
              <span className={`text-xs flex items-center gap-1 ${
                resistanceChange > 0 ? 'text-red-400' : 'text-green-400'
              }`}>
                {resistanceChange > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    +{resistanceChange}
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    {resistanceChange}
                  </>
                )}
              </span>
            )}
          </div>
          
          <button
            onClick={() => onMessageClick(exchange)}
            className={`px-4 py-3 rounded-2xl text-left transition-all duration-200 hover:scale-[1.02] ${
              isUser 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-white/10 text-gray-200 border border-white/10 hover:bg-white/15'
            } ${
              showPulse ? 'animate-pulse-subtle' : ''
            }`}
          >
            <p className="text-sm leading-relaxed">
              {exchange.text}
            </p>
          </button>
        </div>
      </div>
      
      {/* Annotation */}
      {annotation && (
        <div className={`mt-2 mx-4 border rounded-xl p-4 ${getAnnotationColor(annotation.type)}`}>
          <div className="flex items-start gap-3">
            {getAnnotationIcon(annotation.type)}
            <div className="flex-1">
              <p className="text-sm text-gray-300">
                {annotation.message}
              </p>
              
              {annotation.suggestion && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowSuggestion(!showSuggestion)}
                    className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                  >
                    {showSuggestion ? (
                      <>
                        <ChevronUp className="w-3 h-3" />
                        Hide suggestion
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3" />
                        Show what to say instead
                      </>
                    )}
                  </button>
                  
                  {showSuggestion && (
                    <div className="mt-3 p-3 bg-black/30 rounded-lg">
                      <p className="text-xs text-gray-300 italic">
                        💡 "{annotation.suggestion}"
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface AnnotatedTranscriptProps {
  exchanges: ConversationExchange[];
  scenario?: any;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export const AnnotatedTranscript: React.FC<AnnotatedTranscriptProps> = ({ exchanges, scenario, conversationHistory }) => {
  const [selectedMessage, setSelectedMessage] = useState<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  } | null>(null);
  const [showPulse, setShowPulse] = useState(true);
  
  // Check localStorage for pulse dismissal
  useEffect(() => {
    const hasClickedMessage = localStorage.getItem('pitchiq_message_clicked');
    if (hasClickedMessage === 'true') {
      setShowPulse(false);
    }
  }, []);
  
  const handleMessageClick = (exchange: ConversationExchange) => {
    // First click removes pulse forever
    if (showPulse) {
      setShowPulse(false);
      localStorage.setItem('pitchiq_message_clicked', 'true');
    }
    
    // Open feedback modal
    setSelectedMessage({
      role: exchange.speaker === 'user' ? 'user' : 'assistant',
      content: exchange.text,
      timestamp: exchange.timestamp * 1000
    });
  };
  // Generate annotations based on exchange patterns
  const generateAnnotations = (): Map<string, CoachingAnnotation> => {
    const annotations = new Map<string, CoachingAnnotation>();
    
    for (let i = 0; i < exchanges.length; i++) {
      const exchange = exchanges[i];
      const nextExchange = exchanges[i + 1];
      
      if (exchange.speaker === 'user' && nextExchange?.speaker === 'marcus') {
        const userText = exchange.text.toLowerCase();
        const marcusText = nextExchange.text.toLowerCase();
        
        // Detect pitch-first behavior
        if (userText.includes('we noticed') || userText.includes('we help') || userText.includes('our service')) {
          if (i < 4) {
            annotations.set(exchange.id, {
              type: 'error',
              message: 'Pitched before building rapport - Marcus went defensive',
              suggestion: "Hey Marcus, just noticed your site. Quick question - what's your biggest challenge with getting found online right now?"
            });
          }
        }
        
        // Detect resistance spike
        if (nextExchange.resistanceLevel && exchange.resistanceLevel) {
          const resistanceChange = nextExchange.resistanceLevel - exchange.resistanceLevel;
          if (resistanceChange >= 2) {
            annotations.set(exchange.id, {
              type: 'error',
              message: `Marcus resistance: ${exchange.resistanceLevel} → ${nextExchange.resistanceLevel} (triggered defensiveness)`,
              suggestion: 'Try asking about HIS problems first: "What made you choose your current web guy?"'
            });
          }
        }
        
        // Detect brush-off responses
        if (marcusText.includes("i've got a guy") || marcusText.includes("we're managing")) {
          if (!userText.includes('how') && !userText.includes('what') && !userText.includes('?')) {
            annotations.set(exchange.id, {
              type: 'warning',
              message: 'MOMENT: Classic brush-off detected',
              suggestion: '"How\'s that working out so far?" or "What made you go with them originally?"'
            });
          }
        }
        
        // Detect close-ended questions
        if (userText.includes('how are you') && !userText.includes('how are you doing with')) {
          if (i > 0) {
            annotations.set(exchange.id, {
              type: 'warning',
              message: 'Close-ended question - then you immediately pitched',
              suggestion: 'Build real rapport: "How\'s business been lately?" then LISTEN'
            });
          }
        }
        
        // Detect good open-ended questions
        if ((userText.includes('what') || userText.includes('how')) && 
            (userText.includes('help you') || userText.includes('challenge') || userText.includes('working'))) {
          annotations.set(exchange.id, {
            type: 'success',
            message: 'Good discovery question - focusing on his problems',
          });
        }
        
        // Detect ignored objections
        if (marcusText.includes('not interested') || marcusText.includes('not looking')) {
          const nextUserExchange = exchanges[i + 2];
          if (nextUserExchange?.speaker === 'user') {
            const nextUserText = nextUserExchange.text.toLowerCase();
            if (nextUserText.includes('we') || nextUserText.includes('our service')) {
              annotations.set(nextUserExchange.id, {
                type: 'error',
                message: 'Ignored objection and kept pitching - you lost him here',
                suggestion: 'Acknowledge it: "I get it, you\'re busy. Can I ask - what would need to change for this to be worth 5 minutes?"'
              });
            }
          }
        }
      }
    }
    
    return annotations;
  };
  
  const annotations = generateAnnotations();
  
  // Calculate resistance changes
  const getResistanceChange = (index: number): number | undefined => {
    if (index === 0) return undefined;
    
    const current = exchanges[index];
    const previous = exchanges[index - 1];
    
    if (current.resistanceLevel !== undefined && previous.resistanceLevel !== undefined) {
      return current.resistanceLevel - previous.resistanceLevel;
    }
    
    return undefined;
  };
  
  if (exchanges.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
        <p className="text-gray-400 text-center">No conversation data available</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
          <span>📝</span>
          Conversation Breakdown
        </h3>
        
        {showPulse && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <p className="text-sm text-blue-300 text-center animate-pulse">
              💡 Click any message for detailed AI feedback
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          {exchanges.map((exchange, index) => (
            <AnnotatedExchange
              key={exchange.id}
              exchange={exchange}
              nextExchange={exchanges[index + 1]}
              annotation={annotations.get(exchange.id)}
              resistanceChange={getResistanceChange(index)}
              showPulse={showPulse}
              onMessageClick={handleMessageClick}
            />
          ))}
        </div>
      </div>
      
      {selectedMessage && (
        <MessageFeedbackModal
          message={selectedMessage}
          scenario={scenario}
          conversationHistory={conversationHistory || exchanges.map(ex => ({
            role: ex.speaker === 'user' ? 'user' : 'assistant',
            content: ex.text
          }))}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </>
  );
};

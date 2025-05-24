/**
 * AI Card System Component
 * 
 * This component manages the collection of AI insight cards that form the core
 * of the intelligent dashboard.
 */

import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import './AICardSystem.css';

// ChatInterface component for interactive card state
const ChatInterface = ({ messages, onSendMessage }) => {
  const [message, setMessage] = useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };
  
  return (
    <div className="chat-interface">
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Type your question..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button type="submit" className="send-button">
          <span className="send-icon">➤</span>
        </button>
      </form>
    </div>
  );
};

// SkillsCard Component with state transitions
const SkillsCard = ({ data, isActive, onActivate, onClose }) => {
  const [expanded, setExpanded] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Determine card state
  const cardState = !isActive ? 'dormant' : 
                   (expanded ? 'interactive' : 'active');
  
  const handleCardClick = () => {
    if (!isActive) {
      onActivate();
    } else if (!expanded) {
      setExpanded(true);
      // Initialize chat with context
      setChatHistory([{
        role: 'assistant',
        content: data?.detailedExplanation || data?.explanation || 'How can I help you improve your skills?'
      }]);
    }
  };
  
  const handleSendMessage = async (message) => {
    // Add user message to chat
    setChatHistory([...chatHistory, { role: 'user', content: message }]);
    
    setLoading(true);
    try {
      // Get AI coaching response
      const response = await api.sendCoachMessage({
        insightType: 'skills',
        insightId: data?.id,
        message,
        history: chatHistory
      });
      
      // Add AI response to chat
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: response.content,
        additionalData: response.additionalData
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I had trouble generating a response. Please try again."
      }]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setExpanded(false);
    setChatHistory([]);
    onClose();
  };
  
  // Different rendering based on card state
  if (cardState === 'dormant') {
    return (
      <div className="insight-card dormant" onClick={handleCardClick}>
        <div className="card-icon">🎯</div>
        <div className="card-title">Skills Focus</div>
      </div>
    );
  }
  
  if (cardState === 'active') {
    return (
      <div className="insight-card active" onClick={handleCardClick}>
        <div className="card-header">
          <div className="card-icon">🎯</div>
          <div className="card-title">Skills Focus</div>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>
        <div className="card-content">
          <p className="insight-text">{data?.explanation || "Loading insights..."}</p>
          <p className="action-prompt">Tap to explore this insight →</p>
        </div>
      </div>
    );
  }
  
  if (cardState === 'interactive') {
    return (
      <div className="insight-card interactive">
        <div className="card-header">
          <div className="card-icon">🎯</div>
          <div className="card-title">Skills Focus: {data?.skillArea || 'Training'}</div>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>
        <div className="card-content expanded">
          <ChatInterface 
            messages={chatHistory}
            onSendMessage={handleSendMessage}
          />
          <div className="action-buttons">
            {data?.actions?.map(action => (
              <button 
                key={action.id}
                className="action-button"
                onClick={() => {
                  // Add action-specific behavior here
                  handleSendMessage(`Show me ${action.label.toLowerCase()}`);
                }}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return null; // Fallback
};

// CallInsightCard Component with state transitions
const CallInsightCard = ({ data, isActive, onActivate, onClose }) => {
  const [expanded, setExpanded] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  
  // Determine card state
  const cardState = !isActive ? 'dormant' : 
                   (expanded ? 'interactive' : 'active');
  
  const handleCardClick = () => {
    if (!isActive) {
      onActivate();
    } else if (!expanded) {
      setExpanded(true);
      // Initialize chat with context
      setChatHistory([{
        role: 'assistant',
        content: data?.detailedExplanation || data?.explanation || 'Let\'s discuss your recent calls.'
      }]);
    }
  };
  
  const handleSendMessage = async (message) => {
    // Add user message to chat
    setChatHistory([...chatHistory, { role: 'user', content: message }]);
    
    try {
      // Get AI coaching response
      const response = await api.sendCoachMessage({
        insightType: 'calls',
        insightId: data?.id,
        message,
        history: chatHistory
      });
      
      // Add AI response to chat
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: response.content,
        additionalData: response.additionalData
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I had trouble generating a response. Please try again."
      }]);
    }
  };
  
  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setExpanded(false);
    setChatHistory([]);
    onClose();
  };
  
  // Different rendering based on card state
  if (cardState === 'dormant') {
    return (
      <div className="insight-card dormant" onClick={handleCardClick}>
        <div className="card-icon">🔍</div>
        <div className="card-title">Call Insight</div>
      </div>
    );
  }
  
  if (cardState === 'active') {
    return (
      <div className="insight-card active" onClick={handleCardClick}>
        <div className="card-header">
          <div className="card-icon">🔍</div>
          <div className="card-title">Call Insight</div>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>
        <div className="card-content">
          <p className="insight-text">{data?.explanation || "Loading insights..."}</p>
          <p className="action-prompt">Tap to explore this insight →</p>
        </div>
      </div>
    );
  }
  
  if (cardState === 'interactive') {
    return (
      <div className="insight-card interactive">
        <div className="card-header">
          <div className="card-icon">🔍</div>
          <div className="card-title">Call Insight: Call #{data?.callId || 'Recent'}</div>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>
        <div className="card-content expanded">
          <ChatInterface 
            messages={chatHistory}
            onSendMessage={handleSendMessage}
          />
          {data?.callSegment && (
            <div className="call-segment">
              <h4>Call Example</h4>
              <div className="segment-time">
                {data.callSegment.start} - {data.callSegment.end}
              </div>
              <pre className="segment-transcript">{data.callSegment.transcript}</pre>
            </div>
          )}
          <div className="action-buttons">
            {data?.actions?.map(action => (
              <button 
                key={action.id}
                className="action-button"
                onClick={() => {
                  // Add action-specific behavior here
                  handleSendMessage(`Show me ${action.label.toLowerCase()}`);
                }}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return null; // Fallback
};

// ChallengeCard Component with state transitions
const ChallengeCard = ({ data, isActive, onActivate, onClose }) => {
  const [expanded, setExpanded] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  
  // Determine card state
  const cardState = !isActive ? 'dormant' : 
                   (expanded ? 'interactive' : 'active');
  
  const handleCardClick = () => {
    if (!isActive) {
      onActivate();
    } else if (!expanded) {
      setExpanded(true);
      // Initialize chat with context
      setChatHistory([{
        role: 'assistant',
        content: data?.detailedExplanation || data?.explanation || 'Ready to tackle your next challenge?'
      }]);
    }
  };
  
  const handleSendMessage = async (message) => {
    // Add user message to chat
    setChatHistory([...chatHistory, { role: 'user', content: message }]);
    
    try {
      // Get AI coaching response
      const response = await api.sendCoachMessage({
        insightType: 'challenges',
        insightId: data?.id,
        message,
        history: chatHistory
      });
      
      // Add AI response to chat
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: response.content,
        additionalData: response.additionalData
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: "I'm sorry, I had trouble generating a response. Please try again."
      }]);
    }
  };
  
  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setExpanded(false);
    setChatHistory([]);
    onClose();
  };
  
  // Different rendering based on card state
  if (cardState === 'dormant') {
    return (
      <div className="insight-card dormant" onClick={handleCardClick}>
        <div className="card-icon">🚀</div>
        <div className="card-title">Next Challenge</div>
      </div>
    );
  }
  
  if (cardState === 'active') {
    return (
      <div className="insight-card active" onClick={handleCardClick}>
        <div className="card-header">
          <div className="card-icon">🚀</div>
          <div className="card-title">Next Challenge</div>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>
        <div className="card-content">
          <p className="insight-text">{data?.explanation || "Loading challenges..."}</p>
          <div className="challenge-meta">
            {data?.difficulty && <span className="challenge-difficulty">Level: {data.difficulty}</span>}
            {data?.estimatedTime && <span className="challenge-time">Time: {data.estimatedTime}</span>}
          </div>
          <p className="action-prompt">Tap to accept this challenge →</p>
        </div>
      </div>
    );
  }
  
  if (cardState === 'interactive') {
    return (
      <div className="insight-card interactive">
        <div className="card-header">
          <div className="card-icon">🚀</div>
          <div className="card-title">Challenge: {data?.challengeType || 'Practice'}</div>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>
        <div className="card-content expanded">
          <ChatInterface 
            messages={chatHistory}
            onSendMessage={handleSendMessage}
          />
          <div className="action-buttons">
            {data?.actions?.map(action => (
              <button 
                key={action.id}
                className="action-button"
                onClick={() => {
                  // Add action-specific behavior here
                  handleSendMessage(`I want to ${action.label.toLowerCase()}`);
                }}
              >
                {action.icon} {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return null; // Fallback
};

export const AICardSystem = () => {
  // State for insights data
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState(null);
  const [error, setError] = useState(null);
  
  // Fetch insights from API
  useEffect(() => {
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        // Use the actual API endpoint
        const data = await api.generateInsights();
        setInsights(data);
        
        // Auto-activate highest priority card if none is active
        if (!activeCard && data && data.priorityCard) {
          setActiveCard(data.priorityCard);
        }
      } catch (error) {
        console.error("Failed to fetch insights:", error);
        setError("Failed to load insights. Please try refreshing the page.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
    
    // Refresh insights every 5 minutes or when sessions change
    const interval = setInterval(fetchInsights, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [activeCard]);
  
  // Loading state
  if (loading && !insights) {
    return (
      <div className="ai-card-system">
        <h2 className="section-title">AI Coach Insights</h2>
        <div className="cards-container skeleton">
          <div className="insight-card-skeleton"></div>
          <div className="insight-card-skeleton"></div>
          <div className="insight-card-skeleton"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error && !insights) {
    return (
      <div className="ai-card-system">
        <h2 className="section-title">AI Coach Insights</h2>
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button 
            className="retry-button"
            onClick={() => {
              setLoading(true);
              window.location.reload();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="ai-card-system">
      <h2 className="section-title">AI Coach Insights</h2>
      <div className="cards-container">
        <SkillsCard 
          data={insights?.skills}
          isActive={activeCard === 'skills'}
          onActivate={() => setActiveCard('skills')}
          onClose={() => setActiveCard(null)}
        />
        <CallInsightCard 
          data={insights?.calls}
          isActive={activeCard === 'calls'}
          onActivate={() => setActiveCard('calls')}
          onClose={() => setActiveCard(null)}
        />
        <ChallengeCard 
          data={insights?.challenges}
          isActive={activeCard === 'challenges'}
          onActivate={() => setActiveCard('challenges')}
          onClose={() => setActiveCard(null)}
        />
      </div>
    </div>
  );
}; 
import React, { useState } from 'react';
import axios from 'axios';
import './AICardSystem.css';

const AICardSystem = ({ insights }) => {
  const [activeCard, setActiveCard] = useState(insights?.priorityCard || null);
  const [interactiveCard, setInteractiveCard] = useState(null);
  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!insights) {
    return (
      <div className="ai-card-system">
        <div className="card skeleton-card">
          <div className="card-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-text"></div>
          </div>
        </div>
        <div className="card skeleton-card">
          <div className="card-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-text"></div>
          </div>
        </div>
        <div className="card skeleton-card">
          <div className="card-content">
            <div className="skeleton-title"></div>
            <div className="skeleton-text"></div>
            <div className="skeleton-text"></div>
          </div>
        </div>
      </div>
    );
  }

  const cardTypes = {
    skills: {
      title: 'Skills Focus',
      icon: '👨‍🏫',
      color: '#4A6DF5',
      data: insights.skills
    },
    calls: {
      title: 'Call Insight',
      icon: '📞',
      color: '#28a745',
      data: insights.calls
    },
    challenges: {
      title: 'Next Challenge',
      icon: '🏆',
      color: '#dc3545',
      data: insights.challenges
    }
  };

  const handleActivateCard = (cardId) => {
    if (interactiveCard === cardId) {
      // Already in interactive mode, do nothing
      return;
    }
    
    // If already active, go to interactive mode
    if (activeCard === cardId) {
      setInteractiveCard(cardId);
      setChatHistory([
        {
          role: 'assistant',
          content: cardTypes[cardId].data.detailedExplanation
        }
      ]);
    } else {
      // Otherwise just make it active
      setActiveCard(cardId);
      setInteractiveCard(null);
    }
  };

  const handleCloseInteractive = () => {
    setInteractiveCard(null);
    setUserMessage('');
    setChatHistory([]);
  };

  const handleSubmitMessage = async () => {
    if (!userMessage.trim() || isSubmitting) {
      return;
    }

    const newMessage = {
      role: 'user',
      content: userMessage
    };

    setIsSubmitting(true);
    setChatHistory([...chatHistory, newMessage]);
    setUserMessage('');

    try {
      const response = await axios.post('/insights/chat', {
        insightType: interactiveCard,
        message: userMessage
      });

      if (response.data) {
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: response.data.content,
          additionalData: response.data.additionalData
        }]);
      }
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.'
      }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderCard = (cardId) => {
    const cardInfo = cardTypes[cardId];
    const isActive = activeCard === cardId;
    const isInteractive = interactiveCard === cardId;
    const cardData = cardInfo.data;
    
    if (isInteractive) {
      return (
        <div 
          className={`card interactive-card ${cardId}-card`}
          style={{ borderColor: cardInfo.color }}
        >
          <div className="card-header">
            <span className="card-icon">{cardInfo.icon}</span>
            <h3>{cardInfo.title}</h3>
            <button 
              className="close-button" 
              onClick={handleCloseInteractive}
            >
              ×
            </button>
          </div>
          
          <div className="chat-area">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
                {msg.additionalData && (
                  <div className="additional-data">
                    {msg.additionalData.type === 'example' && (
                      <blockquote>{msg.additionalData.text}</blockquote>
                    )}
                    {msg.additionalData.type === 'framework' && (
                      <div className="framework-info">
                        <strong>{msg.additionalData.name} Framework</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            
            {isSubmitting && (
              <div className="chat-message assistant">
                <div className="message-content typing">
                  <span>.</span><span>.</span><span>.</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="chat-input">
            <input 
              type="text" 
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitMessage()}
              placeholder="Ask for more details or advice..."
            />
            <button 
              className="send-button"
              onClick={handleSubmitMessage}
              disabled={isSubmitting}
            >
              Send
            </button>
          </div>
        </div>
      );
    }
    
    return (
      <div 
        className={`card ${isActive ? 'active-card' : 'dormant-card'} ${cardId}-card`}
        onClick={() => handleActivateCard(cardId)}
        style={{ borderColor: isActive ? cardInfo.color : 'transparent' }}
      >
        <div className="card-content">
          <div className="card-header">
            <span className="card-icon">{cardInfo.icon}</span>
            <h3>{cardInfo.title}</h3>
          </div>
          
          <p className="card-explanation">{cardData.summary}</p>
          
          {isActive && (
            <div className="card-actions">
              {cardData.actions && cardData.actions.map(action => (
                <button 
                  key={action.id} 
                  className="action-button"
                >
                  <span className="action-icon">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          )}
          
          {isActive && (
            <div className="card-footer">
              <div className="score-chip">
                Score: {cardData.score}
              </div>
              {cardData.trend && (
                <div className={`trend-chip ${cardData.trend}`}>
                  {cardData.trend === 'improving' ? '↗ Improving' : 
                    cardData.trend === 'declining' ? '↘ Declining' : '→ Steady'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="ai-card-system">
      {Object.keys(cardTypes).map(cardId => (
        <div key={cardId} className={`card-container ${interactiveCard && interactiveCard !== cardId ? 'hidden-card' : ''}`}>
          {renderCard(cardId)}
        </div>
      ))}
    </div>
  );
};

export default AICardSystem; 
import React, { useState, useEffect, useRef } from 'react';
import './VoiceTest.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const VoiceTestPage: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState('Click the microphone to start speaking');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Set up and clean up speech recognition
  useEffect(() => {
    // Clean up speech recognition on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);
  
  const startListening = () => {
    // Check if already listening
    if (isListening) return;
    
    // Reset the current transcript
    setTranscript('');
    
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update the current transcript
        setTranscript(interimTranscript || finalTranscript);
      };
      
      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setStatus(`Error: ${event.error}. Try again.`);
      };
      
      recognition.onend = () => {
        // Don't reset state here, we'll handle it in stopListening
      };
      
      // Start recognition
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setStatus('Listening... Speak now');
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setStatus('Failed to start speech recognition. Please try again.');
    }
  };
  
  const stopListening = () => {
    if (!isListening || !recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      
      // Only add a message if there's actual content
      if (transcript.trim()) {
        const newMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: transcript,
          timestamp: new Date()
        };
        
        setMessages(prevMessages => [...prevMessages, newMessage]);
        processUserMessage(transcript);
      }
      
      // Reset state
      setIsListening(false);
      setTranscript('');
      setStatus('Processing...');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
    }
  };
  
  const processUserMessage = (message: string) => {
    setStatus('AI is thinking...');
    
    // Simulate AI response after delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `I received your message: "${message}". This is a simulated response.`,
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, aiResponse]);
      setStatus('Your turn. Click the microphone to speak.');
    }, 1000);
    
    // In a real implementation, you would call your API here
    // const response = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message }) });
    // const data = await response.json();
    // setMessages(prevMessages => [...prevMessages, { role: 'assistant', content: data.message, timestamp: new Date() }]);
  };
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <div className="voice-test-container">
      <div className="conversation-panel">
        <div className="messages-container">
          {messages.map(message => (
            <div key={message.id} className={`message ${message.role}`}>
              <div className="message-content">{message.content}</div>
              <div className="message-time">{formatTime(message.timestamp)}</div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="transcript-area">
          {transcript && (
            <div className="current-transcript">{transcript}</div>
          )}
        </div>
        
        <div className="controls">
          <button 
            className={`mic-button ${isListening ? 'listening' : ''}`}
            onClick={isListening ? stopListening : startListening}
          >
            <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
          </button>
          <div className="status-text">{status}</div>
        </div>
      </div>
    </div>
  );
};

export default VoiceTestPage; 
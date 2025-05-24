import React, { useEffect, useRef, useState, useCallback } from 'react';

interface StreamingTextDirectProps {
  message: string;
  conversationHistory: Array<{content: string, role: 'user' | 'assistant'}>;
  additionalContext?: string;
  onComplete?: () => void;
  onChunkReceived?: (chunk: string) => void;
  responseKey?: string; // Add response key for forcing component resets
}

/**
 * StreamingTextDirect - A component that connects directly to the streaming API
 * and displays text as it arrives from the server. Unlike StreamingText which
 * animates pre-rendered content, this shows the actual AI generation in real-time.
 */
const StreamingTextDirect: React.FC<StreamingTextDirectProps> = ({
  message,
  conversationHistory = [],
  additionalContext = '',
  onComplete,
  onChunkReceived,
  responseKey
}) => {
  const [text, setText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const historyRef = useRef<string>('');
  const messageRef = useRef<string>('');
  const additionalContextRef = useRef<string>('');
  const isStreamingRef = useRef<boolean>(false);
  const isCompletedRef = useRef<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const completionCallbackFiredRef = useRef<boolean>(false);
  
  // Force reset when responseKey changes
  useEffect(() => {
    if (responseKey) {
      isCompletedRef.current = false; 
      completionCallbackFiredRef.current = false;
      setText('');
      setError(null);
      
      // Increment request ID to invalidate any in-flight requests
      requestIdRef.current += 1;
    }
  }, [responseKey]);
  
  // Update refs to prevent unnecessary effect reruns
  useEffect(() => {
    messageRef.current = message;
    historyRef.current = JSON.stringify(conversationHistory);
    additionalContextRef.current = additionalContext || '';
    
    // Reset completion status when message changes significantly
    if (message && prevMessageRef.current !== message) {
      isCompletedRef.current = false;
      completionCallbackFiredRef.current = false;
    }
    
    prevMessageRef.current = message;
  }, [message, conversationHistory, additionalContext]);
  
  // Track previous message to detect actual changes
  const prevMessageRef = useRef<string>('');
  
  // Create stylesheet for animations
  useEffect(() => {
    const styleId = 'streaming-text-direct-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.innerHTML = `
      @keyframes blink {
        0%, 100% { opacity: 0.7; }
        50% { opacity: 0; }
      }
      .streaming-text-container {
        position: relative;
        line-height: 1.5;
        min-height: 1em;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .typing-cursor {
        display: inline-block;
        width: 2px;
        height: 1.2em;
        background-color: currentColor;
        margin-left: 1px;
        vertical-align: text-bottom;
        animation: blink 0.8s steps(2) infinite;
        opacity: 0.7;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);
  
  // Reset function to clear state
  const resetState = useCallback(() => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    // Increment request ID to invalidate any in-flight requests
    requestIdRef.current += 1;
    
    // Reset state flags
    isStreamingRef.current = false;
    completionCallbackFiredRef.current = false;
    
    // Don't reset isCompletedRef here as it needs to persist between rerenders
  }, []);
  
  // Memoized connect function to prevent recreating on each render
  const connectToStream = useCallback(() => {
    // Only start if not already streaming and we have a message and not completed
    if (isStreamingRef.current || !messageRef.current || isCompletedRef.current) return;
    
    // Reset state first
    resetState();
    
    // Set streaming flag
    isStreamingRef.current = true;
    
    // Increment request ID
    requestIdRef.current++;
    const currentRequestId = requestIdRef.current;
    
    // Clear previous text and set loading
    setText('');
    setIsLoading(true);
    setError(null);
    
    // Parse conversation history from the ref
    let parsedHistory = [];
    try {
      parsedHistory = JSON.parse(historyRef.current);
    } catch (e) {
      parsedHistory = [];
    }
    
    // Prepare request data
    const requestData = {
      message: messageRef.current,
      context: {
        messages: parsedHistory,
        additional_context: additionalContextRef.current
      }
    };
    
    // Create EventSource URL with data in the query params
    const url = new URL('/api/dashboard/coach/stream', window.location.origin);
    
    try {
      // Make the API call using fetch and then process the stream
      fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
        credentials: 'include',
      }).then(response => {
        // Cancel if another request has started
        if (currentRequestId !== requestIdRef.current) {
          console.log('Ignoring outdated response');
          return;
        }
        
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('ReadableStream not supported in this browser');
        }
        
        // Process the stream
        const processStream = async () => {
          let decoder = new TextDecoder();
          let buffer = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              
              // Check if request is still current
              if (currentRequestId !== requestIdRef.current) {
                console.log('Stopping stream processing for outdated request');
                break;
              }
              
              if (done) {
                // Stream is complete
                setIsLoading(false);
                isStreamingRef.current = false;
                isCompletedRef.current = true;
                
                // Only call onComplete once if this is still the current request
                if (currentRequestId === requestIdRef.current && !completionCallbackFiredRef.current && onComplete) {
                  completionCallbackFiredRef.current = true;
                  onComplete();
                }
                break;
              }
              
              // Decode the chunk and add to buffer
              buffer += decoder.decode(value, { stream: true });
              
              // Process any complete events in the buffer
              const events = buffer.split('\n\n');
              buffer = events.pop() || ''; // Keep the last incomplete event in buffer
              
              // Process each complete event
              for (const eventText of events) {
                // Check if request is still current
                if (currentRequestId !== requestIdRef.current) {
                  break;
                }
                
                const lines = eventText.split('\n');
                let eventType = '';
                let data = '';
                
                // Parse event type and data
                for (const line of lines) {
                  if (line.startsWith('event:')) {
                    eventType = line.slice(7);
                  } else if (line.startsWith('data:')) {
                    data = line.slice(5);
                  }
                }
                
                // Process based on event type
                if (eventType.trim() === 'chunk' && data) {
                  try {
                    const parsedData = JSON.parse(data);
                    if (parsedData.chunk) {
                      if (currentRequestId === requestIdRef.current) {
                        setText(prev => prev + parsedData.chunk);
                        if (onChunkReceived) {
                          onChunkReceived(parsedData.chunk);
                        }
                      }
                    }
                  } catch (e) {
                    console.error('Error parsing chunk data:', e);
                  }
                } else if (eventType.trim() === 'end') {
                  setIsLoading(false);
                  isStreamingRef.current = false;
                  isCompletedRef.current = true;
                  
                  // Only call onComplete once if this is still the current request
                  if (currentRequestId === requestIdRef.current && !completionCallbackFiredRef.current && onComplete) {
                    completionCallbackFiredRef.current = true;
                    onComplete();
                  }
                }
              }
            }
          } catch (err) {
            // Only update state if this is still the current request
            if (currentRequestId === requestIdRef.current) {
              console.error('Error reading stream:', err);
              setError('Error reading response stream');
              setIsLoading(false);
              isStreamingRef.current = false;
            }
          }
        };
        
        processStream();
      }).catch(err => {
        // Only update state if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          console.error('API request error:', err);
          setError(`Error: ${err.message}`);
          setIsLoading(false);
          isStreamingRef.current = false;
        }
      });
    } catch (err) {
      console.error('Error setting up streaming:', err);
      setError(`Setup error: ${err instanceof Error ? err.message : String(err)}`);
      setIsLoading(false);
      isStreamingRef.current = false;
    }
  }, [onComplete, onChunkReceived, resetState]);
  
  // Connect to streaming API when message changes, but not on every key press
  useEffect(() => {
    if (!message) return;
    
    // Reset timers to ensure clean state
    const timeoutIds: number[] = [];
    
    // Set a small delay to start streaming to avoid starting on each keystroke
    const timeoutId = setTimeout(() => {
      connectToStream();
    }, 300); // 300ms delay ensures we don't restart on every keystroke
    
    timeoutIds.push(timeoutId);
    
    // Cleanup on unmount or message change
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
      resetState();
    };
  }, [message, connectToStream, resetState]);
  
  return (
    <div className="streaming-text-container">
      {text}
      {isLoading && <span className="typing-cursor" />}
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </div>
  );
};

export default StreamingTextDirect; 
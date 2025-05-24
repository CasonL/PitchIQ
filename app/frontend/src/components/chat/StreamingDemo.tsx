import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StreamingTextDirect from "@/lib/StreamingTextDirect";
import StreamingText from "@/lib/StreamingText";
import AnimatedText from "@/lib/AnimatedText";

/**
 * Demo component that compares traditional chunked text animation 
 * with direct streaming from the API.
 */
export default function StreamingDemo() {
  const [message, setMessage] = useState<string>('');
  const [conversation, setConversation] = useState<Array<{content: string, role: string}>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<string>('');
  const [currentTab, setCurrentTab] = useState<string>('direct');
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef<boolean>(false);
  // Add a ref to track completed animations
  const animationCompleteRef = useRef<boolean>(false);
  const responseIdRef = useRef<number>(0);
  
  // Reset animation complete flag when message changes
  useEffect(() => {
    if (message) {
      animationCompleteRef.current = false;
    }
  }, [message]);
  
  // Handle sending a message
  const handleSend = async () => {
    if (!message.trim() || isLoading || sendingRef.current) return;
    
    sendingRef.current = true;
    
    // Increment response ID to track current response
    responseIdRef.current++;
    const currentResponseId = responseIdRef.current;
    
    // Reset animation complete flag
    animationCompleteRef.current = false;
    
    // Add user message to conversation
    const userMessage = { content: message, role: 'user' };
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    setIsLoading(true);
    
    // Store the message we're sending so we can clear the input
    const currentMessage = message;
    
    // Clear input immediately to prevent multiple sends
    setMessage('');
    
    // For the traditional approach (non-direct streaming), we need to fetch the response first
    if (currentTab === 'traditional') {
      try {
        const response = await fetch('/api/dashboard/coach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentMessage,
            context: {
              messages: updatedConversation
            }
          }),
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        
        // Only update if this is still the current response
        if (currentResponseId === responseIdRef.current) {
          const data = await response.json();
          setLastResponse(data.content || 'No response received');
        }
      } catch (error) {
        console.error('Error fetching response:', error);
        // Only update if this is still the current response
        if (currentResponseId === responseIdRef.current) {
          setLastResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      } finally {
        // Only update if this is still the current response
        if (currentResponseId === responseIdRef.current) {
          setIsLoading(false);
        }
        sendingRef.current = false;
      }
    } else {
      // For direct streaming, the StreamingTextDirect component will handle the API call
      // Just need to clear sendingRef when done
      sendingRef.current = false;
    }
  };
  
  // Handle receiving a complete response
  const handleResponseComplete = () => {
    // Mark this animation as complete to prevent restarts
    animationCompleteRef.current = true;
    
    // Only add to conversation if we're streaming directly and have content
    if (currentTab === 'direct' && lastResponse) {
      // Add the response to the conversation
      setConversation(prev => [
        ...prev, 
        { content: lastResponse, role: 'assistant' }
      ]);
      
      // Clear the last response to prevent further updates
      setLastResponse('');
    }
    
    // Set loading state to false
    setIsLoading(false);
    
    // Return focus to the textarea after completion
    if (textAreaRef.current) {
      textAreaRef.current.focus();
    }
  };
  
  // Handle tab changing
  const handleTabChange = (value: string) => {
    // Only allow tab change when not loading
    if (!isLoading) {
      setCurrentTab(value);
      // Clear any partial responses
      setLastResponse('');
    }
  };
  
  return (
    <div className="mx-auto max-w-4xl p-4">
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle className="text-center">Text Streaming Comparison</CardTitle>
          <Tabs defaultValue={currentTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct" disabled={isLoading}>Direct API Streaming</TabsTrigger>
              <TabsTrigger value="traditional" disabled={isLoading}>Traditional Animation</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="border rounded-md p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
            {/* Display conversation */}
            <div className="space-y-4">
              {conversation.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {/* Display streaming response */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-3 bg-gray-100 text-gray-800">
                    {currentTab === 'direct' ? (
                      <StreamingTextDirect
                        message={message}
                        conversationHistory={conversation}
                        onComplete={handleResponseComplete}
                        onChunkReceived={(chunk) => {
                          if (!animationCompleteRef.current) {
                            setLastResponse(prev => prev + chunk);
                          }
                        }}
                      />
                    ) : (
                      <AnimatedText 
                        content={lastResponse} 
                        onComplete={handleResponseComplete}
                        responseKey={`response-${responseIdRef.current}`}
                        animationStyle="words"
                        baseThrottleMs={100}
                        initialWordCount={5}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4">
          <div className="w-full">
            <Textarea 
              ref={textAreaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[80px]"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleSend} 
            disabled={isLoading || !message.trim()}
          >
            {isLoading ? 'Loading...' : 'Send'}
          </Button>
        </CardFooter>
      </Card>
      
      <div className="mt-8 p-4 border rounded bg-gray-50">
        <h3 className="font-bold mb-2">About this demo:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>Direct streaming shows text as it's generated by the AI</li>
          <li>Traditional animation simulates typing after receiving the full response</li>
          <li>Direct streaming feels more natural and keeps users engaged</li>
          <li>Try both tabs to see the difference in experience</li>
          <li><strong>Fixed:</strong> Animation no longer restarts on key presses</li>
          <li><strong>Fixed:</strong> Animation no longer loops after completion</li>
        </ul>
      </div>
    </div>
  );
} 
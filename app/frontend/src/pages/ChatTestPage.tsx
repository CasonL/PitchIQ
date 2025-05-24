import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PaperPlaneIcon } from '@radix-ui/react-icons'; // Assuming you use these icons

interface Persona {
  id: string | null;
  name: string;
  role: string;
  description_narrative: string; // From the new JSON structure
  // Add other fields you want to display from the persona JSON
  base_reaction_style?: string;
  intelligence_level_generated?: string;
  primary_personality_trait_generated?: string;
  trait_metrics?: Record<string, any>;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const ChatTestPage = () => {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoadingPersona, setIsLoadingPersona] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleGeneratePersona = useCallback(async () => {
    setIsLoadingPersona(true);
    setError(null);
    setMessages([]); 
    setPersona(null); // Clear old persona details immediately

    try {
      // --- BEGIN New CSRF Token Fetch Logic ---
      const csrfResponse = await fetch('/auth/api/csrf-token'); // Corrected path to /auth/api/csrf-token
      if (!csrfResponse.ok) {
        throw new Error('Failed to fetch CSRF token');
      }
      const csrfData = await csrfResponse.json();
      const csrfToken = csrfData.csrfToken;

      if (!csrfToken) {
        console.error("CSRF token not received from API.");
        setError("CSRF token not received. Application security issue.");
        setIsLoadingPersona(false);
        return;
      }
      // --- END New CSRF Token Fetch Logic ---

      const response = await fetch('/training/api/chat/create_test_persona', {
         method: 'POST',
         headers: {
            'X-CSRFToken': csrfToken // Use fetched CSRF token
         }
      });
      if (!response.ok) {
        // If the response is not OK, it might be HTML (like an error page)
        const errorText = await response.text(); // Try to get text first
        console.error("Error response from create_test_persona:", errorText.substring(0, 500)); // Log more of the response
        // Try to parse as JSON for specific error messages if server sends them, otherwise use text
        let specificError = response.statusText;
        try {
            const errorJson = JSON.parse(errorText); // This will fail if errorText is HTML
            specificError = errorJson.error || specificError;
        } catch (e) {
            // Keep specificError as response.statusText or part of the HTML
            specificError = `${response.statusText} - Preview: ${errorText.substring(0,100)}...`;
        }
        throw new Error(`HTTP error ${response.status}: ${specificError}`);
      }
      const data = await response.json(); 
      setPersona(data as Persona);
    } catch (err) {
      console.error("Failed to generate persona:", err);
      setError(err instanceof Error ? err.message : 'Failed to generate persona. Check console.');
      setPersona(null);
    } finally {
      setIsLoadingPersona(false);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!userInput.trim() || !persona) return;

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: userInput,
      timestamp: new Date(),
    };
    
    // Optimistically add user message and clear input
    const currentInput = userInput;
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    setUserInput('');
    setIsSendingMessage(true);
    setError(null);

    try {
      const response = await fetch('/training/api/chat/send_test_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput, // Use the captured input
          persona: persona,      // Send the full current persona object
          history: messages.slice(-10).map(m => ({role: m.sender, content: m.text})) // Map to {role, content}
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP error ${response.status}: ${errorData.error || response.statusText}`);
      }
      const aiResponseData = await response.json();
      
      const newAiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseData.reply,
        timestamp: new Date(),
      };
      setMessages(prevMessages => [...prevMessages, newAiMessage]);
    } catch (err) {
      console.error("Failed to send message or get reply:", err);
      setError(err instanceof Error ? err.message : 'Failed to get AI reply. Check console.');
      // Optionally add an error message to the chat if desired, or revert optimistic update
      setMessages(prevMessages => prevMessages.filter(m => m.id !== newUserMessage.id)); // Remove optimistic user message
      setUserInput(currentInput); // Restore user input
       const errorAiMessage: ChatMessage = {
        id: `ai-error-${Date.now()}`,
        sender: 'ai',
        text: `Sorry, I encountered an error: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages(prevMessages => [...prevMessages, errorAiMessage]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Automatically generate a persona when the page loads for the first time
  useEffect(() => {
    handleGeneratePersona();
  }, [handleGeneratePersona]); // handleGeneratePersona is memoized with useCallback

  return (
    <div className="flex flex-col h-screen p-4 bg-gray-50">
      <header className="mb-4 p-4 bg-white shadow rounded-lg">
        <h1 className="text-2xl font-semibold text-gray-800">Persona Chat Test</h1>
        <div className="mt-2">
          <Button 
            onClick={handleGeneratePersona} 
            disabled={isLoadingPersona || isSendingMessage}
            variant="outline"
            className="bg-blue-500 hover:bg-blue-600 text-white disabled:bg-blue-300"
          >
            {isLoadingPersona ? 'Generating Persona...' : 'Generate New Persona'}
          </Button>
        </div>
        {error && <p className="text-red-500 mt-2 text-sm">Error: {error}</p>}
      </header>

      {persona && (
        <div className="mb-4 p-4 bg-white shadow rounded-lg">
          <h2 className="text-xl font-semibold text-indigo-700">{persona.name}</h2>
          <p className="text-sm text-gray-600 italic">{persona.role}</p>
          <p className="mt-1 text-xs text-gray-500">
            Style: {persona.base_reaction_style || 'N/A'} | 
            Intelligence: {persona.intelligence_level_generated || 'N/A'} |
            Primary Trait: {persona.primary_personality_trait_generated || 'N/A'}
          </p>
          {/* Ensure trait_metrics is displayed correctly if it's an object */}
          {persona.trait_metrics && typeof persona.trait_metrics === 'object' && Object.keys(persona.trait_metrics).length > 0 && (
             <details className="mt-1 text-xs text-gray-500">
                <summary className="cursor-pointer">View Trait Metrics</summary>
                <pre className="mt-1 p-2 bg-gray-100 rounded text-xs whitespace-pre-wrap">
                  {JSON.stringify(persona.trait_metrics, null, 2)}
                </pre>
             </details>
          )}
          <p className="mt-2 text-sm text-gray-700">{persona.description_narrative}</p>
        </div>
      )}
      {!persona && !isLoadingPersona && !error && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 text-yellow-700 rounded-lg">
            Click "Generate New Persona" to begin.
        </div>
      )}
      {isLoadingPersona && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-300 text-blue-700 rounded-lg">
            Generating new persona, please wait...
        </div>
      )}

      <div className="flex-grow overflow-y-auto mb-4 p-4 bg-white shadow rounded-lg space-y-3 min-h-[200px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-lg lg:max-w-xl px-4 py-2 rounded-2xl shadow ${
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white'
                  : msg.text.startsWith('Sorry, I encountered an error') 
                    ? 'bg-red-100 text-red-700 border border-red-300' 
                    : 'bg-gray-200 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <p className="text-xs mt-1 opacity-75 text-right">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {messages.length === 0 && !isLoadingPersona && persona && (
            <div className="text-center text-gray-500 pt-10">
                No messages yet. Say hello to {persona.name}!
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <footer className="p-4 bg-white shadow rounded-lg">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isSendingMessage && persona && userInput.trim()) {
                    e.preventDefault(); // Prevent newline on enter unless shift is pressed
                    handleSendMessage();
                }
            }}
            placeholder={persona ? `Message ${persona.name}... (Shift+Enter for newline)` : "Generate a persona to start chatting..."}
            className="flex-grow"
            disabled={!persona || isSendingMessage || isLoadingPersona}
            rows={1} // For textarea-like behavior with Shift+Enter, you might use a <textarea> or a more complex input.
                    // For basic Input, onKeyPress handles Enter.
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!persona || !userInput.trim() || isSendingMessage || isLoadingPersona}
            className="bg-green-500 hover:bg-green-600 text-white disabled:bg-green-300"
          >
            {isSendingMessage ? 'Sending...' : 'Send'} <PaperPlaneIcon className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default ChatTestPage;

// Need to add useRef import:
// import React, { useState, useEffect, useCallback, useRef } from 'react';
// And ensure PaperPlaneIcon is correctly imported or replaced.
// If @radix-ui/react-icons is not installed, this will cause an error.
// Using a simple text "Send" or a unicode arrow for now if icons are an issue. 
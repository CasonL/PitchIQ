import React, { useState, useEffect } from 'react';
import { Send, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Assuming you have an Input component from shadcn/ui

interface MinimalAIChatBarProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  initialQueryText?: string | null; // New prop for pre-filling
  // onVoiceInput?: () => void; // Future enhancement
}

const MinimalAIChatBar: React.FC<MinimalAIChatBarProps> = ({
  onSendMessage,
  placeholder = "Ask your AI Coach...",
  initialQueryText,
  // onVoiceInput,
}) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (initialQueryText && initialQueryText !== message) {
      setMessage(initialQueryText);
    }
    // If initialQueryText is null or empty, and message is not empty, we don't want to clear user's typing.
    // The parent (Dashboard) will be responsible for managing when to send a new initialQueryText.
  }, [initialQueryText]); // Rerun when initialQueryText changes

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="flex items-center w-full p-1.5 bg-white rounded-full shadow-lg border border-blue-500 transition-all duration-150"
    >
      <Input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={placeholder}
        className="flex-grow bg-transparent border-none focus-visible:ring-0 focus-visible:outline-none focus-visible:border-transparent focus-visible:shadow-none focus-visible:ring-offset-0 text-sm text-gray-800 placeholder-gray-500 pl-4 pr-2 py-2.5"
      />
      {/* <Button 
        type="button"
        variant="ghost"
        size="icon"
        className="text-gray-500 hover:text-primary mr-1"
        // onClick={onVoiceInput} // Future enhancement
      >
        <Mic size={18} />
        <span className="sr-only">Voice input</span>
      </Button> */} 
      <Button 
        type="submit"
        variant="ghost"
        size="icon" 
        className="text-gray-500 hover:text-blue-600 focus:text-blue-600 disabled:text-gray-300 rounded-full mr-1 h-9 w-9"
        disabled={!message.trim()}
      >
        <Send size={18} />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  );
};

export default MinimalAIChatBar; 
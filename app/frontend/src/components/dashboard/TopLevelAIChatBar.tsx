import React, { useEffect, useRef, useState, forwardRef } from 'react';
import MinimalAIChatBar from './MinimalAIChatBar';
import { Bot, User, Loader2, ChevronDown, ChevronUp, MessageCircle, MessageSquare, Send, X, CornerDownLeft, Maximize2, Minimize2 } from 'lucide-react'; // Added MessageCircle
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion'; // Import framer-motion
import { Textarea } from '@/components/ui/textarea';

// Define type for chat messages (can be imported if already defined elsewhere and shared)
interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date; 
}

interface TopLevelAIChatBarProps {
  initialQueryText?: string | null;
  onSendMessage: (message: string) => Promise<void>;
  placeholder?: string;
  messages: ChatMessage[]; // New prop
  isAiTyping?: boolean;    // New prop
  maxVisibleMessagesInitial?: number; // New prop
  // New props for visibility control from parent
  isChatLogVisible: boolean;
  setIsChatLogVisible: (isVisible: boolean) => void;
  showFullChatHistory: boolean; // ADDED: Prop for full history state
  setShowFullChatHistory: (showFull: boolean) => void; // ADDED: Prop for full history state setter
}

const TopLevelAIChatBar = forwardRef<HTMLDivElement, TopLevelAIChatBarProps>((
  { 
    initialQueryText,
    onSendMessage,
    placeholder = "Ask your AI Coach anything...",
    messages = [], // Default to empty array
    isAiTyping = false,
    maxVisibleMessagesInitial = 3, // Default to 3 initially visible messages
    // Destructure new props
    isChatLogVisible,
    setIsChatLogVisible,
    showFullChatHistory, // ADDED
    setShowFullChatHistory, // ADDED
  },
  ref // This is the forwardedRef
) => {
  const [inputValue, setInputValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const messageAreaRef = useRef<null | HTMLDivElement>(null); // Ref for the message display area
  const prevShowFullHistoryRef = useRef<boolean>(showFullChatHistory); // UPDATED to use prop
  const [userHasScrolledUp, setUserHasScrolledUp] = useState<boolean>(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null); // Ref for the scrollable messages container

  useEffect(() => {
    if (initialQueryText) {
      setInputValue(initialQueryText);
      textareaRef.current?.focus();
    }
  }, [initialQueryText]);

  useEffect(() => {
    const messageArea = messageAreaRef.current;
    if (isChatLogVisible && messageArea) {
      // Scenario 1: Toggling to show full history - scroll to top
      if (showFullChatHistory && !prevShowFullHistoryRef.current) { // UPDATED to use prop
        messageArea.scrollTop = 0;
        setUserHasScrolledUp(false);
      } 
      // Scenario 2: User hasn't scrolled up - scroll to bottom for new messages
      else if (!userHasScrolledUp) {
        // Direct scroll to bottom for more reliability
        const scrollBehavior = (prevShowFullHistoryRef.current === showFullChatHistory && messages.length > 1) ? 'smooth' : 'auto'; // UPDATED to use prop
        
        // A short delay can sometimes help if content is still rendering/resizing rapidly
        setTimeout(() => {
          messageArea.scrollTo({ top: messageArea.scrollHeight, behavior: scrollBehavior });
        }, 50); // Increased delay slightly for animations to settle
      }
    }
    prevShowFullHistoryRef.current = showFullChatHistory; // UPDATED to use prop
  }, [messages, isAiTyping, showFullChatHistory, isChatLogVisible, userHasScrolledUp]); // UPDATED to use prop

  useEffect(() => {
    if (isChatLogVisible && messagesContainerRef.current) {
      // Scroll to bottom when chat log becomes visible or new messages are added (compact view)
      if (!showFullChatHistory) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  }, [isChatLogVisible, messages, showFullChatHistory]);

  useEffect(() => {
    // Scroll to bottom when full history is shown or messages update in full history view
    if (showFullChatHistory && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [showFullChatHistory, messages]); // Dependency on messages ensures scroll on new message in full view

  const handleScroll = () => {
    const messageArea = messageAreaRef.current;
    if (messageArea) {
      const { scrollTop, scrollHeight, clientHeight } = messageArea;
      // Check if scrolled nearly to the bottom (within a small threshold, e.g., 10px)
      if (scrollHeight - scrollTop - clientHeight < 10) {
        setUserHasScrolledUp(false);
      } else {
        setUserHasScrolledUp(true);
      }
    }
  };

  const messagesToDisplay = (() => {
    if (showFullChatHistory) { // UPDATED to use prop
      return messages; // Show all messages if full history is active
    } else {
      if (isAiTyping && messages.length > 0) {
        const lastMessage = messages[messages.length - 1]; // Current user's message
        if (messages.length > 1) {
          const secondLastMessage = messages[messages.length - 2]; // Potentially AI's previous response
          // Ensure we only show the AI's response and the user's latest,
          // or just the user's latest if it's the first message or if the second to last isn't AI.
          if (lastMessage.sender === 'user' && secondLastMessage.sender === 'ai') {
            return [secondLastMessage, lastMessage];
          } else {
            return [lastMessage]; // Fallback to just the user's latest message
          }
        } else {
          return [lastMessage]; // Only one message exists (user's first message)
        }
      } else {
        // AI is not typing, show the standard number of recent messages
        return messages.slice(-maxVisibleMessagesInitial);
      }
    }
  })();

  const olderMessagesCount = messages.length - messagesToDisplay.length;

  // Helper to format timestamp (optional)
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
    // Auto-adjust height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scroll height
    }
  };

  const handleSendMessage = async () => {
    if (inputValue.trim()) {
      await onSendMessage(inputValue.trim());
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height after send
        textareaRef.current.focus();
      }
      if (!isChatLogVisible) {
        setIsChatLogVisible(true); // Open chat log on send if it was closed
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChatLogVisibility = () => {
    const newVisibility = !isChatLogVisible;
    setIsChatLogVisible(newVisibility);
    if (newVisibility && showFullChatHistory) {
        // If opening to full history, ensure it's in that mode
    } else if (!newVisibility) {
        // If closing, also ensure full history is turned off
        setShowFullChatHistory(false);
    }
  };

  const toggleFullChatHistory = () => {
    setShowFullChatHistory(!showFullChatHistory);
    if (!isChatLogVisible && !showFullChatHistory) { // if it was closed and we toggle full history to true
        setIsChatLogVisible(true); // then open it
    } else if (isChatLogVisible && showFullChatHistory) { // if it was open and we toggle full history to false
        // This case means we are minimizing from full view to compact view, keep isChatLogVisible true.
    }
  };

  const displayedMessages = showFullChatHistory ? messages : messages.slice(-3); // Show last 3 for compact

  return (
    <div ref={ref} className="w-full flex flex-col items-center relative"> {/* Assign forwardedRef to the outermost div */}
      <AnimatePresence>
        {isChatLogVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: showFullChatHistory ? '60vh' : 'auto' }} // Dynamic height
            exit={{ opacity: 0, y: 20, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`w-full bg-white rounded-t-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col mb-0 ${showFullChatHistory ? 'max-h-[60vh]' : 'max-h-[40vh]' }`}
          >
            <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-700">AI Coach Conversation</h3>
              <div className="flex items-center space-x-2">
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleFullChatHistory} 
                    className="text-gray-500 hover:text-gray-700 h-7 w-7"
                    title={showFullChatHistory ? "Show fewer messages" : "Show all messages"}
                    aria-label={showFullChatHistory ? "Show fewer messages" : "Show all messages"}
                  >
                    {showFullChatHistory ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={toggleChatLogVisibility} 
                    className="text-gray-500 hover:text-gray-700 h-7 w-7"
                    title="Close chat"
                    aria-label="Close chat"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
            <div ref={messagesContainerRef} className="p-4 space-y-4 flex-grow overflow-y-auto styled-scrollbar"> {/* Assign messagesContainerRef */}
              {messagesToDisplay.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No messages yet. Ask something!</p>}
              {messagesToDisplay.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[70%] p-2.5 rounded-lg shadow-sm ${msg.sender === 'user' ? 'bg-primary text-primary-foreground self-end' : 'bg-gray-100 text-gray-800 self-start'}`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span className="text-xs text-gray-400 mt-1 px-1">{formatTimestamp(msg.timestamp)}</span>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex items-start">
                  <div className="max-w-[70%] p-2.5 rounded-lg shadow-sm bg-gray-100 text-gray-800 self-start flex items-center">
                    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full mr-1 animate-bounce-slow delay-0"></motion.div>
                    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full mr-1 animate-bounce-slow delay-150"></motion.div>
                    <motion.div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce-slow delay-300"></motion.div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Bar Area */}
      <div 
        className={`w-full p-2 bg-white shadow-2xl border border-gray-300 flex items-end space-x-2 transition-all duration-300 
                    ${isChatLogVisible ? 'rounded-lg rounded-t-none border-t-transparent' : 'rounded-full cursor-pointer'}`}
        onClick={() => {
          if (!isChatLogVisible) {
            toggleChatLogVisibility();
          }
        }}
      >
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-grow p-2.5 border-none focus:ring-0 resize-none overflow-y-hidden bg-transparent text-sm min-h-[24px] max-h-[100px] leading-tight styled-scrollbar"
          rows={1}
          disabled={!isChatLogVisible && messages.length === 0} // Optionally disable textarea when in pill form and no history to show
        />
        <div className="flex flex-col-reverse self-end"> {/* Ensures button aligns with last line of textarea */}
             <Button 
                onClick={(e) => { // Stop propagation if chat is closed to prevent immediate re-toggle by parent div
                  if (!isChatLogVisible) e.stopPropagation(); 
                  handleSendMessage();
                }} 
                disabled={!inputValue.trim() || isAiTyping}
                size="icon" 
                className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full shadow-md disabled:bg-gray-300 disabled:text-gray-500 transition-colors"
            >
                {isAiTyping ? 
                    <CornerDownLeft size={18} className="animate-pulse" /> : 
                    <Send size={18} />
                }
            </Button>
        </div>
      </div>
    </div>
  );
});

export default TopLevelAIChatBar; 
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Edit } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface TypewriterGreetingProps {
  userName: string;
  // hasCompletedRoleplay: boolean; // No longer needed for this simplified greeting
  onNameChange: (name: string) => void;
  onComplete: () => void;
}

// Use React.memo to prevent unnecessary re-renders
const TypewriterGreeting: React.FC<TypewriterGreetingProps> = React.memo(({
  userName,
  // hasCompletedRoleplay,
  onNameChange,
  onComplete
}) => {
  const [displayText, setDisplayText] = useState('');
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [editableName, setEditableName] = useState(userName);

  // Use useRef to track render count for debugging
  const renderCountRef = useRef(0);

  // Remove the excessive console.log that happens on every render
  // Only log on initial mount and when significant state changes
  useEffect(() => {
    logger.debug('rendering', `TypewriterGreeting mounted with userName: ${userName}`);
  }, [userName]);

  // Function to tokenize text into meaningful chunks for better typing animation
  const tokenizeText = useCallback((text: string): string[] => {
    // Basic tokenization for the typewriter effect
    // This isn't linguistically accurate but works well for the animation
    const tokens: string[] = [];
    let currentToken = '';
    
    // Regex to match punctuation, spaces and special symbols
    const specialChars = /[.,!?;:()\[\]{}\\"'`~@#$%^&*+=<>\/\\\|-]/;    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      if (specialChars.test(char) || char === ' ') {
        // If we have a current token, add it
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
        
        // Add the special character as its own token
        tokens.push(char);
      } else {
        // Add character to current token
        currentToken += char;
      }
    }
    
    // Add any remaining token
    if (currentToken) {
      tokens.push(currentToken);
    }
    
    return tokens;
  }, []);

  // Check if a phrase is common and should be typed faster
  const isCommonPhrase = useCallback((text: string): boolean => {
    const commonPhrases = [
      "Welcome", "to", "PitchIQ", "Ascend", "Hi", "Hey", "Hello", 
      "Let's", "get", "you", "set", "up"
    ];
    
    return commonPhrases.some(phrase => 
      text.toLowerCase() === phrase.toLowerCase()
    );
  }, []);

  // Unified greeting typing effect
  useEffect(() => {
    logger.debug('flow', "Starting main greeting typewriter effect");
    
    // More natural and concise greeting
    const text = `Hi ${editableName}, welcome to PitchIQ Ascend! Let's get you set up.`;
    const tokens = tokenizeText(text);
    
    let currentIndex = 0;
    let currentDisplayText = ''; // Use a local variable for building display text
    
    const typeToken = () => {
      if (currentIndex < tokens.length) {
        const token = tokens[currentIndex];
        currentDisplayText += token;
        setDisplayText(currentDisplayText);
        
        const delay = isCommonPhrase(token) ? 20 :
                      token === ' ' ? 10 :
                      /[.,!?;:]/.test(token) ? 150 : // Slightly faster pause for punctuation
                      Math.floor(Math.random() * 30) + 20; // Slightly faster overall typing
        
        currentIndex++;
        setTimeout(typeToken, delay);
      } else {
        logger.debug('flow', "Main greeting typing completed");
        setIsTypingComplete(true);
        setTimeout(() => {
          logger.debug('flow', "Showing buttons after main greeting");
          setShowButtons(true);
        }, 300);
      }
    };
    
    setTimeout(typeToken, 500); // Shorter initial delay

  }, [editableName, tokenizeText, isCommonPhrase]); // Re-run if editableName changes

  // Handle click on "Change name" button
  const handleEditName = useCallback(() => {
    setShowNameInput(true);
    setShowButtons(false);
  }, []);

  // Handle saving of the name
  const handleSaveName = useCallback(() => {
    const trimmedName = editableName.trim(); // Use editableName from input field for saving
    if (trimmedName) {
      onNameChange(trimmedName); // Update name in parent/localStorage
      setEditableName(trimmedName); // Update local display name immediately
      setShowNameInput(false);
      // After saving, directly show buttons without re-triggering full type effect unless editableName was the trigger
      // The useEffect for typing will re-run if editableName changes, re-typing the greeting with the new name.
      // If we want to avoid re-typing, we might need to conditionally run the typing effect or just update the name in displayText.
      // For simplicity now, let it re-type with the new name.
      setIsTypingComplete(false); // Reset typing complete to allow re-typing with new name
      setDisplayText(''); // Clear display text to force re-type
    }
  }, [editableName, onNameChange]); // Changed newName to editableName for consistency

  // Handle click on "Continue" button
  const handleContinue = useCallback(() => {
    logger.debug('flow', "Continue/onComplete triggered");
    onComplete(); 
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Smaller text for greeting */}
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-800 mb-8">
            {displayText}
          </h1>
          
          {showButtons && isTypingComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
            >
              <Button
                onClick={handleEditName}
                size="lg"
                variant="outline"
                className="flex items-center gap-2 text-sm"
              >
                <Edit className="h-4 w-4" />
                Change Name
              </Button>
              
              <Button 
                onClick={handleContinue}
                size="lg"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-sm"
              >
                Let's Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </motion.div>

        {showNameInput && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-md mt-[-200px] sm:mt-[-150px] relative z-10" // Adjusted margin for overlap
          >
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">What should we call you?</h2>
            
            <input
              type="text"
              value={editableName} // Bind to editableName
              onChange={(e) => setEditableName(e.target.value)} // Update editableName
              className="w-full px-4 py-3 text-base sm:text-lg border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Enter your name"
              autoFocus
            />
            
            <div className="flex gap-3 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowNameInput(false);
                  setShowButtons(true); // Reshow buttons if name change is cancelled
                  setEditableName(userName); // Reset editable name to original if cancelled
                }}
                size="sm"
              >
                Cancel
              </Button>
              
              <Button
                onClick={handleSaveName}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!editableName.trim()}
                size="sm"
              >
                Save Name
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
});

export default TypewriterGreeting; 
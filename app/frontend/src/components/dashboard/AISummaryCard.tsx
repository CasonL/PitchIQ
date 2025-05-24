import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";
import { BrainCircuit, MessageSquareText, Mic, ChevronDown, ArrowRight, Building, Briefcase, Zap, Target, Package, Users, TrendingUp as TrendingUpIcon, Undo2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { marked } from 'marked';
import { Scrollbars } from 'react-custom-scrollbars-2';

// Add styles to fix numbered list display
const CHAT_MESSAGE_STYLES = `
  .ai-chat-message ol {
    list-style-type: decimal !important;
    margin-left: 1.5rem !important;
    padding-left: 0.5rem !important;
  }
  
  .ai-chat-message ol li {
    margin-bottom: 0.5rem !important;
    padding-left: 0.25rem !important;
  }
  
  .ai-chat-message ul {
    list-style-type: disc !important;
    margin-left: 1.5rem !important;
    padding-left: 0.5rem !important;
  }
  
  .ai-chat-message ul li {
    margin-bottom: 0.5rem !important;
    padding-left: 0.25rem !important;
  }
  
  .ai-chat-message p {
    margin-bottom: 1rem !important;
  }
`;

// Define simple onboarding stages
type OnboardingStage = 'welcome' | 'core_q1_product_value' | 'core_q1_combined' | 'core_q2_audience' | 'core_q4_style' | 'core_q4_methodology' | 'core_q5_goal' | 'complete';

// Define onboarding data structure
interface OnboardingData {
  answer_q1_product_value: string; // For product/service & value
  answer_q1_combined?: string; // Combined product, value, audience
  answer_q2_audience?: string; // For target audience
  answer_q4_style?: string; // For sales style/methodology (actually sales environment)
  answer_q4_methodology?: string; // For the chosen sales methodology
  answer_q5_goal?: string;  // For primary improvement goal
  stage: OnboardingStage;
  businessType?: string; // Store the classified business type
  businessDescription?: string; // Store the business description
  followupAnswers?: string[]; // Store any follow-up answers provided
  extracted_sales_environment_details?: any;
  extracted_business_details?: any;

  // Deprecated fields, keep for potential data migration or if old data exists in localStorage
  answer_q1?: string; 
  answer_q2?: string; 
  answer_q3?: string; 
}

// Storage keys for persisting state
const STORAGE_KEY_PREFIX = 'ai_coach_';
const STORAGE_KEYS = {
  onboardingData: `${STORAGE_KEY_PREFIX}onboarding_data`,
  onboardingComplete: `${STORAGE_KEY_PREFIX}onboarding_complete`,
  messages: `${STORAGE_KEY_PREFIX}messages`
};

// Questions for the 5-step onboarding
const ONBOARDING_QUESTIONS = {
  core_q1_product_value: {
    title: "Core Offer",
    question: "To help create realistic scenarios, please tell me specifically about:\n\n1. Your primary product or service.\n2. The main problem you solve or the core value you provide to them.\n\nBeing specific will help the AI understand your context better.",
    benefit: "Helps create realistic and relevant sales scenarios and prospect personas.",
    tooltip: "Providing clear details on what you sell and the value you offer allows the AI to tailor roleplays and feedback effectively."
  },
  core_q1_combined: {
    title: "Product, Audience & Value",
    question: "To help create realistic scenarios, please tell me specifically about:\n\n1. Your primary product or service.\n2. The main problem you solve or the core value you provide to them.\n\nBeing specific will help the AI understand your context better.",
    benefit: "Helps create realistic and relevant sales scenarios and prospect personas.",
    tooltip: "Providing clear details on what you sell and the value you offer allows the AI to tailor roleplays and feedback effectively."
  },
  core_q2_audience: {
    title: "Target Audience",
    question: "Who are your primary customers or target audience?",
    benefit: "Identifies who your sales efforts should target.",
    tooltip: "Defining your audience helps the AI simulate interactions with the right kind of prospects."
  },
  core_q4_style: {
    title: "Sales Context",
    question: `To tailor our roleplays effectively, let's understand your sales environment better:

1. Do you primarily sell to other businesses (B2B), directly to consumers (B2C), or a mix of both?

2. What's your average sales cycle length (e.g., a few days, several weeks, multiple months)?

3. How long is a typical sales call or main interaction (e.g., 15-30 minutes, 1 hour, multiple meetings)?`,
    benefit: "Helps the AI understand your sales context for realistic scenarios.",
    tooltip: "Details about your sales environment (B2B/B2C, cycle length, call duration) allow the AI to simulate more accurate prospect interactions."
  },
  core_q4_methodology: {
    title: "Sales Methodology",
    question: `Thanks for that info. Now, which sales methodology or style would you like to focus on? Some common examples include:

1. Consultative: Acting as a trusted advisor.
2. Challenger: Teaching, tailoring the message, and taking control.
3. SPIN: Guiding via Situation, Problem, Implication, and Need-payoff questions.
4. General Practice: A mix of approaches.

You can choose one, mention another, or just say 'General Practice' or 'Not Sure' – we can help suggest one based on your previous answers!`,
    benefit: "Tailors AI responses and feedback to your chosen sales approach.",
    tooltip: "Letting us know your preferred style helps the AI act as a more relevant sparring partner and provide style-specific coaching."
  },
  core_q5_goal: {
    title: "Improvement Goal",
    question: "What's one key area or skill you're hoping to improve with PitchIQ Ascend right now?",
    benefit: "Helps focus your training and track progress on what matters most to you.",
    tooltip: "Sharing your primary goal allows us to suggest relevant scenarios and highlight your progress in that specific area."
  }
};

// Define card states
type CardState = 'collapsed' | 'expanded' | 'chat_redirect' | 'processing';

// Add loading stage type
// type LoadingStage = 'tailoring' | 'creating_persona' | 'adapting' | 'complete'; // No longer used with cardState

// Define interface for loading state
// interface LoadingState { // No longer used with cardState
//   stage: LoadingStage;
//   progress: number;
//   message: string;
// }

// Define message type
interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  // Add a flag if this AI message is a direct question that might need clarification
  // This helps identify which message to send back to the API if user asks "what do you mean?"
  isDirectQuestion?: boolean; 
}

// Add this interface for API responses
interface ApiResponse {
  id?: string; // Added optional id field
  content: string;
  error?: string;
  business_type?: string;
  business_description?: string;
  needs_followup?: boolean;
  followup_question?: string;
  is_clarification_response?: boolean;
  isDirectQuestion?: boolean; // Added optional isDirectQuestion field
  // --- NEW Optional fields from backend --- 
  suggested_style?: string;
  user_stated_style?: string; // Backend might pass this back for context
  final_style?: string;
  validation_failed?: boolean;
  next_stage?: OnboardingStage; // Backend can dictate next stage
  stageTransition?: OnboardingStage | null; // Added optional stageTransition field
  extracted_sales_environment_details?: any; // <-- ADDED FOR EXTRACTED SALES ENV DETAILS
  // --- END NEW ---
}

// New interface for business classification
interface BusinessClassification {
  businessType: string;
  description: string;
  needsFollowup: boolean;
  followupQuestion?: string;
}

// Define props for AISummaryCard
interface AISummaryCardProps {
  onOnboardingComplete?: () => void; // New prop
}

// Typing effect component
const TypingEffect: React.FC<{ text: string; onComplete: () => void; className?: string }> = ({ 
  text, 
  onComplete, 
  className 
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(text.substring(0, currentIndex + 1));
        setCurrentIndex(prevIndex => prevIndex + 1);
      }, 25); // Speed of typing
      
      return () => clearTimeout(timer);
    } else {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);
  
  return <span className={className}>{displayText}</span>;
};

// --- NEW: Define the explicit sequence of onboarding stages ---
const STAGE_SEQUENCE: OnboardingStage[] = [
  'welcome',
  'core_q1_product_value',
  'core_q2_audience',
  'core_q4_style',
  'core_q4_methodology',
  'core_q5_goal',
  'complete'
];
// --- END NEW ---

// --- NEW: Active Onboarding Stages (excluding 'complete') ---
const ACTIVE_ONBOARDING_STAGES: OnboardingStage[] = STAGE_SEQUENCE.filter(s => s !== 'complete');
// --- END NEW ---

// --- NEW: Problematic Keywords for Safeguarding ---
const PROBLEMATIC_KEYWORDS: string[] = [
  'sell people', 'sell children', 'human trafficking', // Human exploitation
  'child exploitation', 'child abuse',
  'illegal drugs', 'sell drugs', 'drug trafficking', // Illegal substances
  'illegal weapons', 'sell guns illegally', 'weapon trafficking', // Illegal weapons
  'terrorism', 'terrorist activities',
  'hate speech', 'incite violence',
  'scamming', 'fraudulent activities',
  // Add more keywords as necessary, be mindful of common misspellings or euphemisms if possible,
  // but keep the list focused on clear, unambiguous terms for high-harm activities.
];

// Helper function to check for problematic keywords
const containsProblematicKeywords = (text: string): boolean => {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return PROBLEMATIC_KEYWORDS.some(keyword => lowerText.includes(keyword));
};
// --- END NEW ---

// Main AISummaryCard component
const AISummaryCard: React.FC<AISummaryCardProps> = ({ onOnboardingComplete }) => {
  // Inject styles for proper list formatting
  useEffect(() => {
    const styleId = 'ai-chat-message-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = CHAT_MESSAGE_STYLES;
      document.head.appendChild(style);
    }
    
    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  // State for onboarding
  const [onboardingData, setOnboardingData] = useState<OnboardingData>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.onboardingData);
    if (saved) {
      const parsed = JSON.parse(saved) as OnboardingData;
      // Ensure stage is valid on load, default to welcome if not or if complete previously
      const validStages: OnboardingStage[] = ['welcome', 'core_q1_product_value', 'core_q1_combined', 'core_q2_audience', 'core_q4_style', 'core_q4_methodology', 'core_q5_goal', 'complete'];
      if (!parsed.stage || !validStages.includes(parsed.stage)) {
        return { answer_q1_product_value: '', stage: 'welcome', followupAnswers: [] };
      }
      // Migration from old answer_q1_combined to answer_q1_product_value
      if ((parsed as any).answer_q1_combined && !parsed.answer_q1_product_value) {
        parsed.answer_q1_product_value = (parsed as any).answer_q1_combined;
      }
      return parsed;
    }
    return { answer_q1_product_value: '', stage: 'welcome', followupAnswers: [] };
  });
  
  // State for typing animation completion
  const [isTypingComplete, setIsTypingComplete] = useState(false);
  
  // Add loading stages state - REPURPOSED for completion overlay
  const [showCompletionLoading, setShowCompletionLoading] = useState(false);
  const [completionProgress, setCompletionProgress] = useState(0);
  const [completionMessage, setCompletionMessage] = useState('Tailoring your experience...');
  
  // State for business classification
  const [businessClassification, setBusinessClassification] = useState<BusinessClassification | null>(null);
  
  // State for follow-up questions
  const [waitingForFollowup, setWaitingForFollowup] = useState(false);
  const [followupQuestion, setFollowupQuestion] = useState('');
  
  // State for messages
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = localStorage.getItem(STORAGE_KEYS.messages);
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages) as Message[];
      // Restore lastAIQuestionText from the last AI question in messages
      const lastAiMsg = parsedMessages.filter(m => !m.isUser).pop();
      if (lastAiMsg) {
        // Deliberately not setting lastAIQuestionText here in initial load, 
        // as it should be set when an AI question is actively processed or undone to.
      }
      return parsedMessages.map(msg => ({ ...msg, timestamp: new Date(msg.timestamp) }));
    }
    return [];
  });
  const [lastAIQuestionText, setLastAIQuestionText] = useState<string | null>(null);

  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnboardingActuallyFinished, setIsOnboardingActuallyFinished] = useState(false); // New state
  
  const initialSetupDone = useRef(false); // Ref to track initial setup

  // Refs
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const ScrollbarsComponent = Scrollbars as unknown as React.ElementType;
  
  // Function to add AI message
  const addAIMessage = useCallback(async (content: string, isQuestion: boolean = true) => {
    console.log("[AISummaryCard addAIMessage] RAW Content for new AI message:\n", JSON.stringify(content));
    
    let processedContent = content;
    if (processedContent.includes('\n')) {
      const lines = processedContent.split('\n');
      // Iterate backwards to find the last line with actual content
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().length > 0) {
          lines[i] = lines[i].trimStart();
          break; // Found and trimmed the last contentful line
        }
      }
      processedContent = lines.join('\n');
    } else {
      // If it's a single line message, trim start just in case.
      processedContent = processedContent.trimStart();
    }
    console.log("[AISummaryCard addAIMessage] Processed Content (after robustly trimming last contentful line):\n", JSON.stringify(processedContent));

    // Normalize multiple newlines to a maximum of two (for paragraph breaks)
    const normalizedContent = processedContent.replace(/\n{3,}/g, '\n\n');

    const htmlOutput = await marked.parse(normalizedContent, { breaks: true }); // Use normalizedContent for parsing
    console.log("[AISummaryCard addAIMessage] HTML output (first 200 chars):\n", htmlOutput.substring(0, 200) + (htmlOutput.length > 200 ? "..." : ""));
    
    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: normalizedContent, // Use the normalized content for storing in state
      isUser: false,
      timestamp: new Date(),
      isDirectQuestion: isQuestion 
    };
    setMessages(prev => [...prev, newMessage]);
    if (isQuestion) {
      setLastAIQuestionText(normalizedContent); // Store the normalized content for consistency
    }
  }, [setMessages, setLastAIQuestionText]);
  
  // Function to get welcome message based on onboarding stage
  const getWelcomeMessage = (): string => {
    if (onboardingData.stage === 'welcome') {
      return ONBOARDING_QUESTIONS.core_q1_combined.question;
    }
    
    // If already in a stage, return appropriate question
    switch (onboardingData.stage) {
      case 'core_q1_product_value':
        return ONBOARDING_QUESTIONS.core_q1_product_value.question;
      case 'core_q1_combined':
        return ONBOARDING_QUESTIONS.core_q1_combined.question;
      case 'core_q2_audience':
        return ONBOARDING_QUESTIONS.core_q2_audience.question;
      case 'core_q4_style':
        return ONBOARDING_QUESTIONS.core_q4_style.question;
      case 'core_q5_goal':
        return ONBOARDING_QUESTIONS.core_q5_goal.question;
      case 'complete':
        return "Thank you for completing the onboarding! You're now ready to start practicing.";
      default:
        return ONBOARDING_QUESTIONS.core_q1_combined.question;
    }
  };
  
  // Function to determine next stage
  const moveToNextStage = (currentStage: OnboardingStage): OnboardingStage => {
    const currentIndex = STAGE_SEQUENCE.indexOf(currentStage);
    if (currentIndex >= 0 && currentIndex < STAGE_SEQUENCE.length - 1) {
      return STAGE_SEQUENCE[currentIndex + 1];
    }
    return 'complete'; // Fallback or final stage
  };
  
  // Add a function to call the API for paraphrasing responses
  const callParaphraseApi = async (userInput: string, stage: OnboardingStage, contextFromProcessUserResponse?: any) => {
    try {
      console.log('Calling paraphrase API with:', { userInput, stage, context: contextFromProcessUserResponse });
      
      const payloadToSend: any = {
        userInput: userInput,
        stage: stage,
        context: {},
        previous_ai_message_text: lastAIQuestionText || null
      };

      // Populate context directly
      if (contextFromProcessUserResponse) {
        if (contextFromProcessUserResponse.answer_q1_product_value) {
          payloadToSend.context.answer_q1_product_value = contextFromProcessUserResponse.answer_q1_product_value;
        }
        if (contextFromProcessUserResponse.answer_q2_audience) {
          payloadToSend.context.answer_q2_audience = contextFromProcessUserResponse.answer_q2_audience;
        }
        if (contextFromProcessUserResponse.extracted_sales_environment_details) {
          payloadToSend.context.extracted_sales_environment_details = { ...contextFromProcessUserResponse.extracted_sales_environment_details };
        }
        if (contextFromProcessUserResponse.suggested_style) {
          payloadToSend.context.suggested_style = contextFromProcessUserResponse.suggested_style;
        }
        if (contextFromProcessUserResponse.answer_q4_methodology) { 
          payloadToSend.context.answer_q4_methodology = contextFromProcessUserResponse.answer_q4_methodology;
        }
        if (contextFromProcessUserResponse.extracted_business_details) {
          payloadToSend.context.extracted_business_details = { ...contextFromProcessUserResponse.extracted_business_details };
        }
      }

      // Fallback to onboardingData if not in explicit context (though processUserResponse should now provide them in contextForApi)
      if (!payloadToSend.context.answer_q1_product_value && onboardingData.answer_q1_product_value) {
         payloadToSend.context.answer_q1_product_value = onboardingData.answer_q1_product_value;
      }
      if (!payloadToSend.context.answer_q2_audience && onboardingData.answer_q2_audience) {
         payloadToSend.context.answer_q2_audience = onboardingData.answer_q2_audience;
      }
      if (!payloadToSend.context.extracted_sales_environment_details && onboardingData.extracted_sales_environment_details) {
        payloadToSend.context.extracted_sales_environment_details = { ...onboardingData.extracted_sales_environment_details };
      } else if (!payloadToSend.context.extracted_sales_environment_details) {
        payloadToSend.context.extracted_sales_environment_details = {}; // Ensure it exists
      }
      if (!payloadToSend.context.suggested_style && onboardingData.extracted_sales_environment_details?.suggested_style) {
        payloadToSend.context.suggested_style = onboardingData.extracted_sales_environment_details.suggested_style;
      }

      // Clean up context if it's empty
      if (Object.keys(payloadToSend.context).length === 0) {
        delete payloadToSend.context;
      }

      // --- DEBUG LOGGING --- 
      if (stage === 'core_q4_style') {
        console.log('[AISummaryCard callParaphraseApi DEBUG FOR core_q4_style] lastAIQuestionText:', lastAIQuestionText);
        console.log('[AISummaryCard callParaphraseApi DEBUG FOR core_q4_style] Constructed payload BEFORE fetch:', JSON.stringify(payloadToSend, null, 2));
      }
      // --- END DEBUG LOGGING ---

      const response = await fetch('http://localhost:8081/paraphrase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadToSend)
      });
      
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response text:', errorText);
        throw new Error(`Failed to get paraphrased response: ${response.status}, ${errorText}`);
      }
      
      const data: ApiResponse = await response.json();
      console.log('API response data:', data);
      return data;
    } catch (error) {
      console.error('Error calling paraphrase API:', error);
      // Fallback response structure
      return {
        content: generateBetterResponse(userInput, stage),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };

  // Function for local fallback with better, more intelligent paraphrasing
  const generateBetterResponse = (userInput: string, stage: OnboardingStage): string => {
    console.log('Generating better local response for stage:', stage);
    
    // Clean up user input for processing
    const input = userInput.trim();
    
    // Remove common prefixes like "Hey!" and "I sell" or "We sell"
    const cleanedInput = input
      .replace(/^(hey|hi|hello)!?\s+/i, '')
      .replace(/^(i|we)\s+(sell|offer|provide|have)\s+/i, '')
      .trim();
    
    console.log('Cleaned input:', cleanedInput);
    
    if (stage === 'core_q1_product_value') {
      // Extract product info - handle different input patterns
      let productDesc = '';
      
      // Check for specific product types
      if (cleanedInput.toLowerCase().includes('sales training')) {
        productDesc = 'your sales training solution';
      } else if (cleanedInput.toLowerCase().includes('ai') || cleanedInput.toLowerCase().includes('artificial intelligence')) {
        productDesc = 'your AI-powered solution';
      } else if (cleanedInput.toLowerCase().includes('coaching')) {
        productDesc = 'your coaching service';
      } else if (cleanedInput.toLowerCase().includes('bottle') || cleanedInput.toLowerCase().includes('waterbottle')) {
        productDesc = 'your innovative water bottle products';
      } else if (cleanedInput.toLowerCase().includes('table')) {
        productDesc = 'your furniture products';
      } else {
        // Extract the main product noun phrase
        const mainNounMatch = cleanedInput.match(/^([a-z0-9\s-]+?)(?:\sthat\s|\swhich\s|,|\.|$)/i);
        if (mainNounMatch) {
          productDesc = `your ${mainNounMatch[1].trim()}`;
        } else {
          // Fallback to first part of sentence
          productDesc = `your ${cleanedInput.split(/\s+/).slice(0, 3).join(' ')}`;
        }
      }
      
      return `Thanks for sharing details about ${productDesc}. Who are your primary customers or target audience?`;
    } 
    else if (stage === 'core_q4_style') {
      // Extract value proposition with intelligence
      let valueDesc = '';
      
      if (cleanedInput.toLowerCase().includes('improve') || cleanedInput.toLowerCase().includes('improving')) {
        valueDesc = 'improving performance and outcomes';
      } else if (cleanedInput.toLowerCase().includes('training') || cleanedInput.toLowerCase().includes('skill')) {
        valueDesc = 'skill development and training';
      } else if (cleanedInput.toLowerCase().includes('data') || cleanedInput.toLowerCase().includes('analytics')) {
        valueDesc = 'data-driven insights and analytics';
      } else if (cleanedInput.toLowerCase().includes('space') || cleanedInput.toLowerCase().includes('saving')) {
        valueDesc = 'space-saving and practical solutions';
      } else if (cleanedInput.toLowerCase().includes('design') || cleanedInput.toLowerCase().includes('aesthetic')) {
        valueDesc = 'innovative design and aesthetics';
      } else {
        // Generic extraction
        valueDesc = cleanedInput;
      }
      
      return `Great! I see that your business focuses on ${valueDesc}. Thank you for sharing this information.`;
    }
    
    return `Thank you for your response. Let's continue with the next question.`;
  };

  // Function to handle loading stage animation - REPURPOSED for completion
  const handleCompletionLoadingAnimation = () => {
    setShowCompletionLoading(true);
    setCompletionProgress(0);
    setCompletionMessage('Tailoring your experience...');

    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.random() * 10 + 5; // Simulate progress
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(progressInterval);
        setCompletionMessage('Setup complete! Redirecting...');
        setTimeout(() => {
          // Actual redirect or callback
          if (onOnboardingComplete) {
            onOnboardingComplete();
          } else {
            // Fallback redirect if no callback provided, though parent should handle this
            window.location.href = '/chat'; 
          }
          setIsOnboardingActuallyFinished(true); // Mark as fully finished
        }, 1500); // Wait a bit on 100%
      }
      setCompletionProgress(currentProgress);
      if (currentProgress < 30) setCompletionMessage('Tailoring your experience...');
      else if (currentProgress < 70) setCompletionMessage('Creating personalized scenarios...');
      else setCompletionMessage('Adapting dashboard to your needs...');

    }, 250); // Adjust interval for desired speed
  };
  
  // Helper function to check for methodology clarification requests
  const isMethodologyClarificationRequest = (input: string): boolean => {
    const lowerInput = input.toLowerCase();
    const keywords = [
      'elaborate on sales methodology',
      'explain sales methodology',
      'what is consultative',
      'what\'s consultative',
      'what is challenger',
      'what\'s challenger',
      'what is spin',
      'what\'s spin',
      'explain consultative',
      'explain challenger',
      'explain spin',
      'tell me more about sales method'
    ];
    return keywords.some(keyword => lowerInput.includes(keyword));
  };

  // Modified processUserResponse to handle methodology clarifications and new stages
  const processUserResponse = async (userResponse: string) => {
    console.log("[AISummaryCard processUserResponse] START. User response: ", userResponse, "Current isLoading state:", isLoading);
    const trimmedUserResponse = userResponse.trim();
    // --- NEW: Safeguard Check --- 
    if (containsProblematicKeywords(trimmedUserResponse)) {
      console.warn("[AISummaryCard Safeguard] Problematic keywords detected in user input:", trimmedUserResponse);
      addAIMessage(
        "I cannot assist with or discuss topics related to illegal or harmful activities. Please ensure your input complies with ethical and legal standards. If you believe this was a misunderstanding, please rephrase your input.", 
        false // Not a question
      );
      // Optionally, reset or halt onboarding stage here if desired
      // setOnboardingData(prev => ({ ...prev, stage: 'welcome' })); // Example: reset to welcome
      // Or introduce a specific 'halted_due_to_safeguard' stage
      setIsLoading(false); // Ensure UI is not stuck in loading
      setUserInput(''); // Clear the problematic input
      return; // Stop further processing
    }
    // --- END NEW Safeguard Check ---

    // Add user message to chat immediately (only if not problematic)
    const newUserMessage: Message = {
      id: crypto.randomUUID(),
      content: trimmedUserResponse,
      isUser: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput(''); // Clear input after adding message
    setIsLoading(true);
    console.log("[AISummaryCard processUserResponse] setIsLoading(true) called.");

    try {
      console.log("[AISummaryCard processUserResponse] Right before reading stage, onboardingData from state is:", JSON.stringify(onboardingData));
      let stageForApiCall = onboardingData.stage;
      
      // Check if this is the first user response to the initial AI question (Q1)
      // If onboardingData.stage is still 'welcome' (due to async state update timing)
      // but there's 1 message (the AI's Q1), then the user is answering Q1.
      if (onboardingData.stage === 'welcome' && messages.length === 1 && messages[0].isUser === false) {
        console.log("[AISummaryCard Debug] Overriding stage for API call to 'core_q1_product_value' for first user response.");
        stageForApiCall = 'core_q1_product_value';
      }

      const currentStage = stageForApiCall; // Use the potentially overridden stage for processing logic
      console.log(`[AISummaryCard Debug] Processing response for stage: ${currentStage}`);
      let apiResponse: ApiResponse;
      let contextForApi: any = { 
        extracted_sales_environment_details: onboardingData.extracted_sales_environment_details 
                                              ? { ...onboardingData.extracted_sales_environment_details } 
                                              : {},
        suggested_style: onboardingData.extracted_sales_environment_details?.suggested_style || null,
        answer_q1_product_value: onboardingData.answer_q1_product_value, 
        answer_q2_audience: onboardingData.answer_q2_audience,
        answer_q4_methodology: onboardingData.answer_q4_methodology || null,
        extracted_business_details: onboardingData.extracted_business_details ? { ...onboardingData.extracted_business_details } : null
      }; 

      console.log(`[AISummaryCard Debug] User input for this turn: "${trimmedUserResponse.substring(0, 50)}"`);
      console.log("[AISummaryCard Debug] onboardingData.extracted_sales_environment_details BEFORE callParaphraseApi:", JSON.stringify(onboardingData.extracted_sales_environment_details, null, 2));
      console.log("[AISummaryCard Debug] contextForApi BEFORE callParaphraseApi:", JSON.stringify(contextForApi, null, 2));

      if (currentStage === 'core_q4_methodology' && isMethodologyClarificationRequest(trimmedUserResponse)) {
        console.log("[AISummaryCard Debug] Using LOCAL SIMULATION for core_q4_methodology clarification.");
        const methodologyToClarify = trimmedUserResponse.match(/explain (.*?) more/i)?.[1]?.trim() || "the selected methodology";
        apiResponse = {
          id: crypto.randomUUID(),
          content: `Okay, let's dive deeper into ${methodologyToClarify}. [Detailed explanation of ${methodologyToClarify} would go here, including its pros, cons, and when it's best used. This part is simulated.] After this explanation, are you ready to proceed or would you like to discuss another methodology?`,
          isDirectQuestion: true,
          needs_followup: false,
          stageTransition: null, // Stays on methodology confirmation
          is_clarification_response: true,
        };
      }
      else {
        // Default path: Call the paraphrase API
        console.log("[AISummaryCard Debug] Branch: Default API call path for stage: " + currentStage);
        // Ensure onboardingData has the latest user input for the current stage before API call
        // This is especially important for multi-step interactions within a stage
        let tempOnboardingData = { ...onboardingData };
        if (currentStage === 'core_q1_product_value') tempOnboardingData.answer_q1_product_value = trimmedUserResponse;
        // Add other stages here if they need immediate input reflection before API call for that stage.

        apiResponse = await callParaphraseApi(trimmedUserResponse, currentStage, {
            ...contextForApi, // Now this will include the necessary details
            answer_q1_product_value: onboardingData.answer_q1_product_value, // Use onboardingData directly
            answer_q2_audience: onboardingData.answer_q2_audience // Use onboardingData directly
        });
      }
      
      // --- Process API Response (now apiResponse is definitively set by one branch) --- 

      // Log the raw content from API and its HTML conversion before adding it to messages
      if (apiResponse.content) {
        console.log("[AISummaryCard processUserResponse] RAW API Content:\n", JSON.stringify(apiResponse.content));
        const htmlFromApi = await marked.parse(apiResponse.content, { breaks: true });
        console.log("[AISummaryCard processUserResponse] HTML from API (first 200 chars):\n", htmlFromApi.substring(0, 200) + (htmlFromApi.length > 200 ? "..." : ""));
      }

      // Handle potential validation failure from backend
      if (apiResponse.validation_failed) {
          addAIMessage(apiResponse.content, false); // Add validation message, not as a question
          setIsLoading(false);
          return; // Stay on current stage
      }

      // Handle general clarification response (backend simply returns explanation)
      if (apiResponse.is_clarification_response && currentStage !== 'core_q4_methodology') {
          addAIMessage(apiResponse.content, true); // Re-ask or clarify
          setIsLoading(false);
          return; 
      }

      let updatedOnboardingData = { ...onboardingData };

      // --- Stage-Specific Logic AFTER API Call --- 

      if (currentStage === 'core_q1_product_value' || currentStage === 'welcome') {
          updatedOnboardingData.answer_q1_product_value = trimmedUserResponse;
          // Extract business details if provided by the backend from Q1 processing
          if ((apiResponse as any).extracted_business_details) { // Type assertion for safety
            const details = (apiResponse as any).extracted_business_details;
            setBusinessClassification({
                businessType: details.business_model_guess || 'Unknown',
                description: details.product_service_summary || '',
                needsFollowup: false // Assuming initial extraction doesn't trigger followup here
            });
            updatedOnboardingData.businessType = details.business_model_guess;
            updatedOnboardingData.businessDescription = details.product_service_summary;
            // Potentially store all extracted details if needed elsewhere
            // updatedOnboardingData.all_extracted_q1_details = details;
          }
          
          updatedOnboardingData.stage = apiResponse.next_stage || 'core_q2_audience'; // Backend should send 'core_q2_audience'
          setOnboardingData(updatedOnboardingData); // Save Q1 answer and stage update
          localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(updatedOnboardingData));

          // --- Immediately fetch Q2 question with suggestions ---
          if (updatedOnboardingData.stage === 'core_q2_audience') {
            console.log("[AISummaryCard Debug] Q1 processed, stage is core_q2_audience. Fetching Q2 question with suggestions.");
            setIsLoading(true); // Show loading for the second call
            try {
                const q2QuestionResponse = await callParaphraseApi(
                    '', // Empty user input signals question generation
                    'core_q2_audience',
                    { answer_q1_product_value: updatedOnboardingData.answer_q1_product_value } // Pass Q1 context
                );
                if (q2QuestionResponse.content) {
                    addAIMessage(q2QuestionResponse.content, q2QuestionResponse.isDirectQuestion !== false);
                    // No stage change here, still core_q2_audience, waiting for user answer
           } else {
                    addAIMessage(ONBOARDING_QUESTIONS.core_q2_audience.question, true); // Fallback to static Q2 q
                }
            } catch (q2Error) {
                console.error("Error fetching Q2 question with suggestions:", q2Error);
                addAIMessage(ONBOARDING_QUESTIONS.core_q2_audience.question, true); // Fallback
            } finally {
                setIsLoading(false);
            }
          }
          return; // Return here because the rest of the logic assumes a single API call per user interaction
      }
      else if (currentStage === 'core_q2_audience') {
          updatedOnboardingData.answer_q2_audience = trimmedUserResponse;
          addAIMessage(apiResponse.content); // AI ack of Q2 + asks Q4_style (Sales Env)
          updatedOnboardingData.stage = apiResponse.next_stage || moveToNextStage(currentStage); // Backend should send 'core_q4_style'
          
      }
      else if (currentStage === 'core_q4_style') {
          updatedOnboardingData.answer_q4_style = trimmedUserResponse;
          updatedOnboardingData.stage = apiResponse.next_stage || moveToNextStage(currentStage);
          addAIMessage(apiResponse.content);
          // Store extracted sales environment details if present
          if (apiResponse.extracted_sales_environment_details) {
            updatedOnboardingData.extracted_sales_environment_details = apiResponse.extracted_sales_environment_details;
            console.log("[AISummaryCard Debug] Stored extracted_sales_environment_details:", apiResponse.extracted_sales_environment_details);
          }
      }
      else if (currentStage === 'core_q4_methodology') {
           // User is responding to the methodology suggestion/confirmation
           if (apiResponse.final_style) {
             updatedOnboardingData.answer_q4_methodology = apiResponse.final_style;
             console.log("[AISummaryCard Debug] Stored final_methodology as answer_q4_methodology:", apiResponse.final_style);
           }
           
           // First, check if the backend response indicates it was just providing clarification
           if (apiResponse.is_clarification_response) {
               // Backend already provided explanation and re-asked the confirmation.
               addAIMessage(apiResponse.content); // Display the explanation + re-ask
               // Update suggested/user styles potentially passed back for context
               updatedOnboardingData.answer_q4_style = apiResponse.suggested_style || updatedOnboardingData.answer_q4_style || 'General Practice';
           } else {
               // This is the actual confirmation/choice from the user
               const finalStyle = apiResponse.final_style || updatedOnboardingData.answer_q4_style || 'General Practice';
               updatedOnboardingData.answer_q4_style = finalStyle; // Save the final chosen style NOW
               updatedOnboardingData.stage = apiResponse.next_stage || moveToNextStage(currentStage);
               addAIMessage(apiResponse.content);
           }
      }
       else if (currentStage === 'core_q5_goal') {
           updatedOnboardingData.answer_q5_goal = trimmedUserResponse;
           updatedOnboardingData.stage = apiResponse.next_stage || moveToNextStage(currentStage); // Should be complete
           addAIMessage(apiResponse.content); // Add AI concluding message
           if (updatedOnboardingData.stage === 'complete') {
               let handledByParent = false;
               if (onOnboardingComplete) {
                   onOnboardingComplete(); // Call the callback
                   handledByParent = true;
               }
               
               // Only proceed with internal processing/redirect if not handled by parent
               if (!handledByParent) {
        setTimeout(() => {
          setIsLoading(false); // Stop chat loading indicator
          handleCompletionLoadingAnimation(); // Start full screen loading animation
        }, 3000);
               } else {
                   // If handled by parent, maybe just show a subtle completion within the card itself
                   // or allow the parent to unmount it gracefully.
                   // For now, we can also trigger the internal processing visual and let parent unmount.
                   // This ensures the user sees the "processing" state of AISummaryCard before it disappears.
                    setIsLoading(false); // Stop chat loading indicator
                    handleCompletionLoadingAnimation(); // Start full screen loading animation
               }
           }
      }

      // Save updated data
      setOnboardingData(updatedOnboardingData);
      localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(updatedOnboardingData));

    } catch (error) {
        console.error("Error in response generation:", error);
        addAIMessage("Sorry, I encountered an error trying to process that. Please try again.", false);
    } finally {
        setIsLoading(false); // Ensure loading is set to false
        console.log("[AISummaryCard processUserResponse] END (finally block). setIsLoading(false) called.");
    }
};

  // Modify handleSendMessage to prevent double message adding
  const handleSendMessage = () => {
    console.log(`[AISummaryCard handleSendMessage] Called. User input: "${userInput.trim()}", isLoading: ${isLoading}`);
    if (userInput.trim() && !isLoading) {
      // Don't add user message here, processUserResponse will do it.
      const userInputCopy = userInput.trim(); 
      // Clear input immediately *before* async call
      console.log("[AISummaryCard handleSendMessage] Clearing userInput and calling processUserResponse.");
      setUserInput('');

      // Reset textarea height after clearing input
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // Start processing
      processUserResponse(userInputCopy);
      // Removed setIsLoading(true) here, processUserResponse handles it
      // Removed .finally() here, processUserResponse handles it
    } else {
      console.log("[AISummaryCard handleSendMessage] Condition not met. userInput.trim():", userInput.trim(), "!isLoading:", !isLoading);
    }
  };
  
  // Handle key press (MODIFIED type for textarea)
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
    // If Shift+Enter, the default behavior (newline) is allowed
  };
  
  // Load saved data
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEYS.onboardingData);
    if (savedData) {
      const parsedData = JSON.parse(savedData) as OnboardingData;
      setOnboardingData(parsedData);
      
      // Restore business classification if available
      if (parsedData.businessType) {
        setBusinessClassification({
          businessType: parsedData.businessType,
          description: parsedData.businessDescription || '',
          needsFollowup: false
        });
      }
    }
    
    const savedMessages = localStorage.getItem(STORAGE_KEYS.messages);
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages) as Message[];
      setMessages(parsedMessages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      })));
    }
    
    // Make the page non-scrollable
    document.body.style.overflow = 'hidden';
    
    // Cleanup function
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);
  
  // Save data when it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(onboardingData));
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(messages));
  }, [onboardingData, messages]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      const scrollElement = chatContainerRef.current;
      // Using a double requestAnimationFrame for more robust scrolling after layout
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        });
      });
    }
  }, [messages]);
  
  // Format time
  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  };
  
  // Function to render business classification badge
  const renderBusinessBadge = () => {
    if (!businessClassification) return null;
    
    return (
      <div className="p-2 flex items-center bg-secondary/30 rounded-md text-sm">
        <Briefcase className="h-4 w-4 mr-2 text-primary" />
        <span className="font-medium">{businessClassification.businessType}</span>
      </div>
    );
  };
  
  // Render onboarding timeline
  const renderOnboardingTimeline = () => {
    const stageOrder: OnboardingStage[] = [
        'core_q1_product_value', 'core_q2_audience', 'core_q4_style', 'core_q4_methodology', 'core_q5_goal', 'complete'
    ];
    const currentIndex = stageOrder.indexOf(onboardingData.stage as OnboardingStage);
    
    const stages = [
      { key: 'core_q1_product_value', label: 'Core Offer', icon: <Package className="h-4 w-4"/> },
      { key: 'core_q2_audience', label: 'Audience', icon: <Users className="h-4 w-4"/> },
      { key: 'core_q4_style', label: 'Sales Context', icon: <Zap className="h-4 w-4"/> },
      { key: 'core_q4_methodology', label: 'Methodology', icon: <TrendingUpIcon className="h-4 w-4"/> },
      { key: 'core_q5_goal', label: 'Goal', icon: <Target className="h-4 w-4"/> }
    ];

    const getStageProgress = (stageKey: OnboardingStage): number => {
        const stageMap: Record<OnboardingStage, number> = {
            welcome: -1,
            core_q1_product_value: 0,
            core_q1_combined: 0,
            core_q2_audience: 1,
            core_q4_style: 2,
            core_q4_methodology: 3,
            core_q5_goal: 4,
            complete: 5
        };
        const currentNumericStage = stageMap[onboardingData.stage] ?? -1;
        const targetNumericStage = stageMap[stageKey] ?? -1;

        if (targetNumericStage === -1) return 0;

        if (currentNumericStage >= targetNumericStage) return 100;
        if (currentNumericStage === targetNumericStage -1 ) return 50;
        return 0;
    };
    
    return (
      <div className="p-3 bg-slate-50 rounded-md mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Personalize Your Experience</h3>
          {businessClassification && renderBusinessBadge()}
        </div>
        <p className="text-sm text-gray-600 mb-2">Your answers help tailor sales scenarios to your specific business and customers.</p>
        
        <div className="relative h-12 px-2 mt-6 mb-4">
          <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-gray-200 transform -translate-y-1/2"></div>
            <div 
            className="absolute left-0 top-1/2 h-[2px] bg-primary transform -translate-y-1/2 transition-all duration-300"
              style={{ 
               width: currentIndex === -1 ? '0%' :
                      currentIndex === 0 ? '10%' :
                      currentIndex === 1 ? '45%' :
                      currentIndex === 2 ? '62%' :
                      currentIndex === 3 ? '80%' :
                      currentIndex === 4 ? '100%' :
                      '0%'
            }}
          ></div>
          <div className="absolute left-0 right-0 top-0 bottom-0 flex justify-between items-center">
            {stages.map((stageInfo, index) => {
              const stageKey = stageInfo.key as OnboardingStage;
              const isFullyComplete = onboardingData.stage === 'complete';
              let isActiveTimelineStep = false;
              if (isFullyComplete) {
                isActiveTimelineStep = true;
              } else {
                isActiveTimelineStep = stageOrder.indexOf(onboardingData.stage) >= index;
              }
              const isActiveOrCompleted = isActiveTimelineStep;

              const boxSizeClasses = index === 0 ? "w-32 h-12" : "w-20 h-8"; 
              const textSizeClasses = index === 0 ? "text-xs" : "text-xs";

              return (
                <div key={stageKey} className="flex flex-col items-center z-10 relative">
                  <div className={`bg-white flex items-center justify-center rounded-md border-2 transition-colors duration-300 ${boxSizeClasses} ${isActiveOrCompleted ? 'border-red-500' : 'border-gray-300'}`}>
                    <span className={`${textSizeClasses} font-medium text-center px-1`}>{stageInfo.label}</span>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-col items-center z-10 relative">
                 <div className={`w-20 h-8 bg-white flex items-center justify-center rounded-md border-2 transition-colors duration-300 ${onboardingData.stage === 'complete' ? 'border-red-500' : 'border-gray-300'}`}>
                {onboardingData.stage === 'complete' ? (
                  <BrainCircuit className="h-4 w-4 text-red-500" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-gray-500"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // NEW HELPER: Normalize string for robust comparison
  const normalizeStringForComparison = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase().replace(/s+/g, ' ').replace(/[^a-z0-9s*()?.,!-_]/gi, '').trim();
  };

  // MODIFIED: getStageFromQuestionText to use normalization AND appropriate matching (endsWith/includes)
  const getStageFromQuestionText = (questionText: string): OnboardingStage | null => {
    if (!questionText) return null;
    const normalizedAiText = normalizeStringForComparison(questionText);
    console.log(`[Undo Debug] Normalized AI Text (lowercase): "${normalizedAiText}"`);

    // Check against each onboarding question
    const q1Norm = normalizeStringForComparison(ONBOARDING_QUESTIONS.core_q1_product_value.question);
    console.log(`[Undo Debug] Checking if AI text endsWith stage core_q1_product_value question (normalized): "${q1Norm}"`);
    if (normalizedAiText.endsWith(q1Norm)) {
      console.log(`[Undo Debug] -> endsWith result: true. Matched stage: core_q1_product_value`);
      return 'core_q1_product_value';
    }
    console.log(`[Undo Debug] -> endsWith result: false`);

    // New check for core_q2_audience
    if (ONBOARDING_QUESTIONS.core_q2_audience) {
        const q2AudienceNorm = normalizeStringForComparison(ONBOARDING_QUESTIONS.core_q2_audience.question);
        console.log(`[Undo Debug] Checking if AI text includes/endsWith stage core_q2_audience base question (normalized): "${q2AudienceNorm}"`);
        // Since AI augments this question, we might need to check if the AI response *includes* the base question text, 
        // or if the AI response ends with something identifiable as the audience question prompt.
        // For now, let's assume AI includes the base question or a clear derivative for undo matching.
        if (normalizedAiText.includes(q2AudienceNorm)) { // Using includes for more flexibility with AI-generated text
            console.log(`[Undo Debug] -> includes result: true. Matched stage: core_q2_audience`);
            return 'core_q2_audience';
        }
        console.log(`[Undo Debug] -> includes result: false`);
    }

    const q4StyleNorm = normalizeStringForComparison(ONBOARDING_QUESTIONS.core_q4_style.question);
    console.log(`[Undo Debug] Checking if AI text endsWith stage core_q4_style question (normalized): "${q4StyleNorm}"`);
    if (normalizedAiText.endsWith(q4StyleNorm)) {
      console.log(`[Undo Debug] -> endsWith result: true. Matched stage: core_q4_style`);
      return 'core_q4_style';
    }
    console.log(`[Undo Debug] -> endsWith result: false`);
    
    // New check for core_q4_methodology
    // Ensure core_q4_methodology is defined in ONBOARDING_QUESTIONS
    if (ONBOARDING_QUESTIONS.core_q4_methodology) {
      const q4MethodologyNorm = normalizeStringForComparison(ONBOARDING_QUESTIONS.core_q4_methodology.question);
      console.log(`[Undo Debug] Checking if AI text endsWith stage core_q4_methodology question (normalized): "${q4MethodologyNorm}"`);
      if (normalizedAiText.endsWith(q4MethodologyNorm)) {
        console.log(`[Undo Debug] -> endsWith result: true. Matched stage: core_q4_methodology`);
        return 'core_q4_methodology';
      }
      console.log(`[Undo Debug] -> endsWith result: false`);
    }

    const q5Norm = normalizeStringForComparison(ONBOARDING_QUESTIONS.core_q5_goal.question);
    console.log(`[Undo Debug] Checking if AI text endsWith stage core_q5_goal question (normalized): "${q5Norm}"`);
    if (normalizedAiText.endsWith(q5Norm)) {
      console.log(`[Undo Debug] -> endsWith result: true. Matched stage: core_q5_goal`);
      return 'core_q5_goal';
    }
    console.log(`[Undo Debug] -> endsWith result: false`);

    console.log(`[Undo Debug] No stage matched for AI text (original was: ${questionText} )`);
    return null;
  };

  // NEW HELPER (or modified if existed): Clear answer for a stage
  const clearAnswerForStage = (currentData: OnboardingData, stageToClear: OnboardingStage): OnboardingData => {
    const updatedData = { ...currentData };
    if (stageToClear === 'core_q1_product_value') {
      updatedData.answer_q1_product_value = '';
      updatedData.businessType = undefined;
      updatedData.businessDescription = undefined;
      // Clear old fields too if they exist (especially if migrating from answer_q1_combined)
      if ((updatedData as any).answer_q1_combined) delete (updatedData as any).answer_q1_combined;
      updatedData.answer_q1 = ''; 
      updatedData.answer_q2 = '';
      updatedData.answer_q3 = '';
    } else if (stageToClear === 'core_q2_audience') {
        updatedData.answer_q2_audience = '';
    } else if (stageToClear === 'core_q4_style' || stageToClear === 'core_q4_methodology') {
      updatedData.answer_q4_style = '';
      updatedData.answer_q4_methodology = ''; // Clear methodology too if undoing style/env
    } else if (stageToClear === 'core_q5_goal') {
      updatedData.answer_q5_goal = '';
    }
    return updatedData;
  };

  // NEW FUNCTION: Handle Undo
  const handleUndo = () => {
    if (messages.length < 2 || onboardingData.stage === 'welcome' || onboardingData.stage === 'complete') {
      console.log("Undo: Not enough messages or at start/end of onboarding.");
      return;
    }

    // The current onboardingData.stage is the stage for which the AI just asked a question.
    // So, the user had just answered the *previous* stage in the sequence.
    const currentAiQuestionStageIndex = STAGE_SEQUENCE.indexOf(onboardingData.stage);

    // If AI is asking Q2 (index 2), user answered Q1 (index 1)
    // If AI is asking Q1 (index 1), user might have answered 'welcome' conceptually, but we might not have a message for that.
    // Let's prevent undo if we are at the very first actual question stage (core_q1_product_value)
    if (currentAiQuestionStageIndex <= STAGE_SEQUENCE.indexOf('core_q1_product_value')) { 
      console.log("Undo: Cannot undo from the first question stage ('core_q1_product_value').");
      return;
    }

    const stageUserAnswered = STAGE_SEQUENCE[currentAiQuestionStageIndex - 1];
    const stageToDisplayQuestionFor = stageUserAnswered; // We want to show the question for the stage the user will now re-answer

    // Retrieve the user's answer for the stage they are undoing
    let previousUserInput = '';
    if (stageUserAnswered === 'core_q1_product_value') previousUserInput = onboardingData.answer_q1_product_value;
    else if (stageUserAnswered === 'core_q2_audience') previousUserInput = onboardingData.answer_q2_audience || '';
    else if (stageUserAnswered === 'core_q4_style') previousUserInput = onboardingData.answer_q4_style || '';
    else if (stageUserAnswered === 'core_q4_methodology') previousUserInput = onboardingData.answer_q4_methodology || ''; 
    // Note: If 'welcome' had an input, it would need to be handled here.

    const newMessages = messages.slice(0, -2); // Remove last AI question and last user answer
    
    let newOnboardingData = { ...onboardingData };
    newOnboardingData = clearAnswerForStage(newOnboardingData, stageUserAnswered);
    newOnboardingData.stage = stageToDisplayQuestionFor;

    setUserInput(previousUserInput); // Pre-fill input with the undone answer
    setMessages(newMessages);
    setOnboardingData(newOnboardingData);

    // Update lastAIQuestionText to the new last AI message (question for stageToDisplayQuestionFor)
    const newLastAiMsg = newMessages.filter(m => !m.isUser).pop();
    setLastAIQuestionText(newLastAiMsg ? newLastAiMsg.content : null);

    // Auto-resize textarea to fit the restored content
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, 0);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(newMessages));
    localStorage.setItem(STORAGE_KEYS.onboardingData, JSON.stringify(newOnboardingData));

    console.log(`Undo: Reverted to stage: ${stageToDisplayQuestionFor}. User input set to: '${previousUserInput}'.`);
  };

  // Modify the useEffect that adds the initial AI question to be robust
  useEffect(() => {
    if (
      !initialSetupDone.current && // Check the ref
      onboardingData.stage === 'welcome' && 
      messages.length === 0 &&            
      !isLoading
    ) {
      console.log("AISummaryCard: Initializing for 'welcome' stage, adding first AI question ('core_q1_product_value') and setting stage to core_q1_product_value.");
      addAIMessage(ONBOARDING_QUESTIONS.core_q1_product_value.question, true);
      setOnboardingData(prev => {
        console.log("[AISummaryCard useEffect] Updating stage from 'welcome' to 'core_q1_product_value'");
        return { ...prev, stage: 'core_q1_product_value' };
      });
      initialSetupDone.current = true; // Set the ref to true after setup
    }
  }, [onboardingData.stage, messages.length, isLoading, addAIMessage]); // Removed setOnboardingData

  // Render main component
  return (
    <>
      {showCompletionLoading && !isOnboardingActuallyFinished && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white">
          <div className="text-center p-6">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ 
                scale: [0.5, 1.1, 1],
                opacity: 1
              }}
              transition={{ 
                duration: 0.8,
                times: [0, 0.6, 1],
                ease: "easeOut"
              }}
            >
              <BrainCircuit className="h-16 w-16 text-primary mx-auto mb-6" />
            </motion.div>

            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-2xl font-semibold text-gray-800 mb-4"
            >
              {completionMessage}
            </motion.h2>

            <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 my-4 mx-auto">
              <motion.div 
                className="bg-primary h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${completionProgress}%` }}
                transition={{
                  duration: 0.25, // Smooth transition for progress updates
                  ease: "linear"
                }}
              />
            </div>
            <p className="text-sm text-gray-500">
              {Math.round(completionProgress)}%
            </p>
          </div>
        </div>
      )}

      {!isOnboardingActuallyFinished && (
        <div className="fixed inset-0 flex flex-row bg-gray-100"> {/* Main two-panel container */}
          
          {/* Left Panel: Onboarding Context */}
          <div className="w-1/3 bg-white p-8 shadow-lg overflow-y-auto space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-8">Your Onboarding Journey</h2>
            
            {STAGE_SEQUENCE.filter(stage => stage !== 'welcome' && stage !== 'complete').map((stageKey, index) => {
              const stageInfo = ONBOARDING_QUESTIONS[stageKey as keyof typeof ONBOARDING_QUESTIONS];
              const isCurrentStage = onboardingData.stage === stageKey;
              const currentStageIndexInSequence = STAGE_SEQUENCE.indexOf(onboardingData.stage);
              const thisStageIndexInSequence = STAGE_SEQUENCE.indexOf(stageKey);
              const isCompleted = currentStageIndexInSequence > thisStageIndexInSequence;

              return (
                <div key={stageKey} className={`p-4 rounded-lg transition-all duration-300 ${isCurrentStage ? 'bg-primary/10 border-l-4 border-primary' : isCompleted ? 'bg-green-50 border-l-4 border-green-500 opacity-70' : 'bg-gray-50 border-l-4 border-gray-300'}`}>
                  <h3 className={`text-lg font-semibold ${isCurrentStage ? 'text-primary' : isCompleted ? 'text-green-700' : 'text-gray-700'}`}>
                    {index + 1}. {stageInfo?.title || stageKey.replace('core_q', 'Question ').replace('_', ' ')}
                  </h3>
                  {isCurrentStage && stageInfo?.benefit && (
                    <p className="text-sm text-gray-600 mt-1">{stageInfo.benefit}</p>
                  )}
                  {isCompleted && (
                    <p className="text-sm text-green-600 mt-1">Completed</p>
                  )}
                </div>
              );
            })}
            {onboardingData.stage === 'complete' && (
               <div className="p-4 rounded-lg bg-green-50 border-l-4 border-green-500 mt-6">
                <h3 className="text-lg font-semibold text-green-700">Onboarding Complete!</h3>
                <p className="text-sm text-green-600 mt-1">You're all set to start practicing.</p>
               </div>
            )}
          </div>

          {/* Right Panel: Chat Interface */}
          <div className="w-2/3 h-full flex flex-col bg-white px-6 pt-16 pb-6"> {/* Changed pt-10 to pt-16 */}
            
            {/* Chat Interface container */}
            <div className="flex-grow flex flex-col min-h-0 rounded-lg overflow-hidden border border-gray-200 shadow-inner bg-white"> {/* Existing min-h-0 */}
              {/* Chat Messages area */}
              <div 
                ref={chatContainerRef}
                className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50" 
              >
                <AnimatePresence initial={false}>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <div 
                        className={cn(
                          "max-w-[75%] px-3 py-2 rounded-lg shadow-md text-base markdown-content whitespace-pre-wrap",
                          message.isUser ? 'bg-red-100 text-gray-900 rounded-br-none' : 'bg-green-100 text-black rounded-bl-none ai-chat-message',
                          "break-words"
                        )}
                        dangerouslySetInnerHTML={{ __html: marked.parse(message.content, { breaks: true }) }} 
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Input Area */}
              {ACTIVE_ONBOARDING_STAGES.includes(onboardingData.stage) && !isLoading && (
                <div className="p-4 border-t border-gray-200 bg-white">
                  <div className="flex items-center space-x-2">
                    <textarea
                      ref={textareaRef}
                      value={userInput}
                      onChange={(e) => {
                        setUserInput(e.target.value);
                        // Auto-resize textarea
                        if (textareaRef.current) {
                          textareaRef.current.style.height = 'auto';
                          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
                        }
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder={
                        onboardingData.stage === 'welcome' ? 'Tell us about your product or service...' :
                        waitingForFollowup ? followupQuestion :
                        `Your answer for ${ONBOARDING_QUESTIONS[onboardingData.stage as keyof typeof ONBOARDING_QUESTIONS]?.title || 'current step'}...`
                      }
                      className="flex-grow p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow duration-200 ease-in-out shadow-sm"
                      rows={1} // Start with 1 row, will auto-expand
                      style={{ maxHeight: '120px', overflowY: 'auto' }} // Max height and scroll for very long inputs
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={isLoading || userInput.trim() === ''}
                      className="bg-primary hover:bg-primary/90 text-white rounded-lg px-4 py-3 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      aria-label="Send message"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                    {messages.length >= 2 && ACTIVE_ONBOARDING_STAGES.includes(onboardingData.stage) && onboardingData.stage !== 'welcome' && (
                      <Button 
                        onClick={handleUndo} 
                        variant="outline" 
                        className="rounded-lg px-4 py-3 transition-all duration-200 ease-in-out shadow-sm hover:shadow-md flex items-center justify-center border-gray-300 hover:bg-gray-50"
                        aria-label="Undo last step"
                      >
                        <Undo2 className="h-5 w-5 text-gray-600" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {isLoading && (
                 <div className="p-4 border-t border-gray-200 bg-white flex items-center justify-center">
                   <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                   <p className="ml-3 text-sm text-gray-500">AI is thinking...</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AISummaryCard;

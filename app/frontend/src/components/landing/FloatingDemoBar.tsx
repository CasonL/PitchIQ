import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { NovaSonicInterface } from '../voice/NovaSonicInterface';

interface FloatingDemoBarProps {
  onDemoSubmit: (product: string) => void;
}

interface ChatMessage {
  id: number;
  text: string;
  isAI: boolean;
  isTyping?: boolean;
}

interface DemoScenario {
  context: string;
  prospectMessage: string;
  coachingPrompt: string;
  fallbackCoaching: string;
  learningPoint: string;
  technique?: {
    name: string;
    description: string;
    example: string;
  };
  excellentResponseExample?: string;
}

const FloatingDemoBar: React.FC<FloatingDemoBarProps> = ({ onDemoSubmit }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [product, setProduct] = useState('');
  const [showCard, setShowCard] = useState(false);
  const [showModeSelection, setShowModeSelection] = useState(false);
  const [submittedProduct, setSubmittedProduct] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [demoStep, setDemoStep] = useState(0);
  const [currentScenario, setCurrentScenario] = useState<DemoScenario | null>(null);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [hasSubmittedEmail, setHasSubmittedEmail] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isChatClosed, setIsChatClosed] = useState(false);
  const [savedProgress, setSavedProgress] = useState<{
    product: string;
    messages: ChatMessage[];
    step: number;
    scenario: DemoScenario | null;
    voiceMode: boolean;
    emailSubmitted: boolean;
  } | null>(null);
  const [hasAnimatedIn, setHasAnimatedIn] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [novaSonicStatus, setNovaSonicStatus] = useState<any>(null);

  // Check Nova Sonic status on component mount
  useEffect(() => {
    const checkNovaSonicStatus = async () => {
      try {
        const response = await fetch('/api/nova-sonic/status');
        if (response.ok) {
          const status = await response.json();
          setNovaSonicStatus(status);
        }
      } catch (error) {
        console.log('Nova Sonic not available:', error);
      }
    };
    
    checkNovaSonicStatus();
  }, []);

  // Handle voice input from Nova Sonic
  const handleVoiceInput = (transcript: string) => {
    if (transcript.trim()) {
      setUserInput(transcript);
      // Auto-submit the voice input
      setTimeout(() => {
        handleUserMessage();
      }, 500);
    }
  };

  // Get demo scenario based on product type
  const getDemoScenario = (productName: string): DemoScenario => {
    const productLower = productName.toLowerCase();
    
    // Fintech/Financial Services
    if (productLower.includes('fintech') || productLower.includes('financial') || 
        productLower.includes('accounting') || productLower.includes('payroll') ||
        productLower.includes('banking') || productLower.includes('payment')) {
      return {
        context: "Fintech call in progress! You're speaking with a CFO who just finished explaining their current financial processes. They mentioned trying a 'digital transformation' last year. There's a story here...",
        prospectMessage: "Look, your platform has all the features we need, I'll give you that. But we went through a 'digital transformation' last year with another fintech company. Took 8 months to implement, our accounting team was in chaos, and half of them still refuse to use it properly. Why should I put my team through that again?",
        coachingPrompt: "The user is selling fintech software to a CFO who had a traumatic implementation experience. The CFO mentioned 'accounting team was in chaos' and 'refuse to use it properly' - this indicates change management failure and user adoption trauma, not technical issues. The user's response was: '{userResponse}'. Analyze if they addressed the emotional trauma or just focused on technical features. Provide coaching feedback on what they missed.",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nYou missed the **emotional core**! The CFO mentioned *'chaos'* and team members *'refusing to use it'* - these are emotional wounds, not technical problems.\n\n**Instead of jumping to features, try acknowledging their pain first.**",
        learningPoint: "## 🎯 Key Learning\n\n**Remember:** When prospects share traumatic experiences, address the emotion before the logic. Their team's trust was broken - that's the real objection to overcome.",
        technique: {
          name: "Mirror & Validate",
          description: "When someone presents frustration like this, mirror their emotional state and validate their concerns before offering solutions.",
          example: "That sounds incredibly frustrating - 8 months of chaos would shake anyone's confidence. It makes complete sense that you'd be hesitant to put your team through that again. Can you tell me what went wrong with the training and support during that implementation?"
        },
        excellentResponseExample: "I can only imagine how frustrating that must have been - 8 months of chaos would shake anyone's confidence in new systems. It makes complete sense that you'd be hesitant to put your team through that again. Before we even talk about our platform, can you help me understand what specifically went wrong with the implementation and training? I want to make sure we're not even the right fit if we can't address those core issues."
      };
    }
    
    // Software/SaaS/Technology  
    if (productLower.includes('software') || productLower.includes('saas') || 
        productLower.includes('platform') || productLower.includes('app') ||
        productLower.includes('crm') || productLower.includes('erp')) {
      return {
        context: "Software demo call! You're presenting to a VP of Operations who's clearly frustrated with vendor promises...",
        prospectMessage: "Look, I've heard this pitch before. 'Revolutionary platform,' 'seamless integration,' 'intuitive interface' - every vendor says the exact same thing. Then we spend 6 months implementing, our productivity tanks, and I'm explaining to the CEO why we're over budget and behind schedule. Why should I believe you're any different?",
        coachingPrompt: "The prospect is expressing deep vendor fatigue and cynicism. They're quoting typical vendor language ('revolutionary platform,' 'seamless integration,' 'intuitive interface') and describing a pattern of disappointment. They're essentially saying 'prove you're not like every other vendor.' The user's response was: '{userResponse}'. Did they fall into the trap of making more vendor-like promises, or did they break the pattern by acknowledging their skepticism and taking a completely different approach?",
        fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey just told you they've heard the **same promises from every vendor**! If you respond with more promises or features, you're proving their point.\n\n**Break the pattern instead.**",
        learningPoint: "## 🎯 Key Learning\n\n**When prospects quote vendor language back at you,** they're showing you the pattern that's failed them. Don't add to it - **interrupt it completely.**",
        technique: {
          name: "Pattern Interrupt",
          description: "When prospects are stuck in a negative pattern from repeated vendor disappointments, acknowledge their skepticism directly and take a completely different approach than every other vendor.",
          example: "You know what? You're absolutely right to be skeptical. I'd feel exactly the same way after those experiences. Instead of giving you another pitch about how 'revolutionary' our platform is, can I ask what specifically went wrong with those implementations? I want to understand if we're even the right fit before we waste any more of your time."
        },
        excellentResponseExample: "You know what? You're absolutely right to be skeptical. I'd feel exactly the same way after those experiences. Instead of giving you another pitch about how 'revolutionary' our platform is, can I ask what specifically went wrong with those implementations? I want to understand if we're even the right fit before we waste any more of your time."
      };
    }
    
    // Default scenario for other products
    return {
      context: "Sales call in progress! Your prospect just shared a concern that reveals deeper issues...",
      prospectMessage: "I'm interested in what you're offering, but I need to be honest - we've tried similar solutions before and they didn't work out. The team wasn't happy with the change, and we ended up going back to our old way of doing things. What makes you think this time would be different?",
      coachingPrompt: "The prospect is sharing past failure and team resistance to change. The user's response was: '{userResponse}'. Did they explore the root cause of the previous failure or just pitch their product benefits?",
      fallbackCoaching: "## ⚠️ NEEDS WORK\n\nThey mentioned **team unhappiness** and *reverting to old ways* - that's a change management issue, not a product issue.\n\n**Dig deeper into what went wrong.**",
      learningPoint: "## 🎯 Key Learning\n\n**Past failures often reveal organizational challenges.** Understanding the *'why'* behind previous failures is more valuable than listing your features.",
      technique: {
        name: "Root Cause Analysis",
        description: "When prospects mention past failures, dig into the underlying reasons rather than assuming your product will be different.",
        example: "That's really valuable insight. It sounds like the team had a tough experience. Can you help me understand what specifically made them unhappy with the change? Was it the training, the workflow disruption, or something else entirely?"
      },
      excellentResponseExample: "That's really valuable insight, and I appreciate you being honest about it. It sounds like the team had a tough experience with change. Before I even mention our solution, can you help me understand what specifically made them unhappy? Was it the training process, the workflow disruption, lack of support, or something else entirely? I want to make sure we understand the root cause before discussing if we're even a good fit."
    };
  };

  // Call AI API for coaching feedback
  const getAICoaching = async (userResponse: string, scenario: DemoScenario): Promise<string> => {
    try {
      setIsAIResponding(true);
      const prompt = `${scenario.coachingPrompt.replace('{userResponse}', userResponse)}

Here's an example of an EXCELLENT response to this scenario:
"${scenario.excellentResponseExample}"

Compare the user's actual response to this excellent example. Analyze if the user's response:
1. EXCELLENT - Matches the quality and approach of the example (acknowledge pattern, show deep empathy, ask great questions, differentiate from other vendors)
2. GOOD - Shows some understanding but missed key elements
3. NEEDS_WORK - Fell into common traps or missed the main point

Format your response using markdown:
- If EXCELLENT: Use ## 🎉 EXCELLENT and explain specifically what they did right
- If GOOD: Use ## ✅ GOOD EFFORT and provide constructive feedback
- If NEEDS_WORK: Use ## ⚠️ NEEDS WORK and provide coaching with specific improvements

Use **bold** for key points and > blockquotes for example phrases. Keep under 100 words.`;
      
      const response = await fetch('/api/chat/coaching-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          maxTokens: 200
        }),
      });

      if (!response.ok) {
        throw new Error('API call failed');
      }

      const data = await response.json();
      return data.response || scenario.fallbackCoaching;
    } catch (error) {
      console.log('AI coaching failed, using fallback:', error);
      return scenario.fallbackCoaching;
    } finally {
      setIsAIResponding(false);
    }
  };

  // Call AI API for retry feedback
  const getRetryFeedback = async (userResponse: string, scenario: DemoScenario): Promise<string> => {
    try {
      setIsAIResponding(true);
      const prompt = `The user just tried again using the ${scenario.technique?.name} technique. Their retry response was: "${userResponse}". The original scenario was about a CFO who had a traumatic implementation experience with chaos and team resistance. 

Provide encouraging feedback on how their second attempt was better, focusing on what they did right this time. Format using markdown:
- Use ## ✅ MUCH BETTER! as the header
- Use **bold** for key improvements
- Use > blockquotes for good phrases they used
- Keep it positive and specific about the improvement`;
      
      const response = await fetch('/api/chat/coaching-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          maxTokens: 150
        }),
      });

      if (!response.ok) {
        throw new Error('API call failed');
      }

      const data = await response.json();
      return data.response || "## ✅ MUCH BETTER!\n\n**Great improvement!** You focused on understanding their experience rather than pushing features. That's exactly what the **Mirror & Validate** technique is about!";
    } catch (error) {
      console.log('AI retry feedback failed, using fallback:', error);
      return "## ✅ MUCH BETTER!\n\n**Great improvement!** You focused on understanding their experience rather than pushing features. That's exactly what the **Mirror & Validate** technique is about!";
    } finally {
      setIsAIResponding(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const windowHeight = window.innerHeight;
      const threshold = windowHeight * 0.15; // Show after 15% scroll
      
      const shouldBeVisible = scrolled > threshold;
      setIsVisible(shouldBeVisible);
      
      // Trigger fade-in animation when first becoming visible
      if (shouldBeVisible && !hasAnimatedIn) {
        setTimeout(() => setHasAnimatedIn(true), 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasAnimatedIn]);

  // Prevent body scroll when demo card is open
  useEffect(() => {
    if (showCard) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCard]);

  const saveProgress = () => {
    setSavedProgress({
      product: submittedProduct,
      messages: messages,
      step: demoStep,
      scenario: currentScenario,
      voiceMode: isVoiceMode,
      emailSubmitted: hasSubmittedEmail
    });
  };

  const restoreProgress = () => {
    if (savedProgress) {
      setSubmittedProduct(savedProgress.product);
      setMessages(savedProgress.messages);
      setDemoStep(savedProgress.step);
      setCurrentScenario(savedProgress.scenario);
      setIsVoiceMode(savedProgress.voiceMode);
      setHasSubmittedEmail(savedProgress.emailSubmitted);
      setShowCard(true);
      setIsChatClosed(false);
    }
  };

  const closeChat = () => {
    saveProgress();
    setIsChatClosed(true);
  };

  const typeMessage = (text: string, isAI: boolean) => {
    return new Promise<void>((resolve) => {
      const messageId = Date.now();
      setMessages(prev => [...prev, { id: messageId, text: '', isAI, isTyping: true }]);
      
      let currentText = '';
      let index = 0;
      
      const typeInterval = setInterval(() => {
        if (index < text.length) {
          currentText += text[index];
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, text: currentText } : msg
          ));
          index++;
        } else {
          setMessages(prev => prev.map(msg => 
            msg.id === messageId ? { ...msg, isTyping: false } : msg
          ));
          clearInterval(typeInterval);
          resolve();
        }
      }, 30);
    });
  };

  // Add user message instantly without typing animation
  const addUserMessage = (text: string) => {
    const messageId = Date.now();
    setMessages(prev => [...prev, { 
      id: messageId, 
      text: text, 
      isAI: false, 
      isTyping: false 
    }]);
  };

  const startDemo = async (productName: string) => {
    const scenario = getDemoScenario(productName);
    setMessages([]);
    setDemoStep(0);
    
    // Start with AI's first message (intro)
    await new Promise(resolve => setTimeout(resolve, 1000));
    await typeMessage(scenario.context, true);
    
    // Wait a bit, then automatically show the second message (conversation starter)
    await new Promise(resolve => setTimeout(resolve, 1500));
            // Don't show prospect message as text in voice mode - it will be spoken via ElevenLabs
        if (!isVoiceMode) {
          await typeMessage(scenario.prospectMessage, true);
        }
    setDemoStep(1);
    setCurrentScenario(scenario);
  };

  const handleUserMessage = async () => {
    if (!userInput.trim()) return;
    
    const currentMessage = userInput.trim();
    setUserInput('');
    
    // Add user message instantly (no typing animation for user messages)
    addUserMessage(currentMessage);
    
    // Wait a bit before AI responds
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (demoStep === 1 && currentScenario) {
      // First user response - get AI coaching
      const coachingResponse = await getAICoaching(currentMessage, currentScenario);
      await typeMessage(coachingResponse, true);
      
      // Check if the response was excellent (contains celebration emojis)
      const isExcellentResponse = coachingResponse.includes('🎉') || 
                                 coachingResponse.toLowerCase().includes('excellent') ||
                                 coachingResponse.toLowerCase().includes('perfect') ||
                                 coachingResponse.toLowerCase().includes('nailed it');
      
      if (isExcellentResponse) {
        // For excellent responses, skip technique teaching and go straight to advanced tips
        await new Promise(resolve => setTimeout(resolve, 1500));
        await typeMessage("## 🚀 OUTSTANDING!\n\nYou clearly understand **advanced sales psychology!** You naturally used the right approach without needing coaching. That's the kind of emotional intelligence that separates **top performers** from average salespeople.", true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        await typeMessage("## 🎯 Ready for More?\n\n**Ready to master even more advanced techniques like this?** PitchIQ has dozens of scenarios and techniques to help you become a sales superstar!", true);
        setDemoStep(4); // Skip to completion
      } else {
        // For responses that need work, teach the technique
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (currentScenario.technique) {
          const techniqueMessage = `## 🎯 ${currentScenario.technique.name} Technique

${currentScenario.technique.description}

### Here's how you could have responded:

> "${currentScenario.technique.example}"

**Want to try again with this technique?** Type "restart" to practice!

**Want a deeper breakdown of this technique?** Type "deep dive" for advanced analysis!`;
          await typeMessage(techniqueMessage, true);
          setDemoStep(2); // Move to retry phase
        }
      }
    } else if (demoStep === 2 && currentScenario) {
      // Check if they want to restart or deep dive
      if (currentMessage.toLowerCase().includes('restart') || currentMessage.toLowerCase().includes('try again')) {
        await typeMessage("## 🔄 Awesome! Let's Practice More\n\n**To unlock unlimited practice scenarios and advanced coaching,** let's get you signed up first!", true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        onDemoSubmit(submittedProduct); // Trigger waitlist signup
        setHasSubmittedEmail(true);
        setDemoStep(4); // Move to completion
      } else if (currentMessage.toLowerCase().includes('deep dive') || currentMessage.toLowerCase().includes('breakdown') || currentMessage.toLowerCase().includes('analysis') || currentMessage.toLowerCase().includes('more details') || currentMessage.toLowerCase().includes('explain more')) {
        await typeMessage("## 🧠 Deep Dive Analysis\n\n**Great choice!** Advanced technique breakdowns, psychology insights, and detailed coaching are available in the full **PitchIQ** experience.", true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        await typeMessage("## 🚀 Ready to Master Sales Psychology?\n\nLet's get you access to **dozens of techniques, scenarios, and deep-dive analyses** that will transform your sales conversations!", true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        onDemoSubmit(submittedProduct); // Trigger waitlist signup
        setHasSubmittedEmail(true);
        setDemoStep(4); // Move to completion
      } else {
        // Second response - show learning point and wrap up
        await typeMessage(currentScenario.learningPoint, true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await typeMessage("## 🎉 Great Job!\n\nThis is just a taste of what **PitchIQ** can teach you. Ready to improve your sales conversations?", true);
        setDemoStep(4);
      }
    } else if (demoStep === 3 && currentScenario) {
      // Retry attempt - provide encouraging feedback
      const retryFeedback = await getRetryFeedback(currentMessage, currentScenario);
      await typeMessage(retryFeedback, true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      await typeMessage("## 🎉 Much Better!\n\nYou can see how using **specific techniques** transforms your conversations. Ready to master more sales skills with **PitchIQ**?", true);
      setDemoStep(4);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product.trim()) return;
    
    setSubmittedProduct(product);
    setIsExpanding(true);
    
    // Trigger expansion animation to show mode selection
    setTimeout(() => {
      setShowModeSelection(true);
      setIsExpanding(false);
    }, 300);
    
    // Don't call onDemoSubmit here - only call it when demo is complete
  };

  const handleModeSelection = (voiceMode: boolean) => {
    setIsVoiceMode(voiceMode);
    setShowModeSelection(false);
    setShowCard(true);
    
    // Generate the scenario for both modes
    const scenario = getDemoScenario(submittedProduct);
    setCurrentScenario(scenario);
    
    if (!voiceMode) {
      // For text mode, start the demo flow with typing animations
      startDemo(submittedProduct);
    }
    // For voice mode, just show the interface with the scenario set
  };

  if (!isVisible) return null;

  return (
    <React.Fragment>
      {/* Background overlay with blur when demo is active */}
      {showCard && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          style={{ backdropFilter: 'blur(8px)' }}
        />
      )}
      
      <div className={`fixed bottom-8 left-0 right-0 z-50 pointer-events-none transition-opacity duration-700 ${hasAnimatedIn ? 'opacity-100' : 'opacity-0'}`}>
        <div className="mx-auto pointer-events-auto">
          {isChatClosed && savedProgress ? (
            // Continue button when chat is closed
            <div className="flex justify-center">
              <button
                onClick={restoreProgress}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-semibold hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
              >
                Continue Demo
              </button>
            </div>
          ) : showModeSelection ? (
            // Mode selection card
            <div className="w-full max-w-lg mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-red-500 px-6 py-4">
                <h3 className="text-white font-semibold text-lg">Choose Your Demo Mode</h3>
                <p className="text-white/90 text-sm">Product: {submittedProduct}</p>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-gray-600 text-center mb-6">
                  How would you like to practice your sales conversation?
                </p>
                
                <div className="space-y-3">
                  {/* Text Mode Option */}
                  <button
                    onClick={() => handleModeSelection(false)}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-red-100 transition-colors">
                        <svg className="w-6 h-6 text-blue-600 group-hover:text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold text-gray-900 group-hover:text-red-600">💬 Text Chat</h4>
                        <p className="text-sm text-gray-600">Type your responses and get instant coaching feedback</p>
                      </div>
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Voice Mode Option */}
                  <button
                    onClick={() => handleModeSelection(true)}
                    disabled={!novaSonicStatus?.available}
                    className={`w-full p-5 border-2 rounded-2xl transition-all duration-200 group ${
                      novaSonicStatus?.available 
                        ? 'border-gray-200 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:shadow-lg' 
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
                        novaSonicStatus?.available 
                          ? 'bg-gradient-to-br from-blue-100 to-indigo-100 group-hover:from-blue-200 group-hover:to-indigo-200 group-hover:scale-110' 
                          : 'bg-gray-100'
                      }`}>
                        <svg className={`w-7 h-7 transition-colors ${
                          novaSonicStatus?.available 
                            ? 'text-blue-600 group-hover:text-blue-700' 
                            : 'text-gray-400'
                        }`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                        </svg>
                        {/* Voice indicator waves */}
                        {novaSonicStatus?.available && (
                          <div className="absolute -inset-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-full h-full rounded-full border-2 border-blue-300 animate-ping"></div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className={`font-bold text-lg transition-colors ${
                            novaSonicStatus?.available 
                              ? 'text-gray-900 group-hover:text-blue-700' 
                              : 'text-gray-500'
                          }`}>
                            🎤 Voice Chat
                          </h4>
                          {novaSonicStatus?.available ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Unavailable
                            </span>
                          )}
                        </div>
                        <p className={`text-sm leading-relaxed ${
                          novaSonicStatus?.available 
                            ? 'text-gray-600 group-hover:text-gray-700' 
                            : 'text-gray-400'
                        }`}>
                          {novaSonicStatus?.available 
                            ? 'Speak naturally and get real-time AI coaching with voice responses powered by Amazon Nova Sonic' 
                            : 'Voice mode requires AWS Nova Sonic configuration. Using text mode instead.'
                          }
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          novaSonicStatus?.available 
                            ? 'bg-blue-100 group-hover:bg-blue-200' 
                            : 'bg-gray-100'
                        }`}>
                          <svg className={`w-4 h-4 transition-colors ${
                            novaSonicStatus?.available 
                              ? 'text-blue-600 group-hover:text-blue-700' 
                              : 'text-gray-400'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : !showCard ? (
            // Floating input bar
            <div className={`transition-all duration-300 ${isExpanding ? 'transform scale-110 opacity-0' : ''}`}>
              <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">
                <form onSubmit={handleSubmit}>
                  <input
                    type="text"
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="What are you selling?"
                    className="w-full px-4 py-2 rounded-full bg-white border border-black/20 shadow-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-black/30 transition-all duration-200"
                  />
                </form>
                <div className="text-center mt-1.5">
                  <div className="inline-block px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs text-black font-medium border border-black/10">
                    Press Enter for instant demo • Sign up free
                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Demo card
            <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
              <div className="bg-red-500 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-lg">AI Sales Coach Demo</h3>
                    <p className="text-white/90 text-sm">Product: {submittedProduct}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {isAIResponding && (
                      <div className="text-white text-sm">
                        AI thinking...
                      </div>
                    )}
                    <div className="text-white/90 text-sm">
                      {isVoiceMode ? '🎤 Voice Mode' : '💬 Text Mode'}
                    </div>
                    <button
                      onClick={closeChat}
                      className="ml-2 p-1 hover:bg-red-400/20 rounded-full transition-colors"
                      title="Close chat"
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="h-[500px] flex flex-col">
                {isVoiceMode && novaSonicStatus?.available ? (
                  <div className="flex flex-col h-full">
                    {/* Single context message at the top */}
                    <div className="px-6 pt-4 pb-2">
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                            <span className="text-blue-700 text-sm">🎯</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Sales Training Scenario</p>
                            <p className="text-sm text-blue-800 leading-relaxed">
                              {currentScenario?.context || "Sales call in progress! Your prospect just shared a concern that reveals deeper issues..."}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Main voice interface - takes remaining space */}
                    <div className="flex-1 px-6 pb-4">
                      <NovaSonicInterface 
                        onTranscript={handleVoiceInput}
                        isListening={isListening}
                        onListeningChange={setIsListening}
                        scenario={currentScenario}
                        compact={true}
                        hideContext={true}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto p-6 space-y-4 h-full">
                    {messages.map((message) => (
                      <div key={message.id} className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                          message.isAI 
                            ? 'bg-gray-100 text-gray-800' 
                            : 'bg-red-500 text-white'
                        }`}>
                          {message.isTyping ? (
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          ) : (
                            <div className="text-sm prose prose-sm max-w-none">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                  em: ({ children }) => <em className="italic">{children}</em>,
                                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                                  li: ({ children }) => <li className="mb-1">{children}</li>,
                                  h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                                  code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                                  blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600 mb-2">{children}</blockquote>
                                }}
                              >
                                {message.text}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {demoStep > 0 && demoStep < 4 && !isVoiceMode && (
                <div className="border-t border-gray-200 p-4">
                  <form onSubmit={(e) => { e.preventDefault(); handleUserMessage(); }} className="flex space-x-3">
                    <input
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Type your response..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      disabled={isAIResponding}
                    />
                    <button
                      type="submit"
                      disabled={!userInput.trim() || isAIResponding}
                      className="px-6 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}
              
              {demoStep === 4 && (
                <div className="border-t border-gray-200 p-4 text-center">
                  <button
                    onClick={() => {
                      if (!hasSubmittedEmail) {
                        onDemoSubmit(submittedProduct); // Trigger waitlist signup if not already done
                      }
                      window.location.href = '/auth/register';
                    }}
                    className="px-8 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-full font-semibold hover:from-red-600 hover:to-pink-600 transition-all transform hover:scale-105"
                  >
                    {hasSubmittedEmail ? 'Continue to App' : 'Start Free Trial'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </React.Fragment>
  );
};

export default FloatingDemoBar; 
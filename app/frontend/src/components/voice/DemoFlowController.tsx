import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSamCoachAgent } from './samcoach/useSamCoachAgent';
import { 
  DemoFlowState, 
  SAM_DIALOGUE,
  getDialogueVariation,
  detectUserIntent,
  getFallback,
  SAM_PERSONALITY
} from './samDialogue';

interface DemoFlowControllerProps {
  onStateChange?: (state: DemoFlowState) => void;
  onProductCollected?: (product: string) => void;
  onTargetMarketCollected?: (market: string) => void;
  onPersonaGenerated?: (persona: any) => void;
  onCallStart?: () => void;
}

export const DemoFlowController: React.FC<DemoFlowControllerProps> = ({
  onStateChange,
  onProductCollected,
  onTargetMarketCollected,
  onPersonaGenerated,
  onCallStart
}) => {
  const [currentState, setCurrentState] = useState<DemoFlowState>('idle');
  const [userProduct, setUserProduct] = useState<string>('');
  const [userTargetMarket, setUserTargetMarket] = useState<string>('');
  const [lastUserUtterance, setLastUserUtterance] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  
  const noResponseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const stateRef = useRef<DemoFlowState>('idle');
  
  // Update ref when state changes (for use in callbacks)
  useEffect(() => {
    stateRef.current = currentState;
  }, [currentState]);

  /**
   * Transition to a new state and trigger Sam's dialogue
   */
  const transitionToState = useCallback((newState: DemoFlowState) => {
    console.log(`🎯 [DemoFlow] Transitioning: ${stateRef.current} → ${newState}`);
    setCurrentState(newState);
    onStateChange?.(newState);
    
    // Get dialogue for this state (with random variation)
    const dialogue = getDialogueVariation(newState);
    
    // Apply page effects
    if (dialogue.pageEffect) {
      applyPageEffect(dialogue.pageEffect);
    }
    
    // Scroll to section
    if (dialogue.scrollTo) {
      scrollToSection(dialogue.scrollTo);
    }
    
    // Speak Sam's line (if not silent transition)
    if (dialogue.text) {
      speakSamDialogue(dialogue.text, dialogue.audioHint);
    }
    
    // Set up auto-advance if needed
    if (dialogue.autoAdvanceDelay) {
      setTimeout(() => {
        if (stateRef.current === newState) { // Only advance if still in same state
          transitionToState(dialogue.nextState);
        }
      }, dialogue.autoAdvanceDelay);
    }
    
    // Set up no-response fallback
    if (dialogue.waitForUser) {
      setupNoResponseFallback();
    }
  }, [onStateChange]);

  /**
   * Handle user speech input
   */
  const handleUserSpeech = useCallback((utterance: string) => {
    console.log(`🎤 [DemoFlow] User said: "${utterance}" in state: ${stateRef.current}`);
    setLastUserUtterance(utterance);
    
    // Clear no-response timer
    if (noResponseTimerRef.current) {
      clearTimeout(noResponseTimerRef.current);
      noResponseTimerRef.current = null;
    }
    
    const state = stateRef.current;
    
    switch (state) {
      case 'awaiting_path_choice':
        handlePathChoice(utterance);
        break;
        
      case 'asking_product':
        handleProductResponse(utterance);
        break;
        
      case 'asking_target_market':
        handleTargetMarketResponse(utterance);
        break;
        
      case 'offering_customization':
        handleCustomizationChoice(utterance);
        break;
        
      default:
        console.log(`⚠️ [DemoFlow] Unexpected user input in state: ${state}`);
    }
  }, []);

  /**
   * Handle path choice (tour vs demo)
   */
  const handlePathChoice = useCallback((utterance: string) => {
    const intent = detectUserIntent(utterance);
    
    if (intent === 'tour') {
      transitionToState('educational_tour_intro');
    } else if (intent === 'demo') {
      transitionToState('asking_product');
    } else {
      // Didn't understand - ask again
      speakSamDialogue(getFallback('didntCatch'));
    }
  }, [transitionToState]);

  /**
   * Handle product/service response
   */
  const handleProductResponse = useCallback((utterance: string) => {
    if (utterance.length < 3) {
      speakSamDialogue("Sorry, I didn't catch that. What do you sell?");
      return;
    }
    
    setUserProduct(utterance);
    onProductCollected?.(utterance);
    transitionToState('asking_target_market');
  }, [transitionToState, onProductCollected]);

  /**
   * Handle target market response
   */
  const handleTargetMarketResponse = useCallback((utterance: string) => {
    if (utterance.length < 3) {
      speakSamDialogue("Could you repeat that? Who's your ideal customer?");
      return;
    }
    
    setUserTargetMarket(utterance);
    onTargetMarketCollected?.(utterance);
    transitionToState('offering_customization');
  }, [transitionToState, onTargetMarketCollected]);

  /**
   * Handle customization choice
   */
  const handleCustomizationChoice = useCallback((utterance: string) => {
    const intent = detectUserIntent(utterance);
    
    if (intent === 'skip' || intent === 'demo') {
      // Skip customization, go straight to generation
      generatePersona();
    } else if (intent === 'customize') {
      // Show customization UI (handled by parent component)
      console.log('🎨 [DemoFlow] User wants customization options');
    } else {
      // Default: assume they want to skip
      generatePersona();
    }
  }, []);

  /**
   * Generate persona and start call
   */
  const generatePersona = useCallback(() => {
    transitionToState('generating_persona');
    
    // Call API to generate persona
    fetch('/api/personas/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_or_service: userProduct,
        target_market: userTargetMarket,
        archetype_id: 'the_charmer', // Default to The Charmer for demo
      })
    })
      .then(res => res.json())
      .then(data => {
        console.log('✅ [DemoFlow] Persona generated:', data);
        onPersonaGenerated?.(data.persona);
        
        // Short delay, then hand off to call
        setTimeout(() => {
          transitionToState('handing_off_to_charmer');
          onCallStart?.();
        }, 2000);
      })
      .catch(err => {
        console.error('❌ [DemoFlow] Persona generation failed:', err);
        speakSamDialogue("Oops, something went wrong. Let me try that again...");
      });
  }, [userProduct, userTargetMarket, transitionToState, onPersonaGenerated, onCallStart]);

  /**
   * Set up fallback if user doesn't respond
   */
  const setupNoResponseFallback = useCallback(() => {
    if (noResponseTimerRef.current) {
      clearTimeout(noResponseTimerRef.current);
    }
    
    noResponseTimerRef.current = setTimeout(() => {
      console.log('⏰ [DemoFlow] No response timeout');
      speakSamDialogue(getFallback('noResponse'));
      
      // Set up another timer for extended silence
      noResponseTimerRef.current = setTimeout(() => {
        console.log('⏰⏰ [DemoFlow] Extended silence - defaulting to demo');
        transitionToState('asking_product');
      }, 15000);
    }, 10000);
  }, [transitionToState]);

  /**
   * Speak Sam's dialogue using TTS
   */
  const speakSamDialogue = useCallback((text: string, audioHint?: string) => {
    console.log(`🗣️ [Sam] "${text}"${audioHint ? ` (hint: ${audioHint})` : ''}`);
    
    // TODO: Integrate with actual TTS system
    // For now, log to console and potentially display in UI
    
    // This will be replaced with:
    // - Deepgram TTS call
    // - Audio playback
    // - Transcript display with Sam's personality
  }, []);

  /**
   * Apply visual page effects
   */
  const applyPageEffect = useCallback((effect: string) => {
    console.log(`✨ [DemoFlow] Applying page effect: ${effect}`);
    
    switch (effect) {
      case 'blur':
        document.body.classList.add('demo-blur-background');
        break;
      case 'unblur':
        document.body.classList.remove('demo-blur-background');
        break;
      case 'highlight-personas':
        // Highlight persona cards with animation
        document.querySelectorAll('.persona-card').forEach(card => {
          card.classList.add('demo-highlighted');
        });
        break;
    }
  }, []);

  /**
   * Smooth scroll to a section
   */
  const scrollToSection = useCallback((sectionId: string) => {
    console.log(`📜 [DemoFlow] Scrolling to: ${sectionId}`);
    
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }, []);

  /**
   * Public API - start the demo
   */
  const startDemo = useCallback(() => {
    console.log('🚀 [DemoFlow] Starting demo flow!');
    transitionToState('greeting');
  }, [transitionToState]);

  /**
   * Public API - reset the demo
   */
  const resetDemo = useCallback(() => {
    console.log('🔄 [DemoFlow] Resetting demo');
    setCurrentState('idle');
    setUserProduct('');
    setUserTargetMarket('');
    setLastUserUtterance('');
    document.body.classList.remove('demo-blur-background');
    document.querySelectorAll('.demo-highlighted').forEach(el => {
      el.classList.remove('demo-highlighted');
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (noResponseTimerRef.current) {
        clearTimeout(noResponseTimerRef.current);
      }
    };
  }, []);

  return {
    currentState,
    startDemo,
    resetDemo,
    handleUserSpeech,
    isListening,
    userProduct,
    userTargetMarket,
    lastUserUtterance
  };
};

/**
 * Hook version for easy integration
 */
export const useDemoFlowController = (props: DemoFlowControllerProps = {}) => {
  return DemoFlowController(props);
};

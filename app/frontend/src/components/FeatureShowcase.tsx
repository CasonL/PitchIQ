import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Users, Target, BrainCircuit, CheckCircle, AlertTriangle, Trophy, X, Loader2 } from 'lucide-react';
import { FaMousePointer } from 'react-icons/fa';

const featureVisuals = [
  {
    id: 'adapt',
    triggerHeading: "Adapts to Your World",
    icon: <Target size={48} className="text-blue-600 transition-colors duration-500" />,
    accentColor: 'bg-blue-500',
    textColor: 'text-blue-800',
    detailIcons: [
        <Target key="t" size={20} className="text-gray-500" />,
        <Zap key="z" size={20} className="text-gray-500" />
    ],
    label: "Personalized Setup"
  },
  {
    id: 'personas',
    triggerHeading: "Faces Realistic AI Buyers",
    icon: <Users size={48} className="text-green-600 transition-colors duration-500" />,
    accentColor: 'bg-green-500',
    textColor: 'text-green-800',
    detailIcons: [],
    label: "Dynamic Personalities"
  },
  {
    id: 'feedback',
    triggerHeading: "Gets Actionable Feedback",
    icon: <BrainCircuit size={48} className="text-purple-600 transition-colors duration-500" />,
    accentColor: 'bg-purple-500',
    textColor: 'text-purple-800',
    detailIcons: [
        <CheckCircle key="c" size={20} className="text-gray-500" />,
        <AlertTriangle key="a" size={20} className="text-gray-500" />,
        <Trophy key="t" size={20} className="text-gray-500" />
    ],
    label: "Insightful Analysis"
  },
];

const AnimatedVisual = ({ featureId }: { featureId: string }) => {
    const activeFeature = featureVisuals.find(f => f.id === featureId) || featureVisuals[0];
    const accentColor = activeFeature.accentColor || 'bg-gray-300';
    const textColor = activeFeature.textColor || 'text-gray-800';

    return (
        <div className={`shadow-xl transition-all duration-500 ease-in-out p-6 flex flex-col items-center justify-center text-center min-h-[300px] aspect-square relative rounded-lg bg-white border border-gray-200`}>
            <div className={`absolute top-2 right-2 px-2 py-0.5 text-xs font-medium text-white rounded-full ${accentColor}`}> 
                 {activeFeature.label}
             </div>

            <div className="mb-4">
                 {activeFeature.icon}
             </div>
             
             <div className="flex gap-4 mt-4 h-6 items-center">
                {featureVisuals.map(f => (
                     <div 
                         key={`${f.id}-details`} 
                         className={`flex gap-3 transition-opacity duration-500 ${activeFeature.id === f.id ? 'opacity-100' : 'opacity-0 absolute'}`}
                     >
                         {f.detailIcons.map((icon, idx) => 
                             <span key={idx} className="transition-transform duration-500 ease-out transform hover:scale-110">{icon}</span>
                         )}
                     </div>
                 ))}
             </div>
            
            <p className={`mt-4 text-sm font-semibold ${textColor}`}>
                {activeFeature.triggerHeading}
            </p>
        </div>
    );
};

// Revised static content data with new copy
const staticContentData = [
  {
    id: 'guru',
    heading: "Tailored<br /> Scenarios",
    text: "Adapts to your <strong>industry</strong> and <strong>ideal customer</strong>.<br />Answer a few questions to generate personas<br /><strong>tailored</strong> to your <strong>unique needs</strong>."
  },
  {
    id: 'match',
    heading: "Life-like<br /> AI Personas",
    text: "AI simulates <strong>complex B2B & B2C personas</strong><br />with personalities, objections, and pain points.<br /><strong>Problem solve</strong> through challenging scenarios."
  },
  {
    id: 'results',
    heading: "Performance<br /> Analysis",
    text: "<strong>Analyze key moments</strong>, emotional intelligence,<br />and sales strategies, instantly providing<br /><strong>actionable insights</strong> and <strong>tailored recommendations</strong>."
  },
  {
    id: 'edge',
    heading: "Master<br /> Objections",
    text: "Handle your calls with <strong>confidence</strong>.<br />Effectively deal with <strong>competitor mentions</strong> and<br /><strong>industry objections</strong>."
  },
  {
    id: 'practice',
    heading: "Differentiate<br /> Your Offer",
    text: "<strong>Test your industry knowledge</strong>, practice refining<br />your responses, and <strong>differentiate your offer</strong><br />through tailored recommendations."
  },
];

// Add new view state
type DemoView = 'initial' | 'loading' | 'loadingComplete' | 'feedback' | 'dashboard' | 'tailoring' | 'finalCheckmark' | 'pitchiqText';

// --- Animation Variants ---
const viewVariants = {
  initial: { 
    exit: { opacity: 0, transition: { duration: 0.15 } },
    enter: { opacity: 1, scale: 1, transition: { duration: 0.2 }}
  },
  loading: {
    enter: { opacity: 1, scale: [0.9, 1.05, 1], y: [-15, 0], transition: { duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: 15, scale: 0.95, transition: { duration: 0.2, ease: "easeIn" } },
    initial: { opacity: 0, y: -15 }
  },
  loadingComplete: {
    enter: { opacity: 1, transition: { duration: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
    initial: { opacity: 0 }
  },
  feedback: { 
    enter: { opacity: 1, transition: { duration: 0.3, delay: 0.1 } },
    exit: { opacity: 0, transition: { duration: 0.2 } }, 
    initial: { opacity: 0 }
  },
  dashboard: { enter: { opacity: 1, transition: { duration: 0.5, delay: 0.1 } }, exit: { opacity: 0, transition: { duration: 0.2 } }, initial: { opacity: 0 } },
  poppy: {
    initial: { opacity: 0, scale: 0.8 },
    enter: {
      opacity: 1,
      scale: [0.8, 1.25, 1],
      transition: { stiffness: 500, damping: 20, duration: 0.7, ease: "easeInOut" } 
    }
  }
};

// Variant for the checkmark icon itself
const checkmarkVariant = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
        scale: [0, 1.3, 1], 
        opacity: 1,
        transition: { duration: 0.4, ease: "backOut" } // Slightly faster checkmark pop
    }
};

const mouseVariants = {
    initial: { 
        opacity: 0, scale: 0.8, 
        top: '65%', left: '40%', // Calculated position for lower-left of initial card
        x: '-50%', y: '-50%' // Center the element at this point
    },
    animate: { 
        opacity: 1, scale: 1, 
        top: '65%', left: '50%', 
        x: '-50%', y: '-50%',
        transition: { duration: 0.8, ease: 'easeInOut' } 
    },
    click: { 
        scale: [1, 0.85, 1], 
        top: '65%', left: '50%', 
        x: '-50%', y: '-50%',
        transition: { duration: 0.25 } 
    },
    clickedAndWaiting: { 
      opacity: 0,
      scale: 1,
      top: '65%', left: '50%', 
      x: '-50%', y: '-50%',
      transition: { duration: 0.2, delay: 0.1 }
    },
    moveToX: { 
        opacity: 1, scale: 1, 
        top: '4%', right: '3%',
        bottom: 'auto', left: 'auto', x: '0%', y: '0%', 
        transition: { duration: 0.6, ease: 'easeInOut' } 
    },
    clickX: { 
        scale: [1, 0.85, 1], 
        top: '4%', right: '3%',
        bottom: 'auto', left: 'auto', x: '0%', y: '0%',
        transition: { duration: 0.25 }
    },
    hide: { 
        opacity: 0,
        top: '4%', right: '3%',
        bottom: 'auto', left: 'auto', x: '0%', y: '0%',
        transition: { duration: 0.05 }
    }
};

// Add variants for the X button pop
const xButtonVariants = {
    idle: { scale: 1 },
    popping: {
        scale: [1, 1.3, 1], // Pop effect
        transition: { duration: 0.25, ease: 'easeOut' }
    }
};

// Add variants for the initial button press
const initialButtonVariants = {
    idle: { scale: 1 },
    pressed: {
        scale: [1, 0.9, 1], // Press effect
        transition: { duration: 0.2, ease: 'easeOut' }
    }
};

// Variants for the animating container
const containerVariants = {
    initialVisible: { opacity: 1, width: '280px', height: '280px', scale: 1, top: '50%', left: '50%', x: '-50%', y: '-50%', borderRadius: '12px', rotateY: 0, transition: { duration: 0.8, ease: 'easeInOut' } },
    shrinking: { 
        scale: 0.95, 
        width: '280px', height: '280px', 
        top: '50%', left: '50%', x: '-50%', y: '-50%', borderRadius: '12px',
        rotateY: 0,
        transition: { duration: 0.15, ease: 'easeInOut' } 
    },
    expanding: { opacity: 1, scale: 1, width: '100%', height: '100%', top: '50%', left: '50%', x: '-50%', y: '-50%', borderRadius: '8px', rotateY: 0, transition: { duration: 0.3, ease: 'circOut' } },
    popping: {
        scale: 1.05,
        rotateY: 0,
        transition: { duration: 0.15, ease: 'easeOut' }
    },
    flipping: {
        rotateY: -180,
        transition: { duration: 0.8, ease: 'easeInOut' }
    }
}
// -----------------------

// Restore flipping state, remove fullFlip
type ContainerAnimState = 'initialVisible' | 'shrinking' | 'expanding' | 'popping' | 'flipping';

// Add new mouse states
type MouseState = 'initial' | 'animate' | 'click' | 'clickedAndWaiting' | 'moveToX' | 'clickX' | 'hide';

// Loading phrases (shortened)
const LOADING_PHRASES = [
    "Analysing Performance...", 
    "Assessing Rapport...",
    "Preparing Next Steps..."
];
const LOADING_INTERVAL_MS = 1500; // Faster interval
const TOTAL_LOADING_DURATION_MS = LOADING_PHRASES.length * LOADING_INTERVAL_MS; // Faster total (4500ms)
const CHECKMARK_ANIMATION_DURATION_MS = 500; // Faster checkmark appearance

const FeatureShowcase = () => {
  const [view, setView] = useState<DemoView>('initial');
  const [mouseState, setMouseState] = useState<MouseState>('initial');
  const [containerAnimState, setContainerAnimState] = useState<ContainerAnimState>('initialVisible');
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [isXClicked, setIsXClicked] = useState(false);
  const [isInitialButtonClicked, setIsInitialButtonClicked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Timer Refs ---
  // Effect 1
  const startTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 2b
  const shrinkDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 3
  const popOutTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 4
  const textIntervalRef = useRef<NodeJS.Timeout | null>(null); // Note: setInterval returns NodeJS.Timeout too
  const loadingCompleteTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 5
  const expansionTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 6
  const viewTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 7
  const moveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const postMovePauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickAndButtonTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerPopDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hideMouseTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 8
  const shrinkTimerRef = useRef<NodeJS.Timeout | null>(null);
  // New timer refs for revised Effect 7
  const clickStartTimerRef = useRef<NodeJS.Timeout | null>(null); 
  const hideAndPopTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 8b
  const tailoringTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 9
  const pitchIQTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 10
  const restartTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Effect 11
  const failsafeTimerRef = useRef<NodeJS.Timeout | null>(null);
  // ------------------

  // --- Animation Completion Handler ---
  const handleContainerAnimationComplete = (definition: string) => {
    // Check if the animation that just completed was the 'flipping' state
    if (definition === 'flipping') {
      console.log("180 flip animation complete. Resetting states.");
      // Now reset the view and other states
      setView('initial'); 
      setMouseState('initial');
      setContainerAnimState('initialVisible');
      setLoadingTextIndex(0);
      setIsXClicked(false); 
      setIsInitialButtonClicked(false);
    }
  };
  // ---------------------------------

  // Helper function to clear all timers
  const clearAllAnimationTimeouts = useCallback(() => {
    console.log("Clearing all animation timers...");
    if (startTimerRef.current) clearTimeout(startTimerRef.current);
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (shrinkDelayTimerRef.current) clearTimeout(shrinkDelayTimerRef.current);
    if (popOutTimerRef.current) clearTimeout(popOutTimerRef.current);
    if (textIntervalRef.current) clearInterval(textIntervalRef.current); // Use clearInterval
    if (loadingCompleteTimerRef.current) clearTimeout(loadingCompleteTimerRef.current);
    if (expansionTimerRef.current) clearTimeout(expansionTimerRef.current);
    if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
    if (postMovePauseTimerRef.current) clearTimeout(postMovePauseTimerRef.current);
    if (clickAndButtonTimerRef.current) clearTimeout(clickAndButtonTimerRef.current);
    if (containerPopDelayTimerRef.current) clearTimeout(containerPopDelayTimerRef.current);
    if (hideMouseTimerRef.current) clearTimeout(hideMouseTimerRef.current);
    if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current);
    if (tailoringTimerRef.current) clearTimeout(tailoringTimerRef.current);
    if (pitchIQTimerRef.current) clearTimeout(pitchIQTimerRef.current);
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current);

    // Reset refs to null
    startTimerRef.current = null;
    clickTimerRef.current = null;
    shrinkDelayTimerRef.current = null;
    popOutTimerRef.current = null;
    textIntervalRef.current = null;
    loadingCompleteTimerRef.current = null;
    expansionTimerRef.current = null;
    viewTimerRef.current = null;
    moveTimerRef.current = null;
    postMovePauseTimerRef.current = null;
    clickAndButtonTimerRef.current = null;
    containerPopDelayTimerRef.current = null;
    hideMouseTimerRef.current = null;
    shrinkTimerRef.current = null;
    tailoringTimerRef.current = null;
    pitchIQTimerRef.current = null;
    restartTimerRef.current = null;
    failsafeTimerRef.current = null;
  }, []); // Empty dependency array as refs don't change

  // Effect 1: Mouse animation (Use Refs - Revised Logic)
  useEffect(() => {
    // Store timers locally within this effect run's scope
    let localStartTimerId: NodeJS.Timeout | null = null;
    let localClickTimerId: NodeJS.Timeout | null = null;

    if (view === 'initial') {
      console.log("View is initial, starting mouse animation sequence...");
      // Clear any existing timers managed by this effect instance via refs
      if (startTimerRef.current) clearTimeout(startTimerRef.current);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

      localStartTimerId = setTimeout(() => {
        setMouseState('animate');
        // Now set the second timer
        localClickTimerId = setTimeout(() => {
            setMouseState('click');
          // Clear the second timer ref *after* it fires
          if (clickTimerRef.current === localClickTimerId) { // Ensure it's the same timer
             clickTimerRef.current = null;
          }
        }, 800); // Click delay
        // Store the second timer ID in the ref
        clickTimerRef.current = localClickTimerId;
        // Clear the first timer ref *after* it fires
        if (startTimerRef.current === localStartTimerId) { // Ensure it's the same timer
             startTimerRef.current = null;
        }
      }, 1000); // Start delay
      // Store the first timer ID in the ref
      startTimerRef.current = localStartTimerId;
    }

    // Cleanup function uses refs to clear potentially active timers
    return () => {
      console.log("Cleaning up Effect 1 timers");
      if (startTimerRef.current) {
        clearTimeout(startTimerRef.current);
        startTimerRef.current = null;
      }
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      // Optional: Also clear local vars, though refs handled by cleanup should suffice
      // if (localStartTimerId) clearTimeout(localStartTimerId);
      // if (localClickTimerId) clearTimeout(localClickTimerId);
    };
  }, [view]); // Re-run when view changes

  // Effect 2: Trigger ONLY button press on mouse click (No timers here)
  useEffect(() => {
    if (mouseState === 'click') {
        console.log("Mouse click detected, triggering initial button press.");
        setIsInitialButtonClicked(true);
        setMouseState('clickedAndWaiting'); 
    }
  }, [mouseState]);

  // Effect 2b: Trigger container shrink after initial button press animation + delay (Use Ref)
  useEffect(() => {
      if (isInitialButtonClicked) {
          if (shrinkDelayTimerRef.current) clearTimeout(shrinkDelayTimerRef.current); // Clear previous if exists
          shrinkDelayTimerRef.current = setTimeout(() => {
              console.log("Initial button press finished + delay, triggering container shrink.");
              setContainerAnimState('shrinking');
              setIsInitialButtonClicked(false);
              shrinkDelayTimerRef.current = null; // Clear ref after firing
          }, 300);
      }
      return () => {
          if (shrinkDelayTimerRef.current) {
            clearTimeout(shrinkDelayTimerRef.current);
            shrinkDelayTimerRef.current = null;
          }
      };
  }, [isInitialButtonClicked]);

  // Effect 3: Pop container back out & set view to loading (Use Ref)
  useEffect(() => {
    if (containerAnimState === 'shrinking') {
      if (popOutTimerRef.current) clearTimeout(popOutTimerRef.current); // Clear previous if exists
      popOutTimerRef.current = setTimeout(() => {
        console.log("Shrink finished, setting container to initialVisible & view to loading");
        setContainerAnimState('initialVisible'); 
        setView('loading');
        popOutTimerRef.current = null; // Clear ref after firing
      }, 150);
    }
    return () => { 
        if (popOutTimerRef.current) {
          clearTimeout(popOutTimerRef.current);
          popOutTimerRef.current = null;
        }
     };
  }, [containerAnimState]);

  // Effect 4: Handle loading text cycle & transition to loadingComplete (Use Refs)
  useEffect(() => {
    if (view === 'loading') {
      setLoadingTextIndex(0);
      // Clear previous interval/timeout if they exist
      if (textIntervalRef.current) clearInterval(textIntervalRef.current);
      if (loadingCompleteTimerRef.current) clearTimeout(loadingCompleteTimerRef.current);

      textIntervalRef.current = setInterval(() => {
        setLoadingTextIndex(prevIndex => (prevIndex + 1) % LOADING_PHRASES.length);
      }, LOADING_INTERVAL_MS);
      loadingCompleteTimerRef.current = setTimeout(() => {
          console.log("Loading text finished, setting view to loadingComplete");
          setView('loadingComplete');
          if (textIntervalRef.current) clearInterval(textIntervalRef.current); // Stop interval when loading finishes
          textIntervalRef.current = null;
          loadingCompleteTimerRef.current = null; // Clear ref after firing
      }, TOTAL_LOADING_DURATION_MS);
    }
    // Cleanup clears timers if view changes *during* loading
    return () => {
      if (textIntervalRef.current) {
        clearInterval(textIntervalRef.current);
        textIntervalRef.current = null;
      }
      if (loadingCompleteTimerRef.current) {
        clearTimeout(loadingCompleteTimerRef.current);
        loadingCompleteTimerRef.current = null;
      }
    };
  }, [view]);

  // Effect 5: Handle checkmark animation and trigger container expansion (Use Ref)
  useEffect(() => {
      if (view === 'loadingComplete') {
          if (expansionTimerRef.current) clearTimeout(expansionTimerRef.current); // Clear previous
          expansionTimerRef.current = setTimeout(() => {
              console.log("First Checkmark finished, setting container to expanding");
              setContainerAnimState('expanding');
              expansionTimerRef.current = null; // Clear ref after firing
          }, CHECKMARK_ANIMATION_DURATION_MS);
      }
      return () => {
          if (expansionTimerRef.current) {
            clearTimeout(expansionTimerRef.current);
            expansionTimerRef.current = null;
          }
      };
  }, [view]);

  // Effect 6: Transition view to feedback AFTER container starts expanding (Use Ref)
  useEffect(() => {
      if (containerAnimState === 'expanding' && view !== 'initial') { 
          if (viewTimerRef.current) clearTimeout(viewTimerRef.current); // Clear previous
          viewTimerRef.current = setTimeout(() => {
              console.log("Container expanding, setting view to feedback");
              setView('feedback');
              viewTimerRef.current = null; // Clear ref after firing
          }, 50);
      }
      return () => {
         if (viewTimerRef.current) {
           clearTimeout(viewTimerRef.current);
           viewTimerRef.current = null;
         }
      };
  }, [containerAnimState, view]);

  // Effect 7: Simplified Mouse Animation for Feedback Card
  useEffect(() => {
    if (view === 'feedback') {
      // Clear previous timers for this effect
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      if (clickStartTimerRef.current) clearTimeout(clickStartTimerRef.current); 
      if (hideAndPopTimerRef.current) clearTimeout(hideAndPopTimerRef.current);

      console.log("Feedback view: Starting 2s initial delay...");
      moveTimerRef.current = setTimeout(() => {
        console.log("Feedback view: Initial delay done. Moving mouse to X...");
        setMouseState('moveToX');
        moveTimerRef.current = null;

        // Wait for move animation (0.6s) then start click
        clickStartTimerRef.current = setTimeout(() => {
          console.log("Feedback view: Move done. Clicking X...");
          setMouseState('clickX');
          setIsXClicked(true); // For button visual pop
          clickStartTimerRef.current = null;

          // Wait 500ms from START of click
          // Then hide mouse and trigger card pop
          hideAndPopTimerRef.current = setTimeout(() => {
             console.log("Feedback view: 0.5s post-click elapsed. Hiding mouse and popping card...");
             setMouseState('hide');
             setIsXClicked(false); // Reset button visual
             setContainerAnimState('popping'); // Trigger card pop NOW
             hideAndPopTimerRef.current = null;
          }, 500); // Total 500ms from START of click

        }, 600); // 600ms move duration

      }, 2000); // 2s initial delay
    }

    // Cleanup clears all potentially active timers for this effect
    return () => {
      // Check if view is changing away from feedback before logging
      // (This might be too noisy otherwise)
      // console.log(`Cleaning up Effect 7 timers (View changing from feedback?)`);
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      if (clickStartTimerRef.current) clearTimeout(clickStartTimerRef.current);
      if (hideAndPopTimerRef.current) clearTimeout(hideAndPopTimerRef.current);
      moveTimerRef.current = null;
      clickStartTimerRef.current = null;
      hideAndPopTimerRef.current = null;
      // Optionally reset isXClicked if needed on cleanup, though Effect 8 does it too
      // setIsXClicked(false);
    };
  }, [view]);

  // Effect 8: Handle post-pop logic (Use Ref)
  useEffect(() => {
    if (containerAnimState === 'popping') {
        setIsXClicked(false);
        if (shrinkTimerRef.current) clearTimeout(shrinkTimerRef.current); // Clear previous
        shrinkTimerRef.current = setTimeout(() => {
            console.log("Pop finished, setting view to tailoring & container to initialVisible");
            setView('tailoring');
            setContainerAnimState('initialVisible');
            shrinkTimerRef.current = null; // Clear ref
        }, 150);
    }
    return () => {
        if (shrinkTimerRef.current) {
          clearTimeout(shrinkTimerRef.current);
          shrinkTimerRef.current = null;
        }
    };
  }, [containerAnimState]);

  // Effect 8b: Wait during tailoring (Use Ref)
  useEffect(() => {
    if (view === 'tailoring') {
      if (tailoringTimerRef.current) clearTimeout(tailoringTimerRef.current);
      tailoringTimerRef.current = setTimeout(() => {
        console.log("Tailoring finished, setting view to finalCheckmark");
        setView('finalCheckmark'); 
        tailoringTimerRef.current = null; // Clear ref
      }, 2500);
    }
    return () => { 
        if (tailoringTimerRef.current) {
          clearTimeout(tailoringTimerRef.current);
          tailoringTimerRef.current = null;
        }
     };
  }, [view]);

  // Effect 9: Wait on FINAL checkmark (Use Ref)
  useEffect(() => {
    if (view === 'finalCheckmark') { 
      if (pitchIQTimerRef.current) clearTimeout(pitchIQTimerRef.current);
      pitchIQTimerRef.current = setTimeout(() => {
        setView('pitchiqText'); 
        pitchIQTimerRef.current = null; // Clear ref
      }, 2000);
    }
    return () => { 
        if (pitchIQTimerRef.current) {
          clearTimeout(pitchIQTimerRef.current);
          pitchIQTimerRef.current = null;
        }
    };
  }, [view]); 

  // Effect 10: Wait on PitchIQ text, then trigger flip (Use Ref & onAnimationComplete)
  useEffect(() => {
    if (view === 'pitchiqText') {
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      console.log("PitchIQ text shown, starting 4s display timer before triggering flip...");
      restartTimerRef.current = setTimeout(() => {
        console.log("4s timer expired. Triggering flip.");
        setContainerAnimState('flipping');
        // State resets (setView, setMouseState, etc.) are now handled by onAnimationComplete
        restartTimerRef.current = null; // Clear ref
      }, 4000); // 4 seconds display time
    }
    return () => {
        if (restartTimerRef.current) {
          clearTimeout(restartTimerRef.current);
          restartTimerRef.current = null;
        }
    };
  }, [view]);

  // Effect 11: Failsafe timeout (Use Ref)
  useEffect(() => {
    if (view !== 'initial') {
      if (failsafeTimerRef.current) clearTimeout(failsafeTimerRef.current); // Clear previous
      console.log(`Setting failsafe timer (${view} state)`);
      failsafeTimerRef.current = setTimeout(() => {
        console.warn("Animation stuck, forcing reset via failsafe timer.");
        // Call the central clearing function before resetting state
        clearAllAnimationTimeouts(); 
        setView('initial');
        setMouseState('initial');
        setContainerAnimState('initialVisible');
        setLoadingTextIndex(0);
        setIsXClicked(false);
        setIsInitialButtonClicked(false);
        // No need to clear failsafeTimerRef.current here, it's done by clearAll
      }, 30000);
    }
    return () => {
      if (failsafeTimerRef.current) {
        clearTimeout(failsafeTimerRef.current);
        failsafeTimerRef.current = null;
      }
    };
  }, [view, clearAllAnimationTimeouts]); // Added clearAllAnimationTimeouts dependency

  // Effect 12: Restart animation on tab visibility change (calls clearAllAnimationTimeouts)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log("Tab became visible...");
        // Only reset if the view is not already 'initial' to prevent interference on initial load
        if (view !== 'initial') {
          console.log("...and view is not initial. Clearing timers and restarting animation.");
          clearAllAnimationTimeouts(); // Clear timers first
          setView('initial');
          setMouseState('initial');
          setContainerAnimState('initialVisible');
          setLoadingTextIndex(0);
          setIsXClicked(false);
          setIsInitialButtonClicked(false);
        } else {
          console.log("...but view is already initial. Letting Effect 1 handle startup.");
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllAnimationTimeouts(); // Also clear on unmount
    };
  }, [clearAllAnimationTimeouts]); // Add clear function to dependency

  return (
    <section className="py-32 md:py-48 bg-gray-50">
       <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20">
         {/* Removed the h2 element below 
         <h2 className="text-3xl md:text-4xl font-bold text-center mb-20 md:mb-24">
           How PitchIQ Elevates Your Sales Game
         </h2>
         */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Left Column - Updated Styling */}
          <div className="md:col-span-2 space-y-48 sm:space-y-64 md:space-y-96 pt-10">
             {staticContentData.map((item) => (
              <div key={item.id}>
                <h3 
                  className="font-outfit text-3xl md:text-4xl font-bold text-gray-800 mb-5 tracking-wider"
                  dangerouslySetInnerHTML={{ __html: item.heading }}
                />
                <div className="font-outfit relative pl-4 ml-[-1rem]"> 
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-pitchiq-red" aria-hidden="true"></div>
                  <p 
                    className="text-lg md:text-xl text-foreground/80 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: item.text }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Right Column */}
          <div className="md:col-span-1 relative px-4">
            {/* Responsive sticky top position */}
            <div className="sticky top-16 md:top-28">
              {/* Outer container for positioning - Removed items-center - ADDED perspective and transformStyle */}
              <div ref={containerRef} className="relative h-[560px] flex justify-center overflow-hidden" style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}>
                
                {/* --- Animated Mouse Pointer --- */}
                <motion.div
                    variants={mouseVariants}
                    initial="initial"
                    animate={mouseState} 
                    className="absolute z-30 text-black"
                 >
                    <FaMousePointer size={17} /> 
                 </motion.div>

                {/* --- The Animating Container --- */}
                <motion.div
                    variants={containerVariants}
                    initial="initialVisible"
                    animate={containerAnimState}
                    onAnimationComplete={handleContainerAnimationComplete}
                    className="absolute bg-white border border-gray-200 shadow-lg overflow-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    {/* --- Two Sided Container --- */}
                    <div className="relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
                        {/* Front Side (Shows current view) */}
                        <motion.div 
                            className="absolute inset-0 w-full h-full bg-white rounded-[inherit] overflow-hidden"
                            style={{ backfaceVisibility: 'hidden' }}
                        >
                    <AnimatePresence>
                                {/* Render content based on the current view state */} 
                       {view === 'initial' && (
                           <motion.div
                                key="initialContent"
                                variants={viewVariants.initial} 
                                       initial={{ opacity: 1, scale: 1 }} // Start visible
                                exit="exit" 
                                className="text-center p-6 flex flex-col items-center justify-center h-full w-full"
                            >
                                {/* Centering initial content */} 
                                <div>
                                    <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold mb-4">Roleplay Complete!</h3>
                                           <motion.div
                                               variants={initialButtonVariants}
                                               animate={isInitialButtonClicked ? 'pressed' : 'idle'}
                                           >
                                    <Button size="lg" className={`bg-pitchiq-red text-white pointer-events-none`}>
                                        Generate Feedback
                                    </Button>
                                           </motion.div>
                                </div>
                            </motion.div>
                        )}

                        {/* Loading View CONTENT */} 
                        {view === 'loading' && (
                            <motion.div
                                key={`loading-${loadingTextIndex}`}
                                variants={viewVariants.loading}
                                initial="initial"
                                animate="enter"
                                exit="exit"
                                className="flex items-center justify-center h-full w-full p-4"
                            >
                                <p className="text-sm text-gray-600 text-center">{LOADING_PHRASES[loadingTextIndex]}</p>
                            </motion.div>
                        )}

                                {/* Loading Complete View (FIRST Checkmark) */}
                        {view === 'loadingComplete' && (
                            <motion.div
                                key="loadingCompleteContent"
                                variants={viewVariants.loadingComplete}
                                initial="initial"
                                animate="enter"
                                exit="exit"
                                className="flex items-center justify-center h-full w-full"
                            >
                                <motion.div
                                    variants={checkmarkVariant}
                                    initial="hidden"
                                    animate="visible"
                                >
                                    <CheckCircle className="h-16 w-16 text-green-500" />
                                </motion.div>
                            </motion.div>
                        )}

                        {/* Feedback View CONTENT */} 
                        {view === 'feedback' && (
                            <motion.div
                                        key="feedback-content"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="relative w-full h-full flex flex-col items-center pt-4 px-4 pb-8 min-h-[530px]"
                                    >
                                        {/* X button */}
                                        <motion.button
                                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 z-10"
                                            variants={xButtonVariants}
                                            animate={isXClicked ? 'popping' : 'idle'}
                                        >
                                            <X size={20} />
                                        </motion.button>

                                        <div className="w-11/12 mx-auto mt-4">
                                    {/* Responsive heading size */}
                                    <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-4 md:mb-6 text-center">Feedback Report</h3>
                                    <div className="flex flex-col gap-3 md:gap-4 text-left">
                                        {/* Responsive padding */}
                                        <div className="bg-green-50 p-2 sm:p-3 md:p-4 rounded-lg border border-green-200"> 
                                            <h4 className="font-semibold text-green-800 mb-2 flex items-center gap-2 text-sm md:text-base"><CheckCircle className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0"/> What you did well</h4>
                                            {/* Responsive text size */}
                                            <ul className="list-disc list-inside text-xs sm:text-sm text-green-700 space-y-1">
                                                <li>Clear value prop</li>
                                                <li>Good pacing</li>
                                                {/* Hide last item on screens smaller than sm */}
                                                <li className="hidden sm:list-item">Confident tone</li>
                                            </ul>
                                        </div>
                                        {/* Responsive padding */}
                                        <div className="bg-yellow-50 p-2 sm:p-3 md:p-4 rounded-lg border border-yellow-200"> 
                                            <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2 text-sm md:text-base"><AlertTriangle className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0"/> What you could improve</h4>
                                            {/* Responsive text size */}
                                            <ul className="list-disc list-inside text-xs sm:text-sm text-yellow-700 space-y-1">
                                                <li>Handle price objection earlier</li>
                                                <li>Ask more questions</li>
                                                {/* Hide last item on screens smaller than sm */}
                                                <li className="hidden sm:list-item">Weak closing</li>
                                            </ul>
                                        </div>
                                        {/* Responsive padding */}
                                        <div className="bg-blue-50 p-2 sm:p-3 md:p-4 rounded-lg border border-blue-200"> 
                                            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2 text-sm md:text-base"><Target className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0"/> Action steps</h4>
                                            {/* Responsive text size */}
                                            <ul className="list-disc list-inside text-xs sm:text-sm text-blue-700 space-y-1">
                                                <li>Practice framework</li>
                                                <li>Review listening module</li>
                                                {/* Hide last item on screens smaller than sm */}
                                                <li className="hidden sm:list-item">Try assumptive close</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                                {/* Tailoring View CONTENT */} 
                                {view === 'tailoring' && (
                                    <motion.div
                                        key="tailoring-content"
                                        variants={viewVariants.loading} 
                                        initial="initial"
                                        animate="enter"
                                        exit="exit"
                                        className="flex flex-col items-center justify-center h-full w-full p-4"
                                    >
                                        <Loader2 className="h-8 w-8 text-pitchiq-red animate-spin mb-4" />
                                        <p className="text-sm text-gray-600 text-center">Tailoring next roleplay...</p>
                                    </motion.div>
                                )}

                                {/* Final Checkmark View (Before PitchIQ Text) */}
                                {view === 'finalCheckmark' && (
                                    <motion.div
                                        key="finalCheckmarkContent"
                                        variants={viewVariants.loadingComplete} 
                                        initial="initial"
                                        animate="enter"
                                        exit="exit"
                                        className="flex items-center justify-center h-full w-full"
                                    >
                                        <motion.div
                                            variants={checkmarkVariant}
                                            initial="hidden"
                                            animate="visible"
                                        >
                                            <CheckCircle className="h-16 w-16 text-green-500" />
                                        </motion.div>
                                    </motion.div>
                                )}

                                {/* PitchIQ Text View (Before Restart) */}
                                {view === 'pitchiqText' && (
                                    <motion.div
                                        key="pitchiqTextContent"
                                        variants={viewVariants.poppy}
                                        initial="initial"
                                        animate="enter"
                                        exit="exit"
                                        className="flex items-center justify-center h-full w-full p-4"
                                    >
                                        <h3 className="text-4xl md:text-6xl font-bold text-pitchiq-red">PitchIQ</h3>
                            </motion.div>
                        )}
                    </AnimatePresence>
                        </motion.div>

                        {/* Back Side (Now renders actual initial view) */}
                        <motion.div
                             className="absolute inset-0 w-full h-full bg-white rounded-[inherit] overflow-hidden"
                             style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                         >
                            {/* Conditionally render initial view content here */}
                            {/* Using the same structure as the front side when view is initial */}
                            <AnimatePresence>
                                {view === 'initial' && (
                                    <motion.div
                                        key="initialContent-back"
                                        variants={viewVariants.initial} // Use same variant
                                        initial={{ opacity: 1, scale: 1 }} // Should be visible immediately when flipped
                                        className="text-center p-6 flex flex-col items-center justify-center h-full w-full"
                                    >
                                        <div>
                                            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                                            <h3 className="text-xl font-semibold mb-4">Roleplay Complete!</h3>
                                            <motion.div
                                                // No need for button animation state here, it's handled by main state
                                            >
                                                <Button size="lg" className={`bg-pitchiq-red text-white pointer-events-none`}>
                                                    Generate Feedback
                                                </Button>
                                            </motion.div>
                                        </div>
                                    </motion.div>
                                )}
                           </AnimatePresence>
                         </motion.div>
                    </div>
                     {/* --- End Two Sided Container --- */}
                </motion.div>
                 {/* ------------------------------------------- */}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;

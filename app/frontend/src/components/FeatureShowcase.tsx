import React, { useEffect, useState, useRef } from "react";
import { Search, Eye, Lightbulb, Users, Target, Brain, Bot, Zap, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

// AnimatedBrain with text wheel
const AnimatedBrain = ({ isActive }: { isActive: boolean }) => {
  // Shake animation for Zap icon
  const [isShaking, setIsShaking] = useState(false);
  useEffect(() => {
    if (!isActive) {
      setIsShaking(false);
      return;
    }
    const shake = () => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    };
    const shakeInterval = setInterval(shake, 5000);
    shake();
    return () => clearInterval(shakeInterval);
  }, [isActive]);

  // Text wheel animation
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [animationState, setAnimationState] = useState<'visible' | 'animatingOut' | 'hiddenForIn' | 'animatingIn'>('visible');

  const phrases = [
    "Detailing Prospects Morning",
    "Exploring Buyer Nuances",
    "defining Favorite Hobby",
    "Crafting Core Motivations",
    "Uncovering Critical Needs",
  ];

  const animationDuration = 600; // ms for fade/move - INCREASED
  const phraseDisplayTime = 2500; // ms text is fully visible

  useEffect(() => {
    if (!isActive) {
      setCurrentPhraseIndex(0);
      setAnimationState('visible');
      return;
    }

    let timeoutId: NodeJS.Timeout | undefined;
    let frameId: number | undefined;

    if (animationState === 'visible') {
      timeoutId = setTimeout(() => {
        setAnimationState('animatingOut');
      }, phraseDisplayTime);
    } else if (animationState === 'animatingOut') {
      timeoutId = setTimeout(() => {
        setCurrentPhraseIndex((prevIndex) => (prevIndex + 1) % phrases.length);
        setAnimationState('hiddenForIn');
      }, animationDuration);
    } else if (animationState === 'hiddenForIn') {
      // Use rAF to ensure 'hiddenForIn' styles are applied before 'animatingIn' starts its transition
      frameId = requestAnimationFrame(() => {
        setAnimationState('animatingIn');
      });
    } else if (animationState === 'animatingIn') {
      timeoutId = setTimeout(() => {
        setAnimationState('visible');
      }, animationDuration);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isActive, animationState, phrases.length, phraseDisplayTime, animationDuration]);

  let textClasses = "text-xs md:text-sm font-medium text-gray-600 whitespace-nowrap";
  switch (animationState) {
    case 'visible':
      // Ends in this state, ease-out for smooth stop
      textClasses += ` opacity-100 translate-y-0 scale-100 rotate-0 transform transition-all duration-${animationDuration} ease-out`;
      break;
    case 'animatingOut':
      // Moves down, scales down, rotates, and fades out
      textClasses += ` opacity-0 translate-y-5 scale-90 rotate-3 transform transition-all duration-${animationDuration} ease-in`;
      break;
    case 'hiddenForIn':
      // Starts above, scaled down, rotated, invisible. No transition for this immediate state change.
      textClasses += " opacity-0 -translate-y-5 scale-90 -rotate-3 transform";
      break;
    case 'animatingIn':
      // Moves down to center, scales up, straightens, and fades in
      textClasses += ` opacity-100 translate-y-0 scale-100 rotate-0 transform transition-all duration-${animationDuration} ease-out`;
      break;
  }

  return (
    <div className="relative flex flex-col items-center">
      {/* Lightning Bolt Icon */}
      <div className="relative mb-1 md:mb-2">
        <Zap 
          className={`h-8 w-8 md:h-12 lg:h-16 md:w-12 lg:w-16 text-yellow-400 transition-all duration-100 ${
            isShaking ? 'animate-pulse transform translate-x-1 -translate-y-1' : ''
          }`}
          style={{
            filter: 'drop-shadow(0 0 8px #fbbf24)',
            transform: isShaking ? 'rotate(15deg) scale(1.1)' : 'rotate(15deg)'
          }}
        />
      </div>
      {/* Text Wheel */}
      <div className="h-4 md:h-6 text-center overflow-hidden"> {/* Fixed height and overflow for wheel effect */}
        <p className={textClasses}>
          {phrases[currentPhraseIndex]}
        </p>
      </div>
    </div>
  );
};

// Rebuilding ZigZagSearch from scratch
const ZigZagSearch = ({ isActive }: { isActive: boolean }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showExclamation, setShowExclamation] = useState(false);
  const [animateExclamationIn, setAnimateExclamationIn] = useState(false);
  const [exclamationPosition, setExclamationPosition] = useState({ x: 0, y: 0 });

  const stepRef = useRef(0);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Pattern: Triangle properly positioned inside w-32 h-32 card (128x128px)
  // Card center is (0,0), so coordinates range from -64 to +64 with margins
  const pattern = [
    { x: 24, y: 48 },    // Bottom-right area - well inside card (was 32, 80)
    { x: 32, y: -32 },   // Top-right - inside card boundaries  
    { x: -32, y: -32 },  // Top-left - inside card boundaries
  ];
  const DISCOVERY_STEP_INDEX = 0; // The first point (index 0) is discovery
  const SEARCH_ICON_SIZE = 48; // Scaled down for mobile (was 96)
  const EXCLAMATION_ICON_SIZE = 24; // Scaled down for mobile (was 48)

  const TRAVEL_DURATION = 1500; // 1.5 seconds for the pan/slide
  const STOP_DURATION_REGULAR = 1000;   // 1 second stop normally
  const STOP_DURATION_DISCOVERY = 2500; // Glass stops for 2.5 seconds at discovery
  const EXCLAMATION_FADE_DURATION = 200; // ! Fades in/out over 0.2 seconds
  const EXCLAMATION_OPAQUE_DURATION = 2600; // ! Stays fully visible for 2.1 seconds to fit new stop time

  useEffect(() => {
    const clearCurrentTimeout = () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };

    if (!isActive) {
      clearCurrentTimeout();
      stepRef.current = 0;
      setPosition(pattern[0]); // Reset to initial position
      setShowExclamation(false);
      setAnimateExclamationIn(false);
      return;
    }

    const animateStep = () => {
      stepRef.current = (stepRef.current + 1) % pattern.length;
      const nextPosition = pattern[stepRef.current];
      setPosition(nextPosition);

      let currentStopDuration = STOP_DURATION_REGULAR;
      if (stepRef.current === DISCOVERY_STEP_INDEX) {
        currentStopDuration = STOP_DURATION_DISCOVERY;

        // Delay appearance of exclamation until travel to discovery point is much closer to completion
        setTimeout(() => {
          if (!isActive || stepRef.current !== DISCOVERY_STEP_INDEX) return; 

          const currentPosition = pattern[DISCOVERY_STEP_INDEX]; 
          const exclamX = currentPosition.x + (SEARCH_ICON_SIZE - EXCLAMATION_ICON_SIZE) / 2 - 13; // Center horizontally, then move left more
          const exclamY = currentPosition.y + (SEARCH_ICON_SIZE - EXCLAMATION_ICON_SIZE) / 2 - 14; // Center vertically, then move up more
          setExclamationPosition({ x: exclamX, y: exclamY });
          
          setShowExclamation(true);
          setAnimateExclamationIn(false); 
          requestAnimationFrame(() => {
            if (!isActive || stepRef.current !== DISCOVERY_STEP_INDEX) return; 
            setAnimateExclamationIn(true); // This starts the EXCLAMATION_FADE_DURATION fade-in

            // Schedule the start of the fade-out
            setTimeout(() => {
              if (!isActive || stepRef.current !== DISCOVERY_STEP_INDEX) return;
              setAnimateExclamationIn(false); // This starts the EXCLAMATION_FADE_DURATION fade-out
              // Remove from DOM after fade-out
              setTimeout(() => {
                   if (!isActive || stepRef.current !== DISCOVERY_STEP_INDEX) return;
                   setShowExclamation(false);
              }, EXCLAMATION_FADE_DURATION); 
            }, EXCLAMATION_OPAQUE_DURATION); // Start fade-out after it has been opaque for this duration
          });
        }, TRAVEL_DURATION - 400); // Trigger ! logic 1100ms into travel to discovery point
      }

      timeoutIdRef.current = setTimeout(() => {
        animateStep(); 
      }, TRAVEL_DURATION + currentStopDuration);
    };

    // Initial setup
    setPosition(pattern[stepRef.current]); 
    timeoutIdRef.current = setTimeout(() => {
      animateStep();
    }, STOP_DURATION_REGULAR); // Initial stop before first move

    return () => {
      clearCurrentTimeout();
    };
  }, [isActive]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="absolute transition-transform ease-in-out"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transitionDuration: `${TRAVEL_DURATION}ms`,
          zIndex: 10,
          filter: 'drop-shadow(0 4px 4px rgba(0, 0, 0, 0.25))'
        }}
      >
        <Search className="h-8 w-8 md:h-12 lg:h-24 md:w-12 lg:w-24 text-green-500" />
      </div>
      {showExclamation && (
        <div
          className={`absolute transition-all ease-out ${
            animateExclamationIn ? 'opacity-100 scale-100 animate-pulse-red-aura' : 'opacity-0 scale-75'
          }`}
          style={{
            transform: `translate(${exclamationPosition.x}px, ${exclamationPosition.y}px)`,
            zIndex: 5,
            transitionDuration: `${EXCLAMATION_FADE_DURATION}ms` // Apply fade duration here
          }}
        >
          <AlertTriangle className="h-4 w-4 md:h-6 lg:h-12 md:w-6 lg:w-12 text-red-500" />
        </div>
      )}
    </div>
  );
};

// Robot that only bounces during speech bubbles with 4 variants every 9 seconds
const BouncingRobot = ({ isActive }: { isActive: boolean }) => {
  const [showBubble, setShowBubble] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [typedText, setTypedText] = useState('');

  const messages = [
    "You've identified a major pain point!",
    "Harry is hinting at a deeper pain point here. Ask him about it!",
    "Great discovery! This pain point could be costing them thousands.",
    "Push deeper - there's more pain hiding beneath the surface."
  ];

  useEffect(() => {
    if (!isActive) {
      setShowBubble(false);
      setTypedText('');
      setMessageIndex(0);
      return;
    }

    let timeoutId: NodeJS.Timeout;

    const startCycle = () => {
      // Show bubble and start typing
      setShowBubble(true);
      setTypedText('');
      
      const message = messages[messageIndex];
      let charIndex = 0;
      
      const typeInterval = setInterval(() => {
        if (charIndex < message.length) {
          setTypedText(message.substring(0, charIndex + 1));
          charIndex++;
        } else {
          clearInterval(typeInterval);
        }
      }, 50);

      // Hide bubble after 6 seconds
      timeoutId = setTimeout(() => {
        setShowBubble(false);
        setMessageIndex((prev) => (prev + 1) % messages.length);
        
        // Wait 3 seconds, then start next cycle
        timeoutId = setTimeout(startCycle, 3000);
      }, 6000);
    };

    // Start first cycle after brief delay
    timeoutId = setTimeout(startCycle, 500);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isActive, messageIndex]);

  return (
    <div className="relative">
      <div
        className={`transition-transform duration-300 ${
          showBubble ? 'transform translate-y-[-8px]' : 'transform translate-y-0'
        }`}
      >
        <Bot className="h-8 w-8 md:h-12 lg:h-16 md:w-12 lg:w-16 text-purple-500" />
      </div>
      
      {/* Speech Bubble */}
      {showBubble && (
        <div className="absolute -top-16 md:-top-20 -left-16 md:-left-20 bg-white p-2 md:p-3 rounded-lg shadow-lg border-2 border-purple-200 w-48 md:w-64 animate-fade-in">
          <div className="flex items-start gap-1 md:gap-2">
            <Lightbulb className="h-3 w-3 md:h-4 md:w-4 text-yellow-500 mt-1 flex-shrink-0" />
            <p className="text-xs md:text-sm text-gray-800 font-medium leading-tight">{typedText}</p>
          </div>
          <div className="absolute bottom-[-8px] left-6 md:left-8 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-purple-200"></div>
        </div>
      )}
    </div>
  );
};

// START NEW COMPONENT: PulsingTargetAnimation
const PulsingTargetAnimation = ({ isActive }: { isActive: boolean }) => {
  return (
    <div className="relative flex items-center justify-center w-8 h-8 md:w-24 lg:w-32 md:h-24 lg:h-32">
      <Target 
        className={`h-8 w-8 md:h-12 lg:h-16 md:w-12 lg:w-16 text-pitchiq-red transition-all duration-300 ease-in-out ${
          isActive ? 'animate-pulse-target' : ''
        }`}
      />
      {/* Inline styles for the pulsing animation - MOVED TO GLOBAL CSS */}
      {/* <style jsx>{`
        @keyframes pulse-target-animation {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 4px #ef4444); // Slightly less intense shadow
          }
          50% {
            transform: scale(1.1);
            filter: drop-shadow(0 0 10px #ef4444); // More intense shadow at peak
          }
        }
        .animate-pulse-target {
          animation: pulse-target-animation 2s infinite ease-in-out;
        }
      `}</style> */}
    </div>
  );
};
// END NEW COMPONENT: PulsingTargetAnimation

// Morphing Eye Detective
const MorphingEye = ({ isActive }: { isActive: boolean }) => {
  const [morphState, setMorphState] = useState(0); // 0: eye, 1: magnifying, 2: scanning

  useEffect(() => {
    if (!isActive) return;

    const cycle = () => {
      setMorphState(1); // magnifying
      setTimeout(() => setMorphState(2), 1000); // scanning
      setTimeout(() => setMorphState(0), 2000); // back to eye
    };

    const interval = setInterval(cycle, 4000);
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="relative">
      <div
        className={`transition-all duration-700 ease-in-out ${
          morphState === 1 ? 'scale-125 rotate-12' : morphState === 2 ? 'scale-110 -rotate-6' : 'scale-100 rotate-0'
        }`}
      >
        <Eye className="h-8 w-8 md:h-12 lg:h-16 md:w-12 lg:w-16 text-indigo-500" />
      </div>
      
      {/* Scanning beam effect */}
      {morphState === 2 && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse" 
               style={{ top: '30%', position: 'absolute' }} />
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse" 
               style={{ top: '50%', position: 'absolute', animationDelay: '0.3s' }} />
          <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-pulse" 
               style={{ top: '70%', position: 'absolute', animationDelay: '0.6s' }} />
        </div>
      )}
    </div>
  );
};

const FeatureShowcase = () => {
  const [activeSection, setActiveSection] = useState(0);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const viewportHeight = window.innerHeight;
      const viewportMiddle = scrollTop + (viewportHeight / 2);
      
      let newActiveSection = 0; // Default to first section
      
      // Calculate transition points at the middle of gaps between sections
      for (let i = 0; i < sectionRefs.current.length - 1; i++) {
        const currentSection = sectionRefs.current[i];
        const nextSection = sectionRefs.current[i + 1];
        
        if (currentSection && nextSection) {
          const currentRect = currentSection.getBoundingClientRect();
          const nextRect = nextSection.getBoundingClientRect();
          
          const currentBottom = currentRect.bottom + window.scrollY;
          const nextTop = nextRect.top + window.scrollY;
          const gapMiddle = (currentBottom + nextTop) / 2;
          
          // If we've passed the middle of this gap, move to next animation
          if (viewportMiddle >= gapMiddle) {
            newActiveSection = i + 1;
          }
        }
      }
      
      // Only update if we have a different section
      if (newActiveSection !== activeSection) {
        setActiveSection(newActiveSection);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection]);

  // Updated content emphasizing pain point discovery, coaching, and realistic scenarios
  const staticContentData = [
    {
      id: 'scenarios',
      heading: "Hyper&#8209;Personalized<br /> Buyer&nbsp;Personas",
      text: "Our AI analyzes your <strong>5-step onboarding responses</strong> to create buyer personas that mirror your actual prospects. Each persona has <strong>industry-specific pain points, authentic objections,</strong> and decision-making styles that match your real sales environment.",
      AnimatedIcon: AnimatedBrain
    },
    {
      id: 'pain-discovery',
      heading: "Uncover Hidden<br /> Pain Points",
      text: "<strong>Navigate red herrings</strong> and surface objections to find the<br />real pain. Learn to distinguish between <strong>surface complaints</strong><br />and deeper business challenges that <strong>truly motivate</strong> purchase decisions.",
      AnimatedIcon: ZigZagSearch
    },
    {
      id: 'coaching',
      heading: "Live AI<br /> Coaching",
      text: "<strong>Get real-time guidance</strong> during conversations. AI coach whispers strategic hints, suggests <strong>follow-up questions,</strong> and helps you <strong>amplify discovered pain points</strong> for maximum impact.",
      AnimatedIcon: BouncingRobot
    },
    {
      id: 'amplification',
      heading: "Make Pain<br /> Points Hurt",
      text: "Master the art of <strong>ethical pain amplification.</strong><br />Learn to help prospects visualize the <strong>true cost of inaction</strong><br />and position your solution as the <strong>urgent remedy</strong> they need.",
      AnimatedIcon: PulsingTargetAnimation
    },
  ];

  return (
    <section id="features" className="py-12 md:py-16 lg:py-24 bg-gradient-to-b from-white to-gray-50">
       <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-10 xl:px-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Left Column - 4 Scrollable Text Sections */}
          <div className="lg:col-span-2 space-y-48 md:space-y-64 lg:space-y-96 xl:space-y-[30rem]">
            {staticContentData.map((item, index) => (
              <div 
                key={item.id}
                ref={(el) => (sectionRefs.current[index] = el)}
                className="min-h-[250px] md:min-h-[300px] flex flex-col justify-center"
              >
                {/* Mobile/Tablet Layout - Animation beside text */}
                <div className="lg:hidden">
                  {/* Title with animation on the right */}
                  <div className="flex items-center mb-3 md:mb-4 overflow-hidden pb-2">
                    <h3 
                      className="font-outfit text-2xl md:text-3xl font-bold text-gray-800 tracking-wider flex-shrink min-w-0"
                      dangerouslySetInnerHTML={{ __html: item.heading }}
                    />
                    <div className="ml-4 md:ml-8 flex-shrink-0">
                      {/* Custom card sizes for each animation */}
                      {item.id === 'scenarios' && (
                        <div className="w-32 h-24 md:w-40 md:h-32 bg-white rounded-lg shadow-md border border-gray-100 flex items-center justify-center">
                          <item.AnimatedIcon isActive={true} />
                        </div>
                      )}
                      {item.id === 'pain-discovery' && (
                        <div className="w-40 h-32 md:w-48 md:h-40 bg-white rounded-lg shadow-md border border-gray-100 flex items-center justify-center">
                          <item.AnimatedIcon isActive={true} />
                        </div>
                      )}
                      {item.id === 'coaching' && (
                        <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-lg shadow-md border border-gray-100 flex items-center justify-center overflow-visible relative ml-2 md:ml-4">
                          <div className="pt-8">
                            <item.AnimatedIcon isActive={true} />
                          </div>
                        </div>
                      )}
                      {item.id === 'amplification' && (
                        <div className="w-32 h-24 md:w-40 md:h-32 bg-white rounded-lg shadow-md border border-gray-100 flex items-center justify-center ml-2 md:ml-4">
                          <item.AnimatedIcon isActive={true} />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Description text below */}
                  <div className="font-outfit relative pl-3 md:pl-4 ml-[-0.75rem] md:ml-[-1rem]"> 
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-pitchiq-red" aria-hidden="true"></div>
                    <p 
                      className="text-base md:text-lg text-foreground/80 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                  </div>
                </div>

                {/* Desktop Layout - Text only (animation in sticky sidebar) */}
                <div className="hidden lg:block">
                  <div className="absolute -top-8 md:-top-10 left-1/2 -translate-x-1/2">
                    <item.AnimatedIcon size={80} />
                  </div>
                  <h3
                    className="text-xl md:text-2xl font-bold mt-16 md:mt-20 mb-3 md:mb-4"
                    dangerouslySetInnerHTML={{ __html: item.heading }}
                  />
                  <div className="font-outfit relative pl-4 ml-[-1rem]"> 
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-pitchiq-red" aria-hidden="true"></div>
                    <p 
                      className="text-xl text-foreground/80 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item.text }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column - Sticky Animated Feature (Desktop Only) */}
          <div className="hidden lg:block lg:col-span-1 relative px-2 md:px-4 -mt-8 md:-mt-16 lg:-mt-24">
            <div className="sticky top-8 md:top-16 lg:top-28">
              <div className="relative h-[300px] md:h-[350px] lg:h-[400px] flex items-center justify-center">
                {staticContentData.map((section, index) => {
                  const AnimatedIcon = section.AnimatedIcon;
                  const isActive = index === activeSection;
                  
                  return (
                    <div
                      key={index}
                      className={`absolute inset-0 flex flex-col items-center justify-center text-center transition-all duration-700 ease-out ${
                        isActive 
                          ? 'opacity-100 translate-y-0 scale-100' 
                          : 'opacity-0 translate-y-8 scale-95'
                      }`}
                    >
                      <div className="w-8 h-8 md:w-16 lg:w-24 xl:w-32 md:h-16 lg:h-24 xl:h-32 flex items-center justify-center">
                        <AnimatedIcon isActive={isActive} />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Progress indicators */}
              <div className="flex justify-center gap-1.5 md:gap-2 mt-6 md:mt-8">
                {staticContentData.map((_, index) => (
                  <div
                    key={index}
                    className={`w-8 md:w-10 lg:w-12 h-1 rounded-full transition-all duration-500 ${
                      index === activeSection 
                        ? 'bg-pitchiq-red' 
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
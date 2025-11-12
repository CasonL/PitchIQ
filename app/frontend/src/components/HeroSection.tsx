import React, { useState, useEffect, useRef, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Check, ArrowRight } from "lucide-react";
// import { useAuthContext } from "@/context/AuthContext"; // Commented out for pre-launch
// import EmailSignup from "./EmailSignup"; // No longer directly embedded in hero
import ContactModal from "./ContactModal";
// import { scrollToElement } from "@/lib/utils"; // No longer needed if not scrolling
// useNavbarHeight is no longer needed directly in HeroSection for scrolling
// import { useNavbarHeight } from "@/context/NavbarHeightContext"; 
import { motion } from "framer-motion";
// Remove Lottie from 'lottie-react' as we are using the web component
// import Lottie from 'lottie-react'; 

interface HeroSectionProps {
  onOpenEmailModal?: () => void; // Prop to open email modal
}

// Define the type for the dotlottie-player custom element if TypeScript complains
// This is a basic way to inform TypeScript about the custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'dotlottie-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
        src?: string;
        background?: string;
        speed?: string;
        loop?: boolean;
        autoplay?: boolean;
        // Add other props if needed
      }, HTMLElement>;
    }
  }
}

const HeroSection = ({ onOpenEmailModal }: HeroSectionProps) => {
  // Remove lottieData state and useEffect for fetching, as the component handles it
  // const [lottieData, setLottieData] = useState<object | null>(null); 

  // const { isAuthenticated, isLoading } = useAuthContext(); // Commented out for pre-launch
  // const emailSignupAnchorRef = useRef<HTMLDivElement>(null); // REMOVE: Ref is now passed in
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  // console.log('[HeroSection] Received navbarRef:', navbarRef && navbarRef.current ? 'Ref with current' : 'Ref is null or no current'); // REMOVED
  const [hasSignedUp, setHasSignedUp] = useState(false);
  const [signupOptions, setSignupOptions] = useState({
    earlyAccess: false,
    getUpdates: false
  });

  // Animation state
  const [animationPhase, setAnimationPhase] = useState<'orb' | 'examples' | 'tagline' | 'gap'>('orb'); // Start immediately in orb phase
  const [visibleExamples, setVisibleExamples] = useState(0); // Start with no examples visible
  const [orbKey, setOrbKey] = useState(0); // Key to force orb refresh

  // Check if user has already signed up on component mount
  React.useEffect(() => {
    const checkSignupStatus = () => {
      const submitted = localStorage.getItem('email_signup_submitted');
      if (submitted) {
        setHasSignedUp(true);
        // Try to get the specific options they selected (if stored)
        const options = localStorage.getItem('email_signup_options');
        if (options) {
          try {
            setSignupOptions(JSON.parse(options));
          } catch (e) {
            // Default to both if we can't parse
            setSignupOptions({ earlyAccess: true, getUpdates: true });
          }
        } else {
          // Default to both if no specific options stored
          setSignupOptions({ earlyAccess: true, getUpdates: true });
        }
      }
    };

    checkSignupStatus();

    // Listen for signup events from EmailSignup component
    const handleSignupComplete = (event: CustomEvent) => {
      setHasSignedUp(true);
      setSignupOptions(event.detail || { earlyAccess: true, getUpdates: true });
    };

    window.addEventListener('emailSignupComplete', handleSignupComplete as EventListener);

    return () => {
      window.removeEventListener('emailSignupComplete', handleSignupComplete as EventListener);
    };
  }, []);

  // Animation sequence orchestration
  React.useEffect(() => {
    let timeoutIds: NodeJS.Timeout[] = [];
    let isActive = true; // Flag to prevent state updates after cleanup

    const startAnimationCycle = () => {
      if (!isActive) return; // Don't start if component is unmounting

      // Force complete reset and refresh orb
      setAnimationPhase('orb');
      setVisibleExamples(0);
      setOrbKey(prev => prev + 1); // Force orb to completely refresh

      // Phase 1: Orb animation (9.75 seconds)
      const timer1 = setTimeout(() => {
        if (!isActive) return;
        setAnimationPhase('examples');
      }, 9750);
      timeoutIds.push(timer1);

      // Phase 2: Text sequence (faster first 3 lines, longer tagline hold)
      const timer2 = setTimeout(() => {
        if (!isActive) return;
        setVisibleExamples(1); // "Financial services" appears
      }, 9750);
      timeoutIds.push(timer2);

      const timer3 = setTimeout(() => {
        if (!isActive) return;
        setVisibleExamples(2); // "AI SaaS" appears (1s later - FASTER)
      }, 10750);
      timeoutIds.push(timer3);

      const timer4 = setTimeout(() => {
        if (!isActive) return;
        setVisibleExamples(3); // "You name it." appears (1s later - FASTER)
      }, 11750);
      timeoutIds.push(timer4);

      const timer5 = setTimeout(() => {
        if (!isActive) return;
        setAnimationPhase('tagline'); // "More practice. More deals." appears (2s later)
      }, 13750);
      timeoutIds.push(timer5);

      // Phase 3: Clear everything for white screen gap
      const timer6 = setTimeout(() => {
        if (!isActive) return;
        setAnimationPhase('gap'); // White screen phase - nothing visible
        setVisibleExamples(0);
      }, 17750);
      timeoutIds.push(timer6);

      // Phase 4: Start next orb cycle after gap (total 19.5s cycle)
      const timer7 = setTimeout(() => {
        if (!isActive) return;
        startAnimationCycle(); // Restart with fresh orb
      }, 19500); // 9.75s orb + 8s text + 1.75s gap = 19.5s total cycle
      timeoutIds.push(timer7);
    };

    // Force fresh start
    setAnimationPhase('orb');
    setVisibleExamples(0);
    setOrbKey(0);

    // Small delay to ensure clean mount
    const initTimer = setTimeout(() => {
      if (isActive) {
        startAnimationCycle();
      }
    }, 100);

    // Comprehensive cleanup function for page navigation
    return () => {
      isActive = false; // Prevent any pending state updates
      clearTimeout(initTimer);
      timeoutIds.forEach(clearTimeout);
      
      // Force reset all state immediately on unmount
      setAnimationPhase('orb');
      setVisibleExamples(0);
      setOrbKey(0);
    };
  }, []); // Run only once on mount

  // handleScrollToEmailSignup function removed as it's no longer used by the primary CTA

  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i:number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.5,
        ease: "easeOut"
      }
    })
  };

  // Animation variants - zoom out effect (text comes from far away)
  const slamVariants = {
    hidden: { 
      opacity: 0,
      scale: 1.8, // Start large (far away)
    },
    visible: { 
      opacity: 1,
      scale: 1, // Scale down to normal (zoom out effect)
      transition: { 
        duration: 0.3, // Faster animation
        ease: [0.25, 0.8, 0.25, 1], // Custom easing for punch effect
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const taglineVariants = {
    hidden: { 
      opacity: 0, 
      y: 20 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    },
    exit: {
      opacity: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  const examples = [
    "Handle objections.",
    "Close more deals.", 
    "Find your confidence."
  ];

  return (
    <>
    {/* Removed the local scroll anchor div */}
    {/* <div ref={emailSignupAnchorRef} style={{ position: 'relative', top: '-80px', height: '1px' }} data-purpose="email-signup-scroll-anchor" /> */}
    <section className="min-h-[85vh] flex flex-col justify-center items-center pt-20 pb-12 sm:pt-24 sm:pb-16 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white relative">
      {/* Diagonal Maze Pattern - Top Right */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.09] pointer-events-none" style={{ transform: 'rotate(-45deg)', transformOrigin: 'top right' }}>
        <svg viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Maze grid pattern - extended coverage */}
          {/* Top edge paths */}
          <path d="M 50 0 L 50 80 L 100 80" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 100 0 L 100 40 L 150 40" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 150 0 L 150 120 L 200 120" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 200 0 L 200 80 L 250 80" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 250 0 L 250 60 L 300 60" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 300 0 L 300 100 L 350 100" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 350 0 L 350 40 L 400 40" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 400 0 L 400 120 L 450 120" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 450 0 L 450 80 L 500 80" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 500 0 L 500 60 L 550 60" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 550 0 L 550 90" stroke="#DC2626" strokeWidth="0.5"/>
          
          {/* Left edge paths */}
          <path d="M 0 50 L 80 50 L 80 100" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 100 L 40 100 L 40 150" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 150 L 120 150 L 120 200" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 200 L 60 200 L 60 250" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 250 L 100 250 L 100 300" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 300 L 80 300 L 80 350" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 350 L 120 350 L 120 400" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 400 L 60 400 L 60 450" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 450 L 80 450 L 80 500" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 500 L 90 500 L 90 550" stroke="#DC2626" strokeWidth="0.5"/>
          
          {/* Interior connecting paths */}
          <path d="M 100 80 L 100 120 L 150 120" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 150 40 L 150 80 L 200 80" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 200 120 L 200 160 L 250 160" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 250 60 L 250 100 L 300 100" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 300 100 L 300 140 L 350 140" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 350 40 L 350 80 L 400 80" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 400 120 L 400 160 L 450 160" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 450 80 L 450 120 L 500 120" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 500 60 L 500 100 L 550 100" stroke="#DC2626" strokeWidth="0.5"/>
          
          <path d="M 80 100 L 120 100 L 120 150" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 40 150 L 80 150 L 80 200" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 120 200 L 160 200 L 160 250" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 60 250 L 100 250 L 100 300" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 80 300 L 120 300 L 120 350" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 120 350 L 160 350 L 160 400" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 80 450 L 120 450 L 120 500" stroke="#DC2626" strokeWidth="0.5"/>
          
          <path d="M 200 160 L 200 200 L 240 200" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 250 120 L 250 160 L 290 160" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 300 140 L 300 180 L 340 180" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 350 100 L 350 140 L 390 140" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 400 80 L 400 120" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 450 160 L 450 200 L 490 200" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 500 120 L 500 160 L 540 160" stroke="#DC2626" strokeWidth="0.5"/>
        </svg>
      </div>
      
      {/* Diagonal Maze Pattern - Bottom Left */}
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] opacity-[0.09] pointer-events-none" style={{ transform: 'rotate(-45deg)', transformOrigin: 'bottom left' }}>
        <svg viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Maze grid pattern - extended coverage */}
          {/* Bottom edge paths */}
          <path d="M 50 600 L 50 520 L 100 520" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 100 600 L 100 560 L 150 560" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 150 600 L 150 480 L 200 480" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 200 600 L 200 520 L 250 520" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 250 600 L 250 540 L 300 540" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 300 600 L 300 500 L 350 500" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 350 600 L 350 560 L 400 560" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 400 600 L 400 480 L 450 480" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 450 600 L 450 520 L 500 520" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 500 600 L 500 540 L 550 540" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 550 600 L 550 510" stroke="#DC2626" strokeWidth="0.5"/>
          
          {/* Left edge paths */}
          <path d="M 0 550 L 80 550 L 80 500" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 500 L 40 500 L 40 450" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 450 L 120 450 L 120 400" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 400 L 60 400 L 60 350" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 350 L 100 350 L 100 300" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 300 L 80 300 L 80 250" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 250 L 120 250 L 120 200" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 200 L 60 200 L 60 150" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 150 L 80 150 L 80 100" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 0 100 L 90 100 L 90 50" stroke="#DC2626" strokeWidth="0.5"/>
          
          {/* Interior connecting paths */}
          <path d="M 100 520 L 100 480 L 150 480" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 150 560 L 150 520 L 200 520" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 200 480 L 200 440 L 250 440" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 250 540 L 250 500 L 300 500" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 300 500 L 300 460 L 350 460" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 350 560 L 350 520 L 400 520" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 400 480 L 400 440 L 450 440" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 450 520 L 450 480 L 500 480" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 500 540 L 500 500 L 550 500" stroke="#DC2626" strokeWidth="0.5"/>
          
          <path d="M 80 500 L 120 500 L 120 450" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 40 450 L 80 450 L 80 400" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 120 400 L 160 400 L 160 350" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 60 350 L 100 350 L 100 300" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 80 300 L 120 300 L 120 250" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 120 250 L 160 250 L 160 200" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 80 150 L 120 150 L 120 100" stroke="#DC2626" strokeWidth="0.5"/>
          
          <path d="M 200 440 L 200 400 L 240 400" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 250 480 L 250 440 L 290 440" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 300 460 L 300 420 L 340 420" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 350 500 L 350 460 L 390 460" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 400 520 L 400 480" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 450 440 L 450 400 L 490 400" stroke="#DC2626" strokeWidth="0.5"/>
          <path d="M 500 480 L 500 440 L 540 440" stroke="#DC2626" strokeWidth="0.5"/>
        </svg>
      </div>
      
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-center">
          {/* Left Column: Text Content */}
          <div className="order-1 lg:order-1 text-left">
            <h1 
              className="font-outfit font-bold text-gray-900 mb-8 sm:mb-10"
            >
              <span className="block text-[1.9rem] sm:text-4xl lg:text-5xl font-outfit font-bold leading-[1.05]">
                <span className="text-pitchiq-red">Stop Guessing.</span>
              </span>
              <span className="block text-[1.45rem] sm:text-[2rem] lg:text-[2.625rem] font-outfit font-bold text-gray-900 leading-tight mt-[0.35rem]">
                Get Clarity on<br/>Every Sales Call.
              </span>
            </h1>
             
            <div 
              className="text-lg sm:text-xl md:text-lg text-gray-700 max-w-2xl lg:mx-0 leading-relaxed mb-10 sm:mb-12 space-y-2"
            >
              <div className="flex items-start">
                <span className="text-pitchiq-red mr-3 mt-1">•</span>
                <span>Practice real conversations.</span>
              </div>
              <div className="flex items-start">
                <span className="text-pitchiq-red mr-3 mt-1">•</span>
                <span>Replay them.</span>
              </div>
              <div className="flex items-start">
                <span className="text-pitchiq-red mr-3 mt-1">•</span>
                <span>Actually learn.</span>
              </div>
            </div>
            
            <div
              className="flex flex-col sm:flex-row gap-4 justify-start mb-10 sm:mb-12"
            >
              <Button 
                size="lg" 
                className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg sm:text-base px-8 py-4 sm:px-6 sm:py-2 w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow duration-300 group"
                onClick={onOpenEmailModal}
              >
                Get Early Access
                <ArrowRight className="ml-2 -mr-1 h-5 w-5 sm:h-4 sm:w-4 transform transition-transform duration-150 group-hover:translate-x-1" />
              </Button>
            </div>

            {/* Sam - The Coach */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="flex items-start gap-3 mb-8 sm:mb-10"
            >
              {/* Sam's portrait - small, subtle */}
              <div className="relative flex-shrink-0">
                <img 
                  src="/sam-coach-new.png" 
                  alt="Sam"
                  className="w-12 h-12 rounded-full object-cover opacity-90"
                />
              </div>
              
              {/* Sam's message with typing animation */}
              <div className="flex-1 max-w-xs">
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 2, duration: 0.5 }}
                  className="text-xs text-gray-600 mb-1 font-medium"
                >
                  Meet Sam, your sales coach.
                </motion.div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5, duration: 0.5 }}
                  className="text-sm text-gray-700 leading-relaxed"
                >
                  <span className="inline-block">
                    I'll break down your calls after.
                  </span>
                </motion.div>
              </div>
            </motion.div>

            {/* Simple feature highlight */}
            <div 
              className="flex items-center justify-start"
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>Real voice conversations</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>Built for solo sellers</span>
                </div>
              </div>
            </div>
          </div>
          

          
          {/* Desktop Animation (unchanged) */}
          <motion.div
            className="order-2 lg:order-2 hidden lg:flex items-center justify-center min-h-[300px] lg:min-h-[400px] w-full h-full relative"
          >
            {/* Lottie Player - shows ONLY during 'orb' phase */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ 
                opacity: animationPhase === 'orb' ? 1 : 0,
                scale: animationPhase === 'orb' ? 1 : 0.8
              }}
              transition={{ duration: 1.0 }} // Slower fade for smoother transition
              className="absolute inset-0 flex items-center justify-center"
            >
              <dotlottie-player
                src="https://lottie.host/a603dda0-3101-4f88-ba7e-4d5abfb437af/rhSVnjdByJ.lottie"
                background="transparent"
                speed="1"
                style={{ width: '100%', height: '100%', maxWidth: '500px', maxHeight: '500px' }}
                loop
                autoplay
                key={orbKey}
              ></dotlottie-player>
            </motion.div>

            {/* Industry Examples - shows during 'examples' phase */}
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: animationPhase === 'examples' || animationPhase === 'tagline' ? 1 : 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <div className="space-y-3 mb-8">
                {examples.map((example, index) => (
                  <motion.div
                    key={index}
                    variants={animationPhase === 'gap' ? {} : slamVariants}
                    initial={animationPhase === 'gap' ? false : "hidden"}
                    animate={animationPhase === 'gap' ? false : (visibleExamples > index ? "visible" : "hidden")}
                    style={{
                      opacity: animationPhase === 'gap' ? 0 : (visibleExamples > index ? 1 : 0)
                    }}
                    transition={animationPhase === 'gap' ? { duration: 0.5, ease: "easeOut" } : undefined}
                    className="text-center"
                  >
                    <div className="text-lg md:text-xl font-medium text-pitchiq-red">
                      {example}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Separator - appears with tagline */}
              <motion.div
                variants={animationPhase === 'gap' ? {} : taglineVariants}
                initial={animationPhase === 'gap' ? false : "hidden"}
                animate={animationPhase === 'gap' ? false : (animationPhase === 'tagline' ? "visible" : "hidden")}
                style={{
                  opacity: animationPhase === 'gap' ? 0 : (animationPhase === 'tagline' ? 1 : 0)
                }}
                transition={animationPhase === 'gap' ? { duration: 0.5, ease: "easeOut" } : undefined}
                className="flex justify-center my-4"
              >
                <div className="w-12 h-px bg-gray-300"></div>
              </motion.div>

              {/* Tagline - appears below examples */}
              <motion.div
                variants={animationPhase === 'gap' ? {} : taglineVariants}
                initial={animationPhase === 'gap' ? false : "hidden"}
                animate={animationPhase === 'gap' ? false : (animationPhase === 'tagline' ? "visible" : "hidden")}
                style={{
                  opacity: animationPhase === 'gap' ? 0 : (animationPhase === 'tagline' ? 1 : 0)
                }}
                transition={animationPhase === 'gap' ? { duration: 0.5, ease: "easeOut" } : undefined}
                className="text-center"
              >
                <h3 className="text-xl md:text-2xl font-semibold text-gray-900">
                  That's where we come in.
                </h3>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>


    {/* Contact Modal */}
    <ContactModal 
      isOpen={isContactModalOpen} 
      onClose={() => setIsContactModalOpen(false)}
      hasEarlyAccess={hasSignedUp && signupOptions.earlyAccess}
    />
    </>
  );
};

export default HeroSection;


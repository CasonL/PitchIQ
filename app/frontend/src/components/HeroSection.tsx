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

      // Phase 2: Text sequence (8 seconds total)
      const timer2 = setTimeout(() => {
        if (!isActive) return;
        setVisibleExamples(1); // "Financial services" appears
      }, 9750);
      timeoutIds.push(timer2);

      const timer3 = setTimeout(() => {
        if (!isActive) return;
        setVisibleExamples(2); // "AI SaaS" appears
      }, 11750);
      timeoutIds.push(timer3);

      const timer4 = setTimeout(() => {
        if (!isActive) return;
        setVisibleExamples(3); // "You name it." appears
      }, 13750);
      timeoutIds.push(timer4);

      const timer5 = setTimeout(() => {
        if (!isActive) return;
        setAnimationPhase('tagline'); // "Your business, your world." appears
      }, 15750);
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
    "Compliance ready",
    "Measurable ROI", 
    "Enterprise grade"
  ];

  return (
    <>
    {/* Removed the local scroll anchor div */}
    {/* <div ref={emailSignupAnchorRef} style={{ position: 'relative', top: '-80px', height: '1px' }} data-purpose="email-signup-scroll-anchor" /> */}
    <section className="min-h-screen flex flex-col justify-center items-center pt-48 sm:pt-56 md:pt-64 lg:pt-72 xl:pt-80 pb-16 sm:pb-20 md:pb-24 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-center">
          {/* Left Column: Text Content */}
          <div className="order-1 lg:order-1 text-center lg:text-left">
                         <motion.h1 
               className="font-outfit font-bold text-gray-900 leading-tight mb-6 sm:mb-8"
               variants={textVariants}
               initial="hidden"
               animate="visible"
               custom={0} // Stagger delay index
             >
                               <span className="block text-4xl sm:text-5xl md:text-4xl lg:text-5xl font-outfit font-bold text-gray-900 leading-tight">
                  Transform Sales <span className="text-pitchiq-red">With AI Today</span>
                </span>
             </motion.h1>
             
             <motion.p 
               className="text-lg sm:text-xl md:text-lg text-gray-700 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-8 lg:mb-6"
               variants={textVariants}
               initial="hidden"
               animate="visible"
               custom={1} // Stagger delay index
             >
               AI-powered sales training that delivers measurable ROI for enterprise teams
             </motion.p>
            
            <motion.div
              variants={textVariants} // Can use the same or a new variant for button
              initial="hidden"
              animate="visible"
              custom={2} // Stagger delay index
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8 lg:mb-6"
            >
              <Button 
                size="lg" 
                className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg sm:text-base px-8 py-4 sm:px-6 sm:py-2 w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow duration-300 group"
                onClick={onOpenEmailModal}
              >
                Get Early Access
                <ArrowRight className="ml-2 -mr-1 h-5 w-5 sm:h-4 sm:w-4 transform transition-transform duration-150 group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {/* Simple feature highlight */}
            <motion.div 
              className="flex items-center justify-center lg:justify-start pt-2"
              variants={textVariants}
              initial="hidden"
              animate="visible"
              custom={3} // Stagger delay index
            >
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>40% faster ramp time</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span>Enterprise ready</span>
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Mobile Training Process Visual */}
          <div className="order-2 lg:hidden mt-12 mb-8">
            {/* Full-width red section with rounded top */}
            <div className="-mx-4 sm:-mx-6 bg-pitchiq-red/15 rounded-t-[3rem] pt-8 pb-6 px-4 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="space-y-6"
              >
              {/* Dashboard Preview */}
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                {/* Dashboard Header */}
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">Sales Training Dashboard</div>
                  </div>
                </div>
                
                {/* Dashboard Content */}
                <div className="p-6">
                  {/* Progress Overview */}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Team Performance</h3>
                    <div className="space-y-3">
                      {/* Sales Rep Progress */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>
                          <span className="text-sm text-gray-700">Sarah Martinez</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Progress</div>
                          <div className="text-sm font-semibold text-green-600">92%</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          </div>
                          <span className="text-sm text-gray-700">Mike Chen</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Progress</div>
                          <div className="text-sm font-semibold text-blue-600">78%</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          </div>
                          <span className="text-sm text-gray-700">Alex Johnson</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">Progress</div>
                          <div className="text-sm font-semibold text-yellow-600">45%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-pitchiq-red/5 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Avg. Ramp Time</div>
                      <div className="text-lg font-bold text-pitchiq-red">3.2 weeks</div>
                      <div className="text-xs text-green-600">↓ 40% faster</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Compliance</div>
                      <div className="text-lg font-bold text-green-600">98%</div>
                      <div className="text-xs text-green-600">✓ Enterprise ready</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Training Flow */}
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">AI-powered training adapts to each sales rep</div>
                <div className="flex items-center justify-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-pitchiq-red rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-600">Assess</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-pitchiq-red rounded-full animate-pulse delay-75"></div>
                    <span className="text-xs text-gray-600">Train</span>
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-400" />
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-pitchiq-red rounded-full animate-pulse delay-150"></div>
                    <span className="text-xs text-gray-600">Measure</span>
                  </div>
                </div>
              </div>
            </motion.div>
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
                    <div className="text-lg md:text-xl font-medium text-gray-900">
                      {example}
                    </div>
                  </motion.div>
                ))}
              </div>

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
                <h3 className="text-2xl md:text-3xl lg:text-4xl font-bold text-pitchiq-red">
                  Where compliance meets results.
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


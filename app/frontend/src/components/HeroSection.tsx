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

  return (
    <>
    {/* Removed the local scroll anchor div */}
    {/* <div ref={emailSignupAnchorRef} style={{ position: 'relative', top: '-80px', height: '1px' }} data-purpose="email-signup-scroll-anchor" /> */}
    <section className="min-h-screen flex flex-col justify-center items-center pt-32 md:pt-40 lg:pt-48 pb-20 md:pb-24 lg:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left Column: Text Content */}
          <div className="order-2 lg:order-1 text-center lg:text-left">
            <motion.h1 
              className="font-outfit font-bold text-gray-900 leading-tight mb-6"
              variants={textVariants}
              initial="hidden"
              animate="visible"
              custom={0} // Stagger delay index
            >
              <span className="block text-xl sm:text-2xl md:text-3xl font-medium text-pitchiq-red mb-1 md:mb-2 tracking-wider uppercase">AI Sales Coach</span>
              <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-outfit font-bold text-gray-900">
                Go From <span className="text-pitchiq-red">Unsure</span> to <span className="text-pitchiq-red">Unstoppable.</span>
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl lg:text-2xl text-gray-700 mb-8 max-w-2xl mx-auto lg:mx-0"
              variants={textVariants}
              initial="hidden"
              animate="visible"
              custom={1} // Stagger delay index
            >
              Practice with hyper-realistic AI buyers tailored to <em>your</em> world. Get instant feedback, perfect your pitch, multiply your wins.
            </motion.p>
            
            <motion.div 
              className="text-md md:text-lg text-gray-600 mb-10 max-w-xl mx-auto lg:mx-0 space-y-2"
              variants={textVariants}
              initial="hidden"
              animate="visible"
              custom={2} // Stagger delay index
            >
              <div className="flex items-start">
                <Check className="flex-shrink-0 h-5 w-5 sm:h-6 sm:w-6 text-green-500 mr-2 sm:mr-3 mt-0.5 sm:mt-1" />
                <span>Endless unique scenarios that adapt to you, 24/7.</span>
              </div>
              <div className="flex items-start">
                <Check className="flex-shrink-0 h-5 w-5 sm:h-6 sm:w-6 text-green-500 mr-2 sm:mr-3 mt-0.5 sm:mt-1" />
                <span>Feedback That Makes You a Closer.</span>
              </div>
              <div className="flex items-start">
                <Check className="flex-shrink-0 h-5 w-5 sm:h-6 sm:w-6 text-green-500 mr-2 sm:mr-3 mt-0.5 sm:mt-1" />
                <span>Confidence That Wins Any Room.</span>
              </div>
            </motion.div>
            
            <motion.div
              variants={textVariants} // Can use the same or a new variant for button
              initial="hidden"
              animate="visible"
              custom={3} // Stagger delay index
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8"
            >
              <Button 
                size="lg" 
                className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg md:text-xl px-8 py-3 md:px-10 md:py-4 w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow duration-300 group"
                onClick={onOpenEmailModal}
              >
                Get Early Access
                <ArrowRight className="ml-2 -mr-1 h-5 w-5 transform transition-transform duration-150 group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {/* Social proof - simplified and centered for mobile, start for lg */}
            <motion.div 
              className="flex items-center justify-center lg:justify-start pt-2"
              variants={textVariants}
              initial="hidden"
              animate="visible"
              custom={4} // Stagger delay index
            >
              <p className="text-sm text-gray-600">
                Be an Early Bird. <span className="font-semibold text-pitchiq-red">Get Exclusive Access.</span>
              </p>
            </motion.div>
          </div>
          
          {/* Right Column: AI Visualization Placeholder */}
          <motion.div
            className="order-1 lg:order-2 hidden lg:flex items-center justify-center min-h-[300px] lg:min-h-[400px] w-full h-full"
          >
            {/* Replace the Lottie component with dotlottie-player */}
            <dotlottie-player
              src="https://lottie.host/a603dda0-3101-4f88-ba7e-4d5abfb437af/rhSVnjdByJ.lottie"
              background="transparent"
              speed="1"
              style={{ width: '100%', height: '100%', maxWidth: '500px', maxHeight: '500px' }} // Adjusted style for React and responsiveness
              loop
              autoplay
            ></dotlottie-player>
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


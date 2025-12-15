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

  // Marcus interaction state
  const [marcusClicked, setMarcusClicked] = useState(false);
  const [visibleBullets, setVisibleBullets] = useState(0);

  // Check if user has already signed up on component mount
  React.useEffect(() => {
    const checkSignupStatus = () => {
      const submitted = localStorage.getItem('email_signup_submitted');
      if (submitted) {
        setHasSignedUp(true);
        const options = localStorage.getItem('email_signup_options');
        if (options) {
          try {
            setSignupOptions(JSON.parse(options));
          } catch (e) {
            setSignupOptions({ earlyAccess: true, getUpdates: true });
          }
        } else {
          setSignupOptions({ earlyAccess: true, getUpdates: true });
        }
      }
    };

    checkSignupStatus();

    const handleSignupComplete = (event: CustomEvent) => {
      setHasSignedUp(true);
      setSignupOptions(event.detail || { earlyAccess: true, getUpdates: true });
    };

    window.addEventListener('emailSignupComplete', handleSignupComplete as EventListener);

    return () => {
      window.removeEventListener('emailSignupComplete', handleSignupComplete as EventListener);
    };
  }, []);

  // Marcus click animation sequence
  React.useEffect(() => {
    if (!marcusClicked) {
      setVisibleBullets(0);
      return;
    }
    
    const timers: NodeJS.Timeout[] = [];
    
    // Show bullets with specific delays
    timers.push(setTimeout(() => setVisibleBullets(1), 300));
    timers.push(setTimeout(() => setVisibleBullets(2), 1000)); // 0.7s after first
    timers.push(setTimeout(() => setVisibleBullets(3), 2000)); // 1s after second
    
    return () => timers.forEach(clearTimeout);
  }, [marcusClicked]);

  // Animations removed for cleaner, faster hero

  return (
    <>
    {/* Removed the local scroll anchor div */}
    {/* <div ref={emailSignupAnchorRef} style={{ position: 'relative', top: '-80px', height: '1px' }} data-purpose="email-signup-scroll-anchor" /> */}
    <section className="min-h-[85vh] flex flex-col justify-center items-center py-20 md:py-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-white relative">
      {/* Background Images */}
      {/* Desktop/Landscape Background */}
      <div 
        className="absolute inset-0 hidden md:block bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url(/HeroBackgroundLandscape1.png)' }}
      ></div>
      
      {/* Mobile/Portrait Background */}
      <div 
        className="absolute inset-0 md:hidden bg-cover bg-center bg-no-repeat z-0"
        style={{ backgroundImage: 'url(/HeroBackgroundportrait1.png)' }}
      ></div>
      
      <div className="max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-16 items-center">
          {/* Left Column: Text Content */}
          <div className="order-1 lg:order-1 text-left">
            <h1 
              className="font-outfit font-bold mb-12 sm:mb-16 leading-tight pt-10 md:pt-14"
            >
              <span className="block text-[2rem] sm:text-4xl lg:text-5xl font-outfit font-bold text-gray-900">
                Stop Avoiding
              </span>
              <span className="block text-[2rem] sm:text-4xl lg:text-5xl font-outfit font-bold text-gray-900 mb-4">
                Customer Calls
              </span>
              <span className="block text-[1.75rem] sm:text-3xl lg:text-4xl font-outfit font-bold text-pitchiq-red mt-2">
                Gain Confidence
              </span>
              <span className="block text-[1.75rem] sm:text-3xl lg:text-4xl font-outfit font-bold text-pitchiq-red">
                With AI Prospects
              </span>
            </h1>
             
            <div 
              className="text-lg sm:text-xl text-gray-700 max-w-2xl lg:mx-0 leading-relaxed mb-12 sm:mb-16"
            >
              <p>
                <span className="font-semibold text-gray-900">You know what to do:</span>{' '}
                <span className="inline-flex gap-1.5 flex-nowrap whitespace-nowrap">
                  <span className="inline-block bg-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border-2 border-gray-400 text-gray-800 text-xs sm:text-base transition-all duration-200 hover:scale-105 hover:shadow-md hover:border-gray-500 cursor-default">reach out</span>
                  <span className="inline-block bg-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border-2 border-gray-400 text-gray-800 text-xs sm:text-base transition-all duration-200 hover:scale-105 hover:shadow-md hover:border-gray-500 cursor-default">book calls</span>
                  <span className="inline-block bg-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full border-2 border-gray-400 text-gray-800 text-xs sm:text-base transition-all duration-200 hover:scale-105 hover:shadow-md hover:border-gray-500 cursor-default">close clients</span>
                </span>
                <br />
                But your value isn't enough, so you don't.
              </p>
            </div>
            
            <div
              className="flex flex-col sm:flex-row gap-4 justify-start mb-12 sm:mb-16"
            >
              <Button 
                size="lg" 
                className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-lg sm:text-base px-8 py-4 sm:px-6 sm:py-2 w-full sm:w-auto shadow-lg hover:shadow-xl transition-shadow duration-300 group"
                onClick={onOpenEmailModal}
              >
                Build Your Confidence
                <ArrowRight className="ml-2 -mr-1 h-5 w-5 sm:h-4 sm:w-4 transform transition-transform duration-150 group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
          

          
          {/* Marcus Demo Icon - Interactive */}
          <div className="order-2 lg:order-2 hidden lg:flex items-center justify-center min-h-[300px] lg:min-h-[400px] w-full h-full">
            <div className="flex flex-col items-center gap-6" style={{ minHeight: '450px' }}>
              <motion.div 
                className="relative cursor-pointer"
                onClick={() => setMarcusClicked(!marcusClicked)}
                animate={!marcusClicked ? {
                  scale: [1, 1.02, 1],
                } : {}}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <img 
                  src="/charmer-portrait.png" 
                  alt="Marcus - AI Sales Prospect"
                  className="w-[280px] h-[280px] object-cover rounded-3xl border-2 border-black shadow-lg opacity-85 transition-all duration-300 hover:opacity-100 hover:scale-105 hover:shadow-2xl"
                />
                {/* Demo Coming Soon Badge */}
                <div className="absolute top-3 left-3">
                  <span className="inline-block bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full shadow-md whitespace-nowrap transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-default">
                    Demo coming soon
                  </span>
                </div>
              </motion.div>
              
              {/* Marcus Message Bullets - positioned below with proper spacing */}
              <div className="w-[300px] min-h-[120px]">
                <div className="flex flex-col gap-3 text-center">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: visibleBullets >= 1 ? 1 : 0, x: visibleBullets >= 1 ? 0 : -20 }}
                    transition={{ duration: 0.5 }}
                    className="text-gray-900 text-base font-medium"
                  >
                    Hi, I'm Marcus,
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: visibleBullets >= 2 ? 1 : 0, x: visibleBullets >= 2 ? 0 : -20 }}
                    transition={{ duration: 0.5 }}
                    className="text-gray-900 text-base font-medium"
                  >
                    You're first practice prospect.
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: visibleBullets >= 3 ? 1 : 0, x: visibleBullets >= 3 ? 0 : -20 }}
                    transition={{ duration: 0.5 }}
                    className="text-gray-900 text-base font-medium"
                  >
                    Ready to gain confidence and get more clients?
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
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


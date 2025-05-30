import React, { useState, useRef, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
// import { useAuthContext } from "@/context/AuthContext"; // Commented out for pre-launch
import EmailSignup from "./EmailSignup"; // Restored import
import ContactModal from "./ContactModal";
import { scrollToElement } from "@/lib/utils"; // Import the new utility
// useNavbarHeight is no longer needed directly in HeroSection for scrolling
// import { useNavbarHeight } from "@/context/NavbarHeightContext"; 

// Define props for HeroSection (no longer needs emailSignupAnchorRef)
interface HeroSectionProps {
  // emailSignupAnchorRef: RefObject<HTMLDivElement>; // This ref is for the SCROLL ANCHOR POINT - REMOVED
}

// Component no longer accepts emailSignupAnchorRef prop
const HeroSection = (/* { emailSignupAnchorRef }: HeroSectionProps */) => { // Removed prop
  // console.log('[HeroSection] Props received:', { emailSignupAnchorRef }); // Log incoming prop - REMOVED

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

  const handleScrollToEmailSignup = () => {
    console.log('[HeroSection] handleScrollToEmailSignup function CALLED - targeting internal hero email signup');
    scrollToElement('hero-email-signup'); 

    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('highlightEmailSignup', { detail: { targetId: 'hero-email-signup' } }));
    }, 800); 
  };

  return (
    <>
    {/* Removed the local scroll anchor div */}
    {/* <div ref={emailSignupAnchorRef} style={{ position: 'relative', top: '-80px', height: '1px' }} data-purpose="email-signup-scroll-anchor" /> */}
    <section className="min-h-screen flex flex-col justify-center pt-32 md:pt-48 lg:pt-64 pb-24 md:pb-32 lg:pb-48 px-4 md:px-6 lg:px-10 xl:px-20">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 items-center">
          <div className="order-2 lg:order-1">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-4 md:mb-6">
            AI Sales Training <span className="block sm:inline">for <span className="text-pitchiq-red">Elite Teams.</span></span>
            </h1>
            
            <p className="text-base md:text-lg lg:text-xl text-foreground/80 mb-6 md:mb-8 max-w-xl">
              Practice with AI buyers tailored to your industry. Build confidence, master objections, and win more deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 lg:mb-0">
              {/* Pre-launch: Focus on early access */}
              <Button 
                size="lg" 
                className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-base md:text-lg px-6 md:px-8 w-full sm:w-auto"
                onClick={handleScrollToEmailSignup}
              >
                Join the Waitlist
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base md:text-lg px-6 md:px-8 w-full sm:w-auto flex items-center gap-2"
                onClick={() => setIsContactModalOpen(true)}
              >
                <Mail className="h-4 w-4" />
                Contact Us
              </Button>
            </div>

            {/* Mobile: Social proof below buttons, above email */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center gap-3 justify-center sm:justify-start">
                <div className="flex -space-x-2">
                  <div className="w-4 h-4 rounded-full bg-gray-300 border-2 border-white"></div>
                  <div className="w-4 h-4 rounded-full bg-pitchiq-red border-2 border-white"></div>
                  <div className="w-4 h-4 rounded-full bg-pitchiq-navy border-2 border-white"></div>
                </div>
                <p className="text-xs text-foreground/70">
                  Be among the first to revolutionize your pitch.
                </p>
              </div>
            </div>

            {/* Mobile: Email capture below social proof - RESTORED */}
            <div className="lg:hidden">
              <EmailSignup id="hero-email-signup" />
            </div>
            
            {/* Desktop: Social proof below buttons */}
            <div className="hidden lg:block mt-8 md:mt-10">
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  <div className="w-5 h-5 rounded-full bg-gray-300 border-2 border-white"></div>
                  <div className="w-5 h-5 rounded-full bg-pitchiq-red border-2 border-white"></div>
                  <div className="w-5 h-5 rounded-full bg-pitchiq-navy border-2 border-white"></div>
                </div>
                <p className="text-sm text-foreground/70">
                  Be among the first to revolutionize your pitch.
                </p>
              </div>
            </div>
          </div>
          
          {/* Desktop: Email capture on the right - RESTORED */}
          <div className="hidden lg:block order-1 lg:order-2 relative">
            <EmailSignup id="hero-email-signup" />
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


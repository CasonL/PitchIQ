import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
// import { useAuthContext } from "@/context/AuthContext"; // Commented out for pre-launch
import EmailSignup from "./EmailSignup";
import ContactModal from "./ContactModal";

const HeroSection = () => {
  // const { isAuthenticated, isLoading } = useAuthContext(); // Commented out for pre-launch
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
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

  const scrollToEmailSignup = () => {
    // Find all elements with email-signup ID
    const elements = document.querySelectorAll('#email-signup');
    let targetElement = null;
    
    // Find the one in the hero section (not the bottom section)
    elements.forEach((element) => {
      const styles = window.getComputedStyle(element);
      const parentSection = element.closest('section');
      
      // Check if it's visible and in the hero section (has min-h-screen class)
      if (styles.display !== 'none' && parentSection?.classList.contains('min-h-screen')) {
        targetElement = element;
      }
    });
    
    // If no hero section email found, fall back to any visible one
    if (!targetElement) {
      elements.forEach((element) => {
        const styles = window.getComputedStyle(element);
        if (styles.display !== 'none') {
          targetElement = element;
        }
      });
    }
    
    if (targetElement) {
      // Get current scroll position to avoid cumulative errors
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
      const elementRect = targetElement.getBoundingClientRect();
      const elementTop = elementRect.top + currentScrollY;
      
      // Use a fixed offset that works well for both mobile and desktop
      const isMobile = window.innerWidth < 768;
      const offset = isMobile ? 80 : 100;
      const targetScrollY = elementTop - offset;
      
      // Ensure we don't scroll past the top of the page
      const finalScrollY = Math.max(0, targetScrollY);
      
      window.scrollTo({
        top: finalScrollY,
        behavior: 'smooth'
      });

      // Trigger highlight effect after scroll completes
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('highlightEmailSignup'));
      }, 800); // Delay to allow scroll to complete
    }
  };

  return (
    <>
    <section className="min-h-screen flex flex-col justify-center pt-32 md:pt-48 lg:pt-64 pb-24 md:pb-32 lg:pb-48 px-4 md:px-6 lg:px-10 xl:px-20">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 items-center">
          <div className="order-2 lg:order-1">
            <h1 className="text-6xl md:text-6xl lg:text-6xl xl:text-6xl font-bold leading-tight mb-4 md:mb-6">
            Stop Guessing,<br /> <span className="text-pitchiq-red">Start Closing.</span>
            </h1>
            
            <p className="text-base md:text-lg lg:text-xl text-foreground/80 mb-6 md:mb-8 max-w-xl">
              Practice with AI buyers tailored to your industry. Build confidence, master objections, and win more deals.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mb-6 lg:mb-0">
              {/* Pre-launch: Focus on early access */}
              <Button 
                size="lg" 
                className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white text-base md:text-lg px-6 md:px-8 w-full sm:w-auto"
                onClick={scrollToEmailSignup}
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

            {/* Mobile: Email capture below social proof */}
            <div className="lg:hidden">
              <EmailSignup />
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
          
          {/* Desktop: Email capture on the right */}
          <div className="hidden lg:block order-1 lg:order-2 relative">
            <EmailSignup />
          </div>
        </div>
      </div>
    </section>

    {/* Contact Modal */}
    <ContactModal 
      isOpen={isContactModalOpen} 
      onClose={() => setIsContactModalOpen(false)}
      hasEarlyAccess={hasSignedUp && signupOptions.earlyAccess}
      hasUpdates={hasSignedUp && signupOptions.getUpdates}
    />
    </>
  );
};

export default HeroSection;


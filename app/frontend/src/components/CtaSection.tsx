import React from "react";
import { Button } from "@/components/ui/button";
// import { Link } from 'react-router-dom'; // No longer needed here
// import { useAuthContext } from "@/context/AuthContext"; // Commented out for pre-launch

const CtaSection = () => {
  // const { isAuthenticated, isLoading } = useAuthContext(); // Commented out for pre-launch

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
    <section className="py-24 md:py-32 bg-pitchiq-navy">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Ready to Be First in Line?
        </h2>
        <p className="text-lg md:text-xl text-white/80 mb-10">
          Join our exclusive early access list and be among the first to experience the future of sales training.
        </p>
        {/* Pre-launch: Focus on early access */}
        <Button 
          size="lg" 
          className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-lg px-10"
          onClick={scrollToEmailSignup}
        >
          Join the Waitlist
            </Button>
      </div>
    </section>
  );
};

export default CtaSection;

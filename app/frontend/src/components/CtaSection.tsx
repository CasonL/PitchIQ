import React from "react";
import { Button } from "@/components/ui/button";
import { scrollToElement } from "@/lib/utils"; // Import the new utility
// import { Link } from 'react-router-dom'; // No longer needed here
// import { useAuthContext } from "@/context/AuthContext"; // Commented out for pre-launch

const CtaSection = () => {
  // const { isAuthenticated, isLoading } = useAuthContext(); // Commented out for pre-launch

  const handleScrollToEmailSignup = () => {
    // Always target a specific ID, e.g., 'primary-email-signup'
    // The highlighting event dispatch can be re-added here if needed, or handled by the EmailSignup component itself.
    scrollToElement('hero-email-signup');
    
    // If highlight is still needed and not handled by the target component:
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('highlightEmailSignup', { detail: { targetId: 'hero-email-signup' } }));
    }, 800); // Delay to allow scroll to complete
  };

  return (
    <section className="py-24 md:py-32 bg-pitchiq-navy">
      <div className="max-w-4xl mx-auto px-6 text-center">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">
          Ready to Be First in Line?
        </h2>
        <p className="text-lg md:text-xl text-white/80 mb-10">
          Join our exclusive early access list and be among the first to experience the future of sales training.
        </p>
        {/* Pre-launch: Focus on early access */}
        <Button 
          size="lg" 
          className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-lg px-10"
          onClick={handleScrollToEmailSignup} // Use the new handler
        >
          Join the Waitlist
        </Button>
      </div>
    </section>
  );
};

export default CtaSection;

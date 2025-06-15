import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutUsSection from "@/components/AboutUsSection";
import FeatureShowcase from "@/components/FeatureShowcase";
import HowItWorksSection from "@/components/HowItWorksSection";
import Footer from "@/components/Footer";
import EmailSignupModal from "@/components/EmailSignupModal";

import FloatingDemoBar from "@/components/landing/FloatingDemoBar";

// Enhanced EmailSignup for main landing to capture emails
import EmailSignup from "@/components/EmailSignup";

const LandingPage = () => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const openEmailSignupModal = () => setIsEmailModalOpen(true);

  const handleDemoSubmit = (product: string) => {
    // For now, just open the signup modal when demo is submitted
    // Later we can implement a different demo experience
    console.log('Demo submitted for product:', product);
    openEmailSignupModal();
  };

  useEffect(() => {
    // console.log("LandingPage with Demo mounted");
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar preRelease={false} onOpenEmailModal={openEmailSignupModal} />
      <main className="flex-grow">
        <HeroSection onOpenEmailModal={openEmailSignupModal} />
        <HowItWorksSection onOpenEmailModal={openEmailSignupModal} />
        <FeatureShowcase />
        <AboutUsSection onOpenEmailModal={openEmailSignupModal} />
        
        {/* Enhanced Signup Section */}
        <section id="signup" className="py-16 md:py-24 bg-gradient-to-br from-pitchiq-red/5 to-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Ready to Transform Your Sales Performance?
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Join sales professionals who are already using PitchIQ to close more deals and build confidence.
            </p>
            <EmailSignup id="main-email-signup" />
          </div>
        </section>
      </main>
      <Footer />
      
      {/* Floating Demo Bar */}
      <FloatingDemoBar 
        onDemoSubmit={handleDemoSubmit}
      />
      
      {/* Email Signup Modal */}
      <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
      />
    </div>
  );
};

export default LandingPage; 
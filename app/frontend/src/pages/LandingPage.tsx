import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutUsSection from "@/components/AboutUsSection";
import FeatureShowcase from "@/components/FeatureShowcase";
import HowItWorksSection from "@/components/HowItWorksSection";
import SEOBlogSection from "@/components/SEOBlogSection";
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
        <SEOBlogSection />
        <AboutUsSection onOpenEmailModal={openEmailSignupModal} />
      </main>
      <Footer />
      
      {/* Floating Demo Bar */}
      <FloatingDemoBar 
        onDemoSubmit={handleDemoSubmit}
        onOpenEmailModal={openEmailSignupModal}
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
import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutUsSection from "@/components/AboutUsSection";
// import FundingSection from "@/components/FundingSection";
import FeatureShowcase from "@/components/FeatureShowcase";
// import PersonaShowcaseSection from "@/components/PersonaShowcaseSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ComparisonSection from "@/components/ComparisonSection";
// import TestimonialsSection from "@/components/TestimonialsSection";
import Footer from "@/components/Footer";
// import TestimonialTicker from "@/components/TestimonialTicker";
import EmailSignupModal from "@/components/EmailSignupModal";

import InteractiveDemoSection from "@/components/landing/InteractiveDemoSection";

// Minimal EmailSignup for PreRelease to capture emails directly
import EmailSignup from "@/components/EmailSignup";

const PreReleaseLandingPage = () => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const openEmailSignupModal = () => setIsEmailModalOpen(true);

  useEffect(() => {
    // alert("PreReleaseLandingPage --- REALLY REALLY LATEST ---");
    // console.log("PreReleaseLandingPage mounted");
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar preRelease={true} onOpenEmailModal={openEmailSignupModal} />
      <main className="flex-grow">
        <HeroSection onOpenEmailModal={openEmailSignupModal} />
        <InteractiveDemoSection onSignupClick={openEmailSignupModal} />
        <HowItWorksSection onOpenEmailModal={openEmailSignupModal} />
        <FeatureShowcase />
        <ComparisonSection />
        <AboutUsSection onOpenEmailModal={openEmailSignupModal} />
        {/* <FundingSection /> */}
        {/* <PersonaShowcaseSection onOpenEmailModal={openEmailSignupModal} /> */}
        {/* <TestimonialsSection onOpenEmailModal={openEmailSignupModal} /> */}
        {/* <TestimonialTicker /> */}
        
        {/* Direct Email Signup Section for Pre-Release Focus */}
        <section id="prerelease-signup" className="py-16 md:py-24 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Be the First to Know
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              The full PitchIQ experience is launching soon. Sign up to get exclusive early access and updates.
            </p>
            <EmailSignup id="prerelease-email-signup" />
          </div>
        </section>
      </main>
      <Footer />
      <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
      />
    </div>
  );
};

export default PreReleaseLandingPage; 
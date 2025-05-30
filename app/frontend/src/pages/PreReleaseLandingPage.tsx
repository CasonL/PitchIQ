import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
// import AboutUsSection from "@/components/AboutUsSection";
// import FundingSection from "@/components/FundingSection";
// import FeatureShowcase from "@/components/FeatureShowcase";
// import PersonaShowcaseSection from "@/components/PersonaShowcaseSection";
// import HowItWorksSection from "@/components/HowItWorksSection";
// import TestimonialsSection from "@/components/TestimonialsSection";
import Footer from "@/components/Footer";
// import TestimonialTicker from "@/components/TestimonialTicker";
// import EmailSignupModal from "@/components/EmailSignupModal";
import ScrollToTopButton from "@/components/ScrollToTopButton";

// Minimal EmailSignup for PreRelease to capture emails directly
import EmailSignup from "@/components/EmailSignup";

const PreReleaseLandingPage = () => {
  // const [isEmailModalOpen, setIsEmailModalOpen] = useState(false); // Removed

  useEffect(() => {
    // alert("PreReleaseLandingPage --- REALLY REALLY LATEST ---");
    // console.log("PreReleaseLandingPage mounted");
  }, []);

  // const openEmailSignupModal = () => setIsEmailModalOpen(true); // Removed

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar preRelease={true} />
      <main className="flex-grow">
        <HeroSection />
        {/* <FeatureShowcase /> */}
        {/* <AboutUsSection /> */}
        {/* <FundingSection /> */}
        {/* <PersonaShowcaseSection onOpenEmailModal={openEmailSignupModal} /> */}
        {/* <HowItWorksSection /> */}
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
      <ScrollToTopButton />
      {/* <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
      /> */}
    </div>
  );
};

export default PreReleaseLandingPage; 
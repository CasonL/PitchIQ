import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeatureShowcase from "@/components/FeatureShowcase";
import AboutUsSection from "@/components/AboutUsSection";
// import FundingSection from "@/components/FundingSection"; // Remove this import
// import PersonaShowcaseSection from "@/components/PersonaShowcaseSection"; // Commented out
// import TestimonialsSection from "@/components/TestimonialsSection"; // Commented out
import Footer from "@/components/Footer";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import EmailSignupModal from "@/components/EmailSignupModal";

const Index = () => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const handleOpenEmailModal = () => {
    console.log("Open email modal triggered");
    setIsEmailModalOpen(true);
  };

  const handleCloseEmailModal = () => {
    setIsEmailModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar preRelease={true} onOpenEmailModal={handleOpenEmailModal} />
      <HeroSection onOpenEmailModal={handleOpenEmailModal} />
      <HowItWorksSection onOpenEmailModal={handleOpenEmailModal} />
      <FeatureShowcase />
      <AboutUsSection onOpenEmailModal={handleOpenEmailModal} />
      {/* <FundingSection /> */}
      {/* <PersonaShowcaseSection /> */}
      {/* <TestimonialsSection onOpenEmailModal={handleOpenEmailModal} /> */}
      <Footer />
      <ScrollToTopButton />
      <EmailSignupModal isOpen={isEmailModalOpen} onClose={handleCloseEmailModal} />
    </div>
  );
};

export default Index;

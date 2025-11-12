import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutUsSection from "@/components/AboutUsSection";
import FeatureShowcase from "@/components/FeatureShowcase";
import HowItWorksSection from "@/components/HowItWorksSection";
import ArchetypeSelectionSection from "@/components/ArchetypeSelectionSection";
import SEOBlogSection from "@/components/SEOBlogSection";
import Footer from "@/components/Footer";
import EmailSignupModal from "@/components/EmailSignupModal";

const LandingPage = () => {
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const openEmailSignupModal = () => setIsEmailModalOpen(true);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar preRelease={false} onOpenEmailModal={openEmailSignupModal} />
      <main className="flex-grow">
        <HeroSection onOpenEmailModal={openEmailSignupModal} />
        <ArchetypeSelectionSection onOpenEmailModal={openEmailSignupModal} />
        <HowItWorksSection onOpenEmailModal={openEmailSignupModal} />
        <FeatureShowcase />
        <SEOBlogSection />
        <AboutUsSection onOpenEmailModal={openEmailSignupModal} />
      </main>
      <Footer />
      
      {/* Email Signup Modal */}
      <EmailSignupModal 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
      />
    </div>
  );
};

export default LandingPage; 
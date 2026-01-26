import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import HowItWorksSolutionSection from "@/components/HowItWorksSolutionSection";
import HowItWorksSection from "@/components/HowItWorksSection";
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
        <HowItWorksSection onOpenEmailModal={openEmailSignupModal} />
        <HowItWorksSolutionSection />
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
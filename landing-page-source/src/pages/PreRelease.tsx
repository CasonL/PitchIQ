import React from "react";
import PreReleaseNavbar from "@/components/PreReleaseNavbar";
import PreReleaseHeroSection from "@/components/PreReleaseHeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TestimonialsSection from "@/components/TestimonialsSection";
// import PricingSection from "@/components/PricingSection"; // Commented out for pre-release
import CtaSection from "@/components/CtaSection";
import Footer from "@/components/Footer";

const PreRelease = () => {
  return (
    <div className="min-h-screen">
      <PreReleaseNavbar />
      <PreReleaseHeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      {/* Pricing section commented out for pre-release */}
      {/* <PricingSection /> */}
      <CtaSection />
      <Footer />
    </div>
  );
};

export default PreRelease; 
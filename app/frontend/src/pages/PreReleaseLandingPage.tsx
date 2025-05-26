import React from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection"; // We might want a specific PreReleaseHeroSection later
import AboutUsSection from "@/components/AboutUsSection";
import FundingSection from "@/components/FundingSection";
import FeatureShowcase from "@/components/FeatureShowcase";
import PersonaShowcaseSection from "@/components/PersonaShowcaseSection";
import HowItWorksSection from "@/components/HowItWorksSection"; // This can be the general one
import TestimonialsSection from "@/components/TestimonialsSection";
import Footer from "@/components/Footer";
// EmailSignup will be part of the Hero or a dedicated section for pre-release

const PreReleaseLandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar preRelease={true} /> {/* Pass preRelease prop */}
      <HeroSection /> {/* This HeroSection already includes EmailSignup */}
      <FeatureShowcase />
      <AboutUsSection />
      <FundingSection />
      <PersonaShowcaseSection />
      <HowItWorksSection />
      <TestimonialsSection />
      {/* No PricingSection */}
      <Footer />
    </div>
  );
};

export default PreReleaseLandingPage; 
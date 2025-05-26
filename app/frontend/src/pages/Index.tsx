import React from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeatureShowcase from "@/components/FeatureShowcase";
import AboutUsSection from "@/components/AboutUsSection";
import FundingSection from "@/components/FundingSection";
import PersonaShowcaseSection from "@/components/PersonaShowcaseSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <HeroSection />
      <FeatureShowcase />
      <AboutUsSection />
      <FundingSection />
      <PersonaShowcaseSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <Footer />
    </div>
  );
};

export default Index;

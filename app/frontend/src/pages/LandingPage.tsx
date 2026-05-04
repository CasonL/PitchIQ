import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Pain from "@/components/landing/Pain";
import Demo from "@/components/landing/Demo";
import HowItWorks from "@/components/landing/HowItWorks";
import Results from "@/components/landing/Results";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <Hero />
      <Pain />
      <Demo />
      <HowItWorks />
      <Results />
      <CTA />
      <Footer />
    </div>
  );
};

export default LandingPage;
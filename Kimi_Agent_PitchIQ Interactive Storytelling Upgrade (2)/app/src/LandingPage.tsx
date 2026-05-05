import Navbar from "./sections/Navbar";
import Hero from "./sections/Hero";
import Pain from "./sections/Pain";
import Demo from "./sections/Demo";
import HowItWorks from "./sections/HowItWorks";
import Results from "./sections/Results";
import CTA from "./sections/CTA";
import Footer from "./sections/Footer";

function LandingPage() {
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
}

export default LandingPage;

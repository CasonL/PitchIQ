import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import MissionSection from "@/components/MissionSection";
import ConditionsSection from "@/components/ConditionsSection";
import FinalThoughtSection from "@/components/FinalThoughtSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <MissionSection />
      <ConditionsSection />
      <FinalThoughtSection />
      <Footer />
    </div>
  );
};

export default Index;

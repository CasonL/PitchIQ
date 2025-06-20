import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
// import { Link } from "react-router-dom"; // No longer needed here
import { useAuthContext } from "@/context/AuthContext"; // Import the context hook

interface PricingPlanProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  primary?: boolean;
  delay: string;
  isAuthenticated: boolean;
}

const PricingPlan = ({ name, price, description, features, buttonText, primary = false, delay, isAuthenticated }: PricingPlanProps) => {
  return (
    <div 
      className={`rounded-xl p-8 animate-fade-in ${primary ? 'bg-gradient-to-br from-pitchiq-navy to-pitchiq-dark text-white' : 'bg-white shadow-sm border'}`}
      style={{ animationDelay: delay }}
    >
      <h3 className="text-xl font-bold mb-2">{name}</h3>
      <div className="mb-4">
        <span className="text-3xl font-bold">{price}</span>
        {price !== "Custom" && <span className="text-sm opacity-80">/month</span>}
      </div>
      <p className={`mb-6 ${primary ? 'opacity-90' : 'text-foreground/70'}`}>{description}</p>
      
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <div className={`mt-1 ${primary ? 'text-white' : 'text-pitchiq-red'}`}>
              <Check className="h-4 w-4" />
            </div>
            <span className={primary ? 'opacity-90' : 'text-foreground/80'}>{feature}</span>
          </li>
        ))}
      </ul>
      
      <a href={isAuthenticated ? "/training/dashboard" : "/auth/signup"}>
        <Button 
          className={`w-full ${primary ? 'bg-white hover:bg-gray-100 text-pitchiq-navy' : 'bg-pitchiq-red text-white hover:bg-pitchiq-red/90'} btn-hover-effect`}
          variant={primary ? "outline" : "default"}
        >
          {buttonText}
        </Button>
      </a>
    </div>
  );
};

const PricingSection = () => {
  // const { isAuthenticated } = useAuth(); // Placeholder: Get auth state
  // const isAuthenticated = false; // TEMP: Replace with actual auth check - REMOVED
  const { isAuthenticated, isLoading } = useAuthContext(); // Use the context

  // Render nothing or a loader while checking auth status
  if (isLoading) {
    // Optionally return a loader component here
    return null; // Or <LoadingSpinner />; 
  }

  return (
    <section id="pricing" className="py-32 md:py-48 px-6 md:px-10 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Find Your Perfect Fit.</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Simple, transparent pricing to fuel your sales growth.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <PricingPlan 
            name="Free" 
            price="$0" 
            description="Get started with core AI practice features, completely free."
            features={[
              "15 AI roleplays / month",
              "Advanced Feedback & Analysis",
              "Infinite Scenarios & Personas",
              "Progress Tracking"
            ]}
            buttonText="Get Started Free"
            delay="0.1s"
            primary={false}
            isAuthenticated={isAuthenticated}
          />
          <PricingPlan 
            name="Starter" 
            price="$17" 
            description="Unlock more practice and personalized AI coaching."
            features={[
              "30 AI roleplays / month",
              "AI Coach for tailored learning",
              "Emotional Analysis",
            ]}
            buttonText="Get Started Free"
            primary={true}
            delay="0.3s"
            isAuthenticated={isAuthenticated}
          />
          <PricingPlan 
            name="Pro" 
            price="$33" 
            description="Unlimited practice, live feedback, and premium support."
            features={[
              "Unlimited AI roleplays", 
              "Live Feedback during sessions",
              "Priority Support",
              "Full access to PitchEDU (soon)",
            ]}
            buttonText="Get Started Free"
            delay="0.5s"
            primary={false}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

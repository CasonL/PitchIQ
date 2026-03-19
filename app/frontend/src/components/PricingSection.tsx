import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useAuthContext } from "@/context/AuthContext";

interface PricingPlanProps {
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  calls: string;
  description: string;
  features: string[];
  buttonText: string;
  primary?: boolean;
  delay: string;
  isAuthenticated: boolean;
  isYearly: boolean;
  badge?: string;
}

const PricingPlan = ({ name, monthlyPrice, yearlyPrice, calls, description, features, buttonText, primary = false, delay, isAuthenticated, isYearly, badge }: PricingPlanProps) => {
  const displayPrice = isYearly ? yearlyPrice : monthlyPrice;
  const isFree = monthlyPrice === 0;
  
  return (
    <div 
      className={`rounded-xl p-8 animate-fade-in relative ${primary ? 'bg-gradient-to-br from-pitchiq-navy to-pitchiq-dark text-white ring-2 ring-pitchiq-red' : 'bg-white shadow-sm border'}`}
      style={{ animationDelay: delay }}
    >
      {badge && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-pitchiq-red text-white text-xs font-bold px-4 py-1 rounded-full">
            {badge}
          </span>
        </div>
      )}
      <h3 className="text-lg font-bold mb-2">{name}</h3>
      <div className="mb-2">
        {isFree ? (
          <span className="text-3xl font-bold">$0</span>
        ) : (
          <>
            <span className="text-3xl font-bold">${displayPrice}</span>
            <span className="text-sm opacity-80">/month</span>
          </>
        )}
      </div>
      {!isFree && isYearly && (
        <p className="text-sm opacity-70 mb-2">
          ${(yearlyPrice * 12).toFixed(0)} billed annually
        </p>
      )}
      <p className={`text-sm font-semibold mb-4 ${primary ? 'text-white' : 'text-pitchiq-red'}`}>
        {calls}
      </p>
      <p className={`mb-6 text-sm ${primary ? 'opacity-90' : 'text-foreground/70'}`}>{description}</p>
      
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
  const { isAuthenticated, isLoading } = useAuthContext();
  const [isYearly, setIsYearly] = useState(false);

  if (isLoading) {
    return null;
  }

  return (
    <section id="pricing" className="py-32 md:py-48 px-6 md:px-10 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 font-outfit text-gray-900">
            Progress Capacity, Not Just Access
          </h2>
          <p className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto mb-8">
            Train smarter with usage-based pricing that scales with your commitment.
          </p>
          
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 bg-white rounded-full p-1 border shadow-sm">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                !isYearly
                  ? 'bg-pitchiq-navy text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                isYearly
                  ? 'bg-pitchiq-navy text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs font-bold text-pitchiq-red">
                Save 20%
              </span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <PricingPlan 
            name="Free" 
            monthlyPrice={0}
            yearlyPrice={0}
            calls="10 calls/month"
            description="For testing the waters, not mastering the craft."
            features={[
              "10 practice calls per month",
              "Core feedback (high-level breakdowns)",
              "Basic progress tracking",
              "Limited scenarios & personas",
              "Overage: $0.75/call"
            ]}
            buttonText="Start Free"
            delay="0.1s"
            primary={false}
            isAuthenticated={isAuthenticated}
            isYearly={isYearly}
          />
          <PricingPlan 
            name="Core" 
            monthlyPrice={39}
            yearlyPrice={31}
            calls="50 calls/month"
            description="The standard training band for reps who actually want to improve."
            features={[
              "50 practice calls per month",
              "Deep moment breakdowns",
              "Retry loops with guided improvement",
              "Full analytics dashboard",
              "Standard personas & difficulty modes",
              "Overage: $0.75/call"
            ]}
            buttonText="Start Training"
            primary={true}
            delay="0.3s"
            isAuthenticated={isAuthenticated}
            isYearly={isYearly}
            badge="MOST POPULAR"
          />
          <PricingPlan 
            name="Power" 
            monthlyPrice={69}
            yearlyPrice={55}
            calls="150 calls/month"
            description="For reps who treat this like the gym, not a demo."
            features={[
              "150 practice calls per month",
              "Advanced persona modes (hard, unsellable, edge cases)",
              "Custom scenarios (your product, your market)",
              "Priority feedback processing",
              "Enhanced coaching depth (more precise breakdowns)",
              "Overage: $0.75/call"
            ]}
            buttonText="Go Power"
            delay="0.5s"
            primary={false}
            isAuthenticated={isAuthenticated}
            isYearly={isYearly}
          />
        </div>
        
        {/* Overage Note */}
        <div className="text-center">
          <p className="text-sm text-foreground/60 max-w-2xl mx-auto">
            <span className="font-semibold text-foreground/80">Soft caps, not hard limits.</span>
            {" "}Need more reps? Overages are $0.75/call. No surprise bills—track your usage in real-time.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

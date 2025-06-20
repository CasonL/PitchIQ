
import React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface PricingPlanProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  primary?: boolean;
  delay: string;
}

const PricingPlan = ({ name, price, description, features, buttonText, primary = false, delay }: PricingPlanProps) => {
  return (
    <div 
      className={`rounded-xl p-8 animate-fade-in ${primary ? 'bg-gradient-to-br from-pitchiq-purple to-pitchiq-purple-dark text-white' : 'bg-white shadow-sm'}`}
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
            <div className={`mt-1 ${primary ? 'text-white' : 'text-green-500'}`}>
              <Check className="h-4 w-4" />
            </div>
            <span className={primary ? 'opacity-90' : 'text-foreground/80'}>{feature}</span>
          </li>
        ))}
      </ul>
      
      <Button 
        className={`w-full ${primary ? 'bg-white hover:bg-gray-100 text-pitchiq-purple' : 'bg-pitchiq-purple text-white hover:bg-pitchiq-purple-dark'} btn-hover-effect`}
        variant={primary ? "outline" : "default"}
      >
        {buttonText}
      </Button>
    </div>
  );
};

const PricingSection = () => {
  return (
    <section id="pricing" className="py-16 md:py-24 px-6 md:px-10 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Pricing Plans</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Choose the perfect plan for your sales training needs. All plans include access to our AI conversation practice technology.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <PricingPlan 
            name="Starter" 
            price="$49" 
            description="Perfect for individual sales professionals looking to improve their skills."
            features={[
              "10 AI practice conversations per month",
              "Basic feedback and analysis",
              "5 pre-built sales scenarios",
              "Email support"
            ]}
            buttonText="Start Free Trial"
            delay="0.1s"
          />
          <PricingPlan 
            name="Professional" 
            price="$129" 
            description="Ideal for serious sales professionals who want comprehensive training."
            features={[
              "Unlimited AI practice conversations",
              "Advanced feedback with actionable tips",
              "30+ pre-built sales scenarios",
              "Custom scenario creation",
              "Performance analytics dashboard",
              "Priority support"
            ]}
            buttonText="Start Free Trial"
            primary={true}
            delay="0.3s"
          />
          <PricingPlan 
            name="Team" 
            price="Custom" 
            description="Complete solution for sales teams and organizations."
            features={[
              "Everything in Professional plan",
              "Team management dashboard",
              "Customized training programs",
              "Industry-specific scenarios",
              "Team performance analytics",
              "Dedicated account manager",
              "Training workshops"
            ]}
            buttonText="Contact Sales"
            delay="0.5s"
          />
        </div>
      </div>
    </section>
  );
};

export default PricingSection;

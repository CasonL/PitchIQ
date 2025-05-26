import React from "react";
import { Button } from "@/components/ui/button";
import { Clock, Users, Brain, Lightbulb, BarChart3, Sparkles, Target, ArrowRight, ArrowDown } from 'lucide-react';
import { useAuthContext } from "@/context/AuthContext";

const steps = [
  {
    icon: <Brain size={24} className="text-pitchiq-red" />,
    number: "01",
    title: "Your Offer",
    description: "What you sell + core value",
    delay: "0.1s"
  },
  {
    icon: <Users size={24} className="text-pitchiq-red" />,
    number: "02", 
    title: "Target Audience",
    description: "Who buys from you",
    delay: "0.2s"
  },
  {
    icon: <BarChart3 size={24} className="text-pitchiq-red" />,
    number: "03",
    title: "Sales Context",
    description: "Your cycle + environment",
    delay: "0.3s"
  },
  {
    icon: <Target size={24} className="text-pitchiq-red" />,
    number: "04",
    title: "Methodology",
    description: "Your sales approach",
    delay: "0.4s"
  },
  {
    icon: <Lightbulb size={24} className="text-pitchiq-red" />,
    number: "05",
    title: "Focus Area",
    description: "What to improve",
    delay: "0.5s"
  },
];

const HowItWorksSection = () => {
  const { isAuthenticated, isLoading } = useAuthContext();

  return (
    <section id="how-it-works" className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24 lg:py-32 px-4 md:px-6 lg:px-10 xl:px-20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-pitchiq-red/10 text-pitchiq-red px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium mb-4">
            <Sparkles className="h-3 w-3 md:h-4 md:w-4" />
            AI-Powered Setup
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 px-4">5 Questions. Infinite Possibilities.</h2>
          <p className="text-base md:text-lg text-foreground/70 max-w-2xl mx-auto px-4">
            Our AI analyzes your responses and builds a complete training environment tailored to your sales reality.
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-pitchiq-red" />
            <span className="text-pitchiq-red font-medium text-xs md:text-sm">8 minutes to complete</span>
          </div>
        </div>

        {/* Steps with Responsive Layout */}
        <div className="relative mb-12 md:mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-6">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <div className="text-center animate-fade-in group cursor-pointer" style={{ animationDelay: step.delay }}>
                  {/* Icon and Number */}
                  <div className="relative mx-auto mb-4 w-14 h-14 md:w-16 md:h-16 group-hover:scale-110 transition-transform duration-300">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-pitchiq-red/10 group-hover:bg-pitchiq-red/20 flex items-center justify-center transition-colors duration-300">
                      {step.icon}
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-pitchiq-red rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {step.number}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-base md:text-lg font-semibold mb-2 group-hover:text-pitchiq-red transition-colors duration-300">{step.title}</h3>
                  <p className="text-sm text-foreground/70 px-2">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Intelligence Showcase */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl md:rounded-2xl p-6 md:p-8 hover:shadow-lg transition-shadow duration-300 mx-2 md:mx-0">
          <div className="text-center">
            <Brain className="h-10 w-10 md:h-12 md:w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg md:text-xl font-bold mb-3">AI Analyzes Every Response</h3>
            <p className="text-sm md:text-base text-foreground/70 max-w-2xl mx-auto">
              As you answer, our AI extracts business details, suggests personas, maps your sales environment, 
              and builds scenarios that mirror your exact selling situation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;


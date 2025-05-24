import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from '@/components/ui/card';
import { Zap, MessageCircle, Target, Award } from 'lucide-react';
// import { Link } from 'react-router-dom'; // No longer needed here
import { useAuthContext } from "@/context/AuthContext"; // Import the context hook

const steps = [
  {
    icon: <Zap size={28} className="text-pitchiq-red" />,
    title: "1. Instant Setup",
    description: "Answer a few quick questions about your role, product, and target market. PitchIQ tailors the experience instantly.",
    delay: "0.1s"
  },
  {
    icon: <MessageCircle size={28} className="text-pitchiq-red" />,
    title: "2. Realistic Roleplay",
    description: "Engage in voice or text conversations with AI buyers who have unique personalities, objections, and needs.",
    delay: "0.3s"
  },
  {
    icon: <Target size={28} className="text-pitchiq-red" />,
    title: "3. Actionable Feedback",
    description: "Receive detailed analysis on your performance, identifying strengths and areas for improvement.",
    delay: "0.5s"
  },
  {
    icon: <Award size={28} className="text-pitchiq-red" />,
    title: "4. Master Your Craft",
    description: "Practice consistently, track your progress, and turn weaknesses into strengths.",
    delay: "0.7s"
  },
];

const HowItWorksSection = () => {
  // const { isAuthenticated } = useAuth(); // Placeholder: Get auth state
  // const isAuthenticated = false; // TEMP: Replace with actual auth check - REMOVED
  const { isAuthenticated, isLoading } = useAuthContext(); // Use the context

  return (
    <section id="how-it-works" className="bg-gradient-to-b from-gray-50 to-white py-32 md:py-48 px-6 md:px-10 lg:px-20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How PitchIQ Works</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Four simple steps to elevate your sales skills from novice to pro.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {steps.map((step) => (
            <Card key={step.title} className="bg-white shadow-sm border animate-fade-in" style={{ animationDelay: step.delay }}>
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-pitchiq-red/10">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-foreground/80">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center animate-fade-in" style={{ animationDelay: '0.9s' }}>
          {!isLoading && (
            <a href={isAuthenticated ? "/training/dashboard" : "/auth/signup"}>
              <Button size="lg" className="bg-pitchiq-red hover:bg-pitchiq-red/90">
                Get Started Free
              </Button>
            </a>
          )}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

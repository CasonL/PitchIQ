
import React from "react";
import { CircleCheck, MessageSquare, Award } from "lucide-react";

const FeatureCard = ({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: string }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm card-hover animate-fade-in" style={{ animationDelay: delay }}>
      <div className="w-12 h-12 rounded-full bg-pitchiq-purple/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-foreground/70">{description}</p>
    </div>
  );
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 md:py-24 px-6 md:px-10 lg:px-20 bg-gradient-to-b from-pitchiq-gray-light to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Elevate Your Sales Skills</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            PitchIQ combines cutting-edge AI technology with tried-and-tested sales methodologies to create a revolutionary training experience.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<MessageSquare className="h-6 w-6 text-pitchiq-purple" />}
            title="Realistic Conversations" 
            description="Practice with AI buyers that respond naturally and challenge you like real prospects would."
            delay="0.1s"
          />
          <FeatureCard 
            icon={<CircleCheck className="h-6 w-6 text-pitchiq-purple" />}
            title="Instant Feedback" 
            description="Get actionable insights on your performance, tone, and technique immediately after each practice session."
            delay="0.3s"
          />
          <FeatureCard 
            icon={<Award className="h-6 w-6 text-pitchiq-purple" />}
            title="Skill Development" 
            description="Master objection handling, needs assessment, value proposition delivery, and closing techniques."
            delay="0.5s"
          />
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

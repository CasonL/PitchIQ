import React from "react";
import { CircleCheck, MessageSquare, Award } from "lucide-react";

const FeatureCard = ({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: string }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm card-hover animate-fade-in" style={{ animationDelay: delay }}>
      <div className="w-12 h-12 rounded-full bg-pitchiq-red/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-foreground/70">{description}</p>
    </div>
  );
};

const FeaturesSection = () => {
  return (
    <section id="features" className="py-16 md:py-24 px-6 md:px-10 lg:px-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Train Like a Pro, Sell Like a Closer.</h2>
          <p className="text-lg text-foreground/70 max-w-2xl mx-auto">
            Turn weaknesses into strengths with AI-driven practice and feedback.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<MessageSquare className="h-6 w-6 text-pitchiq-red" />}
            title="Hyper-Realistic Practice"
            description="Face AI buyers that act, object, and challenge like real prospects."
            delay="0.1s"
          />
          <FeatureCard 
            icon={<CircleCheck className="h-6 w-6 text-pitchiq-red" />}
            title="Instant, Actionable Feedback"
            description="Pinpoint mistakes and successes immediately. Know exactly how to improve."
            delay="0.3s"
          />
          <FeatureCard 
            icon={<Award className="h-6 w-6 text-pitchiq-red" />}
            title="Master Key Skills"
            description="Nail objection handling, closing, value props, and more critical techniques."
            delay="0.5s"
          />
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

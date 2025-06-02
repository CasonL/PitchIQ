import React from "react";
import { Users, MessageSquare, Zap, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import StaticFeatureCard from "./StaticFeatureCard";

// Data for the static feature cards - Transformation Pathway
// Reordered based on user feedback for impact
const featureData = [
  {
    id: 'rapid-skill-mastery',
    Icon: Zap,
    iconColor: 'text-green-500',
    title: "Master Sales Skills at AI Speed",
    text: "Become a top performer in weeks, not years. Our 24/7 AI coach pinpoints weaknesses and delivers hyper-focused training. Outlearn. Outperform."
  },
  {
    id: 'compelling-value',
    Icon: Sparkles,
    iconColor: 'text-red-500',
    title: "Make Your Value Undeniable",
    text: "Stop just pitching—start compelling. Articulate your solution so powerfully it becomes the only logical choice for your buyer."
  },
  {
    id: 'conversation-command',
    Icon: MessageSquare,
    iconColor: 'text-yellow-500',
    title: "Command Every Sales Conversation",
    text: "Master deep questioning, overcome objections with finesse, and confidently guide buyers to 'yes'. PitchIQ puts you in full command."
  },
  {
    id: 'buyer-clarity',
    Icon: Users,
    iconColor: 'text-blue-500',
    title: "Gain Unshakeable Buyer Clarity",
    text: "PitchIQ's AI mirrors your ideal clients, revealing their world so you anticipate moves, forge connections, and convert. Pure, actionable insight."
  }
];

const FeatureShowcase = () => {
  return (
    <section id="features" className="py-16 md:py-20 lg:py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl font-outfit font-bold text-gray-800">
            Your Ascent to Sales Mastery
          </h2>
          <p className="mt-3 text-lg md:text-xl text-gray-600 font-outfit max-w-2xl mx-auto">
            PitchIQ doesn't just teach skills; it transforms your entire sales approach. Here's how you'll evolve:
          </p>
        </div>
        <div className="flex flex-col space-y-10 md:space-y-12 items-center">
          {featureData.map((feature, index) => (
            <StaticFeatureCard
              key={feature.id}
              icon={feature.Icon}
              iconColor={feature.iconColor}
              title={feature.title}
              text={feature.text}
              // Potentially add an index prop if you want to vary animations or styles
              // index={index} 
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
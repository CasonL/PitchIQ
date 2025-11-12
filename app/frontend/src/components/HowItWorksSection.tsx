import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Users,
  Phone,
  MessageSquare,
  ArrowRight
} from 'lucide-react';

// Simple 3-step process for solo consultants
const steps = [
  {
    icon: Users,
    number: "1",
    title: "Choose Your Prospect",
    description: "Pick from 10 AI prospects—each one's a different nightmare. Skeptics, budget hawks, time wasters. You know the type."
  },
  {
    icon: Phone,
    number: "2",
    title: "Have a Real Conversation",
    description: "Talk out loud like you're on a real call. They interrupt you. They push back. They ask annoying questions. Just like real prospects."
  },
  {
    icon: MessageSquare,
    number: "3",
    title: "Get Coaching from Sam",
    description: "After the call, Sam tells you what you nailed and where you fumbled. No sugar-coating. Just what to fix for next time."
  },
];

interface HowItWorksProps {
  onOpenEmailModal: () => void;
}

const HowItWorksSection: React.FC<HowItWorksProps> = ({ onOpenEmailModal }) => {
  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  return (
    <motion.section 
      id="how-it-works" 
      className="py-16 md:py-24 bg-background"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="text-left lg:text-center mb-12 md:mb-16 sm:mr-24 md:mr-32 lg:mr-0" variants={itemVariants}>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 font-outfit text-gray-900">
            How It Works
          </h2>
          <p className="text-lg md:text-xl text-foreground/80 max-w-3xl lg:mx-auto">
            Three steps, that's it.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div 
              key={step.number} 
              className="bg-white p-8 rounded-lg border border-black text-center"
              variants={itemVariants}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pitchiq-red/10 mb-6">
                <step.icon className="w-8 h-8 text-pitchiq-red" />
              </div>
              <div className="text-sm font-bold text-pitchiq-red mb-2">STEP {step.number}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{step.title}</h3>
              <p className="text-gray-600">{step.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button 
            variant="default"
            size="lg" 
            onClick={onOpenEmailModal}
            className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white font-semibold py-3 px-8 text-lg rounded-lg group"
          >
            Get Early Access <ArrowRight className="w-5 h-5 ml-2 inline-block transform transition-transform duration-150 group-hover:translate-x-1" />
          </Button>
          <p className="text-sm text-gray-600 mt-3">No credit card. No BS. Just practice.</p>
        </div>
      </div>
    </motion.section>
  );
};

export default HowItWorksSection;


import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Sparkles, // Icons for features
  Clock,    // Time Estimate
  Brain,    // For AI Tailors Box (simplified)
  TrendingUp, // Step 2 Icon (Motivation)
  ArrowRight, // CTA Button & Connecting Arrows
  Play,      // Decorative icon
  ArrowDown, // Mobile connecting arrow
  BotMessageSquare, // Step 2 Icon (Practice)
  Check, // For checkmarks
  Upload,
  Users,
  BarChart3,
  Target
} from 'lucide-react';

// Simplified steps for Part 2: The PitchIQ Improvement Loop
const simplifiedImprovementSteps = [
  {
    icon: BotMessageSquare,
    title: "AI Learns Your Sales Methodology",
    description: "Configure once, scale infinitely. Our AI absorbs your unique sales process.",
  },
  {
    icon: Sparkles,
    title: "Adapts to Every Rep, Maintains Standards",
    description: "Each rep gets personalized feedback while meeting enterprise compliance requirements.",
  },
  {
    icon: TrendingUp,
    title: "Scales From 10 to 10,000 Reps",
    description: "Whether you're training a team or an entire sales organization, PitchIQ delivers quality coaching.",
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
      className="py-16 md:py-24 bg-white"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 sm:pr-8 md:pr-12 lg:pr-8">
        <motion.div className="text-left lg:text-center mb-12 md:mb-16 sm:mr-24 md:mr-32 lg:mr-0" variants={itemVariants}>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 font-outfit text-gray-900">
            Sophisticated Training,<br/>
            Simple Implementation
          </h2>
          <div>
            <p className="text-lg md:text-xl text-foreground/80 max-w-3xl lg:mx-auto">
              Unlike static training programs, PitchIQ adapts to each rep while maintaining enterprise standards.
            </p>
          </div>
        </motion.div>

        {/* --- PART 1: Enterprise Configuration --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Left Column: Stepper */}
          <motion.div className="space-y-8" variants={itemVariants}>
            <div className="p-6 rounded-lg">
              <div className="flex items-center mb-6">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 mr-4 flex-shrink-0">
                  <span className="font-bold text-sm">1</span>
                </div>
                <h3 className="text-xl font-outfit font-bold text-gray-800">Enterprise Configuration</h3>
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-3">Your Sales DNA, Amplified by AI</h4>
              <p className="text-base text-gray-600 mb-4">
                Upload your sales methodology, objection handling frameworks, and compliance requirements.
              </p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-pitchiq-red" />
                <span className="text-pitchiq-red font-medium text-sm">One-time setup</span>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Enterprise Configuration Visual */}
          <motion.div 
            className="bg-pitchiq-red p-8 rounded-2xl shadow-lg border border-black/10 min-h-[400px] flex flex-col"
            variants={itemVariants}
          >
            <div className="text-center mb-6">
              <h4 className="text-lg font-bold text-white mb-2">Enterprise Sales Methodology</h4>
              <p className="text-base text-white/90">Configure once, deploy everywhere</p>
            </div>
            
            {/* Configuration Flow */}
            <div className="flex-1 flex flex-col justify-between">
              {/* Input Section */}
              <div className="bg-white/90 rounded-lg p-4 mb-4 shadow-sm border border-black/10">
                <div className="flex items-center mb-3">
                  <Upload className="h-5 w-5 text-pitchiq-red mr-2" />
                  <span className="text-sm font-semibold text-gray-800">Upload Your Framework</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 px-2 py-1 rounded text-gray-700 border border-black/5">Sales Scripts</div>
                  <div className="bg-gray-50 px-2 py-1 rounded text-gray-700 border border-black/5">Objections</div>
                  <div className="bg-gray-50 px-2 py-1 rounded text-gray-700 border border-black/5">Compliance</div>
                  <div className="bg-gray-50 px-2 py-1 rounded text-gray-700 border border-black/5">KPIs</div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center mb-4">
                <ArrowDown className="h-6 w-6 text-white" />
              </div>

              {/* Output Section */}
              <div className="bg-black rounded-lg p-4 shadow-sm border border-white/20">
                <div className="flex items-center mb-3">
                  <Target className="h-5 w-5 text-white mr-2" />
                  <span className="text-sm font-semibold text-white">Scaled Results</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">40%</div>
                    <div className="text-xs text-white/70">Faster Ramp</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">85%</div>
                    <div className="text-xs text-white/70">Compliance</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-white">10K+</div>
                    <div className="text-xs text-white/70">Reps Trained</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* --- PART 2: The PitchIQ Improvement Loop --- */}
        <motion.div className="mt-16 md:mt-24" variants={itemVariants}>
          <div className="flex items-center mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200 text-gray-600 mr-4 flex-shrink-0">
              <span className="font-bold text-sm">2</span>
            </div>
            <h3 className="text-xl font-outfit font-bold text-gray-800">Continuous Performance Optimization</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            {simplifiedImprovementSteps.map((step, index) => (
              <div key={step.title} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100/80 hover:shadow-xl transition-shadow duration-300">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-blue-100 mb-4">
                  <step.icon size={40} className="text-pitchiq-red" />
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-3">{step.title}</h4>
                <p className="text-base text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="text-center mt-12 md:mt-16">
          <Button 
            variant="default"
            size="lg" 
            onClick={onOpenEmailModal}
            className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white font-semibold py-3 px-8 text-lg rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 group"
          >
            Schedule Enterprise Demo <ArrowRight className="w-5 h-5 ml-2 inline-block transform transition-transform duration-150 group-hover:translate-x-1" />
          </Button>
          <p className="text-sm text-foreground/60 mt-3">See how PitchIQ transforms enterprise sales training.</p>
        </div>
      </div>
    </motion.section>
  );
};

export default HowItWorksSection;


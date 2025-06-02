import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  Sparkles, // Step 1 Pill & Step 2 Icon (Mentorship)
  Clock,    // Time Estimate
  Brain,    // For AI Tailors Box (simplified)
  Repeat,   // Step 2 Pill
  TrendingUp, // Step 2 Icon (Motivation)
  ArrowRight, // CTA Button & Connecting Arrows
  // Users, // Removed from icon montage
  // Package, // Removed from icon montage
  // ListChecks, // Removed from icon montage
  Play,      // Decorative icon
  ArrowDown, // Mobile connecting arrow
  // Dna, // Removed from icon montage
  BotMessageSquare, // Step 2 Icon (Practice)
  Check // For checkmarks
} from 'lucide-react';

// Simplified steps for Part 2: The PitchIQ Improvement Loop
const simplifiedImprovementSteps = [
  {
    icon: BotMessageSquare,
    title: "Practice That Molds to You",
    description: "Engage with adaptive AI buyers in scenarios molded to your unique sales world.",
  },
  {
    icon: Sparkles, // Re-using Sparkles for targeted feedback/mentorship
    title: "Feedback That Pinpoints & Progresses",
    description: "Receive instant, targeted feedback & AI-suggested micro-lessons to elevate your skills.",
  },
  {
    icon: TrendingUp,
    title: "Motivation That Fuels Your Ascent",
    description: "Witness your skills flourish as PitchIQ refines your path to peak performance.",
  },
];

interface HowItWorksProps {
  onOpenEmailModal: () => void;
}

const HowItWorksSection: React.FC<HowItWorksProps> = ({ onOpenEmailModal }) => {
  return (
    <section id="how-it-works" className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center md:text-left mb-12 md:mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 font-outfit">
            Unlock Your Sales Potential: The <span className="font-outfit font-bold text-gray-800">Pitch</span><span className="font-saira font-medium text-pitchiq-red">IQ</span> Method
          </h2>
          <p className="text-lg md:text-xl text-foreground/80 max-w-3xl">
            Rapidly master sales with AI accuracy and an adaptive coaching loop designed for growth.
          </p>
        </div>

        {/* --- PART 1: Personalize Your Training Ground --- */}
        <div className="mb-16 md:mb-24">
          <div className="md:grid md:grid-cols-2 md:gap-12 lg:gap-16 md:items-center">
            <div className="text-center md:text-left mb-12 md:mb-0">
              <div className="inline-flex items-center gap-2 bg-gray-200 text-gray-900 px-4 py-2 rounded-full text-sm font-medium mb-6 flex-shrink-0 shadow-sm">
                <Sparkles className="h-4 w-4 text-pitchiq-red font-semibold" />
                Step 1: Your AI <span className='text-pitchiq-red font-semibold'>Launchpad</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-gray-800 font-outfit">
                Your Sales DNA,<br />Instantly Mirrored.
              </h3>
              <p className="text-base md:text-lg text-foreground/70 max-w-xl mx-auto md:mx-0 mb-4">
                Answer a few quick prompts. PitchIQ's AI instantly builds your hyper-personalized training arena.
              </p>
              <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                <Clock className="h-4 w-4 text-pitchiq-red" />
                <span className="text-pitchiq-red font-medium text-sm">Approx. 5-8 minutes</span>
              </div>
            </div>

            {/* Simplified Visual Icon Card */}
            <div className="relative flex flex-col text-center p-6 bg-gradient-to-br from-purple-100 via-pink-50 to-red-100 rounded-2xl shadow-xl min-h-[300px] md:min-h-[320px] items-center justify-center">
              <div className="mb-4">
                <h3 className="text-xl md:text-2xl font-bold text-gray-800 font-outfit mb-1">Your Custom Sales Arena</h3>
                <p className="text-sm text-foreground/70 px-2">Tailored to how you sell.</p>
              </div>
              
              <div className="my-6">
                <Brain className="text-purple-600 h-20 w-20 md:h-24 md:w-24 opacity-90 mx-auto filter drop-shadow-lg" />
              </div>

              <div className="flex flex-col sm:flex-row justify-around items-center mt-auto pt-4 w-full gap-2 sm:gap-3">
                <div className="flex items-center text-left bg-white/50 px-3 py-1.5 rounded-md shadow-sm">
                  <Check size={18} className="mr-1.5 text-pitchiq-red flex-shrink-0"/> 
                  <span className="text-sm font-semibold text-gray-800">Your Offer</span>
                </div>
                <div className="flex items-center text-left bg-white/50 px-3 py-1.5 rounded-md shadow-sm">
                  <Check size={18} className="mr-1.5 text-pitchiq-red flex-shrink-0"/> 
                  <span className="text-sm font-semibold text-gray-800">Ideal Client</span>
                </div>
                <div className="flex items-center text-left bg-white/50 px-3 py-1.5 rounded-md shadow-sm">
                  <Check size={18} className="mr-1.5 text-pitchiq-red flex-shrink-0"/> 
                  <span className="text-sm font-semibold text-gray-800">Sales Approach</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- PART 2: The PitchIQ Improvement Loop --- */}
        <div className="mb-16 md:mb-24">
          <div className="text-center md:text-left mb-10 md:mb-12">
             <div className="inline-flex items-center gap-2 bg-gray-200 text-gray-900 px-4 py-2 rounded-full text-sm font-medium mb-4 shadow-sm">
              <Repeat className="h-4 w-4 text-pitchiq-red font-semibold" />
              Step 2: AI That <span className='text-pitchiq-red font-semibold'>Evolves You</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-800 font-outfit">
              AI That Molds, Mentors, & Motivates.
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10 relative">
            {simplifiedImprovementSteps.map((step, index) => (
              <motion.div
                key={index} 
                className="group bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center relative z-10 pb-10 md:pb-6"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.7, delay: (index * 0.25) + 0.2 }}
              >
                {index === 0 && (
                  <Play className="absolute -top-4 -left-4 md:-top-6 md:-left-6 h-20 w-20 md:h-28 md:w-28 text-red-300 opacity-20 transform rotate-[-15deg] pointer-events-none z-0" /> 
                )}
                
                <div className="flex-shrink-0 mb-5">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                    <step.icon size={40} className="text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2 font-outfit">{step.title}</h4>
                  <p className="text-sm text-foreground/70 leading-relaxed">{step.description}</p>
                </div>

                {index < simplifiedImprovementSteps.length - 1 && (
                  <div className="absolute 
                                  bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(50%+8px)]
                                  md:top-1/2 md:left-auto md:right-0 md:translate-x-[calc(50%+8px)] md:-translate-y-1/2 md:bottom-auto
                                  p-1.5 bg-white rounded-full shadow-md z-20">
                    <ArrowDown className="h-5 w-5 text-gray-500 group-hover:text-pitchiq-red transition-colors md:hidden" />
                    <ArrowRight className="h-5 w-5 text-gray-500 group-hover:text-pitchiq-red transition-colors hidden md:inline-block" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
        
        <div className="text-center mt-12 md:mt-16">
          <Button 
            variant="default"
            size="lg" 
            onClick={onOpenEmailModal}
            className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white font-semibold py-3 px-8 text-lg rounded-lg shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 group"
          >
            Get Early Access & Start Mastering Sales <ArrowRight className="w-5 h-5 ml-2 inline-block transform transition-transform duration-150 group-hover:translate-x-1" />
          </Button>
          <p className="text-xs text-foreground/60 mt-3">Be first to experience the future of sales coaching.</p>
        </div>

      </div>
    </section>
  );
};

export default HowItWorksSection;


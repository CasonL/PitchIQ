import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { 
  CalendarX,
  BookOpen,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

// The 3 problems consultants face
const problems = [
  {
    icon: CalendarX,
    number: "1",
    title: "The Avoidance Cycle",
    description: "You know you should reach out. Book calls. Close clients. But you don't. Because what if you freeze up? What if you can't answer their questions? So you 'prepare more' instead."
  },
  {
    icon: BookOpen,
    number: "2",
    title: "Knowledge Without Confidence",
    description: "You've taken the courses. Watched the webinars. Read the books. You know the frameworks. But you still haven't booked calls. Because knowing ≠ believing you can do it."
  },
  {
    icon: AlertCircle,
    number: "3",
    title: "No Safe Place to Practice",
    description: "Can't practice on real prospects (you'll blow it). Can't practice on friends (they're too nice). Can't practice alone (no feedback). So you never practice. And you never build confidence."
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
      },
    },
  };

  return (
    <motion.section 
      id="how-it-works" 
      className="py-20 md:py-28 bg-background relative overflow-hidden"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {/* Background Images */}
      {/* Desktop/Landscape Background */}
      <div 
        className="absolute inset-0 hidden md:block bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: 'url(/BackgroundImageLandscape1.png)' }}
      ></div>
      
      {/* Mobile/Portrait Background */}
      <div 
        className="absolute inset-0 md:hidden bg-cover bg-center bg-no-repeat opacity-30"
        style={{ backgroundImage: 'url(/BackgroundImagePortrait1.png)' }}
      ></div>
      
      {/* Gradient Fade to White at Bottom */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background"
      ></div>
      
      {/* Content overlay */}
      <div className="relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="text-left lg:text-center mb-12 md:mb-16 sm:mr-24 md:mr-32 lg:mr-0" variants={itemVariants}>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-4 font-outfit text-gray-900">
            Sound Familiar?
          </h2>
          <p className="text-lg md:text-xl text-foreground/80 max-w-3xl lg:mx-auto">
            Three problems keeping you stuck.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <motion.div 
              key={problem.number} 
              className="bg-white p-8 rounded-3xl border-2 border-gray-200 text-left shadow-sm hover:shadow-md transition-shadow duration-200"
              variants={itemVariants}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-6">
                <problem.icon className="w-8 h-8 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{problem.title}</h3>
              <p className="text-gray-600 leading-relaxed">{problem.description}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-xl text-gray-700 mb-6 font-medium">
            There's a better way. Practice until you believe you can deliver value.
          </p>
          <Button 
            variant="default"
            size="lg" 
            onClick={onOpenEmailModal}
            className="bg-pitchiq-red hover:bg-pitchiq-red/90 text-white font-semibold py-3 px-8 text-lg rounded-lg group"
          >
            Try the Solution <ArrowRight className="w-5 h-5 ml-2 inline-block transform transition-transform duration-150 group-hover:translate-x-1" />
          </Button>
          <p className="text-sm text-gray-600 mt-3">Practice with AI. Get real feedback. Build confidence.</p>
        </div>
      </div>
      </div>
    </motion.section>
  );
};

export default HowItWorksSection;


import React from "react";
import { motion } from "framer-motion";

const steps = [
  {
    title: "Practice",
    description: "Talk through real sales conversations.",
    hasUnderline: true,
  },
  {
    title: "Review",
    description: "Replay the call and see what changed.",
    hasUnderline: false,
  },
  {
    title: "Learn",
    description: "Get clear feedback for the next call.",
    hasUnderline: false,
  },
];

const HowItWorksSolutionSection: React.FC = () => {
  const sectionVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };

  return (
    <motion.section 
      id="how-it-works-solution" 
      className="py-20 md:py-28 relative overflow-hidden"
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
    >
      {/* Background Images */}
      <div 
        className="absolute inset-0 hidden md:block bg-cover bg-center bg-no-repeat opacity-50"
        style={{ backgroundImage: 'url(/BlogBackgroundlandscape.png)' }}
      ></div>
      
      <div 
        className="absolute inset-0 md:hidden bg-cover bg-center bg-no-repeat opacity-70"
        style={{ backgroundImage: 'url(/BlogBackgroundportrait.png)' }}
      ></div>
      
      {/* Content overlay */}
      <div className="relative z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div className="text-center mb-16" variants={itemVariants}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
            How It Works
          </h2>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto">
            A simple practice loop to build real confidence before you talk to customers.
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row justify-center items-start gap-8 md:gap-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.title}>
              <motion.div 
                className="flex items-start gap-4 flex-1 max-w-xs"
                variants={itemVariants}
              >
                {/* Red bullet point only next to Practice (first step), invisible spacer for others */}
                <div className="w-2 h-2 rounded-full mt-3 flex-shrink-0" style={{ backgroundColor: index === 0 ? '#DC2626' : 'transparent' }}></div>
                
                <div className="flex-1">
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-700 text-base md:text-lg leading-relaxed">
                    {step.description}
                  </p>
                  {step.hasUnderline && (
                    <div className="mt-3 h-1 w-16 bg-pitchiq-red"></div>
                  )}
                </div>
              </motion.div>
              
              {/* Red dot connector between steps (not after last one) - aligned with title */}
              {index < steps.length - 1 && (
                <div className="hidden md:block w-2 h-2 rounded-full bg-pitchiq-red flex-shrink-0 mt-3"></div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      </div>
    </motion.section>
  );
};

export default HowItWorksSolutionSection;

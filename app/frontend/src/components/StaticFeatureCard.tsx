import React from 'react';
import { type LucideProps } from 'lucide-react';
import { motion } from 'framer-motion';

interface StaticFeatureCardProps {
  icon: React.ElementType<LucideProps>;
  title: string;
  text: string;
  iconColor?: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.15, // Stagger animation of children
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5 } 
  },
};

const StaticFeatureCard: React.FC<StaticFeatureCardProps> = ({ icon: IconComponent, title, text, iconColor = "text-gray-700" }) => {
  // Helper to get background color from text color, e.g., text-blue-500 -> bg-blue-500
  const bgColorClass = iconColor.startsWith('text-') ? iconColor.replace('text-', 'bg-') : 'bg-gray-700';

  return (
    <motion.div
      className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg"
      variants={cardVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: false, amount: 0.3 }} // Changed once: true to once: false
    >
      <div className="flex flex-col sm:flex-row items-start sm:space-x-6"> {/* Changed md: to sm: for earlier switch to row */}
        <motion.div 
          className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center mb-4 sm:mb-0 ${bgColorClass} bg-opacity-10`}
          variants={itemVariants} // Icon container animates as an item
        >
          <IconComponent className={`h-8 w-8 ${iconColor}`} />
        </motion.div>
        <div className="text-left flex-grow"> {/* Added flex-grow to allow text content to take available space */}
          <motion.h3 
            className="text-2xl font-semibold text-gray-900 font-outfit mb-2"
            variants={itemVariants} // Title animates as an item
          >
            {title}
          </motion.h3>
          <motion.p 
            className="text-md text-gray-700 leading-relaxed font-outfit"
            variants={itemVariants} // Text animates as an item
          >
            {text}
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export default StaticFeatureCard; 
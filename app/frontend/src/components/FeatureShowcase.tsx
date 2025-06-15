import React from 'react';
import { Zap, Sparkles, MessageSquare, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
  {
    icon: Zap,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    title: 'Accelerate Team Onboarding',
    description: 'Reduce new hire ramp time from 6 months to 6 weeks. Our AI delivers consistent, standardized training that scales across your entire organization.'
  },
  {
    icon: Sparkles,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    title: 'Ensure Regulatory Compliance',
    description: 'Meet industry compliance requirements with documented training protocols, audit trails, and standardized conversation frameworks tailored to financial services.'
  },
  {
    icon: MessageSquare,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    title: 'Standardize Sales Excellence',
          description: 'Deploy best practices consistently across teams. AI coaching ensures every rep follows proven methodologies and maintains quality standards.'
  },
  {
    icon: Users,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Measure Performance Impact',
    description: 'Track improvement metrics, conversion rates, and ROI with comprehensive analytics. Get the data you need to justify training investments and demonstrate results.'
  }
];

const FeatureShowcase: React.FC = () => {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900">
            Enterprise Sales Training That Delivers Results
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                          Purpose-built for organizations that need to scale sales performance, ensure compliance, and drive measurable ROI from their training investments.
          </p>
        </div>
        <motion.div 
          className="mt-16 max-w-4xl mx-auto space-y-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((feature, index) => (
            <motion.div 
              key={index} 
              className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 flex items-start space-x-6"
              variants={itemVariants}
            >
              <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${feature.iconBg}`}>
                <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-gray-600">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
import React from 'react';
import UnlockableFeatureBox from './UnlockableFeatureBox';
import { BookOpen, BarChart3, PieChart, Settings, Lock, Package } from 'lucide-react'; // Added PieChart, Settings, Package
import { motion } from 'framer-motion';

interface UnlockableFeaturesGridProps {
  completedRoleplaysCount: number;
  onFeatureCtaClick: (featureTitle: string) => void; // New prop for sending message
  revealedFeatureIds: Record<string, boolean>; // Added prop
  onFeatureRevealed: (featureId: string) => void; // Added prop
}

const UnlockableFeaturesGrid: React.FC<UnlockableFeaturesGridProps> = ({
  completedRoleplaysCount,
  onFeatureCtaClick, // New prop
  revealedFeatureIds, // Destructure
  onFeatureRevealed, // Destructure
}) => {
  const features = [
    {
      featureId: 'lessons',
      title: 'Lessons Library',
      description: '',
      unlocksAt: 2,
      IconUnlocked: BookOpen,
      ctaText: 'Go to Lessons',
      onCtaClick: () => onFeatureCtaClick('Lessons Library'), // Use new prop with title
      isFutureFeature: false,
      learnMoreLink: '/blog/why-lessons-help' // Example
    },
    {
      featureId: 'advanced_analytics',
      title: 'Advanced Analytics',
      description: '',
      unlocksAt: 5,
      IconUnlocked: BarChart3,
      ctaText: 'View Analytics',
      onCtaClick: () => onFeatureCtaClick('Advanced Analytics'), // Use new prop with title
      isFutureFeature: false,
      learnMoreLink: '/blog/power-of-analytics' // Example
    },
    {
      featureId: 'goal_setting',
      title: 'Personalized Goals',
      description: '',
      unlocksAt: 10, // Higher for now, as it's future
      IconUnlocked: PieChart, // Example icon
      ctaText: 'Set Goals',
      onCtaClick: () => onFeatureCtaClick('Personalized Goals'), // Use new prop with title
      isFutureFeature: true,
    },
    {
      featureId: 'integration_hub',
      title: 'Integration Hub',
      description: '',
      unlocksAt: 15, // Higher for now
      IconUnlocked: Settings, // Example icon
      ctaText: 'Configure Integrations',
      onCtaClick: () => onFeatureCtaClick('Integration Hub'), // Use new prop with title
      isFutureFeature: true,
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <motion.div 
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-24 w-full mt-12 max-w-3xl mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {features.map((feature) => (
        <motion.div key={feature.featureId} variants={itemVariants}>
          <UnlockableFeatureBox
            {...feature}
            currentCompletions={completedRoleplaysCount}
            IconLocked={Lock} // Pass the default Lock icon
            isRevealed={!!revealedFeatureIds[feature.featureId]} // Pass down isRevealed
            onRevealed={() => onFeatureRevealed(feature.featureId)} // Pass down onRevealed handler
          />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default UnlockableFeaturesGrid; 
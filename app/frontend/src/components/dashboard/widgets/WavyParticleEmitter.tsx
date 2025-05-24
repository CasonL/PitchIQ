import React from 'react';
import { motion } from 'framer-motion';

interface WavyLineProps {
  initialAngle: number;
  finalDistance: number;
  animDelay: number;
}

const WavyLine: React.FC<WavyLineProps> = ({ initialAngle, finalDistance, animDelay }) => {
  const initialOffsetRadius = 5; // Start closer to the center for a more "burst" like feel
  const waveAmplitude = 3; // Max pixels the wave deviates side-to-side
  const animationDuration = 0.4; // Shorter duration for quicker dissipation

  const initialAngleRad = initialAngle * Math.PI / 180;
  
  // Vector for outward motion
  const dirX = Math.cos(initialAngleRad);
  const dirY = Math.sin(initialAngleRad);

  // Vector perpendicular to outward motion (for the wave)
  const perpX = -dirY; // -Math.sin(initialAngleRad)
  const perpY = dirX;  // Math.cos(initialAngleRad)

  const particleVariants = {
    initial: {
      opacity: 0,
      x: dirX * initialOffsetRadius,
      y: dirY * initialOffsetRadius,
      scale: 0.3, // Start even smaller
      rotate: initialAngle, // Fixed orientation pointing outwards
    },
    animate: {
      opacity: [0, 1, 0.7, 0], // Quick fade in, exist briefly, fade out
      // Animate x and y along the main direction, adding perpendicular wave motion
      x: [
        dirX * initialOffsetRadius, // Start position
        dirX * (finalDistance / 2) + perpX * waveAmplitude, // Midpoint with wave peak 1
        dirX * (finalDistance * 0.75) - perpX * (waveAmplitude * 0.7), // Towards end with wave peak 2 (opposite)
        dirX * finalDistance, // End position (straight)
      ],
      y: [
        dirY * initialOffsetRadius, // Start position
        dirY * (finalDistance / 2) + perpY * waveAmplitude, // Midpoint with wave peak 1
        dirY * (finalDistance * 0.75) - perpY * (waveAmplitude * 0.7), // Towards end with wave peak 2 (opposite)
        dirY * finalDistance, // End position (straight)
      ],
      scale: [0.3, 0.8, 0.5, 0.1], // Grow, then shrink and fade
      rotate: initialAngle, // Keep rotation fixed
      transition: {
        duration: animationDuration,
        delay: animDelay,
        ease: "linear", // Linear for the travel and wave itself
        opacity: {
          duration: animationDuration,
          times: [0, 0.2, 0.85, 1], // Quick fade in, sustain, quick fade out
          ease: "linear"
        },
        scale: {
          duration: animationDuration,
          times: [0, 0.3, 0.7, 1],
          ease: "easeOut"
        },
        // x and y use the main duration and ease
      },
    },
  };

  return (
    <motion.div
      className="absolute w-2.5 h-[1px] bg-black rounded-full" // Tiny line: w-2.5 (10px), h-[1px]
      style={{ transformOrigin: 'left center' }} 
      variants={particleVariants}
      initial="initial"
      animate="animate"
    />
  );
};

interface WavyParticleEmitterProps {
  particleCount?: number;
  isActive: boolean;
  emissionRadius?: number; 
}

const WavyParticleEmitter: React.FC<WavyParticleEmitterProps> = ({
  particleCount = 18, // Slightly more particles for a denser, quicker burst
  isActive,
  emissionRadius = 40, // Reduced radius for quicker dissipation visual
}) => {
  if (!isActive) {
    return null;
  }

  const particles = Array.from({ length: particleCount }).map((_, i) => {
    const angle = (360 / particleCount) * i;
    // Stagger animation start very slightly for a quick burst feel
    const delay = Math.random() * 0.08;
    return <WavyLine key={i} initialAngle={angle} finalDistance={emissionRadius} animDelay={delay} />;
  });

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {particles}
    </div>
  );
};

export default WavyParticleEmitter; 
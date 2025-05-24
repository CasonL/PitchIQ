import React, { useEffect, useRef } from 'react';
import { useVoiceState } from '../../state/voiceState';

interface VoiceOrbProps {
  size?: number;
}

/**
 * VoiceOrb Component
 * Central visualization that changes based on voice state
 * - Blue pulsing orb when listening
 * - Red pulsing orb when speaking
 * - Green pulsing orb when in training mode
 * - Gray/neutral when idle
 */
const VoiceOrb: React.FC<VoiceOrbProps> = ({ size = 300 }) => {
  // Canvas reference
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Pull state from central voice state
  const { 
    isListening, 
    isSpeaking, 
    isTraining, 
    audioLevel 
  } = useVoiceState();
  
  // Animation frame reference for cleanup
  const animationFrameRef = useRef<number>();
  
  // Smooth audio level transitions using refs
  const targetAudioLevelRef = useRef(audioLevel);
  const currentAudioLevelRef = useRef(audioLevel);
  
  // Update target audio level when prop changes
  useEffect(() => {
    targetAudioLevelRef.current = audioLevel;
  }, [audioLevel]);

  // Main canvas rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = size;
    canvas.height = size;
    
    // Animation function
    const animate = (time: number) => {
      if (!canvas || !ctx) return;
      
      // Smooth audio level transition
      const transitionSpeed = 0.1;
      currentAudioLevelRef.current += (targetAudioLevelRef.current - currentAudioLevelRef.current) * transitionSpeed;
      const smoothAudioLevel = currentAudioLevelRef.current;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Get color based on state
      let primaryColor, secondaryColor;
      if (isTraining) {
        primaryColor = 'rgba(34, 197, 94, 0.7)'; // Green for training
        secondaryColor = 'rgba(34, 197, 94, 0.3)';
      } else if (isListening) {
        primaryColor = 'rgba(30, 58, 138, 0.7)'; // Blue for listening
        secondaryColor = 'rgba(30, 58, 138, 0.3)';
      } else if (isSpeaking) {
        primaryColor = 'rgba(220, 38, 38, 0.7)'; // Red for speaking
        secondaryColor = 'rgba(220, 38, 38, 0.3)';
      } else {
        primaryColor = 'rgba(100, 116, 139, 0.5)'; // Slate for idle
        secondaryColor = 'rgba(100, 116, 139, 0.2)';
      }
      
      // Calculate orb size with audio level influence
      const baseSize = size * 0.4;
      const orbSize = baseSize * (1 + smoothAudioLevel * 0.2);
      
      // Draw gradient background
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, orbSize * 1.5
      );
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(1, secondaryColor);
      
      // Draw main orb
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add ripples if active
      if (isListening || isSpeaking || isTraining) {
        drawRipples(ctx, centerX, centerY, orbSize, time, primaryColor);
      }
      
      // Continue animation
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    // Helper to draw ripple effects
    const drawRipples = (
      ctx: CanvasRenderingContext2D, 
      x: number, 
      y: number, 
      radius: number, 
      time: number, 
      color: string
    ) => {
      const rippleCount = 3;
      const timeScale = time * 0.001;
      
      for (let i = 0; i < rippleCount; i++) {
        const rippleRadius = radius * (1.2 + (i * 0.2) + Math.sin(timeScale + i) * 0.1);
        const alpha = 0.5 - (i * 0.15);
        
        ctx.beginPath();
        ctx.arc(x, y, rippleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = color.replace(/[\d\.]+\)$/g, `${alpha})`);
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [size, isListening, isSpeaking, isTraining]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        width={size}
        height={size}
      />
    </div>
  );
};

export default VoiceOrb; 
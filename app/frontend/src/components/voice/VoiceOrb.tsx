import React, { useEffect, useRef, useState } from 'react';

interface VoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  audioLevel?: number; // 0 to 1
}

const VoiceOrb: React.FC<VoiceOrbProps> = ({ 
  isListening, 
  isSpeaking, 
  audioLevel = 0 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 300, height: 300 });
  const animationFrameRef = useRef<number>();
  
  // Animation settings
  const baseSize = Math.min(size.width, size.height) * 0.5;
  
  // Smooth audio level transitions using ref
  const targetAudioLevelRef = useRef(audioLevel);
  const currentAudioLevelRef = useRef(audioLevel);
  
  // Update target audio level when prop changes
  useEffect(() => {
    targetAudioLevelRef.current = audioLevel;
  }, [audioLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width;
      canvas.height = height;
      setSize({ width, height });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const animate = (time: number) => {
      if (!canvas || !ctx) return;
      
      // Smooth audio level transition
      const transitionSpeed = 0.1;
      currentAudioLevelRef.current += (targetAudioLevelRef.current - currentAudioLevelRef.current) * transitionSpeed;
      const smoothAudioLevel = currentAudioLevelRef.current;
      
      // Calculate orb size with smooth transitions
      const orbSizeTarget = isSpeaking 
        ? baseSize * 1.1
        : isListening 
          ? baseSize * (0.95 + smoothAudioLevel * 0.2)
          : baseSize * 0.95;
          
      // Smooth size transition
      const orbSize = orbSizeTarget;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Create gradient background for main orb
      const gradientBg = ctx.createRadialGradient(
        centerX, centerY - orbSize * 0.2, 0,
        centerX, centerY, orbSize * 1.2
      );
      
      if (isSpeaking) {
        // Red/navy speaking gradient
        gradientBg.addColorStop(0, 'rgba(220, 38, 38, 0.7)');
        gradientBg.addColorStop(0.5, 'rgba(159, 18, 57, 0.5)');
        gradientBg.addColorStop(1, 'rgba(30, 58, 138, 0.3)');
      } else if (isListening) {
        // Navy/blue listening gradient
        gradientBg.addColorStop(0, 'rgba(30, 58, 138, 0.7)');
        gradientBg.addColorStop(0.5, 'rgba(59, 130, 246, 0.5)');
        gradientBg.addColorStop(1, 'rgba(96, 165, 250, 0.3)');
      } else {
        // Idle navy gradient
        gradientBg.addColorStop(0, 'rgba(30, 58, 138, 0.4)');
        gradientBg.addColorStop(1, 'rgba(30, 58, 138, 0.1)');
      }
      
      // Create gradient for main orb
      const gradient = ctx.createRadialGradient(
        centerX, centerY - orbSize * 0.1, 0,
        centerX, centerY, orbSize / 2
      );
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
      
      // Draw background glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbSize * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = gradientBg;
      ctx.fill();
      
      // Draw main orb
      ctx.beginPath();
      ctx.arc(centerX, centerY, orbSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.shadowColor = isSpeaking ? 'rgba(220, 38, 38, 0.4)' : 'rgba(30, 58, 138, 0.4)';
      ctx.shadowBlur = 15;
      ctx.fill();
      
      // Add subtle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw ripple effect
      if (isListening || isSpeaking) {
        const rippleCount = 2;
        const time1 = time * 0.001;
        const amplitude = orbSize * 0.05 * (isListening ? (0.5 + smoothAudioLevel * 0.7) : 0.5);
        
        for (let i = 0; i < rippleCount; i++) {
          const waveRadius = (orbSize * 0.55) * (0.8 + (i * 0.1));
          const segments = 30;
          const angleStep = (Math.PI * 2) / segments;
          
          ctx.beginPath();
          
          for (let j = 0; j <= segments; j++) {
            const angle = j * angleStep;
            const phase = i * (Math.PI / 4) + time1 * (i + 1) * 0.5;
            const radiusOffset = Math.sin(angle * 6 + phase) * amplitude;
            const x = centerX + (waveRadius + radiusOffset) * Math.cos(angle);
            const y = centerY + (waveRadius + radiusOffset) * Math.sin(angle);
            
            if (j === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          
          ctx.closePath();
          
          // Color depends on state
          const alpha = 0.2 - (i * 0.05);
          if (isSpeaking) {
            ctx.strokeStyle = `rgba(220, 38, 38, ${alpha})`;
          } else if (isListening) {
            ctx.strokeStyle = `rgba(30, 58, 138, ${alpha})`;
          } else {
            ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
          }
          
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isListening, isSpeaking, baseSize]);

  return (
    <div className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full absolute inset-0"
      />
    </div>
  );
};

export default VoiceOrb; 
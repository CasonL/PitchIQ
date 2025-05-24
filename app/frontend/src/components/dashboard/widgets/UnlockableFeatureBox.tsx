import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Package, BookOpen, BarChart3, Zap, ExternalLink } from 'lucide-react';
// import { Button } from '@/components/ui/button'; // Button removed for this version
import { motion, AnimatePresence } from 'framer-motion';
import WavyParticleEmitter from './WavyParticleEmitter';

interface UnlockableFeatureBoxProps {
  title: string;
  description: string; // Will be empty string from parent
  unlocksAt: number;
  currentCompletions: number;
  IconUnlocked: React.ElementType;
  IconLocked?: React.ElementType;
  // ctaText?: string; // No longer displayed on the card itself if card is the button
  onCtaClick?: () => void;
  isFutureFeature?: boolean;
  featureId: string;
  isRevealed: boolean;
  onRevealed: () => void;
}

// Updated stages for the new reveal animation
type RevealStage = 'idle' | 'lockExpanding' | 'lockUnlocking' | 'emittingParticles' | 'revealed';

const UnlockableFeatureBox: React.FC<UnlockableFeatureBoxProps> = ({
  title,
  description,
  unlocksAt,
  currentCompletions,
  IconUnlocked,
  IconLocked = Lock,
  // ctaText, // Not used directly for display anymore
  onCtaClick,
  isFutureFeature = false,
  featureId,
  isRevealed,
  onRevealed,
}) => {
  console.log(`[UFB ${featureId}] Render. Props:`, { title, currentCompletions, unlocksAt, isRevealed, isFutureFeature, onCtaClick: !!onCtaClick });

  const isUnlocked = currentCompletions >= unlocksAt;
  const [currentRevealStage, setCurrentRevealStage] = useState<RevealStage>(() => {
    const initialStage = isRevealed ? 'revealed' : 'idle';
    console.log(`[UFB ${featureId}] Initializing currentRevealStage to: ${initialStage} (isRevealed: ${isRevealed})`);
    return initialStage;
  });
  const [isRevealingFinalContent, setIsRevealingFinalContent] = useState<boolean>(() => isRevealed); // New state
  
  console.log(`[UFB ${featureId}] State: currentRevealStage=${currentRevealStage}, isUnlocked=${isUnlocked}, isRevealingFinalContent=${isRevealingFinalContent}`);

  const isNewlyUnlockable = isUnlocked && !isRevealed;
  const isClickable = isUnlocked && !isFutureFeature && onCtaClick && currentRevealStage === 'revealed'; // Clickable if fully revealed
  const canBeClickedToReveal = isNewlyUnlockable && currentRevealStage === 'idle';

  useEffect(() => {
    console.log(`[UFB ${featureId}] useEffect (isRevealed listener). isRevealed=${isRevealed}, currentStage=${currentRevealStage}, isRevealingFinal=${isRevealingFinalContent}`);
    if (isRevealed) {
      // If parent says revealed, ensure we are in or transitioning to final content display
      if (!isRevealingFinalContent) {
        console.log(`[UFB ${featureId}] useEffect: isRevealed=true, but not yet revealing final. Setting isRevealingFinalContent=true`);
        setIsRevealingFinalContent(true);
      }
      // We will let onExitComplete handle setting currentRevealStage to 'revealed' if it came via click flow
      // If isRevealed became true externally while idle, this ensures stage is set correctly.
      if (currentRevealStage === 'idle') { 
         console.log(`[UFB ${featureId}] useEffect: Snap to 'revealed' stage due to external isRevealed=true from 'idle'`);
         setCurrentRevealStage('revealed');
      }
    } else {
      // If parent says not revealed, reset everything
      if (currentRevealStage !== 'idle' || isRevealingFinalContent) {
        console.log(`[UFB ${featureId}] useEffect: Resetting to idle/notRevealingFinal due to isRevealed=false. currentStage=${currentRevealStage}, isRevealingFinal=${isRevealingFinalContent}`);
        setCurrentRevealStage('idle');
        setIsRevealingFinalContent(false);
      }
    }
  }, [isRevealed]);

  const cardVariants = {
    locked: {
      backgroundColor: "rgba(229, 231, 235, 0.8)",
      borderColor: "rgba(209, 213, 219, 0.7)",
      scale: 1,
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    },
    newlyUnlockablePulsing: {
      backgroundColor: "rgba(255, 255, 255, 1)",
      borderColor: "rgba(250, 204, 21, 1)", // Yellow border for pulsing
      scale: 1,
      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.08)",
    },
    animatingUnlock: { // Consistent during multi-stage unlock
      backgroundColor: "rgba(255, 255, 255, 1)",
      borderColor: "rgba(250, 204, 21, 1)",
      scale: 1,
      boxShadow: "0 20px 25px -5px rgba(0,0,0,0.15), 0 10px 10px -5px rgba(0,0,0,0.08)",
    },
    unlocked: {
      backgroundColor: "rgba(255, 255, 255, 1)",
      borderColor: "rgba(59, 130, 246, 1)", // Blue border for standard unlocked
      scale: 1,
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    },
    future: {
      backgroundColor: "rgba(240, 253, 244, 1)",
      borderColor: "rgba(74, 222, 128, 1)", // Green border for future
      scale: 1,
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    }
  };
  
  const contentVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      // y: 0, // Still keep y and scale commented out for now
      // scale: 1, 
      transition: { duration: 0.15, ease: "easeOut" }
    },
    exitQuick: { opacity: 0, scale: 0.95, transition: { duration: 0.1, ease: "easeIn" } },
    exit: { opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.15, ease: "easeIn" } }
  };

  const determineCardVariant = () => {
    if (currentRevealStage === 'revealed') { // This is now the ultimate source of truth for final style
        return isFutureFeature ? 'future' : 'unlocked';
    }
    if (isRevealed && isRevealingFinalContent) { // If transitioning to final, but stage not yet 'revealed' by onExitComplete
        return isFutureFeature ? 'future' : 'unlocked'; // Show final border early
    }
    if (!isUnlocked) return 'locked';
    if (isNewlyUnlockable && currentRevealStage === 'idle' && !isRevealingFinalContent) return 'newlyUnlockablePulsing';
    if (['lockExpanding', 'lockUnlocking', 'emittingParticles'].includes(currentRevealStage) && !isRevealingFinalContent) {
      return 'animatingUnlock'; 
    }
    if (isNewlyUnlockable && !isRevealingFinalContent) return 'newlyUnlockablePulsing';
    return 'locked';
  };

  const lockExpandDuration = 0.2;
  const lockUnlockActionDuration = 0.3;
  const particleAndIconPopDuration = 0.4;

  const handleCardClick = () => {
    if (canBeClickedToReveal && !isRevealingFinalContent) {
      setCurrentRevealStage('lockExpanding');
      setTimeout(() => setCurrentRevealStage('lockUnlocking'), lockExpandDuration * 1000);
      setTimeout(() => setCurrentRevealStage('emittingParticles'), (lockExpandDuration + lockUnlockActionDuration) * 1000);
      
      const finalAnimationTriggerTime = (lockExpandDuration + lockUnlockActionDuration + particleAndIconPopDuration + 0.1) * 1000;
      setTimeout(() => {
        console.log('[UFB ' + featureId + '] handleCardClick: Final timeout for reveal animation. Setting isRevealingFinalContent=true. currentStage=' + currentRevealStage);
        setIsRevealingFinalContent(true); 
      }, finalAnimationTriggerTime);
    } else if (isClickable) { 
      console.log('[UFB ' + featureId + '] Card clicked, isClickable is true. Calling onCtaClick. onCtaClick defined: ' + !!onCtaClick);
      onCtaClick?.();
    } else {
      console.log('[UFB ' + featureId + '] Card clicked, but not clickable. isClickable: ' + isClickable + ', canBeClickedToReveal: ' + canBeClickedToReveal + ', !isRevealingFinalContent: ' + !isRevealingFinalContent);
    }
  };

  const handleExitComplete = () => {
    console.log(`[UFB ${featureId}] onExitComplete: Animation sequence block exited. currentStage=${currentRevealStage}`);
    // currentRevealStage should still be 'emittingParticles' here if exit was from animation sequence
    // Or it could be some other stage if AnimatePresence had an unexpected quick exit trigger.
    setCurrentRevealStage('revealed');
    onRevealed(); 
    console.log(`[UFB ${featureId}] onExitComplete: Called onRevealed() and set stage to 'revealed'.`);
  };

  return (
    <motion.div
      key={featureId}
      // layout // Added layout prop to help with size changes if any -- Temporarily commenting out again
      variants={cardVariants}
      animate={determineCardVariant()}
      className={`aspect-square p-2 rounded-lg border-2 flex flex-col items-center text-center transition-colors duration-200 ease-in-out justify-center shadow-md hover:shadow-lg ${isClickable || (canBeClickedToReveal && !isRevealingFinalContent) ? 'cursor-pointer' : 'cursor-default'}`}
      whileHover={
        (currentRevealStage === 'idle' && isNewlyUnlockable) 
          ? { y: -7, scale: 1.03, boxShadow: "0 18px 22px -5px rgba(0,0,0,0.1), 0 7px 9px -6px rgba(0,0,0,0.1)" } 
          : (isClickable 
            ? { y: -3, scale: 1.015, boxShadow: "0 9px 13px -3px rgba(0,0,0,0.1), 0 3px 5px -2px rgba(0,0,0,0.05)"} 
            : { y: -1, boxShadow: "0 3px 5px -1px rgba(0,0,0,0.1), 0 1px 3px -1px rgba(0,0,0,0.06)"}) // Default subtle hover
      }
      whileTap={ (canBeClickedToReveal || isClickable) ? { scale: 0.98, y: (canBeClickedToReveal || isClickable) ? -1 : 0 } : {} }
      onClick={handleCardClick}
      {...(currentRevealStage === 'idle' && isNewlyUnlockable && !isRevealingFinalContent && {
        animate: {
          ...cardVariants.newlyUnlockablePulsing,
          scale: [1, 1.025, 1],
          transition: { 
            scale: { duration: 1.4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
            default: { duration: 0.2 }
          }
        }
      })}
    >
      <AnimatePresence mode="wait" onExitComplete={handleExitComplete}>
        {isRevealingFinalContent ? (
          // This is the "truly final, static" content
          // Rendered when isRevealingFinalContent is true.
          // currentRevealStage will be set to 'revealed' by onExitComplete before this fully settles visually if coming from animation.
          isFutureFeature ? (
            <motion.div 
              key="future-content-static" 
              variants={contentVariants} 
              initial="hidden" 
              animate="visible" 
              className="flex flex-col items-center justify-center w-full h-full"
              // onClick={handleCardClick} // Future features aren't clickable in this way yet
            >
              <IconUnlocked size={22} className={`mb-1 text-green-500`} />
              <h3 className={`text-sm font-semibold text-green-700`}>{title}</h3>
              {description && (<p className={`text-xs mt-0.5 text-gray-600 leading-tight`}>{description}</p>)}
              <div className="w-full mt-auto pt-1 pb-0.5">
                <div className="w-full py-1 px-1.5 bg-green-100 text-green-700 rounded-md text-xs font-medium">
                  <Package size={12} className="inline mr-0.5" />Coming Soon!
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="unlocked-content-static" 
              variants={contentVariants} 
              initial="hidden" 
              animate="visible" 
              className="flex flex-col items-center justify-center w-full h-full" 
              // onClick={handleCardClick} // Moved to inner div
            >
              <div 
                onClick={handleCardClick} 
                className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
              >
                <IconUnlocked size={28} className={`mb-1.5 text-blue-500`} />
                <h3 className={`text-sm font-semibold text-blue-700`}>{title}</h3>
                {description && (<p className={`text-xs mt-0.5 text-gray-600 leading-tight`}>{description}</p>)}
              </div>
            </motion.div>
          )
        ) : (
          // This block contains ALL animation stages: idle, lock, emitting particles.
          // It will animate out when isRevealingFinalContent becomes true.
          // currentRevealStage will be 'emittingParticles' (or other stage) during this block's existence and exit.
          <motion.div
            key="animation-sequence-block"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15, ease: "easeIn" } }}
            className="flex flex-col items-center justify-center w-full h-full"
          >
            {currentRevealStage === 'idle' && !isUnlocked && (
              <motion.div key="locked-static-icon" exit="exitQuick" className="flex items-center justify-center w-full h-full">
                <IconLocked size={30} className="text-gray-500 opacity-80" />
              </motion.div>
            )}
            {currentRevealStage === 'idle' && isUnlocked && isNewlyUnlockable && (
               <motion.div key="pulsing-lock-icon" variants={contentVariants} initial="hidden" animate="visible" exit="exitQuick" className="flex items-center justify-center w-full h-full">
                <IconLocked size={36} className="text-yellow-500" />
              </motion.div>
            )}
            {currentRevealStage === 'lockExpanding' && (
              <motion.div key="lock-expanding-anim" initial={{ scale: 1, opacity: 1 }} animate={{ scale: 1.2, opacity: 1, transition: { duration: lockExpandDuration, ease: "easeOut" } }} exit={{ opacity: 0, scale: 1.1, transition: {duration: 0.05} }} className="flex items-center justify-center w-full h-full">
                <IconLocked size={36} className="text-yellow-400" /> 
              </motion.div>
            )}
            {currentRevealStage === 'lockUnlocking' && (
              <motion.div key="lock-unlocking-action-anim" initial={{ scale: 1.2, opacity: 1, rotate:0 }} animate={{ rotate: [0, -8, 8, -4, 4, 0], scale: [1.2, 1.25, 1.15, 0.5], opacity: [1,1,1,0], transition: { duration: lockUnlockActionDuration, times: [0, 0.2, 0.4, 0.6, 0.8, 1], ease: "circOut"} }} exit={{ opacity: 0, scale: 0, transition: { duration: 0.05 } }} className="flex items-center justify-center w-full h-full">
                <IconLocked size={36} className="text-yellow-500" /> 
              </motion.div>
            )}
            {currentRevealStage === 'emittingParticles' && (
              <motion.div
                key="emittingParticles"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1, transition: { duration: particleAndIconPopDuration * 0.5, ease: "easeOut" } }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2, ease: "easeIn" } }} // Ensure this exits cleanly
                className="flex flex-col items-center justify-center text-center h-full relative"
              >
                <WavyParticleEmitter particleCount={40} isActive={true} />
                {/* Use a generic Unlock icon during this phase, not the final IconUnlocked */}
                <motion.div
                    key="unlocking-icon-during-particles" 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1, transition: { delay: particleAndIconPopDuration * 0.2, duration: particleAndIconPopDuration * 0.6, ease: "backOut" } }}
                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.15 } }}
                >
                  <Unlock size={52} className="text-yellow-400 absolute z-10" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                </motion.div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default UnlockableFeatureBox; 
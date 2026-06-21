import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TimelineHeader from "./TimelineHeader";
import SplashScreen from "./SplashScreen";
import TranscriptSection from "./TranscriptSection";
import CoachingBreakdown from "./CoachingBreakdown";
import PracticeOverlay from "./PracticeOverlay";
import { MOMENTS, type MomentData } from "./momentsData";

/* Smooth scroll with a controlled duration */
function smoothScrollTo(targetY: number, duration = 600) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    window.scrollTo(0, startY + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

interface TimelineScreenProps {
  onComplete?: () => void;
  moments?: MomentData[]; // AI-generated moments from transcript analysis
}

export default function TimelineScreen({ onComplete, moments }: TimelineScreenProps) {
  const [currentMoment, setCurrentMoment] = useState(0);
  const [phase, setPhase] = useState<"splash" | "main">("splash");
  const [coachingPhase, setCoachingPhase] = useState<"none" | "sentiment" | "coaching">("none");
  const [showCoachingButton, setShowCoachingButton] = useState(false);
  const [animationsComplete, setAnimationsComplete] = useState(false);
  const [animationsSkipped, setAnimationsSkipped] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [practiceFeedback, setPracticeFeedback] = useState(false);
  const [practiceCompleted, setPracticeCompleted] = useState(false);

  // Use AI-generated moments if provided, otherwise fall back to hardcoded demo data
  // moments=undefined → no real call yet, show demo
  // moments=[] → real call but nothing detected, show empty state (not demo)
  const isRealCall = moments !== undefined;
  const activeMoments = (moments && moments.length > 0) ? moments : (isRealCall ? [] : MOMENTS);
  const moment = activeMoments[currentMoment];
  const totalMoments = activeMoments.length;
  
  // Loading guard - show loading if trying to access a moment that hasn't loaded yet
  const isMomentLoading = !moment && currentMoment >= activeMoments.length;

  // Phase transitions
  useEffect(() => {
    const timer = setTimeout(() => setPhase("main"), 1500);
    return () => clearTimeout(timer);
  }, [currentMoment]);

  // Reset scroll on moment change
  useEffect(() => {
    smoothScrollTo(0, 500);
  }, [currentMoment]);

  const resetState = () => {
    setPhase("splash");
    setShowCoachingButton(false);
    setCoachingPhase("none");
    setAnimationsComplete(false);
    setAnimationsSkipped(false);
    setPracticing(false);
    setRecording(false);
    setPracticeFeedback(false);
    setPracticeCompleted(false);
  };

  const goNext = useCallback(() => {
    if (currentMoment < totalMoments - 1) {
      setCurrentMoment(p => p + 1);
      resetState();
    }
  }, [currentMoment, totalMoments]);

  const goPrev = useCallback(() => {
    if (currentMoment > 0) {
      setCurrentMoment(p => p - 1);
      resetState();
    }
  }, [currentMoment]);

  const onShowCoaching = () => setShowCoachingButton(true);

  const revealCoaching = () => {
    setCoachingPhase("sentiment");
    setAnimationsComplete(false);
    setAnimationsSkipped(false);
    setTimeout(() => {
      const el = document.getElementById("sentiment-cards");
      if (el) smoothScrollTo(el.getBoundingClientRect().top + window.scrollY - 16, 700);
    }, 100);
    setTimeout(() => setAnimationsComplete(true), 5400);
  };

  const handleGotIt = () => {
    if (!animationsComplete) {
      setAnimationsSkipped(true);
      setAnimationsComplete(true);
    }
    setCoachingPhase("coaching");
    setTimeout(() => {
      const el = document.getElementById("sentiment-cards");
      if (el) smoothScrollTo(el.getBoundingClientRect().top + window.scrollY - 12, 600);
    }, 100);
  };

  const startPractice = () => {
    setPracticing(true);
    setRecording(false);
    setPracticeFeedback(false);
    setTimeout(() => {
      const el = document.getElementById("practice-overlay");
      if (el) {
        const rect = el.getBoundingClientRect();
        smoothScrollTo(rect.top + window.scrollY - (window.innerHeight / 2) + (rect.height / 2), 600);
      }
    }, 100);
  };

  const getScenarioText = () => {
    // Use actual moment context if available, fallback to generic only if no data
    if (currentMoment === 0) {
      return activeMoments[0]?.beforeContext || activeMoments[0]?.youSaid || "Call context not available";
    }
    return activeMoments[currentMoment - 1]?.prospectSaid || "";
  };

  const handlePracticeDone = () => {
    setPracticing(false);
    setRecording(false);
    setPracticeFeedback(false);
    setPracticeCompleted(true);
  };

  const handleRetryPractice = () => {
    setRecording(false);
    setPracticeFeedback(false);
  };

  // Empty state: real call but no moments detected
  if (isRealCall && activeMoments.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pb-16 flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-4xl mb-4">📞</p>
        <p className="text-lg font-semibold text-pitch-text">No key moments detected</p>
        <p className="text-sm text-pitch-tertiary mt-2 max-w-sm">Your call was too short or didn't have enough back-and-forth for the AI to find specific moments. Try a longer call with more objection handling.</p>
        {onComplete && (
          <button onClick={onComplete} className="mt-6 px-4 py-2 bg-pitch-orange text-white rounded-lg text-sm font-semibold">
            Done
          </button>
        )}
      </div>
    );
  }

  // Loading state when moment hasn't loaded yet
  if (isMomentLoading) {
    return (
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pb-16">
        <TimelineHeader
          currentMoment={currentMoment}
          moments={activeMoments}
          onChangeMoment={setCurrentMoment}
          onResetState={resetState}
        />
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <div className="w-12 h-12 border-4 border-pitch-accent/20 border-t-pitch-accent rounded-full animate-spin mb-4" />
          <p className="text-lg font-semibold text-pitch-text">Analyzing moment...</p>
          <p className="text-sm text-pitch-secondary mt-2">AI is reviewing this part of your call</p>
          <button 
            onClick={() => setCurrentMoment(activeMoments.length - 1)}
            className="mt-6 px-4 py-2 bg-pitch-cream border border-pitch-border rounded-lg text-sm text-pitch-secondary hover:bg-pitch-muted transition-smooth"
          >
            ← Back to available moments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-6 pb-16">
      <TimelineHeader
        currentMoment={currentMoment}
        moments={activeMoments}
        onChangeMoment={setCurrentMoment}
        onResetState={resetState}
      />

      <AnimatePresence mode="wait">
        {phase === "splash" && (
          <SplashScreen
            currentMoment={currentMoment}
            label={moment.label}
          />
        )}

        {phase === "main" && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <TranscriptSection
              moment={moment}
              currentMoment={currentMoment}
              onShowCoaching={onShowCoaching}
            />

            <CoachingBreakdown
              moment={moment}
              coachingPhase={coachingPhase}
              showCoachingButton={showCoachingButton}
              animationsComplete={animationsComplete}
              animationsSkipped={animationsSkipped}
              practiceCompleted={practiceCompleted}
              onRevealCoaching={revealCoaching}
              onGotIt={handleGotIt}
              onStartPractice={startPractice}
              onNext={goNext}
              onComplete={onComplete}
              currentMoment={currentMoment}
              totalMoments={totalMoments}
            />

            <PracticeOverlay
              moment={moment}
              scenarioText={getScenarioText()}
              isVisible={practicing}
              isRecording={recording}
              showFeedback={practiceFeedback}
              onClose={() => { setPracticing(false); setRecording(false); setPracticeFeedback(false); }}
              onStartRecording={() => setRecording(true)}
              onStopRecording={() => { setRecording(false); setPracticeFeedback(true); }}
              onPracticeDone={handlePracticeDone}
              onRetry={handleRetryPractice}
            />

            {/* Sticky Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-pitch-cream/90 backdrop-blur-sm border-t border-pitch-border/50 py-2 px-5 sm:px-6">
              <div className="max-w-2xl mx-auto flex items-center justify-center gap-4">
                <button onClick={goPrev} disabled={currentMoment === 0} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-pitch-border rounded-lg text-xs font-semibold text-pitch-secondary hover:bg-pitch-muted transition-smooth disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="rotate-180">→</span> Prev
                </button>
                <span className="text-sm font-bold text-pitch-text tabular-nums">{currentMoment + 1} / {totalMoments}</span>
                <button onClick={goNext} disabled={currentMoment === totalMoments - 1} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-pitch-border rounded-lg text-xs font-semibold text-pitch-secondary hover:bg-pitch-muted transition-smooth disabled:opacity-40 disabled:cursor-not-allowed">
                  Next →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

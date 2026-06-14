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
  const activeMoments = moments || MOMENTS;
  const moment = activeMoments[currentMoment];
  const totalMoments = activeMoments.length;

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
    if (currentMoment === 0) return "You cold-called Marcus at NexaCorp. He answered the phone.";
    return activeMoments[currentMoment - 1].prospectSaid;
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

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-6 pb-16">
      <TimelineHeader
        currentMoment={currentMoment}
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

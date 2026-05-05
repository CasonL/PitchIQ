import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SentimentCard from "./SentimentCard";

/* Smooth scroll with a controlled duration — not an instant jump */
function smoothScrollTo(targetY: number, duration = 600) {
  const startY = window.scrollY;
  const diff = targetY - startY;
  const startTime = performance.now();

  function step(now: number) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeInOutCubic
    const eased = progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    window.scrollTo(0, startY + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Volume2,
  Star,
  ArrowRight,
  Target,
  Mic,
  CircleStop,
  RotateCcw,
  Check,
  Lock,
  MessageCircle,
  Sparkles,
  ArrowUp,
} from "lucide-react";
import Waveform from "./Waveform";
import { MOMENTS, type MomentData } from "../pages/Home";

interface TimelineScreenProps {
  onComplete?: () => void;
}

export default function TimelineScreen({ onComplete }: TimelineScreenProps) {
  const [currentMoment, setCurrentMoment] = useState(0);
  const [phase, setPhase] = useState<"splash" | "main">("splash");
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [coachingPhase, setCoachingPhase] = useState<"none" | "sentiment" | "coaching">("none");
  const [showCoachingButton, setShowCoachingButton] = useState(false);
  const [animationsComplete, setAnimationsComplete] = useState(false);
  const [animationsSkipped, setAnimationsSkipped] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [practiceFeedback, setPracticeFeedback] = useState(false);
  const [practiceCompleted, setPracticeCompleted] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizVisible, setQuizVisible] = useState(false);
  const [showHowChat, setShowHowChat] = useState(false);

  const moment = MOMENTS[currentMoment];
  const totalMoments = MOMENTS.length;

  const [animatedScore, setAnimatedScore] = useState(moment.beforeScore);
  const scoreAnimRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setPhase("main"), 1500);
    return () => clearTimeout(timer);
  }, [currentMoment]);

  useEffect(() => {
    smoothScrollTo(0, 500);
  }, [currentMoment]);

  /* Count-up animation for After Practice score — bell curve easing */
  useEffect(() => {
    if (!practiceCompleted) {
      setAnimatedScore(moment.beforeScore);
      return;
    }
    const start = moment.beforeScore;
    const end = moment.afterScore;
    const duration = 1500;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeInOutCubic — bell curve: slow → fast → slow
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const current = start + (end - start) * eased;
      setAnimatedScore(parseFloat(current.toFixed(1)));
      if (progress < 1) {
        scoreAnimRef.current = requestAnimationFrame(tick);
      }
    }

    scoreAnimRef.current = requestAnimationFrame(tick);
    return () => {
      if (scoreAnimRef.current) cancelAnimationFrame(scoreAnimRef.current);
    };
  }, [practiceCompleted, moment.beforeScore, moment.afterScore]);

  const goNext = useCallback(() => {
    if (currentMoment < totalMoments - 1) {
      setCurrentMoment((p) => p + 1);
      resetState();
    }
  }, [currentMoment, totalMoments]);

  const goPrev = useCallback(() => {
    if (currentMoment > 0) {
      setCurrentMoment((p) => p - 1);
      resetState();
    }
  }, [currentMoment]);

  const resetState = () => {
    setPhase("splash");
    setTranscriptOpen(false);
    setShowCoachingButton(false);
    setCoachingPhase("none");
    setAnimationsComplete(false);
    setAnimationsSkipped(false);
    setPlayingAudio(false);
    setPracticing(false);
    setRecording(false);
    setPracticeFeedback(false);
    setPracticeCompleted(false);
    setQuizAnswered(false);
    setSelectedAnswer(null);
    setQuizVisible(false);
    setShowHowChat(false);
  };

  const handlePlay = () => {
    if (playingAudio) return;
    setPlayingAudio(true);
    setTimeout(() => setShowCoachingButton(true), 1200);
    setTimeout(() => setPlayingAudio(false), 3000);
  };

  const toggleTranscript = () => {
    setTranscriptOpen((p) => !p);
    setTimeout(() => setShowCoachingButton(true), 1200);
  };

  const revealCoaching = () => {
    setCoachingPhase("sentiment");
    setAnimationsComplete(false);
    setAnimationsSkipped(false);
    setTimeout(() => {
      const el = document.getElementById("sentiment-cards");
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 16;
        smoothScrollTo(top, 700);
      }
    }, 100);
    // All animations finish ~5.1s
    setTimeout(() => setAnimationsComplete(true), 5400);
  };

  const handleGotIt = () => {
    if (!animationsComplete) {
      setAnimationsSkipped(true);
      setAnimationsComplete(true);
    }
    setCoachingPhase("coaching");
    // Scroll to pin the 3 metrics at the top of the viewport
    setTimeout(() => {
      const el = document.getElementById("sentiment-cards");
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 12;
        smoothScrollTo(top, 600);
      }
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
        const top = rect.top + window.scrollY - (window.innerHeight / 2) + (rect.height / 2);
        smoothScrollTo(top, 600);
      }
    }, 100);
  };

  const startRecording = () => {
    setRecording(true);
    // Scroll to center the recording UI
    setTimeout(() => {
      const el = document.getElementById("recording-ui");
      if (el) {
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY - (window.innerHeight / 2) + (rect.height / 2);
        smoothScrollTo(top, 500);
      }
    }, 100);
    setTimeout(() => {
      setRecording(false);
      setPracticeFeedback(true);
      // Scroll to reveal the feedback
      setTimeout(() => {
        const el = document.getElementById("practice-feedback");
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 24;
          smoothScrollTo(top, 500);
        }
      }, 100);
    }, 2500);
  };

  const stopRecording = () => {
    setRecording(false);
    setPracticeFeedback(true);
  };

  const showQuizInline = () => {
    setQuizVisible(true);
    setQuizAnswered(false);
    setSelectedAnswer(null);
    setTimeout(() => {
      const el = document.getElementById("quiz-section");
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 20;
        smoothScrollTo(top, 500);
      }
    }, 100);
  };

  const handleQuizAnswer = (index: number) => {
    setSelectedAnswer(index);
    setQuizAnswered(true);
    // After 0.6s, scroll to reveal Why this matters
    setTimeout(() => {
      const el = document.getElementById("quiz-explanation");
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 24;
        smoothScrollTo(top, 600);
      }
    }, 600);
  };

  const handlePracticeDone = () => {
    setPracticing(false);
    setRecording(false);
    setPracticeFeedback(false);
    setPracticeCompleted(true);
  };

  const dotColor = (type: MomentData["type"], active: boolean) => {
    if (!active) return "bg-pitch-muted text-pitch-tertiary";
    switch (type) {
      case "mistake": return "bg-pitch-red text-white";
      case "turning": return "bg-[#2563EB] text-white";
      case "win": return "bg-pitch-green text-white";
    }
  };

  const segmentColor = (type: MomentData["type"]) => {
    switch (type) {
      case "mistake": return "bg-pitch-red";
      case "turning": return "bg-[#2563EB]";
      case "win": return "bg-pitch-green";
    }
  };

  const getScenarioText = () => {
    if (currentMoment === 0) {
      return "You cold-called Marcus at NexaCorp. He answered the phone.";
    }
    return MOMENTS[currentMoment - 1].prospectSaid;
  };

  const sentimentCardColors: Record<string, string> = {
    trust:     "text-[#D97706]",
    curiosity: "text-[#2563EB]",
    urgency:   "text-[#D9382E]",
  };

  const metricWordColor = (word: string) => {
    if (word === "Urgency") return "text-[#D9382E] font-semibold";
    if (word === "Trust") return "text-[#D97706] font-semibold";
    if (word === "Curiosity") return "text-[#2563EB] font-semibold";
    return "";
  };

    /* Splits text and color-codes metric names inline */
  const MetricText = ({ text }: { text: string }) => {
    const parts = text.split(/(Urgency|Trust|Curiosity)/g);
    return (
      <>
        {parts.map((part, i) => {
          const colorClass = metricWordColor(part);
          if (colorClass) return <span key={i} className={colorClass}>{part}</span>;
          return <span key={i}>{part}</span>;
        })}
      </>
    );
  };

  const sentimentCards = [
    { key: "trust" as const, label: "Trust" },
    { key: "curiosity" as const, label: "Curiosity" },
    { key: "urgency" as const, label: "Urgency" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-6 pb-16">
      {/* Timeline dots */}
      <div className="pt-4 pb-2">
        <div className="flex items-center justify-center gap-0">
          {MOMENTS.map((m, i) => (
            <div key={m.id} className="flex items-center">
              {i > 0 && (
                <div className={`w-6 sm:w-10 h-[2px] ${i <= currentMoment ? segmentColor(MOMENTS[i - 1].type) : "bg-pitch-border"}`} />
              )}
              <button
                onClick={() => {
                  setCurrentMoment(i);
                  resetState();
                }}
                className={`flex flex-col items-center mx-1 transition-smooth ${
                  i === currentMoment ? "scale-110" : "hover:scale-105 opacity-60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-pitch-cream shadow-sm ${
                    dotColor(m.type, i === currentMoment)
                  }`}
                >
                  {m.id}
                </div>
              </button>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-semibold text-pitch-tertiary uppercase tracking-widest text-center mt-2">
          Moment {currentMoment + 1} of {totalMoments}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {phase === "splash" && (
          <motion.div
            key="splash"
            className="flex flex-col items-center justify-center py-20 sm:py-28"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.6, y: -40 }}
            transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          >
            <span className="font-display text-[140px] sm:text-[180px] font-bold text-pitch-text leading-none">
              {currentMoment + 1}
            </span>
            <p className="text-sm text-pitch-secondary mt-4">{moment.label}</p>
          </motion.div>
        )}

        {phase === "main" && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Number header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
              className="text-center pt-4 sm:pt-6 pb-6"
            >
              <span className="font-display text-5xl sm:text-6xl font-bold text-pitch-text">
                {currentMoment + 1}
              </span>
              <p className="text-lg sm:text-xl font-semibold text-pitch-text mt-1">
                {currentMoment === 0 ? "First major moment" : currentMoment === 1 ? "Turning point" : "Closing moment"}
              </p>
              <p className="text-xs text-pitch-tertiary mt-1 font-mono">{moment.label} · {moment.time}</p>
            </motion.div>

            {/* Play button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex justify-center py-6"
            >
              <button
                onClick={handlePlay}
                className="w-14 h-14 rounded-full flex items-center justify-center bg-pitch-orange text-white shadow-sm hover:scale-105 active:scale-95 transition-smooth"
              >
                {playingAudio ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
            </motion.div>

            {/* Waveform */}
            <AnimatePresence>
              {playingAudio && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden flex justify-center pb-4"
                >
                  <Waveform active color="orange" barCount={18} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Transcript toggle */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-col items-center py-2"
            >
              <button
                onClick={toggleTranscript}
                className="flex flex-col items-center gap-1 text-pitch-secondary hover:text-pitch-orange transition-smooth"
              >
                <span className="text-xs font-normal tracking-wide">Transcript</span>
                {transcriptOpen ? <ChevronUp className="w-3.5 h-3.5 text-pitch-orange" /> : <ChevronDown className="w-3.5 h-3.5 text-pitch-orange" />}
              </button>
              <AnimatePresence>
                {transcriptOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden w-full"
                  >
                    <div className="pt-5 space-y-3 text-left">
                      {/* Context line for moments that need it */}
                      {currentMoment === 0 && (
                        <div className="border-l-[3px] border-l-pitch-tertiary pl-3 py-1">
                          <p className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-wider mb-1">Context</p>
                          <p className="text-sm text-pitch-text leading-relaxed">You cold-called Marcus at NexaCorp. He answered the phone.</p>
                        </div>
                      )}
                      {currentMoment === 1 && (
                        <div className="border-l-[3px] border-l-pitch-orange pl-3 py-1">
                          <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">Marcus</p>
                          <p className="text-sm text-pitch-text leading-relaxed">{MOMENTS[0].prospectSaid}</p>
                        </div>
                      )}

                      {moment.prospectFinal ? (
                        <>
                          {/* Moment 3: Marcus asks → You answer → Marcus commits */}
                          <div className="border-l-[3px] border-l-pitch-orange pl-3 py-1">
                            <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">Marcus</p>
                            <p className="text-sm text-pitch-text leading-relaxed">{moment.prospectSaid}</p>
                          </div>
                          <div className="border-l-[3px] border-l-[#2563EB] pl-3 py-1">
                            <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider mb-1">You</p>
                            <p className="text-sm text-pitch-text leading-relaxed">{moment.youSaid}</p>
                          </div>
                          <div className="border-l-[3px] border-l-pitch-orange pl-3 py-1">
                            <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">Marcus</p>
                            <p className="text-sm text-pitch-text leading-relaxed">{moment.prospectFinal}</p>
                            <p className="text-[10px] text-pitch-tertiary mt-1 italic">Tone: {moment.prospectTone} · Talk ratio: {moment.talkRatio}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Moments 1-2: You speak → Marcus responds */}
                          <div className="border-l-[3px] border-l-[#2563EB] pl-3 py-1">
                            <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider mb-1">You</p>
                            <p className="text-sm text-pitch-text leading-relaxed">{moment.youSaid}</p>
                          </div>
                          <div className="border-l-[3px] border-l-pitch-orange pl-3 py-1">
                            <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">Marcus</p>
                            <p className="text-sm text-pitch-text leading-relaxed">{moment.prospectSaid}</p>
                            <p className="text-[10px] text-pitch-tertiary mt-1 italic">Tone: {moment.prospectTone} · Talk ratio: {moment.talkRatio}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div className="h-px bg-pitch-border" />

            {/* Coaching Breakdown Button */}
            <AnimatePresence>
              {showCoachingButton && coachingPhase === "none" && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.4 }}
                  className="py-6 text-center"
                >
                  <button
                    onClick={revealCoaching}
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    Coaching Breakdown
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ═══════════════════════════════════════════════════════════
                COACHING BREAKDOWN — Page-like experience
               ═══════════════════════════════════════════════════════════ */}
            <AnimatePresence>
              {coachingPhase !== "none" && (
                <motion.div
                  id="coaching-anchor"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* ═══════ Sentiment Cards — opacity spotlight ═══════ */}
                  <div id="sentiment-cards" className="py-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {sentimentCards.map(({ key, label }, i) => {
                      const before = moment.beforeSentiment[key];
                      const after = moment.sentiment[key];
                      return (
                        <SentimentCard
                          key={`${currentMoment}-${key}`}
                          cardKey={key}
                          label={label}
                          beforeValue={before.value}
                          afterValue={after.value}
                          cycleDelay={i * 1.8}
                          barStart={i * 1.8 + 0.7}
                          animationsSkipped={animationsSkipped}
                          textColor={sentimentCardColors[key]}
                        />
                      );
                    })}
                  </div>

                  {/* Got it — visible immediately, disabled until animations finish */}
                  {coachingPhase === "sentiment" && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="py-10 text-center"
                    >
                      <button
                        onClick={handleGotIt}
                        className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm transition-all duration-150 shadow-sm active:scale-95 active:shadow-inner active:translate-y-0.5 ${
                          animationsComplete || animationsSkipped
                            ? "bg-pitch-orange text-white hover:bg-pitch-orange/90 hover:shadow-md hover:-translate-y-0.5"
                            : "bg-pitch-muted text-pitch-tertiary"
                        }`}
                      >
                        Got it
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}

                  {/* Coaching Content — reveals after Got it */}
                  {coachingPhase === "coaching" && (
                    <motion.div
                      id="coaching-content"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    >
                      <div id="coaching-divider" className="h-px bg-pitch-border mb-5" />
                      <p className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-[0.15em] mb-4">
                        Coaching Breakdown
                      </p>

                      {/* What Worked — neutral, factual */}
                      <div className="border-l-[3px] border-l-pitch-border pl-4 py-1.5 mb-5">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Check className="w-3.5 h-3.5 text-pitch-tertiary" />
                          <span className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-wider">What Worked</span>
                        </div>
                        <p className="text-sm text-pitch-secondary leading-relaxed"><MetricText text={moment.whatWorked} /></p>
                      </div>

                      {/* Sharpen This — brand orange accent */}
                      <div className="h-6" />
                      <div className="border-l-[3px] border-l-pitch-border pl-4 py-1.5 mb-5">
                        <div className="flex items-center gap-1.5 mb-2">
                          <ArrowRight className="w-3.5 h-3.5 text-pitch-orange" />
                          <span className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider">Sharpen This</span>
                        </div>
                        <p className="text-sm text-pitch-secondary leading-relaxed"><MetricText text={moment.sharpenThis} />{" "}<strong className="text-pitch-text font-semibold">{moment.sharpenBold}</strong>.</p>
                        <div className="mt-3 bg-pitch-orange-light/30 border border-pitch-orange/15 rounded-lg p-3">
                          <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1.5">{moment.quoteTag}</p>
                          <p className="text-sm text-pitch-text font-medium leading-relaxed">"{moment.quoteText}"</p>
                        </div>
                      </div>

                      {/* ═══════ LEARN: Quiz ═══════ */}
                      <div id="quiz-section" className="mb-6">
                        {!quizVisible ? (
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                            className="text-center py-4"
                          >
                            <button
                              onClick={showQuizInline}
                              className="inline-flex items-center gap-2 px-7 py-3.5 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5"
                            >
                              <Target className="w-4 h-4" />
                              Learn
                              <ArrowRight className="w-4 h-4" />
                            </button>
                            <p className="text-xs text-pitch-tertiary mt-2">Understand the psychology before you practice</p>
                          </motion.div>
                        ) : (
                          <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="bg-pitch-muted/20 border border-pitch-border/40 rounded-xl p-4 sm:p-5"
                          >
                            <div className="flex items-center gap-2 mb-4">
                              <Target className="w-4 h-4 text-pitch-orange" />
                              <p className="text-sm font-bold text-pitch-text">Sales Psychology Check</p>
                            </div>

                            <p className="text-sm text-pitch-text font-medium leading-relaxed mb-4">{moment.quiz.question}</p>

                            <div className="space-y-2 mb-4">
                              {moment.quiz.options.map((option, idx) => {
                                const isSelected = selectedAnswer === idx;
                                const showCorrect = quizAnswered && option.correct;
                                const showWrong = quizAnswered && isSelected && !option.correct;
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => !quizAnswered && handleQuizAnswer(idx)}
                                    disabled={quizAnswered}
                                    className={`w-full text-left p-3 rounded-lg border text-sm transition-smooth ${
                                      showCorrect
                                        ? "bg-pitch-green-light border-pitch-green text-pitch-text"
                                        : showWrong
                                        ? "bg-pitch-red-light border-pitch-red text-pitch-text"
                                        : isSelected
                                        ? "bg-pitch-orange-light border-pitch-orange text-pitch-text"
                                        : "bg-white border-pitch-border text-pitch-text hover:bg-pitch-muted"
                                    } ${quizAnswered ? "cursor-default" : "cursor-pointer"}`}
                                  >
                                    <span className="font-bold mr-2">{String.fromCharCode(65 + idx)}.</span>
                                    {option.text}
                                    {showCorrect && <span className="ml-2 text-pitch-green font-bold">Correct</span>}
                                    {showWrong && <span className="ml-2 text-pitch-red font-bold">Incorrect</span>}
                                  </button>
                                );
                              })}
                            </div>

                            {quizAnswered && (
                              <motion.div id="quiz-explanation" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                                <div className="bg-pitch-muted/40 rounded-lg p-3">
                                  <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1.5">Why this matters</p>
                                  <p className="text-sm text-pitch-secondary leading-relaxed">{moment.quiz.explanation}</p>
                                </div>

                                {/* How? — expands into chat */}
                                <div className="mt-3">
                                  {!showHowChat ? (
                                    <button
                                      onClick={() => setShowHowChat(true)}
                                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-pitch-orange hover:text-pitch-orange/80 transition-smooth"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      How?
                                    </button>
                                  ) : (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      transition={{ duration: 0.3 }}
                                      className="bg-white border border-pitch-border rounded-xl overflow-hidden"
                                    >
                                      {/* Chat messages */}
                                      <div className="p-3 space-y-3">
                                        <div className="flex gap-2">
                                          <div className="w-6 h-6 rounded-full bg-pitch-orange flex items-center justify-center shrink-0">
                                            <Sparkles className="w-3.5 h-3.5 text-white" />
                                          </div>
                                          <div className="bg-pitch-muted/30 rounded-lg rounded-tl-sm p-2.5 flex-1">
                                            <p className="text-xs text-pitch-text leading-relaxed">{moment.quiz.howResponse}</p>
                                          </div>
                                        </div>
                                      </div>
                                      {/* Fake respond bar */}
                                      <div className="border-t border-pitch-border/50 p-2 flex items-center gap-2 bg-pitch-cream/50">
                                        <div className="flex-1 bg-white border border-pitch-border rounded-full px-3 py-2 text-xs text-pitch-tertiary">
                                          Ask a follow-up...
                                        </div>
                                        <button className="w-8 h-8 rounded-full bg-pitch-orange flex items-center justify-center shrink-0">
                                          <ArrowUp className="w-4 h-4 text-white" />
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </div>

                      {/* Scores */}
                      <div className="flex gap-3 mb-6">
                        <div className="flex-1 text-center py-3">
                          <p className="text-[10px] font-bold text-pitch-red uppercase tracking-wider mb-1">First Try</p>
                          <p className="text-3xl font-bold text-pitch-red">{moment.beforeScore}</p>
                          <p className="text-[10px] text-pitch-secondary mt-1">{moment.beforeContext}</p>
                        </div>
                        <div className="w-px bg-pitch-border" />
                        <div className="flex-1 text-center py-3">
                          <p className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-wider mb-1">After Practice</p>
                          <AnimatePresence mode="wait">
                            {practiceCompleted ? (
                              <motion.p
                                key="score"
                                initial={{ scale: 1.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                                className="text-3xl font-bold text-pitch-green transition-colors duration-300"
                              >
                                {animatedScore.toFixed(1)}
                              </motion.p>
                            ) : (
                              <motion.div key="locked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
                                <Lock className="w-6 h-6 text-pitch-tertiary mb-1" />
                                <p className="text-2xl font-bold text-pitch-tertiary">?</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <p className="text-[10px] text-pitch-secondary mt-1">{practiceCompleted ? moment.afterContext : "Practice to unlock"}</p>
                        </div>
                      </div>

                      {/* Actions — Primary button is the NEXT step in the flow */}
                      <div className="flex gap-3 pb-8">
                        {!practiceCompleted ? (
                          <>
                            <button onClick={startPractice} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5">
                              <Target className="w-4 h-4" />Practice Moment
                            </button>
                            <button onClick={goNext} disabled={currentMoment === totalMoments - 1} className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white border border-pitch-border text-pitch-text rounded-xl font-semibold text-sm hover:bg-pitch-muted transition-smooth disabled:opacity-40 disabled:cursor-not-allowed">
                              Next <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {currentMoment === totalMoments - 1 && onComplete ? (
                              <button onClick={onComplete} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5">
                                Finish Review <ChevronRight className="w-4 h-4" />
                              </button>
                            ) : (
                              <button onClick={goNext} disabled={currentMoment === totalMoments - 1} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed">
                                Next <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={startPractice} className="w-11 h-11 flex items-center justify-center bg-white border border-pitch-border text-pitch-tertiary rounded-xl hover:bg-pitch-muted hover:text-pitch-text transition-smooth shrink-0">
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Practice Overlay */}
            <AnimatePresence>
              {practicing && (
                <motion.div id="practice-overlay" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white border border-pitch-border rounded-xl shadow-card p-4 sm:p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-pitch-text">Practice Mode</p>
                      <p className="text-xs text-pitch-secondary">Replay with a better response</p>
                    </div>
                    <button onClick={() => { setPracticing(false); setRecording(false); setPracticeFeedback(false); }} className="text-xs text-pitch-tertiary hover:text-pitch-red transition-smooth">Close</button>
                  </div>
                  <div className="bg-pitch-muted/30 rounded-xl p-4 mb-4">
                    <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-2">Scenario</p>
                    <p className="text-sm text-pitch-text leading-relaxed">{getScenarioText()}</p>
                  </div>
                  {!recording && !practiceFeedback && (
                    <button onClick={startRecording} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth">
                      <Mic className="w-4 h-4" />Record Your Response
                    </button>
                  )}
                  {recording && (
                    <div id="recording-ui" className="text-center space-y-4">
                      <div className="relative inline-flex">
                        <div className="w-14 h-14 rounded-full bg-pitch-red flex items-center justify-center"><Mic className="w-6 h-6 text-white" /></div>
                        <div className="absolute inset-0 rounded-full bg-pitch-red animate-ping opacity-30" />
                      </div>
                      <div className="flex justify-center">
                        <Waveform active color="green" barCount={14} />
                      </div>
                      <button onClick={stopRecording} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-pitch-red text-pitch-red rounded-full font-medium text-sm hover:bg-pitch-red-light transition-smooth"><CircleStop className="w-4 h-4" />Stop</button>
                    </div>
                  )}
                  {practiceFeedback && (
                    <motion.div id="practice-feedback" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-pitch-green-light border border-pitch-green/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-pitch-green" /><span className="text-sm font-bold text-pitch-green">Nice work!</span></div>
                      <p className="text-sm text-pitch-secondary">You used {moment.sharpenBold.toLowerCase()} effectively. Score improved from {moment.beforeScore} to {moment.afterScore}.</p>
                      <div className="mt-3 p-3 bg-white border border-pitch-border rounded-lg">
                        <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">Your response</p>
                        <p className="text-sm text-pitch-text font-medium">"{moment.quoteText}"</p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button onClick={() => { setRecording(false); setPracticeFeedback(false); }} className="w-10 h-10 flex items-center justify-center bg-white border border-pitch-border text-pitch-tertiary rounded-lg hover:bg-pitch-muted hover:text-pitch-text transition-smooth shrink-0">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={handlePracticeDone} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-pitch-orange text-white rounded-lg text-sm font-semibold hover:bg-pitch-orange/90 transition-smooth shadow-sm">
                          Done <Check className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sticky Bottom Nav */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-pitch-cream/90 backdrop-blur-sm border-t border-pitch-border/50 py-2 px-5 sm:px-6">
              <div className="max-w-2xl mx-auto flex items-center justify-center gap-4">
                <button onClick={goPrev} disabled={currentMoment === 0} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-pitch-border rounded-lg text-xs font-semibold text-pitch-secondary hover:bg-pitch-muted transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft className="w-3.5 h-3.5" />Prev</button>
                <span className="text-sm font-bold text-pitch-text tabular-nums">{currentMoment + 1} / {totalMoments}</span>
                <button onClick={goNext} disabled={currentMoment === totalMoments - 1} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-pitch-border rounded-lg text-xs font-semibold text-pitch-secondary hover:bg-pitch-muted transition-smooth disabled:opacity-40 disabled:cursor-not-allowed">Next <ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

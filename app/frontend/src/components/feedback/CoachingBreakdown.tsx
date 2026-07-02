import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Lock, RotateCcw, ChevronRight, Target } from "lucide-react";
import SentimentCard from "./SentimentCard";
import QuizSection from "./QuizSection";
import { type MomentData } from "./momentsData";

interface CoachingBreakdownProps {
  moment: MomentData;
  coachingPhase: "none" | "sentiment" | "coaching";
  showCoachingButton: boolean;
  animationsComplete: boolean;
  animationsSkipped: boolean;
  practiceCompleted: boolean;
  onRevealCoaching: () => void;
  onGotIt: () => void;
  onStartPractice: () => void;
  onNext: () => void;
  onComplete?: () => void;
  currentMoment: number;
  totalMoments: number;
}

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

const sentimentCardColors: Record<string, string> = {
  trust: "text-[#D97706]",
  curiosity: "text-[#2563EB]",
  urgency: "text-[#D9382E]",
};

const metricWordColor = (word: string) => {
  if (word === "Urgency") return "text-[#D9382E] font-semibold";
  if (word === "Trust") return "text-[#D97706] font-semibold";
  if (word === "Curiosity") return "text-[#2563EB] font-semibold";
  return "";
};

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

export default function CoachingBreakdown({
  moment,
  coachingPhase,
  showCoachingButton,
  animationsComplete,
  animationsSkipped,
  practiceCompleted,
  onRevealCoaching,
  onGotIt,
  onStartPractice,
  onNext,
  onComplete,
  currentMoment,
  totalMoments,
}: CoachingBreakdownProps) {
  const [animatedScore, setAnimatedScore] = useState(moment.beforeScore);
  const scoreAnimRef = useRef<number | null>(null);

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

  const sentimentCards = [
    { key: "trust" as const, label: "Trust" },
    { key: "curiosity" as const, label: "Curiosity" },
    { key: "urgency" as const, label: "Urgency" },
  ];

  return (
    <>
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
              onClick={onRevealCoaching}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5"
            >
              Coaching Breakdown
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Coaching Content */}
      <AnimatePresence>
        {coachingPhase !== "none" && (
          <motion.div
            id="coaching-anchor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Sentiment Cards */}
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

            {/* Got it Button */}
            {coachingPhase === "sentiment" && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="py-10 text-center"
              >
                <button
                  onClick={onGotIt}
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

            {/* Coaching Content Details */}
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

                {/* What Worked - only shown when there's actually something to credit */}
                {moment.whatWorked && (
                  <>
                    <div className="border-l-[3px] border-l-pitch-border pl-4 py-1.5 mb-5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Check className="w-3.5 h-3.5 text-pitch-tertiary" />
                        <span className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-wider">What Worked</span>
                      </div>
                      <p className="text-sm text-pitch-secondary leading-relaxed"><MetricText text={moment.whatWorked} /></p>
                    </div>
                    <div className="h-6" />
                  </>
                )}

                {/* Sharpen This */}
                <div className="border-l-[3px] border-l-pitch-border pl-4 py-1.5 mb-5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ArrowRight className="w-3.5 h-3.5 text-pitch-orange" />
                    <span className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider">Sharpen This</span>
                  </div>
                  <p className="text-sm text-pitch-secondary leading-relaxed"><MetricText text={moment.sharpenThis} /></p>
                  {moment.sharpenBold && (
                    <p className="text-sm text-pitch-text font-semibold mt-2">{moment.sharpenBold}</p>
                  )}
                  <div className="mt-3 bg-pitch-orange-light/30 border border-pitch-orange/15 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1.5">{moment.quoteTag}</p>
                    <p className="text-sm text-pitch-text font-medium leading-relaxed">"{moment.quoteText}"</p>
                  </div>
                </div>

                {/* Quiz Section */}
                <QuizSection moment={moment} />

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
                        <motion.p key="score" initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }} className="text-3xl font-bold text-pitch-green transition-colors duration-300">
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

                {/* Action Buttons */}
                <div className="flex gap-3 pb-8">
                  {!practiceCompleted ? (
                    <>
                      <button onClick={onStartPractice} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5">
                        <Target className="w-4 h-4" />Practice Moment
                      </button>
                      <button onClick={onNext} disabled={currentMoment === totalMoments - 1} className="flex items-center justify-center gap-1.5 px-4 py-3 bg-white border border-pitch-border text-pitch-text rounded-xl font-semibold text-sm hover:bg-pitch-muted transition-smooth disabled:opacity-40 disabled:cursor-not-allowed">
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
                        <button onClick={onNext} disabled={currentMoment === totalMoments - 1} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed">
                          Next <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={onStartPractice} className="w-11 h-11 flex items-center justify-center bg-white border border-pitch-border text-pitch-tertiary rounded-xl hover:bg-pitch-muted hover:text-pitch-text transition-smooth shrink-0">
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
    </>
  );
}

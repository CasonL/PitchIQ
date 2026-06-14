import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, MessageCircle, Sparkles, ArrowUp } from "lucide-react";
import { type MomentData } from "./momentsData";

interface QuizSectionProps {
  moment: MomentData;
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

export default function QuizSection({ moment }: QuizSectionProps) {
  const [quizVisible, setQuizVisible] = useState(false);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showHowChat, setShowHowChat] = useState(false);

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
    setTimeout(() => {
      const el = document.getElementById("quiz-explanation");
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 24;
        smoothScrollTo(top, 600);
      }
    }, 600);
  };

  return (
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
            <ArrowUp className="w-4 h-4 rotate-90" />
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
  );
}

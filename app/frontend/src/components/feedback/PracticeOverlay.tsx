import { motion, AnimatePresence } from "framer-motion"; // v1.2 - null-safe sharpenBold
import { Mic, CircleStop, RotateCcw, Check, Star } from "lucide-react";
import Waveform from "./Waveform";
import { type MomentData } from "./momentsData";

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

interface PracticeOverlayProps {
  moment: MomentData;
  scenarioText: string;
  isVisible: boolean;
  isRecording: boolean;
  showFeedback: boolean;
  onClose: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPracticeDone: () => void;
  onRetry: () => void;
}

export default function PracticeOverlay({
  moment,
  scenarioText,
  isVisible,
  isRecording,
  showFeedback,
  onClose,
  onStartRecording,
  onStopRecording,
  onPracticeDone,
  onRetry,
}: PracticeOverlayProps) {

  const handleStartRecording = () => {
    onStartRecording();
    // Scroll to center the recording UI
    setTimeout(() => {
      const el = document.getElementById("recording-ui");
      if (el) {
        const rect = el.getBoundingClientRect();
        const top = rect.top + window.scrollY - (window.innerHeight / 2) + (rect.height / 2);
        smoothScrollTo(top, 500);
      }
    }, 100);
    // Auto-stop after 2.5s for demo
    setTimeout(() => {
      onStopRecording();
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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="practice-overlay"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white border border-pitch-border rounded-xl shadow-card p-4 sm:p-5 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-pitch-text">Practice Mode</p>
              <p className="text-xs text-pitch-secondary">Replay with a better response</p>
            </div>
            <button onClick={onClose} className="text-xs text-pitch-tertiary hover:text-pitch-red transition-smooth">Close</button>
          </div>

          <div className="bg-pitch-muted/30 rounded-xl p-4 mb-4">
            <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-2">Scenario</p>
            <p className="text-sm text-pitch-text leading-relaxed">{scenarioText}</p>
          </div>

          {!isRecording && !showFeedback && (
            <button
              onClick={handleStartRecording}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth"
            >
              <Mic className="w-4 h-4" />Record Your Response
            </button>
          )}

          {isRecording && (
            <div id="recording-ui" className="text-center space-y-4">
              <div className="relative inline-flex">
                <div className="w-14 h-14 rounded-full bg-pitch-red flex items-center justify-center"><Mic className="w-6 h-6 text-white" /></div>
                <div className="absolute inset-0 rounded-full bg-pitch-red animate-ping opacity-30" />
              </div>
              <div className="flex justify-center">
                <Waveform active color="green" barCount={14} />
              </div>
              <button onClick={onStopRecording} className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-pitch-red text-pitch-red rounded-full font-medium text-sm hover:bg-pitch-red-light transition-smooth"><CircleStop className="w-4 h-4" />Stop</button>
            </div>
          )}

          {showFeedback && (
            <motion.div id="practice-feedback" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-pitch-green-light border border-pitch-green/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-pitch-green" /><span className="text-sm font-bold text-pitch-green">Nice work!</span></div>
              <p className="text-sm text-pitch-secondary">You used {(moment.sharpenBold || 'the technique').toLowerCase()} effectively. Score improved from {moment.beforeScore} to {moment.afterScore}.</p>
              <div className="mt-3 p-3 bg-white border border-pitch-border rounded-lg">
                <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">Your response</p>
                <p className="text-sm text-pitch-text font-medium">"{moment.quoteText}"</p>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={onRetry} className="w-10 h-10 flex items-center justify-center bg-white border border-pitch-border text-pitch-tertiary rounded-lg hover:bg-pitch-muted hover:text-pitch-text transition-smooth shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={onPracticeDone} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-pitch-orange text-white rounded-lg text-sm font-semibold hover:bg-pitch-orange/90 transition-smooth shadow-sm">
                  Done <Check className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

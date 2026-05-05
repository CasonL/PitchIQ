import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  RotateCcw,
  Send,
  CircleStop,
} from "lucide-react";
import TurnCard from "./TurnCard";
import StepIndicator from "./StepIndicator";
import Waveform from "./Waveform";

interface ScenarioStep {
  number: number;
  title: string;
  narrative: string;
  hint: string;
}

const STEPS: ScenarioStep[] = [
  {
    number: 1,
    title: "Open with Context",
    narrative:
      "The prospect has just joined the call. Your goal is to establish relevance immediately. Reference something specific about their company or role to show you've done your homework.",
    hint: "Try: 'I saw NexaCorp just announced your Series C — congratulations. That growth usually brings new reporting challenges.'",
  },
  {
    number: 2,
    title: "Build Rapport",
    narrative:
      "Sarah seems receptive. Now build a human connection before diving into business. Find a shared touchpoint or express genuine curiosity about her work.",
    hint: "Try: 'VP of Operations at that scale must mean you're managing a lot of moving parts. How long have you been in the role?'",
  },
  {
    number: 3,
    title: "Discover Pain Points",
    narrative:
      "The prospect has just revealed they're struggling with manual reporting. This is your cue to dig deeper. Ask open questions to expand on the pain before offering your solution.",
    hint: "Try: 'How much time does your team spend on reporting each week? And where do those hours go — collecting, cleaning, or presenting?'",
  },
  {
    number: 4,
    title: "Handle Objections",
    narrative:
      "Sarah raised a concern about ERP integration. Objections are buying signals — she's considering it seriously. Acknowledge, reframe, and return to discovery.",
    hint: "Try: 'That's exactly why we designed a phased integration. Most of our SAP clients start with read-only sync. What's your biggest worry — downtime or data integrity?'",
  },
  {
    number: 5,
    title: "Close for Next Step",
    narrative:
      "You've built rapport, uncovered pain, and addressed concerns. Now secure a specific next step with a person, time, and agenda. Avoid vague 'let's reconnect' endings.",
    hint: "Try: 'Based on this, I'd like to show you our SAP connector live with your BI lead. Does Tuesday 2pm work for a 20-minute demo?'",
  },
];

const CONVERSATION_TURNS = [
  {
    speaker: "ai" as const,
    text: "Hi, thanks for reaching out. I'm Sarah Chen, VP of Operations at NexaCorp. I've heard your platform can help with our reporting workflow?",
  },
  {
    speaker: "user" as const,
    text: "Hi Sarah, great to meet you. Yes, absolutely — we specialize in automating complex reporting pipelines. I'd love to learn more about what your team is handling today.",
  },
  {
    speaker: "ai" as const,
    text: "Honestly, it's a mess. Three different tools, manual CSV exports every Friday, and my team spends about 12 hours a week just compiling reports.",
  },
  {
    speaker: "user" as const,
    text: "That sounds frustrating. Is the 12 hours mostly data cleaning or also distribution?",
  },
  {
    speaker: "ai" as const,
    text: "Both, really. But the bigger issue is accuracy — last month we sent a report with outdated numbers to the board. That was embarrassing.",
  },
];

const FEEDBACK_MESSAGES = [
  { score: "+5 Rapport", text: "Great opener! You pivoted to discovery immediately." },
  { score: "+3 Discovery", text: "Good quantification. Try one more open question." },
  { score: "+8 Objection", text: "Excellent reframing with social proof." },
];

export default function TrainerView() {
  const [currentStep, setCurrentStep] = useState(0);
  const [visibleTurns, setVisibleTurns] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackIndex, setFeedbackIndex] = useState(0);
  const [typingText, setTypingText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const step = STEPS[currentStep];
  const turnsToShow = CONVERSATION_TURNS.slice(0, visibleTurns);

  // Typewriter effect for new turns
  const typeText = useCallback((text: string, onComplete?: () => void) => {
    setIsTyping(true);
    setTypingText("");
    let index = 0;

    if (typingRef.current) clearInterval(typingRef.current);

    typingRef.current = setInterval(() => {
      index++;
      setTypingText(text.slice(0, index));
      if (index >= text.length) {
        if (typingRef.current) clearInterval(typingRef.current);
        setIsTyping(false);
        onComplete?.();
      }
    }, 20);
  }, []);

  useEffect(() => {
    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
      if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
    };
  }, []);

  const handleContinue = () => {
    if (currentStep === 2) {
      // At step 3, trigger recording mode
      setIsRecording(true);
      setShowFeedback(false);
      return;
    }

    if (visibleTurns < CONVERSATION_TURNS.length) {
      const nextTurn = CONVERSATION_TURNS[visibleTurns];
      setVisibleTurns((prev) => prev + 1);
      if (nextTurn.speaker === "user") {
        typeText(nextTurn.text);
      }
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleRecord = () => {
    setIsRecording(true);
    setShowFeedback(false);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setShowFeedback(true);
    setFeedbackIndex(Math.floor(Math.random() * FEEDBACK_MESSAGES.length));

    // Simulate user response appearing after recording
    if (visibleTurns < CONVERSATION_TURNS.length) {
      setTimeout(() => {
        setVisibleTurns((prev) => prev + 1);
        const nextTurn = CONVERSATION_TURNS[visibleTurns];
        if (nextTurn?.speaker === "user") {
          typeText(nextTurn.text);
        }
      }, 1200);
    }

    // Advance step after feedback
    setTimeout(() => {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((prev) => prev + 1);
      }
    }, 2500);
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setVisibleTurns(1);
    setIsRecording(false);
    setShowFeedback(false);
    setTypingText("");
    setIsTyping(false);
    if (typingRef.current) clearInterval(typingRef.current);
    if (recordingTimerRef.current) clearTimeout(recordingTimerRef.current);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Voice Board - Left */}
        <div className="lg:col-span-7 space-y-4">
          {/* Header Bar */}
          <div className="bg-white rounded-2xl shadow-card p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-pitch-orange-light text-pitch-orange text-xs font-medium">
                Enterprise Software Discovery
              </span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      i <= 2 ? "bg-pitch-orange" : "bg-pitch-border"
                    }`}
                  />
                ))}
                <span className="text-xs text-pitch-tertiary ml-1">Intermediate</span>
              </div>
            </div>
            <span className="font-mono text-sm text-pitch-secondary">
              Step {currentStep + 1} of {STEPS.length}
            </span>
          </div>

          {/* Conversation Timeline */}
          <div className="bg-white rounded-2xl shadow-card p-5 space-y-3 min-h-[400px]">
            {turnsToShow.map((turn, i) => (
              <TurnCard
                key={i}
                speaker={turn.speaker}
                text={
                  turn.speaker === "user" && i === visibleTurns - 1 && isTyping
                    ? typingText
                    : turn.text
                }
                label={turn.speaker === "ai" ? "Sarah Chen — VP Operations" : undefined}
                showWaveform
                delay={i * 0.1}
              />
            ))}

            {/* Active typing cursor */}
            {isTyping && (
              <div className="flex items-center gap-2 ml-14">
                <div className="w-0.5 h-5 bg-pitch-orange animate-caret-blink" />
                <span className="text-xs text-pitch-tertiary">Responding...</span>
              </div>
            )}

            {/* Your Move Banner */}
            <AnimatePresence>
              {currentStep === 2 && !isRecording && !showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-4 bg-pitch-orange rounded-xl text-center"
                >
                  <p className="font-display text-xl italic text-white animate-glow-pulse">
                    Your Move
                  </p>
                  <p className="text-white/80 text-sm mt-1">
                    The prospect revealed a pain point. Ask an open question to dig deeper.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Recording Interface */}
            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mt-4 p-6 bg-pitch-muted rounded-xl text-center space-y-4"
                >
                  <div className="flex items-center justify-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-pitch-red flex items-center justify-center">
                        <Mic className="w-6 h-6 text-white" />
                      </div>
                      <div className="absolute inset-0 rounded-full bg-pitch-red animate-ping opacity-30" />
                    </div>
                    <div>
                      <p className="font-medium text-pitch-text">Recording...</p>
                      <p className="text-xs text-pitch-tertiary">Speak your response</p>
                    </div>
                  </div>

                  <Waveform active color="green" barCount={16} />

                  <button
                    onClick={handleStopRecording}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-pitch-red rounded-full font-medium text-sm hover:bg-pitch-red-light transition-smooth shadow-card"
                  >
                    <CircleStop className="w-4 h-4" />
                    Stop Recording
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Feedback Pop */}
            <AnimatePresence>
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="mt-4 p-4 bg-pitch-green-light border border-pitch-green/20 rounded-xl"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-pitch-green text-white text-xs font-bold">
                      {FEEDBACK_MESSAGES[feedbackIndex].score}
                    </span>
                    <span className="text-sm font-medium text-pitch-green">
                      Nice work!
                    </span>
                  </div>
                  <p className="text-sm text-pitch-secondary">
                    {FEEDBACK_MESSAGES[feedbackIndex].text}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Coaching Panel - Right */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl shadow-card p-5">
            <h2 className="text-sm font-semibold text-pitch-tertiary uppercase tracking-wider mb-4">
              Methodology
            </h2>

            {/* Step List */}
            <div className="space-y-1">
              {STEPS.map((s) => (
                <StepIndicator
                  key={s.number}
                  number={s.number}
                  title={s.title}
                  status={
                    s.number < currentStep + 1
                      ? "complete"
                      : s.number === currentStep + 1
                      ? "current"
                      : "locked"
                  }
                />
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-pitch-border">
              {/* Current Step Detail */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-pitch-text mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-pitch-secondary leading-relaxed">
                      {step.narrative}
                    </p>
                  </div>

                  {/* Hint Card */}
                  <div className="bg-pitch-orange-light rounded-xl p-3 flex items-start gap-2.5">
                    <Lightbulb className="w-5 h-5 text-pitch-orange flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-pitch-secondary">{step.hint}</p>
                  </div>

                  {/* Action Button */}
                  {currentStep === 2 && !isRecording && !showFeedback ? (
                    <button
                      onClick={handleRecord}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-pitch-orange text-pitch-orange rounded-full font-medium text-sm hover:bg-pitch-orange-light transition-smooth"
                    >
                      <Mic className="w-4 h-4" />
                      Record Response
                    </button>
                  ) : (
                    <button
                      onClick={handleContinue}
                      disabled={isTyping || isRecording}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pitch-orange text-white rounded-full font-medium text-sm hover:bg-pitch-orange/90 transition-smooth disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      {currentStep === STEPS.length - 1
                        ? "Finish Scenario"
                        : "Continue Conversation"}
                    </button>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <div className="mt-4 pt-4 border-t border-pitch-border flex items-center justify-between">
              <button
                onClick={handleBack}
                disabled={currentStep === 0 || isRecording}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm text-pitch-secondary hover:bg-pitch-muted transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>

              <button
                onClick={handleRestart}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm text-pitch-secondary hover:bg-pitch-muted transition-smooth"
              >
                <RotateCcw className="w-4 h-4" />
                Restart
              </button>

              <button
                onClick={handleContinue}
                disabled={isTyping || isRecording || currentStep === STEPS.length - 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm text-pitch-secondary hover:bg-pitch-muted transition-smooth disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * IntegratedMarcusDemo.tsx
 * Kimi's polished UI + Full backend AI system
 * Combines beautiful design with real voice AI, coaching, and scenarios
 */

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play, Target, Sparkles, Package, Mic, BarChart3, ArrowRight } from "lucide-react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { CharmerController } from "../components/voice/charmer/CharmerController";
import { CharmerServicesProvider } from "../components/voice/charmer/context/CharmerServicesContext";
import { ADAPTIVE_SCENARIO } from "../components/voice/charmer/MarcusScenarios";
import { CallCompletionData } from "../components/voice/charmer/types/CallData";

type DemoStep = "welcome" | "briefing" | "call" | "results";

function IntegratedMarcusDemoContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<DemoStep>("welcome");
  const [briefingCardIndex, setBriefingCardIndex] = useState(0);

  const briefingCards = [
    { phase: "1", title: "Choose Your Product", desc: "Pick what you're selling to Marcus.", icon: Package },
    { phase: "2", title: "Talk to Marcus", desc: "Marcus responds with live voice AI. The conversation shapes itself to your pitch.", icon: Mic },
    { phase: "3", title: "Review Your Performance", desc: "Get targeted feedback on what worked and where you lost him.", icon: BarChart3 },
  ];

  // Check URL params on mount
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (stepParam === 'results') {
      setStep('results');
    }
  }, [searchParams]);

  const handleCallEnd = useCallback(() => {
    console.log('✅ Call ended');
    setStep("results");
  }, []);

  const handleTryAgain = () => {
    setStep("briefing");
    setBriefingCardIndex(0);
  };

  const reset = () => {
    setStep("welcome");
    setBriefingCardIndex(0);
  };

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-md border-b border-gray-100/80">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => (step === "welcome" ? navigate("/") : reset())}
            className="flex items-center gap-2 text-[#5A5A5A] hover:text-brand-orange transition-colors text-sm font-medium px-2 py-2 -ml-2 rounded-lg hover:bg-black/5 min-h-[44px]"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">{step === "welcome" ? "Back to PitchIQ" : "Exit Demo"}</span>
            <span className="sm:hidden">{step === "welcome" ? "Back" : "Exit"}</span>
          </button>
          <Link to="/" className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-black/5 transition-colors min-h-[44px]">
            <img src="/fox-mascot.webp" alt="PitchIQ" className="w-6 h-6 object-contain" />
            <span className="font-display text-base font-bold text-[#1A1A1A]">PitchIQ</span>
          </Link>
        </div>
      </div>

      <div className="pt-14">
        <AnimatePresence mode="wait">
          {/* ========== WELCOME SCREEN ========== */}
          {step === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="min-h-[calc(100vh-56px)] flex flex-col lg:flex-row"
            >
              {/* Left panel */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 lg:py-0">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, duration: 0.5 }}
                  className="mb-8"
                >
                  <img
                    src="/marcus-avatar.webp"
                    alt="Marcus Stindle"
                    className="w-40 h-40 lg:w-48 lg:h-48 rounded-2xl object-cover shadow-xl shadow-brand-orange/10"
                  />
                </motion.div>
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="text-center"
                >
                  <h1 className="font-display text-4xl lg:text-5xl font-bold text-[#1A1A1A] mb-3">
                    Marcus Stindle
                  </h1>
                  <p className="text-brand-orange font-medium text-lg mb-1">CFO, VantageFlow</p>
                  <p className="text-[#8A8A8A] text-sm">Ready to practice?</p>
                </motion.div>
              </div>

              {/* Right panel */}
              <div className="flex-1 bg-white lg:border-l border-gray-100 flex flex-col justify-center px-8 lg:px-16 py-12 lg:py-0">
                <motion.div
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  {/* New Lead badge */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="mb-4"
                  >
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-mono font-bold tracking-wider uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      New Lead
                    </span>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="font-display text-3xl font-bold text-[#1A1A1A] mb-4"
                  >
                    Marcus Stindle
                  </motion.h2>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.75, duration: 0.4 }}
                    className="space-y-3 mb-8"
                  >
                    <p className="text-[#5A5A5A] text-base leading-relaxed">
                      Marcus browsed your website a few days ago. You are following up on his interest.
                    </p>
                    <p className="text-[#8A8A8A] text-sm italic">
                      Disclaimer: Marcus is an AI buyer.
                    </p>
                  </motion.div>

                  <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.4 }}
                    onClick={() => {
                      setBriefingCardIndex(0);
                      setStep("briefing");
                    }}
                    className="px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all text-sm"
                  >
                    What to expect
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ========== BRIEFING SCREEN ========== */}
          {step === "briefing" && (
            <motion.div
              key="briefing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-6 py-12"
            >
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display text-2xl font-bold text-[#1A1A1A] mb-2"
              >
                What to Expect
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-[#8A8A8A] text-sm mb-10"
              >
                Swipe or tap to see what's next
              </motion.p>

              <div className="relative w-full max-w-sm h-80">
                {/* Ghost cards behind */}
                {briefingCardIndex < briefingCards.length - 1 && (
                  <div className="absolute inset-0 bg-white rounded-2xl shadow-md border border-gray-100 opacity-40 scale-[0.96] translate-y-3 translate-x-1 rotate-1" />
                )}
                {briefingCardIndex < briefingCards.length - 2 && (
                  <div className="absolute inset-0 bg-white rounded-2xl shadow-sm border border-gray-100 opacity-20 scale-[0.92] translate-y-6 translate-x-2 rotate-2" />
                )}

                {/* Active card */}
                <AnimatePresence mode="wait">
                  {briefingCardIndex < briefingCards.length && (
                    <motion.div
                      key={briefingCardIndex}
                      initial={{ opacity: 0, scale: 0.85, y: 40 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, x: 250, rotateZ: 12, transition: { duration: 0.3, ease: "easeOut" } }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.8}
                      onDragEnd={(_, info) => {
                        if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500) {
                          setBriefingCardIndex((prev) => prev + 1);
                        }
                      }}
                      onClick={() => setBriefingCardIndex((prev) => prev + 1)}
                      className="absolute inset-0 bg-white rounded-2xl shadow-xl border border-gray-100 p-8 flex flex-col items-center justify-center text-center cursor-pointer z-10"
                    >
                      {(() => {
                        const card = briefingCards[briefingCardIndex];
                        const CardIcon = card.icon;
                        return (
                          <>
                            <div className="w-14 h-14 rounded-2xl bg-brand-orange/10 flex items-center justify-center mb-4">
                              <CardIcon size={28} className="text-brand-orange" />
                            </div>
                            <span className="text-xs font-mono font-bold text-brand-orange tracking-wider mb-2">
                              PHASE {card.phase}
                            </span>
                            <h3 className="font-display text-xl font-bold text-[#1A1A1A] mb-2">
                              {card.title}
                            </h3>
                            <p className="text-[#5A5A5A] text-sm leading-relaxed">
                              {card.desc}
                            </p>
                            <div className="mt-6 text-[#8A8A8A] text-xs flex items-center gap-1">
                              <span>Tap or swipe</span>
                              <ArrowRight size={12} />
                            </div>
                          </>
                        );
                      })()}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {briefingCardIndex >= briefingCards.length && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col items-center mt-10"
                >
                  <button
                    onClick={() => setStep("call")}
                    className="px-10 py-4 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all text-base flex items-center gap-2"
                  >
                    <Play size={18} fill="white" />
                    Start Challenge
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* ========== ACTIVE CALL (CharmerController with Full AI) ========== */}
          {step === "call" && (
            <motion.div
              key="call"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="min-h-screen"
            >
              <CharmerServicesProvider>
                <CharmerController
                  initialScenario={ADAPTIVE_SCENARIO}
                  showOpener={false}
                  onCallComplete={handleCallEnd}
                />
              </CharmerServicesProvider>
            </motion.div>
          )}

          {/* ========== RESULTS ========== */}
          {step === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-[640px] mx-auto px-6 pt-16 pb-12"
            >
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-orange to-brand-amber flex items-center justify-center mx-auto mb-4 shadow-glow">
                  <img src="/fox-mascot.webp" alt="PitchIQ" className="w-10 h-10 object-contain" />
                </div>
                <h2 className="font-display text-3xl font-bold text-[#1A1A1A] mb-2">
                  Call Complete
                </h2>
                <p className="text-[#5A5A5A]">
                  Your session with Marcus has ended.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center">
                    <span className="text-brand-orange font-bold text-xs">AI</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#8A8A8A] tracking-wider uppercase">
                    Feedback Coming Soon
                  </span>
                </div>
                <div className="space-y-4">
                  <p className="text-[#1A1A1A] text-sm leading-relaxed">
                    Great work! Your AI-powered coaching analysis is processing. Full moment-by-moment feedback will be available soon.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleTryAgain}
                  className="flex-1 px-6 py-3.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg transition-all text-sm"
                >
                  Try Another Challenge
                </button>
                <button
                  onClick={reset}
                  className="flex-1 px-6 py-3.5 rounded-full border border-gray-300 text-[#5A5A5A] font-semibold hover:bg-gray-50 transition-all text-sm"
                >
                  Back to Start
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default IntegratedMarcusDemoContent;

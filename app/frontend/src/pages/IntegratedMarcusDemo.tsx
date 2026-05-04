/**
 * IntegratedMarcusDemo.tsx
 * Kimi's polished UI + Full backend AI system
 * Combines beautiful design with real voice AI, coaching, and scenarios
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Play } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { CharmerController } from "../components/voice/charmer/CharmerController";
import { CharmerServicesProvider } from "../components/voice/charmer/context/CharmerServicesContext";
import { MarcusScenario, ALL_SCENARIOS } from "../components/voice/charmer/MarcusScenarios";
import { CallCompletionData } from "../components/voice/charmer/types/CallData";

type DemoStep = "welcome" | "select" | "call" | "results";

interface Challenge {
  id: string;
  title: string;
  description: string;
  scenario: MarcusScenario;
}

const challenges: Challenge[] = ALL_SCENARIOS.map(scenario => ({
  id: scenario.id,
  title: scenario.name,
  description: scenario.description,
  scenario
}));

function IntegratedMarcusDemoContent() {
  const navigate = useNavigate();
  const [step, setStep] = useState<DemoStep>("welcome");
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  const handleStartChallenge = () => {
    if (!selectedChallenge) return;
    setStep("call");
  };

  const handleCallEnd = useCallback(() => {
    console.log('✅ Call ended');
    setStep("results");
  }, []);

  const handleTryAgain = () => {
    setStep("select");
    setSelectedChallenge(null);
  };

  const reset = () => {
    setStep("welcome");
    setSelectedChallenge(null);
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
                  <p className="text-[#8A8A8A] text-sm">Ready to test your cold call skills?</p>
                </motion.div>
              </div>

              {/* Right panel */}
              <div className="flex-1 bg-white lg:border-l border-gray-100 flex flex-col justify-center px-8 lg:px-16 py-12 lg:py-0">
                <motion.div
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                >
                  <h2 className="font-display text-3xl font-bold text-[#1A1A1A] mb-3">
                    The Marcus Challenge
                  </h2>
                  <p className="text-[#5A5A5A] text-lg leading-relaxed mb-8 max-w-[420px]">
                    Master the cold call. Book the meeting. Prove your skills against a prospect who actually pushes back.
                  </p>

                  <div className="space-y-4 mb-10">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0">
                        <span className="text-brand-orange font-bold text-sm">1</span>
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A1A1A] text-sm">Pick a scenario</p>
                        <p className="text-[#8A8A8A] text-sm">Choose what you're selling to Marcus.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0">
                        <span className="text-brand-orange font-bold text-sm">2</span>
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A1A1A] text-sm">Talk it out</p>
                        <p className="text-[#8A8A8A] text-sm">Marcus responds in real time with AI voice.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center shrink-0">
                        <span className="text-brand-orange font-bold text-sm">3</span>
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A1A1A] text-sm">Get coached</p>
                        <p className="text-[#8A8A8A] text-sm">See what you did well and where you lost him.</p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep("select")}
                    className="px-10 py-4 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all text-base flex items-center gap-2"
                  >
                    <Play size={18} fill="white" />
                    Start Challenge
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ========== CHALLENGE SELECT ========== */}
          {step === "select" && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-[720px] mx-auto px-6 pt-16 pb-12"
            >
              <div className="text-center mb-10">
                <h2 className="font-display text-3xl font-bold text-[#1A1A1A] mb-2">
                  Pick Your Challenge
                </h2>
                <p className="text-[#5A5A5A]">
                  What are you selling to Marcus today?
                </p>
              </div>

              <div className="grid gap-4 mb-10">
                {challenges.map((challenge) => (
                  <button
                    key={challenge.id}
                    onClick={() => setSelectedChallenge(challenge)}
                    className={`text-left p-6 rounded-2xl border-2 transition-all ${
                      selectedChallenge?.id === challenge.id
                        ? "border-brand-orange bg-brand-orange/[0.03] shadow-md"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 transition-colors ${
                          selectedChallenge?.id === challenge.id
                            ? "border-brand-orange bg-brand-orange"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedChallenge?.id === challenge.id && (
                          <svg viewBox="0 0 14 14" className="w-full h-full p-[2px]">
                            <path
                              d="M2 7L5.5 10.5L12 4"
                              fill="none"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#1A1A1A] text-lg mb-1">
                          {challenge.title}
                        </h3>
                        <p className="text-[#5A5A5A] text-sm">{challenge.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep("welcome")}
                  className="text-[#8A8A8A] hover:text-[#5A5A5A] text-sm font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleStartChallenge}
                  disabled={!selectedChallenge}
                  className={`px-8 py-3.5 rounded-full font-semibold text-sm transition-all ${
                    selectedChallenge
                      ? "bg-gradient-to-r from-brand-orange to-brand-amber text-white shadow-glow hover:shadow-glow-lg"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Start Call
                </button>
              </div>
            </motion.div>
          )}

          {/* ========== ACTIVE CALL (CharmerController with Full AI) ========== */}
          {step === "call" && selectedChallenge && (
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
                  initialScenario={selectedChallenge.scenario}
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

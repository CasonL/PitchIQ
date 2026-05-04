import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, PhoneOff, Mic, Volume2, Play } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

type DemoStep = "welcome" | "select" | "call" | "results";

interface Challenge {
  id: string;
  title: string;
  description: string;
}

interface Message {
  id: number;
  sender: "marcus" | "user";
  text: string;
}

interface CallOption {
  text: string;
  response: Message;
  feedback: string[];
}

const challenges: Challenge[] = [
  {
    id: "website",
    title: "Website Refresh",
    description: "Marcus knows his site is old but thinks it's 'fine.'",
  },
  {
    id: "promo",
    title: "Promotional Materials",
    description: 'Marcus sees branded items as "nice-to-have" fluff.',
  },
  {
    id: "anything",
    title: "Sell Literally Anything",
    description: "Marcus adapts to whatever you're selling. Discovery required.",
  },
];

const callScript: Record<string, { opening: Message; userOptions: CallOption[] }> = {
  website: {
    opening: { id: 1, sender: "marcus", text: "Hey, thanks for reaching out. Honestly, I've got a lot on my plate right now. What's this about?" },
    userOptions: [
      {
        text: "I noticed your website hasn't been updated in a while. I can help with that.",
        response: { id: 2, sender: "marcus", text: "Yeah, it's old. But it works. I'm not sure I want to spend money on something that isn't broken." },
        feedback: ["You led with observation, not value.", "Marcus needs to feel the pain before he'll spend."],
      },
      {
        text: "Quick question. Are you happy with how many leads your site is bringing in right now?",
        response: { id: 2, sender: "marcus", text: "Leads? It's... fine. I mean, could be better I guess. What's your point?" },
        feedback: ["Good. You asked a discovery question.", "Marcus is starting to engage. Keep pressing."],
      },
    ],
  },
  promo: {
    opening: { id: 1, sender: "marcus", text: "Hey there. I got your message about branded merchandise. Not sure I'm interested." },
    userOptions: [
      {
        text: "We make really high-quality branded items at great prices.",
        response: { id: 2, sender: "marcus", text: "Everyone says that. My team already has pens. They don't need more stuff." },
        feedback: ["You led with product, not outcome.", "Marcus doesn't care about pens. He cares about what they do for his business."],
      },
      {
        text: "Fair enough. When your team shows up at a client meeting, do they look like one company or a bunch of individuals?",
        response: { id: 2, sender: "marcus", text: "Hmm. Never thought about it that way. Some wear hoodies, some wear whatever." },
        feedback: ["Excellent reframing.", "You made him see the invisible problem. That's sales."],
      },
    ],
  },
  anything: {
    opening: { id: 1, sender: "marcus", text: "Alright, I'm curious. What are you selling me today?" },
    userOptions: [
      {
        text: "I sell sales training software that helps teams practice with AI.",
        response: { id: 2, sender: "marcus", text: "Sales training? We already do that in-house. Not sure I need software for it." },
        feedback: ["You pitched the product immediately.", "Marcus needs to feel the gap in his current process first."],
      },
      {
        text: "Before I tell you, can I ask how your team currently prepares for tough client calls?",
        response: { id: 2, sender: "marcus", text: "We... rehearse? Sometimes? Honestly, most reps just wing it and hope for the best." },
        feedback: ["Perfect discovery opening.", "You uncovered the real pain. Now you have permission to sell."],
      },
    ],
  },
};

function AudioWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-14">
      {[...Array(24)].map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-brand-orange"
          animate={
            active
              ? {
                  height: [6, 12 + Math.sin(i * 0.7) * 18, 8, 22 + Math.cos(i * 1.1) * 14, 6],
                }
              : { height: 4 }
          }
          transition={
            active
              ? {
                  duration: 0.5 + Math.random() * 0.3,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                  delay: i * 0.02,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

export default function DemoPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<DemoStep>("welcome");
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [options, setOptions] = useState<CallOption[]>([]);
  const [marcusSpeaking, setMarcusSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<string[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, marcusSpeaking]);

  const startChallenge = () => {
    if (!selectedChallenge) return;
    const script = callScript[selectedChallenge];
    setMessages([script.opening]);
    setOptions(script.userOptions);
    setFeedback([]);
    setMarcusSpeaking(true);
    setTimeout(() => setMarcusSpeaking(false), 1200);
    setStep("call");
  };

  const handleOption = (option: CallOption) => {
    setOptions([]);
    setMessages((prev) => [...prev, { id: Date.now(), sender: "user", text: option.text }]);
    setMarcusSpeaking(true);

    setTimeout(() => {
      setMarcusSpeaking(false);
      setMessages((prev) => [...prev, option.response]);

      setTimeout(() => {
        const followUp: Message = {
          id: Date.now() + 1,
          sender: "marcus",
          text: "Look, you've given me something to think about. Send me a proposal and I'll take a look.",
        };
        setMarcusSpeaking(true);
        setTimeout(() => {
          setMarcusSpeaking(false);
          setMessages((prev) => [...prev, followUp]);
          setTimeout(() => {
            setFeedback(option.feedback);
            setStep("results");
          }, 800);
        }, 1500);
      }, 600);
    }, 1500);
  };

  const reset = () => {
    setStep("welcome");
    setSelectedChallenge(null);
    setMessages([]);
    setOptions([]);
    setMarcusSpeaking(false);
    setFeedback([]);
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
                        <p className="text-[#8A8A8A] text-sm">Make your pitch. Marcus responds in real time.</p>
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
                    onClick={() => setSelectedChallenge(challenge.id)}
                    className={`text-left p-6 rounded-2xl border-2 transition-all ${
                      selectedChallenge === challenge.id
                        ? "border-brand-orange bg-brand-orange/[0.03] shadow-md"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 transition-colors ${
                          selectedChallenge === challenge.id
                            ? "border-brand-orange bg-brand-orange"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedChallenge === challenge.id && (
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
                  onClick={startChallenge}
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

          {/* ========== ACTIVE CALL ========== */}
          {step === "call" && (
            <motion.div
              key="call"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="min-h-[calc(100vh-56px)] flex flex-col lg:flex-row"
            >
              {/* Left: Call Stage */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#F8F7F5]">
                <div className="w-full max-w-[400px]">
                  {/* Avatar */}
                  <motion.div
                    animate={marcusSpeaking ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    className="mb-6 flex justify-center"
                  >
                    <img
                      src="/marcus-avatar.webp"
                      alt="Marcus Stindle"
                      className="w-36 h-36 rounded-2xl object-cover shadow-xl shadow-brand-orange/10"
                    />
                  </motion.div>

                  {/* Name */}
                  <div className="text-center mb-4">
                    <h2 className="font-display text-2xl font-bold text-[#1A1A1A]">Marcus Stindle</h2>
                    <p className="text-brand-orange font-medium text-sm mt-0.5">CFO, VantageFlow</p>
                  </div>

                  {/* Waveform */}
                  <div className="mb-4">
                    <AudioWaveform active={marcusSpeaking} />
                  </div>

                  {/* Status */}
                  <p className="text-center text-[#8A8A8A] text-xs font-mono tracking-wider uppercase mb-8">
                    {marcusSpeaking
                      ? "Marcus is speaking..."
                      : options.length > 0
                      ? "Your turn"
                      : "Connecting..."}
                  </p>

                  {/* Call Controls */}
                  <div className="flex items-center justify-center gap-6">
                    <button className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#8A8A8A] hover:bg-gray-50 transition-colors shadow-sm">
                      <Volume2 size={18} />
                    </button>
                    <button
                      onClick={reset}
                      className="w-14 h-14 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors"
                    >
                      <PhoneOff size={22} />
                    </button>
                    <button className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#8A8A8A] hover:bg-gray-50 transition-colors shadow-sm">
                      <Mic size={18} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Transcript & Options */}
              <div className="flex-1 bg-white lg:border-l border-gray-100 flex flex-col min-h-[50vh] lg:min-h-0">
                {/* Transcript */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                  <h3 className="text-xs font-mono font-semibold text-[#8A8A8A] tracking-wider uppercase mb-4">
                    Transcript
                  </h3>
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3"
                      >
                        <span
                          className={`text-xs font-mono font-bold shrink-0 mt-0.5 ${
                            msg.sender === "marcus" ? "text-brand-orange" : "text-brand-amber"
                          }`}
                        >
                          {msg.sender === "marcus" ? "MARCUS" : "YOU"}
                        </span>
                        <p className="text-[#1A1A1A] text-sm leading-relaxed">{msg.text}</p>
                      </motion.div>
                    ))}
                    {marcusSpeaking && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-xs font-mono font-bold text-brand-orange">MARCUS</span>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-brand-orange/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 bg-brand-orange/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 bg-brand-orange/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </motion.div>
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                </div>

                {/* Response Options */}
                <div className="border-t border-gray-100 p-6 lg:p-8 bg-gray-50/50">
                  <p className="text-xs font-mono font-semibold text-[#8A8A8A] tracking-wider uppercase mb-3">
                    Choose your response
                  </p>
                  <div className="space-y-2">
                    {options.map((option) => (
                      <motion.button
                        key={option.text}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOption(option)}
                        className="w-full text-left px-5 py-4 rounded-xl border border-brand-orange/30 bg-white text-[#1A1A1A] text-sm hover:bg-brand-orange/[0.04] hover:border-brand-orange/50 transition-all shadow-sm"
                      >
                        {option.text}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
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
                  Here's what PitchIQ caught.
                </p>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-brand-orange/10 flex items-center justify-center">
                    <span className="text-brand-orange font-bold text-xs">AI</span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-[#8A8A8A] tracking-wider uppercase">
                    Coach Feedback
                  </span>
                </div>
                <div className="space-y-4">
                  {feedback.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      className="flex items-start gap-3"
                    >
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
                      <p className="text-[#1A1A1A] text-sm leading-relaxed">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setStep("select");
                    setSelectedChallenge(null);
                  }}
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

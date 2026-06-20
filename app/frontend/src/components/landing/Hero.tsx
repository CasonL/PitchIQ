import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getApiBaseUrl } from "@/config/apiEndpoints";

export default function Hero() {
  const navigate = useNavigate();

  const handleDemoClick = async () => {
    // Wake up backend (Render cold start mitigation)
    const apiBase = getApiBaseUrl();
    if (apiBase) {
      console.log('🔥 Waking up backend...');
      // Fire-and-forget health check to spin up Render instance
      fetch(`${apiBase}/api/health`, { method: 'GET' }).catch(() => {
        // Silently fail - this is just a warm-up call
      });
    }
    
    // Navigate to demo
    navigate("/demo");
  };

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-cream bg-noise"
    >
      {/* Soft orange glow behind phone */}
      <div className="absolute top-1/2 right-[15%] -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-brand-orange/10 to-brand-amber/5 blur-3xl pointer-events-none" />

      <div className="max-w-[1200px] mx-auto px-6 w-full grid md:grid-cols-2 gap-12 items-center pt-20">
        {/* Left: Text */}
        <div className="md:order-1">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-block px-3 py-1 rounded-full border border-brand-orange/30 text-brand-orange text-xs font-mono font-medium tracking-wider mb-6">
              AI-POWERED SALES PRACTICE
            </span>
          </motion.div>

          <motion.h1
            id="hero-heading"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-5xl md:text-6xl lg:text-[72px] font-bold text-[#1A1A1A] leading-[1.1] mb-6"
          >
            Every Call Is Worth{" "}
            <em className="text-gradient">Millions.</em>
            <br />
            But Is Your Team Ready?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-[#5A5A5A] max-w-[520px] mb-8 leading-relaxed"
          >
            Stop losing deals to hesitation, bad scripts, and "I'll circle back."
            PitchIQ creates hyper-realistic AI buyers that talk back, negotiate,
            and test your team on real voice calls, before a real prospect ever
            does.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row gap-3 sm:gap-4"
          >
            <button
              onClick={handleDemoClick}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all text-base"
            >
              Experience the Demo
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full border-2 border-brand-orange/40 text-brand-orange font-semibold hover:bg-brand-orange/5 hover:border-brand-orange transition-all text-base text-center"
            >
              See How It Works ↓
            </a>
          </motion.div>
        </div>

        {/* Right: Phone Mockup */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="md:order-2 flex justify-center"
        >
          <div className="animate-float relative">
            <img
              src="/hero-phone.png"
              alt="PitchIQ live AI buyer call with Marcus on a mobile device"
              width="320"
              height="640"
              loading="eager"
              decoding="async"
              className="w-[280px] md:w-[320px] h-auto rounded-[32px] shadow-2xl shadow-brand-orange/10"
            />
            {/* Decorative glow ring */}
            <div className="absolute -inset-4 rounded-[40px] border border-brand-orange/10 pointer-events-none" />
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator - hidden on mobile since touch users scroll naturally */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 flex-col items-center gap-2"
      >
        <span className="text-xs text-[#8A8A8A] font-medium">Scroll to Begin</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <ChevronDown size={20} className="text-brand-orange" />
        </motion.div>
      </motion.div>
    </section>
  );
}

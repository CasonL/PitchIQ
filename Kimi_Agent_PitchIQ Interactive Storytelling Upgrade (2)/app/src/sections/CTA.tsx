import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

export default function CTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <section
      id="cta"
      className="relative py-24 md:py-32 bg-[#1A1A1A] overflow-hidden"
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-brand-orange/5"
            style={{
              width: 200 + i * 60,
              height: 200 + i * 60,
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              x: [0, 30, 0],
              y: [0, -20, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 8 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 1.5,
            }}
          />
        ))}
      </div>

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-[640px] mx-auto"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-4">
            Your Next Big Deal Is Already on Someone's Calendar.
          </h2>
          <p className="text-[#A0A0A0] text-lg mb-10">
            Don't let your team walk in unprepared. Join the waitlist for early
            access, or book a demo to see PitchIQ in action.
          </p>

          {!submitted ? (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-3 max-w-[480px] mx-auto mb-6"
            >
              <input
                type="email"
                required
                placeholder="Enter your work email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-5 py-3.5 rounded-full bg-[#2A2A2A] border border-white/10 text-white placeholder-[#8A8A8A] focus:outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/20 transition-all text-sm"
              />
              <button
                type="submit"
                className="px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all text-sm whitespace-nowrap"
              >
                Join Waitlist
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 bg-success/20 border border-success/30 rounded-full px-6 py-4 max-w-[480px] mx-auto mb-6"
            >
              <Check size={20} className="text-success" />
              <span className="text-success font-medium">
                You're on the list! We'll be in touch soon.
              </span>
            </motion.div>
          )}

          <p className="text-[#8A8A8A] text-xs mb-8">No spam. Early access only.</p>

          <a
            href="/demo"
            className="inline-flex items-center gap-2 text-brand-orange hover:text-brand-amber font-semibold transition-colors text-sm"
          >
            Try the Full Demo
            <ArrowRight size={16} />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

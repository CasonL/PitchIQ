import { motion } from "framer-motion";
import { ArrowRight, Phone, PhoneOff, Volume2 } from "lucide-react";

export default function DemoTeaser() {
  return (
    <section id="demo" className="relative py-24 md:py-32 bg-[#1A1A1A] overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_50%_50%,#E86A33_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="max-w-[1200px] mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="text-brand-orange text-xs font-mono font-medium tracking-widest uppercase mb-4 block">
              Interactive Demo
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-5 leading-tight">
              Talk to Marcus. See What Your Reps Will Face.
            </h2>
            <p className="text-[#A0A0A0] text-lg leading-relaxed mb-8 max-w-[480px]">
              PitchIQ puts your team on live voice calls with AI buyers who push back, stall, and negotiate. Try the Marcus Challenge and experience what realistic practice actually feels like.
            </p>
            <a
              href="/demo"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-brand-orange to-brand-amber text-white font-semibold shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all text-base"
            >
              Try the Demo
              <ArrowRight size={18} />
            </a>
          </motion.div>

          {/* Right: Call UI Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[380px]">
              {/* Phone frame */}
              <div className="rounded-3xl bg-[#1E1E1E] border border-white/10 overflow-hidden shadow-2xl shadow-brand-orange/5">
                {/* Call header */}
                <div className="bg-[#2A2A2A] px-5 py-4 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <img
                      src="/marcus-avatar.webp"
                      alt="Marcus"
                      width="40"
                      height="40"
                      loading="lazy"
                      decoding="async"
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div>
                      <p className="text-white text-sm font-semibold">Marcus Stindle</p>
                      <p className="text-[#8A8A8A] text-xs">CFO, VantageFlow</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#8A8A8A]">
                    <Phone size={12} className="text-success" />
                    <span>00:21</span>
                  </div>
                </div>

                {/* Call body */}
                <div className="px-6 pt-8 pb-6 flex flex-col items-center">
                  <img
                    src="/marcus-avatar.webp"
                    alt="Marcus"
                    width="112"
                    height="112"
                    loading="lazy"
                    decoding="async"
                    className="w-28 h-28 rounded-2xl object-cover shadow-lg mb-5"
                  />
                  <p className="text-[#8A8A8A] text-xs font-mono tracking-wider uppercase mb-4">
                    Marcus is speaking...
                  </p>

                  {/* Fake waveform */}
                  <div className="flex items-end justify-center gap-[3px] h-10 mb-6">
                    {[...Array(16)].map((_, i) => (
                      <div
                        key={i}
                        className="w-[3px] rounded-full bg-brand-orange"
                        style={{
                          height: `${8 + Math.sin(i * 0.8) * 14}px`,
                          opacity: 0.6 + Math.sin(i * 1.2) * 0.4,
                        }}
                      />
                    ))}
                  </div>

                  {/* Sample transcript */}
                  <div className="w-full bg-[#2A2A2A]/50 rounded-xl p-4 mb-4">
                    <p className="text-white/80 text-sm leading-relaxed">
                      <span className="text-brand-orange font-mono text-xs font-bold mr-2">MARCUS</span>
                      Hey, thanks for reaching out. Honestly, I've got a lot on my plate right now. What's this about?
                    </p>
                  </div>

                  {/* Sample response option */}
                  <div className="w-full px-4 py-3 rounded-xl border border-brand-orange/30 bg-brand-orange/5 text-white/90 text-sm text-center">
                    Choose your response
                  </div>
                </div>

                {/* Call controls */}
                <div className="bg-[#1E1E1E] px-6 py-4 flex items-center justify-center gap-6 border-t border-white/5">
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-[#8A8A8A]">
                    <Volume2 size={16} />
                  </div>
                  <div className="w-11 h-11 rounded-full bg-danger/15 flex items-center justify-center text-danger">
                    <PhoneOff size={18} />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-[#8A8A8A]">
                    <Phone size={16} />
                  </div>
                </div>
              </div>

              {/* Decorative glow */}
              <div className="absolute -inset-4 rounded-[40px] bg-brand-orange/5 blur-2xl -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

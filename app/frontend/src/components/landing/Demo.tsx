import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

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

          {/* Right: Demo Screenshot */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[380px]">
              <img
                src="/demo-analysis.png"
                alt="PitchIQ post-call analysis showing a readiness score, coaching insights, and suggested next steps"
                width="320"
                height="640"
                loading="lazy"
                decoding="async"
                className="w-full h-auto rounded-[32px] shadow-2xl shadow-brand-orange/5 border border-white/10"
              />
              {/* Decorative glow */}
              <div className="absolute -inset-4 rounded-[40px] bg-brand-orange/5 blur-2xl -z-10" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

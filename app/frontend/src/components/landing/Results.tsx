import { motion } from "framer-motion";
import { Target, TrendingUp, Shield } from "lucide-react";

const pillars = [
  {
    icon: Target,
    title: "Hit Quota Faster",
    body: "New reps get realistic practice from day one, not awkward role-plays with their manager. They learn your product, your buyers, and your pitch before they ever dial a real prospect.",
  },
  {
    icon: TrendingUp,
    title: "Sharper Discovery Skills",
    body: "Reps who ask better questions close better deals. PitchIQ throws real objections, stalls, and curveballs until asking the right follow-up becomes second nature.",
  },
  {
    icon: Shield,
    title: "No More Pipeline Surprises",
    body: "Your team has already heard 'We went with a competitor' and 'Budget was cut' dozens of times in practice. When it happens on a live call, they don't freeze. They respond.",
  },
];

export default function Results() {
  return (
    <section id="results" aria-labelledby="results-heading" className="relative py-24 md:py-32 bg-gradient-to-b from-cream to-cream-warm">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="text-brand-orange text-xs font-mono font-medium tracking-widest uppercase mb-4 block">
            Why It Works
          </span>
          <h2 id="results-heading" className="font-display text-4xl md:text-5xl font-bold text-[#1A1A1A] max-w-[800px] mx-auto">
            Practice on AI Buyers. Close on Real Ones.
          </h2>
        </motion.div>

        {/* Three Pillars */}
        <div className="grid md:grid-cols-3 gap-8">
          {pillars.map((pillar, i) => (
            <motion.div
              key={pillar.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.8,
                delay: i * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-cream-deep hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-orange/10 flex items-center justify-center mb-5">
                <pillar.icon size={24} className="text-brand-orange" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#1A1A1A] mb-3">
                {pillar.title}
              </h3>
              <p className="text-[#5A5A5A] leading-relaxed text-sm">
                {pillar.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

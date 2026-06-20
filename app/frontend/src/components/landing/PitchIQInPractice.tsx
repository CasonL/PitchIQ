import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Eye, XCircle, Infinity as InfinityIcon, Users } from "lucide-react";

const cards = [
  {
    label: "Alternative",
    icon: XCircle,
    accent: "border-gray-300",
    iconBg: "bg-gray-100",
    iconColor: "text-gray-500",
    text: "Live role-play with a manager. Rare, inconsistent, and judgmental.",
  },
  {
    label: "Unique value",
    icon: InfinityIcon,
    accent: "border-brand-orange",
    iconBg: "bg-brand-orange/10",
    iconColor: "text-brand-orange",
    text: "Unlimited, judgment-free reps with realistic AI buyers, available anytime.",
  },
  {
    label: "Best-fit buyer",
    icon: Users,
    accent: "border-brand-amber",
    iconBg: "bg-brand-amber/10",
    iconColor: "text-brand-amber",
    text: "Sales teams onboarding reps at scale who cannot give everyone live practice.",
  },
];

export default function PitchIQInPractice() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <section
      id="in-practice"
      aria-labelledby="in-practice-heading"
      className="relative py-24 md:py-32 bg-cream"
    >
      <div className="max-w-[1200px] mx-auto px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 md:mb-16"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-orange/30 text-brand-orange text-xs font-mono font-medium tracking-wider mb-4">
            <Eye size={14} />
            PITCHIQ IN PRACTICE
          </span>
          <h2
            id="in-practice-heading"
            className="font-display text-4xl md:text-5xl font-bold text-[#1A1A1A] mb-4"
          >
            What PitchIQ Replaces
          </h2>
          <p className="text-lg md:text-xl text-[#5A5A5A] max-w-[720px] mx-auto leading-relaxed">
            Most teams practice by role-playing with a manager or a peer. It feels awkward, happens rarely, and never scales. PitchIQ is built to beat that.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.6,
                delay: 0.1 + i * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className={`bg-white rounded-2xl p-6 border-t-4 ${card.accent} shadow-sm border border-cream-deep hover:shadow-md hover:-translate-y-0.5 transition-all`}
            >
              <div
                className={`w-10 h-10 rounded-full ${card.iconBg} flex items-center justify-center mb-4`}
              >
                <card.icon size={20} className={card.iconColor} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-2">
                {card.label}
              </h3>
              <p className="text-[#5A5A5A] leading-relaxed">{card.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

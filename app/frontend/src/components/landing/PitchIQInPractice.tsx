import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Eye, XCircle, Infinity as InfinityIcon, Users } from "lucide-react";

const points = [
  {
    label: "Alternative",
    icon: XCircle,
    text: "Live role-play with a manager (rare, inconsistent, judgmental).",
  },
  {
    label: "Unique value",
    icon: InfinityIcon,
    text: "Unlimited, judgment-free reps against a realistic AI buyer, any time.",
  },
  {
    label: "Best-fit buyer",
    icon: Users,
    text: "Sales orgs onboarding reps at volume who can't give everyone live practice.",
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
          className="mb-10 md:mb-12"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-orange/30 text-brand-orange text-xs font-mono font-medium tracking-wider mb-4">
            <Eye size={14} />
            PITCHIQ IN PRACTICE
          </span>
          <h2
            id="in-practice-heading"
            className="font-display text-4xl md:text-5xl font-bold text-[#1A1A1A] max-w-[700px] leading-tight"
          >
            The Thing to Beat
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-2xl border-l-4 border-brand-orange shadow-sm border border-cream-deep p-8 md:p-10"
        >
          <p className="text-lg md:text-xl text-[#5A5A5A] leading-relaxed mb-8 max-w-[800px]">
            PitchIQ's competitive alternative is usually role-play with a manager
            or a peer — awkward, infrequent, and impossible to scale. That's the
            thing to beat.
          </p>

          <ul className="space-y-5">
            {points.map((point) => (
              <li key={point.label} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-orange/10 flex items-center justify-center shrink-0">
                  <point.icon size={20} className="text-brand-orange" />
                </div>
                <div>
                  <span className="font-semibold text-[#1A1A1A] block mb-1">
                    {point.label}:
                  </span>
                  <span className="text-[#5A5A5A]">{point.text}</span>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}

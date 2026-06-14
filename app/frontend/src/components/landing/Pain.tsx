import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

function AnimatedStat({ target, suffix }: { target: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      setCount(current);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [isInView, target]);

  return (
    <span ref={ref} className="text-danger">
      {count}{suffix}
    </span>
  );
}

const painPoints = [
  {
    icon: "/pain-hesitation.webp",
    title: "The Hesitation Tax",
    stat: 38,
    suffix: "%",
    body: " of deals stall because reps freeze on objections. Reps avoid calls because they don't know what to say. The pipeline suffers.",
  },
  {
    icon: "/pain-script.webp",
    title: "The Script Trap",
    stat: 73,
    suffix: "%",
    body: " of static scripts fail against real buyers. You trained them on a script. Buyers never follow scripts.",
  },
  {
    icon: "/pain-practice.webp",
    title: "The Practice Paradox",
    stat: 0,
    suffix: "%",
    body: " of role-plays with colleagues feel realistic. Your manager plays 'tough buyer' for 10 minutes. It's awkward. It's ineffective.",
  },
];

export default function Pain() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  return (
    <section
      id="pain"
      ref={sectionRef}
      aria-labelledby="pain-heading"
      className="relative py-24 md:py-32 bg-cream-warm"
    >
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 md:mb-20"
        >
          <span className="text-brand-orange text-xs font-mono font-medium tracking-widest uppercase mb-4 block">
            The Problem
          </span>
          <h2 id="pain-heading" className="font-display text-4xl md:text-5xl font-bold text-[#1A1A1A] max-w-[700px] leading-tight">
            Your Pipeline Is Burning, One Bad Call at a Time
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {painPoints.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{
                duration: 0.8,
                delay: 0.2 + i * 0.2,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-cream-deep"
            >
              {/* Icon + Title on the same row */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 relative shrink-0">
                  <img
                    src={point.icon}
                    alt={`${point.title} - ${point.title === 'The Hesitation Tax' ? 'Sales rep frozen during objection handling' : point.title === 'The Script Trap' ? 'Generic script failing against real buyer conversation' : 'Awkward unrealistic role-play between colleagues'}`}
                    width="56"
                    height="56"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  />
                </div>
                <h3 className="font-display text-xl font-bold text-[#1A1A1A]">
                  {point.title}
                </h3>
              </div>

              {/* Stat flows directly into the body text */}
              <p className="text-[#5A5A5A] leading-relaxed">
                <span className="text-5xl md:text-6xl font-display font-bold text-danger mr-1">
                  {point.stat > 0 ? (
                    <AnimatedStat target={point.stat} suffix={point.suffix} />
                  ) : (
                    <>0{point.suffix}</>
                  )}
                </span>
                {point.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

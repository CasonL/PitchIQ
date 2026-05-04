import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const steps = [
  {
    number: "01",
    title: "Feed Your World",
    body: "Upload your ICP, product docs, and real call recordings. PitchIQ learns what you sell and who you sell to.",
    image: "/step-upload.webp",
    side: "left" as const,
  },
  {
    number: "02",
    title: "Spawn Realistic Buyers",
    body: "Our AI generates buyers with real personalities, budgets, pain points, and objections. No scripts. No templates.",
    image: "/step-buyers.webp",
    side: "right" as const,
  },
  {
    number: "03",
    title: "Practice in the Fire",
    body: "Your reps face dynamic conversations that adapt in real-time. Pushback, stalls, curveballs. It's all fair game.",
    image: "/step-practice.webp",
    side: "left" as const,
  },
  {
    number: "04",
    title: "Get Battle-Tested Feedback",
    body: "After every call, reps get specific coaching on what they said, what they missed, and exactly how to improve.",
    image: "/step-analytics.webp",
    side: "right" as const,
  },
];

function StepCard({
  step,
  index,
}: {
  step: (typeof steps)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.3 });
  const isLeft = step.side === "left";

  return (
    <div ref={ref} className="relative grid md:grid-cols-2 gap-8 md:gap-16 items-center">
      {/* Timeline dot & line */}
      <div className="hidden md:block absolute left-1/2 top-0 -translate-x-1/2 h-full">
        <div className="relative h-full">
          {/* Line segment */}
          {index < steps.length - 1 && (
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isInView ? { scaleY: 1 } : {}}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-12 left-1/2 -translate-x-1/2 w-0.5 h-[calc(100%-48px)] bg-gradient-to-b from-brand-orange to-brand-amber origin-top"
            />
          )}
          {/* Number badge */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : {}}
            transition={{
              duration: 0.5,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className="sticky top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-brand-orange to-brand-amber flex items-center justify-center text-white font-mono font-bold text-sm shadow-glow z-10"
          >
            {step.number}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -40 : 40 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className={isLeft ? "md:order-1" : "md:order-2"}
      >
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-cream-deep">
          <img
            src={step.image}
            alt={`Step ${step.number}: ${step.body}`}
            className="w-full h-40 md:h-48 object-contain mb-6"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: isLeft ? 40 : -40 }}
        animate={isInView ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className={isLeft ? "md:order-2" : "md:order-1 md:text-right"}
      >
        <span className="text-brand-orange font-mono text-xs font-semibold tracking-wider mb-3 block md:hidden">
          STEP {step.number}
        </span>
        <h3 className="font-display text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-3">
          {step.title}
        </h3>
        <p className="text-[#5A5A5A] leading-relaxed max-w-[400px] md:max-w-none">
          {step.body}
        </p>
      </motion.div>
    </div>
  );
}

export default function HowItWorks() {
  const headerRef = useRef(null);
  const isHeaderInView = useInView(headerRef, { once: true, amount: 0.3 });

  return (
    <section id="how-it-works" aria-labelledby="how-it-works-heading" className="relative py-24 md:py-32 bg-cream bg-noise">
      <div className="max-w-[1200px] mx-auto px-6">
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-16 md:mb-24"
        >
          <span className="text-brand-orange text-xs font-mono font-medium tracking-widest uppercase mb-4 block">
            How PitchIQ Works
          </span>
          <h2 id="how-it-works-heading" className="font-display text-4xl md:text-5xl font-bold text-[#1A1A1A]">
            From First Login to First Closed Deal
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="space-y-16 md:space-y-24">
          {steps.map((step, i) => (
            <StepCard key={step.number} step={step} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

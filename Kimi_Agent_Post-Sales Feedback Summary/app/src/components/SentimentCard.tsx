import { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";

/* ─── Keyed Sentiment Card — prevents re-mount animation restart ─── */
export interface SentimentCardData {
  cardKey: string;
  label: string;
  beforeValue: number;
  afterValue: number;
  cycleDelay: number;
  barStart: number;
  animationsSkipped: boolean;
  textColor: string;
}

export default function SentimentCard({
  label,
  beforeValue,
  afterValue,
  cycleDelay,
  barStart,
  animationsSkipped,
  textColor,
}: SentimentCardData) {
  const width = useMotionValue(beforeValue);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) {
      if (animationsSkipped) width.set(afterValue);
      return;
    }
    ran.current = true;
    const controls = animate(width, afterValue, {
      delay: animationsSkipped ? 0 : barStart,
      duration: animationsSkipped ? 0.3 : 0.7,
      ease: [0.25, 0.46, 0.45, 0.94],
    });
    return controls.stop;
  }, [animationsSkipped]);

  const widthPct = useTransform(width, (v) => `${v}%`);
  const bg = useTransform(
    width,
    [0, 33, 50, 66, 100],
    [
      "rgba(248,113,113,0.75)",   // 0% pure red
      "rgba(251,146,60,0.75)",    // 33% red-orange
      "rgba(253,186,116,0.75)",   // 50% orange
      "rgba(163,230,53,0.75)",    // 66% yellow-green
      "rgba(74,222,128,0.75)",    // 100% green
    ]
  );

  return (
    <motion.div
      className={`flex flex-row sm:flex-col items-center gap-2 sm:gap-0 flex-1 rounded-2xl p-2 sm:p-3 bg-[#EDE8E0] border border-[#D8D2C8] ${textColor}`}
      initial={{ opacity: 0.2, scale: 1 }}
      animate={{
        opacity: animationsSkipped ? 1 : [0.2, 0.2, 0.2, 1, 1, 1, 1],
        scale: animationsSkipped ? 1 : [1, 1, 1, 1.05, 1.05, 1, 1],
      }}
      transition={{
        duration: animationsSkipped ? 0.25 : 1.7,
        times: animationsSkipped ? undefined : [0, 0.05, 0.10, 0.18, 0.70, 0.82, 1],
        delay: animationsSkipped ? 0 : cycleDelay,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <p className={`text-sm font-medium w-16 sm:w-auto text-left sm:text-center shrink-0 ${textColor} flex items-center gap-1`}>
        {label}
        {afterValue > beforeValue ? (
          <ArrowUp className="w-3.5 h-3.5 text-pitch-green" />
        ) : afterValue < beforeValue ? (
          <ArrowDown className="w-3.5 h-3.5 text-pitch-red" />
        ) : null}
      </p>

      <div className="flex-1 sm:flex-none sm:w-full h-2 rounded-full overflow-hidden relative sm:mt-2.5 bg-[#D8D2C8]/60">
        {/* Bar color changes in real-time as it moves */}
        <motion.div
          className="absolute top-0 bottom-0 rounded-full"
          style={{ width: widthPct, backgroundColor: bg }}
        />

        {/* Black line stays at the STARTING position */}
        <motion.div
          className="absolute top-0 bottom-0 w-[2px] bg-pitch-text z-20 rounded-full"
          style={{ left: `${beforeValue}%`, transform: "translateX(-50%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            delay: animationsSkipped ? 0 : cycleDelay,
            duration: 0.2,
          }}
        />
      </div>
    </motion.div>
  );
}

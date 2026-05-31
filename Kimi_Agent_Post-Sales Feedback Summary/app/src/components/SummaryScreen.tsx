import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  RotateCcw,
  TrendingUp,
  Volume2,
  Lightbulb,
  X,
} from "lucide-react";
import CircularGauge from "./CircularGauge";
import { notifyParent } from "../utils/parentMessaging";

interface SummaryScreenProps {
  onReview: () => void;
  onTryAgain?: () => void;
}

const HIGHLIGHTS = [
  { text: "Uncovered pain", type: "win" as const },
  { text: "Good pivot", type: "win" as const },
  { text: "Too brief", type: "miss" as const },
  { text: "Aim for 2min", type: "tip" as const },
];

const SENTIMENT_POINTS = [
  { x: 0, y: 50 },
  { x: 60, y: 48 },
  { x: 120, y: 55 },
  { x: 180, y: 68, label: "Led with features", sublabel: "Got rejected", type: "low" as const },
  { x: 240, y: 55 },
  { x: 300, y: 42 },
  { x: 360, y: 28, label: "Pivoted to Q4", sublabel: "Prospect opened up", type: "high" as const },
  { x: 420, y: 32 },
  { x: 460, y: 24, label: "Demo scheduled", type: "high" as const },
  { x: 500, y: 28 },
];

interface StatItem {
  value: string;
  verb: string;
  context: string | null;
  color: "green" | "orange" | "red" | "neutral";
}

const STATS: StatItem[] = [
  { value: "48s", verb: "Duration", context: "Aim for 2–5 min", color: "orange" },
  { value: "1", verb: "Pain found", context: "Go deeper", color: "green" },
  { value: "0/2", verb: "Objections handled", context: null, color: "red" },
  { value: "Tue 2pm", verb: "Demo scheduled", context: null, color: "green" },
];

const colorClasses = {
  green: "text-pitch-green",
  orange: "text-pitch-orange",
  red: "text-pitch-red",
  neutral: "text-pitch-tertiary",
};

export default function SummaryScreen({ onReview, onTryAgain }: SummaryScreenProps) {
  const [graphAnimated, setGraphAnimated] = useState(false);

  const pathD = SENTIMENT_POINTS.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ");
  const areaD = pathD + " L 500,90 L 0,90 Z";

  const chipMap = {
    win: "bg-pitch-green/10 border-pitch-green/20 text-pitch-green",
    miss: "bg-pitch-red/10 border-pitch-red/20 text-pitch-red",
    tip: "bg-pitch-orange/10 border-pitch-orange/20 text-pitch-orange",
  };

  const chipIcon = {
    win: <Check className="w-3 h-3" />,
    miss: <X className="w-3 h-3" />,
    tip: <Lightbulb className="w-3 h-3" />,
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Story Block 1: "How did I do?" */}
      <div className="text-center mb-8 sm:mb-10">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-pitch-text leading-tight"
        >
          Good effort, room to grow
        </motion.h1>
        {/* Score — THE HERO */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
          className="mt-6 sm:mt-8 flex flex-col items-center"
        >
          <div className="scale-90 sm:scale-100">
            <CircularGauge value={68} size={180} strokeWidth={12} />
          </div>
          <div className="mt-2 sm:mt-3">
            <p className="text-[10px] sm:text-[11px] font-bold text-pitch-tertiary uppercase tracking-[0.15em]">
              Readiness Score
            </p>
            <p className="text-[11px] sm:text-xs font-semibold text-pitch-green mt-1 flex items-center gap-1 justify-center">
              <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              +12 from last call
            </p>
          </div>
        </motion.div>

        {/* Stats — 2x2 grid on mobile, horizontal strip on desktop. Each stat is a sentence: value + verb + context */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-5 sm:mt-6 grid grid-cols-2 sm:flex sm:items-start sm:justify-center gap-2 sm:gap-5 md:gap-8"
        >
          {STATS.map((stat) => (
            <div key={stat.verb} className="text-center py-2 sm:py-0">
              <p className={`text-lg sm:text-xl font-bold ${colorClasses[stat.color]}`}>
                {stat.value}
              </p>
              <p className="text-[9px] sm:text-[10px] font-bold text-pitch-text uppercase tracking-wider mt-0.5">
                {stat.verb}
              </p>
              <p className="text-[9px] sm:text-[10px] text-pitch-tertiary mt-0.5">
                {stat.context || "\u00A0"}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Story Block 2: "What happened?" */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        onAnimationComplete={() => setGraphAnimated(true)}
        className="mb-6 sm:mb-8"
      >
        <div className="flex items-baseline justify-between mb-2 sm:mb-3">
          <p className="text-[10px] sm:text-[11px] font-bold text-pitch-tertiary uppercase tracking-[0.15em]">
            Sentiment
          </p>
        </div>

        <div className="bg-white border border-pitch-border rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-sm">
          <svg viewBox="0 0 500 100" className="w-full h-20 sm:h-28 md:h-36 overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="graphGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#E8892A" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#FF9F1C" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#E8892A" />
                <stop offset="100%" stopColor="#FF9F1C" />
              </linearGradient>
            </defs>

            {[22.5, 45, 67.5].map((y) => (
              <line key={y} x1="0" y1={y} x2="500" y2={y} stroke="#E0D8CE" strokeWidth="1" strokeDasharray="4 4" />
            ))}

            <motion.path d={areaD} fill="url(#graphGrad)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }} />

            <motion.path
              d={pathD}
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: graphAnimated ? 1 : 0 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
            />

            {SENTIMENT_POINTS.filter((p) => "type" in p).map((p) => (
              <g key={p.x}>
                <motion.circle
                  cx={p.x} cy={p.y} r={p.type === "high" ? 5 : 4}
                  fill="white"
                  stroke={p.type === "high" ? "#22A559" : "#D9382E"}
                  strokeWidth="2"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4 + p.x / 500, duration: 0.3 }}
                />
                <text x={p.x} y={p.y - (p.type === "high" ? 14 : -18)} textAnchor="middle" className="text-[9px] sm:text-[11px] fill-pitch-tertiary font-bold">
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </motion.div>

      {/* Story Block 3: "What matters?" */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.4 }}
        className="flex flex-wrap gap-2 mb-6 sm:mb-8 justify-center"
      >
        {HIGHLIGHTS.map((hl) => (
          <span
            key={hl.text}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border ${chipMap[hl.type]}`}
          >
            {chipIcon[hl.type]}
            {hl.text}
          </span>
        ))}
      </motion.div>

      {/* Story Block 4: "What do I do now?" */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.4 }}
        className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 mb-10 sm:mb-12"
      >
        <button
          onClick={onReview}
          className="inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3 sm:py-3.5 bg-pitch-orange text-white rounded-xl font-semibold text-sm hover:bg-pitch-orange/90 transition-smooth shadow-sm hover:shadow-md hover:-translate-y-0.5"
        >
          <Volume2 className="w-4 h-4" />
          Review Coaching Moments
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onTryAgain || (() => notifyParent('try-again'))}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-pitch-tertiary hover:text-pitch-orange transition-smooth rounded-xl hover:bg-pitch-muted/50"
        >
          <RotateCcw className="w-4 h-4" />
          Try Another Call
        </button>
      </motion.div>
    </div>
  );
}

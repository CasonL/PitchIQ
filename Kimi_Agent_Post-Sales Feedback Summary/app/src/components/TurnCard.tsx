import { motion } from "framer-motion";
import { Volume2, User, Bot } from "lucide-react";
import { useState } from "react";
import Waveform from "./Waveform";

interface TurnCardProps {
  speaker: "ai" | "user";
  text: string;
  label?: string;
  showWaveform?: boolean;
  delay?: number;
}

export default function TurnCard({ speaker, text, label, showWaveform = false, delay = 0 }: TurnCardProps) {
  const [playing, setPlaying] = useState(false);
  const isAI = speaker === "ai";

  const handlePlay = () => {
    if (playing) return;
    setPlaying(true);
    setTimeout(() => setPlaying(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.4, 0, 0.2, 1] }}
      className={`flex gap-3 p-4 rounded-xl transition-smooth hover:-translate-y-0.5 ${
        isAI
          ? "bg-pitch-muted border-l-4 border-pitch-orange"
          : "bg-pitch-green-light border-l-4 border-pitch-green"
      }`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isAI ? "bg-pitch-orange-light" : "bg-white"
        }`}
      >
        {isAI ? (
          <Bot className="w-4 h-4 text-pitch-orange" />
        ) : (
          <User className="w-4 h-4 text-pitch-green" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-pitch-tertiary uppercase tracking-wide">
            {label || (isAI ? "AI Buyer" : "You")}
          </span>
          {showWaveform && (
            <Waveform active={playing} color={isAI ? "orange" : "green"} barCount={8} />
          )}
        </div>
        <p className="text-sm text-pitch-text leading-relaxed">{text}</p>
      </div>

      <button
        onClick={handlePlay}
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-smooth ${
          playing
            ? "bg-pitch-orange text-white"
            : "bg-white text-pitch-secondary hover:text-pitch-orange hover:shadow-md"
        }`}
      >
        <Volume2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

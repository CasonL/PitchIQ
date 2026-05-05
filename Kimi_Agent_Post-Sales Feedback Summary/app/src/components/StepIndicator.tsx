import { Check, Lock } from "lucide-react";

interface StepIndicatorProps {
  number: number;
  title: string;
  status: "complete" | "current" | "locked";
}

export default function StepIndicator({ number, title, status }: StepIndicatorProps) {
  const isComplete = status === "complete";
  const isCurrent = status === "current";
  const isLocked = status === "locked";

  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-smooth ${
          isComplete
            ? "bg-pitch-green text-white"
            : isCurrent
            ? "bg-white border-2 border-pitch-orange text-pitch-orange animate-pulse-ring"
            : "bg-pitch-muted text-pitch-tertiary"
        }`}
      >
        {isComplete ? (
          <Check className="w-4 h-4" />
        ) : isLocked ? (
          <Lock className="w-3.5 h-3.5" />
        ) : (
          number
        )}
      </div>

      <span
        className={`text-sm font-medium transition-smooth ${
          isComplete
            ? "text-pitch-green line-through decoration-pitch-green/40"
            : isCurrent
            ? "text-pitch-text"
            : "text-pitch-tertiary"
        }`}
      >
        {title}
      </span>

      {isCurrent && (
        <div className="ml-auto w-2 h-2 rounded-full bg-pitch-orange animate-glow-pulse" />
      )}
    </div>
  );
}

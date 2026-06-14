import { useEffect, useRef, useState } from "react";

interface CircularGaugeProps {
  value: number;
  startValue?: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  duration?: number;
  delay?: number;
  textColor?: string;
}

export default function CircularGauge({
  value,
  startValue = 0,
  max = 100,
  size = 160,
  strokeWidth = 10,
  color = "#E8892A",
  trackColor = "#E0D8CE",
  duration = 1500,
  delay = 400,
  textColor = "#E8892A",
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Single progress state drives both number and stroke — truly connected
  const [progress, setProgress] = useState(0);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const animate = (timestamp: number) => {
      const elapsed = timestamp - start - delay;
      const p = Math.min(Math.max(elapsed / duration, 0), 1);
      // Ease-out cubic — gentler landing, less steep than ease-in-out
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p < 1) {
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [value, startValue, max, duration, delay]);

  // Derived directly from shared progress — no separate state, no rounding disconnect
  const currentValue = Math.round(startValue + progress * (value - startValue));
  const startFraction = startValue / max;
  const endFraction = value / max;
  const currentFraction = startFraction + progress * (endFraction - startFraction);
  const currentOffset = circumference - currentFraction * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={currentOffset}
          className="gauge-circle"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="font-display text-5xl font-bold tabular-nums"
          style={{ color: textColor }}
        >
          {currentValue}
        </span>
      </div>
    </div>
  );
}

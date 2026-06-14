interface WaveformProps {
  active?: boolean;
  color?: "orange" | "green";
  barCount?: number;
}

export default function Waveform({ active = true, color = "orange", barCount = 12 }: WaveformProps) {
  const colorClass = color === "orange" ? "bg-pitch-orange" : "bg-pitch-green";

  return (
    <div className="flex items-center gap-[3px] h-6">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${colorClass} waveform-bar ${active ? "animate-waveform" : ""}`}
          style={{
            height: active ? undefined : "4px",
            animationDelay: active ? `${i * 60}ms` : undefined,
            animationPlayState: active ? "running" : "paused",
          }}
        />
      ))}
    </div>
  );
}

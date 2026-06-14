import { MOMENTS, type MomentData } from "./momentsData";

interface TimelineHeaderProps {
  currentMoment: number;
  onChangeMoment: (index: number) => void;
  onResetState: () => void;
}

export default function TimelineHeader({ currentMoment, onChangeMoment, onResetState }: TimelineHeaderProps) {
  const totalMoments = MOMENTS.length;

  const dotColor = (type: MomentData["type"], active: boolean) => {
    if (!active) return "bg-pitch-muted text-pitch-tertiary";
    switch (type) {
      case "mistake": return "bg-pitch-red text-white";
      case "turning": return "bg-[#2563EB] text-white";
      case "win": return "bg-pitch-green text-white";
    }
  };

  const segmentColor = (type: MomentData["type"]) => {
    switch (type) {
      case "mistake": return "bg-pitch-red";
      case "turning": return "bg-[#2563EB]";
      case "win": return "bg-pitch-green";
    }
  };

  return (
    <div className="pt-4 pb-2">
      <div className="flex items-center justify-center gap-0">
        {MOMENTS.map((m, i) => (
          <div key={m.id} className="flex items-center">
            {i > 0 && (
              <div className={`w-6 sm:w-10 h-[2px] ${i <= currentMoment ? segmentColor(MOMENTS[i - 1].type) : "bg-pitch-border"}`} />
            )}
            <button
              onClick={() => { onChangeMoment(i); onResetState(); }}
              className={`flex flex-col items-center mx-1 transition-smooth ${
                i === currentMoment ? "scale-110" : "hover:scale-105 opacity-60"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-pitch-cream shadow-sm ${
                  dotColor(m.type, i === currentMoment)
                }`}
              >
                {m.id}
              </div>
            </button>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-semibold text-pitch-tertiary uppercase tracking-widest text-center mt-2">
        Moment {currentMoment + 1} of {totalMoments}
      </p>
    </div>
  );
}

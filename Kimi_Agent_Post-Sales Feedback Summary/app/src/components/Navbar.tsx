import { ArrowLeft, RotateCcw, LogIn } from "lucide-react";

interface NavbarProps {
  activeTab: "summary" | "timeline" | "completion";
  onTabChange: (tab: "summary" | "timeline" | "completion") => void;
}

export default function Navbar({ activeTab, onTabChange }: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 h-16 bg-pitch-cream/80 backdrop-blur-xl border-b border-pitch-border">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        {/* Left: Back or Exit */}
        {activeTab === "summary" ? (
          <button className="flex items-center gap-1.5 text-sm text-pitch-secondary hover:text-pitch-orange transition-smooth">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        ) : (
          <button
            onClick={() => onTabChange("summary")}
            className="flex items-center gap-1.5 text-sm text-pitch-secondary hover:text-pitch-orange transition-smooth"
          >
            <ArrowLeft className="w-4 h-4" />
            Summary
          </button>
        )}

        {/* Center: Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/logo-fox.png" alt="PitchIQ" className="w-7 h-7 object-contain" />
          <span className="text-base font-bold text-pitch-text tracking-tight">PitchIQ</span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-pitch-secondary border border-pitch-border hover:bg-pitch-muted transition-smooth">
            <RotateCcw className="w-3.5 h-3.5" />
            Try Again
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-pitch-orange hover:bg-pitch-orange/90 transition-smooth shadow-sm">
            <LogIn className="w-3.5 h-3.5" />
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  );
}

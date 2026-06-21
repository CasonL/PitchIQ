import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Play, Volume2 } from "lucide-react";
import Waveform from "./Waveform";
import { type MomentData } from "./momentsData";

interface TranscriptSectionProps {
  moment: MomentData;
  currentMoment: number;
  onShowCoaching: () => void;
}

export default function TranscriptSection({ moment, currentMoment, onShowCoaching }: TranscriptSectionProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);

  const handlePlay = () => {
    if (playingAudio) return;
    setPlayingAudio(true);
    setTimeout(() => onShowCoaching(), 1200);
    setTimeout(() => setPlayingAudio(false), 3000);
  };

  const toggleTranscript = () => {
    setTranscriptOpen(p => !p);
    setTimeout(() => onShowCoaching(), 1200);
  };

  const getHeaderText = () => {
    if (moment.label) return moment.label;
    if (currentMoment === 0) return "First major moment";
    if (currentMoment === 1) return "Turning point";
    return "Closing moment";
  };

  return (
    <>
      {/* Number header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        className="text-center pt-4 sm:pt-6 pb-6"
      >
        <span className="font-display text-5xl sm:text-6xl font-bold text-pitch-text">
          {currentMoment + 1}
        </span>
        <p className="text-lg sm:text-xl font-semibold text-pitch-text mt-1">
          {getHeaderText()}
        </p>
        <p className="text-xs text-pitch-tertiary mt-1 font-mono">{moment.type} · {moment.time}</p>
      </motion.div>

      {/* Play button */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="flex justify-center py-6"
      >
        <button
          onClick={handlePlay}
          className="w-14 h-14 rounded-full flex items-center justify-center bg-pitch-orange text-white shadow-sm hover:scale-105 active:scale-95 transition-smooth"
        >
          {playingAudio ? <Volume2 className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
      </motion.div>

      {/* Waveform */}
      <AnimatePresence>
        {playingAudio && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden flex justify-center pb-4"
          >
            <Waveform active color="orange" barCount={18} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="flex flex-col items-center py-2"
      >
        <button
          onClick={toggleTranscript}
          className="flex flex-col items-center gap-1 text-pitch-secondary hover:text-pitch-orange transition-smooth"
        >
          <span className="text-xs font-normal tracking-wide">Transcript</span>
          {transcriptOpen ? <ChevronUp className="w-3.5 h-3.5 text-pitch-orange" /> : <ChevronDown className="w-3.5 h-3.5 text-pitch-orange" />}
        </button>
        <AnimatePresence>
          {transcriptOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden w-full"
            >
              <div className="pt-5 space-y-3 text-left">
                {/* Context line for moments that need it */}
                {currentMoment === 0 && (
                  <div className="border-l-[3px] border-l-pitch-tertiary pl-3 py-1">
                    <p className="text-[10px] font-bold text-pitch-tertiary uppercase tracking-wider mb-1">Context</p>
                    <p className="text-sm text-pitch-text leading-relaxed">{moment.beforeContext || moment.youSaid || "Call context not available"}</p>
                  </div>
                )}
                {currentMoment === 1 && (
                  <div className="border-l-[3px] border-l-pitch-orange pl-3 py-1">
                    <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">Marcus</p>
                    <p className="text-sm text-pitch-text leading-relaxed">{moment.beforeContext || ""}</p>
                  </div>
                )}

                {moment.prospectFinal ? (
                  <>
                    {/* Moment 3: Marcus asks → You answer → Marcus commits */}
                    <div className="border-l-[3px] border-l-pitch-orange pl-3 py-1">
                      <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">Marcus</p>
                      <p className="text-sm text-pitch-text leading-relaxed">{moment.prospectSaid}</p>
                    </div>
                    <div className="border-l-[3px] border-l-[#2563EB] pl-3 py-1">
                      <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider mb-1">You</p>
                      <p className="text-sm text-pitch-text leading-relaxed">{moment.youSaid}</p>
                    </div>
                    <div className="border-l-[3px] border-l-pitch-orange pl-3 py-1">
                      <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">Marcus</p>
                      <p className="text-sm text-pitch-text leading-relaxed">{moment.prospectFinal}</p>
                      <p className="text-[10px] text-pitch-tertiary mt-1 italic">Tone: {moment.prospectTone} · Talk ratio: {moment.talkRatio}</p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Moments 1-2: You speak → Marcus responds */}
                    <div className="border-l-[3px] border-l-[#2563EB] pl-3 py-1">
                      <p className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider mb-1">You</p>
                      <p className="text-sm text-pitch-text leading-relaxed">{moment.youSaid}</p>
                    </div>
                    <div className="border-l-[3px] border-l-pitch-orange pl-3 py-1">
                      <p className="text-[10px] font-bold text-pitch-orange uppercase tracking-wider mb-1">Marcus</p>
                      <p className="text-sm text-pitch-text leading-relaxed">{moment.prospectSaid}</p>
                      <p className="text-[10px] text-pitch-tertiary mt-1 italic">Tone: {moment.prospectTone} · Talk ratio: {moment.talkRatio}</p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="h-px bg-pitch-border" />
    </>
  );
}

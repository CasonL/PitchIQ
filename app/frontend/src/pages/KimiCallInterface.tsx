/**
 * KimiCallInterface.tsx
 * Kimi's beautiful call UI wired to real backend AI
 * Uses useMarcusVoice hook for actual voice interaction
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { PhoneOff, Volume2, Mic } from "lucide-react";
import { useMarcusVoice } from "../components/voice/charmer/MarcusVoiceAdapter";
import { MarcusScenario } from "../components/voice/charmer/MarcusScenarios";

interface Message {
  id: number;
  sender: "marcus" | "user";
  text: string;
}

interface KimiCallInterfaceProps {
  scenario: MarcusScenario;
  onCallEnd: () => void;
}

function AudioWaveform({ active }: { active: boolean }) {
  return (
    <div className="flex items-end justify-center gap-[3px] h-14">
      {[...Array(24)].map((_, i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-brand-orange"
          animate={
            active
              ? {
                  height: [6, 12 + Math.sin(i * 0.7) * 18, 8, 22 + Math.cos(i * 1.1) * 14, 6],
                }
              : { height: 4 }
          }
          transition={
            active
              ? {
                  duration: 0.5 + Math.random() * 0.3,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                  delay: i * 0.02,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

export function KimiCallInterface({ scenario, onCallEnd }: KimiCallInterfaceProps) {
  const {
    startCall,
    endCall,
    isConnected,
    isConnecting,
    transcript,
    isFinalTranscript,
    error,
    isSpeaking,
  } = useMarcusVoice();

  const [messages, setMessages] = useState<Message[]>([]);
  const [marcusSpeaking, setMarcusSpeaking] = useState(false);

  // Start call when component mounts
  useEffect(() => {
    console.log('🎬 Starting call for scenario:', scenario.name);
    startCall();
    
    return () => {
      console.log('🛑 Cleaning up call');
      endCall();
    };
  }, []);

  // Track Marcus speaking state
  useEffect(() => {
    setMarcusSpeaking(isSpeaking);
  }, [isSpeaking]);

  // Handle transcript updates
  useEffect(() => {
    if (transcript && isFinalTranscript) {
      console.log('📝 Final transcript:', transcript);
      // Add user message
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: "user",
        text: transcript
      }]);
    }
  }, [transcript, isFinalTranscript]);

  const handleEndCall = async () => {
    await endCall();
    onCallEnd();
  };

  return (
    <div className="min-h-[calc(100vh-56px)] flex flex-col lg:flex-row">
      {/* Left: Call Stage */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#F8F7F5]">
        <div className="w-full max-w-[400px]">
          {/* Avatar */}
          <motion.div
            animate={marcusSpeaking ? { scale: [1, 1.02, 1] } : { scale: 1 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="mb-6 flex justify-center"
          >
            <img
              src="/marcus-avatar.webp"
              alt="Marcus Stindle"
              className="w-36 h-36 rounded-2xl object-cover shadow-xl shadow-brand-orange/10"
            />
          </motion.div>

          {/* Name */}
          <div className="text-center mb-4">
            <h2 className="font-display text-2xl font-bold text-[#1A1A1A]">Marcus Stindle</h2>
            <p className="text-brand-orange font-medium text-sm mt-0.5">CFO, VantageFlow</p>
          </div>

          {/* Waveform */}
          <div className="mb-4">
            <AudioWaveform active={marcusSpeaking} />
          </div>

          {/* Status */}
          <p className="text-center text-[#8A8A8A] text-xs font-mono tracking-wider uppercase mb-8">
            {isConnecting
              ? "Connecting..."
              : marcusSpeaking
              ? "Marcus is speaking..."
              : isConnected
              ? "Your turn"
              : "Connecting..."}
          </p>

          {/* Call Controls */}
          <div className="flex items-center justify-center gap-6">
            <button className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#8A8A8A] hover:bg-gray-50 transition-colors shadow-sm">
              <Volume2 size={18} />
            </button>
            <button
              onClick={handleEndCall}
              className="w-14 h-14 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors"
            >
              <PhoneOff size={22} />
            </button>
            <button className="w-11 h-11 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#8A8A8A] hover:bg-gray-50 transition-colors shadow-sm">
              <Mic size={18} />
            </button>
          </div>

          {/* Error display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-900">Error: {error.message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Transcript */}
      <div className="flex-1 bg-white lg:border-l border-gray-100 flex flex-col min-h-[50vh] lg:min-h-0">
        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          <h3 className="text-xs font-mono font-semibold text-[#8A8A8A] tracking-wider uppercase mb-4">
            Transcript
          </h3>
          <div className="space-y-4">
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3"
              >
                <span
                  className={`text-xs font-mono font-bold shrink-0 mt-0.5 ${
                    msg.sender === "marcus" ? "text-brand-orange" : "text-brand-amber"
                  }`}
                >
                  {msg.sender === "marcus" ? "MARCUS" : "YOU"}
                </span>
                <p className="text-[#1A1A1A] text-sm leading-relaxed">{msg.text}</p>
              </motion.div>
            ))}
            {marcusSpeaking && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3"
              >
                <span className="text-xs font-mono font-bold text-brand-orange">MARCUS</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-orange/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-brand-orange/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-brand-orange/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Live transcript preview */}
        {!isFinalTranscript && transcript && (
          <div className="border-t border-gray-100 p-6 lg:p-8 bg-gray-50/50">
            <p className="text-xs font-mono font-semibold text-[#8A8A8A] tracking-wider uppercase mb-3">
              You're saying...
            </p>
            <p className="text-[#1A1A1A] text-sm italic opacity-60">{transcript}</p>
          </div>
        )}
      </div>
    </div>
  );
}

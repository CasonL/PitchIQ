import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { playHaptic } from "@/utils/haptics";
import { useSamCoachAgent } from "./samcoach/useSamCoachAgent";
import PersonaGenerationCard from "./PersonaGenerationCard";
import { useSamScoring } from "@/hooks/useSamScoring";
import { useToast } from "@/hooks/use-toast";
import { useSimpleLog } from "@/hooks/useSimpleLog";
import { sanitizeGreeting } from "@/utils/deepgramSanitizer";
import { createClient } from "@deepgram/sdk";

// Polyfill: DG browser SDK expects Node.Buffer in the global scope
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

const MIC_RATE = 48000; // Browser native rate
const TTS_RATE = 48000; // Keep aligned
const KEEPALIVE_MS = 8000; // ping to keep WS alive
const PACING_DELAY_MS = 4000; // Static 4s delay for coach pacing

// Global counter to track component instances
let componentInstanceCount = 0;
let globalSessionActive = false;

interface DeepgramAgent {
  configure: (settings: any) => void;
  start: () => void;
  send: (data: ArrayBuffer) => void;
  keepAlive: () => void;
  finish: () => void;
  close: () => void;
  on: (event: string, callback: (data?: any) => void) => void;
}

interface DeepgramClient {
  agent: () => DeepgramAgent;
}

interface SamCoachAgentProps {
  onDataCollected?: (data: { product_service: string; target_market: string }) => void;
  onConnectionStateChange?: (state: { connected: boolean; connecting: boolean }) => void;
  autoStart?: boolean;
}

const SamCoachAgent: React.FC<SamCoachAgentProps> = ({ onDataCollected, onConnectionStateChange, autoStart }) => {
  /* ───────── state */
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sessionEnded, setSessionEnded] = useState(true); // Start as ended to show clean initial state
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [instanceId] = useState(() => {
    componentInstanceCount++;
    return componentInstanceCount;
  });
  
  /* ───────── refs */
  const dgRef = useRef<any>(null);
  const agentRef = useRef<any>(null);
  const micStream = useRef<MediaStream | null>(null);
  const micCtx = useRef<AudioContext | null>(null);
  const micNode = useRef<AudioWorkletNode | null>(null);
  const spkCtx = useRef<AudioContext | null>(null);
  const playHead = useRef<number>(0);
  const pingId = useRef<number | null>(null);
  const sdkInitialized = useRef<boolean>(false);
  const autoStarted = useRef<boolean>(false);
  const inactivityTimer = useRef<number | null>(null);
  const mutedRef = useRef<boolean>(false);
  const conversationHistoryRef = useRef<string[]>([]);
  const productServiceRef = useRef<string>("");
  const targetMarketRef = useRef<string>("");
  const lastSpeakerRef = useRef<"user" | "ai" | null>(null);
  const lastSettingsRef = useRef<any>(null);
  const firstSpeakTimer = useRef<number | null>(null);
  const firstSpeakHeardRef = useRef<boolean>(false);
  const greetingNudgeSentRef = useRef<boolean>(false);
  const awaitingFirstAgentChunkRef = useRef<boolean>(false);
  // Prospect scoring for SamCoach
  const { start: startScoring, stop: stopScoring, setSpeaker, record: recordScoringMessage } = useSamScoring();
  // Persona generation UI
  const [showPersonaGen, setShowPersonaGen] = useState(false);
  const [userProductInfo, setUserProductInfo] = useState<{ product: string; target_market: string }>({ product: "", target_market: "" });

  const { toast } = useToast();
  const { messages, log, clearMessages } = useSimpleLog(`SamCoach#${instanceId}`);

  // Minimal sanitized greeting used only after Settings are applied
  const greetingHello = React.useMemo(
    () =>
      sanitizeGreeting(
        "Hey there! I'm Sam, your sales training assistant! Welcome to PitchIQ's Demo!!! I'm going to ask you a few questions about what you sell, then I'll create an extremely nuanced persona for you to try to sell to. To start, what do you sell?"
      ),
    []
  );

  /* ───────── token initialization */
  useEffect(() => {
    log(`🏗️ Component instance #${instanceId} mounted (total: ${componentInstanceCount})`);
    
    if (sdkInitialized.current) return;
    
    (async () => {
      try {
        log("🔧 Fetching DG token …");
        const res = await fetch("/api/deepgram/token", { credentials: "include" });
        const data = await res.json();
        const token = data?.token || data?.key;
        if (!token) {
          log("❌ No Deepgram token found in response");
          setInitializing(false);
          return;
        }
        const source = data?.token ? "token" : data?.key ? "key" : "unknown";
        log(`🔐 Deepgram token received (field: ${source}, length: ${String(token).length})`);
        dgRef.current = createClient(token);
        sdkInitialized.current = true;
        log("✅ SDK ready");
        setInitializing(false);
        
        // Auto-start session after SDK is ready
        if (!autoStarted.current && !connecting && !connected) {
          autoStarted.current = true;
          setTimeout(() => {
            if (!connecting && !connected) {
              startSession();
            }
          }, 500); // Small delay to ensure everything is ready
        }
      } catch (e) {
        log(`❌ token – ${e}`);
      }
    })();
  }, [log, instanceId]);

  /* ───────── session management */
  const startSession = useCallback(async () => {
    log("▶️ startSession invoked");
    
    // Strong session lock check - prevent any overlapping sessions
    if (connecting || connected || globalSessionActive) {
      log("⚠️ Session already active or connecting, skipping");
      return;
    }
    if (!dgRef.current) {
      log("🚫 Deepgram SDK not ready yet");
      return;
    }
    
    // Immediate global lock to prevent race conditions
    globalSessionActive = true;
    log(`🔒 Global session lock acquired by instance #${instanceId}`);
    
    // Double-check after acquiring lock
    if (connecting || connected) {
      log("⚠️ Another session started while acquiring lock, releasing and aborting");
      globalSessionActive = false;
      return;
    }
    
    // Force cleanup any existing agent
    if (agentRef.current) {
      log("⚠️ Agent already exists, cleaning up first");
      try {
        agentRef.current?.finish?.();
        agentRef.current?.close?.();
      } catch (e) {
        log(`⚠️ Error cleaning up existing agent: ${e}`);
};

// ... rest of the code remains the same ...
  const initSpeaker = () => {
    spkCtx.current = new AudioContext({ sampleRate: TTS_RATE });
    playHead.current = 0;
  };

  // Ensure the speaker AudioContext exists and is runnable
  const ensureSpeakerReady = async (): Promise<boolean> => {
    let ctx = spkCtx.current;
    if (!ctx || ctx.state === "closed") {
      try {
        spkCtx.current = new AudioContext({ sampleRate: TTS_RATE });
        playHead.current = 0;
        ctx = spkCtx.current;
        log("🔈 Created new speaker AudioContext");
      } catch (e) {
        log(`❌ Failed to create speaker AudioContext: ${e}`);
        return false;
      }
    }

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
        log("✅ Resumed suspended speaker AudioContext");
      } catch (e) {
        log(`❌ Failed to resume speaker AudioContext: ${e}`);
        return false;
      }
    }
    return true;
  };

  const playTTS = (payload: any) => {
    if (!spkCtx.current) {
      log("❌ No speaker context for TTS playback");
      return;
    }

    // Check if audio context is closed - don't try to play audio
    if (spkCtx.current.state === "closed") {
      log("⚠️ Audio context is closed, skipping TTS playback");
      return;
    }

    // 1️⃣ Normalize to ArrayBuffer - handle Uint8Array, Buffer, etc.
    const pcmBuf: ArrayBuffer | undefined =
      payload instanceof ArrayBuffer     ? payload :
      ArrayBuffer.isView(payload)        ? payload.buffer :
      ArrayBuffer.isView(payload?.audio) ? payload.audio.buffer :
      undefined;

    if (!pcmBuf?.byteLength) {
      log("❌ Empty or invalid audio payload");
      return;
    }

    log(`🔉 DG audio ${pcmBuf.byteLength / 2} samples (${pcmBuf.byteLength} bytes)`);
    
    // Check if audio context is suspended
    if (spkCtx.current.state === "suspended") {
      log("🔊 Resuming suspended audio context...");
      spkCtx.current.resume().then(() => {
        log("✅ Audio context resumed");
      }).catch((err) => {
        log(`❌ Failed to resume audio context: ${err}`);
      });
    }
    
    try {
      // 2️⃣ Convert Int16 → Float32 and schedule playback
      const i16 = new Int16Array(pcmBuf);
      const f32 = Float32Array.from(i16, (v) => v / 32768);
      const buf = spkCtx.current.createBuffer(1, f32.length, TTS_RATE);
      buf.copyToChannel(f32, 0);

      const src = spkCtx.current.createBufferSource();
      src.buffer = buf;
      src.connect(spkCtx.current.destination);

      const startAt = Math.max(playHead.current, spkCtx.current.currentTime + 0.02);
      src.start(startAt);
      playHead.current = startAt + buf.duration;
      
      log(`🔊 Scheduled TTS playback: ${buf.duration.toFixed(2)}s at ${startAt.toFixed(2)}s`);
      
      // Add event listeners to track playback
      src.onended = () => log("🔊 TTS playback completed");
      
    } catch (error) {
      log(`❌ TTS playback failed: ${error}`);
    }
  };

  /* ───────── cleanup */
  const cleanup = () => {
    micStream.current?.getTracks().forEach((t) => t.stop());
    micNode.current?.disconnect();
    // End Sam's scoring session if active
    try { stopScoring(); } catch {}
    
    // Only close audio contexts if they're not already closed
    if (micCtx.current && micCtx.current.state !== "closed") {
      micCtx.current.close().catch((e) => log(`⚠️ Error closing mic context: ${e}`));
    }
    if (spkCtx.current && spkCtx.current.state !== "closed") {
      spkCtx.current.close().catch((e) => log(`⚠️ Error closing speaker context: ${e}`));
    }
    
    if (pingId.current) clearInterval(pingId.current);
    
    // Clear inactivity timer
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    
    // Release global lock
    globalSessionActive = false;
    log(`🔓 Global session lock released by instance #${instanceId}`);
    
    setConnected(false);
    setConnecting(false);
  };

  const stopSession = useCallback(() => {
    log("🛑 Stopping session...");
    
    // Set session ended immediately to stop processing new audio
    setSessionEnded(true);
    setConnected(false);
    setConnecting(false);
    setInactivityWarning(false);
    // Stop scoring session proactively
    try { stopScoring(); } catch {}
    
    // Clear inactivity timer
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }
    
    // Clean up agent first
    if (agentRef.current) {
      try {
        agentRef.current?.finish?.();
        agentRef.current?.close?.();
      } catch (e) {
        log(`⚠️ Error stopping agent: ${e}`);
      }
      agentRef.current = null;
    }
    
    cleanup();
  }, [log]);

  const restartSession = useCallback(() => {
    if (connecting || connected) {
      log("⚠️ Session already active, cannot restart");
      return;
    }
    
    log("🔄 Restarting session...");
    setSessionEnded(false);
    setTranscript("");
    setMuted(false); // Reset mute state
    mutedRef.current = false; // Reset mute ref
    setInactivityWarning(false); // Reset warning state
    setInitializing(false); // Make sure we're not in initializing state
    autoStarted.current = false; // Reset auto-start flag
    
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      if (!connecting && !connected) {
        startSession();
      }
    }, 500);
  }, [log, startSession, connecting, connected]);

  const toggleMute = useCallback(() => {
    setMuted(prev => {
      const newMuted = !prev;
      mutedRef.current = newMuted; // Update ref immediately
      log(`🎤 ${newMuted ? 'Muted' : 'Unmuted'} microphone (instance #${instanceId})`);
      playHaptic("light");
      return newMuted;
    });
  }, [log, instanceId]);

  // Reset inactivity timer
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    
    // Clear warning state
    setInactivityWarning(false);
    
    // Set warning at 45 seconds (15 seconds before timeout)
    setTimeout(() => {
      if (connected && !sessionEnded) {
        setInactivityWarning(true);
        log("⚠️ 15 seconds until session timeout due to inactivity");
      }
    }, 45000);
    
    inactivityTimer.current = window.setTimeout(() => {
      log("⏰ No speech activity for 1 minute - terminating session");
      stopSession();
    }, 60000); // 1 minute = 60,000ms
  }, [log, stopSession, connected, sessionEnded]);

  // Start inactivity timer when session becomes active
  const startInactivityTimer = useCallback(() => {
    log("⏰ Starting inactivity timer (1 minute)");
    resetInactivityTimer();
  }, [log, resetInactivityTimer]);

  const handleToggleSession = () => {
    playHaptic("medium");
    if (connected || connecting) {
      stopSession();
    } else {
      startSession();
    }
  };

  useEffect(() => {
    return () => {
      componentInstanceCount--;
      log(`🧹 Component instance #${instanceId} unmounting (remaining: ${componentInstanceCount})`);
      
      // Force immediate cleanup to prevent overlapping sessions
      if (agentRef.current) {
        try {
          agentRef.current?.finish?.();
          agentRef.current?.close?.();
        } catch (e) {
          log(`⚠️ Error during unmount cleanup: ${e}`);
        }
        agentRef.current = null;
      }
      
      // Force release global lock
      globalSessionActive = false;
      log(`🔓 Global session lock released by instance #${instanceId}`);
      
      stopSession();
    };
  }, [stopSession, log, instanceId]);

  const isSessionActive = connected || connecting;

  return (
    <div className="flex flex-col items-center justify-center h-full w-full p-4">
      {showPersonaGen ? (
        <div className="w-full max-w-md p-6 bg-white border border-gray-900 rounded-xl shadow-lg">
          <PersonaGenerationCard
            userProductInfo={userProductInfo}
            autoStart={true}
            onPersonaGenerated={(persona) => {
              log(`🎉 Persona generated: ${persona.name}`);
              setShowPersonaGen(false);
              // Optionally, could navigate or trigger next UI step here
            }}
            onError={(err) => {
              log(`❌ Persona generation error: ${err}`);
              setShowPersonaGen(false);
            }}
          />
        </div>
      ) : (
      <div className="w-full max-w-md p-6 bg-white border border-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
        {/* Clean UI - just the card with end call button */}
        {/* Connection Status Indicator */}
        <div className="flex items-center justify-center mb-6">
          <div className="flex items-center space-x-2">
            {initializing ? (
              <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <div
                  className={`w-3 h-3 rounded-full ${
                    connected ? "bg-green-500" : connecting ? "bg-yellow-500 animate-pulse" : sessionEnded ? "bg-gray-400" : "bg-red-500"
                  }`}
                />
                <span className="text-sm font-medium text-gray-600">
                  {connected ? (muted ? "Connected (Muted)" : "Connected") : connecting ? "Connecting..." : sessionEnded ? "Session Ended" : "Disconnected"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Inactivity Warning */}
        {inactivityWarning && connected && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-orange-700 font-medium">
                Session will end in 15 seconds due to inactivity
              </span>
            </div>
          </div>
        )}

        {/* Transcript Display */}
        {transcript && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{transcript}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center items-center space-x-3">
          {!initializing && !sessionEnded ? (
            <>
              {/* Mute Button */}
              <Button 
                onClick={toggleMute}
                size="sm"
                className={`w-10 h-10 p-0 rounded-xl border border-gray-900 font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg ${
                  muted 
                    ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                    : 'bg-white hover:bg-gray-100 text-black'
                }`}
                disabled={!isSessionActive}
                title={muted ? "Unmute" : "Mute"}
              >
                {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              
              {/* End Call Button */}
              <Button 
                onClick={() => {
                  playHaptic("medium");
                  stopSession();
                }}
                size="lg"
                className="px-8 py-3 bg-white hover:bg-red-100 text-black border border-gray-900 rounded-xl font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
                disabled={!isSessionActive}
              >
                End Call
              </Button>
            </>
          ) : sessionEnded && !initializing ? (
            <Button 
              onClick={() => {
                playHaptic("medium");
                restartSession();
              }}
              size="lg"
              className="px-8 py-3 bg-white hover:bg-blue-100 text-black border border-gray-900 rounded-xl font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
            >
              Start Again
            </Button>
          ) : null}
        </div>
      </div>
      )}
    </div>
  );
};

export default SamCoachAgent;
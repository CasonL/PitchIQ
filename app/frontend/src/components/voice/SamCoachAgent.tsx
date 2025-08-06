import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createClient, AgentEvents } from "@deepgram/sdk";
import { Buffer } from "buffer";
import { useSimpleLog } from "@/hooks/useSimpleLog";
import { playHaptic } from "@/utils/haptics";
import { Mic, MicOff } from "lucide-react";

// Polyfill: DG browser SDK expects Node.Buffer in the global scope
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

const MIC_RATE = 48000; // Browser native rate
const TTS_RATE = 48000; // Keep aligned
const KEEPALIVE_MS = 8000; // ping to keep WS alive

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

  const { toast } = useToast();
  const { messages, log, clearMessages } = useSimpleLog(`SamCoach#${instanceId}`);

  /* ───────── token initialization */
  useEffect(() => {
    log(`🏗️ Component instance #${instanceId} mounted (total: ${componentInstanceCount})`);
    
    if (sdkInitialized.current) return;
    
    (async () => {
      try {
        log("🔧 Fetching DG token …");
        const res = await fetch("/api/deepgram/token", { credentials: "include" });
        const { token } = await res.json();
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
      }
      agentRef.current = null;
    }
    
    // Reset states
    // Set connecting state immediately after lock
    setConnecting(true);
    setConnected(false);
    setSessionEnded(false);

    try {
      
      // Request microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      
      log("✅ Mic granted");
      micStream.current = stream;
      agentRef.current = dgRef.current.agent();
      const a = agentRef.current;

      // Event handlers
      a.on("*", (evt: any) => {
        const eventType = evt?.type || "unknown";
        if (eventType !== "unknown") {
          log(`📡 DG → ${eventType} ${eventType.includes('Audio') ? '🔊' : ''}`);
        }
      });

      a.on(AgentEvents.Open, () => {
        log("🌐 WS open → settings");
        log("🛠️ Settings payload → " + JSON.stringify(buildSettings(), null, 2));
        a.configure(buildSettings());
        log("✅ Settings sent - waiting for SettingsApplied...");
        
        initSpeaker();
        
        pingId.current = window.setInterval(() => {
          a.keepAlive();
        }, KEEPALIVE_MS);
        setConnected(true);
        setConnecting(false);
      });

      a.on(AgentEvents.SettingsApplied, () => {
        log("✅ Settings ACK - starting mic");
        startMicPump();
        startInactivityTimer();
      });

      a.on(AgentEvents.UserStartedSpeaking, () => {
        log("📡 DG → UserStartedSpeaking 🎤");
        resetInactivityTimer();
      });

      a.on(AgentEvents.AgentAudioDone, () => {
        log("📡 DG → AgentAudioDone 🔇");
      });

      a.on(AgentEvents.AgentThinking, () => {
        log("📡 DG → AgentThinking 🤔");
      });

      a.on(AgentEvents.AgentStartedSpeaking, () => {
        log("📡 DG → AgentStartedSpeaking 🗣️");
        resetInactivityTimer();
      });

      a.on(AgentEvents.ConversationText, (msg) => {
        log(`📡 DG → ConversationText: "${msg.content}"`);
        setTranscript(msg.content);
        resetInactivityTimer();
        
        const lowerText = msg.content.toLowerCase().trim();
        
        // Store all conversation messages for context
        conversationHistoryRef.current.push(msg.content);
        
        // Keep only last 10 messages to avoid memory bloat
        if (conversationHistoryRef.current.length > 10) {
          conversationHistoryRef.current = conversationHistoryRef.current.slice(-10);
        }
        
        // Check for persona generation trigger phrase
        const keyTriggerPhrase = "give me a moment while i generate your persona";
        
        log(`🔍 DEBUG: Checking for trigger phrase in: ${lowerText}`);
        log(`🔍 DEBUG: Looking for: ${keyTriggerPhrase}`);
        
        // Check if the key trigger phrase was said by Sam
        if (lowerText.includes(keyTriggerPhrase)) {
          log(`🎭 Detected persona generation trigger from Sam`);
          
          if (onDataCollected) {
            // Extract only the user's business description (not Sam's messages)
            const userMessages = conversationHistoryRef.current.filter(msg => {
              const lowerMsg = msg.toLowerCase();
              // Filter out Sam's messages and greetings
              return !lowerMsg.includes('welcome to pitchiq') && 
                     !lowerMsg.includes('i\'m sam') &&
                     !lowerMsg.includes('what product') &&
                     !lowerMsg.includes('great,') &&
                     !lowerMsg.includes('give me a moment') &&
                     msg.length > 10; // Only substantial user responses
            });
            
            // Use the most recent substantial user message as the product description
            const productInfo = userMessages.length > 0 ? userMessages[userMessages.length - 1].trim() : '';
            
            if (productInfo) {
              log(`🎮 Triggering persona generation with conversation context: ${productInfo}`);
              onDataCollected({
                product_service: productInfo,
                target_market: "" // Will be determined by persona generation
              });
            } else {
              log(`⚠️ No product information found in conversation history`);
              log(`⚠️ Conversation history: ${JSON.stringify(conversationHistoryRef.current)}`);
            }
          } else {
            log(`⚠️ Cannot trigger persona generation - missing callback`);
          }
        }
      });
      
      a.on(AgentEvents.Audio, (payload) => {
        log(`📡 DG → AgentAudio event received! 🔊`);
        // Only play audio if we have a valid audio context
        if (spkCtx.current && spkCtx.current.state !== "closed") {
          playTTS(payload);
        } else {
          log("⚠️ Ignoring audio - no valid audio context");
        }
      });

      a.on(AgentEvents.Error, (e) => {
        if (e.code === "CLIENT_MESSAGE_TIMEOUT") {
          log("⏰ Session timeout - no speech detected for a while");
        } else {
          log(`🚨 DG error ${JSON.stringify(e)}`);
        }
      });
      a.on(AgentEvents.Close, () => {
        log("🌐 WS closed");
        cleanup();
      });
    } catch (e) {
      log(`❌ startSession – ${e}`);
      setConnecting(false);
    }
  }, [log, connecting, connected]);

  /* ───────── settings */
  const buildSettings = () => ({
    audio: {
      input: {
        encoding: "linear16",
        sample_rate: 48000,
      },
      output: {
        encoding: "linear16",
        sample_rate: 48000,
      },
    },
    agent: {
      language: "en",
      listen: {
        provider: {
          type: "deepgram",
          model: "nova-2",
        },
      },
      think: {
        provider: {
          type: "open_ai",
          model: "gpt-4o-mini",
        },
        prompt: `You are Sam, PitchIQ's AI assistant. Welcome users and collect their product/service info.

STYLE: Friendly, encouraging, conversational (under 30 words per response).

FLOW:
1. Welcome them to PitchIQ
2. Ask what product/service they sell
3. If they give a DETAILED description (who they serve, what problem they solve, or specific details), say: "Great, give me a moment while I generate your persona!"
4. If they give a VAGUE answer (just "consulting", "apps", "coaching"), ask for more specifics
5. Stop talking after saying the trigger phrase

EXAMPLES:
- VAGUE (ask for more): "consulting", "apps", "coaching", "software"
- DETAILED (trigger): "sales training for entrepreneurs", "mobile apps for restaurants", "executive coaching for tech leaders"

IMPORTANT: Use the EXACT phrase "Great, give me a moment while I generate your persona!" to trigger persona generation`
      },
      speak: {
        provider: {
          type: "deepgram",
          model: "aura-2-asteria-en",
        },
      },
      greeting: "Welcome to PitchIQ! I'm Sam, your AI assistant. I'm here to help you get set up for an amazing sales training experience. PitchIQ creates realistic AI prospects for you to practice with. To build your perfect practice partner, I need to know - what product or service do you sell?"
    },
    experimental: false,
  });

  /* ───────── mic pump */
  const startMicPump = async () => {
    if (!micStream.current || !agentRef.current) {
      log("❌ Missing mic stream or agent reference");
      return;
    }

    try {
      micCtx.current = new AudioContext({ sampleRate: MIC_RATE });
      await micCtx.current.audioWorklet.addModule("/static/deepgram-worklet.js");
      
      if (micCtx.current.state === "closed") {
        log("❌ Audio context closed during worklet load - aborting mic setup");
        return;
      }
      
      micNode.current = new AudioWorkletNode(micCtx.current, "deepgram-worklet");
      log("✅ Audio worklet node created successfully");
    } catch (error) {
      log(`❌ Error setting up microphone: ${error}`);
      return;
    }

    let hold = new Int16Array(0);

    micNode.current.port.onmessage = (e) => {
      const data = e.data;
      
      // Check current mute state from ref (avoids stale closure)
      if (mutedRef.current) {
        // When muted, still process audio but don't send it
        return;
      }
      
      if (!agentRef.current) {
        log("⚠️ No agent reference, skipping audio data");
        return;
      }

      const in16 = new Int16Array(data);
      let cat = new Int16Array(hold.length + in16.length);
      cat.set(hold);
      cat.set(in16, hold.length);

      const TARGET_SAMPLES = (MIC_RATE * 30) / 1000; // 30ms chunks

      while (cat.length >= TARGET_SAMPLES) {
        const chunk = cat.slice(0, TARGET_SAMPLES);
        cat = cat.slice(TARGET_SAMPLES);

        try {
          agentRef.current.send(chunk.buffer);
        } catch (error) {
          log(`❌ Error sending audio data: ${error}`);
          break;
        }
      }
      hold = cat;
    };

    const source = micCtx.current.createMediaStreamSource(micStream.current);
    source.connect(micNode.current);
    micNode.current.connect(micCtx.current.destination);
  };

  /* ───────── speaker */
  const initSpeaker = () => {
    spkCtx.current = new AudioContext({ sampleRate: TTS_RATE });
    playHead.current = 0;
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
      {/* Clean UI - just the card with end call button */}
      <div className="w-full max-w-md p-6 bg-white border border-gray-900 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200">
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
    </div>
  );
};

export default SamCoachAgent;
import React, { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Phone, PhoneOff, Activity } from "lucide-react";
import { createClient, AgentEvents } from "@deepgram/sdk";
import { Buffer } from "buffer";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CallMonitoring } from './CallMonitoring';
import { sanitizeForDeepgramText, hardenSettings } from "../../utils/deepgramSanitizer";

/**********************************************************************
 * Modular Deepgram Voice‑to‑Voice Component (React 18 + Vite/SWC)
 * Can be used in dashboard, chat, or any other page
 *********************************************************************/

// Poly‑fill: DG browser SDK still expects Node.Buffer in the global scope
if (typeof window !== "undefined" && !(window as any).Buffer) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  window.Buffer = Buffer;
}

const MIC_RATE = 48_000; // True browser native rate
const TTS_RATE = 48_000; // Keep aligned - fix sample rate mismatch
const KEEPALIVE_MS = 8_000; // ping to keep WS alive

// TypeScript interfaces for better type safety
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

interface DeepgramVoiceAgentProps {
  // Optional props for customization
  showLogs?: boolean;
  showTranscript?: boolean;
  onTranscriptUpdate?: (transcript: string) => void;
  onConnectionChange?: (connected: boolean, disconnectFn?: () => void) => void;
  onConversationProgressed?: (question?: string, personaData?: any) => void;
  className?: string;
  buttonVariant?: "default" | "outline" | "ghost";
  compact?: boolean; // For smaller UI in chat
  systemPrompt?: string; // Custom system prompt for the AI
  userName?: string; // User's name for personalized greeting
  sessionId?: string; // External session ID for consistent tracking
  personaName?: string; // For session ID generation if no external ID
}

export const DeepgramVoiceAgent: React.FC<DeepgramVoiceAgentProps> = ({
  showLogs = false,
  showTranscript = true,
  onTranscriptUpdate,
  onConnectionChange,
  onConversationProgressed,
  className = "",
  buttonVariant = "default",
  compact = false,
  systemPrompt,
  userName,
  sessionId: externalSessionId,
  personaName = "AI Assistant"
}) => {
  const { toast } = useToast();
  
  /* ───────── state */
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [micTestActive, setMicTestActive] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  /* ───────── refs */
  const dgRef = useRef<any>(null);
  const agentRef = useRef<any>(null);
  const micStream = useRef<MediaStream | null>(null);
  const micCtx = useRef<AudioContext | null>(null);
  const micNode = useRef<AudioWorkletNode | null>(null);
  const spkCtx = useRef<AudioContext | null>(null);
  const playHead = useRef<number>(0);
  const pingId = useRef<number | null>(null);

  // Smart logging counters to reduce verbosity
  const audioPacketCount = useRef<number>(0);
  const micChunkCount = useRef<number>(0);
  const lastLogTime = useRef<number>(Date.now());
  
  // Prevent multiple simultaneous sessions
  const sessionActive = useRef<boolean>(false);
  
  // Stable session ID tracking
  const activeSessionId = useRef<string | null>(null);

  /* ───────── misc */
  const log = (m: string) => {
    console.debug(m);
    setLogs((p) => [...p.slice(-199), `${new Date().toLocaleTimeString()}  ${m}`]);
  };

  // Smart logging function that only logs important events or periodic summaries
  const smartLog = (type: 'audio' | 'mic' | 'important', message: string, data?: any) => {
    const now = Date.now();
    
    if (type === 'important') {
      log(message);
      return;
    }
    
    if (type === 'audio') {
      audioPacketCount.current++;
      if (audioPacketCount.current % 50 === 0 || now - lastLogTime.current > 5000) {
        log(`🔊 Audio packets: ${audioPacketCount.current} (${data?.rms ? `RMS: ${data.rms}` : 'processing...'})`);
        lastLogTime.current = now;
      }
    } else if (type === 'mic') {
      micChunkCount.current++;
      if (micChunkCount.current % 100 === 0 || now - lastLogTime.current > 3000) {
        log(`🎙️ Mic chunks: ${micChunkCount.current} (${data?.rms ? `RMS: ${data.rms}` : 'streaming...'})`);
        lastLogTime.current = now;
      }
    }
  };

  /* ───────── utility functions */
  const generateSessionId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    // Use personaName to make sessions more identifiable and traceable
    return `${personaName.replace(/\s+/g, '_')}_${timestamp}_${random}`;
  };
  
  // Log WebSocket messages with session ID for debugging
  const logWebSocketMessage = useCallback((message: any) => {
    if (!activeSessionId.current) return;
    
    try {
      fetch('/api/log-websocket-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          direction: 'AGENT_INTERNAL',
          persona: personaName,
          message: {
            ...message,
            _internal_session_id: activeSessionId.current
          },
          timestamp: new Date().toISOString()
        })
      }).catch(err => {
        console.error('Failed to log WebSocket message:', err);
      });
    } catch (err) {
      console.error('Error preparing WebSocket log:', err);
    }
  }, [personaName]);

  /* ───────── setup */
  useEffect(() => {
    // Initialize the Deepgram client
    const initDeepgram = async () => {
      try {
        const response = await fetch('/api/deepgram/token');
        const data = await response.json();
        
        const token = data?.token || data?.key;
        if (!token) {
          smartLog('important', "❌ No Deepgram token found");
          return;
        }
        
        dgRef.current = createClient(token);
        smartLog('important', "✅ Deepgram client created");
      } catch (error) {
        smartLog('important', `❌ Deepgram init error: ${error}`);
      }
    };

    initDeepgram();
    
    // Use external session ID if provided, or generate one
    if (externalSessionId) {
      // If we already had a different session ID, log the change
      if (activeSessionId.current && activeSessionId.current !== externalSessionId) {
        smartLog('important', `⚠️ Switching session IDs from ${activeSessionId.current} to ${externalSessionId}`);
        
        // Log the session ID change event
        fetch('/api/call-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'SESSION_ID_CHANGED',
            oldSessionId: activeSessionId.current,
            newSessionId: externalSessionId,
            persona: personaName,
            timestamp: new Date().toISOString()
          })
        }).catch(() => {});
      }
      
      activeSessionId.current = externalSessionId;
      smartLog('important', `📋 Using external session ID: ${externalSessionId}`);
    }
    
    // Add window beforeunload listener to ensure cleanup
    const handleBeforeUnload = () => {
      if (activeSessionId.current && sessionActive.current) {
        smartLog('important', `🚨 Page closing - cleaning up session ${activeSessionId.current}`);
        stopSession();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // Ensure cleanup happens when component unmounts
      if (activeSessionId.current) {
        smartLog('important', `🧹 Cleaning up session ${activeSessionId.current} on unmount`);
        cleanup();
      }
      
      // Remove beforeunload listener
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [externalSessionId, personaName]);

  /* ───────── session */
  const startSession = async () => {
    smartLog('important', "▶️ Starting voice session");
    if (connecting || connected || sessionActive.current) {
      smartLog('important', "⚠️ Session already active or connecting");
      return;
    }
    if (!dgRef.current) {
      smartLog('important', "🚫 Deepgram SDK not ready yet");
      return;
    }
    
    // Generate new session ID if not provided externally
    if (!activeSessionId.current) {
      activeSessionId.current = generateSessionId();
      smartLog('important', `🔑 Generated new session ID: ${activeSessionId.current}`);
    }
    // Start call monitoring for standalone debug component
    try {
      if (activeSessionId.current) {
        CallMonitoring.getInstance().startCall(
          activeSessionId.current,
          { name: personaName } as any,
          'aura-asteria-en'
        );
      }
    } catch (err) {
      smartLog('important', `metrics: startCall failed: ${String(err)}`);
    }
    
    // Mark session as active
    sessionActive.current = true;
    
    // Ensure we're starting fresh
    if (agentRef.current || micStream.current || micCtx.current) {
      smartLog('important', "🧹 Cleaning up previous session before starting new one");
      cleanup();
      // Small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setConnecting(true);

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      smartLog('important', `🎤 Found ${audioInputs.length} microphones`);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });
      
      smartLog('important', "✅ Mic granted");

      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      smartLog('important', `🎤 Mic settings: ${settings.sampleRate}Hz, ${settings.channelCount}ch`);

      micStream.current = stream;
      agentRef.current = dgRef.current.agent();
      const a = agentRef.current;

      const currentSessionId = activeSessionId.current;
      
      // Log connection attempt with session ID
      smartLog('important', `🔌 Establishing Deepgram connection with session ID: ${currentSessionId}`);
      logWebSocketMessage({ 
        type: 'ConnectionAttempt', 
        sessionId: currentSessionId 
      });
      
      a.on(AgentEvents.Open, () => {
        smartLog('important', `🌐 WS open for session ${currentSessionId} → sending settings`);
        const settings = buildSettings();
        smartLog('important', "🛠 Settings payload → " + JSON.stringify(settings, null, 2));
        a.configure(settings);
        smartLog('important', "✅ Settings sent - waiting for SettingsApplied...");
        
        if (agentRef.current && !((a as any).__send)) {
          (a as any).__send = agentRef.current.send.bind(agentRef.current);
          agentRef.current.send = ((buf: ArrayBuffer) => {
            if (buf.byteLength > 10000 || micChunkCount.current % 200 === 0) {
              smartLog('important', `📤 sent ${buf.byteLength} bytes to DG`);
            }
            return (a as any).__send(buf);
          }) as any;
        }
        
        initSpeaker();
        
        pingId.current = window.setInterval(() => {
          a.keepAlive();
        }, KEEPALIVE_MS);
        setConnected(true);
        setConnecting(false);
        onConnectionChange?.(true, cleanup);
      });

      a.on(AgentEvents.SettingsApplied, () => {
        // Verify session ID hasn't changed during setup
        if (!activeSessionId.current) {
          smartLog('important', "❌ Session ID missing during setup, aborting");
          cleanup();
          return;
        }
        
        smartLog('important', `✅ Settings applied for session ${activeSessionId.current}`);
        a.start();
        // Start microphone pump only after settings are applied (gated start)
        startMicPump().catch((err) => smartLog('important', `🎙️ Mic pump failed: ${String(err)}`));
        setConnected(true);
        setConnecting(false);
        onConnectionChange?.(true, stopSession);
        
        smartLog('important', "✅ Agent ready");
      });

      a.on(AgentEvents.UserStartedSpeaking, () => {
        smartLog('important', "🎤 User started speaking");
        try {
          if (activeSessionId.current) {
            CallMonitoring.getInstance().markFirstUserSpeech(activeSessionId.current);
          }
        } catch (err) {
          smartLog('important', `metrics: markFirstUserSpeech failed: ${String(err)}`);
        }
      });

      a.on(AgentEvents.AgentAudioDone, () => {
        smartLog('important', "🔇 Agent finished speaking");
      });

      a.on(AgentEvents.AgentThinking, () => {
        smartLog('important', "🤔 Agent thinking...");
      });

      a.on(AgentEvents.AgentStartedSpeaking, () => {
        smartLog('important', "🗣️ Agent started speaking");
        try {
          if (activeSessionId.current) {
            CallMonitoring.getInstance().markAgentGreetingStart(activeSessionId.current);
          }
        } catch (err) {
          smartLog('important', `metrics: markAgentGreetingStart failed: ${String(err)}`);
        }
      });

      a.on(AgentEvents.ConversationText, (msg) => {
        smartLog('important', `💬 "${msg.content}"`);
        setTranscript(msg.content);
        onTranscriptUpdate?.(msg.content);
        try {
          if (activeSessionId.current && typeof msg?.content === 'string') {
            CallMonitoring.getInstance().recordSentence(activeSessionId.current, msg.content);
          }
        } catch (_) {}
      });
      
      a.on(AgentEvents.Audio, (payload) => {
        playTTS(payload);
      });

      a.on(AgentEvents.Error, (e) => {
        smartLog('important', `🚨 DG error ${JSON.stringify(e)}`);
        
        // Handle different error types
        if (e.code === "CLIENT_MESSAGE_TIMEOUT") {
          smartLog('important', "⏰ Client message timeout - stopping session");
          try {
            if (activeSessionId.current) {
              // Increment websocket error metric
              CallMonitoring.getInstance().recordWebSocketError(activeSessionId.current, String(e?.message || e));
              CallMonitoring.getInstance().endCall(activeSessionId.current, 'CLIENT_MESSAGE_TIMEOUT');
            }
          } catch (_) {}
          cleanup();
          toast({
            title: "Voice Timeout",
            description: "Voice session timed out due to lack of audio data",
            variant: "destructive",
          });
        } else {
          try {
            if (activeSessionId.current) {
              CallMonitoring.getInstance().recordWebSocketError(activeSessionId.current, String(e?.message || e));
              CallMonitoring.getInstance().endCall(activeSessionId.current, 'ERROR');
            }
          } catch (_) {}
          cleanup();
          toast({
            title: "Voice Error",
            description: "There was an issue with the voice connection",
            variant: "destructive",
          });
        }
      });

      a.on(AgentEvents.Close, (evt?: any) => {
        const code = (evt?.code ?? evt?.data?.code ?? 'unknown');
        const reason = (evt?.reason ?? evt?.data?.reason ?? '');
        smartLog('important', `🌐 WS closed code=${code} reason=${reason}`);
        try {
          if (activeSessionId.current) {
            logWebSocketMessage({ type: 'Close', code, reason, sessionId: activeSessionId.current });
          }
        } catch (_) {}
        // Don't automatically restart - let user manually restart if needed
        try {
          if (activeSessionId.current && sessionActive.current) {
            CallMonitoring.getInstance().endCall(activeSessionId.current, `CLOSED_${code}`);
          }
        } catch (_) {}
        cleanup();
      });

    } catch (e) {
      smartLog('important', `❌ startSession – ${e}`);
      setConnecting(false);
      toast({
        title: "Microphone Error",
        description: "Please allow microphone access to use voice features",
        variant: "destructive",
      });
    }
  };

  /* ───────── settings */
  const buildSettings = () => {
    // Build settings natively matching AgentLiveSchema and sanitize text
    const hasPrompt = typeof systemPrompt === 'string' && systemPrompt.trim().length > 0;
    const instructions = hasPrompt ? sanitizeForDeepgramText(systemPrompt, 1200) : '';

    // Optional greeting derivation from prompt first non-empty line or GREETING section
    let context: any | undefined = undefined;
    if (hasPrompt) {
      const lines = systemPrompt!.split("\n");
      let collecting = false;
      const collected: string[] = [];
      for (const raw of lines) {
        const line = raw.trim();
        if (!collecting) {
          if (/greeting/i.test(line)) {
            collecting = true;
            continue;
          }
        } else {
          if (line === '' || /^[\d]+\./.test(line) || /^[^a-z0-9]/i.test(line)) break;
          collected.push(line);
        }
      }
      let greetingText = collected.join(' ').trim();
      if (!greetingText) greetingText = (lines.find(l => l.trim().length > 0) || '').trim();
      greetingText = sanitizeForDeepgramText(greetingText, 160);
      if (greetingText) {
        context = {
          messages: [{ role: 'assistant', content: greetingText }],
          replay: true,
        };
      }
    }

    const settings: any = {
      audio: {
        input: {
          encoding: "linear16",
          sampleRate: MIC_RATE,
        },
        output: {
          encoding: "linear16",
          sampleRate: TTS_RATE,
          container: "none",
        },
      },
      agent: {
        listen: { model: "nova-2" },
        think: {
          provider: { type: "openai", model: "gpt-4o-mini" },
          instructions,
        },
        speak: { model: "aura-asteria-en" },
      },
      ...(context ? { context } : {}),
    };

    // Return hardened settings (idempotent if already compliant)
    return hardenSettings(settings);
  };

  /* ───────── mic pump */
  const startMicPump = async () => {
    if (!micStream.current) return;

    micCtx.current = new AudioContext({ sampleRate: MIC_RATE });
    await micCtx.current.audioWorklet.addModule("/deepgram-worklet.js");
    
    if (micCtx.current.state === "closed") {
      smartLog('important', "❌ Audio context closed during worklet load - aborting mic setup");
      return;
    }
    
    micNode.current = new AudioWorkletNode(micCtx.current, "deepgram-worklet");

    let hold = new Int16Array(0);
    let loggedSamples = false;

    micNode.current.port.onmessage = (e) => {
      const data = e.data;
      if (muted) return;

      if (!loggedSamples && data.length > 50) {
        const rawFloats = new Float32Array(data.buffer, 0, 50);
        smartLog('important', `🎤 Raw audio worklet samples initialized`);
        loggedSamples = true;
      }

      const in16 = new Int16Array(data);
      let cat = new Int16Array(hold.length + in16.length);
      cat.set(hold);
      cat.set(in16, hold.length);

      const TARGET_SAMPLES = (MIC_RATE * 30) / 1000;
      while (cat.length >= TARGET_SAMPLES) {
        const chunk = cat.slice(0, TARGET_SAMPLES);
        
        const rms = Math.sqrt(chunk.reduce((sum, sample) => sum + sample * sample, 0) / chunk.length);
        const hasAudio = rms > 100;
        
        smartLog('mic', '', { rms: Math.round(rms), hasAudio });
        
        if (rms < 50 && micChunkCount.current % 500 === 0) {
          const min = Math.min(...chunk);
          const max = Math.max(...chunk);
          smartLog('important', `🔍 Low audio levels - RMS: ${Math.round(rms)}, Range: ${min} to ${max}`);
        }
        
        agentRef.current?.send(chunk.buffer);
        cat = cat.slice(TARGET_SAMPLES);
      }
      hold = cat;
    };
    
    micCtx.current.createMediaStreamSource(micStream.current).connect(micNode.current);
    smartLog('important', `🎙️ Mic → DG @${MIC_RATE} Hz`);
  };

  /* ───────── speaker */
  const initSpeaker = () => {
    spkCtx.current = new AudioContext({ sampleRate: TTS_RATE });
    playHead.current = spkCtx.current.currentTime + 0.05;
    spkCtx.current.resume().catch(() => {});
    smartLog('important', "🔈 Speaker ready");
  };

  const playTTS = (payload: any) => {
    if (!spkCtx.current) {
      smartLog('important', "❌ No speaker context for TTS playback");
      return;
    }

    const pcmBuf: ArrayBuffer | undefined =
      payload instanceof ArrayBuffer     ? payload :
      ArrayBuffer.isView(payload)        ? payload.buffer :
      ArrayBuffer.isView(payload?.audio) ? payload.audio.buffer :
      undefined;

    if (!pcmBuf?.byteLength) {
      smartLog('important', "❌ Empty or invalid audio payload");
      return;
    }

    const audioSamples = new Int16Array(pcmBuf);
    const rms = Math.sqrt(audioSamples.reduce((sum, sample) => sum + sample * sample, 0) / audioSamples.length);
    
    smartLog('audio', '', { rms: Math.round(rms) });
    
    if (spkCtx.current.state === "suspended") {
      smartLog('important', "🔊 Resuming suspended audio context...");
      spkCtx.current.resume().then(() => {
        smartLog('important', "✅ Audio context resumed");
      }).catch((err) => {
        smartLog('important', `❌ Failed to resume audio context: ${err}`);
      });
    }
    
    try {
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
      
      if (audioPacketCount.current % 20 === 0) {
        smartLog('important', `🔊 TTS playing: ${buf.duration.toFixed(2)}s`);
      }
      
    } catch (error) {
      smartLog('important', `❌ TTS playback failed: ${error}`);
    }
  };

  /* ───────── cleanup */
  const cleanup = () => {
    const currentSessionId = activeSessionId.current;
    smartLog('important', `🧹 Starting cleanup for session ${currentSessionId || 'unknown'}`);
    
    // Stop microphone stream
    if (micStream.current) {
      micStream.current.getTracks().forEach((t) => {
        t.stop();
        smartLog('important', `🎤 Stopped audio track: ${t.label}`);
      });
      micStream.current = null;
    }
    
    // Disconnect and close audio nodes
    if (micNode.current) {
      micNode.current.disconnect();
      micNode.current = null;
    }
    
    // Close audio contexts
    if (micCtx.current && micCtx.current.state !== 'closed') {
      micCtx.current.close().catch(() => {});
      micCtx.current = null;
    }
    
    if (spkCtx.current && spkCtx.current.state !== 'closed') {
      spkCtx.current.close().catch(() => {});
      spkCtx.current = null;
    }
    
    // Clear intervals
    if (pingId.current) {
      clearInterval(pingId.current);
      pingId.current = null;
    }
    
    // Reset counters and state
    audioPacketCount.current = 0;
    micChunkCount.current = 0;
    lastLogTime.current = Date.now();
    playHead.current = 0;
    
    // Clear transcript
    setTranscript("");
    
    // Update connection state
    setConnected(false);
    setConnecting(false);
    setMuted(false);
    onConnectionChange?.(false);
    
    // Clear agent reference
    agentRef.current = null;
    
    // Reset session flags
    sessionActive.current = false;
    
    // Log that we're clearing the session ID
    if (activeSessionId.current) {
      smartLog('important', `🗑️ Clearing session ID: ${activeSessionId.current}`);
      activeSessionId.current = null;
    }
    
    smartLog('important', "✅ Cleanup completed");
  };

  const stopSession = () => {
    const currentSessionId = activeSessionId.current;
    smartLog('important', `⏹️ Stopping session ${currentSessionId || 'unknown'}`);
    if (agentRef.current) {
      try {
        // Send explicit termination message with session ID
        if (currentSessionId) {
          // Create a termination message with the session ID
          const terminationMessage = { 
            type: 'Terminate', 
            reason: 'USER_REQUESTED_STOP',
            _internal_session_id: currentSessionId,
            timestamp: new Date().toISOString()
          };
          
          // Log termination with session ID to improve tracking
          fetch('/api/log-websocket-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              direction: 'SENT',
              persona: personaName,
              message: terminationMessage,
              timestamp: new Date().toISOString()
            })
          }).catch((error) => {
            smartLog('important', `⚠️ Failed to log termination message: ${error}`);
          });
          
          // Also log to call metrics endpoint for better tracking
          fetch('/api/call-metrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'SESSION_TERMINATED',
              sessionId: currentSessionId,
              persona: personaName,
              metadata: terminationMessage
            })
          }).catch((error) => {
            smartLog('important', `⚠️ Failed to log termination to call metrics: ${error}`);
          });
        }
        agentRef.current.finish?.();
        agentRef.current.close?.();
        agentRef.current = null;
      } catch (error) {
        smartLog('important', `❌ Error during session termination: ${error}`);
      }
    }
    try {
      if (currentSessionId) {
        CallMonitoring.getInstance().endCall(currentSessionId, 'USER_STOP');
      }
    } catch (_) {}
    cleanup();
    
    toast({
      title: "Voice Chat Ended",
      description: "Voice session has been terminated successfully",
    });
  };

  const toggleSession = () => {
    if (connected) {
      stopSession();
    } else {
      startSession();
    }
  };

  const toggleMute = () => {
    setMuted(!muted);
    smartLog('important', muted ? "🔊 Unmuted" : "🔇 Muted");
  };

  // Handle WebSocket errors more robustly
  useEffect(() => {
    const handleWebSocketError = (event: Event) => {
      if (event instanceof CloseEvent && activeSessionId.current) {
        smartLog('important', `🔌 WebSocket closed unexpectedly for session ${activeSessionId.current}`);
        fetch('/api/log-websocket-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            direction: 'ERROR',
            persona: personaName,
            message: { 
              type: 'WebSocketClosed', 
              code: event.code, 
              reason: event.reason,
              _internal_session_id: activeSessionId.current 
            },
            timestamp: new Date().toISOString()
          })
        }).catch(err => console.warn('Failed to log WS error:', err));
      }
    };
    
    // Listen for global WebSocket errors
    window.addEventListener('websocketerror', handleWebSocketError);
    
    return () => {
      window.removeEventListener('websocketerror', handleWebSocketError);
      cleanup();
    };
  }, []);

  return (
    <div className={`deepgram-voice-agent ${className}`}>
      <div className={`flex ${compact ? 'flex-row gap-2' : 'flex-col gap-4'} items-center`}>
        {/* Main Control Button */}
        <Button
          onClick={toggleSession}
          disabled={connecting}
          variant={buttonVariant}
          size={compact ? "sm" : "default"}
          className={`${connected ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
        >
          {connecting ? (
            <Activity className="h-4 w-4 animate-spin" />
          ) : connected ? (
            <PhoneOff className="h-4 w-4" />
          ) : (
            <Phone className="h-4 w-4" />
          )}
          {!compact && (
            <span className="ml-2">
              {connecting ? "Connecting..." : connected ? "End Call" : "Start Voice Chat"}
            </span>
          )}
        </Button>

        {/* Mute Button */}
        {connected && (
          <Button
            onClick={toggleMute}
            variant="outline"
            size={compact ? "sm" : "default"}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {!compact && <span className="ml-2">{muted ? "Unmute" : "Mute"}</span>}
          </Button>
        )}

        {/* Status Badge */}
        <Badge variant={connected ? "default" : "secondary"}>
          {connecting ? "Connecting..." : connected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      {/* Transcript */}
      {showTranscript && transcript && (
        <div className={`${compact ? 'mt-2' : 'mt-4'} p-3 bg-gray-100 rounded-lg`}>
          <p className="text-sm text-gray-700">{transcript}</p>
        </div>
      )}

      {/* Logs (optional) */}
      {showLogs && logs.length > 0 && (
        <div className={`${compact ? 'mt-2' : 'mt-4'} max-h-32 overflow-y-auto bg-black text-green-400 p-2 rounded text-xs font-mono`}>
          {logs.slice(-10).map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeepgramVoiceAgent; 
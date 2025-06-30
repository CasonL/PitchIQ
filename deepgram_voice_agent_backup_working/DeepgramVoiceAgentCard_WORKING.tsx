import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mic, MicOff, Phone, PhoneOff, Activity } from "lucide-react";
import { createClient, AgentEvents } from "@deepgram/sdk";
import { Buffer } from "buffer";

/**********************************************************************
 * Deepgram Voice‑to‑Voice reference component (React 18 + Vite/SWC)
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
// Note: Using 'any' types for Deepgram SDK due to complex internal types
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

const DeepgramVoiceAgentCard: React.FC = () => {
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

  /* ───────── misc */
  const log = (m: string) => {
    console.debug(m);
    setLogs((p) => [...p.slice(-199), `${new Date().toLocaleTimeString()}  ${m}`]);
  };

  /* ───────── token */
  useEffect(() => {
    (async () => {
      try {
        log("🔧 Fetching DG token …");
        const res = await fetch("/api/deepgram/token", { credentials: "include" });
        const { token } = await res.json();
        dgRef.current = createClient(token);
        log("✅ SDK ready");
      } catch (e) {
        log(`❌ token – ${e}`);
      }
    })();
  }, []);

  /* ───────── session */
  const startSession = async () => {
    log("▶️ startSession invoked");
    if (connecting || connected) return;
    if (!dgRef.current) return log("🚫 Deepgram SDK not ready yet");
    setConnecting(true);

    try {
      log("✅ SDK ready");
      
      // Check available microphone devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      log(`🎤 Available microphones: ${audioInputs.length}`);
      audioInputs.forEach((device, index) => {
        log(`  ${index + 1}. ${device.label || `Microphone ${index + 1}`} (${device.deviceId.substring(0, 8)}...)`);
      });

      // Request microphone with higher quality settings
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

      // Check the actual microphone settings
      const audioTrack = stream.getAudioTracks()[0];
      const settings = audioTrack.getSettings();
      log(`🎤 Actual mic settings: ${JSON.stringify({
        sampleRate: settings.sampleRate,
        channelCount: settings.channelCount,
        echoCancellation: settings.echoCancellation,
        noiseSuppression: settings.noiseSuppression,
        autoGainControl: settings.autoGainControl
      })}`);

      micStream.current = stream;
      agentRef.current = dgRef.current.agent();
      const a = agentRef.current;

      // Add comprehensive event logging to debug all Deepgram events
      // First: catch ALL events with generic handler
      a.on("*", (evt: any) => {
        const eventType = evt?.type || "unknown";
        if (eventType !== "unknown") {
          log(`📡 DG → ${eventType} ${eventType.includes('Audio') ? '🔊' : ''}`);
        }
      });

      // Then: specific handlers for key events
      a.on(AgentEvents.Open, () => {
        log("🌐 WS open → settings");

        log("🛠️ Settings payload → " + JSON.stringify(buildSettings(), null, 2));
        a.configure(buildSettings());          // ① send settings

        // SDK v4.x auto-starts after configure() - no start() method exists yet
        log("✅ Settings sent - waiting for SettingsApplied...");
        
        // Wrap send method for visibility
        if (agentRef.current && !((a as any).__send)) {
          (a as any).__send = agentRef.current.send.bind(agentRef.current);
          agentRef.current.send = ((buf: ArrayBuffer) => {
            log(`📤 sent ${buf.byteLength} bytes to DG`);
            return (a as any).__send(buf);
          }) as any;
        }
        
        // Don't start mic here - wait for SettingsApplied
        initSpeaker();
        
        pingId.current = window.setInterval(() => {
          a.keepAlive();
        }, KEEPALIVE_MS);
        setConnected(true);
        setConnecting(false);
      });

      a.on(AgentEvents.SettingsApplied, () => {
        log("✅ Settings ACK - starting mic");
        startMicPump(); // Start mic only after settings are accepted
      });

      a.on(AgentEvents.UserStartedSpeaking, () => {
        log("📡 DG → UserStartedSpeaking 🎤");
      });

      a.on(AgentEvents.AgentAudioDone, () => {
        log("📡 DG → AgentAudioDone 🔇");
      });

      a.on(AgentEvents.AgentThinking, () => {
        log("📡 DG → AgentThinking 🤔");
      });

      a.on(AgentEvents.AgentStartedSpeaking, () => {
        log("📡 DG → AgentStartedSpeaking 🗣️");
      });

      a.on(AgentEvents.ConversationText, (msg) => {
        log(`📡 DG → ConversationText: "${msg.content}"`);
        setTranscript(msg.content);
      });
      
      a.on(AgentEvents.Audio, (payload) => {
        log(`📡 DG → AgentAudio event received! 🔊`);
        playTTS(payload);
      });

      a.on(AgentEvents.Error, (e) => log(`🚨 DG error ${JSON.stringify(e)}`));
      a.on(AgentEvents.Close, () => {
        log("🌐 WS closed");
        cleanup();
      });
    } catch (e) {
      log(`❌ startSession – ${e}`);
      setConnecting(false);
    }
  };

  /* ───────── settings */
  const buildSettings = () => ({
    audio: {
      input: {
        encoding: "linear16",
        sample_rate: 48000,
      },
      output: {
        encoding: "linear16",
        sample_rate: 48000, // Fixed: align with TTS_RATE
      },
    },
    agent: {
      language: "en",
      listen: {
        provider: {
          type: "deepgram",
          model: "nova-2",
        },
        // Removed invalid VAD config - use default automatic VAD
      },
      think: {
        provider: {
          type: "open_ai",
          model: "gpt-4o-mini",
        },
      },
      speak: {
        provider: {
          type: "deepgram",
          model: "aura-2-asteria-en", // Re-enable Aura-2 - it IS supported
        },
      },
    },
    experimental: false,
  });

  /* ───────── mic pump */
  const startMicPump = async () => {
    if (!micStream.current) return;

    micCtx.current = new AudioContext({ sampleRate: MIC_RATE });
    await micCtx.current.audioWorklet.addModule("/deepgram-worklet.js");
    
    // Defensive guard: abort if context closed while loading worklet
    if (micCtx.current.state === "closed") {
      log("❌ Audio context closed during worklet load - aborting mic setup");
      return;
    }
    
    micNode.current = new AudioWorkletNode(micCtx.current, "deepgram-worklet");

    let hold = new Int16Array(0);
    let loggedSamples = false; // Flag to log raw samples once

    micNode.current.port.onmessage = (e) => {
      const data = e.data;
      if (muted) return;

      // Debug: Log raw float samples from worklet ONCE
      if (!loggedSamples && data.length > 50) {
        const rawFloats = new Float32Array(data.buffer, 0, 50);
        log(`🎤 Raw float samples (first 50): [${Array.from(rawFloats).map(v => v.toFixed(6)).slice(0, 10).join(', ')}...]`);
        loggedSamples = true;
      }

      const in16 = new Int16Array(data);
      let cat = new Int16Array(hold.length + in16.length);
      cat.set(hold);
      cat.set(in16, hold.length);

      const TARGET_SAMPLES = (MIC_RATE * 30) / 1000; // 30ms chunks for lower latency
      while (cat.length >= TARGET_SAMPLES) {
        const chunk = cat.slice(0, TARGET_SAMPLES);
        
        // Calculate RMS to check if there's actual audio content
        const rms = Math.sqrt(chunk.reduce((sum, sample) => sum + sample * sample, 0) / chunk.length);
        const hasAudio = rms > 100; // Threshold for detecting actual speech vs silence
        
        log(`🎙️ Mic chunk ${chunk.byteLength} B (30ms @ 48kHz) RMS: ${Math.round(rms)} ${hasAudio ? '🔊' : '🔇'}`);
        
        // Debug: If RMS is suspiciously low, log sample range
        if (rms < 50) {
          const min = Math.min(...chunk);
          const max = Math.max(...chunk);
          log(`🔍 Low RMS debug - Min: ${min}, Max: ${max}, Range: ${max - min}`);
        }
        
        agentRef.current?.send(chunk.buffer);
        cat = cat.slice(TARGET_SAMPLES);
      }
      hold = cat;
    };
    
    micCtx.current.createMediaStreamSource(micStream.current).connect(micNode.current);
    // Note: Don't connect to destination to avoid mic echo
    log(`🎙️ Mic → DG @${MIC_RATE} Hz`);
  };

  /* ───────── speaker */
  const initSpeaker = () => {
    spkCtx.current = new AudioContext({ sampleRate: TTS_RATE }); // Fixed: use TTS_RATE
    playHead.current = spkCtx.current.currentTime + 0.05;
    spkCtx.current.resume().catch(() => {});
    log("🔈 Speaker ready");
  };

  /** Handles the DG Audio event. SDK v4 sends the ArrayBuffer directly. */
  const playTTS = (payload: any) => {
    if (!spkCtx.current) {
      log("❌ No speaker context for TTS playback");
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
    
    // Debug: Check if audio data contains actual sound or just zeros
    const audioSamples = new Int16Array(pcmBuf);
    const firstTenSamples = Array.from(audioSamples.slice(0, 10));
    const rms = Math.sqrt(audioSamples.reduce((sum, sample) => sum + sample * sample, 0) / audioSamples.length);
    log(`🔊 Audio RMS: ${Math.round(rms)} | First 10 samples: [${firstTenSamples.join(', ')}]`);
    
    // Check if audio context is suspended
    if (spkCtx.current.state === "suspended") {
      log("🔊 Resuming suspended audio context...");
      spkCtx.current.resume().then(() => {
        log("✅ Audio context resumed");
      }).catch((err) => {
        log(`❌ Failed to resume audio context: ${err}`);
      });
    } else {
      log(`🔊 Audio context state: ${spkCtx.current.state}`);
    }
    
    try {
      // 2️⃣ Convert Int16 → Float32 and schedule playback (unchanged)
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
    micCtx.current?.close();
    spkCtx.current?.close();
    if (pingId.current) clearInterval(pingId.current);
    setConnected(false);
    setConnecting(false);
  };

  /* ───────── stop */
  const stopSession = () => {
    agentRef.current?.finish?.();
    agentRef.current?.close?.();
    cleanup();
  };

  const testMicrophone = async () => {
    try {
      setMicTestActive(true);
      log("🎤 Starting microphone test...");
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        }
      });

      const audioContext = new AudioContext({ sampleRate: 48000 });
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateVolume = () => {
        if (!micTestActive) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setMicVolume(Math.round(average));
        
        requestAnimationFrame(updateVolume);
      };
      
      updateVolume();
      
      // Stop test after 10 seconds
      setTimeout(() => {
        setMicTestActive(false);
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
        log("🎤 Microphone test completed");
      }, 10000);
      
    } catch (error) {
      log(`❌ Mic test failed: ${error}`);
      setMicTestActive(false);
    }
  };

  /* ───────── JSX UI */
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" /> Voice-Agent (debug)
          <Badge variant="outline" className="ml-2 text-xs">
            Deepgram
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {connected ? (
          <>
            {/* control row */}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" onClick={stopSession}>
                <PhoneOff className="h-4 w-4 mr-1" /> Hang up
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMuted(!muted)}>
                {muted ? (
                  <>
                    <MicOff className="h-4 w-4 mr-1" /> Un-mute
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-1" /> Mute
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={() => agentRef.current?.keepAlive()}>
                <Activity className="h-4 w-4 mr-1" /> Ping
              </Button>
            </div>

            <Separator />

            {/* live transcript */}
            <div className="text-sm whitespace-pre-wrap min-h-[3rem]">
              {transcript || "—"}
            </div>

            <Separator />

            {/* debug logs */}
            <pre className="text-xs max-h-40 overflow-y-auto bg-muted p-2 rounded">
              {logs.join("\n")}
            </pre>
          </>
        ) : (
          <Button size="sm" onClick={startSession} disabled={connecting}>
            {connecting ? (
              <>
                <Activity className="h-4 w-4 mr-1 animate-spin" /> Connecting…
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-1" /> Start Call
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default DeepgramVoiceAgentCard;

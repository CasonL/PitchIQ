import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, AgentEvents } from "@deepgram/sdk";
import { Buffer } from "buffer";
import { useSimpleLog } from "@/hooks/useSimpleLog";
import { sanitizeForDeepgramText, sanitizeGreeting, hardenSettings } from '@/utils/deepgramSanitizer';

// Helper used across multiple handlers to compare assistant text with what we asked it to say
const normalizeText = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

import { useSamScoring } from "@/hooks/useSamScoring";
import { initSpeaker, playTTS, startMicPump, ensureSpeakerReady } from "./audio";
import { audioResourceManager } from "@/utils/audioResourceManager";
import { SessionController } from "./sessionController";

// Markdown and speech sanitizers
const stripMarkdown = (s: string) =>
  s
    .replace(/```[\s\S]*?```/g, "")        // code blocks
    .replace(/[#*_>`~-]+/g, "")            // md tokens
    .replace(/\n{2,}/g, "\n")              // collapse newlines
    .trim();

const compressForSpeech = (s: string) =>
  s.split(/\n|[.!?]/).map(t => t.trim()).filter(Boolean).slice(0, 2).join(". ") + ".";

// Polyfill: DG browser SDK expects Node.Buffer in the global scope
if (typeof window !== "undefined" && !(window as any).Buffer) {
  (window as any).Buffer = Buffer;
}

const KEEPALIVE_MS = 8000;

// Global counters/locks scoped to this module
let instanceCounter = 0;
let globalSessionActive = false;

/**
 * Data SamCoach collects from the user to generate a sales persona and scenario seeds.
 */
export interface SamCoachDataPayload {
  product_service: string;
  target_market: string;
}

/**
 * Options for the SamCoach hook.
 * - onDataCollected: callback with collected product/service data
 * - onConnectionStateChange: receive connected/connecting changes
 * - autoStart: auto-start session after Deepgram token is fetched
 * - logPrefix: label used in the debug log feed
 */
export interface UseSamCoachAgentArgs {
  onDataCollected?: (data: SamCoachDataPayload) => void;
  onConnectionStateChange?: (state: { connected: boolean; connecting: boolean }) => void;
  autoStart?: boolean;
  logPrefix?: string;
}

/**
 * useSamCoachAgent
 * React hook that manages the Deepgram Agent lifecycle for Sam (PitchIQ coach):
 * - Fetches token and opens DG Agent WS
 * - Wires audio I/O (48kHz), TTS playback, mic worklet
 * - Tracks transcripts, inactivity, and integrates scoring
 * - Emits product/service info via onDataCollected when trigger phrase is detected
 */
export function useSamCoachAgent(args: UseSamCoachAgentArgs = {}) {
  const { onDataCollected, onConnectionStateChange, autoStart = true, logPrefix = "SamCoach" } = args;

  // instance id for logging
  const [instanceId] = useState(() => ++instanceCounter);
  const { messages, log, clearMessages } = useSimpleLog(`${logPrefix}#${instanceId}`);

  // connection state
  const [initializing, setInitializing] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [muted, setMuted] = useState(false);

  // Session controller for structured dialogue
  const sessionControllerRef = useRef<SessionController | null>(null);

  // Initialize session controller
  useEffect(() => {
    const ttsSpeak = async (line: string) => {
      const sanitized = sanitizeForDeepgramText(compressForSpeech(stripMarkdown(line)), 240);
      log(`🗣️ Sam speaking: "${sanitized}"`);
      setTranscript(sanitized);
      // Inject text into the Deepgram agent so it actually speaks this line
      try {
        const a: any = agentRef.current;
        if (a && typeof a.send === 'function') {
          // Open a short window to allow AI audio playback for this controller utterance
          allowAgentAudioRef.current = true;
          expectedSpeakTextRef.current = sanitized;
          matchConfirmedRef.current = false;
          // MODIFIED: Don't auto-close the gate - keep it open for natural conversation
          // if (speakWindowTimerRef.current) clearTimeout(speakWindowTimerRef.current);
          // speakWindowTimerRef.current = window.setTimeout(() => {
          //   allowAgentAudioRef.current = false;
          //   expectedSpeakTextRef.current = "";
          // }, 8000);
          a.send({ type: 'InputText', text: sanitized });
        }
      } catch (e) {
        log(`⚠️ Failed to inject InputText: ${e}`);
      }
    };

    const onPersonaGenerate = (data: { product: string; audience: string }) => {
      log(`🎯 Triggering persona generation: ${JSON.stringify(data)}`);
      if (onDataCollected) {
        onDataCollected({
          product_service: data.product,
          target_market: data.audience
        });
      }
    };

    sessionControllerRef.current = new SessionController(ttsSpeak, onPersonaGenerate);
  }, [log, onDataCollected]);

  // refs
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
  const firstSpeakTimer = useRef<number | null>(null);
  const firstSpeakHeardRef = useRef<boolean>(false);
  const greetingNudgeSentRef = useRef<boolean>(false);
  // Lifecycle guards
  const disposedRef = useRef<boolean>(false);
  const sessionEndedRef = useRef<boolean>(true);
  // Gate AI audio: allow only when controller explicitly speaks or for initial greeting
  const allowAgentAudioRef = useRef<boolean>(false);
  const speakWindowTimerRef = useRef<number | null>(null);
  // Config: ask first question inside greeting to guarantee audio
  const includeProdQuestionInGreetingRef = useRef<boolean>(true);
  // Pacing: delay first audio chunk of each AI utterance for natural timing
  const awaitingFirstAgentChunkRef = useRef<boolean>(false);
  const PACING_DELAY_MS = 4000; // static 4s for coach pacing
  const mutedRef = useRef<boolean>(false);
  const conversationHistoryRef = useRef<string[]>([]);
  const lastSettingsRef = useRef<any>(null);
  const lastAgentFinalRef = useRef<string>("");
  const expectedSpeakTextRef = useRef<string>("");
  const matchConfirmedRef = useRef<boolean>(false);
  const minimalRetryRef = useRef<boolean>(false);
  const legacyRetryRef = useRef<boolean>(false);
  const nova2RetryRef = useRef<boolean>(false);
  const agentIdRetryRef = useRef<boolean>(false);
  // If true, the next buildSettings() call will use agent.id instead of listen/speak blocks
  const nextInitAgentIdRef = useRef<boolean>(false);
  // Legacy alt retry controller
  const legacyAltRetryRef = useRef<boolean>(false);
  const nextInitLegacyAltRef = useRef<boolean>(false);

  // Scoring
  const { start: startScoring, stop: stopScoring, setSpeaker, record: recordScoringMessage } = useSamScoring();

  // Structured conversation flow state
  const [conversationStep, setConversationStep] = useState<'product' | 'market' | 'ready' | 'completed'>('product');
  const productServiceRef = useRef<string>("");
  const targetMarketRef = useRef<string>("");
  const lastSpeakerRef = useRef<"user" | "ai" | null>(null);

  // computed
  const isSessionActive = connected || connecting;

  // Reusable sanitized greeting used for post-SettingsApplied greeting nudge
  const greetingHello = useMemo(
    () =>
      sanitizeGreeting(
        "Hey there! I'm Sam.",
        200
      ),
    []
  );

  // effect: fetch token and optionally auto-start
  useEffect(() => {
    if (sdkInitialized.current) return;

    (async () => {
      try {
        log(`🔧 Fetching DG token …`);
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

        if (autoStart && !autoStarted.current && !connecting && !connected) {
          autoStarted.current = true;
          setTimeout(() => {
            if (!connecting && !connected) startSession();
          }, 500);
        }
      } catch (e) {
        log(`❌ token – ${e}`);
        setInitializing(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // effect: notify connection state
  useEffect(() => {
    onConnectionStateChange?.({ connected, connecting });
  }, [connected, connecting, onConnectionStateChange]);

  const buildSettings = useCallback(() => {
    const coachPrimer = sanitizeForDeepgramText(
      `Coaching policy: voice-to-voice; short turns (~25 words); one question max per turn; ask for specifics when vague; collect product/service and target market; when both captured say EXACTLY Great, give me a moment while I generate your persona! then stop speaking. Friendly, encouraging, conversational.`,
      700,
    );

    // Initial Settings must be minimal; greeting is sent later as a nudge

    // If flagged, prefer agent-id based configuration for the next attempt
    if (nextInitAgentIdRef.current) {
      nextInitAgentIdRef.current = false; // one-shot
      return {
        audio: {
          input: { encoding: "linear16", sampleRate: 48000 },
          output: { encoding: "linear16", sampleRate: 48000, container: "none" },
        },
        // Use agent.id only; avoid initial context/greeting to satisfy DG parser
        agent: { id: "sam-coach" },
      } as const;
    }

    // If flagged, prefer an alternate LEGACY provider-shaped payload for the next attempt
    if (nextInitLegacyAltRef.current) {
      nextInitLegacyAltRef.current = false; // one-shot
      return {
        audio: {
          input: { encoding: "linear16", sample_rate: 48000 },
          output: { encoding: "linear16", sample_rate: 48000, container: "none" },
        },
        agent: {
          // Intentionally omit language to test gateway tolerance
          listen: { provider: { type: "deepgram", model: "nova-2" } },
          think: { provider: { type: "open_ai", model: "gpt-4o-mini" } },
          speak: { provider: { type: "deepgram", model: "aura-2-asteria-en" } },
          greeting: includeProdQuestionInGreetingRef.current
            ? sanitizeGreeting("Hey there! I'm Sam. First, what do you sell?", 200)
            : greetingHello,
        },
        experimental: false,
      } as const;
    }

    // Default initial settings: legacy provider-shaped (known good with this project)
    return {
      audio: {
        input: { encoding: "linear16", sample_rate: 48000 },
        output: { encoding: "linear16", sample_rate: 48000, container: "none" },
      },
      agent: {
        listen: { 
          provider: { 
            type: "deepgram", 
            model: "nova-3",
            smart_format: false,
            keyterms: ["PitchIQ", "sales training", "roleplay", "AI coach", "discovery call"]
          } 
        },
        think: { 
          provider: { type: "open_ai", model: "gpt-4o-mini", temperature: 0.0 },
          prompt: "Short, natural sentences. No markdown. Do not ask questions on your own. Speak only text you are given."
        },
        speak: { provider: { type: "deepgram", model: "aura-2-asteria-en" } },
        greeting: includeProdQuestionInGreetingRef.current
          ? "Hey there! I'm Sam. First, what do you sell?"
          : "Hey there! I'm Sam.",
      },
      experimental: false,
    } as const;
  }, []);

  const startInactivityTimer = useCallback(() => {
    log("⏰ Starting inactivity timer (3 minutes)");
    resetInactivityTimer();
  }, [log]);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    setInactivityWarning(false);

    // 2.5 minute warning
    setTimeout(() => {
      if (connected && !sessionEnded) {
        setInactivityWarning(true);
      }
    }, 150000);

    inactivityTimer.current = window.setTimeout(() => {
      log("⏰ No speech activity for 3 minutes - terminating session");
      stopSession();
    }, 180000);
  }, [connected, sessionEnded, log]);

  const startSession = useCallback(async () => {
    log("▶️ startSession invoked");

    if (connecting || connected || globalSessionActive) {
      log("⚠️ Session already active or connecting, skipping");
      return;
    }
    if (!dgRef.current) {
      log("🚫 Deepgram SDK not ready yet");
      return;
    }

    // Lock
    globalSessionActive = true;
    log(`🔒 Global session lock acquired by instance #${instanceId}`);

    if (connecting || connected) {
      log("⚠️ Another session started while acquiring lock, releasing and aborting");
      globalSessionActive = false;
      return;
    }

    // Cleanup any existing agent
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

    setConnecting(true);
    setConnected(false);
    setSessionEnded(false);
    sessionEndedRef.current = false;

    try {
      // Request mic
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
      });

      log("✅ Mic granted");
      try {
        const track = stream.getAudioTracks?.()[0];
        const s = track?.getSettings?.();
        if (s) {
          log(`🎤 Mic settings: ${s.sampleRate || 'unknown'}Hz, ${s.channelCount || 'unknown'}ch`);
        }
      } catch {}
      micStream.current = stream;
      agentRef.current = dgRef.current.agent();
      const a = agentRef.current;

      // Debug any event
      a.on("*", (evt: any) => {
        const eventType = evt?.type || "unknown";
        if (eventType !== "unknown") log(`📡 DG → ${eventType} ${eventType.includes("Audio") ? "🔊" : ""}`);
      });

      a.on(AgentEvents.Open, () => {
        log("🌐 WS open → settings");
        try {
          const originalSend = (a as any).send?.bind(a);
          if (originalSend && !(a as any).__wrappedSend) {
            (a as any).__wrappedSend = true;
            (a as any).send = (payload: any) => {
              try {
                // Only log initial Settings messages; suppress KeepAlive and others
                if (typeof payload === 'string' && payload.includes('"type":"Settings"')) {
                  log("📤 WS OUT → " + payload.slice(0, 400));
                }
              } catch {}
              return originalSend(payload);
            };
          }
        } catch {}
        const useLegacyAltInit = nextInitLegacyAltRef.current;
        const rawSettings = buildSettings();
        const preserveLegacy = useLegacyAltInit || !!rawSettings?.agent?.listen?.provider || !!rawSettings?.agent?.speak?.provider;
        const hardened = hardenSettings(rawSettings, preserveLegacy ? { preserveLegacy: true } : undefined);
        lastSettingsRef.current = hardened;
        log("🛠️ Settings payload → " + JSON.stringify(hardened, null, 2));
        a.configure(hardened);
        log("✅ Settings sent - waiting for SettingsApplied...");

        initSpeaker(spkCtx, playHead);

        pingId.current = window.setInterval(() => a.keepAlive(), KEEPALIVE_MS);
        setConnected(true);
        setConnecting(false);
      });

      a.on(AgentEvents.SettingsApplied, () => {
        log("✅ Settings ACK - starting mic");
        // Explicitly start the agent after settings are applied (matches working pattern)
        try {
          log("▶️ Calling agent.start() to begin streaming");
          a.start?.();
        } catch (e) {
          log(`⚠️ Error calling agent.start(): ${e}`);
        }
        startMicPump({
          micStreamRef: micStream,
          agentRef,
          micCtxRef: micCtx,
          micNodeRef: micNode,
          mutedRef,
          log,
        });
        startInactivityTimer();
        startScoring().catch((e) => log(`⚠️ SamScoring start failed: ${e}`));
        // Allow initial greeting audio to play (no match confirmation needed)
        allowAgentAudioRef.current = true;
        matchConfirmedRef.current = true;
        // MODIFIED: Don't auto-close the gate - keep it open for natural conversation
        // if (speakWindowTimerRef.current) clearTimeout(speakWindowTimerRef.current);
        // speakWindowTimerRef.current = window.setTimeout(() => {
        //   allowAgentAudioRef.current = false;
        // }, 8000);
        log("🔓 Audio gate opened and will stay open for natural conversation");
        // Note: avoid post-ACK context injection to keep payloads parser-safe
      });

      a.on(AgentEvents.AgentAudioDone, () => {
        log("📡 DG → AgentAudioDone 🔇");
        // MODIFIED: Keep gate open for natural conversation flow
        // Don't close the gate - let Sam respond naturally to user input
        log("🔓 Keeping audio gate open for continued conversation");
        // if (!expectedSpeakTextRef.current) {
        //   allowAgentAudioRef.current = false;
        // }
        // Auto-unmute after greeting so the user can respond naturally
        if (mutedRef.current) {
          setMuted(false);
          mutedRef.current = false;
          log("🎤 Auto-unmuted microphone after AI finished speaking");
        }
        // After the initial greeting, ensure the product question is audible
        if (!greetingNudgeSentRef.current && sessionControllerRef.current) {
          try {
            greetingNudgeSentRef.current = true; // mark before to avoid reentry
            const gf = (lastAgentFinalRef.current || "").toLowerCase();
            const asked = gf.includes("what do you sell");
            if (includeProdQuestionInGreetingRef.current && asked) {
              sessionControllerRef.current.alignAfterIntro();
              log("🧭 Greeting included product question; aligned state to ASK_PRODUCT");
            } else {
              // Fallback: explicitly ask via controller to guarantee audio
              sessionControllerRef.current.beginAfterGreeting();
              log("🧭 Greeting did not include product question; asking now");
            }
          } catch {}
        }
      });
      a.on(AgentEvents.AgentThinking, () => log("📡 DG → AgentThinking 🤔"));

      a.on(AgentEvents.AgentStartedSpeaking, () => {
        log("📡 DG → AgentStartedSpeaking 🗣️");
        try {
          setSpeaker("ai");
        } catch {}
        // If we initiated a controller line, consider it matched on speak start
        if (expectedSpeakTextRef.current) {
          matchConfirmedRef.current = true;
          if (speakWindowTimerRef.current) {
            clearTimeout(speakWindowTimerRef.current);
            speakWindowTimerRef.current = null;
          }
        }
        resetInactivityTimer();
        firstSpeakHeardRef.current = true;
        awaitingFirstAgentChunkRef.current = true;
      });

      a.on(AgentEvents.ConversationText, (msg: any) => {
        // Sanitize content for speech
        const sanitized = compressForSpeech(stripMarkdown(msg.content));
        log(`📡 DG → ConversationText (final): "${sanitized}"`);
        resetInactivityTimer();

        // Feed user utterances to controller immediately and display them
        if (msg.role === "user") {
          if (sessionControllerRef.current) {
            sessionControllerRef.current.onUserUtterance(msg.content);
          }
          setTranscript(sanitized);
          try { recordScoringMessage(sanitized); } catch {}
        } else {
          // Assistant text: decide whether to display based on gate/match
          try { lastAgentFinalRef.current = String(msg.content || ""); } catch {}
          let allowDisplay = false;
          if (allowAgentAudioRef.current) {
            if (expectedSpeakTextRef.current) {
              const nExp = normalizeText(expectedSpeakTextRef.current);
              const nGot = normalizeText(msg.content);
              const match = nGot.includes(nExp) || nExp.includes(nGot);
              if (match) {
                matchConfirmedRef.current = true;
                allowDisplay = true;
              } else {
                // Do not close the gate early; keep waiting for controller line
                allowDisplay = false;
                log("⚠️ Assistant text didn't match expected; keeping gate open for controller line");
              }
            } else {
              // Gate open but no specific expected text (e.g., greeting window)
              allowDisplay = true;
            }
          } else {
            // Gate closed: generally suppress assistant chatter
            allowDisplay = false;
          }

          if (allowDisplay) {
            setTranscript(sanitized);
          }
          try { recordScoringMessage(sanitized); } catch {}
        }

        const lowerText = String(msg.content || "").toLowerCase().trim();
        conversationHistoryRef.current.push(msg.content);
        if (conversationHistoryRef.current.length > 10) {
          conversationHistoryRef.current = conversationHistoryRef.current.slice(-10);
        }

        // Legacy structured conversation flow logic (disabled when SessionController is active)
        if (!sessionControllerRef.current) {
          const isUserMessage = !lowerText.includes("i'm sam") && 
                               !lowerText.includes("what do you sell") && 
                               !lowerText.includes("who is your target market") &&
                               !lowerText.includes("perfect! say 'generate persona'") &&
                               !lowerText.includes("creating your persona now") &&
                               msg.content.length > 5;

          if (isUserMessage) {
            lastSpeakerRef.current = "user";
            
            // Check for persona generation trigger phrase
            if (lowerText.includes("generate persona") || lowerText.includes("create persona")) {
              log(`🎭 User requested persona generation`);
              if (onDataCollected && productServiceRef.current && targetMarketRef.current) {
                log(`🎮 Triggering persona generation with: product="${productServiceRef.current}", market="${targetMarketRef.current}"`);
                onDataCollected({ 
                  product_service: productServiceRef.current, 
                  target_market: targetMarketRef.current 
                });
                setConversationStep('completed');
              } else {
                log("⚠️ Cannot trigger persona generation - missing product/market data");
              }
              return;
            }

            // Capture answers based on conversation step
            if (conversationStep === 'product' && !productServiceRef.current) {
              productServiceRef.current = msg.content.trim();
              log(`📝 Captured product/service: "${productServiceRef.current}"`);
              setConversationStep('market');
            } else if (conversationStep === 'market' && !targetMarketRef.current) {
              targetMarketRef.current = msg.content.trim();
              log(`📝 Captured target market: "${targetMarketRef.current}"`);
              setConversationStep('ready');
            }
          } else {
            lastSpeakerRef.current = "ai";
          }
        }
      });

      a.on(AgentEvents.Audio, (payload: any) => {
        // MODIFIED: Always allow AI audio for natural conversation
        // The original gating logic was too restrictive for free-form conversation
        if (!allowAgentAudioRef.current) {
          log("🔓 Opening audio gate for AI response");
          allowAgentAudioRef.current = true;
        }
        log("📡 DG → AgentAudio event received! 🔊");
        firstSpeakHeardRef.current = true;
        const playChunk = async () => {
          const ready = await ensureSpeakerReady(spkCtx, playHead, { log, sampleRate: 48000 });
          if (ready) {
            playTTS(spkCtx, playHead, payload, 48000, log);
          } else {
            log("⚠️ Skipping audio - speaker not ready");
          }
        };
        if (awaitingFirstAgentChunkRef.current) {
          awaitingFirstAgentChunkRef.current = false;
          log(`⏳ Pacing first AI audio chunk by ${PACING_DELAY_MS}ms`);
          setTimeout(() => void playChunk(), PACING_DELAY_MS);
        } else {
          void playChunk();
        }
      });

      a.on(AgentEvents.Error, (e: any) => {
        if (e.code === "CLIENT_MESSAGE_TIMEOUT") {
          log("⏰ Session timeout - no speech detected for a while");
        } else {
          log(`🚨 DG error ${JSON.stringify(e)}`);
          const code = e?.code || e?.data?.code || '';
          const msg = e?.message || e?.data?.message || '';
          if (code === "UNPARSABLE_CLIENT_MESSAGE" || /UNPARSABLE_CLIENT_MESSAGE/i.test(String(msg))) {
            log("🧩 Last settings payload (hardened) → " + JSON.stringify(lastSettingsRef.current, null, 2));
            // 1) Legacy provider-shaped FIRST (remove endpointing fields)
            if (!legacyRetryRef.current) {
              legacyRetryRef.current = true;
              log("🔁 Retrying with LEGACY provider-shaped settings (nova-3, no endpointing)…");
              try {
                const legacy = hardenSettings({
                  audio: {
                    input: { encoding: "linear16", sample_rate: 48000 },
                    output: { encoding: "linear16", sample_rate: 48000, container: "none" },
                  },
                  agent: {
                    language: "en-US",
                    listen: { provider: { type: "deepgram", model: "nova-3" } },
                    think: { provider: { type: "open_ai", model: "gpt-4o-mini" } },
                    speak: { provider: { type: "deepgram", model: "aura-2-asteria-en" } },
                  },
                  experimental: false,
                }, { preserveLegacy: true });
                lastSettingsRef.current = legacy;
                log("🧪 LEGACY Settings payload → " + JSON.stringify(legacy, null, 2));
                a.configure(legacy);
                log("✅ Legacy settings sent - awaiting SettingsApplied...");
                return;
              } catch (err) {
                log(`❌ Legacy settings retry failed: ${err}`);
              }
            }
            // 2) Strict schema but fallback model 'nova-2'
            if (!nova2RetryRef.current) {
              nova2RetryRef.current = true;
              log("🔁 A/B retry with STRICT settings and listen.model='nova-2' …");
              try {
                const strictNova2 = hardenSettings({
                  audio: {
                    input: { encoding: "linear16", sampleRate: 48000 },
                    output: { encoding: "linear16", sampleRate: 48000, container: "none" },
                  },
                  agent: {
                    listen: { model: "nova-2" },
                    think: {
                      provider: { type: "open_ai" },
                      model: "gpt-4o-mini",
                      instructions: "Speak like a person. No markdown. Short sentences. Ask what they sell, then who they sell to. Confirm then stop."
                    },
                    speak: { model: "aura-asteria-en" },
                  },
                });
                lastSettingsRef.current = strictNova2;
                log("🧪 STRICT (nova-2) Settings payload → " + JSON.stringify(strictNova2, null, 2));
                a.configure(strictNova2);
                log("✅ Strict nova-2 settings sent - awaiting SettingsApplied...");
                return; // wait for result before attempting other fallbacks
              } catch (err) {
                log(`❌ Strict nova-2 retry failed: ${err}`);
              }
            }
            // 3) Agent ID based
            if (!agentIdRetryRef.current) {
              agentIdRetryRef.current = true;
              log("🔁 Retrying with AGENT ID payload (agent.id='sam-coach') …");
              try {
                const byId = hardenSettings({
                  audio: {
                    input: { encoding: "linear16", sampleRate: 48000 },
                    output: { encoding: "linear16", sampleRate: 48000, container: "none" },
                  },
                  agent: { id: "sam-coach" },
                });
                lastSettingsRef.current = byId;
                log("🧪 AGENT-ID Settings payload → " + JSON.stringify(byId, null, 2));
                a.configure(byId);
                log("✅ Agent-ID settings sent - awaiting SettingsApplied...");
                return;
              } catch (err) {
                log(`❌ Agent-ID settings retry failed: ${err}`);
              }
            }
            // 4) Minimal strict again for coverage
            if (!minimalRetryRef.current) {
              minimalRetryRef.current = true;
              log("🔁 Retrying with MINIMAL settings payload (listen: 'nova-3-general', no context)…");
              try {
                const minimal = hardenSettings({
                  audio: {
                    input: { encoding: "linear16", sampleRate: 48000 },
                    output: { encoding: "linear16", sampleRate: 48000, container: "none" },
                  },
                  agent: {
                    listen: { model: "nova-3-general" },
                    think: { provider: { type: "open_ai" }, model: "gpt-4o-mini", instructions: "You are Sam." },
                    speak: { model: "aura-asteria-en" },
                  },
                });
                lastSettingsRef.current = minimal;
                log("🧪 MINIMAL Settings payload → " + JSON.stringify(minimal, null, 2));
                a.configure(minimal);
                log("✅ Minimal settings sent - awaiting SettingsApplied...");
              } catch (err) {
                log(`❌ Minimal settings retry failed: ${err}`);
              }
            }
          }
        }
      });

      a.on(AgentEvents.Close, (evt?: any) => {
        const code = (evt?.code ?? evt?.data?.code ?? 'unknown');
        const reason = (evt?.reason ?? evt?.data?.reason ?? '');
        log(`🌐 WS closed code=${code} reason=${reason}`);
        try {
          stopScoring();
        } catch {}
        // If we've been told to stop or unmounted, skip any reconnect logic
        if (disposedRef.current || sessionEndedRef.current) {
          log("🔚 WS closed after stop/unmount - skipping reconnect");
          cleanup();
          return;
        }
        const is1005 = (code === 1005 || code === '1005' || String(code) === 'unknown');
        const wasLegacy = !!lastSettingsRef.current?.agent?.listen?.provider;
        // If legacy attempt closed with 1005, try an alternate legacy variant on reconnect
        if (is1005 && wasLegacy && !legacyAltRetryRef.current) {
          legacyAltRetryRef.current = true;
          log("🔁 Reconnecting with LEGACY alt variant (listen:nova-2, no language, container:none, speak:aura-2-asteria-en)…");
          nextInitLegacyAltRef.current = true;
          // Reset other retry flags for a clean pass
          minimalRetryRef.current = false;
          nova2RetryRef.current = false;
          agentIdRetryRef.current = false;
          cleanup();
          setTimeout(() => {
            if (!connecting && !connected) startSession();
          }, 300);
          return;
        }
        // If we previously tried strict nova-2 and haven't attempted agent-id yet, restart with agent-id
        const shouldSwitchToAgentId = is1005 && nova2RetryRef.current && !agentIdRetryRef.current;
        cleanup();
        if (shouldSwitchToAgentId) {
          log("🔁 Reconnecting with AGENT ID as initial settings (agent.id='sam-coach') …");
          nextInitAgentIdRef.current = true;
          // Reset retry flags for a clean attempt (avoid skipping future fallbacks)
          minimalRetryRef.current = false;
          legacyRetryRef.current = false;
          nova2RetryRef.current = false;
          // Do not set agentIdRetryRef here; we are using agent-id as initial settings on reconnect
          setTimeout(() => {
            if (!connecting && !connected) startSession();
          }, 300);
        }
      });
    } catch (e) {
      log(`❌ startSession – ${e}`);
      setConnecting(false);
    }
  }, [log, connecting, connected, buildSettings, startInactivityTimer, resetInactivityTimer, onDataCollected, instanceId, startScoring, stopScoring]);

  const cleanup = useCallback(() => {
    log(`🧹 Starting SamCoach cleanup for instance #${instanceId}`);
    
    // Stop media streams
    if (micStream.current) {
      audioResourceManager.cleanupStream(micStream.current);
      micStream.current = null;
    }
    
    // Cleanup worklet
    if (micNode.current) {
      audioResourceManager.cleanupWorklet(micNode.current);
      micNode.current = null;
    }
    
    try {
      stopScoring();
    } catch {}

    // Cleanup audio contexts through resource manager
    if (micCtx.current && micCtx.current.state !== "closed") {
      audioResourceManager.cleanupContext(micCtx.current);
      micCtx.current = null;
    }
    if (spkCtx.current && spkCtx.current.state !== "closed") {
      audioResourceManager.cleanupContext(spkCtx.current);
      spkCtx.current = null;
    }

    if (pingId.current) clearInterval(pingId.current);
    if (firstSpeakTimer.current) clearTimeout(firstSpeakTimer.current);

    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }

    globalSessionActive = false;
    log(`🔓 Global session lock released by instance #${instanceId}`);

    setConnected(false);
    setConnecting(false);
    
    log(`✅ SamCoach cleanup completed for instance #${instanceId}`);
  }, [log, instanceId, stopScoring]);

  const stopSession = useCallback(() => {
    log("🛑 Stopping session...");
    sessionEndedRef.current = true;
    setSessionEnded(true);
    setConnected(false);
    setConnecting(false);
    setInactivityWarning(false);
    try {
      stopScoring();
    } catch {}

    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = null;
    }

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
  }, [cleanup, log, stopScoring]);

  const restartSession = useCallback(() => {
    if (connecting || connected) {
      log("⚠️ Session already active, cannot restart");
      return;
    }
    log("🔄 Restarting session...");
    setSessionEnded(false);
    setTranscript("");
    setMuted(false);
    mutedRef.current = false;
    setInactivityWarning(false);
    setInitializing(false);
    autoStarted.current = false;

    setTimeout(() => {
      if (!connecting && !connected) startSession();
    }, 500);
  }, [connecting, connected, log, startSession]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const newMuted = !prev;
      mutedRef.current = newMuted;
      log(`🎤 ${newMuted ? "Muted" : "Unmuted"} microphone (instance #${instanceId})`);
      return newMuted;
    });
  }, [log, instanceId]);

  useEffect(() => {
    return () => {
      disposedRef.current = true;
      instanceCounter--;
      log(`🧹 Hook instance #${instanceId} unmounting (remaining: ${instanceCounter})`);

      if (agentRef.current) {
        try {
          agentRef.current?.finish?.();
          agentRef.current?.close?.();
        } catch (e) {
          log(`⚠️ Error during unmount cleanup: ${e}`);
        }
        agentRef.current = null;
      }

      globalSessionActive = false;
      log(`🔓 Global session lock released by instance #${instanceId}`);

      stopSession();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // state
    initializing,
    connected,
    connecting,
    sessionEnded,
    inactivityWarning,
    transcript,
    muted,
    isSessionActive,
    // actions
    startSession,
    stopSession,
    restartSession,
    toggleMute,
    // debug
    log,
    messages,
    clearMessages,
  } as const;
}

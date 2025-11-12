import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, AgentEvents } from "@deepgram/sdk";
import { initSpeaker, ensureSpeakerReady, playTTS, startMicPump, stopAllTTS } from "./audio";
import { createSpeakQueue } from "./speakQueue";
import type { PersonaExtras } from "./ManualAnswerForms";
import { useSamScoring } from "@/hooks/useSamScoring";

interface Props {
  autoStart?: boolean;
  onDataCollected?: (data: { product: string; audience: string; product_extras?: PersonaExtras; audience_extras?: PersonaExtras }) => void;
  onPrefillSuggestion?: (payload: { type: "product" | "audience"; text: string }) => void;
  exposeControls?: (controls: {
    confirmProduct?: (product: string, extras?: PersonaExtras) => Promise<void>;
    confirmAudience?: (audience: string, extras?: PersonaExtras) => Promise<void>;
  }) => void;
}

// Minimal, reliable intro for Sam:
// - Ask product (listen)
// - Speak confirm line, enable product confirm
// - After confirm, ask audience (listen)
// - Speak confirm line, enable audience confirm
// - After confirm, speak closing and end session
export const SamCoachIntroSimple: React.FC<Props> = ({
  autoStart = true,
  onDataCollected,
  onPrefillSuggestion,
  exposeControls,
}) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deepgram + audio
  const dgRef = useRef<any>(null);
  const agentRef = useRef<any>(null);
  const micStream = useRef<MediaStream | null>(null);
  const micCtx = useRef<AudioContext | null>(null);
  const micNode = useRef<AudioWorkletNode | null>(null);
  const spkCtx = useRef<AudioContext | null>(null);
  const playHead = useRef<number>(0);

  // Gate TTS playback to our injected speak windows only
  const gateOpenRef = useRef(false);
  const inSpeakRef = useRef(false);
  const pendingEnableRef = useRef<null | 'product' | 'audience'>(null);
  const bargeInProtectUntilRef = useRef<number>(0); // Timestamp until which barge-in is blocked

  // Flow state
  type Stage = 'product_listen' | 'product_confirm' | 'audience_listen' | 'audience_confirm' | 'done';
  const stageRef = useRef<Stage>('product_listen');
  const productRef = useRef<string>("");
  const audienceRef = useRef<string>("");
  const productExtrasRef = useRef<PersonaExtras | undefined>(undefined);
  const audienceExtrasRef = useRef<PersonaExtras | undefined>(undefined);

  // Accumulate short user phrases and commit after brief silence
  const userBufferRef = useRef<string>("");
  const userSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scoring (kept for continuity)
  const { start: startScoring, stop: stopScoring, setSpeaker, record: recordScoringMessage } = useSamScoring();

  // Simple speak queue
  const speakQueue = useMemo(() => createSpeakQueue((m) => console.log("[SimpleIntro]", m)), []);

  // Normalize/format field display
  const normalizeForField = useCallback((s: string) => {
    let t = String(s || '').trim();
    t = t.replace(/^(i\s*saw|iso)\b/i, 'I sell');
    t = t.replace(/^(i|we)\s+(sell|offer|provide|do|build|make|deliver)\s+/i, '');
    t = t.replace(/^(it'?s|its|it is)\s+/i, '');
    t = t.replace(/\s+/g, ' ').replace(/^[\s\-_.:,]+|[\s\-_.:,]+$/g, '');
    const acronyms = new Set(['AI','SaaS','CRM','API','B2B','B2C','SEO']);
    const words = t.split(' ').filter(Boolean).map(w => {
      const core = w.replace(/[()\[\]{}.,!?]/g, '');
      if (acronyms.has(core.toUpperCase())) return core.toUpperCase();
      return core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
    });
    return words.join(' ');
  }, []);

  // Inject initial greeting to kickstart Sam
  const say = useCallback(async (line: string) => {
    gateOpenRef.current = true;
    inSpeakRef.current = true;
    const wordCount = line.split(/\s+/).length;
    const protectMs = wordCount * 180 + 1500;
    bargeInProtectUntilRef.current = Date.now() + Math.max(3000, Math.min(8000, protectMs));
    try {
      await speakQueue.speak(line, { timeoutMs: 12000 });
    } catch {}
  }, [speakQueue]);

  // Intelligently summarize what user said using LLM
  const summarizeUserInput = useCallback(async (rawText: string, type: 'product' | 'audience'): Promise<string> => {
    try {
      // Clean up common prefixes
      let cleanedText = rawText;
      if (type === 'product') {
        cleanedText = rawText
          .replace(/^(I sell|we sell|I'm selling|we're selling|I do|we do)\s+/i, '')
          .trim();
      }
      if (type === 'audience') {
        cleanedText = rawText
          .replace(/^(I sell to|we sell to|our customers are|our clients are)\s+/i, '')
          .trim();
      }
      
      // Don't even try to summarize if cleaned text is too short - prevents hallucination
      const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount < 3) {
        console.log(`[SimpleIntro] ⚠️ Cleaned text too short (${wordCount} words): "${cleanedText}" - returning as-is`);
        return cleanedText;
      }
      const prompt = type === 'product' 
        ? `Someone just told me their product/service is: "${cleanedText}"

IMPORTANT: This text may contain speech-to-text errors (like "parks" instead of "acts"). Fix any obvious transcription errors.

Then summarize into a clean, professional 3-8 word description. Stay close to what they actually said - only make assumptions to fix transcription errors or fill obvious gaps.

Examples:
- "we do AI training for sales" → "AI-Powered Sales Training Platform"
- "platform that parks as a bartering system" → "Service Barter & Exchange Platform"
- "help companies with their marketing" → "Marketing Consulting & Strategy Services"
- "platform where people trade services" → "Service Exchange & Barter Platform"

Just respond with the clean description, nothing else.`
        : `Someone told me they sell to: "${cleanedText}"

IMPORTANT: This text may contain speech-to-text errors. Fix any obvious transcription errors.

Then summarize into a clean, specific 3-8 word target audience description. Stay close to what they actually said - only make assumptions to fix transcription errors.

Examples:
- "small business owners" → "Small Business Owners & Entrepreneurs"
- "people who need marketing help" → "Business Leaders Seeking Marketing Growth"
- "companies" → "Mid-Market & Enterprise Companies"

Just respond with the clean description, nothing else.`;

      const response = await fetch('/api/summarize-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text: rawText, type, prompt })
      });

      if (!response.ok) throw new Error('Summarization failed');
      const data = await response.json();
      return data.summary || normalizeForField(rawText);
    } catch (err) {
      console.log('[SimpleIntro] ⚠️ Summarization failed, using raw text');
      return normalizeForField(rawText);
    }
  }, [normalizeForField]);

  // When user speaks, Sam summarizes and shows form
  const commitUserText = useCallback(async () => {
    const text = String(userBufferRef.current || '').trim();
    if (!text) return;
    
    recordScoringMessage(text);
    
    // Let Sam intelligently summarize what they said
    if (stageRef.current === 'product_listen') {
      const summary = await summarizeUserInput(text, 'product');
      const wordCount = summary.split(/\s+/).length;
      
      // If summary is too short, keep listening - Sam will naturally ask for more
      if (wordCount < 3) {
        console.log(`[SimpleIntro] ⚠️ Summary too short (${wordCount} words): "${summary}" - staying in listen mode`);
        
        // Keep buffer and stay in product_listen mode
        // Sam's natural LLM will ask for clarification
        return;
      }
      
      userBufferRef.current = ''; // Clear buffer
      productRef.current = summary;
      try { onPrefillSuggestion?.({ type: 'product', text: summary }); } catch {}
      stageRef.current = 'product_confirm';
      console.log(`[SimpleIntro] 🧠 Sam understood: "${text}" as "${summary}"`);
    } else if (stageRef.current === 'audience_listen') {
      const summary = await summarizeUserInput(text, 'audience');
      const wordCount = summary.split(/\s+/).length;
      
      // If summary is too short, keep listening - Sam will naturally ask for more
      if (wordCount < 3) {
        console.log(`[SimpleIntro] ⚠️ Summary too short (${wordCount} words): "${summary}" - staying in listen mode`);
        
        // Keep buffer and stay in audience_listen mode
        // Sam's natural LLM will ask for clarification
        return;
      }
      
      userBufferRef.current = ''; // Clear buffer
      audienceRef.current = summary;
      try { onPrefillSuggestion?.({ type: 'audience', text: summary }); } catch {}
      stageRef.current = 'audience_confirm';
      console.log(`[SimpleIntro] 🧠 Sam understood: "${text}" as "${summary}"`);
    }
  }, [recordScoringMessage, summarizeUserInput, onPrefillSuggestion]);

  // Confirm handlers (exposed to parent) - these will be called by button clicks
  const confirmProduct = useCallback(async (product: string, extras?: PersonaExtras) => {
    // Prevent double-calls
    if (stageRef.current !== 'product_confirm') return;
    
    productRef.current = normalizeForField(product || productRef.current);
    productExtrasRef.current = extras;
    
    // Clear the buffer now that they've confirmed
    userBufferRef.current = "";
    
    // Enthusiastic transition to audience question
    const transitions = ['Amazing!', 'Perfect!', 'Great!', 'Awesome!'];
    const transition = transitions[Math.floor(Math.random() * transitions.length)];
    
    stageRef.current = 'audience_listen';
    await say(`${transition} Now, who do you sell to?`);
    
    console.log(`[SimpleIntro] ✅ Product confirmed: "${productRef.current}"`);
  }, [normalizeForField, say]);

  const confirmAudience = useCallback(async (aud: string, extras?: PersonaExtras) => {
    audienceRef.current = normalizeForField(aud || audienceRef.current);
    
    // Quick acknowledgment (1-4 words)
    const acks = ['Perfect!', 'Great!', 'Excellent!', 'Love it!'];
    const ack = acks[Math.floor(Math.random() * acks.length)];
    await say(ack);
    
    try {
      onDataCollected?.({
        product: productRef.current,
        audience: audienceRef.current,
        product_extras: productExtrasRef.current,
        audience_extras: extras,
      });
      console.log(`[SimpleIntro] 🎯 Full data collected with extras`);
    } catch {}
    
    stageRef.current = 'done';
    await say('Generating your persona now.');
    console.log(`[SimpleIntro] ✅ Audience confirmed: "${audienceRef.current}"`);
    // Stop will be called after this callback completes
    setTimeout(() => {
      try { stop(); } catch {}
    }, 100);
  }, [normalizeForField, onDataCollected, say]);

  // Expose controls once on mount
  useEffect(() => {
    exposeControls?.({ confirmProduct, confirmAudience });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start/stop session
  const start = useCallback(async () => {
    if (connecting || connected) return;
    setConnecting(true);
    try {
      const res = await fetch("/api/deepgram/token", { credentials: "include" });
      const data = await res.json();
      const token = data?.token || data?.key;
      if (!token) throw new Error("No Deepgram token");

      // Pre-warm mic to avoid worklet start race
      try {
        if (!micStream.current) {
          micStream.current = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 1
            } 
          });
          console.log('[SimpleIntro] 🎤 Mic granted');
        }
      } catch (e) {
        console.log('[SimpleIntro] ❌ Mic capture failed:', e);
      }

      dgRef.current = createClient(token);
      const agent = dgRef.current.agent();
      agentRef.current = agent;

      agent.on(AgentEvents.Open, () => {
        const settings = {
          audio: {
            input: { encoding: "linear16", sample_rate: 48000 },
            output: { encoding: "linear16", sample_rate: 48000, container: "none" },
          },
          agent: {
            listen: { 
              provider: { 
                type: "deepgram", 
                model: "nova-2",
                endpointing: 10000
              }
            },
            think: {
              provider: { type: "open_ai", model: "gpt-4o-mini", temperature: 0.7 },
              prompt: `You are Sam, an enthusiastic sales coach helping someone set up their first AI role-play call.

Your conversation flow:
1. Greet them: "Hey, I'm Sam. What do you sell?"
2. When they answer, acknowledge it naturally with personality (1 short sentence showing you understand), then say: "If everything looks right, please press continue."
3. After that, stay silent until they press the button

IMPORTANT: 
- If they give you ANY product/service description (even 2-3 words like "marketing services" or "consulting"), that's COMPLETE. Don't ask for more.
- Only ask "Tell me more about that" if they literally say nothing or just "um" or "I sell..."
- Most answers are complete. Trust them.

Be conversational, enthusiastic, and brief. Show you understand what they do in one sentence, then prompt them to continue. Never say their message was "cut off"!`,
            },
            speak: { provider: { type: "deepgram", model: "aura-2-asteria-en" } },
          },
          experimental: false,
        } as const;
        try { speakQueue.attachAgent(agent); } catch {}
        agent.configure(settings);
      });

      agent.on(AgentEvents.SettingsApplied, async () => {
        // Begin streaming & playback
        startMicPump({ micStreamRef: micStream, agentRef, micCtxRef: micCtx, micNodeRef: micNode, mutedRef: { current: false }, log: (m: string) => console.log('[SimpleIntro]', m) });
        if (!spkCtx.current || spkCtx.current.state === 'closed') {
          initSpeaker(spkCtx, playHead);
          console.log('[SimpleIntro] 🔊 Created speaker AudioContext');
        }
        // CRITICAL: Force resume AudioContext to unlock audio playback
        if (spkCtx.current) {
          try {
            await spkCtx.current.resume();
            console.log('[SimpleIntro] 🔊 AudioContext state after resume:', spkCtx.current.state);
          } catch (e) {
            console.error('[SimpleIntro] ❌ Failed to resume AudioContext:', e);
          }
        }
        setConnected(true);
        setConnecting(false);
        startScoring().catch(() => {});
        setSpeaker('ai');
        stageRef.current = 'product_listen';
        // Kickstart Sam with her initial greeting
        say("Hey, I'm Sam. What do you sell?").catch(() => {});
      });

      agent.on(AgentEvents.AgentStartedSpeaking, () => {
        // Sam is speaking - allow audio to play and set protection
        gateOpenRef.current = true;
        inSpeakRef.current = true;
        // Set reasonable initial protection (will be adjusted when we see transcript)
        bargeInProtectUntilRef.current = Date.now() + 2500;
      });

      agent.on(AgentEvents.AgentAudioDone, () => {
        // Don't close gate - keep it open for autonomous conversation flow
        // Gate only closes when user starts speaking (outside protection window)
        inSpeakRef.current = false;
      });

      agent.on(AgentEvents.ConversationText, (msg: any) => {
        const isUser = msg.role === 'user';
        const text = String(msg.content || '').trim();
        if (!text) return;
        console.log(`[SimpleIntro] [${isUser ? 'User' : 'Sam'}]: "${text}"`);
        try { recordScoringMessage(text); } catch {}

        if (isUser) {
          // Ignore user messages if we're already in confirm stage (waiting for button click)
          if (stageRef.current === 'product_confirm' || stageRef.current === 'audience_confirm') {
            console.log(`[SimpleIntro] ⏸️ Ignoring user input in ${stageRef.current} stage`);
            return;
          }
          
          // User speaking - accumulate all chunks from Deepgram
          const currentBuffer = String(userBufferRef.current || '');
          
          // Deepgram sends both progressive updates AND separate chunks
          // If new text is longer, it's likely an updated transcript - replace it
          // If it's shorter or different, it's a new chunk - append it
          if (text.length > currentBuffer.length && currentBuffer && text.includes(currentBuffer.substring(0, 20))) {
            // This looks like an updated/expanded version of what we have
            userBufferRef.current = text;
          } else if (currentBuffer && text !== currentBuffer) {
            // This is a new chunk - append it
            userBufferRef.current = currentBuffer + ' ' + text;
          } else if (!currentBuffer) {
            // First chunk
            userBufferRef.current = text;
          }
          
          // Dynamic timeout based on sentence completeness
          const buffer = userBufferRef.current;
          const wordCount = buffer.split(/\s+/).length;
          const lastWord = buffer.trim().split(/\s+/).pop()?.toLowerCase() || '';
          
          // Words that indicate the sentence is incomplete
          const incompleteWords = ['and', 'or', 'but', 'because', 'so', 'that', 'which', 'who', 'when', 'where', 'how', 'if', 'with', 'for', 'to', 'a', 'an', 'the'];
          
          let timeoutMs: number;
          
          if (incompleteWords.includes(lastWord)) {
            // Ends on incomplete word - definitely more coming
            timeoutMs = 10000; // 10 seconds
          } else if (wordCount <= 3) {
            // Very short - probably incomplete (e.g., "I sell")
            timeoutMs = 8000; // 8 seconds
          } else if (wordCount <= 8) {
            // Short phrase - might be incomplete (e.g., "I sell AI training")
            timeoutMs = 6000; // 6 seconds
          } else {
            // Longer sentence - likely complete (e.g., "I sell AI training for sales teams")
            timeoutMs = 4500; // 4.5 seconds
          }
          
          console.log(`[SimpleIntro] 📝 Buffer (${wordCount} words): "${userBufferRef.current}" - waiting ${timeoutMs}ms`);
          
          // Reset silence timer
          if (userSilenceTimerRef.current) clearTimeout(userSilenceTimerRef.current);
          userSilenceTimerRef.current = setTimeout(commitUserText, timeoutMs) as any;
        } else {
          // Sam speaking - just manage audio gate
          gateOpenRef.current = true;
          inSpeakRef.current = true;
          
          // Dynamically extend protection based on Sam's response length
          const wordCount = text.split(/\s+/).length;
          const estimatedMs = wordCount * 180 + 1500;
          const protectMs = Math.max(2000, Math.min(6000, estimatedMs));
          bargeInProtectUntilRef.current = Date.now() + protectMs;
          console.log(`[SimpleIntro] 🛡️ Protection (${protectMs}ms) for ${wordCount} words`);
        }
      });

      agent.on(AgentEvents.UserStartedSpeaking, () => {
        // Check if we're within barge-in protection window FIRST
        const now = Date.now();
        if (now < bargeInProtectUntilRef.current) {
          const remaining = bargeInProtectUntilRef.current - now;
          console.log(`[SimpleIntro] 🛡️ Ignoring barge-in (${remaining}ms protection remaining)`);
          return; // Don't close gate or stop audio during protection
        }
        
        // Outside protection window - close gate and handle barge-in
        gateOpenRef.current = false;
        
        if (inSpeakRef.current) {
          console.log('[SimpleIntro] ⚠️ User barge-in detected - stopping TTS');
          try { stopAllTTS(spkCtx, playHead, (m: string) => console.log('[SimpleIntro]', m)); } catch {}
          inSpeakRef.current = false;
          pendingEnableRef.current = null;
        }
      });
      agent.on(AgentEvents.Audio, async (payload: any) => {
        console.log(`[SimpleIntro] 🔊 Audio event received, gate: ${gateOpenRef.current}`);
        if (!gateOpenRef.current) {
          console.log('[SimpleIntro] ❌ Audio blocked - gate closed');
          return;
        }
        const ready = await ensureSpeakerReady(spkCtx, playHead, { log: (m: string) => console.log('[SimpleIntro]', m), sampleRate: 48000 });
        if (ready) {
          console.log('[SimpleIntro] ✅ Playing audio');
          playTTS(spkCtx, playHead, payload, 48000, (m: string) => console.log('[SimpleIntro]', m));
        } else {
          console.log('[SimpleIntro] ❌ Speaker not ready');
        }
      });

      agent.on(AgentEvents.Close, () => stop());
      agent.on(AgentEvents.Error, () => stop());

    } catch (e) {
      console.error('[SimpleIntro] ❌ Start failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to start');
      setConnecting(false);
      setConnected(false);
      stop();
    }
  }, [commitUserText, say, setSpeaker, startMicPump, startScoring]);

  const stop = useCallback(() => {
    // Clear all timers
    if (userSilenceTimerRef.current) {
      clearTimeout(userSilenceTimerRef.current);
      userSilenceTimerRef.current = null;
    }
    
    try { stopScoring(); } catch {}
    try { speakQueue.cancelAll(); } catch {}
    try { speakQueue.detachAgent(); } catch {}
    try { agentRef.current?.finish?.(); } catch {}
    try { agentRef.current?.close?.(); } catch {}
    try {
      if (micStream.current) {
        micStream.current.getTracks().forEach(t => t.stop());
        micStream.current = null;
      }
    } catch {}
    try { micCtx.current?.close?.(); micCtx.current = null; } catch {}
    try { spkCtx.current?.close?.(); spkCtx.current = null; } catch {}
    setConnected(false);
    setConnecting(false);
  }, [speakQueue, stopScoring]);

  // Run only once
  const startedRef = useRef<boolean>(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (autoStart) start();
    return () => { stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gesture unlock for autoplay policies
  useEffect(() => {
    const onGesture = async () => {
      try { if (spkCtx.current) await spkCtx.current.resume(); } catch {}
      try { if (micCtx.current) await micCtx.current.resume(); } catch {}
      try {
        if (!micStream.current) {
          micStream.current = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 1
            } 
          });
          console.log('[SimpleIntro] 🎤 Mic granted (gesture)');
        }
      } catch {}
    };
    window.addEventListener('pointerdown', onGesture, { once: true } as any);
    window.addEventListener('keydown', onGesture, { once: true } as any);
    return () => {
      window.removeEventListener('pointerdown', onGesture as any);
      window.removeEventListener('keydown', onGesture as any);
    };
  }, []);

  // Minimal status UI for debugging and user feedback
  if (connecting) {
    return (
      <div className="text-xs text-gray-500 flex items-center gap-2">
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
        <span>Connecting to Sam...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-xs text-red-600 flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
        <span>Error: {error}</span>
        <button onClick={() => { setError(null); start(); }} className="underline ml-2">Retry</button>
      </div>
    );
  }
  
  if (connected) {
    return (
      <div className="text-xs text-green-600 flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span>Sam is listening...</span>
      </div>
    );
  }
  
  return null;
};

export default SamCoachIntroSimple;

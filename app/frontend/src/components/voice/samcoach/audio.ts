import type { MutableRefObject } from "react";

/**
 * Browser microphone sample rate in Hz.
 * Keep aligned with the native browser audio rate for minimal resampling.
 */
export const MIC_RATE = 48000; // Browser native rate

/**
 * TTS playback/output sample rate in Hz.
 * Should match Deepgram agent output to avoid pitch/tempo artifacts.
 */
export const TTS_RATE = 48000; // Keep aligned with Deepgram output

/**
 * Initialize the speaker AudioContext and reset the playback timeline.
 *
 * @param spkCtxRef Mutable ref to hold the speaker AudioContext instance
 * @param playHeadRef Mutable ref tracking the scheduled playback time cursor (in seconds)
 * @param sampleRate Optional sample rate for the AudioContext (defaults to TTS_RATE)
 */
export function initSpeaker(
  spkCtxRef: MutableRefObject<AudioContext | null>,
  playHeadRef: MutableRefObject<number>,
  sampleRate: number = TTS_RATE,
) {
  spkCtxRef.current = new AudioContext({ sampleRate });
  playHeadRef.current = 0;
}

/**
 * Ensure the speaker AudioContext exists and is runnable.
 * - Creates a new AudioContext if missing or closed
 * - Resumes it if suspended
 * Returns true if ready, false otherwise.
 */
export async function ensureSpeakerReady(
  spkCtxRef: MutableRefObject<AudioContext | null>,
  playHeadRef: MutableRefObject<number>,
  options: { sampleRate?: number; log?: (msg: string) => void } = {},
): Promise<boolean> {
  const sampleRate = options.sampleRate ?? TTS_RATE;
  const log = options.log ?? (() => {});

  let ctx = spkCtxRef.current;
  if (!ctx || ctx.state === "closed") {
    try {
      spkCtxRef.current = new AudioContext({ sampleRate });
      playHeadRef.current = 0;
      ctx = spkCtxRef.current;
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
}

/**
 * Schedule playback of a Deepgram Agent audio payload.
 * Accepts ArrayBuffer or payloads that contain an audio ArrayBufferView.
 * Performs Int16 -> Float32 conversion and enqueues audio using Web Audio API.
 *
 * @param spkCtxRef Speaker AudioContext ref
 * @param playHeadRef Playback head ref to schedule seamless audio chunks
 * @param payload Deepgram Agent audio payload or raw PCM ArrayBuffer
 * @param sampleRate Optional sample rate (defaults to TTS_RATE)
 * @param log Logger function for debug output
 */
export function playTTS(
  spkCtxRef: MutableRefObject<AudioContext | null>,
  playHeadRef: MutableRefObject<number>,
  payload: any,
  sampleRate: number = TTS_RATE,
  log: (msg: string) => void,
) {
  const ctx = spkCtxRef.current;
  if (!ctx) {
    log("❌ No speaker context for TTS playback");
    return;
  }

  if (ctx.state === "closed") {
    log("⚠️ Audio context is closed, skipping TTS playback");
    return;
  }

  // Create an Int16Array view that respects byteOffset/byteLength when given ArrayBufferView
  let i16: Int16Array | null = null;
  if (payload instanceof ArrayBuffer) {
    i16 = new Int16Array(payload);
  } else if (ArrayBuffer.isView(payload)) {
    const view = payload as ArrayBufferView;
    i16 = new Int16Array(view.buffer, view.byteOffset, Math.floor(view.byteLength / 2));
  } else if (payload && payload.audio) {
    const aud = payload.audio;
    if (aud instanceof ArrayBuffer) {
      i16 = new Int16Array(aud);
    } else if (ArrayBuffer.isView(aud)) {
      const view = aud as ArrayBufferView;
      i16 = new Int16Array(view.buffer, view.byteOffset, Math.floor(view.byteLength / 2));
    }
  }

  if (!i16 || i16.length === 0) {
    log("❌ Empty or invalid audio payload");
    return;
  }

  if (DEBUG_AUDIO) {
    const bytes = i16.length * 2;
    log(`🔉 DG audio ${i16.length} samples (${bytes} bytes)`);
  }

  if (ctx.state === "suspended") {
    if (DEBUG_AUDIO) log("🔊 Resuming suspended audio context...");
    ctx
      .resume()
      .then(() => { if (DEBUG_AUDIO) log("✅ Audio context resumed"); })
      .catch((err) => { if (DEBUG_AUDIO) log(`❌ Failed to resume audio context: ${err}`); });
  }

  try {
    enqueueAndMaybeSchedule(ctx, playHeadRef, i16, sampleRate, log);
  } catch (error) {
    log(`❌ TTS playback failed: ${error}`);
  }
}

// Track active sources for barge-in interrupt
const activeSources: Set<AudioBufferSourceNode> = new Set();

// Simple jitter buffer / aggregator to reduce mid-word dropouts from tiny 10ms frames
let aggPending: Int16Array | null = null;
let aggFlushTimer: number | null = null;
const MIN_BATCH_MS = 20; // coalesce to ~20ms chunks for snappier speech
const FLUSH_IDLE_MS = 40; // flush remainder quickly to avoid slow cadence

function flushAggregate(
  ctx: AudioContext,
  playHeadRef: MutableRefObject<number>,
  sampleRate: number,
  log: (msg: string) => void,
) {
  if (!aggPending || aggPending.length === 0) return;
  try {
    const f32 = Float32Array.from(aggPending, (v) => v / 32768);
    const buf = ctx.createBuffer(1, f32.length, sampleRate);
    buf.copyToChannel(f32, 0);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);

    const MIN_LEAD = 0.06; // 60ms lead to reduce perceived slowdown
    const startAt = Math.max(playHeadRef.current, ctx.currentTime + MIN_LEAD);
    src.start(startAt);
    playHeadRef.current = startAt + buf.duration;
    if (DEBUG_AUDIO) log(`🔊 Scheduled batched TTS: ${(buf.duration).toFixed(3)}s`);
    src.onended = () => { activeSources.delete(src); };
    activeSources.add(src);
  } catch (e) {
    log(`❌ flushAggregate error: ${e}`);
  } finally {
    aggPending = null;
  }
}

function enqueueAndMaybeSchedule(
  ctx: AudioContext,
  playHeadRef: MutableRefObject<number>,
  chunk: Int16Array,
  sampleRate: number,
  log: (msg: string) => void,
) {
  try {
    // Append
    if (!aggPending || aggPending.length === 0) {
      aggPending = chunk;
    } else {
      const cat = new Int16Array(aggPending.length + chunk.length);
      cat.set(aggPending);
      cat.set(chunk, aggPending.length);
      aggPending = cat;
    }

    // Compute minimum batch samples
    const minSamples = Math.max(1, Math.floor((sampleRate * MIN_BATCH_MS) / 1000));
    if (aggPending.length >= minSamples) {
      flushAggregate(ctx, playHeadRef, sampleRate, log);
    } else {
      // Idle flush if no more frames arrive
      if (aggFlushTimer) clearTimeout(aggFlushTimer);
      aggFlushTimer = window.setTimeout(() => {
        if (ctx.state !== "closed") flushAggregate(ctx, playHeadRef, sampleRate, log);
      }, FLUSH_IDLE_MS);
    }
  } catch (e) {
    log(`❌ enqueue error: ${e}`);
  }
}

/**
 * Stop all currently scheduled/playing TTS buffer sources and reset the playhead.
 */
export function stopAllTTS(
  spkCtxRef: MutableRefObject<AudioContext | null>,
  playHeadRef: MutableRefObject<number>,
  log: (msg: string) => void,
) {
  try {
    for (const src of activeSources) {
      try { src.stop(); } catch {}
    }
    activeSources.clear();
    // Reset jitter buffer
    aggPending = null;
    if (aggFlushTimer) { clearTimeout(aggFlushTimer); aggFlushTimer = null; }
    const now = spkCtxRef.current?.currentTime ?? 0;
    playHeadRef.current = now;
    log("🛑 Stopped all TTS sources (barge-in)");
  } catch (e) {
    log(`⚠️ stopAllTTS error: ${e}`);
  }
}

/**
 * Start microphone capture and stream audio frames to the Deepgram Agent.
 * Uses an AudioWorklet to capture 16-bit PCM from the mic and sends ~30ms chunks.
 *
 * @param args.micStreamRef MediaStream ref pointing to an active microphone stream
 * @param args.agentRef Ref to the active Deepgram Agent (must expose send(buffer))
 * @param args.micCtxRef Ref for the mic AudioContext (created here)
 * @param args.micNodeRef Ref for the AudioWorkletNode (created here)
 * @param args.mutedRef Ref indicating whether to suppress sending audio
 * @param args.log Logger function for debug output
 */
const DEBUG_AUDIO = false;

export async function startMicPump(args: {
  micStreamRef: MutableRefObject<MediaStream | null>;
  agentRef: MutableRefObject<any>;
  micCtxRef: MutableRefObject<AudioContext | null>;
  micNodeRef: MutableRefObject<AudioWorkletNode | null>;
  mutedRef: MutableRefObject<boolean>;
  log: (msg: string) => void;
}) {
  const { micStreamRef, agentRef, micCtxRef, micNodeRef, mutedRef, log } = args;

  if (!micStreamRef.current || !agentRef.current) {
    log("❌ Missing mic stream or agent reference");
    return;
  }

  try {
    micCtxRef.current = new AudioContext({ sampleRate: MIC_RATE });
    await micCtxRef.current.audioWorklet.addModule("/deepgram-worklet.js");

    if (micCtxRef.current.state === "closed") {
      log("❌ Audio context closed during worklet load - aborting mic setup");
      return;
    }

    micNodeRef.current = new AudioWorkletNode(micCtxRef.current, "deepgram-worklet");
    log("✅ Audio worklet node created successfully");
  } catch (error) {
    log(`❌ Error setting up microphone: ${error}`);
    return;
  }

  let hold = new Int16Array(0);

  let chunkCount = 0;
  micNodeRef.current!.port.onmessage = (e: MessageEvent) => {
    const data = (e as any).data;

    if (mutedRef.current) {
      return; // muted: don't send
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
        chunkCount++;
        if (DEBUG_AUDIO && chunkCount % 100 === 0) {
          log(`📤 Sent ${chunkCount} audio chunks to Deepgram`);
        }
      } catch (error) {
        log(`❌ Error sending audio data: ${error}`);
        break;
      }
    }
    hold = cat;
  };

  const source = micCtxRef.current!.createMediaStreamSource(micStreamRef.current);
  source.connect(micNodeRef.current!);
  // Keep the worklet processing without routing mic to speakers (prevents echo/robotic artifacts)
  const silentGain = micCtxRef.current!.createGain();
  silentGain.gain.value = 0;
  micNodeRef.current!.connect(silentGain).connect(micCtxRef.current!.destination);
}

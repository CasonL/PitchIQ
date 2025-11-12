import { AgentEvents } from "@deepgram/sdk";
import { sanitizeForDeepgramText } from "@/utils/deepgramSanitizer";

export type Logger = (msg: string) => void;

export interface SpeakQueue {
  speak: (text: string, opts?: { timeoutMs?: number }) => Promise<void>;
  cancelAll: () => void;
  attachAgent: (agent: any) => void;
  detachAgent: () => void;
  isSpeaking: () => boolean;
}

interface QueueItem {
  text: string;
  resolve: () => void;
  reject: (e: any) => void;
  timeoutId?: number | null;
  timeoutMs: number;
}

export function createSpeakQueue(log: Logger = () => {}): SpeakQueue {
  let agent: any = null;
  let speaking = false;
  let destroyed = false;
  const q: QueueItem[] = [];

  // Handlers
  const onStarted = () => {
    log("[SpeakQueue] AgentStartedSpeaking");
    speaking = true;
  };
  const onAudioDone = () => {
    log("[SpeakQueue] AgentAudioDone");
    speaking = false;
    finishCurrent(true);
  };

  function attachAgent(a: any) {
    if (destroyed) return;
    if (agent === a) return;
    if (agent) detachAgent();
    agent = a;
    try {
      agent.on(AgentEvents.AgentStartedSpeaking, onStarted);
      agent.on(AgentEvents.AgentAudioDone, onAudioDone);
    } catch {}
  }

  function detachAgent() {
    try {
      if (agent?.off) {
        agent.off(AgentEvents.AgentStartedSpeaking, onStarted);
        agent.off(AgentEvents.AgentAudioDone, onAudioDone);
      }
    } catch {}
    agent = null;
  }

  function startNext() {
    if (destroyed) return;
    if (speaking) return;
    if (!agent) {
      log("[SpeakQueue] No agent attached; cannot speak");
      return;
    }
    const next = q[0];
    if (!next) return;
    // Send input text
    try {
      // Skip sanitization for commands (structured data starting with [)
      // Sanitize only freeform text to avoid breaking command format
      const text = next.text.trim().startsWith('[') ? next.text : sanitizeForDeepgramText(next.text, 240);
      log(`[SpeakQueue] ▶️ speak: "${text}"`);
      // Prefer official injection API; fallback to raw message if necessary
      if (typeof (agent as any).injectAgentMessage === 'function') {
        (agent as any).injectAgentMessage(text);
      } else if (typeof (agent as any).send === 'function') {
        const payload = JSON.stringify({ type: 'InjectAgentMessage', message: text });
        (agent as any).send(payload);
      } else {
        throw new Error("Agent does not support message injection");
      }
      // Fallback timeout to resolve if no AgentAudioDone comes
      if (next.timeoutId) clearTimeout(next.timeoutId as any);
      next.timeoutId = window.setTimeout(() => {
        log("[SpeakQueue] ⏱️ timeout → resolving current");
        speaking = false;
        finishCurrent(true);
      }, next.timeoutMs);
    } catch (e) {
      log(`[SpeakQueue] ⚠️ send failed: ${e}`);
      finishCurrent(false, e);
    }
  }

  function finishCurrent(success: boolean, err?: any) {
    const cur = q.shift();
    if (!cur) return;
    if (cur.timeoutId) clearTimeout(cur.timeoutId as any);
    if (success) cur.resolve();
    else cur.reject(err ?? new Error("Speak failed"));
    // Kick next
    setTimeout(startNext, 0);
  }

  function speak(text: string, opts?: { timeoutMs?: number }): Promise<void> {
    if (destroyed) return Promise.reject(new Error("SpeakQueue destroyed"));
    const timeoutMs = Math.max(2000, Math.min(12000, opts?.timeoutMs ?? 8000));
    return new Promise<void>((resolve, reject) => {
      q.push({ text, resolve, reject, timeoutId: null, timeoutMs });
      if (!speaking && q.length === 1) startNext();
    });
  }

  function cancelAll() {
    while (q.length) {
      const item = q.shift()!;
      if (item.timeoutId) clearTimeout(item.timeoutId as any);
      item.reject(new Error("SpeakQueue cancelled"));
    }
  }

  function isSpeaking() {
    return speaking;
  }

  function destroy() {
    destroyed = true;
    cancelAll();
    detachAgent();
  }

  // Expose public API
  return {
    speak,
    cancelAll,
    attachAgent,
    detachAgent,
    isSpeaking,
  };
}

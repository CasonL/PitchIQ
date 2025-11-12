import { useCallback, useEffect, useRef, useState } from 'react';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type BehaviorScores = { rapport: number; trust: number; interest: number };
export type BehaviorUpdate = { scores: BehaviorScores; hint?: string; source?: string };

interface StartOptions {
  sessionId: string;
  personaName?: string;
  onBehaviorUpdate?: (update: BehaviorUpdate) => void;
  onTerminationIntent?: (phrase?: string) => void;
  onPostCallInsights?: (insights: { markdown?: string }) => void;
}

function safeParse<T = any>(data: string): T | null {
  try {
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export function useScenarioStream(externalLog?: (message: string, level?: LogLevel) => void) {
  const esRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [isActive, setIsActive] = useState(false);

  const log = useCallback((msg: string, level: LogLevel = 'info') => {
    try {
      externalLog ? externalLog(msg, level) : console.log(`[Scenario][${level}] ${msg}`);
    } catch {
      // no-op
    }
  }, [externalLog]);

  const stop = useCallback((endRemote: boolean = false) => {
    const sid = sessionIdRef.current;
    // If we want to end remotely, prefer to keep SSE open to receive insights and session_end
    if (endRemote && sid && esRef.current) {
      setIsActive(false);
      fetch(`/api/scenario/end/${sid}`, { method: 'POST' }).catch(() => {});
      // Do not close ES yet; we'll close on 'session_end'
      return;
    }
    if (esRef.current) {
      try {
        esRef.current.close();
      } catch {}
      esRef.current = null;
    }
    setIsActive(false);
    if (endRemote && sid && !esRef.current) {
      // If no active ES, just end the session remotely
      fetch(`/api/scenario/end/${sid}`, { method: 'POST' }).catch(() => {});
    }
    sessionIdRef.current = null;
  }, []);

  const start = useCallback(async (opts: StartOptions) => {
    // Ensure any previous stream is closed
    stop(false);

    sessionIdRef.current = opts.sessionId;

    // Start (idempotent) backend session
    await fetch('/api/scenario/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: opts.sessionId, persona_name: opts.personaName || 'Prospect' })
    }).catch((e) => log(`Failed to start scenario session: ${e}`, 'warn'));

    const url = `/api/scenario/stream/${opts.sessionId}`;
    const es = new EventSource(url);

    es.onopen = () => {
      log(`SSE opened for ${opts.sessionId}`);
      setIsActive(true);
    };

    es.onerror = () => {
      // EventSource auto-reconnects; just log
      log(`SSE error for ${opts.sessionId}`, 'warn');
    };

    es.addEventListener('hello', () => {});
    es.addEventListener('keepalive', () => {});

    es.addEventListener('behavior_update', (evt: MessageEvent) => {
      const payload = safeParse<BehaviorUpdate>(evt.data);
      if (payload && opts.onBehaviorUpdate) {
        opts.onBehaviorUpdate(payload);
      }
    });

    es.addEventListener('termination_intent', (evt: MessageEvent) => {
      const payload = safeParse<{ phrase?: string }>(evt.data);
      if (opts.onTerminationIntent) {
        opts.onTerminationIntent(payload?.phrase);
      }
    });

    es.addEventListener('post_call_insights', (evt: MessageEvent) => {
      const payload = safeParse<{ markdown?: string }>(evt.data) || {};
      if (opts.onPostCallInsights) {
        opts.onPostCallInsights(payload);
      }
      log(`Post-call insights received`);
    });

    es.addEventListener('session_end', () => {
      log(`SSE session_end received, closing`);
      stop(false);
    });

    esRef.current = es;
  }, [log, stop]);

  const observe = useCallback(async (text: string, speaker: string = 'seller') => {
    const sid = sessionIdRef.current;
    if (!sid || !text) return;
    try {
      await fetch(`/api/scenario/observe/${sid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker })
      });
    } catch (e) {
      log(`observe failed: ${e}`, 'warn');
    }
  }, [log]);

  const end = useCallback(async () => {
    const sid = sessionIdRef.current;
    try {
      if (sid) await fetch(`/api/scenario/end/${sid}`, { method: 'POST' });
    } catch {}
    stop(false);
  }, [stop]);

  useEffect(() => {
    return () => {
      stop(true);
    };
  }, [stop]);

  return { start, observe, end, stop, isActive };
}

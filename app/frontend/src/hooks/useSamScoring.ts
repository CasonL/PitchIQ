import { useCallback, useRef } from 'react';
import { prospectScoringService } from '@/services/ProspectScoringService';

// Lightweight hook to manage a separate prospect scoring session for SamCoach
// Keeps SamCoach integration minimal and avoids conflicts with ProspectAgent scoring
export function useSamScoring() {
  const speakerRef = useRef<'user' | 'ai'>('user');
  const startedRef = useRef<boolean>(false);
  const lastSentRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const personaIdRef = useRef<string | null>(null);
  // Guard to prevent concurrent or duplicate end-session calls
  const endingRef = useRef<boolean>(false);

  const setSpeaker = useCallback((speaker: 'user' | 'ai') => {
    speakerRef.current = speaker;
  }, []);

  const generateSessionId = () => `sam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const start = useCallback(async () => {
    if (startedRef.current) return;
    // Do not override an existing global scoring session (e.g., ProspectAgent)
    if (prospectScoringService.isSessionActive()) {
      console.warn('SamScoring: another scoring session is active; skipping Sam scoring start');
      return;
    }
    const sessionId = generateSessionId();
    const personaId = 'sam_coach';
    sessionIdRef.current = sessionId;
    personaIdRef.current = personaId;
    try {
      await prospectScoringService.startSession(personaId, sessionId);
      startedRef.current = true;
    } catch (e) {
      // Non-fatal for SamCoach; just log
      console.warn('SamScoring: failed to start session', e);
    }
  }, []);

  const stop = useCallback(async () => {
    // Idempotent stop: prevent overlapping calls and early-mark as stopped
    if (endingRef.current || !startedRef.current) return;
    endingRef.current = true;
    const mySessionId = sessionIdRef.current;
    // Mark stopped early to avoid races with other callers
    startedRef.current = false;
    try {
      const info = prospectScoringService.getSessionInfo();
      // Only end if the active service session matches our Sam session
      if (info.sessionId && info.sessionId === mySessionId) {
        await prospectScoringService.endSession();
      } else {
        // Another component (e.g., ProspectAgent) likely started a new session
        console.warn('SamScoring: not ending scoring - active session belongs to another component');
      }
    } catch (e) {
      console.warn('SamScoring: failed to end session', e);
    } finally {
      endingRef.current = false;
      lastSentRef.current = null;
      sessionIdRef.current = null;
      personaIdRef.current = null;
    }
  }, []);

  const record = useCallback(async (text: string) => {
    if (!text || !startedRef.current || !prospectScoringService.isSessionActive()) return;
    // Ensure we only write to our own session
    const info = prospectScoringService.getSessionInfo();
    if (!info.sessionId || info.sessionId !== sessionIdRef.current) return;
    if (text === lastSentRef.current) return; // Basic de-dupe for DG repeats
    lastSentRef.current = text;
    try {
      await prospectScoringService.addMessage({
        sender: speakerRef.current,
        content: text,
        timestamp: Date.now() / 1000,
        source: 'sam'
      });
    } catch (e) {
      console.warn('SamScoring: failed to add message', e);
    }
  }, []);

  const getSession = useCallback(() => ({
    sessionId: sessionIdRef.current,
    personaId: personaIdRef.current
  }), []);

  return { start, stop, setSpeaker, record, getSession };
}

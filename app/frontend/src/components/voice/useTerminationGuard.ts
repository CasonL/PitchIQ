import { useCallback, useRef } from 'react';
import { WebSocketManager } from './WebSocketManager';

export interface TerminationUIState {
  status: 'idle' | 'candidate' | 'grace';
  phrase?: string;
  candidateFirstSeenAt: number | null;
  confirmWindowMs: number;
  minCallAgeMs: number;
  graceMs: number;
  graceDeadlineAt: number | null;
  graceRemainingMs: number;
  callAgeMs: number;
}

interface UseTerminationGuardParams {
  log: (message: string, level?: 'debug' | 'info' | 'warn' | 'error') => void;
  wsManagerRef: React.MutableRefObject<WebSocketManager | null>;
  scoringServiceRef: React.MutableRefObject<{ checkAICallTermination: () => Promise<any> } | null>;
  callStartTimeRef: React.MutableRefObject<number>;
  isIntentionalTerminationRef: React.MutableRefObject<boolean>;
  endCall: () => void;
}

export function useTerminationGuard({
  log,
  wsManagerRef,
  scoringServiceRef,
  callStartTimeRef,
  isIntentionalTerminationRef,
  endCall,
}: UseTerminationGuardParams) {
  // AI termination handling
  const terminationPollingRef = useRef<number | null>(null);
  const terminationGraceTimeoutRef = useRef<number | null>(null);
  const terminationGraceDeadlineRef = useRef<number | null>(null);
  const terminationTriggeredRef = useRef<boolean>(false);
  // Two-step termination confirmation + phrase tracking
  const terminationFirstSeenAtRef = useRef<number | null>(null);
  const lastTerminationPhraseRef = useRef<string | undefined>(undefined);
  // Guard rails
  const MIN_CALL_AGE_MS = 30000; // 30s
  const TERMINATION_CONFIRM_WINDOW_MS = 7000; // 7s
  const GRACE_MS = 8000; // 8s

  const resetTermination = useCallback(() => {
    if (terminationPollingRef.current) {
      window.clearInterval(terminationPollingRef.current);
      terminationPollingRef.current = null;
    }
    if (terminationGraceTimeoutRef.current) {
      window.clearTimeout(terminationGraceTimeoutRef.current);
      terminationGraceTimeoutRef.current = null;
    }
    terminationGraceDeadlineRef.current = null;
    terminationTriggeredRef.current = false;
    terminationFirstSeenAtRef.current = null;
    lastTerminationPhraseRef.current = undefined;
  }, []);

  const checkForAICallTermination = useCallback(async (source: string = 'poll') => {
    if (!scoringServiceRef.current || terminationTriggeredRef.current) return;
    try {
      const result = await scoringServiceRef.current.checkAICallTermination();

      const callAge = Date.now() - (callStartTimeRef.current || 0);
      if (result?.should_terminate && callAge < MIN_CALL_AGE_MS) {
        log(
          `🛑 Termination suggested (${source}) but suppressed (call age ${Math.round(callAge / 1000)}s < ${Math.round(
            MIN_CALL_AGE_MS / 1000
          )}s)${result?.reason ? ` reason: ${result.reason}` : ''}`,
          'info'
        );
        return;
      }

      if (result?.should_terminate && !terminationTriggeredRef.current) {
        const now = Date.now();
        const firstSeenAt = terminationFirstSeenAtRef.current;
        const phrase = result.termination_phrase as string | undefined;
        const reason = result?.reason as string | undefined;

        if (!firstSeenAt) {
          terminationFirstSeenAtRef.current = now;
          lastTerminationPhraseRef.current = phrase;
          log(
            `🛑 Termination candidate observed (${source}); awaiting confirmation within ${Math.round(
              TERMINATION_CONFIRM_WINDOW_MS / 1000
            )}s${reason ? ` (reason: ${reason})` : ''}${phrase ? `; phrase: ${phrase}` : ''}`,
            'info'
          );
          return;
        }

        if (now - firstSeenAt <= TERMINATION_CONFIRM_WINDOW_MS) {
          terminationTriggeredRef.current = true;
          log(
            `🛑 Termination confirmed (${source}) within ${now - firstSeenAt}ms${reason ? ` (reason: ${reason})` : ''}${
              (phrase || lastTerminationPhraseRef.current) ? `; phrase: ${phrase || lastTerminationPhraseRef.current}` : ''
            }`,
            'info'
          );

          if (wsManagerRef.current && wsManagerRef.current.isActive()) {
            isIntentionalTerminationRef.current = true;
            try {
              wsManagerRef.current.setTerminationIntent(phrase || lastTerminationPhraseRef.current);
            } catch (e) {
              log(`⚠️ Failed to set termination intent: ${e}`, 'warn');
            }
          }

          if (terminationGraceTimeoutRef.current) {
            window.clearTimeout(terminationGraceTimeoutRef.current);
          }
          terminationGraceDeadlineRef.current = now + GRACE_MS;
          terminationGraceTimeoutRef.current = window.setTimeout(() => {
            log(`🧹 Grace period over, cleaning up after AI termination`, 'info');
            terminationGraceDeadlineRef.current = null;
            endCall();
          }, GRACE_MS);

          terminationFirstSeenAtRef.current = null;
          lastTerminationPhraseRef.current = undefined;
          return;
        }

        // Window expired; treat as fresh candidate
        terminationFirstSeenAtRef.current = now;
        lastTerminationPhraseRef.current = phrase;
        log(
          `🛑 Termination re-candidate (${source}); previous window expired; awaiting confirmation again${
            reason ? ` (reason: ${reason})` : ''
          }`,
          'info'
        );
        return;
      }

      if (!result?.should_terminate && terminationFirstSeenAtRef.current) {
        log(`ℹ️ Clearing pending termination candidate (${source}) due to non-confirmation`, 'info');
        terminationFirstSeenAtRef.current = null;
        lastTerminationPhraseRef.current = undefined;
      }
    } catch (e) {
      log(`⚠️ Error checking AI termination (${source}): ${e}`, 'warn');
    }
  }, [endCall, log, wsManagerRef, isIntentionalTerminationRef, scoringServiceRef]);

  const getTerminationUIState = useCallback((): TerminationUIState => {
    const now = Date.now();
    const callAgeMs = now - (callStartTimeRef.current || 0);
    const candidateFirstSeenAt = terminationFirstSeenAtRef.current;
    const phrase = lastTerminationPhraseRef.current;
    const graceDeadlineAt = terminationGraceDeadlineRef.current;

    if (graceDeadlineAt) {
      const graceRemainingMs = Math.max(0, graceDeadlineAt - now);
      return {
        status: 'grace',
        phrase,
        candidateFirstSeenAt: candidateFirstSeenAt || null,
        confirmWindowMs: TERMINATION_CONFIRM_WINDOW_MS,
        minCallAgeMs: MIN_CALL_AGE_MS,
        graceMs: GRACE_MS,
        graceDeadlineAt,
        graceRemainingMs,
        callAgeMs,
      };
    }

    if (candidateFirstSeenAt) {
      return {
        status: 'candidate',
        phrase,
        candidateFirstSeenAt,
        confirmWindowMs: TERMINATION_CONFIRM_WINDOW_MS,
        minCallAgeMs: MIN_CALL_AGE_MS,
        graceMs: GRACE_MS,
        graceDeadlineAt: null,
        graceRemainingMs: 0,
        callAgeMs,
      };
    }

    return {
      status: 'idle',
      phrase: undefined,
      candidateFirstSeenAt: null,
      confirmWindowMs: TERMINATION_CONFIRM_WINDOW_MS,
      minCallAgeMs: MIN_CALL_AGE_MS,
      graceMs: GRACE_MS,
      graceDeadlineAt: null,
      graceRemainingMs: 0,
      callAgeMs,
    };
  }, []);

  const startTerminationPolling = useCallback(() => {
    if (terminationPollingRef.current) {
      window.clearInterval(terminationPollingRef.current);
      terminationPollingRef.current = null;
    }
    terminationPollingRef.current = window.setInterval(() => {
      checkForAICallTermination('interval');
    }, 3000);
    log(`⏱️ Started AI termination polling every 3s`, 'info');
  }, [checkForAICallTermination, log]);

  return {
    checkForAICallTermination,
    getTerminationUIState,
    startTerminationPolling,
    resetTermination,
  };
}

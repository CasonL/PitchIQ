import { useCallback, useRef, type MutableRefObject } from 'react';
import type { BehaviorUpdate, ProspectScoringService } from '../../services/ProspectScoringService';
import { prospectScoringService } from '../../services/ProspectScoringService';

export interface UseProspectScoringParams {
  log: (message: string, level?: 'debug' | 'info' | 'warn' | 'error') => void;
}

export interface UseProspectScoring {
  // Expose the underlying service ref so other hooks (e.g., termination guard) can call specific methods
  scoringServiceRef: MutableRefObject<ProspectScoringService | null>;

  // Lifecycle
  setBehaviorUpdateHandler: (handler: (update: BehaviorUpdate) => void) => void;
  initSession: (personaId: string, sessionId: string) => Promise<BehaviorUpdate | null>;
  restartForPersonaSwitch: (personaId: string, sessionId: string) => Promise<BehaviorUpdate | null>;
  endScoringSession: () => Promise<void>;

  // Messaging
  addTurnMessage: (turn: { role: 'ai' | 'user'; text: string; timestamp?: number }) => Promise<void>;
}

export function useProspectScoring({ log }: UseProspectScoringParams): UseProspectScoring {
  const scoringServiceRef = useRef<ProspectScoringService | null>(null);
  const behaviorHandlerRef = useRef<((update: BehaviorUpdate) => void) | null>(null);

  const ensureService = useCallback(() => {
    if (!scoringServiceRef.current) {
      scoringServiceRef.current = prospectScoringService;
      log('📊 ProspectScoringService attached to hook', 'debug');
    }
    return scoringServiceRef.current;
  }, [log]);

  const setBehaviorUpdateHandler = useCallback((handler: (update: BehaviorUpdate) => void) => {
    behaviorHandlerRef.current = handler;
    const service = ensureService();
    try {
      service.setBehaviorUpdateCallback((update: BehaviorUpdate) => {
        try {
          behaviorHandlerRef.current?.(update);
        } catch (e) {
          log(`⚠️ behavior update handler error: ${e}`, 'warn');
        }
      });
    } catch (e) {
      log(`⚠️ setBehaviorUpdateCallback failed: ${e}`, 'warn');
    }
  }, [ensureService, log]);

  const initSession = useCallback(async (personaId: string, sessionId: string) => {
    const service = ensureService();
    try {
      const initial = await service.startSession(personaId, sessionId);
      return initial;
    } catch (e) {
      log(`⚠️ initSession failed: ${e}`, 'warn');
      return null;
    }
  }, [ensureService, log]);

  const restartForPersonaSwitch = useCallback(async (personaId: string, sessionId: string) => {
    const service = ensureService();
    try {
      // End any existing session (best-effort)
      try { await service.endSession(); } catch {}
      const initial = await service.startSession(personaId, sessionId);
      return initial;
    } catch (e) {
      log(`⚠️ restartForPersonaSwitch failed: ${e}`, 'warn');
      return null;
    }
  }, [ensureService, log]);

  const endScoringSession = useCallback(async () => {
    const service = ensureService();
    try {
      await service.endSession();
    } catch (e) {
      log(`⚠️ endScoringSession error: ${e}`, 'warn');
    } finally {
      try {
        // Clear callbacks to avoid leaks
        service.setBehaviorUpdateCallback((_u: BehaviorUpdate) => {});
      } catch {}
      scoringServiceRef.current = null;
    }
  }, [ensureService, log]);

  const addTurnMessage = useCallback(async (turn: { role: 'ai' | 'user'; text: string; timestamp?: number }) => {
    const content = (turn?.text || '').trim();
    if (!content) return;
    const service = ensureService();
    try {
      await service.addMessage({
        sender: turn.role,
        content,
        timestamp: (turn.timestamp || Date.now()) / 1000,
      });
      log(`📨 Turn forwarded to scoring [${turn.role}] ${content.slice(0, 120)}`, 'debug');
    } catch (e) {
      log(`⚠️ Failed to forward turn to scoring: ${e}`, 'warn');
    }
  }, [ensureService, log]);

  return {
    scoringServiceRef,
    setBehaviorUpdateHandler,
    initSession,
    restartForPersonaSwitch,
    endScoringSession,
    addTurnMessage,
  };
}

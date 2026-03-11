/**
 * useOverseer.ts
 * React hook for Marcus Overseer - Scenario Architect
 * 
 * The Overseer is a DUNGEON MASTER, not a rule enforcer.
 * It generates:
 * - Dynamic pain points Marcus can reveal (if user asks right questions)
 * - Red herrings to test discovery validation skills
 * - Hidden motivations beyond "I'm busy"
 * - Learning challenges optimized for user growth
 * 
 * DESIGN: Completely optional. Set ENABLE_OVERSEER to false to disable.
 * Runs parallel (non-blocking) - never delays Marcus responses.
 */

import { useRef, useCallback } from 'react';
import { MarcusOverseerService } from './MarcusOverseerService';
import { OverseerAnalysisRequest } from './OverseerTypes';

// 🎛️ MASTER SWITCH: Set to false to completely disable Overseer
const ENABLE_OVERSEER = false;  // Disabled by default - enable when ready to test

export function useOverseer() {
  const overseerRef = useRef<MarcusOverseerService | null>(null);
  
  // Initialize overseer on first use
  if (!overseerRef.current && ENABLE_OVERSEER) {
    overseerRef.current = new MarcusOverseerService(true);
    console.log('🔮 [Overseer Hook] Initialized');
  }
  
  /**
   * Start parallel analysis (non-blocking)
   * Call this after user speaks, before generating Marcus response
   */
  const analyzeConversation = useCallback((request: OverseerAnalysisRequest) => {
    if (!ENABLE_OVERSEER || !overseerRef.current) return;
    
    overseerRef.current.startAnalysis(request);
  }, []);
  
  /**
   * Get strategic hints for Marcus's prompt
   * Returns formatted guidance string or empty string if disabled
   */
  const getGuidance = useCallback((): string => {
    if (!ENABLE_OVERSEER || !overseerRef.current) return '';
    
    return overseerRef.current.getPromptGuidance();
  }, []);
  
  /**
   * Enable/disable the overseer dynamically
   */
  const setEnabled = useCallback((enabled: boolean) => {
    if (!overseerRef.current) return;
    
    overseerRef.current.setEnabled(enabled);
  }, []);
  
  /**
   * Clear cached hints (useful for new calls)
   */
  const clearCache = useCallback(() => {
    if (!overseerRef.current) return;
    
    overseerRef.current.clearCache();
  }, []);
  
  return {
    analyzeConversation,
    getGuidance,
    setEnabled,
    clearCache,
    isEnabled: ENABLE_OVERSEER
  };
}

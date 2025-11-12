/**
 * Charmer Module Exports
 * Marcus Stindle - The demo experience
 */

// Core controller
export { CharmerController } from './CharmerController';

// Flow components (V1 minimal UI)
export { MarcusDemoFlow } from './MarcusDemoFlow';
export { MarcusLobby } from './MarcusLobby';
export { MarcusPostCall } from './MarcusPostCall';

// Internal modules (advanced usage)
export { CharmerPhaseManager } from './CharmerPhaseManager';
export { CharmerContextExtractor } from './CharmerContextExtractor';
export { CharmerAIService } from './CharmerAIService';

// Types
export type { CharmerPhase, ConversationContext, PhaseTransition } from './CharmerPhaseManager';
export type { ExtractedInfo, CoachingIssue, CoachingIssueType } from './CharmerContextExtractor';
export type { AIRequestContext, AIResponse } from './CharmerAIService';

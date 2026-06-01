/**
 * buyer-state/index.ts
 * 
 * Modular buyer decision brain for Marcus.
 * 
 * Architecture:
 * - BuyerState: Single source of truth (nested structure)
 * - RepBehaviorDetector: Detects what rep did
 * - BuyerStateTransitionEngine: Applies state changes
 * - BuyerDecisionPolicy: Decides what Marcus should do
 * - BuyerPromptComposer: Formats state for LLM
 * 
 * StrategyLayer orchestrates these modules.
 */

export * from './BuyerState.types';
export * from './RepBehaviorDetector';
export * from './BuyerStateTransitionEngine';
export * from './BuyerDecisionPolicy';
export * from './BuyerPromptComposer';

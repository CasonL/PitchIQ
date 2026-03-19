/**
 * DeltaMapping.ts
 * Label → State Delta mapping system
 * Replaces raw LLM delta outputs with deterministic, tunable mappings
 */

export type PrimaryFailure = 
  | 'lack_of_specificity'
  | 'no_evidence'
  | 'missed_objection'
  | 'poor_listening'
  | 'too_pushy'
  | 'unclear_value'
  | 'disrespectful'
  | 'no_dominant_failure';

export type InteractionQuality =
  | 'very_positive'
  | 'slightly_positive'
  | 'neutral'
  | 'slightly_negative'
  | 'very_negative';

export type CredibilitySignal =
  | 'strong_evidence'
  | 'moderate_evidence'
  | 'weak_evidence'
  | 'no_evidence'
  | 'harmful';

export type RapportLevel =
  | 'excellent'
  | 'good'
  | 'neutral'
  | 'poor'
  | 'hostile';

export type ObjectionHandling =
  | 'fully_addressed'
  | 'partially_addressed'
  | 'acknowledged'
  | 'missed'
  | 'made_worse';

export interface StrategyLabels {
  primary_failure: PrimaryFailure;
  interaction_quality: InteractionQuality;
  credibility_signal: CredibilitySignal;
  rapport: RapportLevel;
  objection_handling?: ObjectionHandling;
}

export interface StateDeltas {
  trust: number;
  resistance: number;
  openness: number;
  patience: number;
}

/**
 * Dominance weights - not all signals are equal
 * Strong negative signals (disrespect, missed objections) should dominate weak positives
 */
const DOMINANCE_WEIGHTS = {
  primary_failure: 1.5,      // Mistakes hit harder than successes reward
  objection_handling: 1.3,   // Objection handling is critical
  credibility_signal: 1.2,   // Evidence matters more than vibes
  interaction_quality: 1.0,  // Baseline
  rapport: 0.8               // Nice but doesn't override substance
};

/**
 * Delta mapping: Labels → State changes
 * These are tunable constants that define system behavior
 */
export const DELTA_MAP = {
  interaction_quality: {
    very_positive: { trust: 0.15, resistance: -0.10, openness: 0.10, patience: 0.05 },
    slightly_positive: { trust: 0.08, resistance: -0.05, openness: 0.05, patience: 0.02 },
    neutral: { trust: 0, resistance: 0, openness: 0, patience: -0.02 }, // Reduced from -0.05
    slightly_negative: { trust: -0.08, resistance: 0.05, openness: -0.05, patience: -0.08 },
    very_negative: { trust: -0.15, resistance: 0.12, openness: -0.12, patience: -0.15 }
  },
  
  credibility_signal: {
    strong_evidence: { trust: 0.12, resistance: -0.10, openness: 0, patience: 0 },
    moderate_evidence: { trust: 0.06, resistance: -0.04, openness: 0, patience: 0 },
    weak_evidence: { trust: -0.02, resistance: 0.03, openness: 0, patience: 0 },
    no_evidence: { trust: -0.08, resistance: 0.08, openness: 0, patience: 0 },
    harmful: { trust: -0.15, resistance: 0.15, openness: 0, patience: 0 }
  },
  
  rapport: {
    excellent: { trust: 0.10, resistance: 0, openness: 0.12, patience: 0.08 },
    good: { trust: 0.05, resistance: 0, openness: 0.06, patience: 0.03 },
    neutral: { trust: 0, resistance: 0, openness: 0, patience: -0.02 },
    poor: { trust: -0.06, resistance: 0, openness: -0.08, patience: -0.10 },
    hostile: { trust: -0.15, resistance: 0, openness: -0.15, patience: -0.18 }
  },
  
  objection_handling: {
    fully_addressed: { trust: 0, resistance: -0.12, openness: 0.08, patience: 0 },
    partially_addressed: { trust: 0, resistance: -0.05, openness: 0.02, patience: 0 },
    acknowledged: { trust: 0, resistance: 0, openness: 0, patience: 0 },
    missed: { trust: 0, resistance: 0.08, openness: -0.05, patience: 0 },
    made_worse: { trust: 0, resistance: 0.15, openness: -0.12, patience: 0 }
  },
  
  primary_failure: {
    lack_of_specificity: { trust: -0.05, resistance: 0.06, openness: 0, patience: 0 },
    no_evidence: { trust: -0.08, resistance: 0.10, openness: 0, patience: 0 },
    missed_objection: { trust: 0, resistance: 0.10, openness: 0, patience: 0 },
    poor_listening: { trust: -0.10, resistance: 0, openness: -0.08, patience: -0.12 },
    too_pushy: { trust: -0.08, resistance: 0, openness: -0.10, patience: -0.15 },
    unclear_value: { trust: 0, resistance: 0.08, openness: 0, patience: -0.08 },
    disrespectful: { trust: -0.18, resistance: 0.15, openness: -0.15, patience: -0.20 },
    no_dominant_failure: { trust: 0, resistance: 0, openness: 0, patience: 0 } // Other signals still drive behavior
  }
};

/**
 * Compute state deltas from labels with dominance weighting
 * Strong signals (failures, objections) dominate weak signals (rapport)
 */
export function computeDeltas(labels: StrategyLabels, currentState?: StateDeltas): StateDeltas {
  const deltas: StateDeltas = { trust: 0, resistance: 0, openness: 0, patience: 0 };
  
  // Get base deltas from each dimension
  const interactionDeltas = DELTA_MAP.interaction_quality[labels.interaction_quality];
  const credibilityDeltas = DELTA_MAP.credibility_signal[labels.credibility_signal];
  const rapportDeltas = DELTA_MAP.rapport[labels.rapport];
  const failureDeltas = DELTA_MAP.primary_failure[labels.primary_failure];
  
  // Apply dominance weights - mistakes hit harder than successes reward
  deltas.trust += (interactionDeltas.trust || 0) * DOMINANCE_WEIGHTS.interaction_quality;
  deltas.trust += (credibilityDeltas.trust || 0) * DOMINANCE_WEIGHTS.credibility_signal;
  deltas.trust += (rapportDeltas.trust || 0) * DOMINANCE_WEIGHTS.rapport;
  deltas.trust += (failureDeltas.trust || 0) * DOMINANCE_WEIGHTS.primary_failure;
  
  deltas.resistance += (interactionDeltas.resistance || 0) * DOMINANCE_WEIGHTS.interaction_quality;
  deltas.resistance += (credibilityDeltas.resistance || 0) * DOMINANCE_WEIGHTS.credibility_signal;
  deltas.resistance += (failureDeltas.resistance || 0) * DOMINANCE_WEIGHTS.primary_failure;
  
  deltas.openness += (interactionDeltas.openness || 0) * DOMINANCE_WEIGHTS.interaction_quality;
  deltas.openness += (rapportDeltas.openness || 0) * DOMINANCE_WEIGHTS.rapport;
  deltas.openness += (failureDeltas.openness || 0) * DOMINANCE_WEIGHTS.primary_failure;
  
  // Context-dependent patience drain for neutral interactions
  let patienceDelta = (interactionDeltas.patience || 0);
  if (currentState && labels.interaction_quality === 'neutral' && currentState.patience <= 0.5) {
    patienceDelta = 0; // Stop draining patience when already low
  }
  deltas.patience += patienceDelta * DOMINANCE_WEIGHTS.interaction_quality;
  deltas.patience += (rapportDeltas.patience || 0) * DOMINANCE_WEIGHTS.rapport;
  deltas.patience += (failureDeltas.patience || 0) * DOMINANCE_WEIGHTS.primary_failure;
  
  // Add objection handling if present (weighted heavily)
  if (labels.objection_handling) {
    const objectionDeltas = DELTA_MAP.objection_handling[labels.objection_handling];
    deltas.resistance += (objectionDeltas.resistance || 0) * DOMINANCE_WEIGHTS.objection_handling;
    deltas.openness += (objectionDeltas.openness || 0) * DOMINANCE_WEIGHTS.objection_handling;
  }
  
  return deltas;
}

/**
 * Apply emotional coupling - states aren't independent
 * High resistance → lower openness
 * Low trust → less patience
 */
function applyCoupling(state: StateDeltas, newState: { trust: number; resistance: number; openness: number; patience: number }): StateDeltas {
  const coupled = { ...state };
  
  // High resistance reduces openness (guarded people don't open up)
  if (newState.resistance > 0.7) {
    coupled.openness *= 0.8;
  }
  
  // Very high resistance severely limits openness
  if (newState.resistance > 0.85) {
    coupled.openness *= 0.6;
  }
  
  // Low trust erodes patience faster
  if (newState.trust < 0.3) {
    coupled.patience *= 0.85;
  }
  
  // Very low trust means impatience dominates
  if (newState.trust < 0.15) {
    coupled.patience *= 0.7;
  }
  
  return coupled;
}

/**
 * Context-aware physics parameters
 */
export type MomentType = 'breakthrough' | 'trust_drop' | 'neutral' | 'critical' | 'shock';
export type SeverityLevel = 'high' | 'medium' | 'low';

export interface PhysicsParams {
  maxStep: number;
  smoothing: number;
}

export function getPhysicsParams(momentType: MomentType, severity: SeverityLevel = 'medium'): PhysicsParams {
  // Shock events bypass smoothing - immediate impact
  if (momentType === 'shock') {
    return { maxStep: 1.0, smoothing: 0.0 };
  }
  
  // Breakthrough moments can move significantly
  if (momentType === 'breakthrough') {
    return { maxStep: 0.25, smoothing: 0.5 };
  }
  
  // Trust drops need to be felt
  if (momentType === 'trust_drop') {
    if (severity === 'high') return { maxStep: 0.20, smoothing: 0.6 };
    if (severity === 'medium') return { maxStep: 0.15, smoothing: 0.7 };
    return { maxStep: 0.12, smoothing: 0.75 };
  }
  
  // Critical moments (major objection, confusion)
  if (momentType === 'critical') {
    return { maxStep: 0.18, smoothing: 0.65 };
  }
  
  // Neutral - very smooth
  return { maxStep: 0.10, smoothing: 0.8 };
}

/**
 * Detect shock events - critical failures that bypass physics
 * Rare but necessary for realism (disrespect = instant call death)
 */
function detectShockEvent(labels: StrategyLabels): { isShock: boolean; overrideState?: Partial<StateDeltas> } {
  // Disrespectful behavior = immediate shutdown
  if (labels.primary_failure === 'disrespectful') {
    return {
      isShock: true,
      overrideState: {
        trust: 0.05,      // Trust destroyed
        resistance: 0.95,  // Maximum resistance
        openness: 0.05,    // Closed off
        patience: 0.1      // Nearly zero patience
      }
    };
  }
  
  // Multiple critical failures in hostile interaction
  if (labels.primary_failure !== 'no_dominant_failure' && 
      labels.interaction_quality === 'very_negative' &&
      labels.objection_handling === 'made_worse') {
    return {
      isShock: true,
      overrideState: {
        trust: 0.1,
        resistance: 0.9,
        openness: 0.1,
        patience: 0.15
      }
    };
  }
  
  return { isShock: false };
}

/**
 * Apply deltas with full behavioral hierarchy:
 * 1. Check for shock events (bypass physics)
 * 2. Apply dominance-weighted deltas
 * 3. Apply emotional coupling
 * 4. Apply context-aware physics
 */
export function applyDeltasWithHierarchy(
  currentState: { trust: number; resistance: number; openness: number; patience: number },
  labels: StrategyLabels,
  momentType: MomentType = 'neutral',
  severity: SeverityLevel = 'medium'
): { trust: number; resistance: number; openness: number; patience: number } {
  
  // 1. Check for shock events - bypass all physics
  const shock = detectShockEvent(labels);
  if (shock.isShock && shock.overrideState) {
    console.log('💥 [Shock Event] Bypassing physics - immediate state override');
    return {
      trust: shock.overrideState.trust ?? currentState.trust,
      resistance: shock.overrideState.resistance ?? currentState.resistance,
      openness: shock.overrideState.openness ?? currentState.openness,
      patience: shock.overrideState.patience ?? currentState.patience
    };
  }
  
  // 2. Compute dominance-weighted deltas
  const rawDeltas = computeDeltas(labels, currentState);
  
  // 3. Apply emotional coupling (deltas affect each other)
  const proposedState = {
    trust: currentState.trust + rawDeltas.trust,
    resistance: currentState.resistance + rawDeltas.resistance,
    openness: currentState.openness + rawDeltas.openness,
    patience: currentState.patience + rawDeltas.patience
  };
  const coupledDeltas = applyCoupling(rawDeltas, proposedState);
  
  // 4. Apply context-aware physics to each dimension
  const finalMomentType = shock.isShock ? 'shock' : momentType;
  
  const newTrust = applyDeltaWithPhysics(
    currentState.trust,
    coupledDeltas.trust,
    finalMomentType,
    severity
  );
  const newResistance = applyDeltaWithPhysics(
    currentState.resistance,
    coupledDeltas.resistance,
    finalMomentType,
    severity
  );
  const newOpenness = applyDeltaWithPhysics(
    currentState.openness,
    coupledDeltas.openness,
    finalMomentType,
    severity
  );
  const newPatience = applyDeltaWithPhysics(
    currentState.patience,
    coupledDeltas.patience,
    finalMomentType,
    severity
  );
  
  return {
    trust: newTrust,
    resistance: newResistance,
    openness: newOpenness,
    patience: newPatience
  };
}

/**
 * Apply delta with context-aware physics (low-level function)
 */
export function applyDeltaWithPhysics(
  current: number,
  delta: number,
  momentType: MomentType = 'neutral',
  severity: SeverityLevel = 'medium'
): number {
  const { maxStep, smoothing } = getPhysicsParams(momentType, severity);
  
  // Clamp single-turn changes
  const clampedDelta = Math.max(-maxStep, Math.min(maxStep, delta));
  
  // Apply with inertia
  const proposed = current + clampedDelta;
  const smoothed = current * smoothing + proposed * (1 - smoothing);
  
  // Hard bounds [0, 1]
  return Math.max(0, Math.min(1, smoothed));
}

/**
 * Evaluation → Outcome tracking for learning loop
 */
export interface EvaluationOutcome {
  sessionId: string;
  turn: number;
  timestamp: number;
  
  // Evaluation
  labels: StrategyLabels;
  credibility_score: number;
  
  // State
  state_before: {
    trust: number;
    resistance: number;
    openness: number;
    patience: number;
  };
  state_after: {
    trust: number;
    resistance: number;
    openness: number;
    patience: number;
  };
  
  // Outcome (set at end of call)
  eventual_outcome?: 'success' | 'failure' | 'neutral';
  user_rating?: number;
  call_duration?: number;
}

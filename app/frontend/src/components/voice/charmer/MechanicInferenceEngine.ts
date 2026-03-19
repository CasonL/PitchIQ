/**
 * MechanicInferenceEngine.ts
 * Combines surface signals into composite mechanics
 * Determines interaction effects and priorities
 */

import { DetectedSignal, SignalType } from './SignalDetector';

export interface InferredMechanic {
  type: MechanicType;
  confidence: number;
  supportingSignals: DetectedSignal[];
  effectDirection: 'positive' | 'negative' | 'mixed' | 'neutral';
  priority: number;
  explanation: string;
}

export type MechanicType =
  | 'permission_without_value'
  | 'value_before_permission'
  | 'permission_with_value'
  | 'value_without_ask'
  | 'discovery_with_context'
  | 'discovery_without_context'
  | 'close_ended_with_value'
  | 'close_ended_without_value'
  | 'pitch_before_rapport'
  | 'context_before_pitch'
  | 'vague_relevance_claim'
  | 'specific_value_proposition'
  | 'generic_business_topic'
  | 'softened_authority'
  | 'definitive_overclaim'
  | 'apologetic_opening'
  | 'confident_opening'
  | 'assumption_without_discovery'
  | 'feature_without_outcome'
  | 'outcome_focused';

export class MechanicInferenceEngine {
  infer(signals: DetectedSignal[]): InferredMechanic[] {
    const mechanics: InferredMechanic[] = [];

    // Sort signals by position for sequence analysis
    const sortedSignals = [...signals].sort((a, b) => a.position - b.position);

    // Permission mechanics
    const permissionMechanics = this.analyzePermissionPatterns(sortedSignals);
    mechanics.push(...permissionMechanics);

    // Value/context mechanics
    const valueMechanics = this.analyzeValuePatterns(sortedSignals);
    mechanics.push(...valueMechanics);

    // Discovery mechanics
    const discoveryMechanics = this.analyzeDiscoveryPatterns(sortedSignals);
    mechanics.push(...discoveryMechanics);

    // Pitch timing mechanics
    const pitchMechanics = this.analyzePitchTiming(sortedSignals);
    mechanics.push(...pitchMechanics);

    // Quality mechanics
    const qualityMechanics = this.analyzeQualityPatterns(sortedSignals);
    mechanics.push(...qualityMechanics);

    // Assign priorities
    return this.assignPriorities(mechanics);
  }

  private analyzePermissionPatterns(signals: DetectedSignal[]): InferredMechanic[] {
    const mechanics: InferredMechanic[] = [];
    
    const permissionSignals = signals.filter(s => s.type === 'permission_ask');
    const valueSignals = signals.filter(s => 
      s.type === 'value_statement' || s.type === 'context_statement'
    );

    if (permissionSignals.length > 0) {
      const firstPermission = permissionSignals[0];
      const hasValueBefore = valueSignals.some(v => v.position < firstPermission.position);
      const hasValueAfter = valueSignals.some(v => v.position > firstPermission.position);

      if (!hasValueBefore && !hasValueAfter) {
        // Permission without any value
        mechanics.push({
          type: 'permission_without_value',
          confidence: 0.95,
          supportingSignals: [firstPermission],
          effectDirection: 'negative',
          priority: 1,
          explanation: 'Asked for time without giving reason to stay'
        });
      } else if (!hasValueBefore && hasValueAfter) {
        // Permission before value
        mechanics.push({
          type: 'permission_with_value',
          confidence: 0.85,
          supportingSignals: [firstPermission, ...valueSignals],
          effectDirection: 'mixed',
          priority: 2,
          explanation: 'Permission ask followed by value - suboptimal sequence'
        });
      } else if (hasValueBefore) {
        // Value before permission
        mechanics.push({
          type: 'value_before_permission',
          confidence: 0.90,
          supportingSignals: [firstPermission, ...valueSignals],
          effectDirection: 'positive',
          priority: 3,
          explanation: 'Provided value before asking for time - good sequence'
        });
      }
    } else if (valueSignals.length > 0) {
      // Value without asking permission
      mechanics.push({
        type: 'value_without_ask',
        confidence: 0.80,
        supportingSignals: valueSignals,
        effectDirection: 'positive',
        priority: 2,
        explanation: 'Led with value, no permission ask needed'
      });
    }

    return mechanics;
  }

  private analyzeValuePatterns(signals: DetectedSignal[]): InferredMechanic[] {
    const mechanics: InferredMechanic[] = [];

    const valueSignals = signals.filter(s => s.type === 'value_statement');
    const specificityHigh = signals.filter(s => s.type === 'specificity_high');
    const specificityLow = signals.filter(s => s.type === 'specificity_low');
    const relevanceClaims = signals.filter(s => s.type === 'relevance_claim');

    if (valueSignals.length > 0 && specificityHigh.length > 0) {
      mechanics.push({
        type: 'specific_value_proposition',
        confidence: 0.90,
        supportingSignals: [...valueSignals, ...specificityHigh],
        effectDirection: 'positive',
        priority: 2,
        explanation: 'Specific, measurable value stated'
      });
    } else if (valueSignals.length > 0 && specificityLow.length > 0) {
      mechanics.push({
        type: 'generic_business_topic',
        confidence: 0.85,
        supportingSignals: [...valueSignals, ...specificityLow],
        effectDirection: 'negative',
        priority: 2,
        explanation: 'Value mentioned but too vague/generic'
      });
    }

    if (relevanceClaims.length > 0 && specificityLow.length > 0) {
      mechanics.push({
        type: 'vague_relevance_claim',
        confidence: 0.80,
        supportingSignals: [...relevanceClaims, ...specificityLow],
        effectDirection: 'mixed',
        priority: 3,
        explanation: 'Claimed relevance but without specificity'
      });
    }

    return mechanics;
  }

  private analyzeDiscoveryPatterns(signals: DetectedSignal[]): InferredMechanic[] {
    const mechanics: InferredMechanic[] = [];

    const discoveryQuestions = signals.filter(s => s.type === 'discovery_question');
    const closeEndedQuestions = signals.filter(s => s.type === 'close_ended_question');
    const contextSignals = signals.filter(s => 
      s.type === 'context_statement' || s.type === 'value_statement'
    );

    if (discoveryQuestions.length > 0) {
      const hasContext = contextSignals.some(c => c.position < discoveryQuestions[0].position);
      
      if (hasContext) {
        mechanics.push({
          type: 'discovery_with_context',
          confidence: 0.90,
          supportingSignals: [...discoveryQuestions, ...contextSignals],
          effectDirection: 'positive',
          priority: 2,
          explanation: 'Asked discovery question after establishing context'
        });
      } else {
        mechanics.push({
          type: 'discovery_without_context',
          confidence: 0.85,
          supportingSignals: discoveryQuestions,
          effectDirection: 'mixed',
          priority: 2,
          explanation: 'Asked discovery without context - may feel random'
        });
      }
    }

    if (closeEndedQuestions.length > 0) {
      const hasValue = contextSignals.length > 0;
      
      if (hasValue) {
        mechanics.push({
          type: 'close_ended_with_value',
          confidence: 0.80,
          supportingSignals: [...closeEndedQuestions, ...contextSignals],
          effectDirection: 'mixed',
          priority: 3,
          explanation: 'Close-ended question but with value present'
        });
      } else {
        mechanics.push({
          type: 'close_ended_without_value',
          confidence: 0.85,
          supportingSignals: closeEndedQuestions,
          effectDirection: 'negative',
          priority: 2,
          explanation: 'Close-ended question without value - easy to dodge'
        });
      }
    }

    return mechanics;
  }

  private analyzePitchTiming(signals: DetectedSignal[]): InferredMechanic[] {
    const mechanics: InferredMechanic[] = [];

    const pitchMarkers = signals.filter(s => s.type === 'pitch_marker');
    const greetings = signals.filter(s => s.type === 'greeting');
    const rapportTokens = signals.filter(s => s.type === 'rapport_token');

    if (pitchMarkers.length > 0) {
      const hasRapport = greetings.length > 0 || rapportTokens.length > 0;
      const pitchPosition = pitchMarkers[0].position;
      const rapportPosition = hasRapport 
        ? Math.min(...[...greetings, ...rapportTokens].map(s => s.position))
        : Infinity;

      if (!hasRapport || pitchPosition < rapportPosition + 10) {
        mechanics.push({
          type: 'pitch_before_rapport',
          confidence: 0.90,
          supportingSignals: pitchMarkers,
          effectDirection: 'negative',
          priority: 1,
          explanation: 'Led with company/pitch before establishing connection'
        });
      } else {
        mechanics.push({
          type: 'context_before_pitch',
          confidence: 0.85,
          supportingSignals: [...rapportTokens, ...greetings, ...pitchMarkers],
          effectDirection: 'positive',
          priority: 3,
          explanation: 'Established rapport before mentioning company'
        });
      }
    }

    return mechanics;
  }

  private analyzeQualityPatterns(signals: DetectedSignal[]): InferredMechanic[] {
    const mechanics: InferredMechanic[] = [];

    const softenedClaims = signals.filter(s => s.type === 'softened_claim');
    const definitiveClaims = signals.filter(s => s.type === 'definitive_claim');
    const apologetic = signals.filter(s => s.type === 'apologetic_language');
    const fillers = signals.filter(s => s.type === 'filler_opening');
    const assumptions = signals.filter(s => s.type === 'assumption_marker');
    const features = signals.filter(s => s.type === 'feature_mention');
    const outcomes = signals.filter(s => s.type === 'outcome_mention');

    if (softenedClaims.length > 2) {
      mechanics.push({
        type: 'softened_authority',
        confidence: 0.75,
        supportingSignals: softenedClaims,
        effectDirection: 'negative',
        priority: 3,
        explanation: 'Over-hedging with "might", "could" - sounds uncertain'
      });
    }

    if (definitiveClaims.length > 1) {
      mechanics.push({
        type: 'definitive_overclaim',
        confidence: 0.80,
        supportingSignals: definitiveClaims,
        effectDirection: 'negative',
        priority: 2,
        explanation: 'Overpromising with "guaranteed", "always" - damages trust'
      });
    }

    if (apologetic.length > 0 || fillers.length > 0) {
      mechanics.push({
        type: 'apologetic_opening',
        confidence: 0.85,
        supportingSignals: [...apologetic, ...fillers],
        effectDirection: 'negative',
        priority: 2,
        explanation: 'Apologetic/weak opening - gave permission to ignore'
      });
    }

    if (assumptions.length > 0) {
      const hasDiscovery = signals.some(s => s.type === 'discovery_question');
      if (!hasDiscovery) {
        mechanics.push({
          type: 'assumption_without_discovery',
          confidence: 0.85,
          supportingSignals: assumptions,
          effectDirection: 'negative',
          priority: 2,
          explanation: 'Making assumptions without asking - risky'
        });
      }
    }

    if (features.length > 0 && outcomes.length === 0) {
      mechanics.push({
        type: 'feature_without_outcome',
        confidence: 0.85,
        supportingSignals: features,
        effectDirection: 'negative',
        priority: 2,
        explanation: 'Listed features without explaining what changes for buyer'
      });
    } else if (outcomes.length > 0) {
      mechanics.push({
        type: 'outcome_focused',
        confidence: 0.85,
        supportingSignals: outcomes,
        effectDirection: 'positive',
        priority: 2,
        explanation: 'Focused on outcomes for buyer, not just features'
      });
    }

    return mechanics;
  }

  private assignPriorities(mechanics: InferredMechanic[]): InferredMechanic[] {
    // Re-prioritize based on effect direction and confidence
    const priorityMap: Record<string, number> = {
      'permission_without_value': 1,
      'pitch_before_rapport': 1,
      'close_ended_without_value': 2,
      'generic_business_topic': 2,
      'apologetic_opening': 2,
      'assumption_without_discovery': 2,
      'feature_without_outcome': 2,
      'definitive_overclaim': 2,
      'permission_with_value': 2,
      'discovery_without_context': 2,
      'vague_relevance_claim': 3,
      'softened_authority': 3,
      'close_ended_with_value': 3,
      'value_before_permission': 2,
      'discovery_with_context': 2,
      'specific_value_proposition': 2,
      'outcome_focused': 2,
      'value_without_ask': 2,
      'context_before_pitch': 3,
      'confident_opening': 3
    };

    return mechanics.map(m => ({
      ...m,
      priority: priorityMap[m.type] || m.priority
    })).sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.confidence - a.confidence;
    });
  }

  getTopMechanics(mechanics: InferredMechanic[], count: number = 2): InferredMechanic[] {
    return mechanics.slice(0, count);
  }

  getNegativeMechanics(mechanics: InferredMechanic[]): InferredMechanic[] {
    return mechanics.filter(m => m.effectDirection === 'negative');
  }

  getPositiveMechanics(mechanics: InferredMechanic[]): InferredMechanic[] {
    return mechanics.filter(m => m.effectDirection === 'positive');
  }
}

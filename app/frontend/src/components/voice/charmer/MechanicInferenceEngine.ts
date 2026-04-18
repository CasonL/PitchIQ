/**
 * MechanicInferenceEngine.ts
 * Combines surface signals into composite mechanics
 * Determines interaction effects and priorities
 */

import { DetectedSignal, SignalType } from './SignalDetector';
import { OpenerQualityScore } from './OpenerQualityEvaluator';

export interface InferredMechanic {
  type: MechanicType;
  confidence: number;
  supportingSignals: DetectedSignal[];
  effectDirection: 'positive' | 'negative' | 'mixed' | 'neutral';
  priority: number;
  explanation: string;
  qualityScore?: number; // 0-10: How well was this executed? (lower = weaker)
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
  | 'identity_without_payoff'
  | 'identity_with_relevance'
  | 'vague_relevance_claim'
  | 'specific_value_proposition'
  | 'generic_business_topic'
  | 'low_outcome_specificity'
  | 'softened_authority'
  | 'definitive_overclaim'
  | 'apologetic_opening'
  | 'confident_opening'
  | 'assumption_without_discovery'
  | 'feature_without_outcome'
  | 'outcome_focused';

export class MechanicInferenceEngine {
  infer(signals: DetectedSignal[], qualityScores?: OpenerQualityScore): InferredMechanic[] {
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

    // Attach quality scores to relevant mechanics
    if (qualityScores) {
      this.attachQualityScores(mechanics, qualityScores);
    }

    // Assign priorities (now factors in quality)
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
    const outcomeSpecificityHigh = signals.filter(s => s.type === 'outcome_specificity_high');
    const topicSpecificityLow = signals.filter(s => s.type === 'topic_specificity_low');
    const relevanceClaims = signals.filter(s => s.type === 'relevance_claim');

    if (valueSignals.length > 0 && outcomeSpecificityHigh.length > 0) {
      mechanics.push({
        type: 'specific_value_proposition',
        confidence: 0.90,
        supportingSignals: [...valueSignals, ...outcomeSpecificityHigh],
        effectDirection: 'positive',
        priority: 2,
        explanation: 'Specific, measurable value stated'
      });
    } else if (valueSignals.length > 0 && topicSpecificityLow.length > 0) {
      mechanics.push({
        type: 'generic_business_topic',
        confidence: 0.85,
        supportingSignals: [...valueSignals, ...topicSpecificityLow],
        effectDirection: 'negative',
        priority: 2,
        explanation: 'Value mentioned but too vague/generic'
      });
    }

    if (outcomeSpecificityHigh.length === 0 && valueSignals.length > 0) {
      mechanics.push({
        type: 'low_outcome_specificity',
        confidence: 0.75,
        supportingSignals: valueSignals,
        effectDirection: 'mixed',
        priority: 3,
        explanation: 'Value mentioned but no specific metrics/outcomes'
      });
    }

    if (relevanceClaims.length > 0 && topicSpecificityLow.length > 0) {
      mechanics.push({
        type: 'vague_relevance_claim',
        confidence: 0.80,
        supportingSignals: [...relevanceClaims, ...topicSpecificityLow],
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

    const identityMarkers = signals.filter(s => s.type === 'identity_marker');
    const valueSignals = signals.filter(s => 
      s.type === 'value_statement' || s.type === 'context_statement'
    );
    const relevanceClaims = signals.filter(s => s.type === 'relevance_claim');

    if (identityMarkers.length > 0) {
      const identityPosition = identityMarkers[0].position;
      const hasValueBefore = valueSignals.some(v => v.position < identityPosition);
      const hasRelevanceBefore = relevanceClaims.some(r => r.position < identityPosition);

      if (!hasValueBefore && !hasRelevanceBefore) {
        mechanics.push({
          type: 'identity_without_payoff',
          confidence: 0.90,
          supportingSignals: identityMarkers,
          effectDirection: 'negative',
          priority: 1,
          explanation: 'Named yourself/company without giving reason to care'
        });
      } else if (hasValueBefore || hasRelevanceBefore) {
        mechanics.push({
          type: 'identity_with_relevance',
          confidence: 0.85,
          supportingSignals: [...identityMarkers, ...valueSignals, ...relevanceClaims],
          effectDirection: 'positive',
          priority: 3,
          explanation: 'Established relevance before revealing identity'
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
    // Structural importance: how much does this mechanic type matter?
    const structuralImportance: Record<MechanicType, number> = {
      'permission_without_value': 10,
      'value_without_ask': 9,
      'identity_without_payoff': 8,
      'apologetic_opening': 7,
      'assumption_without_discovery': 9,
      'discovery_without_context': 8,
      'feature_without_outcome': 7,
      'vague_relevance_claim': 8,
      'generic_business_topic': 7,
      'low_outcome_specificity': 8,
      'softened_authority': 6,
      'definitive_overclaim': 7,
      'close_ended_without_value': 6,
      'permission_with_value': 5,
      'close_ended_with_value': 5,
      'value_before_permission': 6,
      'discovery_with_context': 4,
      'specific_value_proposition': 4,
      'outcome_focused': 4,
      'identity_with_relevance': 5,
      'confident_opening': 3
    };

    return mechanics.map(m => {
      const importance = structuralImportance[m.type] || 5;
      
      // If quality score exists, calculate weakness severity
      // qualityScore is 0-10 where lower = worse
      // weakness_severity should be 0-1 where higher = worse
      const weaknessSeverity = m.qualityScore !== undefined
        ? (10 - m.qualityScore) / 10  // 0.0 (perfect) to 1.0 (terrible)
        : 0.5; // Default if no quality score
      
      // Priority = structural importance × weakness severity
      // Lower priority number = more important (higher in list)
      // Invert so lower numbers come first
      const calculatedPriority = 100 - (importance * weaknessSeverity * 10);
      
      return {
        ...m,
        priority: calculatedPriority
      };
    }).sort((a, b) => {
      // Sort by priority (lower = more important)
      if (Math.abs(a.priority - b.priority) > 0.1) {
        return a.priority - b.priority;
      }
      // Tiebreaker: confidence
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

  /**
   * Attach quality scores from OpenerQualityEvaluator to relevant mechanics
   * Maps dimensions to mechanic types:
   * - clarityOfPurpose → value/context mechanics
   * - specificRelevance → relevance/value mechanics
   * - distinctiveness → generic vs specific mechanics
   * - frictionLoad → all mechanics (lower quality if high friction)
   */
  private attachQualityScores(mechanics: InferredMechanic[], scores: OpenerQualityScore): void {
    mechanics.forEach(m => {
      switch (m.type) {
        case 'value_without_ask':
        case 'specific_value_proposition':
        case 'value_before_permission':
          // Value clarity + distinctiveness
          m.qualityScore = ((scores.clarityOfPurpose + scores.distinctiveness) / 2) * 10;
          break;
          
        case 'vague_relevance_claim':
        case 'identity_with_relevance':
          // Relevance + distinctiveness
          m.qualityScore = ((scores.specificRelevance + scores.distinctiveness) / 2) * 10;
          break;
          
        case 'low_outcome_specificity':
        case 'outcome_focused':
          // Clarity + specificity
          m.qualityScore = ((scores.clarityOfPurpose + scores.specificRelevance) / 2) * 10;
          break;
          
        case 'generic_business_topic':
          // Pure distinctiveness
          m.qualityScore = scores.distinctiveness * 10;
          break;
          
        case 'softened_authority':
        case 'apologetic_opening':
          // Friction load (invert - high friction = low quality)
          m.qualityScore = (1 - scores.frictionLoad) * 10;
          break;
          
        case 'identity_without_payoff':
          // Clarity (did they explain why after intro?)
          m.qualityScore = scores.clarityOfPurpose * 10;
          break;
          
        default:
          // Average of all dimensions
          const avg = (scores.clarityOfPurpose + scores.specificRelevance + scores.distinctiveness + (1 - scores.frictionLoad)) / 4;
          m.qualityScore = avg * 10;
      }
    });
  }
}

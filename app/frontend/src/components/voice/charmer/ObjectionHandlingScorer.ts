/**
 * ObjectionHandlingScorer.ts
 * Intelligent objection handling scoring that rewards earned resolution through discovery
 * Integrates with: DiscoveryMomentDetector, ObjectionGenerator, AnswerEvaluator, CognitiveCompleteness
 */

import type { ObjectionEvent } from './CallMetrics';
import type { DiscoveryState } from './DiscoveryMomentDetector';
import type { AnswerImpact } from './AnswerEvaluator';

export interface ObjectionContext {
  objection: ObjectionEvent;
  raisedAtUtterance: number;
  answerQuality?: AnswerImpact;
  repeatCount: number;
  escalated: boolean;
  // From ObjectionGenerator - marks objection quality tier
  tier?: 'generic' | 'category' | 'feature' | 'pricing' | 'proof';
  fromDiscoveryMoment?: boolean;
}

export interface ObjectionHandlingScore {
  overall: number; // 0-100
  breakdown: {
    qualityWeighted: number;    // 0-40 - Handled high-value objections
    discoveryContext: number;   // 0-30 - Did discovery before handling
    answerQuality: number;      // 0-20 - LLM-evaluated answer quality
    resolution: number;         // 0-10 - Actually resolved vs just addressed
  };
  penalties: {
    pitchMonster: number;       // Resolved without discovery
    escalation: number;         // Repeated same objection
    incomplete: number;         // Hedging/incomplete answers
  };
  insights: string[];
}

export class ObjectionHandlingScorer {
  
  /**
   * Calculate intelligent objection handling score (0-100)
   * Rewards earned resolution through discovery, penalizes pitch-then-handle
   */
  static calculateScore(
    objections: ObjectionContext[],
    discoveryState: DiscoveryState,
    totalUtterances: number
  ): ObjectionHandlingScore {
    
    if (objections.length === 0) {
      return {
        overall: 0,
        breakdown: { qualityWeighted: 0, discoveryContext: 0, answerQuality: 0, resolution: 0 },
        penalties: { pitchMonster: 0, escalation: 0, incomplete: 0 },
        insights: ['No objections raised - N/A']
      };
    }
    
    let qualityWeightedScore = 0;
    let discoveryContextScore = 0;
    let answerQualityScore = 0;
    let resolutionScore = 0;
    
    let pitchMonsterPenalty = 0;
    let escalationPenalty = 0;
    let incompletePenalty = 0;
    
    const insights: string[] = [];
    let totalWeight = 0;
    
    objections.forEach(obj => {
      // 1. OBJECTION TIER WEIGHT (1x-3x)
      const tierWeight = this.getObjectionTierWeight(obj.tier);
      totalWeight += tierWeight;
      
      // 2. DISCOVERY CONTEXT (0-30 points per objection, weighted)
      const discoveryModifier = this.calculateDiscoveryModifier(
        obj.raisedAtUtterance,
        discoveryState,
        totalUtterances
      );
      const discoveryPoints = discoveryModifier.score * tierWeight;
      discoveryContextScore += discoveryPoints;
      
      // Track pitch monster behavior (low discovery + claimed resolution)
      if (discoveryModifier.score < 10 && obj.objection.resolved) {
        pitchMonsterPenalty += 15;
        insights.push(`Resolved "${obj.objection.surface}" without understanding their world`);
      }
      
      // 3. ANSWER QUALITY (0-20 points per objection, weighted)
      if (obj.answerQuality) {
        const qualityPoints = this.calculateAnswerQuality(obj.answerQuality);
        answerQualityScore += qualityPoints * tierWeight;
        
        // Track incomplete answers
        if (!obj.answerQuality.addressed || (obj.answerQuality.credibilityBuilt ?? 0) < 4) {
          incompletePenalty += 5;
        }
      } else if (obj.objection.addressed) {
        // Addressed but no quality data - assume mediocre
        answerQualityScore += 10 * tierWeight;
      }
      
      // 4. RESOLUTION (0-10 points per objection, weighted)
      if (obj.objection.resolved) {
        resolutionScore += 10 * tierWeight;
      } else if (obj.objection.addressed) {
        resolutionScore += 4 * tierWeight;
      }
      
      // 5. ESCALATION PENALTY
      if (obj.repeatCount >= 3) {
        escalationPenalty += 20;
        insights.push(`"${obj.objection.surface}" repeated ${obj.repeatCount}x - not truly resolving`);
      } else if (obj.escalated) {
        escalationPenalty += 10;
        insights.push(`Objection escalated - initial answer insufficient`);
      }
      
      // 6. QUALITY INSIGHTS
      if (obj.tier === 'proof' || obj.tier === 'pricing') {
        qualityWeightedScore += 15 * tierWeight;
        if (obj.objection.resolved) {
          insights.push(`Handled high-value ${obj.tier} objection`);
        }
      } else if (obj.tier === 'feature') {
        qualityWeightedScore += 10 * tierWeight;
      } else {
        qualityWeightedScore += 5 * tierWeight;
      }
    });
    
    // Normalize by total weight
    if (totalWeight > 0) {
      discoveryContextScore = (discoveryContextScore / totalWeight) * 30;
      answerQualityScore = (answerQualityScore / totalWeight) * 20;
      resolutionScore = (resolutionScore / totalWeight) * 10;
      qualityWeightedScore = (qualityWeightedScore / totalWeight) * 40;
    }
    
    // Calculate overall with penalties
    const rawScore = qualityWeightedScore + discoveryContextScore + answerQualityScore + resolutionScore;
    const overall = Math.max(0, Math.min(100, rawScore - pitchMonsterPenalty - escalationPenalty - incompletePenalty));
    
    // Add positive insights
    if (overall >= 80) {
      insights.unshift('Earned resolution through discovery');
    } else if (discoveryContextScore >= 25) {
      insights.unshift('Strong discovery context before handling');
    }
    
    return {
      overall: Math.round(overall),
      breakdown: {
        qualityWeighted: Math.round(qualityWeightedScore),
        discoveryContext: Math.round(discoveryContextScore),
        answerQuality: Math.round(answerQualityScore),
        resolution: Math.round(resolutionScore)
      },
      penalties: {
        pitchMonster: Math.round(pitchMonsterPenalty),
        escalation: Math.round(escalationPenalty),
        incomplete: Math.round(incompletePenalty)
      },
      insights
    };
  }
  
  /**
   * Get weight multiplier based on objection quality tier
   * Higher tier = more important to handle well
   */
  private static getObjectionTierWeight(tier?: string): number {
    switch (tier) {
      case 'proof': return 3.0;      // "Those case studies aren't our industry"
      case 'pricing': return 2.5;    // "$99/user too expensive"
      case 'feature': return 2.0;    // "No API integration"
      case 'category': return 1.5;   // "We already have CRM"
      case 'generic': return 1.0;    // "Not interested"
      default: return 1.5;           // Unknown, assume mid-tier
    }
  }
  
  /**
   * Calculate discovery context modifier
   * Rewards doing discovery before objection arises and before answering
   */
  private static calculateDiscoveryModifier(
    objectionUtterance: number,
    discoveryState: DiscoveryState,
    totalUtterances: number
  ): { score: number; reason: string } {
    
    // How many discovery moments happened BEFORE this objection?
    const priorDiscovery = discoveryState.moments.filter(
      m => m.detectedAt < objectionUtterance
    ).length;
    
    // How deep into the call was the objection raised?
    const callProgress = objectionUtterance / Math.max(totalUtterances, 1);
    
    // Calculate discovery depth (0-10)
    let discoveryDepth = 0;
    
    // Base score from prior discovery moments
    discoveryDepth += Math.min(priorDiscovery * 2, 6);
    
    // Bonus for having key context
    if (discoveryState.productCategory) discoveryDepth += 1;
    if (discoveryState.valueProposition) discoveryDepth += 1;
    if (discoveryState.keyFeatures.length > 0) discoveryDepth += 1;
    if (discoveryState.pricingModel) discoveryDepth += 1;
    
    // Early objection with low discovery = pitch monster
    if (callProgress < 0.3 && discoveryDepth < 3) {
      return {
        score: 0,
        reason: 'Pitched too early - no discovery context'
      };
    }
    
    // Mid-call with moderate discovery = acceptable
    if (callProgress < 0.6 && discoveryDepth >= 4) {
      return {
        score: 20,
        reason: 'Some discovery before handling'
      };
    }
    
    // Late-call with deep discovery = earned
    if (callProgress >= 0.4 && discoveryDepth >= 7) {
      return {
        score: 30,
        reason: 'Deep discovery context - earned the right to handle'
      };
    }
    
    // Default: partial credit based on discovery depth
    return {
      score: Math.round((discoveryDepth / 10) * 30),
      reason: `${discoveryDepth}/10 discovery depth`
    };
  }
  
  /**
   * Calculate answer quality from LLM-evaluated AnswerImpact
   * Uses credibility, specificity, relevance from AnswerEvaluator
   */
  private static calculateAnswerQuality(answerImpact: AnswerImpact): number {
    if (!answerImpact.addressed) return 0;
    
    const credibility = answerImpact.credibilityBuilt ?? 5;
    const specificity = answerImpact.specificityScore ?? 5;
    const relevance = answerImpact.relevanceScore ?? 5;
    
    // Weighted composite (credibility matters most)
    const composite = (
      (credibility * 0.40) +
      (specificity * 0.35) +
      (relevance * 0.25)
    );
    
    // Scale to 0-20
    return (composite / 10) * 20;
  }
  
  /**
   * Compare objection handling to other call phases
   * Returns relative performance insights
   */
  static compareToOtherPhases(
    objectionScore: number,
    openingScore: number,
    discoveryScore: number,
    positioningScore: number
  ): {
    rank: 1 | 2 | 3 | 4;
    isStrongest: boolean;
    isWeakest: boolean;
    comparison: string;
  } {
    const scores = [
      { phase: 'Opening', score: openingScore },
      { phase: 'Discovery', score: discoveryScore },
      { phase: 'Objection Handling', score: objectionScore },
      { phase: 'Positioning', score: positioningScore }
    ].sort((a, b) => b.score - a.score);
    
    const objRank = scores.findIndex(s => s.phase === 'Objection Handling') + 1;
    const strongest = scores[0];
    const weakest = scores[3];
    
    let comparison = '';
    if (objRank === 1) {
      comparison = `Your strongest area - ${Math.round(objectionScore - scores[1].score)} points ahead of ${scores[1].phase}`;
    } else if (objRank === 4) {
      comparison = `Biggest opportunity - ${Math.round(strongest.score - objectionScore)} points behind ${strongest.phase}`;
    } else {
      const delta = Math.round(strongest.score - objectionScore);
      comparison = `${delta} points behind ${strongest.phase}`;
    }
    
    return {
      rank: objRank as 1 | 2 | 3 | 4,
      isStrongest: objRank === 1,
      isWeakest: objRank === 4,
      comparison
    };
  }
}

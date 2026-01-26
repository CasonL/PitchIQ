/**
 * CallMetrics.ts
 * Data structures for post-call feedback system
 */

export interface ObjectionRoot {
  id: string;
  intensity: number; // 0-1
  conscious: boolean; // Can Marcus articulate this?
  status: 'active' | 'softened' | 'resolved';
}

export interface ObjectionEvent {
  id: string;
  timestamp: number;
  surface: string; // What Marcus actually says
  roots: ObjectionRoot[]; // Hidden motivations
  severity: number; // 0-1
  addressed: boolean; // Did user respond in next 1-2 turns?
  resolved: boolean; // Did the guard drop? (Marcus decides)
  softened_roots: string[]; // Which roots got addressed
  still_blocking: string[]; // Which roots still active
}

export interface QuestionAnalysis {
  text: string;
  timestamp: number;
  isOpenEnded: boolean;
  isFollowUp: boolean;
}

export interface CallMetrics {
  // Speaking time (from VAD segments, not words)
  userSpeakingTime: number; // seconds
  marcusSpeakingTime: number; // seconds
  
  // Discovery metrics
  questions: QuestionAnalysis[];
  openEndedCount: number;
  followUpCount: number;
  
  // Objection tracking
  objections: ObjectionEvent[];
  objectionsRaised: number;
  objectionsAddressed: number;
  objectionsResolved: number;
  
  // Call metadata
  totalExchanges: number;
  callDuration: number; // seconds
  winCondition: 'booked' | 'soft_yes' | 'not_yet';
}

export interface RubricScore {
  level: 'Developing' | 'Solid' | 'Strong' | 'Advanced';
  score: number; // 0-10
  strengths: string[]; // 2 items
  bottleneck: string; // 1 item
  trainingPlan: {
    teach: string[]; // What we'll teach them
    challenge: string[]; // How we'll test them
  };
  oneLiner: string; // Punchy summary
  salesDNA: string; // Personality type
}

/**
 * Calculate talk ratio (0-1, where 0.5 = perfectly balanced)
 */
export function calculateTalkRatio(metrics: CallMetrics | undefined): number {
  if (!metrics) return 0.5;
  const total = metrics.userSpeakingTime + metrics.marcusSpeakingTime;
  if (total === 0) return 0.5;
  return metrics.userSpeakingTime / total;
}

/**
 * Get talk ratio quality score (0-10)
 * Green zone: 40-60% user
 * Yellow: 30-40% or 60-70%
 * Red: <30% or >70%
 */
export function scoreTalkRatio(ratio: number): number {
  const percent = ratio * 100;
  
  // Perfect zone: 40-60%
  if (percent >= 40 && percent <= 60) {
    // 10 at exactly 50%, scales down toward edges
    return 10 - Math.abs(50 - percent) * 0.2;
  }
  
  // Good zone: 30-40% or 60-70%
  if ((percent >= 30 && percent < 40) || (percent > 60 && percent <= 70)) {
    // 6-8 range
    if (percent < 40) {
      return 6 + (percent - 30) * 0.2;
    } else {
      return 6 + (70 - percent) * 0.2;
    }
  }
  
  // Red zone: <30% or >70%
  if (percent < 30) {
    return Math.max(0, percent * 0.2);
  } else {
    return Math.max(0, (100 - percent) * 0.2);
  }
}

/**
 * Score discovery quality (0-10)
 */
export function scoreDiscovery(metrics: CallMetrics | undefined): number {
  if (!metrics) return 5;
  const { openEndedCount, followUpCount } = metrics;
  
  // Strong: 5+ open-ended + 2+ follow-ups = 9-10
  // Good: 3-4 open-ended + 1+ follow-ups = 7-8
  // Developing: 1-2 open-ended = 5-6
  // Weak: 0 open-ended = 0-4
  
  let score = 0;
  
  // Open-ended questions are worth more
  score += Math.min(openEndedCount * 1.5, 7);
  
  // Follow-ups show listening
  score += Math.min(followUpCount * 1, 3);
  
  return Math.min(score, 10);
}

/**
 * Score objection handling (0-10)
 */
export function scoreObjectionHandling(metrics: CallMetrics | undefined): number {
  if (!metrics) return 7;
  const { objectionsRaised, objectionsAddressed, objectionsResolved } = metrics;
  
  if (objectionsRaised === 0) return 7; // No objections to handle
  
  const addressedRatio = objectionsAddressed / objectionsRaised;
  const resolvedRatio = objectionsResolved / objectionsRaised;
  
  // Addressed all = 6-7
  // Resolved all = 9-10
  // Mixed = 4-8
  
  const addressedScore = addressedRatio * 6;
  const resolvedBonus = resolvedRatio * 4;
  
  return Math.min(addressedScore + resolvedBonus, 10);
}

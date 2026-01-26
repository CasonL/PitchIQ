/**
 * CallDataSufficiency.ts
 * Determine if there's enough data for meaningful post-call feedback
 * Better to say "not enough data" than give meaningless feedback on a 30s call
 */

import { CallMetrics } from './CallMetrics';

export interface DataSufficiency {
  overall: 'sufficient' | 'partial' | 'insufficient';
  talkRatio: boolean;
  questions: boolean;
  objections: boolean;
  rapport: boolean;
  minDataMessage?: string;
}

/**
 * Minimum thresholds for meaningful feedback
 */
const MIN_THRESHOLDS = {
  // Call must be at least 90 seconds for any meaningful feedback
  MIN_CALL_DURATION: 90,
  
  // Talk ratio needs at least 4 exchanges
  MIN_EXCHANGES_FOR_TALK_RATIO: 4,
  
  // Questions need at least 3 exchanges to assess
  MIN_EXCHANGES_FOR_QUESTIONS: 3,
  
  // Objections need at least 1 objection raised
  MIN_OBJECTIONS: 1,
  
  // Rapport needs at least 60 seconds of conversation
  MIN_DURATION_FOR_RAPPORT: 60,
  
  // Minimum total speaking time (seconds)
  MIN_TOTAL_SPEAKING_TIME: 45
};

/**
 * Check if there's sufficient data for each metric
 */
export function assessDataSufficiency(metrics: CallMetrics | undefined): DataSufficiency {
  // Safe defaults if metrics is missing
  if (!metrics) {
    return {
      overall: 'insufficient',
      talkRatio: false,
      questions: false,
      objections: false,
      rapport: false,
      minDataMessage: 'Call data unavailable'
    };
  }
  
  const {
    callDuration = 0,
    userSpeakingTime = 0,
    marcusSpeakingTime = 0,
    questions = [],
    objections = [],
    totalExchanges = 0
  } = metrics;
  
  const totalSpeakingTime = userSpeakingTime + marcusSpeakingTime;
  
  // Overall call too short - no meaningful feedback possible
  if (callDuration < MIN_THRESHOLDS.MIN_CALL_DURATION) {
    return {
      overall: 'insufficient',
      talkRatio: false,
      questions: false,
      objections: false,
      rapport: false,
      minDataMessage: `Call too short (${callDuration}s). Need at least ${MIN_THRESHOLDS.MIN_CALL_DURATION}s for meaningful feedback.`
    };
  }
  
  // Check each metric
  const hasTalkRatioData = totalExchanges >= MIN_THRESHOLDS.MIN_EXCHANGES_FOR_TALK_RATIO;
  const hasQuestionsData = totalExchanges >= MIN_THRESHOLDS.MIN_EXCHANGES_FOR_QUESTIONS;
  const hasObjectionsData = objections.length >= MIN_THRESHOLDS.MIN_OBJECTIONS;
  const hasRapportData = callDuration >= MIN_THRESHOLDS.MIN_DURATION_FOR_RAPPORT;
  
  // Count how many metrics have sufficient data
  const sufficientMetrics = [
    hasTalkRatioData,
    hasQuestionsData,
    hasObjectionsData,
    hasRapportData
  ].filter(Boolean).length;
  
  // Determine overall sufficiency
  let overall: 'sufficient' | 'partial' | 'insufficient';
  let minDataMessage: string | undefined;
  
  if (sufficientMetrics === 0) {
    overall = 'insufficient';
    minDataMessage = 'Not enough data for any meaningful feedback. Call was too brief or lacked substantive interaction.';
  } else if (sufficientMetrics <= 2) {
    overall = 'partial';
    minDataMessage = 'Limited data available. Some metrics could not be assessed due to short call length.';
  } else {
    overall = 'sufficient';
  }
  
  return {
    overall,
    talkRatio: hasTalkRatioData,
    questions: hasQuestionsData,
    objections: hasObjectionsData,
    rapport: hasRapportData,
    minDataMessage
  };
}

/**
 * Get insufficient data message for a specific metric
 */
export function getInsufficientDataMessage(metric: 'talkRatio' | 'questions' | 'objections' | 'rapport'): string {
  switch (metric) {
    case 'talkRatio':
      return `Not enough exchanges to assess talk ratio. Need at least ${MIN_THRESHOLDS.MIN_EXCHANGES_FOR_TALK_RATIO} back-and-forth exchanges.`;
    
    case 'questions':
      return `Not enough conversation to assess questioning. Need at least ${MIN_THRESHOLDS.MIN_EXCHANGES_FOR_QUESTIONS} exchanges.`;
    
    case 'objections':
      return 'No objections were raised during this call. This metric requires Marcus to surface at least one objection.';
    
    case 'rapport':
      return `Call too short to assess rapport building. Need at least ${MIN_THRESHOLDS.MIN_DURATION_FOR_RAPPORT}s of conversation.`;
    
    default:
      return 'Insufficient data for this metric.';
  }
}

/**
 * Get overall feedback disclaimer based on sufficiency
 */
export function getFeedbackDisclaimer(sufficiency: DataSufficiency): string | null {
  switch (sufficiency.overall) {
    case 'insufficient':
      return '⚠️ **Insufficient Data**: This call was too short to provide meaningful feedback. Try having a longer conversation with Marcus (90+ seconds) to get detailed insights into your sales skills.';
    
    case 'partial':
      return '⚠️ **Limited Data**: Some metrics could not be assessed due to the brevity of this call. For comprehensive feedback, aim for longer interactions where Marcus can surface objections and engage more deeply.';
    
    case 'sufficient':
      return null; // No disclaimer needed
    
    default:
      return null;
  }
}

/**
 * Determine if feedback should be shown at all
 */
export function shouldShowFeedback(sufficiency: DataSufficiency): boolean {
  // Only show feedback if we have at least partial data
  return sufficiency.overall !== 'insufficient';
}

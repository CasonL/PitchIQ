/**
 * PostCallMomentViewModel.ts
 * UI-specific view model for displaying moments in post-call review
 * 
 * This is a PRESENTATION layer - domain logic stays in CriticalMoment/SuccessfulMoment
 */

export type MomentClassification = 
  | 'best_moment' 
  | 'strong_move' 
  | 'turning_point'
  | 'partial_turning_point'
  | 'strong_attempt'
  | 'mixed_signal'
  | 'missed_opportunity' 
  | 'mistake' 
  | 'blunder';

export type ReasonTag = 'Trust' | 'Proof' | 'Discovery' | 'Urgency' | 'Clarity' | 'Fit' | 'Value';

export interface SurroundingExchange {
  speaker: 'user' | 'marcus';
  text: string;
  timestamp: number;
}

/**
 * UI view model for post-call moment display
 * Unified representation for both critical and successful moments
 */
export interface PostCallMomentViewModel {
  id: string;
  type: string;
  classification: MomentClassification;
  reasonTag: ReasonTag;
  timestamp: number;
  turnNumber: number;
  
  title: string;
  
  userMessage: string;
  marcusResponse: string;
  
  surroundingContext: {
    before: SurroundingExchange[];
    after: SurroundingExchange[];
  };
  
  resistanceBefore: number;
  resistanceAfter: number;
  whatChanged: string;
  humanConsequence: string;
  
  whyItMatters: string;
  marcusState: {
    trust: string;
    curiosity: string;
    urgency: string;
    activeObjection?: string;
  };
  
  // Optional LLM enrichment data
  impactScore?: number;
  impactDirection?: 'positive' | 'negative' | 'neutral';
  impactCategory?: string;
  impactReason?: string;
  buyerStateChange?: string;
  isKeyMoment?: boolean;
}

/**
 * MomentViewModelMapper.ts
 * ONE-WAY transformation: Domain models → UI view models
 * 
 * Domain stays clean, UI gets what it needs
 */

import { CriticalMoment, SuccessfulMoment, ConversationExchange } from './ConversationTranscript';
import { PostCallMomentViewModel, MomentClassification, ReasonTag, SurroundingExchange } from './PostCallMomentViewModel';

/**
 * Map domain moments to UI view models for post-call display
 */
export class MomentViewModelMapper {
  
  /**
   * Map critical and successful moments to unified UI view models
   */
  static mapToViewModels(
    criticalMoments: CriticalMoment[],
    successfulMoments: SuccessfulMoment[],
    allExchanges: ConversationExchange[]
  ): PostCallMomentViewModel[] {
    const viewModels: PostCallMomentViewModel[] = [];
    
    // Map critical moments (negative)
    for (const moment of criticalMoments) {
      viewModels.push(this.mapCriticalMoment(moment, allExchanges));
    }
    
    // Map successful moments (positive)
    for (const moment of successfulMoments) {
      viewModels.push(this.mapSuccessfulMoment(moment, allExchanges));
    }
    
    // Sort by timestamp for chronological display
    return viewModels.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  /**
   * Map a CriticalMoment to UI view model
   */
  private static mapCriticalMoment(
    moment: CriticalMoment,
    allExchanges: ConversationExchange[]
  ): PostCallMomentViewModel {
    const classification = this.inferClassification(moment, 'critical');
    const reasonTag = this.inferReasonTag(moment);
    const turnNumber = this.findTurnNumber(moment.timestamp, allExchanges);
    const surroundingContext = this.extractSurroundingContext(turnNumber, allExchanges);
    
    return {
      id: moment.id,
      type: moment.type,
      classification,
      reasonTag,
      timestamp: moment.timestamp,
      turnNumber,
      
      title: this.generateTitle(classification, moment),
      
      userMessage: moment.userMessage,
      marcusResponse: moment.marcusResponse,
      
      surroundingContext,
      
      resistanceBefore: moment.resistanceBefore,
      resistanceAfter: moment.resistanceAfter,
      whatChanged: this.describeResistanceChange(moment.resistanceBefore, moment.resistanceAfter),
      humanConsequence: this.generateHumanConsequence(moment),
      
      whyItMatters: moment.hiddenOpportunity || moment.whatHappened,
      marcusState: this.inferMarcusState(moment),
      
      // Include LLM enrichment if available
      impactScore: moment.impactScore,
      impactDirection: moment.impactDirection,
      impactCategory: moment.impactCategory,
      impactReason: moment.impactReason,
      buyerStateChange: moment.buyerStateChange,
      isKeyMoment: moment.isKeyMoment
    };
  }
  
  /**
   * Map a SuccessfulMoment to UI view model
   */
  private static mapSuccessfulMoment(
    moment: SuccessfulMoment,
    allExchanges: ConversationExchange[]
  ): PostCallMomentViewModel {
    const classification = this.inferClassification(moment, 'success');
    const reasonTag = this.inferReasonTag(moment);
    const turnNumber = this.findTurnNumber(moment.timestamp, allExchanges);
    const surroundingContext = this.extractSurroundingContext(turnNumber, allExchanges);
    
    return {
      id: moment.id,
      type: moment.type,
      classification,
      reasonTag,
      timestamp: moment.timestamp,
      turnNumber,
      
      title: this.generateTitle(classification, moment),
      
      userMessage: moment.userMessage,
      marcusResponse: moment.marcusResponse,
      
      surroundingContext,
      
      resistanceBefore: moment.resistanceBefore,
      resistanceAfter: moment.resistanceAfter,
      whatChanged: this.describeResistanceChange(moment.resistanceBefore, moment.resistanceAfter),
      humanConsequence: this.generateHumanConsequence(moment),
      
      whyItMatters: moment.repeatThis || moment.whatHappened,
      marcusState: this.inferMarcusState(moment),
      
      // Include LLM enrichment if available (SuccessfulMoment has limited enrichment)
      impactScore: moment.impactScore,
      impactDirection: 'positive', // SuccessfulMoments are always positive
      impactCategory: moment.impactCategory,
      impactReason: moment.impactReason,
      buyerStateChange: undefined, // SuccessfulMoment doesn't track this
      isKeyMoment: moment.isKeyMoment
    };
  }
  
  /**
   * Infer UI classification from domain moment
   */
  private static inferClassification(
    moment: CriticalMoment | SuccessfulMoment,
    category: 'critical' | 'success'
  ): MomentClassification {
    if (category === 'success') {
      // Successful moments are always positive
      const successMoment = moment as SuccessfulMoment;
      const impact = successMoment.impact || 0;
      if (impact >= 0.8 || moment.isKeyMoment) return 'best_moment';
      if (impact >= 0.6) return 'turning_point';
      return 'strong_move';
    }
    
    // Critical moments are negative or mixed
    const criticalMoment = moment as CriticalMoment;
    const severity = criticalMoment.severity || 0;
    
    if (severity >= 0.9) return 'blunder';
    if (severity >= 0.7) return 'mistake';
    if (severity >= 0.5) return 'missed_opportunity';
    
    // Lower severity might be partial successes
    return 'mixed_signal';
  }
  
  /**
   * Infer reason tag from moment type and content
   */
  private static inferReasonTag(moment: CriticalMoment | SuccessfulMoment): ReasonTag {
    const type = moment.type.toLowerCase();
    
    if (type.includes('trust') || type.includes('tone')) return 'Trust';
    if (type.includes('pain') || type.includes('discovery')) return 'Discovery';
    if (type.includes('objection') || type.includes('fit')) return 'Fit';
    if (type.includes('value') || type.includes('proof')) return 'Proof';
    if (type.includes('urgency')) return 'Urgency';
    if (type.includes('clarity') || type.includes('rambl')) return 'Clarity';
    
    return 'Fit'; // Default
  }
  
  /**
   * Generate UI title from classification and moment
   */
  private static generateTitle(
    classification: MomentClassification,
    moment: CriticalMoment | SuccessfulMoment
  ): string {
    const prefixes: Record<MomentClassification, string> = {
      best_moment: 'Best moment',
      strong_move: 'Strong move',
      turning_point: 'Turning point',
      partial_turning_point: 'Partial win',
      strong_attempt: 'Good attempt',
      mixed_signal: 'Mixed signal',
      missed_opportunity: 'Missed opportunity',
      mistake: 'Mistake',
      blunder: 'Critical error'
    };
    
    const prefix = prefixes[classification];
    const descriptor = this.generateTitleDescriptor(moment);
    
    return `${prefix}: ${descriptor}`;
  }
  
  /**
   * Generate title descriptor from moment
   */
  private static generateTitleDescriptor(moment: CriticalMoment | SuccessfulMoment): string {
    const type = moment.type.toLowerCase();
    
    if (type.includes('pain')) return 'pain point uncovered';
    if (type.includes('trust')) return 'trust moment';
    if (type.includes('objection_handled')) return 'objection handled well';
    if (type.includes('objection_mishandled')) return 'objection missed';
    if (type.includes('rambl')) return 'lost in details';
    if (type.includes('brevity')) return 'concise response';
    if (type.includes('listen')) return 'active listening';
    if (type.includes('resistance_drop')) return 'resistance dropped';
    if (type.includes('resistance_spike')) return 'resistance spiked';
    if (type.includes('repeat')) return 'repeated objection';
    
    return 'key exchange';
  }
  
  /**
   * Find turn number for a given timestamp
   */
  private static findTurnNumber(timestamp: number, exchanges: ConversationExchange[]): number {
    for (let i = 0; i < exchanges.length; i++) {
      if (Math.abs(exchanges[i].timestamp - timestamp) < 0.5) {
        return i;
      }
    }
    return 0;
  }
  
  /**
   * Extract surrounding context (2 before, 2 after)
   */
  private static extractSurroundingContext(
    turnNumber: number,
    exchanges: ConversationExchange[]
  ): { before: SurroundingExchange[]; after: SurroundingExchange[] } {
    const before: SurroundingExchange[] = [];
    const after: SurroundingExchange[] = [];
    
    // 2 exchanges before
    for (let i = Math.max(0, turnNumber - 2); i < turnNumber; i++) {
      before.push({
        speaker: exchanges[i].speaker,
        text: exchanges[i].text,
        timestamp: exchanges[i].timestamp
      });
    }
    
    // 2 exchanges after
    for (let i = turnNumber + 1; i < Math.min(exchanges.length, turnNumber + 3); i++) {
      after.push({
        speaker: exchanges[i].speaker,
        text: exchanges[i].text,
        timestamp: exchanges[i].timestamp
      });
    }
    
    return { before, after };
  }
  
  /**
   * Describe resistance change in human terms
   */
  private static describeResistanceChange(before: number, after: number): string {
    const delta = after - before;
    
    if (Math.abs(delta) < 0.5) return 'Resistance stayed the same';
    if (delta > 2) return 'Resistance spiked significantly';
    if (delta > 0.5) return 'Resistance increased';
    if (delta < -2) return 'Resistance dropped significantly';
    if (delta < -0.5) return 'Resistance decreased';
    
    return 'Minimal change in resistance';
  }
  
  /**
   * Generate human-readable consequence
   */
  private static generateHumanConsequence(moment: CriticalMoment | SuccessfulMoment): string {
    const before = moment.resistanceBefore;
    const after = moment.resistanceAfter;
    
    const beforeState = this.resistanceToState(before);
    const afterState = this.resistanceToState(after);
    
    if (beforeState === afterState) {
      return `Marcus remained ${beforeState}`;
    }
    
    return `Moved Marcus from ${beforeState} to ${afterState}`;
  }
  
  /**
   * Convert resistance level to state label
   */
  private static resistanceToState(resistance: number): string {
    if (resistance >= 8) return 'highly resistant';
    if (resistance >= 6) return 'skeptical';
    if (resistance >= 4) return 'guarded';
    if (resistance >= 2) return 'open';
    return 'curious';
  }
  
  /**
   * Infer Marcus state from moment data
   */
  private static inferMarcusState(moment: CriticalMoment | SuccessfulMoment): {
    trust: string;
    curiosity: string;
    urgency: string;
    activeObjection?: string;
  } {
    const resistance = moment.resistanceAfter;
    
    // Inverse relationship: high resistance = low trust
    const trust = resistance >= 7 ? 'low' : resistance >= 4 ? 'moderate' : 'high';
    
    // Curiosity based on resistance drop
    const delta = moment.resistanceAfter - moment.resistanceBefore;
    const curiosity = delta < -1 ? 'high' : delta < 0.5 ? 'moderate' : 'low';
    
    // Urgency inference (could be enhanced with more data)
    const urgency = 'moderate'; // Default - would need more context to infer
    
    return {
      trust,
      curiosity,
      urgency
    };
  }
}

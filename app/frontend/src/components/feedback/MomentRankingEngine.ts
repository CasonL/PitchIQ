/**
 * MomentRankingEngine.ts
 * Intelligent system that analyzes entire calls to identify highest-impact teaching moments
 * Uses sales psychology principles to rank moments by learning potential
 */

export interface CallMoment {
  id: string;
  timestamp: number;
  userMessage: string;
  marcusResponse: string;
  context: {
    phase: string;
    buyerState: {
      resistance: number;
      clarity: number;
      trust: number;
      interest: number;
    };
    strategicSignals: string[];
  };
  impactScore: number;
  teachingPotential: number;
  psychologyPrinciples: string[];
}

export interface RankedMoment extends CallMoment {
  rank: number;
  category: 'critical_mistake' | 'missed_opportunity' | 'psychology_lesson' | 'technique_demo';
  title: string;
  shortDescription: string;
  beforeScore: number;
  afterPotential: number;
}

export class MomentRankingEngine {
  /**
   * Analyze entire call and rank moments by teaching impact
   */
  static rankMoments(callHistory: any[], callMetrics: any): RankedMoment[] {
    const moments = this.extractMoments(callHistory, callMetrics);
    const scoredMoments = moments.map(moment => this.scoreMoment(moment));
    const rankedMoments = this.rankByImpact(scoredMoments);
    
    return rankedMoments.slice(0, 5); // Top 5 moments only
  }

  /**
   * Extract potential teaching moments from call history
   */
  private static extractMoments(callHistory: any[], callMetrics: any): CallMoment[] {
    const moments: CallMoment[] = [];
    
    for (let i = 0; i < callHistory.length - 1; i += 2) {
      const userMessage = callHistory[i]?.content || '';
      const marcusResponse = callHistory[i + 1]?.content || '';
      
      if (!userMessage || !marcusResponse) continue;
      
      const moment: CallMoment = {
        id: `moment_${i}`,
        timestamp: i * 30, // Approximate seconds
        userMessage,
        marcusResponse,
        context: this.analyzeContext(userMessage, marcusResponse, i),
        impactScore: 0,
        teachingPotential: 0,
        psychologyPrinciples: []
      };
      
      moments.push(moment);
    }
    
    return moments;
  }

  /**
   * Score moment based on teaching potential and psychological impact
   */
  private static scoreMoment(moment: CallMoment): CallMoment {
    let score = 0;
    let teachingPotential = 0;
    const principles: string[] = [];

    // Critical mistake patterns (high teaching value)
    if (this.detectFeatureDumping(moment.userMessage)) {
      score += 90;
      teachingPotential += 85;
      principles.push('cognitive_load_theory', 'feature_vs_benefit');
    }

    if (this.detectPrematurePitching(moment.userMessage, moment.marcusResponse)) {
      score += 85;
      teachingPotential += 80;
      principles.push('rapport_building', 'trust_psychology');
    }

    if (this.detectMissedPainSignal(moment.marcusResponse, moment.userMessage)) {
      score += 80;
      teachingPotential += 90;
      principles.push('active_listening', 'pain_amplification');
    }

    // Psychology teaching moments
    if (this.detectObjectionHandling(moment.marcusResponse, moment.userMessage)) {
      score += 75;
      teachingPotential += 85;
      principles.push('objection_psychology', 'reframe_technique');
    }

    if (this.detectValueAnchoring(moment.userMessage)) {
      score += 70;
      teachingPotential += 80;
      principles.push('anchoring_bias', 'value_perception');
    }

    // Technique demonstrations
    if (this.detectGoodQuestioning(moment.userMessage)) {
      score += 65;
      teachingPotential += 75;
      principles.push('discovery_technique', 'open_ended_questions');
    }

    moment.impactScore = score;
    moment.teachingPotential = teachingPotential;
    moment.psychologyPrinciples = principles;

    return moment;
  }

  /**
   * Rank moments by combined impact and teaching potential
   */
  private static rankByImpact(moments: CallMoment[]): RankedMoment[] {
    const ranked = moments
      .filter(m => m.impactScore > 50) // Only significant moments
      .sort((a, b) => {
        const scoreA = a.impactScore * 0.6 + a.teachingPotential * 0.4;
        const scoreB = b.impactScore * 0.6 + b.teachingPotential * 0.4;
        return scoreB - scoreA;
      })
      .map((moment, index) => ({
        ...moment,
        rank: index + 1,
        category: this.categorizeмомент(moment),
        title: this.generateTitle(moment),
        shortDescription: this.generateDescription(moment),
        beforeScore: this.calculateBeforeScore(moment),
        afterPotential: this.calculateAfterPotential(moment)
      }));

    return ranked;
  }

  // Detection methods for different moment types
  private static detectFeatureDumping(userMessage: string): boolean {
    const featureWords = ['feature', 'capability', 'function', 'includes', 'offers', 'provides'];
    const benefitWords = ['save', 'improve', 'reduce', 'increase', 'help', 'solve'];
    
    const featureCount = featureWords.filter(word => 
      userMessage.toLowerCase().includes(word)
    ).length;
    const benefitCount = benefitWords.filter(word => 
      userMessage.toLowerCase().includes(word)
    ).length;
    
    return featureCount > benefitCount && featureCount >= 2;
  }

  private static detectPrematurePitching(userMessage: string, marcusResponse: string): boolean {
    const pitchIndicators = ['our product', 'we offer', 'our solution', 'our platform'];
    const rapportIndicators = ['tell me', 'how are', 'what\'s your', 'describe'];
    
    const hasPitch = pitchIndicators.some(phrase => 
      userMessage.toLowerCase().includes(phrase)
    );
    const hasRapport = rapportIndicators.some(phrase => 
      userMessage.toLowerCase().includes(phrase)
    );
    
    const marcusShowsResistance = ['not sure', 'maybe', 'i don\'t know', 'busy'].some(phrase =>
      marcusResponse.toLowerCase().includes(phrase)
    );
    
    return hasPitch && !hasRapport && marcusShowsResistance;
  }

  private static detectMissedPainSignal(marcusResponse: string, userMessage: string): boolean {
    const painSignals = ['struggling', 'difficult', 'problem', 'issue', 'challenge', 'frustrated'];
    const acknowledgmentWords = ['understand', 'hear', 'sounds', 'that must', 'tell me more'];
    
    const marcusShowsPain = painSignals.some(signal => 
      marcusResponse.toLowerCase().includes(signal)
    );
    const userAcknowledged = acknowledgmentWords.some(word => 
      userMessage.toLowerCase().includes(word)
    );
    
    return marcusShowsPain && !userAcknowledged;
  }

  private static detectObjectionHandling(marcusResponse: string, userMessage: string): boolean {
    const objections = ['expensive', 'costly', 'budget', 'price', 'too much', 'can\'t afford'];
    const goodHandling = ['understand', 'makes sense', 'let me ask', 'what if', 'consider'];
    const badHandling = ['but', 'however', 'actually', 'well'];
    
    const hasObjection = objections.some(obj => marcusResponse.toLowerCase().includes(obj));
    const hasGoodHandling = goodHandling.some(phrase => userMessage.toLowerCase().includes(phrase));
    const hasBadHandling = badHandling.some(phrase => userMessage.toLowerCase().includes(phrase));
    
    return hasObjection && (hasGoodHandling || hasBadHandling);
  }

  private static detectValueAnchoring(userMessage: string): boolean {
    const anchoringPhrases = ['save you', 'worth', 'investment', 'roi', 'return', 'value'];
    return anchoringPhrases.some(phrase => userMessage.toLowerCase().includes(phrase));
  }

  private static detectGoodQuestioning(userMessage: string): boolean {
    const openQuestions = ['what', 'how', 'why', 'tell me', 'describe', 'walk me through'];
    const closedQuestions = ['do you', 'are you', 'is it', 'can you', 'will you'];
    
    const openCount = openQuestions.filter(q => userMessage.toLowerCase().includes(q)).length;
    const closedCount = closedQuestions.filter(q => userMessage.toLowerCase().includes(q)).length;
    
    return openCount > closedCount && openCount >= 1;
  }

  private static analyzeContext(userMessage: string, marcusResponse: string, turnIndex: number) {
    return {
      phase: turnIndex < 4 ? 'opening' : turnIndex < 8 ? 'discovery' : 'presentation',
      buyerState: {
        resistance: this.calculateResistance(marcusResponse),
        clarity: this.calculateClarity(marcusResponse),
        trust: this.calculateTrust(marcusResponse),
        interest: this.calculateInterest(marcusResponse)
      },
      strategicSignals: this.extractSignals(marcusResponse)
    };
  }

  private static calculateResistance(response: string): number {
    const resistanceWords = ['no', 'not', 'can\'t', 'won\'t', 'don\'t', 'maybe', 'unsure'];
    const count = resistanceWords.filter(word => response.toLowerCase().includes(word)).length;
    return Math.min(count * 2, 10);
  }

  private static calculateClarity(response: string): number {
    const clarityWords = ['understand', 'clear', 'makes sense', 'got it', 'i see'];
    const confusionWords = ['confused', 'unclear', 'don\'t follow', 'what do you mean'];
    
    const clarity = clarityWords.filter(word => response.toLowerCase().includes(word)).length;
    const confusion = confusionWords.filter(word => response.toLowerCase().includes(word)).length;
    
    return Math.max(0, Math.min(10, (clarity * 3) - (confusion * 2) + 5));
  }

  private static calculateTrust(response: string): number {
    const trustWords = ['sounds good', 'interesting', 'tell me more', 'that helps'];
    const distrustWords = ['skeptical', 'doubt', 'not sure', 'heard that before'];
    
    const trust = trustWords.filter(word => response.toLowerCase().includes(word)).length;
    const distrust = distrustWords.filter(word => response.toLowerCase().includes(word)).length;
    
    return Math.max(0, Math.min(10, (trust * 3) - (distrust * 2) + 5));
  }

  private static calculateInterest(response: string): number {
    const interestWords = ['cool', 'interesting', 'tell me more', 'how does', 'what about'];
    const disinterestWords = ['busy', 'not now', 'maybe later', 'not interested'];
    
    const interest = interestWords.filter(word => response.toLowerCase().includes(word)).length;
    const disinterest = disinterestWords.filter(word => response.toLowerCase().includes(word)).length;
    
    return Math.max(0, Math.min(10, (interest * 3) - (disinterest * 2) + 5));
  }

  private static extractSignals(response: string): string[] {
    const signals: string[] = [];
    
    if (response.toLowerCase().includes('budget')) signals.push('budget_concern');
    if (response.toLowerCase().includes('time')) signals.push('timing_issue');
    if (response.toLowerCase().includes('boss') || response.toLowerCase().includes('team')) signals.push('authority_question');
    if (response.toLowerCase().includes('current') || response.toLowerCase().includes('using')) signals.push('status_quo');
    
    return signals;
  }

  private static categorizeМомент(moment: CallMoment): RankedMoment['category'] {
    if (moment.impactScore >= 85) return 'critical_mistake';
    if (moment.psychologyPrinciples.length >= 2) return 'psychology_lesson';
    if (moment.teachingPotential >= 80) return 'missed_opportunity';
    return 'technique_demo';
  }

  private static generateTitle(moment: CallMoment): string {
    const principles = moment.psychologyPrinciples;
    
    if (principles.includes('feature_vs_benefit')) return 'Feature Dumping Alert';
    if (principles.includes('rapport_building')) return 'Premature Pitch';
    if (principles.includes('pain_amplification')) return 'Missed Pain Signal';
    if (principles.includes('objection_psychology')) return 'Objection Handling';
    if (principles.includes('anchoring_bias')) return 'Value Anchoring';
    if (principles.includes('discovery_technique')) return 'Discovery Question';
    
    return 'Teaching Moment';
  }

  private static generateDescription(moment: CallMoment): string {
    const principles = moment.psychologyPrinciples;
    
    if (principles.includes('feature_vs_benefit')) return 'Led with features instead of focusing on their problems';
    if (principles.includes('rapport_building')) return 'Pitched before establishing trust and rapport';
    if (principles.includes('pain_amplification')) return 'Marcus revealed pain but you didn\'t dig deeper';
    if (principles.includes('objection_psychology')) return 'Opportunity to reframe their objection';
    if (principles.includes('anchoring_bias')) return 'Good value positioning technique';
    if (principles.includes('discovery_technique')) return 'Effective questioning approach';
    
    return 'Key learning opportunity identified';
  }

  private static calculateBeforeScore(moment: CallMoment): number {
    // Simulate current performance score based on moment quality
    const baseScore = 5.0;
    const penalties = moment.psychologyPrinciples.filter(p => 
      ['feature_vs_benefit', 'rapport_building', 'pain_amplification'].includes(p)
    ).length;
    
    return Math.max(1.0, baseScore - (penalties * 1.5));
  }

  private static calculateAfterPotential(moment: CallMoment): number {
    // Simulate potential score after improvement
    const beforeScore = this.calculateBeforeScore(moment);
    const improvementPotential = moment.teachingPotential / 10;
    
    return Math.min(10.0, beforeScore + improvementPotential);
  }
}

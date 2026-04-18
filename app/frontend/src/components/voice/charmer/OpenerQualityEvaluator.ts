/**
 * OpenerQualityEvaluator
 * 
 * Evaluates message substance quality (not just structure)
 * Scores openers on 4 dimensions using weighted signals
 * 
 * Philosophy: Detect weak vs strong signals, output scores, not binary judgments
 */

export interface OpenerQualityScore {
  // 4 core dimensions (0-1 scale, lower = weaker)
  clarityOfPurpose: number;      // Does prospect know why you're calling?
  specificRelevance: number;     // Tied to concrete world/problem/role?
  distinctiveness: number;       // Or could any rep say this?
  frictionLoad: number;          // Filler/hedging/template sludge (0 = clean, 1 = buried)
  
  // Supporting metrics
  genericnessScore: number;      // 0-1, higher = more generic
  relevanceAnchors: string[];    // What made it relevant (industry, role, pain)
  insightPattern: string | null; // Detected insight structure
  fillerPhrases: string[];       // What weakened it
  
  // Overall
  overallQuality: 'weak' | 'template' | 'decent' | 'sharp';
}

export interface OpenerAnalysis {
  score: OpenerQualityScore;
  coaching: string;
  strengths: string[];
  weaknesses: string[];
}

export class OpenerQualityEvaluator {
  
  /**
   * Analyze first 1-2 user utterances for message quality
   */
  evaluateOpener(firstUtterance: string, secondUtterance?: string): OpenerAnalysis {
    const fullOpener = secondUtterance 
      ? `${firstUtterance} ${secondUtterance}`
      : firstUtterance;
    
    const lowerOpener = fullOpener.toLowerCase();
    
    // Calculate dimension scores
    const clarityOfPurpose = this.scoreClarityOfPurpose(lowerOpener);
    const specificRelevance = this.scoreSpecificRelevance(lowerOpener);
    const distinctiveness = this.scoreDistinctiveness(lowerOpener);
    const frictionLoad = this.scoreFrictionLoad(lowerOpener);
    
    // Supporting metrics
    const genericnessScore = this.calculateGenericness(lowerOpener);
    const relevanceAnchors = this.detectRelevanceAnchors(lowerOpener);
    const insightPattern = this.detectInsightPattern(lowerOpener);
    const fillerPhrases = this.detectFillerPhrases(lowerOpener);
    
    // Overall quality
    const avgScore = (clarityOfPurpose + specificRelevance + distinctiveness + (1 - frictionLoad)) / 4;
    const overallQuality = this.categorizeQuality(avgScore, genericnessScore);
    
    const score: OpenerQualityScore = {
      clarityOfPurpose,
      specificRelevance,
      distinctiveness,
      frictionLoad,
      genericnessScore,
      relevanceAnchors,
      insightPattern,
      fillerPhrases,
      overallQuality
    };
    
    return {
      score,
      coaching: this.generateCoaching(score),
      strengths: this.identifyStrengths(score),
      weaknesses: this.identifyWeaknesses(score)
    };
  }
  
  /**
   * DIMENSION 1: Clarity of Purpose
   * Does prospect know why you're calling?
   */
  private scoreClarityOfPurpose(opener: string): number {
    let score = 0.3; // Base score
    
    // Positive signals
    const purposeSignals = [
      /quick reason/i,
      /reason (for|I'm) call/i,
      /calling about/i,
      /calling because/i,
      /noticed/i,
      /saw that/i,
      /curious (if|whether)/i
    ];
    
    purposeSignals.forEach(pattern => {
      if (pattern.test(opener)) score += 0.15;
    });
    
    // Negative signals (vague purpose)
    const vaguePurpose = [
      /just reaching out/i,
      /touching base/i,
      /checking in/i,
      /wanted to connect/i,
      /thought i'd/i
    ];
    
    vaguePurpose.forEach(pattern => {
      if (pattern.test(opener)) score -= 0.2;
    });
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * DIMENSION 2: Specific Relevance
   * Tied to concrete world, problem, role, or pattern?
   */
  private scoreSpecificRelevance(opener: string): number {
    let score = 0.2; // Base score
    
    // Strengthening signals (weighted, not just counting)
    const anchors = this.detectRelevanceAnchors(opener);
    
    // Industry/role markers
    if (anchors.some(a => a.startsWith('industry:') || a.startsWith('role:'))) {
      score += 0.2;
    }
    
    // Pain/workflow markers
    if (anchors.some(a => a.startsWith('pain:') || a.startsWith('workflow:'))) {
      score += 0.25;
    }
    
    // Pattern/mechanism
    if (anchors.some(a => a.startsWith('pattern:') || a.startsWith('mechanism:'))) {
      score += 0.2;
    }
    
    // Concrete business context
    if (anchors.some(a => a.startsWith('constraint:') || a.startsWith('symptom:'))) {
      score += 0.15;
    }
    
    // Penalty for generic business-speak
    const genericBiz = [
      /\bimprove\b.*\boutcomes?\b/i,
      /\bhelp\b.*\bteams?\b/i,
      /\bsales\b.*\bsolutions?\b/i,
      /\bstreamline\b.*\bprocesses?\b/i,
      /\bvalue[- ]add/i,
      /\bgrowth\b.*\bstrateg/i
    ];
    
    genericBiz.forEach(pattern => {
      if (pattern.test(opener)) score -= 0.15;
    });
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * DIMENSION 3: Distinctiveness
   * Could any rep say this, or is it specific to you/them?
   */
  private scoreDistinctiveness(opener: string): number {
    let score = 0.5; // Neutral base
    
    // Generic template phrases (reduce distinctiveness)
    const templatePhrases = [
      /we help (teams?|companies?|businesses?)/i,
      /we (provide|offer|deliver) solutions?/i,
      /we specialize in/i,
      /learn more about your business/i,
      /understand your needs/i,
      /explore opportunities/i,
      /see if (we|there)'?s a fit/i,
      /support your (growth|goals?)/i
    ];
    
    templatePhrases.forEach(pattern => {
      if (pattern.test(opener)) score -= 0.15;
    });
    
    // Insight patterns (increase distinctiveness)
    if (this.detectInsightPattern(opener)) {
      score += 0.3;
    }
    
    // Specific observation (increase distinctiveness)
    const observationMarkers = [
      /i'?ve noticed/i,
      /a lot of/i,
      /most (teams?|companies?|reps?)/i,
      /when (teams?|companies?|reps?)/i,
      /\d+%/,  // Has percentage
      /\b\d+[-–]\d+%\b/, // Has range
    ];
    
    observationMarkers.forEach(pattern => {
      if (pattern.test(opener)) score += 0.1;
    });
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * DIMENSION 4: Friction Load
   * Filler, hedging, permission padding, template sludge
   */
  private scoreFrictionLoad(opener: string): number {
    const fillers = this.detectFillerPhrases(opener);
    
    // Each filler adds friction (max 1.0 = completely buried)
    const frictionScore = Math.min(1.0, fillers.length * 0.15);
    
    return frictionScore;
  }
  
  /**
   * Calculate genericness score (0-1, higher = more generic)
   */
  private calculateGenericness(opener: string): number {
    let genericScore = 0;
    
    const genericSignals = [
      /\bhelp\b/i,
      /\bimprove\b/i,
      /\boutcomes?\b/i,
      /\bsolutions?\b/i,
      /\bvalue[- ]add/i,
      /\bstreamline\b/i,
      /\boptimize\b/i,
      /\benhance\b/i,
      /\bgrowth\b/i,
      /\bsupport\b/i,
      /\bpartner/i,
      /\bcollaborate\b/i
    ];
    
    // Weight each generic signal
    genericSignals.forEach(pattern => {
      if (pattern.test(opener)) genericScore += 0.08;
    });
    
    return Math.min(1.0, genericScore);
  }
  
  /**
   * Detect relevance anchors
   * Returns array of specific markers that make it relevant
   */
  private detectRelevanceAnchors(opener: string): string[] {
    const anchors: string[] = [];
    
    // Industry markers
    const industries = [
      'consulting', 'saas', 'software', 'tech', 'manufacturing', 
      'healthcare', 'finance', 'insurance', 'real estate', 'education'
    ];
    industries.forEach(industry => {
      if (opener.includes(industry)) {
        anchors.push(`industry:${industry}`);
      }
    });
    
    // Role markers
    const roles = [
      'sales manager', 'vp', 'director', 'rep', 'founder', 
      'ceo', 'head of sales', 'sales leader', 'team lead'
    ];
    roles.forEach(role => {
      if (opener.includes(role)) {
        anchors.push(`role:${role}`);
      }
    });
    
    // Pain/workflow markers
    const pains = [
      'close rate', 'ramp time', 'onboarding', 'pipeline', 'quota',
      'conversion', 'retention', 'churn', 'objection', 'discovery',
      'forecasting', 'training', 'turnover'
    ];
    pains.forEach(pain => {
      if (opener.includes(pain)) {
        anchors.push(`pain:${pain}`);
      }
    });
    
    // Pattern markers
    if (/when .+ (struggle|hit|plateau|face|encounter)/i.test(opener)) {
      anchors.push('pattern:struggle_condition');
    }
    if (/a lot of .+ (can't|don't|never|struggle to)/i.test(opener)) {
      anchors.push('pattern:common_problem');
    }
    
    // Mechanism markers
    if (/because|due to|when|if .+ then/i.test(opener)) {
      anchors.push('mechanism:causality');
    }
    
    return anchors;
  }
  
  /**
   * Detect insight patterns
   * "when X, Y suffers" or "observation → implication"
   */
  private detectInsightPattern(opener: string): string | null {
    // Pattern: "when X, Y [negative consequence]"
    if (/when .+ (struggle|hit|plateau|fail|can't|never)/i.test(opener)) {
      return 'when_X_Y_suffers';
    }
    
    // Pattern: "a lot of X often/tend to [problem]"
    if (/a lot of .+ (often|tend to|struggle|hit|plateau)/i.test(opener)) {
      return 'common_pattern';
    }
    
    // Pattern: "I noticed [observation]"
    if (/i'?ve? noticed .+ (struggle|creates?|leads? to|results? in)/i.test(opener)) {
      return 'observation_implication';
    }
    
    // Pattern: "X creates/causes/leads to Y"
    if (/(create|cause|lead to|result in) .+ (problem|challenge|issue|struggle)/i.test(opener)) {
      return 'causality_chain';
    }
    
    return null;
  }
  
  /**
   * Detect filler phrases that add friction
   */
  private detectFillerPhrases(opener: string): string[] {
    const fillers: string[] = [];
    
    const fillerPatterns: [RegExp, string][] = [
      [/i wanted to/i, 'I wanted to'],
      [/just reaching out/i, 'just reaching out'],
      [/thought i'?d/i, "thought I'd"],
      [/see if (i could|we could)/i, 'see if I could'],
      [/kind of/i, 'kind of'],
      [/maybe/i, 'maybe'],
      [/hoping to/i, 'hoping to'],
      [/touch base/i, 'touch base'],
      [/check in/i, 'check in'],
      [/reach out/i, 'reach out'],
      [/wanted to connect/i, 'wanted to connect'],
      [/learn more about/i, 'learn more about']
    ];
    
    fillerPatterns.forEach(([pattern, label]) => {
      if (pattern.test(opener)) {
        fillers.push(label);
      }
    });
    
    return fillers;
  }
  
  /**
   * Categorize overall quality
   */
  private categorizeQuality(avgScore: number, genericness: number): 'weak' | 'template' | 'decent' | 'sharp' {
    // High genericness pulls down quality
    const adjustedScore = avgScore - (genericness * 0.3);
    
    if (adjustedScore >= 0.7) return 'sharp';
    if (adjustedScore >= 0.5) return 'decent';
    if (adjustedScore >= 0.3) return 'template';
    return 'weak';
  }
  
  /**
   * Generate coaching based on scores
   */
  private generateCoaching(score: OpenerQualityScore): string {
    const { overallQuality, clarityOfPurpose, specificRelevance, distinctiveness, frictionLoad } = score;
    
    // Sharp opener - minimal coaching
    if (overallQuality === 'sharp') {
      return 'Strong opener - clear purpose, specific relevance, distinctive insight. Keep this approach.';
    }
    
    // Identify primary weakness
    const dimensions = [
      { name: 'clarity', score: clarityOfPurpose, threshold: 0.4 },
      { name: 'relevance', score: specificRelevance, threshold: 0.4 },
      { name: 'distinctiveness', score: distinctiveness, threshold: 0.4 },
      { name: 'friction', score: 1 - frictionLoad, threshold: 0.5 }
    ];
    
    const weakest = dimensions.reduce((prev, curr) => 
      curr.score < prev.score ? curr : prev
    );
    
    // Primary coaching
    let coaching = '';
    
    if (weakest.name === 'clarity' && clarityOfPurpose < 0.4) {
      coaching = 'Marcus doesn\'t know why you\'re calling. Lead with: "Quick reason for the call..." or "I noticed [specific pattern]..."';
    } else if (weakest.name === 'relevance' && specificRelevance < 0.4) {
      coaching = 'Your opener sounds generic. Replace broad value with a concrete observation about Marcus\'s world: industry, role-specific pain, or operational pattern.';
    } else if (weakest.name === 'distinctiveness' && distinctiveness < 0.4) {
      coaching = 'This sounds like a thousand other reps. Drop template language and lead with a specific insight: "When X happens, Y suffers..."';
    } else if (frictionLoad > 0.5) {
      coaching = `Too much filler (${score.fillerPhrases.join(', ')}). Cut the hedging. Be direct: state observation, implication, then question.`;
    } else {
      coaching = 'Your structure is okay, but your message lacks punch. Lead with a specific observation that shows you understand Marcus\'s world.';
    }
    
    return coaching;
  }
  
  /**
   * Identify what worked
   */
  private identifyStrengths(score: OpenerQualityScore): string[] {
    const strengths: string[] = [];
    
    if (score.clarityOfPurpose >= 0.6) {
      strengths.push('Clear purpose - Marcus knows why you\'re calling');
    }
    
    if (score.specificRelevance >= 0.6) {
      strengths.push(`Specific relevance: ${score.relevanceAnchors.join(', ')}`);
    }
    
    if (score.insightPattern) {
      strengths.push(`Insight pattern detected: ${score.insightPattern}`);
    }
    
    if (score.distinctiveness >= 0.6) {
      strengths.push('Distinctive - doesn\'t sound like generic template');
    }
    
    if (score.frictionLoad < 0.3) {
      strengths.push('Low friction - direct and clean');
    }
    
    return strengths;
  }
  
  /**
   * Identify what weakened it
   */
  private identifyWeaknesses(score: OpenerQualityScore): string[] {
    const weaknesses: string[] = [];
    
    if (score.clarityOfPurpose < 0.4) {
      weaknesses.push('Unclear purpose - Marcus doesn\'t know why you\'re calling');
    }
    
    if (score.specificRelevance < 0.4) {
      weaknesses.push('Generic - not tied to Marcus\'s specific world');
    }
    
    if (score.genericnessScore > 0.5) {
      weaknesses.push('High genericness - sounds like template language');
    }
    
    if (score.distinctiveness < 0.4) {
      weaknesses.push('Indistinctive - any rep could say this');
    }
    
    if (score.fillerPhrases.length > 2) {
      weaknesses.push(`Filler overload: ${score.fillerPhrases.join(', ')}`);
    }
    
    if (!score.insightPattern && score.relevanceAnchors.length === 0) {
      weaknesses.push('No insight or relevance anchors - lacks substance');
    }
    
    return weaknesses;
  }
}

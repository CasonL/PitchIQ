/**
 * Intelligent selector for key psychological traits to include in AI prompts
 * Balances authenticity with prompt complexity constraints
 */

export interface PersonaData {
  scoring_profile?: {
    rapport_sensitivity?: string;
    trust_threshold?: string;
    decision_making_style?: string;
    pressure_tolerance?: string;
    relationship_importance?: string;
    technical_comfort?: string;
  };
  psychological_profile?: {
    primary_motivator?: string;
    stress_response?: string;
    communication_preference?: string;
    objection_handling_style?: string;
    trust_building_timeline?: string;
    risk_tolerance?: string;
    change_readiness?: string;
  };
}

export interface SelectedTraits {
  primary: string;
  secondary: string;
  behavioral_note?: string;
  all_traits?: string[];
  trait_count?: number;
}

export interface TraitImpact {
  category: string;
  field: string;
  value: string;
  impact_score: number;
  description: string;
  behavioral_weight: number;
}

export class PsychologicalTraitSelector {
  
  // Configuration for trait selection
  private static readonly DEFAULT_TRAIT_COUNT = 3;
  private static readonly MAX_TRAIT_COUNT = 10;
  
  /**
   * Select key psychological traits based on dynamic impact scoring
   * @param personaData The persona data to analyze
   * @param maxTraits Maximum number of traits to select (default: 3)
   */
  static selectKeyTraits(personaData: PersonaData, maxTraits: number = this.DEFAULT_TRAIT_COUNT): SelectedTraits {
    const scoring = personaData.scoring_profile || {};
    const psychological = personaData.psychological_profile || {};
    
    // Calculate impact scores for all available traits
    const traitImpacts = this.calculateTraitImpacts(scoring, psychological);
    
    // Select top traits based on impact scores and variation
    const selectedTraits = this.selectHighImpactTraits(traitImpacts, maxTraits);
    
    return {
      primary: selectedTraits[0]?.description || 'professional and business-focused',
      secondary: selectedTraits[1]?.description || 'clear in communication',
      behavioral_note: selectedTraits[2]?.description,
      // For experimentation: include all selected traits
      all_traits: selectedTraits.map(t => t.description),
      trait_count: selectedTraits.length
    };
  }
  
  /**
   * Generate psychological context with configurable trait count
   * @param personaData The persona data
   * @param maxTraits Number of traits to include (2-10)
   * @param format Format style: 'concise' | 'detailed' | 'bullet_points'
   */
  static generateConfigurablePsychologicalContext(
    personaData: PersonaData, 
    maxTraits: number = 3,
    format: 'concise' | 'detailed' | 'bullet_points' = 'concise'
  ): string {
    const traits = this.selectKeyTraits(personaData, maxTraits);
    
    if (format === 'concise' && maxTraits <= 3) {
      // Original format for 2-3 traits
      let context = `You are ${traits.primary}`;
      if (traits.secondary) {
        context += ` and ${traits.secondary}`;
      }
      if (traits.behavioral_note) {
        context += `. You ${traits.behavioral_note}`;
      }
      return context + '.';
    }
    
    if (format === 'detailed' || maxTraits > 3) {
      // Detailed format for 4+ traits
      const allTraits = traits.all_traits || [];
      if (allTraits.length === 0) return 'You are professional and business-focused.';
      
      return `You are ${allTraits.slice(0, 2).join(' and ')}. ${allTraits.slice(2).map(trait => `You ${trait}`).join('. ')}.`;
    }
    
    if (format === 'bullet_points') {
      // Bullet point format for easy AI parsing
      const allTraits = traits.all_traits || [];
      return `PSYCHOLOGICAL PROFILE:\n${allTraits.map(trait => `• You ${trait}`).join('\n')}`;
    }
    
    return traits.primary;
  }
  
  /**
   * Calculate impact scores for all psychological traits
   */
  private static calculateTraitImpacts(scoring: any, psychological: any): TraitImpact[] {
    const impacts: TraitImpact[] = [];
    
    // Decision-making traits (high baseline impact)
    if (psychological.decision_making_style) {
      impacts.push({
        category: 'decision_making',
        field: 'decision_making_style',
        value: psychological.decision_making_style,
        impact_score: this.getDecisionMakingImpact(psychological.decision_making_style),
        description: this.getDecisionMakingDescription(psychological.decision_making_style),
        behavioral_weight: 0.9
      });
    }
    
    // Communication traits (medium-high impact)
    if (psychological.communication_preference) {
      impacts.push({
        category: 'communication',
        field: 'communication_preference', 
        value: psychological.communication_preference,
        impact_score: this.getCommunicationImpact(psychological.communication_preference),
        description: this.getCommunicationDescription(psychological.communication_preference),
        behavioral_weight: 0.8
      });
    }
    
    // Risk/Trust traits (variable impact based on extremes)
    if (psychological.risk_tolerance) {
      const riskImpact = this.getRiskToleranceImpact(psychological.risk_tolerance);
      if (riskImpact.impact_score > 0.6) { // Only include if high impact
        impacts.push(riskImpact);
      }
    }
    
    if (scoring.trust_threshold) {
      const trustImpact = this.getTrustThresholdImpact(scoring.trust_threshold);
      if (trustImpact.impact_score > 0.6) {
        impacts.push(trustImpact);
      }
    }
    
    // Pressure/Stress traits (high impact for extremes)
    if (scoring.pressure_tolerance) {
      const pressureImpact = this.getPressureToleranceImpact(scoring.pressure_tolerance);
      if (pressureImpact.impact_score > 0.7) {
        impacts.push(pressureImpact);
      }
    }
    
    if (psychological.stress_response) {
      const stressImpact = this.getStressResponseImpact(psychological.stress_response);
      if (stressImpact.impact_score > 0.6) {
        impacts.push(stressImpact);
      }
    }
    
    // Motivational traits (context-dependent impact)
    if (psychological.primary_motivator) {
      const motivatorImpact = this.getMotivatorImpact(psychological.primary_motivator);
      if (motivatorImpact.impact_score > 0.5) {
        impacts.push(motivatorImpact);
      }
    }
    
    // Relationship traits (impact varies by sales context)
    if (scoring.relationship_importance) {
      const relationshipImpact = this.getRelationshipImpact(scoring.relationship_importance);
      if (relationshipImpact.impact_score > 0.5) {
        impacts.push(relationshipImpact);
      }
    }
    
    return impacts;
  }
  
  /**
   * Select highest impact traits with variation and anti-repetition logic
   */
  private static selectHighImpactTraits(traitImpacts: TraitImpact[], maxTraits: number = 3): TraitImpact[] {
    // Sort by impact score
    const sortedTraits = traitImpacts.sort((a, b) => b.impact_score - a.impact_score);
    
    const selected: TraitImpact[] = [];
    const usedCategories = new Set<string>();
    
    // Select primary trait (highest impact)
    if (sortedTraits.length > 0) {
      selected.push(sortedTraits[0]);
      usedCategories.add(sortedTraits[0].category);
    }
    
    // Select additional traits from different categories up to maxTraits
    for (const trait of sortedTraits.slice(1)) {
      if (!usedCategories.has(trait.category) && selected.length < maxTraits) {
        // For 4+ traits, lower the impact threshold to include more variety
        const impactThreshold = maxTraits > 3 ? 0.5 : 0.7;
        if (trait.impact_score > impactThreshold) {
          selected.push(trait);
          usedCategories.add(trait.category);
        }
      }
    }
    
    // If we still need more traits and have room, include same-category traits with high impact
    if (selected.length < maxTraits && maxTraits > 5) {
      for (const trait of sortedTraits) {
        if (selected.length >= maxTraits) break;
        if (!selected.includes(trait) && trait.impact_score > 0.6) {
          selected.push(trait);
        }
      }
    }
    
    return selected;
  }
  
  private static getPrimaryTrait(scoring: any, psychological: any): string {
    // Decision making style is most impactful for conversation flow
    if (psychological.decision_making_style) {
      switch (psychological.decision_making_style) {
        case 'analytical':
          return 'analytical and data-driven';
        case 'intuitive':
          return 'intuitive and gut-feeling oriented';
        case 'consensus-driven':
          return 'collaborative and consensus-seeking';
        case 'impulsive':
          return 'quick to decide and action-oriented';
        default:
          return 'thoughtful in your decision-making';
      }
    }
    
    // Fallback to primary motivator
    if (psychological.primary_motivator) {
      switch (psychological.primary_motivator) {
        case 'recognition':
          return 'achievement-focused and recognition-seeking';
        case 'security':
          return 'security-conscious and risk-averse';
        case 'achievement':
          return 'results-driven and goal-oriented';
        case 'autonomy':
          return 'independent and self-directed';
        case 'belonging':
          return 'relationship-focused and team-oriented';
        default:
          return 'motivated by personal growth';
      }
    }
    
    return 'pragmatic and business-focused';
  }
  
  private static getSecondaryTrait(scoring: any, psychological: any): string {
    // Communication preference shapes interaction style
    if (psychological.communication_preference) {
      switch (psychological.communication_preference) {
        case 'direct':
          return 'direct and straightforward in communication';
        case 'diplomatic':
          return 'diplomatic and tactful in discussions';
        case 'story-driven':
          return 'prefer examples and stories over abstract concepts';
        case 'data-driven':
          return 'prefer facts and data over opinions';
        default:
          return 'clear and professional in communication';
      }
    }
    
    // Fallback to relationship importance
    if (scoring.relationship_importance) {
      switch (scoring.relationship_importance) {
        case 'high':
          return 'value personal relationships and trust-building';
        case 'medium':
          return 'balance relationship-building with business focus';
        case 'low':
          return 'task-focused and results-oriented';
        default:
          return 'professional and business-minded';
      }
    }
    
    return 'professional and courteous';
  }
  
  private static getBehavioralNote(scoring: any, psychological: any): string | undefined {
    // Add specific behavioral notes for extreme traits
    const notes: string[] = [];
    
    if (scoring.pressure_tolerance === 'low') {
      notes.push('become uncomfortable with high-pressure sales tactics');
    }
    
    if (psychological.risk_tolerance === 'low') {
      notes.push('need significant reassurance before considering changes');
    }
    
    if (scoring.trust_threshold === 'high') {
      notes.push('require substantial proof before trusting new solutions');
    }
    
    if (psychological.change_readiness === 'resistant') {
      notes.push('naturally skeptical of new approaches and changes');
    }
    
    // Return the most impactful note
    return notes.length > 0 ? notes[0] : undefined;
  }
  
  /**
   * Generate a concise psychological context string for AI prompts
   */
  static generatePsychologicalContext(personaData: PersonaData): string {
    const traits = this.selectKeyTraits(personaData);
    
    let context = `You are ${traits.primary} and ${traits.secondary}.`;
    
    if (traits.behavioral_note) {
      context += ` You ${traits.behavioral_note}.`;
    }
    
    return context;
  }
  
  /**
   * Get behavioral state hints based on current scoring
   */
  static getBehavioralStateHints(
    personaData: PersonaData, 
    currentScores: { rapport: number; trust: number; interest: number }
  ): string {
    const scoring = personaData.scoring_profile || {};
    const psychological = personaData.psychological_profile || {};
    
    // Determine current behavioral state based on scores and psychology
    let stateHints: string[] = [];
    
    // Trust-based behavior
    if (currentScores.trust < 30 && psychological.trust_building_timeline === 'slow') {
      stateHints.push('remain cautious and skeptical');
    } else if (currentScores.trust > 70) {
      stateHints.push('show increased openness and engagement');
    }
    
    // Rapport-based behavior
    if (currentScores.rapport < 25 && scoring.rapport_sensitivity === 'high') {
      stateHints.push('feel disconnected and formal');
    } else if (currentScores.rapport > 60) {
      stateHints.push('be more personable and relaxed');
    }
    
    // Interest-based behavior
    if (currentScores.interest > 75) {
      stateHints.push('show genuine curiosity and ask follow-up questions');
    } else if (currentScores.interest < 20) {
      stateHints.push('seem distracted or disengaged');
    }
    
    return stateHints.length > 0 
      ? `Current conversation mood: ${stateHints.join(', ')}.`
      : '';
  }
  
  // Impact calculation methods for dynamic trait selection
  
  private static getDecisionMakingImpact(style: string): number {
    const impacts = {
      'analytical': 0.9,      // High impact - affects entire conversation approach
      'intuitive': 0.8,       // High impact - very different from analytical
      'consensus-driven': 0.7, // Medium-high impact - affects decision timeline
      'impulsive': 0.9        // High impact - dramatically different behavior
    };
    return impacts[style as keyof typeof impacts] || 0.5;
  }
  
  private static getDecisionMakingDescription(style: string): string {
    const descriptions = {
      'analytical': 'analytical and data-driven',
      'intuitive': 'intuitive and gut-feeling oriented', 
      'consensus-driven': 'collaborative and consensus-seeking',
      'impulsive': 'quick to decide and action-oriented'
    };
    return descriptions[style as keyof typeof descriptions] || 'thoughtful in decision-making';
  }
  
  private static getCommunicationImpact(preference: string): number {
    const impacts = {
      'direct': 0.8,          // High impact - very noticeable in conversation
      'diplomatic': 0.7,      // Medium-high impact - affects tone significantly
      'story-driven': 0.6,    // Medium impact - affects response style
      'data-driven': 0.8      // High impact - affects what they focus on
    };
    return impacts[preference as keyof typeof impacts] || 0.5;
  }
  
  private static getCommunicationDescription(preference: string): string {
    const descriptions = {
      'direct': 'direct and straightforward in communication',
      'diplomatic': 'diplomatic and tactful in discussions',
      'story-driven': 'prefer examples and stories over abstract concepts', 
      'data-driven': 'prefer facts and data over opinions'
    };
    return descriptions[preference as keyof typeof descriptions] || 'clear in communication';
  }
  
  private static getRiskToleranceImpact(tolerance: string): TraitImpact {
    const impactData = {
      'low': { score: 0.8, desc: 'risk-averse and need significant reassurance' },
      'high': { score: 0.7, desc: 'comfortable with risk and open to new approaches' },
      'medium': { score: 0.3, desc: 'balanced approach to risk' }
    };
    
    const data = impactData[tolerance as keyof typeof impactData] || { score: 0.3, desc: 'cautious about risk' };
    
    return {
      category: 'risk_tolerance',
      field: 'risk_tolerance',
      value: tolerance,
      impact_score: data.score,
      description: data.desc,
      behavioral_weight: 0.7
    };
  }
  
  private static getTrustThresholdImpact(threshold: string): TraitImpact {
    const impactData = {
      'high': { score: 0.8, desc: 'require substantial proof before trusting' },
      'low': { score: 0.6, desc: 'generally trusting and open' },
      'medium': { score: 0.4, desc: 'moderately cautious about trust' }
    };
    
    const data = impactData[threshold as keyof typeof impactData] || { score: 0.4, desc: 'cautious about trust' };
    
    return {
      category: 'trust',
      field: 'trust_threshold', 
      value: threshold,
      impact_score: data.score,
      description: data.desc,
      behavioral_weight: 0.8
    };
  }
  
  private static getPressureToleranceImpact(tolerance: string): TraitImpact {
    const impactData = {
      'low': { score: 0.9, desc: 'become uncomfortable with high-pressure tactics' },
      'high': { score: 0.6, desc: 'handle pressure well and stay focused' },
      'medium': { score: 0.4, desc: 'moderate tolerance for sales pressure' }
    };
    
    const data = impactData[tolerance as keyof typeof impactData] || { score: 0.4, desc: 'handle moderate pressure' };
    
    return {
      category: 'pressure_response',
      field: 'pressure_tolerance',
      value: tolerance,
      impact_score: data.score,
      description: data.desc,
      behavioral_weight: 0.8
    };
  }
  
  private static getStressResponseImpact(response: string): TraitImpact {
    const impactData = {
      'withdrawal': { score: 0.8, desc: 'become quiet and withdrawn when stressed' },
      'aggression': { score: 0.9, desc: 'become more confrontational under pressure' },
      'analysis_paralysis': { score: 0.7, desc: 'overthink decisions when overwhelmed' },
      'urgency': { score: 0.6, desc: 'want to resolve issues quickly when stressed' }
    };
    
    const data = impactData[response as keyof typeof impactData] || { score: 0.4, desc: 'handle stress professionally' };
    
    return {
      category: 'stress_response',
      field: 'stress_response',
      value: response,
      impact_score: data.score,
      description: data.desc,
      behavioral_weight: 0.7
    };
  }
  
  private static getMotivatorImpact(motivator: string): TraitImpact {
    const impactData = {
      'recognition': { score: 0.6, desc: 'motivated by acknowledgment and status' },
      'security': { score: 0.7, desc: 'prioritize stability and risk mitigation' },
      'achievement': { score: 0.6, desc: 'focused on results and goal attainment' },
      'autonomy': { score: 0.5, desc: 'value independence and self-direction' },
      'belonging': { score: 0.6, desc: 'prioritize team harmony and relationships' }
    };
    
    const data = impactData[motivator as keyof typeof impactData] || { score: 0.4, desc: 'motivated by personal growth' };
    
    return {
      category: 'motivation',
      field: 'primary_motivator',
      value: motivator,
      impact_score: data.score,
      description: data.desc,
      behavioral_weight: 0.6
    };
  }
  
  private static getRelationshipImpact(importance: string): TraitImpact {
    const impactData = {
      'high': { score: 0.7, desc: 'prioritize personal connection and trust-building' },
      'low': { score: 0.6, desc: 'focus on business outcomes over relationships' },
      'medium': { score: 0.3, desc: 'balance relationship and business priorities' }
    };
    
    const data = impactData[importance as keyof typeof impactData] || { score: 0.3, desc: 'professional approach to relationships' };
    
    return {
      category: 'relationship',
      field: 'relationship_importance',
      value: importance,
      impact_score: data.score,
      description: data.desc,
      behavioral_weight: 0.6
    };
  }
}

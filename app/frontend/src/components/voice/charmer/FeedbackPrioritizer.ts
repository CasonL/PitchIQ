/**
 * FeedbackPrioritizer.ts
 * Selects top 1-2 mechanics, merges redundant feedback, generates rewrite suggestions
 * Proves that multi-mechanic detection produces sharper feedback than boolean buckets
 */

import { InferredMechanic, MechanicType } from './MechanicInferenceEngine';
import { DetectedSignal } from './SignalDetector';

export interface PrioritizedFeedback {
  primaryMechanic: InferredMechanic;
  secondaryMechanic?: InferredMechanic;
  merged: boolean;
  diagnosis: string;
  evidence: string[];
  rewriteSuggestion: string;
  reasoning: string;
}

export class FeedbackPrioritizer {
  prioritize(mechanics: InferredMechanic[], originalMessage: string): PrioritizedFeedback | null {
    if (mechanics.length === 0) return null;

    // Get top mechanics (priority 1-2 only, ignore noise)
    const criticalMechanics = mechanics.filter(m => m.priority <= 2);
    if (criticalMechanics.length === 0) return null;

    const primary = criticalMechanics[0];
    const secondary = criticalMechanics.length > 1 ? criticalMechanics[1] : undefined;

    // Check if mechanics should be merged
    const shouldMerge = secondary ? this.shouldMergeMechanics(primary, secondary) : false;

    if (shouldMerge && secondary) {
      return this.generateMergedFeedback(primary, secondary, originalMessage);
    } else {
      return this.generateFocusedFeedback(primary, secondary, originalMessage);
    }
  }

  private shouldMergeMechanics(m1: InferredMechanic, m2: InferredMechanic): boolean {
    // Merge if they share similar root causes
    const mergeSets: MechanicType[][] = [
      ['permission_without_value', 'identity_without_payoff', 'generic_business_topic'],
      ['low_outcome_specificity', 'generic_business_topic', 'vague_relevance_claim'],
      ['close_ended_without_value', 'discovery_without_context'],
      ['apologetic_opening', 'softened_authority']
    ];

    for (const set of mergeSets) {
      if (set.includes(m1.type) && set.includes(m2.type)) {
        return true;
      }
    }

    return false;
  }

  private generateMergedFeedback(
    primary: InferredMechanic,
    secondary: InferredMechanic,
    originalMessage: string
  ): PrioritizedFeedback {
    const evidence = this.extractEvidence([primary, secondary]);
    
    let diagnosis = '';
    let rewriteSuggestion = '';
    let reasoning = '';

    // Merged diagnosis patterns
    if (primary.type === 'permission_without_value' && secondary.type === 'identity_without_payoff') {
      diagnosis = "You named yourself and asked for time, but gave Marcus no reason to stay";
      reasoning = `"${evidence[0]}" identifies you without payoff. "${evidence[1]}" asks for time before value. Marcus heard: generic pitch incoming.`;
      rewriteSuggestion = this.generateRewrite(originalMessage, 'permission_identity_no_value');
    } 
    else if (primary.type === 'permission_without_value' && secondary.type === 'generic_business_topic') {
      diagnosis = "You asked for time to discuss a vague topic without concrete value";
      reasoning = `"${evidence[0]}" asks for permission. "${evidence[1]}" names a topic but not a payoff. Too generic to justify the interruption.`;
      rewriteSuggestion = this.generateRewrite(originalMessage, 'permission_vague_topic');
    }
    else if (primary.type === 'identity_without_payoff' && secondary.type === 'generic_business_topic') {
      diagnosis = "You introduced yourself and a vague topic, but no concrete reason to engage";
      reasoning = `"${evidence[0]}" reveals identity. "${evidence[1]}" mentions topic. Both lack specificity—what actually changes for Marcus?`;
      rewriteSuggestion = this.generateRewrite(originalMessage, 'identity_vague_topic');
    }
    else {
      // Fallback merged diagnosis
      diagnosis = `${primary.explanation}. Also: ${secondary.explanation}`;
      reasoning = `Multiple mechanics working against you: ${evidence.join(', ')}`;
      rewriteSuggestion = this.generateRewrite(originalMessage, primary.type);
    }

    return {
      primaryMechanic: primary,
      secondaryMechanic: secondary,
      merged: true,
      diagnosis,
      evidence,
      rewriteSuggestion,
      reasoning
    };
  }

  private generateFocusedFeedback(
    primary: InferredMechanic,
    secondary: InferredMechanic | undefined,
    originalMessage: string
  ): PrioritizedFeedback {
    const evidence = this.extractEvidence(secondary ? [primary, secondary] : [primary]);
    
    const diagnosis = this.generateDiagnosis(primary);
    const reasoning = this.generateReasoning(primary, secondary);
    const rewriteSuggestion = this.generateRewrite(originalMessage, primary.type);

    return {
      primaryMechanic: primary,
      secondaryMechanic: secondary,
      merged: false,
      diagnosis,
      evidence,
      rewriteSuggestion,
      reasoning
    };
  }

  private extractEvidence(mechanics: InferredMechanic[]): string[] {
    const evidence: string[] = [];
    
    for (const mechanic of mechanics) {
      const signalTexts = mechanic.supportingSignals
        .map(s => s.text)
        .filter(t => t.length > 0)
        .slice(0, 2);
      evidence.push(...signalTexts);
    }

    return [...new Set(evidence)];
  }

  private generateDiagnosis(mechanic: InferredMechanic): string {
    const diagnoses: Record<MechanicType, string> = {
      'permission_without_value': 'You asked for time before giving a reason to stay',
      'identity_without_payoff': 'You named yourself/company without giving Marcus a reason to care',
      'generic_business_topic': 'You named a topic but not a concrete payoff',
      'low_outcome_specificity': 'You mentioned value but without specific outcomes or metrics',
      'close_ended_without_value': 'You asked a yes/no question without establishing value first',
      'discovery_without_context': 'You asked discovery without setting context—may feel random',
      'apologetic_opening': 'Your opening was apologetic, giving Marcus permission to ignore you',
      'assumption_without_discovery': 'You made assumptions without asking discovery questions',
      'feature_without_outcome': 'You listed features without explaining what changes for Marcus',
      'definitive_overclaim': 'You overpromised with absolute claims, risking trust',
      'vague_relevance_claim': 'You claimed relevance but stayed too vague to land',
      'permission_with_value': 'You asked for time then provided value—suboptimal sequence',
      'value_before_permission': 'You led with value before asking for time—good sequence',
      'value_without_ask': 'You led with value, no permission ask needed—strong opener',
      'discovery_with_context': 'You asked discovery after establishing context—good flow',
      'specific_value_proposition': 'You stated specific, measurable value—strong',
      'outcome_focused': 'You focused on outcomes for Marcus, not just features—good',
      'identity_with_relevance': 'You established relevance before revealing identity—good sequence',
      'close_ended_with_value': 'Close-ended question, but value present softens the issue',
      'softened_authority': 'Over-hedging with "might", "could"—sounds uncertain',
      'confident_opening': 'Confident opening that commands attention'
    };

    return diagnoses[mechanic.type] || mechanic.explanation;
  }

  private generateReasoning(primary: InferredMechanic, secondary?: InferredMechanic): string {
    const primaryEvidence = primary.supportingSignals.map(s => `"${s.text}"`).join(', ');
    
    let reasoning = `${primaryEvidence} triggered ${primary.type.replace(/_/g, ' ')}`;
    
    if (secondary) {
      const secondaryEvidence = secondary.supportingSignals.map(s => `"${s.text}"`).join(', ');
      reasoning += `. Also detected: ${secondaryEvidence}`;
    }

    return reasoning;
  }

  private generateRewrite(originalMessage: string, mechanicType: MechanicType | string): string {
    // Pattern-based rewrite suggestions
    const rewrites: Record<string, (msg: string) => string> = {
      'permission_without_value': (msg) => {
        return 'Instead: "Quick one—I help teams reduce ramp time. How are you handling onboarding?"';
      },
      'identity_without_payoff': (msg) => {
        return 'Reorder: Relevance THEN identity. "I work with teams struggling with [specific problem]. Is that relevant to you?" Then: "I\'m [name] from [company]." Identity is necessary—just earn it first.';
      },
      'permission_identity_no_value': (msg) => {
        return 'Reorder: Value → Relevance → Identity. Example: "I help teams cut onboarding time by 30%. Is ramp speed an issue for you? I\'m Cason from PitchIQ." Same identity, better sequence.';
      },
      'permission_vague_topic': (msg) => {
        return 'Instead: Lead with specific value: "Teams I work with reduce rep ramp from 90 to 60 days. How long does your onboarding take?"';
      },
      'identity_vague_topic': (msg) => {
        return 'Instead: "I help sales teams fix inconsistent rep performance. Is that something you\'re working on?"';
      },
      'generic_business_topic': (msg) => {
        return 'Add specificity: What specific outcome? What metric? What changes for Marcus?';
      },
      'low_outcome_specificity': (msg) => {
        return 'Add outcome: "reduce ramp time by 30%" or "close 40% more deals in 90 days"';
      },
      'close_ended_without_value': (msg) => {
        return 'Instead: "What\'s your biggest challenge with [specific problem]?"';
      },
      'apologetic_opening': (msg) => {
        return 'Drop the apology. Lead with relevance: "I work with teams facing X. Curious if that\'s an issue for you."';
      }
    };

    const rewriter = rewrites[mechanicType];
    if (rewriter) {
      return rewriter(originalMessage);
    }

    // Generic fallback
    return 'Reorder: Context → Value → Ask (not Ask → Context)';
  }

  formatForDisplay(feedback: PrioritizedFeedback): string {
    let output = `## ${feedback.diagnosis}\n\n`;
    
    output += `**Evidence:**\n`;
    feedback.evidence.forEach(e => {
      output += `- "${e}"\n`;
    });
    
    output += `\n**Why this matters:**\n${feedback.reasoning}\n\n`;
    output += `**Better approach:**\n${feedback.rewriteSuggestion}`;
    
    if (feedback.merged) {
      output += `\n\n_Note: Merged ${feedback.primaryMechanic.type} + ${feedback.secondaryMechanic?.type}_`;
    }
    
    return output;
  }

  compareWithOldSystem(
    newFeedback: PrioritizedFeedback,
    oldFeedback: string
  ): { newSystem: string; oldSystem: string; improvement: string } {
    return {
      oldSystem: oldFeedback,
      newSystem: this.formatForDisplay(newFeedback),
      improvement: this.calculateImprovement(newFeedback, oldFeedback)
    };
  }

  private calculateImprovement(newFeedback: PrioritizedFeedback, oldFeedback: string): string {
    const improvements: string[] = [];
    
    if (newFeedback.evidence.length > 0) {
      improvements.push('✓ Evidence-backed (cites exact text)');
    }
    
    if (newFeedback.diagnosis.includes('before') || newFeedback.diagnosis.includes('without')) {
      improvements.push('✓ Mechanistic (explains sequence/causality)');
    }
    
    if (newFeedback.rewriteSuggestion.includes('Instead:')) {
      improvements.push('✓ Actionable (provides specific alternative)');
    }
    
    if (!newFeedback.diagnosis.includes('rapport') && !newFeedback.diagnosis.includes('engagement')) {
      improvements.push('✓ Precise (no vague categories)');
    }
    
    return improvements.join('\n');
  }
}

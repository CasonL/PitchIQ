/**
 * ObjectionStack.ts
 * Hidden objection system - subconscious roots that surface under right conditions
 */

import { ObjectionRoot } from './CallMetrics';

export interface ObjectionTemplate {
  surface: string; // What Marcus says
  roots: Array<{
    id: string;
    intensity: number;
    conscious: boolean;
    description: string;
  }>;
  resolutionSignals: string[]; // What needs to happen for resolution
}

/**
 * Marcus's B2B objection stacks (Stindle Consulting context)
 */
export const MARCUS_OBJECTION_STACKS: Record<string, ObjectionTemplate> = {
  budget: {
    surface: "It's not in the budget right now",
    roots: [
      {
        id: 'household_pressure',
        intensity: 0.6,
        conscious: true,
        description: "Wife scrutinizes business spending"
      },
      {
        id: 'recent_spend_regret',
        intensity: 0.8,
        conscious: false,
        description: "Bought office chairs and hired sales rep recently - feels burnt"
      },
      {
        id: 'revenue_decline_fear',
        intensity: 0.9,
        conscious: false,
        description: "4 months of client drought - terrified of wasting money"
      }
    ],
    resolutionSignals: ['risk_reversal', 'low_commitment', 'proof_of_roi']
  },
  
  timing: {
    surface: "This isn't the right time",
    roots: [
      {
        id: 'bandwidth_protection',
        intensity: 0.7,
        conscious: true,
        description: "Training 8 SaaS teams already - stretched thin"
      },
      {
        id: 'change_fatigue',
        intensity: 0.6,
        conscious: false,
        description: "Just implemented new CRM - exhausted by new tools"
      },
      {
        id: 'control_anxiety',
        intensity: 0.5,
        conscious: false,
        description: "Needs to feel like it's HIS decision, HIS timeline"
      }
    ],
    resolutionSignals: ['gradual_rollout', 'minimal_time_investment', 'autonomy_preservation']
  },
  
  skepticism: {
    surface: "I've heard that before",
    roots: [
      {
        id: 'vendor_fatigue',
        intensity: 0.8,
        conscious: true,
        description: "Sick of sales tools that overpromise"
      },
      {
        id: 'identity_protection',
        intensity: 0.7,
        conscious: false,
        description: "Consultant who teaches sales - can't look stupid buying snake oil"
      },
      {
        id: 'proof_hunger',
        intensity: 0.9,
        conscious: false,
        description: "Needs to see it work for people like him before trusting"
      }
    ],
    resolutionSignals: ['specific_proof', 'similar_customer', 'transparent_demo']
  },
  
  cold_outreach: {
    surface: "Cold outreach feels like pulling teeth",
    roots: [
      {
        id: 'conversion_paradox',
        intensity: 0.8,
        conscious: true,
        description: "Great at closing (60-70%), terrible at getting answers"
      },
      {
        id: 'rejection_aversion',
        intensity: 0.6,
        conscious: false,
        description: "Each unanswered call feels like personal failure"
      },
      {
        id: 'method_attachment',
        intensity: 0.5,
        conscious: false,
        description: "Taught consultative selling for years - resistant to new outreach methods"
      }
    ],
    resolutionSignals: ['outreach_specific_solution', 'preserve_consulting_method', 'quick_wins']
  }
};

/**
 * Detect if user response addresses an objection root
 */
export function detectResolutionSignals(
  userText: string,
  objectionId: string
): string[] {
  const template = MARCUS_OBJECTION_STACKS[objectionId];
  if (!template) return [];
  
  const signals: string[] = [];
  const lowerText = userText.toLowerCase();
  
  // Risk reversal signals
  if (/(free trial|money back|guarantee|no risk|cancel anytime|pilot)/i.test(lowerText)) {
    signals.push('risk_reversal');
  }
  
  // Low commitment signals
  if (/(just (try|test)|start small|one (call|session)|few minutes)/i.test(lowerText)) {
    signals.push('low_commitment');
  }
  
  // Proof/social proof signals
  if (/(other consultants?|similar|companies? like you|(case study|example))/i.test(lowerText)) {
    signals.push('specific_proof', 'similar_customer');
  }
  
  // ROI signals
  if (/(save (time|money)|increase|improve|results?|roi|return)/i.test(lowerText)) {
    signals.push('proof_of_roi');
  }
  
  // Gradual rollout signals
  if (/(start with|phase|gradually|step by step|your pace)/i.test(lowerText)) {
    signals.push('gradual_rollout');
  }
  
  // Autonomy preservation
  if (/(your (choice|decision|call)|up to you|when you're ready)/i.test(lowerText)) {
    signals.push('autonomy_preservation');
  }
  
  // Minimal time
  if (/(quick|fast|won't take long|5 minutes|minimal time)/i.test(lowerText)) {
    signals.push('minimal_time_investment');
  }
  
  // Transparent demo
  if (/(show you|walk through|see (it|how)|demo|example)/i.test(lowerText)) {
    signals.push('transparent_demo');
  }
  
  // Outreach-specific
  if (/(outreach|answer rate|response|pick up|phone)/i.test(lowerText)) {
    signals.push('outreach_specific_solution');
  }
  
  return signals;
}

/**
 * Evaluate if objection roots should soften based on user response
 */
export function evaluateRootSoftening(
  objectionId: string,
  detectedSignals: string[]
): { softened: string[]; stillBlocking: string[] } {
  const template = MARCUS_OBJECTION_STACKS[objectionId];
  if (!template) return { softened: [], stillBlocking: [] };
  
  const requiredSignals = template.resolutionSignals;
  const softened: string[] = [];
  const stillBlocking: string[] = [];
  
  // Check which roots got addressed
  template.roots.forEach(root => {
    // Conscious roots soften easier
    if (root.conscious && detectedSignals.length > 0) {
      softened.push(root.id);
    }
    // Subconscious roots need specific signals
    else if (!root.conscious) {
      const addressed = requiredSignals.some(signal => detectedSignals.includes(signal));
      if (addressed && root.intensity < 0.7) {
        softened.push(root.id);
      } else if (addressed && root.intensity >= 0.7) {
        // High-intensity subconscious needs multiple signals
        const matchCount = requiredSignals.filter(s => detectedSignals.includes(s)).length;
        if (matchCount >= 2) {
          softened.push(root.id);
        } else {
          stillBlocking.push(root.id);
        }
      } else {
        stillBlocking.push(root.id);
      }
    } else {
      stillBlocking.push(root.id);
    }
  });
  
  return { softened, stillBlocking };
}

/**
 * Detect proxy resolution signals (real-world resolution without naming all roots)
 */
export function detectProxyResolution(
  userText: string,
  objectionId: string
): { hasProxySignals: boolean; signalCount: number } {
  const lowerText = userText.toLowerCase();
  let signalCount = 0;
  
  // Risk reversal signals
  if (/(free trial|money back|guarantee|no risk|cancel anytime|pilot|test)/i.test(lowerText)) {
    signalCount++;
  }
  
  // Proof/credibility signals
  if (/(case study|testimonial|other (clients?|customers?)|similar companies?|results?)/i.test(lowerText)) {
    signalCount++;
  }
  
  // Constraint reduction signals
  if (/(start small|minimal|just (try|test)|one (call|session)|few minutes)/i.test(lowerText)) {
    signalCount++;
  }
  
  // Marcus proposing next step (behavioral resolution)
  if (/(let's (do|try|schedule)|i'll (send|email|call)|follow.?up|next (step|week))/i.test(lowerText)) {
    signalCount++;
  }
  
  return {
    hasProxySignals: signalCount > 0,
    signalCount
  };
}

/**
 * Check if objection is resolved via roots OR proxy signals
 * Real prospects don't always articulate every concern - they just decide
 */
export function isObjectionResolved(
  objectionId: string,
  softenedRoots: string[],
  satisfiedGradient: number,
  userText: string
): boolean {
  const template = MARCUS_OBJECTION_STACKS[objectionId];
  if (!template) return false;
  
  // Path 1: All roots explicitly handled
  const allRootIds = template.roots.map(r => r.id);
  const allRootsSoftened = allRootIds.every(id => softenedRoots.includes(id));
  
  if (allRootsSoftened) return true;
  
  // Path 2: High satisfied gradient (Marcus explicitly satisfied)
  if (satisfiedGradient >= 0.9) return true;
  
  // Path 3: Multiple proxy signals + moderate satisfaction
  const proxy = detectProxyResolution(userText, objectionId);
  if (proxy.signalCount >= 2 && satisfiedGradient >= 0.6) {
    return true;
  }
  
  // Path 4: Strong proxy + softened at least one major root
  if (proxy.signalCount >= 3 && softenedRoots.length >= 1) {
    return true;
  }
  
  return false;
}

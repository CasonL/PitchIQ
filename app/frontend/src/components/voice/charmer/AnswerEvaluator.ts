/**
 * AnswerEvaluator.ts
 * Evaluates rep answers against buyer objections using LLM semantic judgment
 * Principle-based learning: teaches intent, not vocabulary
 */

import type { ObjectionType, ObjectionSatisfaction } from './StrategyLayer';

export type AcknowledgmentCue = 'none' | 'partial' | 'strong';

export interface AnswerImpact {
  addressed: boolean;
  satisfactionDelta: number;   // 0.0 to +0.5 (bounded increase)
  clarityDelta: number;        // -1 to +2
  relevanceDelta: number;      // -1 to +2
  trustDelta: number;          // -1 to +1
  acknowledgmentCue: AcknowledgmentCue;
  specificAcknowledgment?: string; // What Marcus should say
  // LLM semantic scores
  acknowledgedConcern?: boolean;
  credibilityBuilt?: number;    // 0-10
  specificityScore?: number;    // 0-10
  relevanceScore?: number;      // 0-10
}

// Keyword rubrics per objection type
const OBJECTION_RUBRICS: Record<ObjectionType, string[]> = {
  customization: [
    'tailored', 'custom', 'specific', 'personalized', 'adapted',
    'your buyers', 'your objections', 'your scenarios', 'your team',
    'persona', 'generated', 'adaptive', 'unique',
    'not generic', 'not one-size', 'not cookie-cutter'
  ],
  proof: [
    'results', 'case study', 'pilot', 'trial', 'tested', 'measured',
    'improved', 'evidence', 'data', 'metrics', 'roi', 'performance',
    'success', 'proven', 'track record', 'example'
  ],
  fit: [
    'for your team', 'for consulting', 'for your process', 'for sales',
    'matches your workflow', 'relevant to your reps', 'designed for',
    'works with', 'integrates', 'fits your', 'your industry'
  ],
  trust: [
    'guarantee', 'backed by', 'established', 'certified', 'vetted',
    'transparent', 'secure', 'safe', 'reliable', 'credible',
    'track record', 'references', 'testimonials'
  ],
  value: [
    'roi', 'return', 'savings', 'worth', 'investment', 'payback',
    'cost-effective', 'efficiency', 'productivity', 'revenue',
    'affordable', 'pricing', 'value'
  ],
  time: [
    'quick', 'fast', 'efficient', 'minimal time', 'streamlined',
    'automated', 'easy setup', 'ready to use', 'immediate',
    'low effort', 'simple', 'straightforward'
  ],
  budget: [
    'affordable', 'pricing', 'cost', 'flexible', 'payment plan',
    'within budget', 'reasonable', 'competitive', 'discount',
    'financing', 'trial', 'starter plan'
  ],
  authority: [
    'decision maker', 'executive', 'approval', 'stakeholder',
    'team decision', 'evaluate', 'trial', 'pilot', 'test'
  ],
  timing: [
    'now', 'urgent', 'immediate', 'sooner', 'right time',
    'opportunity', 'delay', 'later', 'schedule', 'timeline'
  ],
  status_quo: [
    'better than', 'upgrade', 'improvement', 'different from',
    'solves', 'addresses', 'gap', 'limitation', 'problem with current'
  ]
};

// Contrast phrases that show differentiation
const CONTRAST_PHRASES = [
  'unlike', 'different from', 'traditional', 'generic', 'typical',
  'standard', 'old way', 'most companies', 'competitors',
  'instead of', 'rather than', 'versus', 'compared to'
];

// Specificity indicators (shows concrete vs vague)
const SPECIFICITY_INDICATORS = [
  'specifically', 'for example', 'such as', 'like', 'including',
  'based on your', 'your actual', 'real', 'concrete'
];

// Objection handling principles (what we're really teaching)
const OBJECTION_PRINCIPLES: Record<ObjectionType, string[]> = {
  trust: [
    'Social proof (customers, testimonials, case studies)',
    'Guarantees or commitments',
    'Transparency about process or pricing',
    'Third-party validation (certifications, awards)',
    'Track record or experience'
  ],
  proof: [
    'Concrete results or metrics',
    'Specific examples or case studies',
    'Measurable outcomes',
    'Data or evidence',
    'Customer success stories'
  ],
  fit: [
    'Relevance to their specific situation',
    'Industry or role alignment',
    'Integration with existing processes',
    'Customization or adaptation',
    'Understanding their unique needs'
  ],
  customization: [
    'Tailored solutions vs generic',
    'Adapts to their context',
    'Personalized approach',
    'Not one-size-fits-all',
    'Built for their specific needs'
  ],
  value: [
    'ROI or return on investment',
    'Cost justification',
    'Efficiency or productivity gains',
    'Long-term value',
    'Comparison to alternatives'
  ],
  time: [
    'Quick implementation',
    'Low time commitment',
    'Automated or streamlined',
    'Immediate results',
    'Minimal disruption'
  ],
  budget: [
    'Affordable pricing',
    'Flexible payment options',
    'Cost comparison',
    'Value relative to price',
    'Budget fit'
  ],
  authority: [
    'Decision-making process',
    'Stakeholder involvement',
    'Trial or pilot opportunity',
    'Evaluation path',
    'No-pressure approach'
  ],
  timing: [
    'Urgency or immediate need',
    'Right timing',
    'Opportunity cost of waiting',
    'Future readiness',
    'Timeline alignment'
  ],
  status_quo: [
    'Limitations of current solution',
    'Gap in existing process',
    'Improvement opportunity',
    'Differentiation from alternatives',
    'Better approach'
  ]
};

export class AnswerEvaluator {
  
  /**
   * LLM-based semantic evaluation: judges intent, not vocabulary
   */
  private static async evaluateWithLLM(
    repAnswer: string,
    objectionType: ObjectionType,
    marcusObjection?: string
  ): Promise<{
    acknowledgedConcern: boolean;
    credibilityBuilt: number;
    specificityScore: number;
    relevanceScore: number;
    reasoning: string;
  }> {
    const principles = OBJECTION_PRINCIPLES[objectionType];
    
    const prompt = `You are evaluating a sales rep's answer to a buyer objection. Judge PRINCIPLES, not specific words.

OBJECTION TYPE: ${objectionType.toUpperCase()}
${marcusObjection ? `Marcus said: "${marcusObjection}"` : ''}

PRINCIPLES TO LOOK FOR (any authentic way to demonstrate these):
${principles.map(p => `- ${p}`).join('\n')}

REP'S ANSWER:
"${repAnswer}"

Evaluate (0-10 scale):
1. acknowledgedConcern: Did they validate the concern first? (true/false)
2. credibilityBuilt: How well did they build credibility/trust? (0-10)
   - 0: Ignored objection or made vague claims
   - 3-4: Mentioned relevant concepts but stayed surface-level
   - 7-8: Demonstrated principles authentically (examples, specifics, social proof)
   - 10: Perfect execution with concrete evidence
3. specificityScore: Concrete examples vs vague claims? (0-10)
4. relevanceScore: Tailored to Marcus's situation vs generic? (0-10)

IMPORTANT: Judge the INTENT and SUBSTANCE, not exact vocabulary.
"Our clients love us" counts as social proof even without saying "testimonials."
"We've helped 50+ companies" is credibility even without "track record."

Respond ONLY with valid JSON:
{
  "acknowledgedConcern": true/false,
  "credibilityBuilt": 0-10,
  "specificityScore": 0-10,
  "relevanceScore": 0-10,
  "reasoning": "1-2 sentence explanation"
}`;

    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`LLM evaluation failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      
      const evaluation = JSON.parse(jsonMatch[0]);
      
      console.log(`🤖 [LLM Eval] ${objectionType}: credibility=${evaluation.credibilityBuilt}/10, specificity=${evaluation.specificityScore}/10`);
      console.log(`   Reasoning: ${evaluation.reasoning}`);
      
      return evaluation;
      
    } catch (error) {
      console.error('❌ LLM evaluation failed, using fallback:', error);
      // Fallback to conservative scoring
      return {
        acknowledgedConcern: false,
        credibilityBuilt: 3,
        specificityScore: 3,
        relevanceScore: 3,
        reasoning: 'LLM evaluation failed, using default scores'
      };
    }
  }
  
  /**
   * Evaluate how well a rep's answer addresses a buyer objection
   * Now uses LLM semantic judgment for principle-based learning
   */
  static async evaluate(
    repAnswer: string,
    activeObjection: ObjectionType,
    currentSatisfaction: number,
    context: {
      buyerClarityLevel: number;
      buyerTrustLevel: number;
      conversationHistory: Array<{ role: string; content: string }>;
    },
    marcusObjection?: string
  ): Promise<AnswerImpact> {
    console.log(`💡 [Answer Eval] Evaluating answer for ${activeObjection} objection`);
    console.log(`   Current satisfaction: ${currentSatisfaction.toFixed(2)}`);
    console.log(`   Answer: "${repAnswer.substring(0, 80)}..."`);
    
    const lower = repAnswer.toLowerCase();
    
    // Default: no impact
    let impact: AnswerImpact = {
      addressed: false,
      satisfactionDelta: 0,
      clarityDelta: 0,
      relevanceDelta: 0,
      trustDelta: 0,
      acknowledgmentCue: 'none'
    };

    // Check if answer is coherent enough
    const wordCount = repAnswer.split(/\s+/).length;
    if (wordCount < 3) {
      console.log(`   ❌ Too short (${wordCount} words) - skipping`);
      return impact; // Too short to address anything
    }

    // Check for vagueness that reduces clarity
    const vaguePatterns = /\b(um|uh|kind of|sort of|maybe|possibly|i think|not sure)\b/gi;
    const vagueMatches = (repAnswer.match(vaguePatterns) || []).length;
    if (vagueMatches > 2) {
      console.log(`   ⚠️ Too vague (${vagueMatches} filler words) - reducing trust/clarity`);
      impact.clarityDelta = -1;
      impact.trustDelta = -0.5;
      return impact;
    }

    // LLM SEMANTIC EVALUATION (principle-based, not keyword-based)
    const llmEval = await this.evaluateWithLLM(repAnswer, activeObjection, marcusObjection);
    
    // Store LLM scores in impact
    impact.acknowledgedConcern = llmEval.acknowledgedConcern;
    impact.credibilityBuilt = llmEval.credibilityBuilt;
    impact.specificityScore = llmEval.specificityScore;
    impact.relevanceScore = llmEval.relevanceScore;
    
    // Convert LLM scores (0-10) to impact deltas
    // credibilityBuilt is the main driver for objection satisfaction
    const credibilityNormalized = llmEval.credibilityBuilt / 10; // 0-1
    const specificityNormalized = llmEval.specificityScore / 10;
    const relevanceNormalized = llmEval.relevanceScore / 10;
    
    // Did they address the objection at all?
    if (llmEval.credibilityBuilt < 3) {
      console.log(`   ❌ Low credibility score (${llmEval.credibilityBuilt}/10) - answer doesn't address ${activeObjection} objection`);
      console.log(`   Reasoning: ${llmEval.reasoning}`);
      return impact;
    }
    
    impact.addressed = true;
    
    // Satisfaction delta based on credibility score (0.0-0.5 range)
    // 3/10 = 0.05, 7/10 = 0.25, 10/10 = 0.4
    impact.satisfactionDelta = Math.min(0.5, credibilityNormalized * 0.5);
    
    // Bonus for acknowledgment (shows empathy)
    if (llmEval.acknowledgedConcern) {
      impact.satisfactionDelta += 0.05;
      impact.acknowledgmentCue = 'strong';
    }
    
    console.log(`   ✅ LLM scores: credibility=${llmEval.credibilityBuilt}/10, specificity=${llmEval.specificityScore}/10, relevance=${llmEval.relevanceScore}/10`);
    console.log(`   📈 Satisfaction delta: +${impact.satisfactionDelta.toFixed(2)}`);

    // Clarity improvement based on specificity
    if (specificityNormalized > 0.7) {
      impact.clarityDelta = 2;
    } else if (specificityNormalized > 0.4) {
      impact.clarityDelta = 1;
    }

    // Relevance improvement
    if (relevanceNormalized > 0.7) {
      impact.relevanceDelta = 2;
    } else if (relevanceNormalized > 0.4) {
      impact.relevanceDelta = 1;
    }

    // Trust delta (earned through credibility + specificity)
    if (credibilityNormalized > 0.7 && specificityNormalized > 0.7) {
      impact.trustDelta = 0.5;
    } else if (credibilityNormalized > 0.4) {
      impact.trustDelta = 0.2;
    }

    // Determine acknowledgment cue (already set above if acknowledged, refine here)
    if (!llmEval.acknowledgedConcern) {
      if (impact.satisfactionDelta >= 0.3) {
        impact.acknowledgmentCue = 'strong';
        impact.specificAcknowledgment = this.getAcknowledgment(activeObjection, 'strong');
      } else if (impact.satisfactionDelta >= 0.15) {
        impact.acknowledgmentCue = 'partial';
        impact.specificAcknowledgment = this.getAcknowledgment(activeObjection, 'partial');
      }
    }

    return impact;
  }

  /**
   * Generate specific acknowledgment text for Marcus to use
   */
  private static getAcknowledgment(objection: ObjectionType, strength: 'partial' | 'strong'): string {
    const acknowledgments: Record<ObjectionType, { partial: string; strong: string }> = {
      customization: {
        partial: "I can see how that's more tailored than a generic seminar.",
        strong: "Okay, I get it - you're adapting to our specific buyers and objections."
      },
      proof: {
        partial: "That helps on the proof side.",
        strong: "Okay, those results are convincing."
      },
      fit: {
        partial: "I see how that could work for our team.",
        strong: "That does sound relevant to our sales process."
      },
      trust: {
        partial: "That adds some credibility.",
        strong: "Okay, you've established trust there."
      },
      value: {
        partial: "I can see the ROI angle.",
        strong: "That makes the value clearer."
      },
      time: {
        partial: "That sounds less time-intensive than I thought.",
        strong: "Okay, setup seems straightforward."
      },
      budget: {
        partial: "The pricing is more flexible than I expected.",
        strong: "That fits our budget better than I thought."
      },
      authority: {
        partial: "I can bring that to the team.",
        strong: "That makes it easier to get buy-in."
      },
      timing: {
        partial: "I see why now makes sense.",
        strong: "Okay, the timing argument is solid."
      },
      status_quo: {
        partial: "I see how that's different from what we're doing.",
        strong: "That's a clear improvement over our current approach."
      }
    };

    return acknowledgments[objection][strength];
  }

  /**
   * Apply answer impact to buyer state
   */
  static applyImpact(
    satisfaction: ObjectionSatisfaction,
    clarity: number,
    relevance: number,
    trustLevel: number,
    impact: AnswerImpact,
    activeObjection: ObjectionType
  ): {
    satisfaction: ObjectionSatisfaction;
    clarity: number;
    relevance: number;
    trustLevel: number;
  } {
    const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

    const newSatisfaction = { ...satisfaction };
    newSatisfaction[activeObjection] = clamp(
      satisfaction[activeObjection] + impact.satisfactionDelta,
      0,
      1.0
    );

    return {
      satisfaction: newSatisfaction,
      clarity: clamp(clarity + impact.clarityDelta, 0, 10),
      relevance: clamp(relevance + impact.relevanceDelta, 0, 10),
      trustLevel: clamp(trustLevel + impact.trustDelta, 0, 10)
    };
  }
}

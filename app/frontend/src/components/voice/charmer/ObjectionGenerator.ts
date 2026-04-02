/**
 * ObjectionGenerator.ts
 * Async service that generates product-specific objections for Marcus
 * Runs in background, doesn't block conversation
 */

export interface ProductContext {
  productName?: string;
  category?: string;
  valueProposition?: string;
  targetMarket?: string;
}

export interface DiscoveryContext {
  productCategory?: string;
  valueProposition?: string;
  keyFeatures: string[];
  pricingModel?: string;
  implementation?: string;
  differentiators: string[];
  proofPoints: string[];
  // What triggered this generation
  trigger: 'product_category' | 'value_proposition' | 'key_features' | 'pricing_model' | 'implementation' | 'differentiation' | 'proof_points';
  triggerContent: string; // What was just revealed
}

export interface ObjectionRoot {
  id: string;
  intensity: number; // 0-1, how strongly this blocks the sale
  conscious: boolean; // true = they know this is a concern, false = hidden driver
  description: string; // What's really going on
}

export interface GeneratedObjection {
  type: 'timing' | 'fit' | 'trust' | 'cost' | 'status_quo' | 'authority';
  surface: string; // What Marcus says (surface-level concern)
  roots: ObjectionRoot[]; // Why he REALLY has this objection (conscious + hidden)
  resolutionSignals: string[]; // What needs to happen to overcome this
  severity: 'minor' | 'moderate' | 'major'; // How hard to overcome
  satisfactionThreshold: number; // 0-1, how much effort to resolve
}

export interface ObjectionPack {
  discoveryContext: DiscoveryContext;
  objections: GeneratedObjection[];
  generatedAt: number;
  isReady: boolean;
  stage: 'initial' | 'category' | 'features' | 'pricing' | 'proof'; // Progression stage
}

export class ObjectionGenerator {
  private currentPack: ObjectionPack | null = null;
  private isGenerating: boolean = false;

  /**
   * Generate objections for a specific discovery moment
   * Progressive - refines objections as more is revealed
   */
  async generateForDiscovery(discoveryContext: DiscoveryContext): Promise<void> {
    if (this.isGenerating) {
      console.log('⏳ [ObjectionGen] Already generating, skipping...');
      return;
    }

    this.isGenerating = true;
    const stage = this.determineStage(discoveryContext);
    console.log(`🎯 [ObjectionGen] Generating ${stage} objections for: ${discoveryContext.trigger}`);

    try {
      const objections = await this.callLLMForDiscoveryMoment(discoveryContext);
      
      this.currentPack = {
        discoveryContext,
        objections,
        generatedAt: Date.now(),
        isReady: true,
        stage
      };

      console.log(`✅ [ObjectionGen] Generated ${objections.length} ${stage} objections`);
      objections.forEach((obj, idx) => {
        console.log(`   ${idx + 1}. [${obj.type}] "${obj.surface.substring(0, 60)}..." (${obj.roots.length} roots)`);
      });
    } catch (error) {
      console.error('❌ [ObjectionGen] Generation failed:', error);
      this.currentPack = null;
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Determine objection stage based on what's been revealed
   */
  private determineStage(context: DiscoveryContext): ObjectionPack['stage'] {
    if (context.pricingModel) return 'pricing';
    if (context.proofPoints.length > 0) return 'proof';
    if (context.keyFeatures.length > 0) return 'features';
    if (context.productCategory) return 'category';
    return 'initial';
  }

  /**
   * Get objections if ready, otherwise null
   */
  getObjections(): GeneratedObjection[] | null {
    return this.currentPack?.isReady ? this.currentPack.objections : null;
  }

  /**
   * Check if we have objections ready
   */
  hasObjections(): boolean {
    return this.currentPack?.isReady ?? false;
  }

  /**
   * Get specific objection by type
   */
  getObjectionByType(type: GeneratedObjection['type']): GeneratedObjection | null {
    if (!this.currentPack?.isReady) return null;
    return this.currentPack.objections.find(obj => obj.type === type) || null;
  }

  /**
   * Reset for new call
   */
  reset(): void {
    this.currentPack = null;
    this.isGenerating = false;
  }

  /**
   * LLM call to generate objections for specific discovery moment
   */
  private async callLLMForDiscoveryMoment(context: DiscoveryContext): Promise<GeneratedObjection[]> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = this.buildDiscoveryObjectionPrompt(context);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at generating realistic sales objections for specific products.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    return this.parseObjections(content);
  }

  /**
   * Build prompt for discovery-moment objections
   */
  private buildDiscoveryObjectionPrompt(context: DiscoveryContext): string {
    const { trigger, triggerContent, productCategory, valueProposition, keyFeatures, pricingModel, differentiators, proofPoints } = context;

    return `The rep just revealed: **${trigger}**
"${triggerContent}"

**Context so far:**
- Product category: ${productCategory || 'Not yet revealed'}
- Value prop: ${valueProposition || 'Not yet revealed'}
- Key features: ${keyFeatures.length > 0 ? keyFeatures.join(', ') : 'Not yet revealed'}
- Pricing: ${pricingModel || 'Not yet revealed'}
- Differentiators: ${differentiators.length > 0 ? differentiators.join(', ') : 'Not yet revealed'}
- Proof points: ${proofPoints.length > 0 ? proofPoints.join(', ') : 'Not yet revealed'}

**Generate 4-6 objections tailored to THIS specific revelation.**

**Objection progression rules:**
1. Early call (only category known): Generic but realistic
   - "Not looking right now"
   - "Already have something for that"
   
2. Features revealed: Specific to those features
   - "No API integration with our CRM?"
   - "We need multi-language support"
   
3. Pricing revealed: Cost-based objections
   - "$99/user is too expensive for our team size"
   - "No annual discount?"
   
4. Proof revealed: Trust/credibility objections
   - "Those case studies aren't in our industry"
   - "Need to see more recent results"

**Requirements:**
- Match objection sophistication to what's been revealed
- Sound like real buyer concerns, not textbook objections
- Include specific details from the trigger (e.g., if pricing is $99, object to $99)
- Generate 2-4 root causes per objection:
  - At least 1 conscious root (they're aware of this concern)
  - At least 1-2 hidden roots (subconscious drivers they won't say)
- Make roots SPECIFIC to the product/context, not generic
- Resolution signals should address the hidden roots, not just surface objection

**Format as JSON:**
\`\`\`json
[
  {
    "type": "fit" | "timing" | "trust" | "cost" | "status_quo" | "authority",
    "surface": "Exact words Marcus would say (surface concern)",
    "roots": [
      {
        "id": "snake_case_id",
        "intensity": 0.0-1.0,
        "conscious": true/false,
        "description": "What's really blocking the sale"
      }
    ],
    "resolutionSignals": ["risk_reversal", "specific_proof", "gradual_rollout"],
    "severity": "minor" | "moderate" | "major",
    "satisfactionThreshold": 0.0-1.0
  }
]
\`\`\`

**Example for AI training product:**
\`\`\`json
[
  {
    "type": "cost",
    "surface": "$99/user is steep for our team size",
    "roots": [
      {
        "id": "budget_authority_limited",
        "intensity": 0.7,
        "conscious": true,
        "description": "Has to justify spend to CFO for 50-person team"
      },
      {
        "id": "feature_utilization_fear",
        "intensity": 0.8,
        "conscious": false,
        "description": "Worried team won't use AI features, making cost unjustifiable"
      },
      {
        "id": "competitor_price_anchor",
        "intensity": 0.6,
        "conscious": false,
        "description": "Saw competitor at $49/user - feels overpriced by comparison"
      }
    ],
    "resolutionSignals": ["roi_calculator", "usage_guarantee", "tiered_pricing"],
    "severity": "moderate",
    "satisfactionThreshold": 0.65
  }
]
\`\`\`

Make objections SPECIFIC to "${triggerContent}".`;
  }

  /**
   * Parse LLM response into structured objections
   */
  private parseObjections(content: string): GeneratedObjection[] {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/) || content.match(/```\n([\s\S]+?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      
      const parsed = JSON.parse(jsonString);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Expected array of objections');
      }

      // Validate structure
      return parsed.map((obj: any) => ({
        type: obj.type || 'fit',
        surface: obj.surface || obj.objection || 'Not sure this is a fit', // Support old format
        roots: obj.roots || [],
        resolutionSignals: obj.resolutionSignals || [],
        severity: obj.severity || 'moderate',
        satisfactionThreshold: obj.satisfactionThreshold || 0.6
      }));
    } catch (error) {
      console.error('Failed to parse objections:', error);
      // Fallback to generic objections
      return this.getFallbackObjections();
    }
  }

  /**
   * Fallback objections if generation fails
   */
  private getFallbackObjections(): GeneratedObjection[] {
    return [
      {
        type: 'timing',
        surface: "We're in the middle of other projects right now.",
        roots: [
          {
            id: 'bandwidth_concern',
            intensity: 0.6,
            conscious: true,
            description: 'Already stretched thin with current initiatives'
          },
          {
            id: 'change_fatigue',
            intensity: 0.7,
            conscious: false,
            description: 'Exhausted from recent changes, needs breathing room'
          }
        ],
        resolutionSignals: ['minimal_time_investment', 'gradual_rollout'],
        severity: 'moderate',
        satisfactionThreshold: 0.5
      },
      {
        type: 'fit',
        surface: "Not sure this is a fit for our team.",
        roots: [
          {
            id: 'use_case_unclear',
            intensity: 0.5,
            conscious: true,
            description: 'Doesn\'t see how it applies to their situation'
          },
          {
            id: 'team_adoption_fear',
            intensity: 0.8,
            conscious: false,
            description: 'Worried team will resist or not use it'
          }
        ],
        resolutionSignals: ['specific_use_case', 'similar_customer'],
        severity: 'moderate',
        satisfactionThreshold: 0.6
      },
      {
        type: 'trust',
        surface: "How do I know this actually works?",
        roots: [
          {
            id: 'proof_hunger',
            intensity: 0.7,
            conscious: true,
            description: 'Needs evidence before committing'
          },
          {
            id: 'vendor_burnout',
            intensity: 0.8,
            conscious: false,
            description: 'Been burned by overpromising vendors before'
          }
        ],
        resolutionSignals: ['specific_proof', 'transparent_demo', 'risk_reversal'],
        severity: 'moderate',
        satisfactionThreshold: 0.7
      }
    ];
  }
}

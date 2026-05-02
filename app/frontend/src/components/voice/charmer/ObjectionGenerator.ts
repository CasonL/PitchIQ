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

// Hidden drivers - the REAL blockers (generated once)
export interface HiddenDriver {
  id: string;
  type: 'trust' | 'risk' | 'capacity' | 'political' | 'past_trauma';
  description: string; // Core psychological blocker
  intensity: number; // 0-1, how much this blocks the sale
  triggerThemes: string[]; // What topics activate this driver (e.g., 'price', 'implementation', 'roi')
  backstory?: string; // Rich human story explaining WHY this driver exists
  revealedBackstory?: boolean; // Has the rep uncovered this story yet?
}

// Surface objection - what Marcus SAYS (accumulated over time)
export interface SurfaceObjection {
  objectionText: string; // What Marcus actually says
  linkedDriverIds: string[]; // Which hidden drivers this stems from
  triggeredBy: string; // What revelation caused this (e.g., "Rep mentioned price")
  severity: 'minor' | 'moderate' | 'major';
  consciousRoots: string[]; // What Marcus thinks is the issue
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
  
  // Progressive accumulation state
  private hiddenDrivers: HiddenDriver[] = []; // Generated ONCE at start
  private surfaceObjections: SurfaceObjection[] = []; // Accumulated over time
  private discoveryHistory: DiscoveryContext[] = []; // Track what's been revealed

  /**
   * Generate objections for a specific discovery moment
   * Progressive accumulation: hidden drivers stay constant, surface objections accumulate
   */
  async generateForDiscovery(discoveryContext: DiscoveryContext): Promise<void> {
    if (this.isGenerating) {
      console.log('⏳ [ObjectionGen] Already generating, skipping...');
      return;
    }

    this.isGenerating = true;
    this.discoveryHistory.push(discoveryContext);
    const stage = this.determineStage(discoveryContext);
    
    try {
      // FIRST DISCOVERY: Generate hidden drivers (root causes)
      if (this.hiddenDrivers.length === 0) {
        console.log(`🎯 [ObjectionGen] FIRST DISCOVERY - Generating hidden drivers`);
        this.hiddenDrivers = await this.generateHiddenDrivers(discoveryContext);
        console.log(`✅ Generated ${this.hiddenDrivers.length} hidden drivers:`);
        this.hiddenDrivers.forEach((driver, idx) => {
          console.log(`   ${idx + 1}. [${driver.type}] ${driver.description} (intensity: ${driver.intensity})`);
        });
      }
      
      // EVERY DISCOVERY: Add new surface objections linked to existing drivers
      console.log(`🎯 [ObjectionGen] Adding surface objections for: ${discoveryContext.trigger}`);
      const newObjections = await this.generateSurfaceObjections(discoveryContext, this.hiddenDrivers);
      this.surfaceObjections.push(...newObjections);
      
      console.log(`✅ Added ${newObjections.length} surface objections (total: ${this.surfaceObjections.length})`);
      newObjections.forEach((obj, idx) => {
        const drivers = obj.linkedDriverIds.map(id => 
          this.hiddenDrivers.find(d => d.id === id)?.type
        ).join(', ');
        console.log(`   ${idx + 1}. "${obj.objectionText.substring(0, 50)}..." → [${drivers}]`);
      });
      
      // Convert to old format for backwards compatibility
      const objections = this.convertToLegacyFormat();
      this.currentPack = {
        discoveryContext,
        objections,
        generatedAt: Date.now(),
        isReady: true,
        stage
      };
      
    } catch (error) {
      console.error('❌ [ObjectionGen] Generation failed:', error);
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
    this.hiddenDrivers = [];
    this.surfaceObjections = [];
    this.discoveryHistory = [];
  }
  
  /**
   * Get current hidden drivers (for debugging/coaching)
   */
  getHiddenDrivers(): HiddenDriver[] {
    return this.hiddenDrivers;
  }
  
  /**
   * Get accumulated surface objections
   */
  getSurfaceObjections(): SurfaceObjection[] {
    return this.surfaceObjections;
  }

  /**
   * Generate hidden drivers (root causes) - called ONCE on first discovery
   */
  private async generateHiddenDrivers(context: DiscoveryContext): Promise<HiddenDriver[]> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return this.getFallbackDrivers();
    }

    const prompt = `You are generating the CORE PSYCHOLOGICAL BLOCKERS for a buyer (Marcus) on a sales call.

**Context:**
- Product category: ${context.productCategory || 'Unknown'}
- Value proposition: ${context.valueProposition || 'Unknown'}
- Trigger: ${context.trigger} - "${context.triggerContent}"

**Task: Generate 2-3 HIDDEN DRIVERS (root causes) that will block this sale.**

These are NOT surface objections (what he says). These are deep psychological blockers that drive ALL his objections.

**CRITICAL: Each driver MUST include a RICH BACKSTORY - a specific human story that explains WHY this blocker exists.**

**Examples of drivers WITH backstories:**

1. Budget constraint:
   - Description: "Budget already allocated - no room for new tools"
   - Backstory: "Team was complaining about back pain. One of our guys almost quit because of it. So we spent $15k on ergonomic chairs last month. Budget's pretty much tapped out for the quarter."

2. Past trauma:
   - Description: "Burned by vendor implementation disaster"
   - Backstory: "Q4 outage last year. Our CRM went down for 3 days. Had to manually reconcile everything on spreadsheets. Took the whole team almost a full day just to get back to normal. CFO still brings it up."

3. Capacity constraint:
   - Description: "Team already overwhelmed with projects"
   - Backstory: "We're mid-implementation with Salesforce right now. Our rep, Sarah, is basically living in there trying to get it configured. She's been staying late every night this week. Can't pile anything else on the team right now."

4. Political risk:
   - Description: "Need executive buy-in for software decisions"
   - Backstory: "Our VP shut down a similar purchase last quarter. Said we're buying too many tools without proof of ROI. Now everything over $10k needs her approval, and she's... let's just say she's skeptical."

5. Trust issues:
   - Description: "Skeptical of vendor promises after bad experience"
   - Backstory: "We signed with a training platform 8 months ago. Demo looked amazing. Reality? Half the features didn't work, support was non-existent. Wasted $30k and 6 weeks trying to make it work before we cancelled."

**Requirements:**
- 2-3 drivers maximum (not 5-6, keep it focused)
- Each driver MUST have a backstory with specific details (names, numbers, timeframes)
- Backstories should feel HUMAN - like real things that happened at a real company
- Make backstories conversational (how Marcus would actually tell the story)
- Mix of types: trust issues, risk aversion, capacity constraints, political factors, past trauma
- High intensity (0.7-0.9) - these are real blockers, not minor concerns
- Include triggerThemes: which topics will activate this driver (price, implementation, roi, etc.)

**Format as JSON:**
\\\`\\\`\\\`json
[
  {
    "id": "budget_allocated_chairs",
    "type": "capacity",
    "description": "Budget already spent on urgent team needs",
    "backstory": "Team was complaining about back pain. One of our guys almost quit because of it. So we spent $15k on ergonomic chairs last month. Budget's pretty much tapped out for the quarter.",
    "intensity": 0.85,
    "triggerThemes": ["price", "budget", "cost"],
    "revealedBackstory": false
  }
]
\\\`\\\`\\\``;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert sales psychologist who understands buyer blockers.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in response');
      }

      // Parse JSON from markdown code blocks
      const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/) || content.match(/```\n([\s\S]+?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonString);

      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('❌ [HiddenDrivers] Generation failed:', error);
      return this.getFallbackDrivers();
    }
  }

  /**
   * Generate surface objections linked to existing hidden drivers
   */
  private async generateSurfaceObjections(
    context: DiscoveryContext,
    drivers: HiddenDriver[]
  ): Promise<SurfaceObjection[]> {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      return this.getFallbackSurfaceObjections(context);
    }

    const driversContext = drivers.map(d => 
      `- [${d.type}] ${d.description} (triggers on: ${d.triggerThemes.join(', ')})`
    ).join('\n');

    const prompt = `The sales rep just revealed: **${context.trigger}** - "${context.triggerContent}"

**Marcus's HIDDEN DRIVERS (core blockers that stay constant):**
${driversContext}

**Task: Generate 2-4 SURFACE OBJECTIONS that Marcus would say in response to this revelation.**

These objections should:
1. Be triggered by "${context.triggerContent}"
2. Link back to 1-2 of the hidden drivers above
3. Sound like natural buyer pushback
4. Include what Marcus THINKS is the issue (conscious) vs what's REALLY blocking him (hidden drivers)

**Example:**
Rep mentions: "Implementation takes 2 weeks"
Hidden driver: "Team overwhelmed with new tools"
Surface objection: "We don't have 2 weeks right now - team's already swamped"
Linked drivers: ["team_capacity_maxed"]
Conscious roots: ["No bandwidth for 2-week project"]

**Format as JSON:**
\`\`\`json
[
  {
    "objectionText": "Exact words Marcus would say",
    "linkedDriverIds": ["driver_id_1", "driver_id_2"],
    "triggeredBy": "${context.trigger}: ${context.triggerContent}",
    "severity": "moderate",
    "consciousRoots": ["What Marcus thinks is the problem"]
  }
]
\`\`\``;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are generating realistic buyer objections linked to psychological drivers.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in response');
      }

      const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/) || content.match(/```\n([\s\S]+?)\n```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const parsed = JSON.parse(jsonString);

      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('❌ [SurfaceObjections] Generation failed:', error);
      return this.getFallbackSurfaceObjections(context);
    }
  }

  /**
   * Convert new format back to legacy GeneratedObjection format
   * This maintains backwards compatibility with existing code
   */
  private convertToLegacyFormat(): GeneratedObjection[] {
    // Group surface objections by type
    const objectionsByType: Record<string, SurfaceObjection[]> = {};
    
    this.surfaceObjections.forEach(obj => {
      // Infer type from linked drivers
      const driver = this.hiddenDrivers.find(d => obj.linkedDriverIds.includes(d.id));
      const type = this.inferObjectionType(driver?.type, obj.objectionText);
      
      if (!objectionsByType[type]) {
        objectionsByType[type] = [];
      }
      objectionsByType[type].push(obj);
    });

    // Convert to legacy format
    const legacyObjections: GeneratedObjection[] = [];
    
    Object.entries(objectionsByType).forEach(([type, objections]) => {
      const surfaceText = objections.map(o => o.objectionText).join(' ');
      const linkedDrivers = [...new Set(objections.flatMap(o => o.linkedDriverIds))];
      
      // Build roots from drivers
      const roots: ObjectionRoot[] = linkedDrivers.map(driverId => {
        const driver = this.hiddenDrivers.find(d => d.id === driverId);
        return {
          id: driver?.id || driverId,
          intensity: driver?.intensity || 0.7,
          conscious: false, // Drivers are hidden
          description: driver?.description || 'Unknown driver'
        };
      });
      
      // Add conscious roots
      objections.forEach(obj => {
        obj.consciousRoots.forEach(root => {
          roots.push({
            id: `conscious_${Math.random().toString(36).substr(2, 9)}`,
            intensity: 0.5,
            conscious: true,
            description: root
          });
        });
      });

      legacyObjections.push({
        type: type as GeneratedObjection['type'],
        surface: surfaceText.substring(0, 200),
        roots,
        resolutionSignals: this.inferResolutionSignals(linkedDrivers),
        severity: objections[0]?.severity || 'moderate',
        satisfactionThreshold: 0.65
      });
    });

    return legacyObjections;
  }

  /**
   * Infer objection type from driver type and text
   */
  private inferObjectionType(driverType?: HiddenDriver['type'], text?: string): string {
    if (text?.toLowerCase().includes('price') || text?.toLowerCase().includes('cost') || text?.toLowerCase().includes('expensive')) {
      return 'cost';
    }
    if (text?.toLowerCase().includes('time') || text?.toLowerCase().includes('bandwidth') || text?.toLowerCase().includes('busy')) {
      return 'timing';
    }
    if (driverType === 'trust' || driverType === 'past_trauma') {
      return 'trust';
    }
    if (driverType === 'capacity') {
      return 'timing';
    }
    return 'fit';
  }

  /**
   * Infer resolution signals from drivers
   */
  private inferResolutionSignals(driverIds: string[]): string[] {
    const signals = new Set<string>();
    
    driverIds.forEach(id => {
      const driver = this.hiddenDrivers.find(d => d.id === id);
      if (driver?.type === 'trust' || driver?.type === 'past_trauma') {
        signals.add('specific_proof');
        signals.add('risk_reversal');
      }
      if (driver?.type === 'capacity') {
        signals.add('minimal_time_investment');
        signals.add('gradual_rollout');
      }
      if (driver?.type === 'political') {
        signals.add('executive_validation');
        signals.add('peer_proof');
      }
    });

    return Array.from(signals);
  }

  /**
   * Fallback drivers if LLM fails
   */
  private getFallbackDrivers(): HiddenDriver[] {
    return [
      {
        id: 'vendor_trust_issues',
        type: 'trust',
        description: 'Been burned by vendors before - needs strong proof',
        backstory: 'We signed with a CRM vendor last year. Demo looked great. But once we were live, half the integrations broke. Support took days to respond. Cost us $40k and 3 months before we finally pulled the plug.',
        intensity: 0.75,
        triggerThemes: ['proof', 'roi', 'implementation', 'vendor_credibility'],
        revealedBackstory: false
      },
      {
        id: 'team_capacity_maxed',
        type: 'capacity',
        description: 'Team already overwhelmed - no bandwidth for new tools',
        backstory: "We're already mid-rollout with Salesforce. Our ops manager, Lisa, has been working nights and weekends just trying to get it configured. Can't pile more on the team right now.",
        intensity: 0.8,
        triggerThemes: ['implementation', 'training', 'time_commitment'],
        revealedBackstory: false
      }
    ];
  }

  /**
   * Fallback surface objections if LLM fails
   */
  private getFallbackSurfaceObjections(context: DiscoveryContext): SurfaceObjection[] {
    return [
      {
        objectionText: "Not sure this is a fit for our team.",
        linkedDriverIds: ['vendor_trust_issues'],
        triggeredBy: `${context.trigger}: ${context.triggerContent}`,
        severity: 'moderate',
        consciousRoots: ['Unclear how it applies to us']
      }
    ];
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

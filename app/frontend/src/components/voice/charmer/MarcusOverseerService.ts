/**
 * MarcusOverseerService.ts
 * 
 * SCENARIO ARCHITECT for Marcus calls.
 * 
 * This is NOT a rule enforcer. This is a dungeon master that:
 * - Generates specific pain points Marcus can reveal (if user asks right questions)
 * - Injects red herrings to test discovery skills
 * - Creates hidden motivations beyond "I'm busy"
 * - Designs learning challenges optimized for user growth, not call success
 * 
 * KEY DESIGN PRINCIPLES:
 * - Runs parallel (non-blocking) to architect scenarios dynamically
 * - Generates content for Marcus to use, not rules to follow
 * - Optimizes for LEARNING, not winning
 * - Can be completely disabled without touching other code
 */

import { 
  ScenarioArchitecture,
  DynamicPainPoint,
  HiddenMotivation,
  LearningChallenge,
  OverseerAnalysisRequest, 
  OverseerCache,
  PainPointType
} from './OverseerTypes';

export class MarcusOverseerService {
  private cache: OverseerCache;
  private enabled: boolean;
  private apiEndpoint: string;
  
  constructor(enabled: boolean = true) {
    this.enabled = enabled;
    this.apiEndpoint = '/api/openai/chat';
    this.cache = {
      lastArchitecture: null,
      pendingAnalysis: null,
      lastUpdateTimestamp: 0,
      establishedPainPoints: [],
      revealedMotivations: []
    };
  }
  
  /**
   * Start parallel scenario architecture (non-blocking)
   * Returns immediately, analysis runs in background
   */
  startAnalysis(request: OverseerAnalysisRequest): void {
    if (!this.enabled) return;
    
    // Don't start new analysis if one is already pending
    if (this.cache.pendingAnalysis) {
      return;
    }
    
    console.log('🎭 [Overseer] Architecting scenario dynamics...');
    
    // Start async analysis
    this.cache.pendingAnalysis = this.performAnalysis(request)
      .then(architecture => {
        console.log('🎭 [Overseer] Architecture ready:', architecture.whyThisTeaches);
        this.cache.lastArchitecture = architecture;
        this.cache.lastUpdateTimestamp = Date.now();
        
        // Persist pain points across turns
        if (architecture.painPoints.length > 0) {
          this.cache.establishedPainPoints = architecture.painPoints;
        }
        
        this.cache.pendingAnalysis = null;
        return architecture;
      })
      .catch(error => {
        console.error('🎭 [Overseer] Architecture failed:', error);
        this.cache.pendingAnalysis = null;
        // Return fallback architecture on error
        return this.createFallbackArchitecture(request);
      });
  }
  
  /**
   * Get scenario architecture for Marcus (non-blocking)
   * Returns cached architecture if analysis is still pending
   */
  getArchitecture(): ScenarioArchitecture | null {
    if (!this.enabled) return null;
    return this.cache.lastArchitecture;
  }
  
  /**
   * Get scenario architecture formatted for Marcus's prompt
   * This gives Marcus CONTENT to use, not RULES to follow
   */
  getPromptGuidance(): string {
    const arch = this.getArchitecture();
    if (!arch) return '';
    
    let guidance = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎭 ADAPTIVE SCENARIO ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOU ARE MARCUS:
→ Demographics: ${arch.marcusContext.demographics.join(', ')}
→ Lifestyle: ${arch.marcusContext.lifestyle.join(', ')}

**YOUR CURRENT SITUATION (SHARE THIS OPENLY):**
${arch.marcusContext.currentSolution} (${arch.marcusContext.satisfactionLevel})

**CRITICAL: When asked about your current setup:**
- ANSWER BRIEFLY - match the question's scope, don't dump everything
  * "Are you using any training?" → "Yeah, I'm using Gong right now"
  * "What are you using?" → "Gong for call recording"
  * "How's it working?" → "Pretty good. Team sees improvements every quarter"
- MENTION SPECIFIC TOOLS/VENDORS BY NAME (real people don't speak in vague abstractions)
- Let THEM ask follow-ups if they want more detail
- DON'T volunteer the hidden problems below - they require discovery

THEY'RE SELLING: ${arch.marcusContext.detectedProduct}
→ Your direct need: ${arch.marcusContext.directNeed.toUpperCase()}
→ Why: ${arch.marcusContext.directNeedReason}

`;

    // Add indirect pathways (the discovery rewards)
    if (arch.marcusContext.indirectPathways.length > 0) {
      guidance += `\nINDIRECT OPPORTUNITIES (if they discover):\n`;
      arch.marcusContext.indirectPathways.forEach((pathway, idx) => {
        guidance += `${idx + 1}. Your ${pathway.relationship}: ${pathway.context}\n`;
        guidance += `   Pain: ${pathway.painPoint}\n`;
        guidance += `   Value: ${pathway.opportunityValue}\n`;
      });
    }

    // Add emotional context
    if (arch.marcusContext.emotionalHooks.length > 0) {
      guidance += `\nEMOTIONAL CONTEXT:\n→ ${arch.marcusContext.emotionalHooks.join('\n→ ')}\n`;
    }

    guidance += `\nWHAT JUST HAPPENED:\n→ ${arch.whatUserJustDid}\n\nWHAT YOU SHOULD DO:\n→ ${arch.whatMarcusShouldDo}\n\nWHY (Learning Design):\n→ ${arch.whyThisTeaches}\n\n`;

    // Add pain points Marcus can reveal
    if (arch.painPoints.length > 0) {
      guidance += `\n🔒 HIDDEN PROBLEMS (GUARD THESE - Only reveal when triggered):\n`;
      guidance += `Don't volunteer these. You seem satisfied on the surface. These only come out if they ask the RIGHT questions.\n`;
      arch.painPoints.forEach((pp, idx) => {
        guidance += `\n${idx + 1}. [${pp.type.toUpperCase()}] ${pp.category}:\n`;
        guidance += `   Surface response: "${pp.surfaceStatement}"\n`;
        guidance += `   Hidden truth: "${pp.deeperTruth}"\n`;
        if (pp.emotionalContext) {
          guidance += `   💭 Emotional layer: ${pp.emotionalContext}\n`;
        }
        guidance += `   Only reveal if: ${pp.triggerCondition}\n`;
        guidance += `   This tests: ${pp.learningTest}\n`;
      });
      guidance += `\nDon't make it easy. Real prospects don't volunteer pain they're not consciously aware of or admit to strangers.\n`;
    }

    // Add blocking conditions (objections, commitments that prevent moving forward)
    if (arch.blockingConditions && arch.blockingConditions.length > 0) {
      guidance += `\n🚫 BLOCKING CONDITIONS (Your objections/commitments):\n`;
      arch.blockingConditions.forEach((block, idx) => {
        guidance += `\n${idx + 1}. [${block.type}] ${block.blocker}\n`;
        guidance += `   How to express: ${block.howToExpress}\n`;
        guidance += `   Emotional tone: ${block.emotionalTone}\n`;
        if (block.canBeOvercome) {
          guidance += `   Can overcome? ${block.canBeOvercome}\n`;
        }
      });
    }

    // Add hidden motivation
    if (arch.hiddenMotivation) {
      guidance += `\nHIDDEN MOTIVATION (your real resistance):\n`;
      guidance += `→ Real reason: ${arch.hiddenMotivation.motivation}\n`;
      guidance += `→ Subtle signals you can drop: ${arch.hiddenMotivation.signalsToReveal.join(', ')}\n`;
      guidance += `→ How they uncover it: ${arch.hiddenMotivation.howToUncover}\n`;
      guidance += `→ Reward if discovered: "${arch.hiddenMotivation.rewardForDiscovery}"\n`;
    }

    // Add current learning challenge
    if (arch.currentChallenge) {
      guidance += `\nCURRENT LEARNING CHALLENGE:\n`;
      guidance += `→ Type: ${arch.currentChallenge.challengeType}\n`;
      guidance += `→ Challenge: ${arch.currentChallenge.description}\n`;
      guidance += `→ If they do it right: ${arch.currentChallenge.correctResponse}\n`;
      guidance += `→ If they do it poorly: ${arch.currentChallenge.consequence}\n`;
    }

    // Add assumption traps and discovery rewards
    if (arch.assumptionTraps.length > 0) {
      guidance += `\nASSUMPTION TRAPS (punish lazy selling):\n`;
      arch.assumptionTraps.forEach(trap => guidance += `→ ${trap}\n`);
    }

    if (arch.discoveryRewards.length > 0) {
      guidance += `\nDISCOVERY REWARDS (if they ask good questions):\n`;
      arch.discoveryRewards.forEach(reward => guidance += `→ ${reward}\n`);
    }

    guidance += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOU ARE THIS MARCUS. Use this context to create a learning experience.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    return guidance;
  }
  
  /**
   * Core analysis logic (runs async in background)
   * Generates scenario architecture with pain points, red herrings, and learning challenges
   */
  private async performAnalysis(request: OverseerAnalysisRequest): Promise<ScenarioArchitecture> {
    const prompt = this.buildAnalysisPrompt(request);
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a sales training scenario architect. Generate learning challenges and pain points in valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.8,
          max_tokens: 600
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || '{}';
      
      // Strip markdown code blocks if present (LLM sometimes wraps JSON)
      content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Parse JSON response with robust error handling
      let analysis;
      try {
        analysis = JSON.parse(content);
      } catch (parseError) {
        console.warn('🎭 [Overseer] Initial JSON parse failed, attempting fixes...', parseError);
        
        // Try to extract JSON object from content (in case LLM added extra text)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            analysis = JSON.parse(jsonMatch[0]);
            console.log('🎭 [Overseer] Successfully extracted JSON from response');
          } catch (extractError) {
            console.error('🎭 [Overseer] JSON extraction also failed:', extractError);
            throw parseError; // Throw original error for catch block below
          }
        } else {
          throw parseError;
        }
      }
      
      return {
        marcusContext: analysis.marcusContext || {
          detectedProduct: "Unknown product",
          productCategory: "service",
          demographics: ["40s", "runs small consulting firm", "busy professional"],
          lifestyle: ["time-conscious", "pragmatic"],
          directNeed: 'low',
          directNeedReason: "Current solution works fine",
          indirectPathways: [],
          currentSolution: "Status quo",
          satisfactionLevel: 'satisfied',
          emotionalHooks: []
        },
        painPoints: analysis.painPoints || [],
        hiddenMotivation: analysis.hiddenMotivation || {
          motivation: "Skeptical of salespeople from past experiences",
          signalsToReveal: ["short responses", "defensive tone"],
          howToUncover: "Build genuine rapport and ask about challenges",
          rewardForDiscovery: "I got burned by a vendor last year"
        },
        currentChallenge: analysis.currentChallenge || null,
        nextChallenge: analysis.nextChallenge || "Test if they can build rapport",
        whatUserJustDid: analysis.whatUserJustDid || "User spoke",
        whatMarcusShouldDo: analysis.whatMarcusShouldDo || "Give short response",
        whyThisTeaches: analysis.whyThisTeaches || "Tests basic engagement",
        assumptionTraps: analysis.assumptionTraps || ["Marcus needs this product"],
        discoveryRewards: analysis.discoveryRewards || ["Understanding Marcus's actual situation"],
        timestamp: Date.now(),
        confidence: analysis.confidence || 0.7
      };
      
    } catch (error) {
      console.error('🎭 [Overseer] Analysis error:', error);
      return this.createFallbackArchitecture(request);
    }
  }
  
  /**
   * Build scenario architecture prompt with ADAPTIVE PRODUCT DETECTION
   */
  private buildAnalysisPrompt(request: OverseerAnalysisRequest): string {
    const lastFewExchanges = request.conversationHistory.slice(-6);
    const conversationText = lastFewExchanges
      .map(msg => `${msg.role === 'user' ? 'Salesperson' : 'Marcus'}: ${msg.content}`)
      .join('\n');
    
    const existingContext = this.cache.lastArchitecture?.marcusContext
      ? `\n\nEXISTING MARCUS CONTEXT (maintain consistency):\nProduct: ${this.cache.lastArchitecture.marcusContext.detectedProduct}\nDemographics: ${this.cache.lastArchitecture.marcusContext.demographics.join(', ')}`
      : '';
    
    const existingPainPoints = this.cache.establishedPainPoints.length > 0
      ? `\nPain points established: ${this.cache.establishedPainPoints.map(pp => `- ${pp.surfaceStatement}`).join(', ')}`
      : '';
    
    return `You are a SCENARIO ARCHITECT designing a learning experience for a sales trainee.

Your REVOLUTIONARY CAPABILITY: DETECT what the user is selling from their pitch, then GENERATE a Marcus persona that creates natural learning pathways.

CONVERSATION SO FAR:
${conversationText}

CURRENT STATE:
- Exchange count: ${request.exchangeCount}
- Marcus resistance: ${request.currentResistance}/10
- Phase: ${request.currentPhase}
- Difficulty: ${request.difficulty || 'medium'}${existingContext}${existingPainPoints}

**DIFFICULTY CALIBRATION (CRITICAL):**
${request.difficulty === 'easy' ? `
EASY MODE (50% winnable prospects):
- directNeed should be MEDIUM or HIGH (50% chance)
- Generate scenarios where the product is a good fit
- Marcus should be a reachable prospect with the right technique
- Pain should be accessible through solid discovery
` : request.difficulty === 'hard' ? `
HARD MODE (20% winnable, 50% qualify-outs):
- directNeed should be NONE or LOW (80% chance)
- Most scenarios should be dead-ends (mirrors real prospecting)
- Marcus doesn't need this product directly (assumption trap)
- Even if pain exists, budget/timing/commitment blockers likely
- Tests ability to qualify out gracefully and save time
` : `
MEDIUM MODE (40% winnable):
- directNeed should vary: NONE to HIGH with balanced distribution
- Mix of winnable and qualify-out scenarios
- Requires strong discovery technique to uncover fit
- Hidden pathways more common than direct need
`}

YOUR TASK: Generate Marcus's persona and scenario architecture in this EXACT JSON format:

{
  "marcusContext": {
    "detectedProduct": "What the user is selling (e.g., 'premium bath towels for plus-size people')",
    "productCategory": "physical product|service|software|consulting",
    "demographics": ["6'2\", 280lbs", "married", "40s", "runs small consulting firm"],
    "lifestyle": ["busy professional", "travels often", "health conscious"],
    "directNeed": "none|low|medium|high",
    "directNeedReason": "Why Marcus does/doesn't need this (e.g., 'Has standard towels that barely fit')",
    "indirectPathways": [
      {
        "relationship": "sister|wife|colleague|friend",
        "context": "Sister lives 25 min from recycling center",
        "painPoint": "Complains about the drive every week",
        "opportunityValue": "Could save her 2 hours/week"
      }
    ],
    "currentSolution": "LAYERED description with SPECIFIC tools/vendors. Include: (1) What Marcus uses with concrete names, (2) Surface-level satisfaction statement, (3) What seems to be working. Example: 'Gong for call recording and quarterly workshops with consultants. Team sees decent improvements every quarter, then plateaus. Happy with overall sales performance.' The hidden problems go in painPoints, NOT here.",
    "satisfactionLevel": "very satisfied|satisfied|neutral|frustrated",
    "emotionalHooks": ["self-conscious about size", "guilty about not helping sister"]
  },
  "painPoints": [
    {
      "type": "hidden",
      "category": "business",
      "surfaceStatement": "Things are going pretty well overall",
      "deeperTruth": "We have a few all-stars but most of the team is mediocre to actively bad",
      "emotionalContext": "You feel stress because the company is not cash abundant right now",
      "triggerCondition": "If user asks about team performance distribution or individual results",
      "learningTest": "Tests if they dig beyond surface satisfaction into actual performance data"
    },
    {
      "type": "hidden",
      "category": "strategic",
      "surfaceStatement": "Team's doing fine, no major issues",
      "deeperTruth": "Turnover is killing us - we lose 3-4 reps a year and training costs are brutal",
      "emotionalContext": "You feel anxious about this - every time you hire someone, you wonder if they'll still be here in 6 months",
      "triggerCondition": "If user asks about retention, onboarding costs, or team stability",
      "learningTest": "Tests consultative discovery - finding pain beneath satisfaction"
    }
  ],
  "blockingConditions": [
    {
      "type": "timing|budget|commitment|authority",
      "blocker": "Already trying a sales training program with consultants, roleplays, workshops - costs 2k",
      "emotionalTone": "mild annoyance|neutral|firm",
      "howToExpress": "You're not willing to try anything new until this program finishes",
      "canBeOvercome": "true|false - If true, explain what would change your mind"
    }
  ],
  "hiddenMotivation": {
    "motivation": "Marcus's REAL reason for resistance (creative, not just 'busy')",
    "signalsToReveal": ["subtle hint 1", "subtle hint 2"],
    "howToUncover": "What user needs to do",
    "rewardForDiscovery": "What Marcus shares if discovered"
  },
  "currentChallenge": {
    "challengeType": "discovery_trap|pitch_too_early|assumption_trap|listening_test",
    "description": "What makes this challenging",
    "correctResponse": "What good technique looks like",
    "poorResponse": "What bad technique looks like",
    "consequence": "How Marcus reacts to poor technique"
  },
  "nextChallenge": "What's coming next",
  "whatUserJustDid": "Analysis of their action",
  "whatMarcusShouldDo": "Guidance for Marcus",
  "whyThisTeaches": "Learning objective",
  "assumptionTraps": ["Marcus has big budget", "Marcus's company needs this"],
  "discoveryRewards": ["Sister needs the service", "Marcus is self-conscious about issue"],
  "confidence": 0-1
}

CRITICAL INSTRUCTIONS:

1. DETECT THE PRODUCT from conversation:
   - If user said "premium bath towels for plus-size people" → Generate Marcus as larger guy
   - If user said "recycling pickup service" → Marcus lives in apartment (has recycling) BUT sister lives far from center
   - If user said "lingerie" → Marcus could surprise his wife for anniversary
   - Adapt Marcus's demographics/lifestyle to CREATE PATHWAYS

2. CREATE ASSUMPTION TRAPS:
   - Marcus should have LOW direct need (tests lazy sellers who pitch immediately)
   - Example: Recycling service? Marcus's building has bins (assumption trap)
   - BUT sister lives 25 min from center (discovery reward)

3. DESIGN INDIRECT PATHWAYS:
   - Marcus doesn't need it... but sister/wife/colleague does
   - User must DISCOVER this through good questioning
   - Rewards consultative selling

4. GENERATE CREATIVE CONTEXT:
   - Marcus should feel REAL and relatable
   - Demographics match product opportunity (selling towels? Marcus is bigger guy)
   - Emotional hooks create teachable moments

5. LEARNING DESIGN:
   - Assumption traps punish pitch-first sellers
   - Discovery rewards for consultative sellers
   - Hidden motivations beyond "busy" or "budget"

Return ONLY valid JSON, no other text.`;
  }
  
  /**
   * Fallback architecture when analysis fails or hasn't completed
   */
  private createFallbackArchitecture(request: OverseerAnalysisRequest): ScenarioArchitecture {
    // Simple heuristic-based fallback
    const isEarly = request.exchangeCount <= 3;
    const isPitching = request.lastUserMessage.length > 100;
    
    return {
      marcusContext: {
        detectedProduct: "Unknown product (early conversation)",
        productCategory: "service",
        demographics: ["40s", "runs small consulting firm", "busy professional"],
        lifestyle: ["time-conscious", "values efficiency"],
        directNeed: 'low',
        directNeedReason: "Current solution works adequately",
        indirectPathways: [],
        currentSolution: "Status quo",
        satisfactionLevel: 'satisfied',
        emotionalHooks: []
      },
      painPoints: this.cache.establishedPainPoints.length > 0 
        ? this.cache.establishedPainPoints
        : [
            {
              type: 'real' as PainPointType,
              category: 'business',
              surfaceStatement: "Things are going okay",
              deeperTruth: "We could definitely improve our lead generation",
              triggerCondition: "if user asks about business challenges",
              learningTest: "open-ended discovery questions"
            }
          ],
      hiddenMotivation: {
        motivation: "Skeptical of salespeople due to bad past experiences",
        signalsToReveal: ["short responses", "defensive tone"],
        howToUncover: "Build genuine rapport and ask about their challenges",
        rewardForDiscovery: "I got burned by a vendor last year, so I'm cautious"
      },
      currentChallenge: isPitching ? {
        challengeType: 'pitch_too_early',
        description: "User is pitching without doing discovery",
        correctResponse: "Step back and ask questions about their situation",
        poorResponse: "Keep pitching features without context",
        consequence: "Marcus becomes more resistant and defensive"
      } : null,
      nextChallenge: isEarly ? "Establish purpose and build initial rapport" : "Uncover real pain points",
      whatUserJustDid: isPitching ? "User is pitching" : "User is engaging",
      whatMarcusShouldDo: isPitching ? "Give short, skeptical response" : "Answer briefly",
      whyThisTeaches: isPitching ? "Tests if they can recognize and recover from pitching too early" : "Tests basic engagement",
      assumptionTraps: ["Marcus needs this product", "Marcus has budget allocated"],
      discoveryRewards: ["Understanding Marcus's actual situation"],
      timestamp: Date.now(),
      confidence: 0.5
    };
  }
  
  /**
   * Enable/disable the overseer
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`🔮 [Overseer] ${enabled ? 'Enabled' : 'Disabled'}`);
  }
  
  /**
   * Check if overseer is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
  
  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache = {
      lastArchitecture: null,
      pendingAnalysis: null,
      lastUpdateTimestamp: 0,
      establishedPainPoints: [],
      revealedMotivations: []
    };
    console.log('🎭 [Overseer] Cache cleared');
  }
}

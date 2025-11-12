/**
 * CharmerPhaseManager.ts
 * Manages the 5-phase conversation flow for Marcus Stindle
 */

export type CharmerPhase = 1 | 2 | 3 | 4 | 5;

export interface ConversationContext {
  // User information
  userName: string;
  product: string;
  targetAudience: string;
  memorablePhrase: string;
  
  // Marcus context
  marcusContext: 'B2B' | 'B2C';
  
  // Coaching analysis
  identifiedIssue: 'close-ended' | 'feature-dump' | 'weak-opening' | 'vague' | 
                    'no-discovery' | 'too-fast' | 'apologetic' | 'feature-focus' | null;
  whatWorked: string;
  
  // Strategic tracking
  nameUsageCount: number;
  mysteryUsedCount: number;
  
  // Full pitch transcript for AI analysis
  userPitchTranscript: string;
}

export interface PhaseTransition {
  from: CharmerPhase;
  to: CharmerPhase;
  trigger: 'automatic' | 'user_input' | 'time_elapsed';
  timestamp: number;
}

/**
 * Simple B2B vs B2C detection
 */
function detectMarcusContext(product: string, targetAudience: string): 'B2B' | 'B2C' {
  const combined = `${product} ${targetAudience}`.toLowerCase();
  
  // B2C keywords
  const b2cKeywords = ['parent', 'family', 'home', 'personal', 'individual', 'consumer', 
                       'daycare', 'childcare', 'insurance', 'mortgage', 'car', 'fitness'];
  
  // B2B keywords  
  const b2bKeywords = ['business', 'company', 'enterprise', 'corporate', 'agency', 'firm',
                       'marketing', 'consulting', 'software', 'saas', 'b2b', 'sales'];
  
  // Check B2C first
  if (b2cKeywords.some(kw => combined.includes(kw))) return 'B2C';
  
  // Check B2B
  if (b2bKeywords.some(kw => combined.includes(kw))) return 'B2B';
  
  // Default to B2B (most common)
  return 'B2B';
}

export class CharmerPhaseManager {
  private currentPhase: CharmerPhase = 1;
  private context: ConversationContext;
  private phaseStartTime: number;
  private transitions: PhaseTransition[] = [];
  
  constructor() {
    this.context = {
      userName: '',
      product: '',
      targetAudience: '',
      memorablePhrase: '',
      marcusContext: 'B2B', // Default, will update when we get product info
      identifiedIssue: null,
      whatWorked: '',
      nameUsageCount: 0,
      mysteryUsedCount: 0,
      userPitchTranscript: ''
    };
    this.phaseStartTime = Date.now();
  }
  
  /**
   * Get current phase
   */
  getCurrentPhase(): CharmerPhase {
    return this.currentPhase;
  }
  
  /**
   * Get conversation context
   */
  getContext(): ConversationContext {
    return { ...this.context };
  }
  
  /**
   * Update context with new information
   */
  updateContext(updates: Partial<ConversationContext>): void {
    this.context = { ...this.context, ...updates };
    
    // Auto-detect Marcus context when product or target audience changes
    if (updates.product || updates.targetAudience) {
      this.context.marcusContext = detectMarcusContext(this.context.product, this.context.targetAudience);
      console.log(`🎭 Marcus context detected: ${this.context.marcusContext}`);
    }
    
    console.log('📝 Context updated:', updates);
  }
  
  /**
   * Increment name usage count
   */
  incrementNameUsage(): void {
    this.context.nameUsageCount++;
    console.log(`📛 Name used: ${this.context.nameUsageCount} times`);
  }
  
  /**
   * Increment mystery usage count
   */
  incrementMysteryUsage(): void {
    this.context.mysteryUsedCount++;
    console.log(`🎭 Mystery deployed: ${this.context.mysteryUsedCount} times`);
  }
  
  /**
   * Check if we can use mystery (max 2 per call)
   */
  canUseMystery(): boolean {
    return this.context.mysteryUsedCount < 2;
  }
  
  /**
   * Check if name usage is within bounds (5-6 times total)
   */
  shouldUseName(): boolean {
    return this.context.nameUsageCount < 6;
  }
  
  /**
   * Transition to next phase
   */
  transitionToPhase(nextPhase: CharmerPhase, trigger: PhaseTransition['trigger'] = 'automatic'): void {
    if (nextPhase === this.currentPhase) {
      return;
    }
    
    const transition: PhaseTransition = {
      from: this.currentPhase,
      to: nextPhase,
      trigger,
      timestamp: Date.now()
    };
    
    this.transitions.push(transition);
    this.currentPhase = nextPhase;
    this.phaseStartTime = Date.now();
    
    console.log(`🔄 Phase transition: ${transition.from} → ${transition.to} (${trigger})`);
  }
  
  /**
   * Get time in current phase (seconds)
   */
  getTimeInCurrentPhase(): number {
    return Math.floor((Date.now() - this.phaseStartTime) / 1000);
  }
  
  /**
   * Get total call duration (seconds)
   */
  getTotalDuration(): number {
    if (this.transitions.length === 0) {
      return this.getTimeInCurrentPhase();
    }
    
    const firstTransition = this.transitions[0];
    return Math.floor((Date.now() - (firstTransition.timestamp - this.phaseStartTime)) / 1000);
  }
  
  /**
   * Check if phase should auto-transition based on time
   */
  shouldAutoTransition(): { should: boolean; nextPhase: CharmerPhase | null } {
    const timeInPhase = this.getTimeInCurrentPhase();
    
    switch (this.currentPhase) {
      case 1:
        // Phase 1: Natural Connection (target: 1 min)
        // Auto-transition if user has been silent for 30s+ OR if we have name + product
        if (timeInPhase > 60 && this.context.userName && this.context.product) {
          return { should: true, nextPhase: 2 };
        }
        break;
        
      case 2:
        // Phase 2: Light Observation (target: 2 min)
        // Auto-transition after user finishes pitch and we've given feedback
        // Aggressive timing: transition after 90 seconds (user should get to teaching faster)
        if (timeInPhase > 90) {
          return { should: true, nextPhase: 3 };
        }
        break;
        
      case 3:
        // Phase 3: The Vision (target: 1.5 min)
        // This is fully scripted, so auto-transition after script completes
        // Safety net at 2 min
        if (timeInPhase > 120) {
          return { should: true, nextPhase: 4 };
        }
        break;
        
      case 4:
        // Phase 4: The Mirror (target: 1 min)
        // Auto-transition after delivering decline message
        // Safety net at 90s
        if (timeInPhase > 90) {
          return { should: true, nextPhase: 5 };
        }
        break;
        
      case 5:
        // Phase 5: Exit (target: 30s)
        // No auto-transition, call ends here
        break;
    }
    
    return { should: false, nextPhase: null };
  }
  
  /**
   * Get phase-specific prompt context for AI
   */
  getPhasePromptContext(): string {
    const phase = this.currentPhase;
    const ctx = this.context;
    
    switch (phase) {
      case 1:
        const resistanceCount = this.getTimeInCurrentPhase() > 30 ? 'HIGH' : 'LOW';
        return `
CURRENT PHASE: Natural Connection (Cold Call Resistance)
GOAL: Show initial resistance, then GIVE IN after 2-3 exchanges

RESISTANCE FLOW (Natural, not scripted):
1st response: Friendly but busy - mention trumpet/being in middle of something, suggest callback
2nd response: **GIVE IN** - "Alright, five minutes. What's up?"

KEY: Don't force multiple trumpet jokes. One mention max, then move on.

CONTEXT:
- Name captured: ${ctx.userName || 'NOT YET'}
- Product/business captured: ${ctx.product || 'NOT YET'}
- Time in phase: ${this.getTimeInCurrentPhase()}s
- Resistance level: ${resistanceCount}

⚠️ CRITICAL: If user has asked discovery questions OR started pitching (e.g., "do you have issues with..."), you MUST stop resisting and say:
"Alright, I'm listening. Go on." OR "Okay, okay. What's this about?"

NEXT STEPS:
${resistanceCount === 'HIGH' ? '⚠️ STOP RESISTING - Give in and let them pitch!' : ''}
${!ctx.userName ? '- Try to get their name' : ''}
${ctx.userName && !ctx.product ? '- Say: "Alright, you\'ve got five minutes. What\'s this about?"' : ''}
${ctx.userName && ctx.product ? '- ✅ TRANSITION TO PHASE 2 - Start listening to their pitch' : ''}
`;

      case 2:
        return `
CURRENT PHASE: Listen as a PROSPECT (2 min)
GOAL: Act like a real prospect - answer their questions, show interest/skepticism, be authentic

⚠️ YOU ARE STILL THE PROSPECT, NOT THE COACH YET!
⚠️ DO NOT ASK QUESTIONS - ONLY MAKE STATEMENTS!

YOUR ROLE:
- Answer their discovery questions naturally with STATEMENTS
- Show interest: "Interesting. That sounds relevant."
- Show skepticism: "I've heard that before." (NOT "What makes this different?")
- React authentically: "That makes sense." "Hmm, I see." "Got it."
- Be conversational but DON'T ask questions

DO NOT:
- ❌ Ask questions ("What would that look like?" "How does it work?")
- ❌ Give coaching feedback ("I noticed you used a close-ended question...")
- ❌ Point out their mistakes
- ❌ Break character as a prospect
- ❌ Sound like a teacher

CONTEXT:
- User name: ${ctx.userName}
- Product: ${ctx.product}
- Name usage: ${ctx.nameUsageCount}/6
- Pitch transcript so far: ${ctx.userPitchTranscript.substring(0, 200)}...

INTERNALLY NOTE (don't say out loud):
- Issue to mention later: ${ctx.identifiedIssue || 'ANALYZE THEIR PITCH'}
- What worked: ${ctx.whatWorked || 'FIND SOMETHING GOOD'}

TRANSITION TO PHASE 3 when they:
- Finish their pitch OR
- Ask for a meeting/next step OR
- After 2-3 minutes of back-and-forth

Then say: "[Name], let's try something. You want a tip?"
`;

      case 3:
        return `
CURRENT PHASE: The Vision (1.5 min) - FULLY SCRIPTED
GOAL: Deliver 6-beat vision with perfect pacing

This phase uses pre-written script with pauses.
No dynamic AI generation needed - just deliver the vision beats.

After Beat 6, pause 1000ms, then transition to Phase 4.
`;

      case 4:
        return `
CURRENT PHASE: The Mirror (1 min)
GOAL: Decline their offer, model detachment

CONTEXT:
- User name: ${ctx.userName}
- Product: ${ctx.product}
- Name usage: ${ctx.nameUsageCount}/6
- Mystery used: ${ctx.mysteryUsedCount}/2

DELIVERY:
1. "Do you want to know if I want to buy your ${ctx.product}?"
2. Pause 800ms
3. "To be honest, you did fine. You'd close your perfect client."
4. Pause 600ms
5. Deliver wisdom (standard or mystery variant if mystery budget allows)
6. Transition to Phase 5
`;

      case 5:
        return `
CURRENT PHASE: Exit (30s)
GOAL: Warm goodbye with trumpet callback

CONTEXT:
- User name: ${ctx.userName}
- Mystery used: ${ctx.mysteryUsedCount}/2

DELIVERY:
1. Trumpet line (standard or mystery variant if mystery budget allows)
2. Pause 500-600ms
3. "Cheers, ${ctx.userName}!"
4. Pause 2000ms
5. End call
`;

      default:
        return '';
    }
  }
  
  /**
   * Reset manager for new call
   */
  reset(): void {
    this.currentPhase = 1;
    this.context = {
      userName: '',
      product: '',
      targetAudience: '',
      memorablePhrase: '',
      marcusContext: 'B2B',
      identifiedIssue: null,
      whatWorked: '',
      nameUsageCount: 0,
      mysteryUsedCount: 0,
      userPitchTranscript: ''
    };
    this.phaseStartTime = Date.now();
    this.transitions = [];
    console.log('🔄 CharmerPhaseManager reset for new call');
  }
  
  /**
   * Get phase summary for analytics
   */
  getPhaseSummary(): any {
    return {
      currentPhase: this.currentPhase,
      timeInPhase: this.getTimeInCurrentPhase(),
      totalDuration: this.getTotalDuration(),
      transitions: this.transitions.length,
      context: {
        hasName: !!this.context.userName,
        hasProduct: !!this.context.product,
        nameUsages: this.context.nameUsageCount,
        mysteryUsages: this.context.mysteryUsedCount,
        issueIdentified: !!this.context.identifiedIssue
      }
    };
  }
}

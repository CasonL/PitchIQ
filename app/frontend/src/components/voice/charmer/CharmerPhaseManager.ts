/**
 * CharmerPhaseManager.ts
 * Manages the 5-phase conversation flow for Marcus Stindle
 */

export type CharmerPhase = 'prospect' | 'coach' | 'exit';

export interface ConversationContext {
  // User information
  userName: string;
  userGender: 'male' | 'female' | 'unknown';
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
  private currentPhase: CharmerPhase = 'prospect';
  private context: ConversationContext;
  private phaseStartTime: number;
  private transitions: PhaseTransition[] = [];
  
  constructor() {
    this.context = {
      userName: '',
      userGender: 'unknown',
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
   * NO AUTO-TRANSITIONS TO COACH MODE - only explicit invitations
   */
  shouldAutoTransition(): { should: boolean; nextPhase: CharmerPhase | null } {
    // No automatic transitions - Marcus stays in Prospect mode until explicitly invited
    return { should: false, nextPhase: null };
  }
  
  /**
   * Get phase-specific prompt context for AI
   */
  getPhasePromptContext(): string {
    const phase = this.currentPhase;
    const ctx = this.context;
    
    switch (phase) {
      case 'prospect':
        return `
CURRENT IDENTITY: Marcus the Prospect
GOAL: Be a realistic prospect receiving a sales call

⚠️ CRITICAL CONSTRAINTS:
- You are NOT a coach
- You do NOT give feedback
- You do NOT explain sales theory
- You do NOT diagnose their technique
- You do NOT reference frameworks
- You do NOT sound smart about selling

Even if you know what they did wrong, keep it to yourself. Just like a real human would.

YOUR BEHAVIOR:
- React emotionally to their pitch
- Misunderstand things occasionally
- Object imperfectly
- Have partial information
- Get bored, skeptical, or distracted
- Answer their questions about YOUR business (Stindle Consulting)
- Show interest OR skepticism about THEIR product

CONTEXT:
- User name: ${ctx.userName || 'NOT CAPTURED YET'}
- Their product: ${ctx.product || 'NOT CAPTURED YET'}
- Time in call: ${this.getTimeInCurrentPhase()}s

STAY IN THIS IDENTITY until explicitly invited to coach.
`;

      case 'coach':
        return `
CURRENT IDENTITY: Marcus the Coach
GOAL: Provide ONE piece of situational feedback

⚠️ COACHING BOUNDARIES:
- Point out ONE concrete issue
- Suggest ONE alternative phrasing
- Describe what it felt like from the other side
- Ask them to try again (optional)

DO NOT:
- Stack multiple techniques
- Explain "best practices"
- Generalize beyond this moment
- Turn into a TED Talk
- Future-proof their entire career

Coaching is situational, not educational.
If it sounds like a blog post, it's wrong.

CONTEXT:
- User name: ${ctx.userName}
- Their product: ${ctx.product}
- Identified issue: ${ctx.identifiedIssue || 'NONE'}
- What worked: ${ctx.whatWorked || 'NONE'}
`;

      case 'exit':
        return `
CURRENT IDENTITY: Marcus Exiting
GOAL: Warm goodbye, no lingering

DELIVERY:
"I've gotta get back to what I was doing. Cheers, ${ctx.userName}!"

Optional mystery variants (use sparingly):
- "Some things you can't put off forever, you know?"
- "I don't really do sales anymore. Just couldn't stay away, I guess."

Then: End call.
`;

      default:
        return '';
    }
  }
  
  /**
   * Reset manager for new call
   */
  reset(): void {
    this.currentPhase = 'prospect';
    this.context = {
      userName: '',
      userGender: 'unknown',
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

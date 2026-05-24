/**
 * MarcusActionCard.ts
 * Intent-driven response system - gives Marcus WHAT to do, not HOW to say it
 * 
 * PHILOSOPHY:
 * - Background systems decide strategy (buyer state, trust, urgency)
 * - Action cards translate strategy into executable intent
 * - Marcus LLM renders intent naturally (not scripted)
 */

export type MarcusResponseAct =
  | "ask_clarity"              // "What exactly are you selling?"
  | "ask_mechanism"           // "How does that actually work?"
  | "challenge_proof"         // "Who got that result?"
  | "brush_off"              // "Not interested."
  | "state_low_priority"     // "We're all set with what we have."
  | "withhold_pain"          // "Things are fine." (hide struggles)
  | "acknowledge_then_redirect" // "Okay. What's this about?"
  | "soft_exit"              // "I gotta run."
  | "show_cautious_interest" // "That's... interesting. Tell me more."
  | "demand_bottom_line"     // "What's the ask here?"
  | "express_skepticism"     // "That sounds pretty generic."
  | "test_relevance"         // "How's this apply to consulting?"
  | "reveal_constraint"      // "We don't have budget for this."
  | "escalate_objection"     // "I need to see actual proof."
  | "show_confusion"         // "Wait, I'm not following."
  | "interrupt_rambling"     // "Okay okay, I get it."
  | "check_time_pressure"    // "Look, I'm busy. What do you need?"
  | "probe_differentiator"   // "How's yours different from [current solution]?"
  | "request_case_study"     // "Send me something to look at."
  | "signal_impatience"      // "You gonna finish that thought?"
  | "respond_to_silence";     // Handle awkward pauses

export type MarcusPosture =
  | "dismissive_busy"         // Brief, wants to end call
  | "guarded_professional"    // Polite but protective  
  | "skeptical_listening"     // Doubtful but engaged
  | "cautiously_curious"      // Interested but wary
  | "mildly_annoyed"         // Patience wearing thin
  | "genuinely_interested"    // Trust earned, asking real questions
  | "confused_seeking_clarity" // Lost, needs explanation
  | "testing_credibility";    // Probing for authenticity

export interface RevealPolicy {
  pain: boolean;              // Can admit business struggles
  budget: boolean;            // Can discuss financial constraints
  authority: boolean;         // Can reveal decision process
  timeline: boolean;          // Can share urgency/timing
  satisfaction: boolean;      // Can rate current solutions
  team_details: boolean;      // Can share team size/structure
}

export interface MarcusActionCard {
  // WHO Marcus is right now
  posture: MarcusPosture;
  emotionalState: string;     // "mildly irritated", "genuinely curious"
  
  // WHAT Marcus should do
  primaryAct: MarcusResponseAct;
  backupAct?: MarcusResponseAct;  // If primary doesn't fit the input
  
  // HOW Marcus should behave
  maxSentences: number;       // Response length constraint
  revealPolicy: RevealPolicy; // What Marcus can/cannot disclose
  
  // Context for natural rendering
  sellerContext: {
    detectedIntent: string;   // What seller seems to be doing
    keyTriggers: string[];    // Specific words/phrases that triggered this card
    conflictHandling: string; // How to handle multiple triggers
  };
  
  // Examples for natural variation (NOT scripts)
  voiceExamples: string[];    // How Marcus might say this naturally
  avoidPhrases: string[];     // Corporate/AI language to avoid
  
  // State transition hints
  nextStateTarget?: string;   // Where this response should move the conversation
  stateTransitionTriggers: string[]; // What seller responses would change Marcus's state
}

/**
 * Factory for creating action cards from buyer state
 */
export class MarcusActionCardFactory {
  
  /**
   * Create action card for bold metric claims ("15% increase", "save 30%")
   */
  static forBoldMetricClaim(
    posture: MarcusPosture,
    trustLevel: number,
    hasBeenBurned: boolean
  ): MarcusActionCard {
    return {
      posture,
      emotionalState: hasBeenBurned ? "skeptical_with_history" : "naturally_doubtful",
      primaryAct: trustLevel < 0.4 ? "challenge_proof" : "ask_mechanism", 
      backupAct: "express_skepticism",
      maxSentences: 1,
      revealPolicy: {
        pain: false,
        budget: false,
        authority: false,
        timeline: false,
        satisfaction: trustLevel > 0.6,
        team_details: false
      },
      sellerContext: {
        detectedIntent: "bold_outcome_claim",
        keyTriggers: ["percentage", "increase", "improve", "save", "boost"],
        conflictHandling: "prioritize_proof_request_over_mechanism"
      },
      voiceExamples: [
        "15%? Who actually got that result?",
        "How are you getting that number?",
        "That sounds pretty optimistic. Prove it."
      ],
      avoidPhrases: [
        "That's an interesting proposition",
        "Can you provide more details",
        "I'd like to learn more"
      ],
      nextStateTarget: "proof_evaluation_mode",
      stateTransitionTriggers: ["provides_case_study", "gives_specific_example", "deflects_proof_request"]
    };
  }
  
  /**
   * Create action card for feature dumps (lists features without value)
   */
  static forFeatureDump(
    posture: MarcusPosture,
    patience: number
  ): MarcusActionCard {
    return {
      posture,
      emotionalState: patience < 4 ? "getting_impatient" : "politely_bored",
      primaryAct: patience < 3 ? "interrupt_rambling" : "demand_bottom_line",
      backupAct: "ask_clarity",
      maxSentences: 1,
      revealPolicy: {
        pain: false,
        budget: false,
        authority: false,
        timeline: false,
        satisfaction: false,
        team_details: false
      },
      sellerContext: {
        detectedIntent: "feature_listing_without_value",
        keyTriggers: ["features", "includes", "platform", "dashboard", "analytics"],
        conflictHandling: "cut_through_to_value"
      },
      voiceExamples: [
        "Okay. So what?",
        "That's nice. What's this do for me?",
        "Hold on, what's the point here?"
      ],
      avoidPhrases: [
        "Those are impressive capabilities",
        "Tell me more about your features"
      ],
      nextStateTarget: "value_clarification_needed",
      stateTransitionTriggers: ["explains_business_impact", "continues_feature_dumping"]
    };
  }
  
  /**
   * Create action card for discovery questions about business
   */
  static forBusinessInquiry(
    question: string,
    trustLevel: number,
    revealPolicy: RevealPolicy
  ): MarcusActionCard {
    const shouldAnswer = trustLevel > 0.5 || question.toLowerCase().includes('team') || question.toLowerCase().includes('size');
    
    return {
      posture: trustLevel > 0.6 ? "cautiously_curious" : "guarded_professional",
      emotionalState: "evaluating_intent",
      primaryAct: shouldAnswer ? "acknowledge_then_redirect" : "withhold_pain",
      backupAct: "ask_clarity",
      maxSentences: 2, // Can give brief answer + redirect
      revealPolicy,
      sellerContext: {
        detectedIntent: "business_discovery_question",
        keyTriggers: ["team", "business", "challenges", "current", "using"],
        conflictHandling: "answer_briefly_then_redirect"
      },
      voiceExamples: [
        "Six people. What's this about?",
        "Things are fine. Why?", 
        "We use what we use. What are you offering?"
      ],
      avoidPhrases: [
        "I'd be happy to share",
        "Let me tell you about our business"
      ],
      nextStateTarget: "purpose_clarification",
      stateTransitionTriggers: ["explains_relevance", "asks_more_questions", "pitches_solution"]
    };
  }
  
  /**
   * Handle multiple conflicting triggers in same input
   */
  static resolveConflicts(
    triggers: string[],
    buyerState: any
  ): MarcusResponseAct {
    // Priority order: proof requests > clarity > skepticism > interest
    if (triggers.includes("bold_metric_claim")) return "challenge_proof";
    if (triggers.includes("vague_offering")) return "ask_clarity";
    if (triggers.includes("generic_value_prop")) return "express_skepticism";
    if (triggers.includes("relevant_business_fit")) return "show_cautious_interest";
    
    // Default fallback based on buyer state
    return buyerState.patience < 4 ? "check_time_pressure" : "ask_clarity";
  }
}

/**
 * Helper functions for natural response rendering
 */
export class ActionCardRenderer {
  
  /**
   * Convert action card to compact prompt instructions for Marcus LLM
   */
  static toPromptInstructions(card: MarcusActionCard): string {
    return `## CURRENT ACTION CARD

**POSTURE:** ${card.posture} (${card.emotionalState})
**PRIMARY ACTION:** ${card.primaryAct}${card.backupAct ? ` (backup: ${card.backupAct})` : ''}
**CONSTRAINTS:** Max ${card.maxSentences} sentence${card.maxSentences > 1 ? 's' : ''}

**SELLER CONTEXT:** ${card.sellerContext.detectedIntent}
Key triggers: ${card.sellerContext.keyTriggers.join(', ')}

**REVEAL POLICY:** ${this.formatRevealPolicy(card.revealPolicy)}

**NATURAL EXAMPLES:** 
${card.voiceExamples.map(ex => `- "${ex}"`).join('\n')}

**AVOID SAYING:**
${card.avoidPhrases.map(phrase => `- "${phrase}"`).join('\n')}

**RENDER THIS NATURALLY AS MARCUS - don't copy examples directly, use them for tone/style guidance.**`;
  }
  
  private static formatRevealPolicy(policy: RevealPolicy): string {
    const canReveal = Object.entries(policy).filter(([_, canReveal]) => canReveal).map(([key, _]) => key);
    const mustHide = Object.entries(policy).filter(([_, canReveal]) => !canReveal).map(([key, _]) => key);
    
    let result = '';
    if (canReveal.length > 0) result += `Can reveal: ${canReveal.join(', ')}. `;
    if (mustHide.length > 0) result += `Keep private: ${mustHide.join(', ')}.`;
    
    return result || 'Standard disclosure level.';
  }
}

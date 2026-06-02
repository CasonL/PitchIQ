/**
 * RepBehaviorDetector.ts
 * 
 * Detects what the rep did in their utterance.
 * Uses hybrid approach: heuristics for obvious patterns, LLM for nuance.
 * 
 * Philosophy:
 * - Simple heuristics for obvious patterns
 * - LLM for 4 nuanced behaviors that require semantic understanding
 * - Use existing repQualitySignals when available
 * - Don't expect regex alone to understand sales nuance
 * - Return multiple behaviors per turn (rep can do several things)
 */

import { LLMBehaviorClassifier } from './LLMBehaviorClassifier';
import { LLMClassificationTask } from './LLMBehaviorClassifier.types';

export type RepBehavior =
  // Discovery behaviors
  | 'asked_trigger_question'        // Good open-ended discovery question
  | 'asked_concrete_discovery'      // Specific question about current state
  | 'asked_generic_question'        // Lazy, surface-level question
  | 'asked_follow_up'               // Follow-up to previous answer
  | 'asked_about_current_spend'     // Discovers economic anchor
  | 'asked_about_problem_cost'      // Helps quantify the problem
  
  // Positioning behaviors
  | 'pitched_prematurely'           // Solution before discovery
  | 'made_unearned_roi_claim'       // Claims value before establishing trust
  | 'made_hyperbolic_claim'         // "300% ROI guaranteed"
  | 'provides_specific_proof'       // Concrete evidence, not claims
  | 'connects_to_specific_problem'  // Shows understanding of Marcus's world
  
  // Rapport behaviors
  | 'shows_specific_understanding'  // References Marcus's actual situation
  | 'validates_concern'             // Acknowledges Marcus's objection
  | 'answers_question_directly'     // Provides substantive answer to Marcus's question
  | 'asks_permission'               // Respects Marcus's time
  | 'summarizes_understanding'      // Shows he's listening
  
  // Negative behaviors
  | 'overtalks'                     // Talks too long without asking
  | 'contradicts_self'              // Says X, then says Y
  | 'criticizes_current_solution'   // Insults what Marcus uses now
  | 'pushes_after_rejection'        // Won't take no for an answer
  | 'ignores_exit_signal'           // Continues after "not interested", "gotta run", "not a fit"
  | 'ignores_warm_context'          // Treats warm lead like cold call
  | 'dodges_legitimacy_question'    // Doesn't answer "How did you get my info?"
  | 'handles_legitimacy_directly'   // Answers legitimacy question well
  
  // Warm-lead specific
  | 'validated_status_quo'          // Acknowledges current solution is working
  | 'asked_too_large_commitment'    // Asks for demo/meeting too soon
  
  // Warm-lead psychology (research-backed triggers)
  | 'violates_autonomy'             // Pushes for commitment without earning it (reactance theory)
  | 'creates_cognitive_overload'    // Too much info at once (cognitive load theory)
  | 'triggers_status_quo_shield'    // Attacks current solution (status quo bias)
  | 'demonstrates_relevance'        // Shows understanding of buyer's world (source credibility)
  | 'reduces_perceived_risk'        // Makes next step feel safe (loss aversion)
  | 'explores_ambivalence'          // Surfaces both sides of objection (motivational interviewing)
  | 'enables_self_persuasion'       // Buyer articulates value themselves (commitment consistency);

export interface RepBehaviorDetectorContext {
  userInput: string;
  conversationHistory: Array<{ role: string; content: string }>;
  repQualitySignals?: {
    askedDiscovery?: boolean;
    buildingRapport?: boolean;
    pitchingTooEarly?: boolean;
    handledObjectionWell?: boolean;
    overtalking?: boolean;
  };
  marcusLastMessage?: string;
  turnNumber: number;
  isWarmLead?: boolean;
  buyerState?: {
    statusQuoShieldActive?: boolean;
    autonomyDefense?: number;
    cognitiveLoad?: number;
  };
}

export class RepBehaviorDetector {
  /**
   * Detect all behaviors in the rep's utterance (synchronous - heuristics only)
   */
  static detect(context: RepBehaviorDetectorContext): RepBehavior[] {
    const behaviors: RepBehavior[] = [];
    const { userInput, repQualitySignals, marcusLastMessage, isWarmLead } = context;
    const lower = userInput.toLowerCase();

    // Run heuristic detection
    return this.detectWithHeuristics(context, behaviors, lower);
  }

  /**
   * Detect all behaviors with hybrid approach (heuristics + LLM)
   * Use this for production - it's async and uses LLM for nuanced detection
   */
  static async detectHybrid(context: RepBehaviorDetectorContext): Promise<RepBehavior[]> {
    const behaviors: RepBehavior[] = [];
    const lower = context.userInput.toLowerCase();

    // 1. Fast heuristics for obvious patterns
    const heuristicBehaviors = this.detectWithHeuristics(context, [], lower);
    behaviors.push(...heuristicBehaviors);

    // 2. Identify which LLM tasks are needed
    const llmTasks = this.identifyLLMTasks(context, lower);

    // 3. If LLM tasks needed, classify with LLM
    if (llmTasks.length > 0) {
      const llmResult = await LLMBehaviorClassifier.classify({
        repUtterance: context.userInput,
        buyerLastUtterance: context.marcusLastMessage,
        recentHistory: context.conversationHistory?.slice(-6).map(msg => ({
          role: msg.role === 'assistant' ? 'buyer' as const : 'rep' as const,
          content: msg.content
        })),
        turnNumber: context.turnNumber,
        tasks: llmTasks
      });

      // Add LLM-detected behaviors
      const llmBehaviors = llmResult.behaviors.map(b => b.behavior);
      behaviors.push(...llmBehaviors);

      console.log(`🤖 [LLM] Detected ${llmBehaviors.length} nuanced behaviors in ${llmResult.processingTimeMs}ms`);
    }

    return behaviors;
  }

  /**
   * Identify which LLM tasks are needed based on context
   * Targeted usage - only call LLM when necessary
   */
  private static identifyLLMTasks(context: RepBehaviorDetectorContext, lower: string): LLMClassificationTask[] {
    const tasks: LLMClassificationTask[] = [];

    // Task 1: Validate concern quality (if buyer expressed concern)
    if (context.marcusLastMessage && 
        /concern|worry|issue|problem|budget|tight|expensive|cost|afford/i.test(context.marcusLastMessage)) {
      tasks.push('validate_concern_quality');
    }

    // Task 2: Earned ROI claim (if rep mentions savings/value)
    if (/save|reduce|increase|improve|\d+%|roi|return/i.test(lower)) {
      tasks.push('earned_roi_claim');
    }

    // Task 3: Specific problem connection (if rep references buyer context)
    if (context.marcusLastMessage && this.repReferencesBuyerContext(lower, context.marcusLastMessage)) {
      tasks.push('specific_problem_connection');
    }

    // Task 4: Pitch timing (if rep mentions product/solution early)
    if ((/we |our |this |platform|solution|help|offer/i.test(lower)) && context.turnNumber <= 5) {
      tasks.push('pitch_timing');
    }

    return tasks;
  }

  /**
   * Check if rep is referencing buyer's context
   */
  private static repReferencesBuyerContext(lower: string, marcusLastMessage: string): boolean {
    // Look for reflection markers or shared keywords
    const hasReflectionMarker = /so |sounds like|you mentioned|you said|you brought up/i.test(lower);
    const marcusWords = marcusLastMessage.toLowerCase().match(/\b\w{5,}\b/g) || [];
    const hasSharedWords = marcusWords.some(word => lower.includes(word));
    
    return hasReflectionMarker || hasSharedWords;
  }

  /**
   * Heuristic-based detection for obvious patterns
   */
  private static detectWithHeuristics(
    context: RepBehaviorDetectorContext,
    behaviors: RepBehavior[],
    lower: string
  ): RepBehavior[] {
    const { userInput, repQualitySignals, marcusLastMessage, isWarmLead } = context;

    // Discovery behaviors
    if (this.isOpenEndedQuestion(userInput)) {
      behaviors.push('asked_trigger_question');
    }
    
    if (this.isCurrentStateDiscovery(lower)) {
      behaviors.push('asked_concrete_discovery');
    }
    
    if (this.isGenericQuestion(lower)) {
      behaviors.push('asked_generic_question');
    }
    
    if (this.asksAboutCurrentSpend(lower)) {
      behaviors.push('asked_about_current_spend');
    }
    
    if (this.asksAboutProblemCost(lower)) {
      behaviors.push('asked_about_problem_cost');
    }

    // Positioning behaviors
    if (repQualitySignals?.pitchingTooEarly || this.isPrematurePitch(lower, context)) {
      behaviors.push('pitched_prematurely');
    }
    
    if (this.makesUnearnedROIClaim(lower)) {
      behaviors.push('made_unearned_roi_claim');
    }
    
    if (this.makesHyperbolicClaim(lower)) {
      behaviors.push('made_hyperbolic_claim');
    }
    
    if (this.providesSpecificProof(lower)) {
      behaviors.push('provides_specific_proof');
    }
    
    if (this.connectsToSpecificProblem(lower, marcusLastMessage)) {
      behaviors.push('connects_to_specific_problem');
    }

    // Rapport behaviors
    if (this.showsSpecificUnderstanding(lower, marcusLastMessage)) {
      behaviors.push('shows_specific_understanding');
    }
    
    if (repQualitySignals?.handledObjectionWell || this.validatesConcern(lower, marcusLastMessage)) {
      behaviors.push('validates_concern');
    }
    
    if (this.answersQuestionDirectly(lower, marcusLastMessage, context)) {
      behaviors.push('answers_question_directly');
    }
    
    if (this.asksPermission(lower)) {
      behaviors.push('asks_permission');
    }
    
    if (this.summarizesUnderstanding(lower)) {
      behaviors.push('summarizes_understanding');
    }

    // Negative behaviors
    if (repQualitySignals?.overtalking || this.isOvertalking(userInput)) {
      behaviors.push('overtalks');
    }
    
    if (this.criticizesCurrentSolution(lower)) {
      behaviors.push('criticizes_current_solution');
    }
    
    if (this.pushesAfterRejection(lower, marcusLastMessage)) {
      behaviors.push('pushes_after_rejection');
    }
    
    if (this.ignoresExitSignal(lower, marcusLastMessage)) {
      behaviors.push('ignores_exit_signal');
    }

    // Warm-lead specific
    if (isWarmLead && this.ignoresWarmContext(lower, context)) {
      behaviors.push('ignores_warm_context');
    }
    
    if (this.validatesStatusQuo(lower)) {
      behaviors.push('validated_status_quo');
    }

    return behaviors;
  }

  // ============================================================================
  // DISCOVERY DETECTION (HEURISTICS)
  // ============================================================================

  private static isOpenEndedQuestion(input: string): boolean {
    const openEndedPatterns = [
      /what('s| is| are) (your|the) (biggest|main|primary) (challenge|concern|priority|goal)/i,
      /tell me (about|more about)/i,
      /how (do|does|did) (you|your team|that) (currently|typically)/i,
      /walk me through/i,
      /help me understand/i,
      /what does (that|this|your) (look like|mean)/i
    ];
    
    return openEndedPatterns.some(pattern => pattern.test(input));
  }

  private static isCurrentStateDiscovery(lower: string): boolean {
    return (
      /what (are you|do you) (currently|right now) (using|doing|spending)/i.test(lower) ||
      /how (are you|do you) (currently|right now) (handling|managing|dealing with)/i.test(lower)
    );
  }

  private static isGenericQuestion(lower: string): boolean {
    const genericPatterns = [
      /how('s| is) (your|the) (day|week|business)/i,
      /how are (you|things)/i,
      /what do you do/i
    ];
    
    return genericPatterns.some(pattern => pattern.test(lower));
  }

  private static asksAboutCurrentSpend(lower: string): boolean {
    return (
      /what (are you|do you) (currently )?spend/i.test(lower) ||
      /how much (are you|do you) (currently )?(pay|spend)/i.test(lower) ||
      /what('s| is) your (current )?budget/i.test(lower)
    );
  }

  private static asksAboutProblemCost(lower: string): boolean {
    return (
      /what (does|is) (that|this) cost(ing)? you/i.test(lower) ||
      /how much (does|is) (that|this) cost(ing)? you/i.test(lower) ||
      /what('s| is) the (cost|impact) of/i.test(lower)
    );
  }

  // ============================================================================
  // POSITIONING DETECTION
  // ============================================================================

  private static isPrematurePitch(lower: string, context: RepBehaviorDetectorContext): boolean {
    const hasPitchLanguage = (
      /we (can|could|would) help/i.test(lower) ||
      /our (product|solution|platform|service)/i.test(lower) ||
      /what we do is/i.test(lower)
    );
    
    // Premature if pitching in first 3 turns
    return hasPitchLanguage && context.turnNumber <= 3;
  }

  private static makesUnearnedROIClaim(lower: string): boolean {
    return (
      /save you \$?\d+/i.test(lower) ||
      /\d+% (increase|improvement|roi|return)/i.test(lower) ||
      /reduce (costs|time) by \d+/i.test(lower)
    );
  }

  private static makesHyperbolicClaim(lower: string): boolean {
    return (
      /guaranteed/i.test(lower) ||
      /\d{3,}% (roi|increase|improvement)/i.test(lower) || // 300%+
      /revolutionize/i.test(lower) ||
      /game[- ]chang/i.test(lower)
    );
  }

  private static providesSpecificProof(lower: string): boolean {
    return (
      /case study/i.test(lower) ||
      /customer (example|story)/i.test(lower) ||
      /\d+ (companies|clients|customers) (like|similar)/i.test(lower) ||
      /specific example/i.test(lower)
    );
  }

  private static connectsToSpecificProblem(lower: string, marcusLastMessage?: string): boolean {
    if (!marcusLastMessage) return false;
    
    // Stoplist of weak category words that don't indicate real connection
    const weakWords = new Set([
      'current', 'happy', 'sales', 'training', 'methods', 'team', 'teams',
      'solution', 'platform', 'company', 'business', 'process', 'system',
      'using', 'working', 'doing', 'handle', 'manage', 'think', 'about'
    ]);
    
    // Look for reflection/paraphrase markers
    const hasReflectionFrame = (
      /so |sounds like|if i('m| am) hearing|what you('re| are) saying|the issue is|the challenge is/i.test(lower) ||
      /you mentioned|you said|you brought up/i.test(lower)
    );
    
    // Extract meaningful keywords from Marcus's message
    const marcusKeywords = marcusLastMessage.toLowerCase()
      .match(/\b\w{5,}\b/g) || [];
    const meaningfulKeywords = marcusKeywords.filter(k => !weakWords.has(k));
    
    // Check for meaningful overlap
    const meaningfulOverlap = meaningfulKeywords.some(k => lower.includes(k));
    
    return hasReflectionFrame && meaningfulOverlap;
  }

  // ============================================================================
  // RAPPORT DETECTION
  // ============================================================================

  private static showsSpecificUnderstanding(lower: string, marcusLastMessage?: string): boolean {
    return (
      /so if i('m| am) hearing you (right|correctly)/i.test(lower) ||
      /it sounds like/i.test(lower) ||
      /what i('m| am) hearing is/i.test(lower)
    ) && this.connectsToSpecificProblem(lower, marcusLastMessage);
  }

  private static validatesConcern(lower: string, marcusLastMessage?: string): boolean {
    if (!marcusLastMessage) return false;
    
    const validationPatterns = [
      /that('s| is) (fair|valid|understandable|reasonable)/i,
      /i (get|understand) (that|why)/i,
      /makes sense/i,
      /i appreciate (that|you)/i
    ];
    
    return validationPatterns.some(pattern => pattern.test(lower));
  }
  
  private static answersQuestionDirectly(lower: string, marcusLastMessage?: string, context?: RepBehaviorDetectorContext): boolean {
    if (!marcusLastMessage) return false;
    
    const marcusLower = marcusLastMessage.toLowerCase();
    
    // Check if Marcus asked a question
    const marcusAskedQuestion = marcusLower.includes('?') || 
      /^(how|what|why|when|where|who|can you|could you|do you|are you|is this)/i.test(marcusLower);
    
    if (!marcusAskedQuestion) return false;
    
    // Check if rep's response is substantive (not just a question back or deflection)
    const isSubstantiveAnswer = (
      lower.split(/\s+/).length >= 15 &&  // At least 15 words
      !lower.startsWith('can i') &&        // Not deflecting with a question
      !lower.startsWith('could you') &&
      !/^(sorry|well|um|uh)/i.test(lower)  // Not just filler
    );
    
    // Check if rep is actually addressing the topic Marcus asked about
    // Extract key question words from Marcus's question
    const questionWords = marcusLower.match(/\b(different|proof|value|cost|price|work|help|benefit|feature|compare|versus)\b/gi) || [];
    const addressesTopic = questionWords.length === 0 || 
      questionWords.some(word => lower.includes(word.toLowerCase()));
    
    return isSubstantiveAnswer && addressesTopic;
  }

  private static asksPermission(lower: string): boolean {
    return (
      /is (this|now) a good time/i.test(lower) ||
      /do you have (a )?few minutes/i.test(lower) ||
      /can i (ask|share)/i.test(lower) ||
      /would it be (okay|alright) (if|to)/i.test(lower)
    );
  }

  private static summarizesUnderstanding(lower: string): boolean {
    return (
      /let me (make sure|summarize|recap)/i.test(lower) ||
      /so (what i('m| am) hearing|to summarize)/i.test(lower) ||
      /if i understand correctly/i.test(lower)
    );
  }

  // ============================================================================
  // NEGATIVE BEHAVIOR DETECTION
  // ============================================================================

  private static isOvertalking(input: string): boolean {
    const wordCount = input.split(/\s+/).length;
    const sentenceCount = input.split(/[.!?]+/).length;
    
    // Overtalking if: 100+ words OR 5+ sentences without a question
    return (wordCount > 100 || sentenceCount > 5) && !input.includes('?');
  }

  private static criticizesCurrentSolution(lower: string): boolean {
    return (
      /that('s| is) (outdated|old|inefficient|broken)/i.test(lower) ||
      /you('re| are) (wasting|losing) (money|time)/i.test(lower) ||
      /that (doesn't|won't) work/i.test(lower)
    );
  }

  private static pushesAfterRejection(lower: string, marcusLastMessage?: string): boolean {
    if (!marcusLastMessage) return false;
    
    const marcusRejected = (
      /not interested/i.test(marcusLastMessage) ||
      /don't (have|need)/i.test(marcusLastMessage) ||
      /no thanks/i.test(marcusLastMessage)
    );
    
    const repPushes = (
      /but (what if|imagine|consider)/i.test(lower) ||
      /just (hear me out|give me)/i.test(lower) ||
      /one more thing/i.test(lower)
    );
    
    return marcusRejected && repPushes;
  }
  
  private static ignoresExitSignal(lower: string, marcusLastMessage?: string): boolean {
    if (!marcusLastMessage) return false;
    
    const marcusLower = marcusLastMessage.toLowerCase();
    
    // Clear exit signals from Marcus
    const marcusGaveExitSignal = (
      /not (a fit|interested|sure|the right)/i.test(marcusLower) ||
      /(gotta|have to|need to) (run|go|wrap)/i.test(marcusLower) ||
      /let('s| us) (leave it|keep it simple|wrap)/i.test(marcusLower) ||
      /(i'm|i am) (not interested|swamped|busy)/i.test(marcusLower) ||
      /don't think this is/i.test(marcusLower) ||
      /not convinced/i.test(marcusLower) ||
      /i really need to focus/i.test(marcusLower)
    );
    
    // Rep continues with questions or pitching instead of respecting exit
    const repContinues = (
      lower.includes('?') ||  // Asking another question
      /can i|let me|what if|but|however|one more/i.test(lower) ||
      /send (you|over)|reach out|follow up/i.test(lower) && lower.length > 50  // Long follow-up pitch
    );
    
    return marcusGaveExitSignal && repContinues;
  }

  // ============================================================================
  // WARM-LEAD SPECIFIC
  // ============================================================================

  private static ignoresWarmContext(lower: string, context: RepBehaviorDetectorContext): boolean {
    if (!context.isWarmLead) return false;
    
    const acknowledgesWarmSignal = (
      /saw (you|your) (visited|browsed|checked out)/i.test(lower) ||
      /noticed you (were|looked)/i.test(lower) ||
      /following up on your (visit|interest)/i.test(lower)
    );
    
    if (acknowledgesWarmSignal) return false;
    
    // Only penalize if:
    // 1. Rep is pitching without mentioning warm signal, OR
    // 2. Marcus asked "what is this about?" and rep still doesn't anchor, OR
    // 3. Turn 3+ and still no warm context mentioned
    const isPitching = this.isPrematurePitch(lower, context);
    const marcusAskedWhy = /what is this|what('s| is) this about|why are you calling|how did you get/i
      .test(context.marcusLastMessage?.toLowerCase() || '');
    
    return isPitching || marcusAskedWhy || context.turnNumber >= 3;
  }

  private static validatesStatusQuo(lower: string): boolean {
    return (
      /if (it|that)('s| is) working/i.test(lower) ||
      /sounds like you('re| are) (happy|satisfied)/i.test(lower) ||
      /that makes sense/i.test(lower)
    );
  }
}

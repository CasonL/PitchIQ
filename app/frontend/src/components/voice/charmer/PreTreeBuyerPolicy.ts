/**
 * PreTreeBuyerPolicy
 * 
 * Provides realistic buyer behavior before BuyerStateTree fully takes over.
 * Prevents stale "Initial Contact" guidance when Marcus clearly understands the product.
 * 
 * Pre-tree modes progress based on productConfidence and seller signals:
 * 1. NO_PRODUCT_SIGNAL: Marcus has no idea what this is about
 * 2. COMPANY_KNOWN_PRODUCT_UNCLEAR: Knows company name, not the value
 * 3. CATEGORY_UNDERSTOOD_VALUE_UNCLEAR: Understands category, not differentiation
 * 4. CLAIM_UNDERSTOOD_PROOF_UNCLEAR: Understands claim, wants proof
 */

import { BuyerBeliefState } from './BuyerBeliefTracker';
import { ProductConfidence } from './ProductConfidenceDetector';
import { SELLER_SIGNALS, type SellerSignalId } from './BuyerTriggerConstants';
import { AvailabilityPolicy, type AvailabilityState } from './AvailabilityPolicy';

/**
 * BUYER TRUST/RELEVANCE LADDER FRAMEWORK
 * 
 * Buyers move through stages of trust and relevance evaluation. This is NOT a rigid waterfall,
 * but a stage-weighting model that determines what questions/objections are realistic at each point.
 * 
 * 1. ORIENT - What is this? Who are you? Why are you calling?
 * 2. RELEVANCE - Does this apply to me or my business?
 * 3. CREDIBILITY - Should I trust the seller, company, claim, or proof?
 * 4. VALUE - Why would this help my specific situation?
 * 5. MECHANICS - How does it work? What would implementation look like?
 * 6. ECONOMICS - What does it cost? Is it worth the tradeoff?
 * 7. TIMING - Why now? What would next steps look like?
 * 
 * GATEKEEPING REFLEXES (ORIENT stage) vs GENUINE OBJECTIONS (later stages):
 * 
 * Gatekeeping Reflexes = Defensive mechanisms BEFORE understanding value:
 * 1. Legitimacy/Privacy: "Who is this?" "How'd you get my number?"
 * 2. Time Pressure: "Don't have time" "Gotta run" "Make it quick"
 * 3. Dismissive Reflex: "Not interested" (without knowing what it is)
 * 4. Default No: "We have something for that" (reflexive, not genuine evaluation)
 * 
 * These are NOT objections - they're gatekeeping mechanisms that happen before engagement.
 * Sellers must get past these reflexes to earn the right to present value.
 * 
 * Genuine Objections = Thoughtful concerns AFTER understanding:
 * - "We already have training and it works well" (after understanding VALUE)
 * - "This doesn't fit our process" (after understanding MECHANICS)
 * - "Too expensive for what it does" (after understanding ECONOMICS)
 * 
 * Genuine objections require product understanding. Reflexes happen before that.
 * 
 * PRICING CLASSIFICATION:
 * - Premature pricing (before RELEVANCE/VALUE): Skeptical quick-qualification or exit attempt
 * - Genuine pricing (after VALUE established): Budget fit, ROI, implementation feasibility
 * 
 * CREDIBILITY (WHO) RECURS THROUGHOUT:
 * - Who are you? (ORIENT)
 * - Who have you helped? (CREDIBILITY)
 * - Who else uses this? (VALUE)
 * - Who says the claim is true? (CREDIBILITY/proof)
 * - Who would need to approve this? (ECONOMICS)
 * 
 * PreTreeBuyerPolicy Mode Mapping:
 * - NO_PRODUCT_SIGNAL: ORIENT stage (gatekeeping reflexes)
 * - COMPANY_KNOWN_PRODUCT_UNCLEAR: ORIENT → RELEVANCE transition (gatekeeping reflexes)
 * - CLARITY_SEEKING: RELEVANCE stage
 * - CATEGORY_UNDERSTOOD_VALUE_UNCLEAR: RELEVANCE → CREDIBILITY → VALUE
 * - CLAIM_UNDERSTOOD_PROOF_UNCLEAR: CREDIBILITY/VALUE stage (proof challenge)
 */

export type PreTreeMode = 
  | 'NO_PRODUCT_SIGNAL'
  | 'COMPANY_KNOWN_PRODUCT_UNCLEAR'
  | 'CLARITY_SEEKING'
  | 'CATEGORY_UNDERSTOOD_VALUE_UNCLEAR'
  | 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR';

export type BuyerLadderStage = 
  | 'ORIENT'
  | 'RELEVANCE'
  | 'CREDIBILITY'
  | 'VALUE'
  | 'MECHANICS'
  | 'ECONOMICS'
  | 'TIMING';

export interface PreTreeGuidance {
  mode: PreTreeMode;
  stage: BuyerLadderStage;
  internalPosture: string;
  promptGuidance: string[];  // Clean, concise - goes to Marcus
  voiceExamples: string[];   // Max 2, availability-aware
  allowedTopics: string[];
  developerNotes?: string[]; // Framework docs, not for prompt
}

export interface PreTreeContext {
  productConfidence: ProductConfidence;
  beliefState: BuyerBeliefState;
  turnNumber: number;
  detectedCompany?: string;
  detectedProductName?: string;
  detectedProductDescription?: string;
  detectedCategory?: string;
  detectedFeatures: string[];
  recentSellerSignals: SellerSignalId[];
}

export class PreTreeBuyerPolicy {
  /**
   * Determine current pre-tree mode based on context
   * Uses signal clarity, not turn count. Turn 1 can contain full pitch. Turn 3 can be fog.
   * Progression: NO_SIGNAL → COMPANY_KNOWN → CLARITY_SEEKING → CATEGORY_UNDERSTOOD → CLAIM_UNDERSTOOD
   */
  static determineMode(context: PreTreeContext): PreTreeMode {
    const { 
      productConfidence, 
      recentSellerSignals, 
      detectedCompany, 
      detectedProductName,
      detectedProductDescription,
      detectedCategory,
      detectedFeatures
    } = context;
    
    // Signal clarity checks
    const hasCompany = !!detectedCompany;
    const hasProductName = !!detectedProductName;
    const hasProductDescription = !!detectedProductDescription;
    const hasCategory = !!detectedCategory;
    const hasFeatureSignals = detectedFeatures.length > 0;
    const hasAnyProductSignal = hasProductName || hasProductDescription || hasFeatureSignals;
    
    // Mode 5: Bold claim detected - challenge proof IMMEDIATELY (overrides normal flow)
    if (recentSellerSignals.includes(SELLER_SIGNALS.BOLD_METRIC_CLAIM)) {
      return 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR';
    }
    
    // Mode 1: No product signal at all
    if (!hasCompany && !hasAnyProductSignal && productConfidence.confidence === 'none') {
      return 'NO_PRODUCT_SIGNAL';
    }
    
    // Mode 2: Company known, but no clarity on what they sell
    // Has company name, but no product details or category
    if (hasCompany && !hasCategory && !hasProductDescription && productConfidence.confidence === 'low') {
      return 'COMPANY_KNOWN_PRODUCT_UNCLEAR';
    }
    
    // Mode 3: CLARITY_SEEKING - Some signals exist, but category/type unclear
    // Need to understand what category this belongs to
    if (!hasCategory || (productConfidence.confidence === 'low' && !hasProductDescription)) {
      return 'CLARITY_SEEKING';
    }
    
    // Mode 4: Category understood, value unclear
    // Has category, now needs differentiation/value
    return 'CATEGORY_UNDERSTOOD_VALUE_UNCLEAR';
  }
  
  /**
   * Generate buyer guidance for current pre-tree mode with availability overlay
   */
  static generateGuidance(
    context: PreTreeContext, 
    availability: AvailabilityState = 'available'
  ): PreTreeGuidance {
    const mode = this.determineMode(context);
    
    // Debug: Log mode selection logic (signal-based, not turnNumber)
    console.log('[PreTreeBuyerPolicy] Mode selection:', {
      mode,
      signals: {
        hasCompany: !!context.detectedCompany,
        hasProductName: !!context.detectedProductName,
        hasCategory: !!context.detectedCategory,
        hasFeatures: context.detectedFeatures.length > 0,
        confidence: context.productConfidence.confidence
      },
      turnNumber: context.turnNumber,
      note: 'Using signal clarity, not turn count'
    });
    
    // Generate base guidance for the mode
    let baseGuidance: PreTreeGuidance;
    switch (mode) {
      case 'NO_PRODUCT_SIGNAL':
        baseGuidance = this.generateNoProductSignalGuidance(context);
        break;
        
      case 'COMPANY_KNOWN_PRODUCT_UNCLEAR':
        baseGuidance = this.generateCompanyKnownGuidance(context);
        break;
        
      case 'CLARITY_SEEKING':
        baseGuidance = this.generateClaritySeekingGuidance(context);
        break;
        
      case 'CATEGORY_UNDERSTOOD_VALUE_UNCLEAR':
        baseGuidance = this.generateCategoryUnderstoodGuidance(context);
        break;
        
      case 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR':
        baseGuidance = this.generateClaimUnderstoodGuidance(context);
        break;
    }
    
    // Apply availability constraints if not available
    if (availability !== 'available') {
      return {
        mode: baseGuidance.mode,
        stage: baseGuidance.stage,
        internalPosture: AvailabilityPolicy.constrainInternalPosture(
          baseGuidance.internalPosture,
          availability
        ),
        promptGuidance: AvailabilityPolicy.constrainBehaviorGuidance(
          baseGuidance.promptGuidance,
          availability
        ),
        voiceExamples: AvailabilityPolicy.constrainVoiceExamples(
          baseGuidance.voiceExamples,
          availability,
          mode
        ),
        allowedTopics: availability === 'hard_exit' ? [] : baseGuidance.allowedTopics,
        developerNotes: baseGuidance.developerNotes
      };
    }
    
    // Debug: Confirm developerNotes are excluded from prompt
    console.log('[PreTreeGuidance]', {
      mode: baseGuidance.mode,
      stage: baseGuidance.stage,
      promptGuidanceCount: baseGuidance.promptGuidance.length,
      voiceExampleCount: baseGuidance.voiceExamples.length,
      developerNotesExcluded: Boolean(baseGuidance.developerNotes?.length),
      availability
    });
    
    return baseGuidance;
  }
  
  /**
   * Mode 1: No product signal
   */
  private static generateNoProductSignalGuidance(context: PreTreeContext): PreTreeGuidance {
    const { turnNumber } = context;
    
    const posture = turnNumber <= 1
      ? "You just answered the phone. You have no idea who this is or why they're calling. You're skeptical about unsolicited calls."
      : "You still don't know what this call is about or how they got your number. You need legitimacy established.";
    
    return {
      mode: 'NO_PRODUCT_SIGNAL',
      stage: 'ORIENT',
      internalPosture: posture,
      promptGuidance: [
        'Brief, polite but skeptical',
        'Ask who is calling and what this is about',
        'Do not reveal business details',
        'Remain guarded and non-committal'
      ],
      voiceExamples: [
        '"Wait, who is this?"',
        '"What\'s this about?"'
      ],
      allowedTopics: ['who_is_calling', 'how_got_number', 'legitimacy', 'agenda', 'purpose'],
      developerNotes: [
        'STAGE: ORIENT - Gatekeeping before engagement',
        'Gatekeeping reflexes: legitimacy, time pressure, dismissive, default no',
        'These are defensive reflexes, NOT genuine objections',
        'Seller must earn right to present value'
      ]
    };
  }
  
  /**
   * Mode 2: Company known, product unclear (initial introduction)
   */
  private static generateCompanyKnownGuidance(context: PreTreeContext): PreTreeGuidance {
    const { detectedCompany } = context;
    
    const companyLabel = detectedCompany || 'your company';
    
    return {
      mode: 'COMPANY_KNOWN_PRODUCT_UNCLEAR',
      stage: 'ORIENT',
      internalPosture: `You heard the company name ${companyLabel}, but you've never heard of them. You're skeptical about how they got your number and why they're calling.`,
      promptGuidance: [
        'Brief and guarded',
        'Ask what they sell in simple terms',
        'Do not reveal business details',
        'Do not make assumptions about product category'
      ],
      voiceExamples: [
        `"${companyLabel}? Never heard of you."`,
        '"Okay... what do you guys do?"'
      ],
      allowedTopics: ['who_is_calling', 'how_got_number', 'legitimacy', 'product_type', 'basic_explanation'],
      developerNotes: [
        'STAGE: ORIENT → RELEVANCE - Gatekeeping before engagement',
        'Gatekeeping reflexes available: legitimacy, time pressure, dismissive, default no',
        'If seller persists, ask what they sell',
        'Avoid using detectedProductName as company fallback'
      ]
    };
  }
  
  /**
   * Mode 3: CLARITY_SEEKING - Marcus needs to understand product category
   */
  private static generateClaritySeekingGuidance(context: PreTreeContext): PreTreeGuidance {
    const { detectedProductName } = context;
    
    const primaryQuestion = detectedProductName 
      ? `"Okay, so what exactly is ${detectedProductName}?"` 
      : '"Is this software or consulting?"';
    
    return {
      mode: 'CLARITY_SEEKING',
      stage: 'RELEVANCE',
      internalPosture: 'You need to understand what category this offer belongs to before deciding whether it matters. You\'re not objecting yet - you\'re clarifying.',
      promptGuidance: [
        'Ask ONE short clarifying question about product type',
        'Do not assume any specific category',
        'Remain neutral and brief',
        'Do not reveal pain points or budget'
      ],
      voiceExamples: [
        primaryQuestion,
        '"Who is this for?"'
      ],
      allowedTopics: ['product_type', 'target_buyer', 'problem_solved', 'delivery_model', 'basic_category'],
      developerNotes: [
        'STAGE: RELEVANCE - Focus on "Does this apply to me?"',
        'Help seller classify offer clearly',
        'WHO questions natural: "Who is this for?" "Who uses this?"'
      ]
    };
  }
  
  /**
   * Mode 4: Category understood, value unclear
   */
  private static generateCategoryUnderstoodGuidance(context: PreTreeContext): PreTreeGuidance {
    const { detectedCategory, detectedProductName, productConfidence, recentSellerSignals } = context;
    
    const categoryLabel = detectedCategory || 'this type of solution';
    const productLabel = detectedProductName || 'this';
    const mentionedCompetitors = recentSellerSignals.includes(SELLER_SIGNALS.MENTIONED_COMPETITOR);
    
    const understandingClause = productConfidence.confidence === 'high' || productConfidence.confidence === 'medium'
      ? `You understand ${productLabel} is ${categoryLabel}`
      : `You think ${productLabel} is ${categoryLabel}, but you're not sure`;
    
    return {
      mode: 'CATEGORY_UNDERSTOOD_VALUE_UNCLEAR',
      stage: 'VALUE',
      internalPosture: `${understandingClause}, but you don't see what makes it different or why you'd need it. You're skeptical but not closed.`,
      promptGuidance: [
        'Ask how this is different from other options',
        'Remain professional but skeptical',
        'Do not reveal budget or decision authority',
        mentionedCompetitors ? 'Can mention alternatives if asked' : 'Do not volunteer current solution'
      ],
      voiceExamples: mentionedCompetitors 
        ? ['"We\'ve looked at options. What makes you different?"', '"How\'s this better?"']
        : [`"${categoryLabel}... what makes you different?"`, '"What\'s your angle?"'],
      allowedTopics: ['differentiation', 'competitors', 'unique_value', 'use_cases', 'current_solution_high_level'],
      developerNotes: [
        'STAGE: RELEVANCE → CREDIBILITY → VALUE',
        'WHO questions recur: "Who else uses this?" "Who have you helped?"',
        'May mention having something in place - realistic once category is clear',
        'Pricing questions still premature (value not established)'
      ]
    };
  }
  
  /**
   * Mode 5: Claim understood, evaluation unclear
   * Bold claim detected. Marcus needs mechanics, proof, or may dismiss if seller stays vague.
   * Uses signal-based transitions (not turnNumber) - adaptive behavior, not calendar-based.
   */
  private static generateClaimUnderstoodGuidance(context: PreTreeContext): PreTreeGuidance {
    const { recentSellerSignals } = context;

    const mechanicsExplained = recentSellerSignals.includes(SELLER_SIGNALS.EXPLAINED_MECHANISM);
    const proofProvided = recentSellerSignals.includes(SELLER_SIGNALS.PROVIDED_PROOF);
    const sellerStayedVague = recentSellerSignals.includes(SELLER_SIGNALS.VAGUE_CLAIM);
    const sellerDodgedMechanics = recentSellerSignals.includes(SELLER_SIGNALS.DODGED_MECHANICS);

    // Path 1: Seller stayed vague or dodged → skeptical statement
    if (sellerStayedVague || sellerDodgedMechanics) {
      return {
        mode: 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR',
        stage: 'CREDIBILITY',
        internalPosture: "You heard the claim, but the seller hasn't explained it clearly. You're becoming skeptical and less willing to engage.",
        promptGuidance: [
          'Express skepticism briefly',
          'Do not ask a long follow-up',
          'Do not reveal pain points or budget'
        ],
        voiceExamples: [
          '"That still sounds pretty broad."',
          '"Not sure that applies to us."'
        ],
        allowedTopics: ['credibility', 'relevance', 'differentiation'],
        developerNotes: [
          'Seller made bold claim but failed to explain mechanism clearly',
          'Buyer shifts from curiosity to skepticism because clarity was not earned'
        ]
      };
    }

    // Path 2: Mechanics not explained → ask HOW
    if (!mechanicsExplained) {
      return {
        mode: 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR',
        stage: 'MECHANICS',
        internalPosture: "You heard the claim, but you don't understand how they achieve it. You need a simple explanation of the mechanism before proof matters.",
        promptGuidance: [
          'Ask how they achieve the claim',
          'Keep the question brief and direct',
          'Do not reveal pain points or budget'
        ],
        voiceExamples: [
          '"15%? How do you actually do that?"',
          '"Okay, but how does it work?"'
        ],
        allowedTopics: ['mechanics', 'how_it_works', 'process'],
        developerNotes: [
          'Bold claim triggered mechanics question',
          'Mechanism comes before proof - HOW before WHO',
          'Signal-based: mechanicsExplained = false'
        ]
      };
    }

    // Path 3: Mechanics explained but no proof → ask WHO/PROOF
    if (!proofProvided) {
      return {
        mode: 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR',
        stage: 'CREDIBILITY',
        internalPosture: "You understand the basic mechanism, but you don't trust the claim yet. You need proof or a real example.",
        promptGuidance: [
          'Ask for proof or a specific customer example',
          'Stay skeptical but open',
          'Do not reveal pain points or budget yet'
        ],
        voiceExamples: [
          '"Who\'s actually seen that result?"',
          '"Got a real example?"'
        ],
        allowedTopics: ['proof', 'case_studies', 'customer_examples', 'metrics'],
        developerNotes: [
          'Mechanism has been explained, so buyer can now ask for credibility/proof',
          'Signal-based: mechanicsExplained = true, proofProvided = false'
        ]
      };
    }

    // Path 4: Mechanics + proof established → ask FIT/VALUE
    return {
      mode: 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR',
      stage: 'VALUE',
      internalPosture: "The claim is clearer and somewhat credible, but you still need to understand whether it applies to your situation.",
      promptGuidance: [
        'Ask whether the result applies to a business like yours',
        'Share only limited context if asked directly',
        'Do not reveal budget or authority'
      ],
      voiceExamples: [
        '"Was that with a team like ours?"',
        '"Okay, but would that apply to our setup?"'
      ],
      allowedTopics: ['fit', 'relevance', 'customer_similarity'],
      developerNotes: [
        'Mechanics and proof are partially satisfied, so buyer moves toward fit/value evaluation',
        'Signal-based: mechanicsExplained = true, proofProvided = true'
      ]
    };
  }
  
  /**
   * Map pre-tree mode to suggested tree initialization state subtypes
   * These map to actual state subtypes that exist in BuyerStateTree
   */
  static getTreeInitializationHint(mode: PreTreeMode): string[] {
    switch (mode) {
      case 'NO_PRODUCT_SIGNAL':
        return ['guarded_skeptical', 'busy_professional'];
        
      case 'COMPANY_KNOWN_PRODUCT_UNCLEAR':
        return ['politely_curious', 'busy_professional'];
        
      case 'CLARITY_SEEKING':
        // Marcus is neutral, seeking clarity - not skeptical yet
        return ['politely_curious', 'guarded_skeptical'];
        
      case 'CATEGORY_UNDERSTOOD_VALUE_UNCLEAR':
        // Map differentiation_concern → guarded_skeptical, fit_concern → losing_interest
        return ['guarded_skeptical', 'losing_interest'];
        
      case 'CLAIM_UNDERSTOOD_PROOF_UNCLEAR':
        // Map proof_concern → interested_cautious (needs proof)
        return ['interested_cautious', 'guarded_skeptical'];
    }
  }
}

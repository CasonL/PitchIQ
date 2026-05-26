/**
 * ProductConfidenceDetector
 * 
 * Accumulates signals about what the user is selling across conversation turns.
 * Uses deduplication to prevent repeated signals from inflating confidence.
 * 
 * Confidence Levels:
 * - none (0-25%): No clear product detected
 * - low (25-50%): Weak signals, ask clarification
 * - medium (50-75%): Generate provisional tree (background)
 * - high (75-100%): Activate tree for guidance
 */

export type ProductConfidenceLevel = "none" | "low" | "medium" | "high";

export interface ProductConfidence {
  product: string | null;
  category: string | null;
  confidence: ProductConfidenceLevel;
  confidenceScore: number;
  signals: string[];
  lastUpdated: number;
  
  shouldGenerateTree: boolean;
  shouldActivateTree: boolean;
}

interface SignalEvidence {
  keywords: Set<string>;
  useCases: Set<string>;
  features: Set<string>;
  painPoints: Set<string>;
  hasExplicitName: boolean;
  productIntros: Set<string>;
}

interface DiversityMilestones {
  keywords3: boolean;
  useCases2: boolean;
  features2: boolean;
  painPoints2: boolean;
  multiCategory: boolean;
}

export class ProductConfidenceDetector {
  private cumulativeEvidence: SignalEvidence;
  private diversityMilestones: DiversityMilestones;
  private confidenceScore: number = 0;
  private detectedProduct: string | null = null;
  private detectedCategory: string | null = null;
  private companyHypothesis: string | null = null;
  private currentTurn: number = 0;
  
  private treeGenerated: boolean = false;
  private treeActivated: boolean = false;
  
  private categoryDetectedThisTurn: boolean = false;

  constructor() {
    this.cumulativeEvidence = {
      keywords: new Set(),
      useCases: new Set(),
      features: new Set(),
      painPoints: new Set(),
      hasExplicitName: false,
      productIntros: new Set()
    };
    this.diversityMilestones = {
      keywords3: false,
      useCases2: false,
      features2: false,
      painPoints2: false,
      multiCategory: false
    };
  }
  
  /**
   * Update confidence based on user's latest utterance
   */
  updateConfidence(
    options: {
      text: string;
      turnNumber: number;
      sellerSignals?: { persistent: string[]; turnSpecific: string[] };
      knownProduct?: string;
    }
  ): ProductConfidence {
    const { text: userUtterance, turnNumber, sellerSignals, knownProduct } = options;
    this.currentTurn = turnNumber;
    
    const perTurnSignals = this.extractSignals(userUtterance);
    const newEvidence = this.dedupeAndAccumulate(perTurnSignals);
    
    const newCategoryDetected = this.inferCategory(userUtterance);
    
    const newDiversityBonuses = this.checkDiversityMilestones();
    const scoreIncrease = this.calculateScoreIncrease(newEvidence, newDiversityBonuses, newCategoryDetected);
    
    this.confidenceScore = Math.min(100, this.confidenceScore + scoreIncrease);
    
    // Promote company hypothesis to product if confidence is high enough
    if (!this.detectedProduct && this.companyHypothesis && this.confidenceScore >= 60) {
      this.detectedProduct = this.companyHypothesis;
    }
    
    const confidence = this.getConfidenceLevel(this.confidenceScore);
    const previousConfidence = this.getConfidenceLevel(this.confidenceScore - scoreIncrease);
    
    // Generate tree when confidence reaches MEDIUM or higher (handles skip from NONE to HIGH)
    const shouldGenerate = (confidence === "medium" || confidence === "high") && !this.treeGenerated;
    const shouldActivate = confidence === "high" && !this.treeActivated;
    
    this.logUpdate(perTurnSignals, newEvidence, newDiversityBonuses, scoreIncrease, previousConfidence, confidence);
    
    return {
      product: this.detectedProduct,
      category: this.detectedCategory,
      confidence,
      confidenceScore: this.confidenceScore,
      signals: this.getAccumulatedSignals(),
      lastUpdated: turnNumber,
      shouldGenerateTree: shouldGenerate,
      shouldActivateTree: shouldActivate
    };
  }
  
  /**
   * Extract raw signals from user utterance
   */
  private extractSignals(utterance: string): SignalEvidence {
    const lower = utterance.toLowerCase();
    
    const signals: SignalEvidence = {
      keywords: new Set(),
      useCases: new Set(),
      features: new Set(),
      painPoints: new Set(),
      hasExplicitName: false,
      productIntros: new Set()
    };

    // Broad product pitch openers — catches physical, chemical, SaaS, anything
    const productIntroPatterns = [
      /\bwe(?:'re| are)?\s+(?:offering|selling|supplying|providing|distributing|manufacturing)\b/i,
      /\b(?:calling|reaching out)\s+(?:about|regarding|for|on)\b/i,
      /\bsigned up\s+(?:on|for|to)\s+(?:our\s+)?(?:email|mailing|newsletter)?\s*list\b/i,
      /\bwe\s+(?:noticed|saw|see)\s+you\b/i,
      /\bour\s+(?:product|service|solution|offering|supply|supplies|pricing)\b/i,
      /\bcompetitive\s+(?:price|pricing|rates?)\b/i,
      /\bwe\s+offer\b/i,
      /\bstill\s+interested\b/i,
    ];

    productIntroPatterns.forEach(pattern => {
      if (pattern.test(utterance)) {
        signals.productIntros.add(pattern.source);
      }
    });
    
    const productKeywords = [
      // SaaS / software
      'saas', 'software', 'platform', 'tool', 'solution', 'service',
      'crm', 'erp', 'api', 'automation', 'analytics', 'dashboard',
      'app', 'application', 'system', 'technology',
      // Physical / industrial products
      'product', 'supply', 'supplies', 'chemical', 'chemicals',
      'antifreeze', 'equipment', 'hardware', 'material', 'materials',
      'parts', 'components', 'inventory', 'stock', 'goods',
      // Product categories
      'training', 'coaching', 'learning', 'education', 'development',
      // Buyer personas
      'sales teams', 'sales reps', 'salespeople', 'account executives',
      'sales managers', 'revenue teams', 'go-to-market',
      // Competitors/context
      'gong', 'salesforce', 'hubspot', 'outreach', 'salesloft'
    ];
    
    const useCasePatterns = [
      /help (you|your|teams?|companies?) (to )?(improve|increase|reduce|optimize|manage|track|analyze|automate)/i,
      /designed (for|to help)/i,
      /specifically for \w+ (teams?|companies?|businesses?)/i,
      /solve[sd]? (the )?(problem|challenge|issue) (of|with)/i,
      /(sales|marketing|customer|revenue|productivity|efficiency|close rates?|conversion)/i,
      // Outcome metrics patterns
      /\d+%\s+(increase|improvement|boost|growth|higher|better)/i,
      /(increase|improve|boost).{1,30}\d+%/i,
      /close rates?.{1,20}\d+%/i,
      /conversion.{1,20}\d+%/i,
      // Product category patterns
      /(sales|revenue|go-to-market)\s+(training|coaching|enablement|development)/i,
      /(training|coaching|learning)\s+(platform|solution|system|tool)/i
    ];
    
    const featurePatterns = [
      /integrat(e|ion) with/i,
      /real-time/i,
      /ai-powered/i,
      /automated?/i,
      /dashboard/i,
      /analytics/i,
      /reporting/i,
      /custom(izable|ization)/i,
      /mobile/i,
      // AI as a feature (not product name)
      /\bai\b/i,
      /artificial intelligence/i,
      /machine learning/i,
      // Specific feature patterns
      /ai\s+(role\s*plays?|simulations?|personas?|scenarios?)/i,
      /(voice|conversational|interactive)\s+ai/i,
      /(real-time|live|instant)\s+(feedback|coaching|analysis)/i,
      /(personalized|adaptive|tailored|custom)\s+(training|coaching|learning)/i,
      /(advanced|sophisticated|intelligent)\s+(coaching|analytics|feedback)/i,
      // Comparison/context features
      /(unlike|versus|compared to|different from)\s+\w+/i,
      /(call\s+)?(recording|transcription|analysis)/i
    ];
    
    const painPointPatterns = [
      /challenge (is|we solve)/i,
      /problem (is|with|you're facing)/i,
      /struggle with/i,
      /losing deals/i,
      /waste time/i,
      /inefficient/i,
      /manual process/i,
      /lack of visibility/i
    ];
    
    productKeywords.forEach(keyword => {
      const keywordRegex = new RegExp(`\\b${keyword}\\b`, "i");
      if (keywordRegex.test(lower)) {
        signals.keywords.add(keyword);
      }
    });
    
    useCasePatterns.forEach(pattern => {
      const match = utterance.match(pattern);
      if (match) {
        signals.useCases.add(match[0].toLowerCase());
      }
    });
    
    featurePatterns.forEach(pattern => {
      const match = utterance.match(pattern);
      if (match) {
        signals.features.add(match[0].toLowerCase());
      }
    });
    
    painPointPatterns.forEach(pattern => {
      const match = utterance.match(pattern);
      if (match) {
        signals.painPoints.add(match[0].toLowerCase());
      }
    });
    
    const companyIntroPattern = /\b(from|with|at|representing)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/;
    const companyMatch = utterance.match(companyIntroPattern);
    if (companyMatch) {
      this.companyHypothesis = companyMatch[2];
    }
    
    const explicitProductPatterns = [
      /\b(?:called|named)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/,
      /\b(?:our|the)\s+(?:product|platform|solution|tool|software)\s+(?:is\s+)?(?:called|named)\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/,
      /\b(?:it's|it is)\s+called\s+([A-Z][a-zA-Z0-9]+(?:\s+[A-Z][a-zA-Z0-9]+)?)/
    ];
    
    for (const pattern of explicitProductPatterns) {
      const match = utterance.match(pattern);
      if (match) {
        signals.hasExplicitName = true;
        this.detectedProduct = match[1];
        break;
      }
    }
    
    return signals;
  }
  
  /**
   * Deduplicate signals and add only new evidence
   */
  private dedupeAndAccumulate(perTurnSignals: SignalEvidence): SignalEvidence {
    const newEvidence: SignalEvidence = {
      keywords: new Set(),
      useCases: new Set(),
      features: new Set(),
      painPoints: new Set(),
      hasExplicitName: false,
      productIntros: new Set()
    };
    
    perTurnSignals.keywords.forEach(keyword => {
      if (!this.cumulativeEvidence.keywords.has(keyword)) {
        newEvidence.keywords.add(keyword);
        this.cumulativeEvidence.keywords.add(keyword);
      }
    });
    
    perTurnSignals.useCases.forEach(useCase => {
      if (!this.cumulativeEvidence.useCases.has(useCase)) {
        newEvidence.useCases.add(useCase);
        this.cumulativeEvidence.useCases.add(useCase);
      }
    });
    
    perTurnSignals.features.forEach(feature => {
      if (!this.cumulativeEvidence.features.has(feature)) {
        newEvidence.features.add(feature);
        this.cumulativeEvidence.features.add(feature);
      }
    });
    
    perTurnSignals.painPoints.forEach(painPoint => {
      if (!this.cumulativeEvidence.painPoints.has(painPoint)) {
        newEvidence.painPoints.add(painPoint);
        this.cumulativeEvidence.painPoints.add(painPoint);
      }
    });
    
    if (perTurnSignals.hasExplicitName && !this.cumulativeEvidence.hasExplicitName) {
      newEvidence.hasExplicitName = true;
      this.cumulativeEvidence.hasExplicitName = true;
    }

    perTurnSignals.productIntros.forEach(intro => {
      if (!this.cumulativeEvidence.productIntros.has(intro)) {
        newEvidence.productIntros.add(intro);
        this.cumulativeEvidence.productIntros.add(intro);
      }
    });
    
    return newEvidence;
  }
  
  /**
   * Check if new diversity milestones have been reached
   */
  private checkDiversityMilestones(): string[] {
    const newMilestones: string[] = [];
    
    if (!this.diversityMilestones.keywords3 && this.cumulativeEvidence.keywords.size >= 3) {
      this.diversityMilestones.keywords3 = true;
      newMilestones.push('keywords3');
    }
    
    if (!this.diversityMilestones.useCases2 && this.cumulativeEvidence.useCases.size >= 2) {
      this.diversityMilestones.useCases2 = true;
      newMilestones.push('useCases2');
    }
    
    if (!this.diversityMilestones.features2 && this.cumulativeEvidence.features.size >= 2) {
      this.diversityMilestones.features2 = true;
      newMilestones.push('features2');
    }
    
    if (!this.diversityMilestones.painPoints2 && this.cumulativeEvidence.painPoints.size >= 2) {
      this.diversityMilestones.painPoints2 = true;
      newMilestones.push('painPoints2');
    }
    
    const categoryCount = [
      this.cumulativeEvidence.keywords.size > 0,
      this.cumulativeEvidence.useCases.size > 0,
      this.cumulativeEvidence.features.size > 0,
      this.cumulativeEvidence.painPoints.size > 0
    ].filter(Boolean).length;
    
    if (!this.diversityMilestones.multiCategory && categoryCount >= 3) {
      this.diversityMilestones.multiCategory = true;
      newMilestones.push('multiCategory');
    }
    
    return newMilestones;
  }
  
  /**
   * Calculate score increase based on new evidence and diversity bonuses
   */
  private calculateScoreIncrease(newEvidence: SignalEvidence, diversityBonuses: string[], newCategoryDetected: boolean): number {
    let increase = 0;
    
    increase += newEvidence.keywords.size * 3;
    increase += newEvidence.useCases.size * 10;
    increase += newEvidence.features.size * 8;
    increase += newEvidence.painPoints.size * 7;
    // Each new product intro pattern = strong evidence rep is pitching something real
    increase += newEvidence.productIntros.size * 12;
    // First time we can classify the product category = concrete evidence
    if (newCategoryDetected) increase += 20;
    
    if (newEvidence.hasExplicitName) {
      increase += 30;
    }
    
    diversityBonuses.forEach(milestone => {
      if (milestone === 'keywords3') increase += 5;
      if (milestone === 'useCases2') increase += 8;
      if (milestone === 'features2') increase += 5;
      if (milestone === 'painPoints2') increase += 7;
      if (milestone === 'multiCategory') increase += 10;
    });
    
    return increase;
  }
  
  /**
   * Convert score to confidence level
   */
  private getConfidenceLevel(score: number): ProductConfidenceLevel {
    if (score >= 75) return "high";
    if (score >= 50) return "medium";
    if (score >= 25) return "low";
    return "none";
  }
  
  /**
   * Infer product category from context (runs every turn)
   */
  private inferCategory(utterance: string): boolean {
    const lower = utterance.toLowerCase();
    const prevCategory = this.detectedCategory;
    
    if (!this.detectedCategory || this.detectedCategory === "Unknown") {
      if (lower.match(/\b(saas|software as a service|cloud|platform)\b/)) {
        this.detectedCategory = "B2B SaaS";
      } else if (lower.match(/\b(chemical|antifreeze|solvent|lubricant|coolant|industrial supply|lab supply|reagent)\b/)) {
        this.detectedCategory = "Chemical/Industrial";
      } else if (lower.match(/\b(consulting|services|agency)\b/)) {
        this.detectedCategory = "Professional Services";
      } else if (lower.match(/\b(training|coaching|education)\b/)) {
        this.detectedCategory = "Training/Education";
      } else if (lower.match(/\b(hardware|device|equipment|machinery|tool)\b/)) {
        this.detectedCategory = "Hardware";
      } else if (lower.match(/\b(food|beverage|grocery|produce|ingredient|supply)\b/)) {
        this.detectedCategory = "Food/Beverage";
      }
    }
    return this.detectedCategory !== null && this.detectedCategory !== prevCategory;
  }
  
  /**
   * Get all accumulated signal names
   */
  private getAccumulatedSignals(): string[] {
    const signals: string[] = [];
    
    if (this.cumulativeEvidence.keywords.size > 0) {
      signals.push(`keywords (${this.cumulativeEvidence.keywords.size})`);
    }
    if (this.cumulativeEvidence.useCases.size > 0) {
      signals.push(`use-cases (${this.cumulativeEvidence.useCases.size})`);
    }
    if (this.cumulativeEvidence.features.size > 0) {
      signals.push(`features (${this.cumulativeEvidence.features.size})`);
    }
    if (this.cumulativeEvidence.painPoints.size > 0) {
      signals.push(`pain-points (${this.cumulativeEvidence.painPoints.size})`);
    }
    if (this.cumulativeEvidence.hasExplicitName) {
      signals.push('explicit-name');
    }
    
    return signals;
  }
  
  /**
   * Log confidence update
   */
  private logUpdate(
    perTurnSignals: SignalEvidence,
    newEvidence: SignalEvidence,
    diversityBonuses: string[],
    scoreIncrease: number,
    previousConfidence: ProductConfidenceLevel,
    currentConfidence: ProductConfidenceLevel
  ): void {
    const newSignals: string[] = [];
    if (newEvidence.keywords.size > 0) newSignals.push(`${newEvidence.keywords.size} keywords`);
    if (newEvidence.useCases.size > 0) newSignals.push(`${newEvidence.useCases.size} use-cases`);
    if (newEvidence.features.size > 0) newSignals.push(`${newEvidence.features.size} features`);
    if (newEvidence.painPoints.size > 0) newSignals.push(`${newEvidence.painPoints.size} pain-points`);
    if (newEvidence.hasExplicitName) newSignals.push('explicit-name');
    
    const confidenceChanged = previousConfidence !== currentConfidence;
    
    console.log(`🔍 [ProductConfidence] Turn ${this.currentTurn}: ${currentConfidence.toUpperCase()} (${this.confidenceScore}/100)${confidenceChanged ? ` ← ${previousConfidence}` : ''}`);
    
    if (newSignals.length > 0 || diversityBonuses.length > 0) {
      const parts: string[] = [];
      if (newSignals.length > 0) parts.push(`New: ${newSignals.join(', ')}`);
      if (diversityBonuses.length > 0) parts.push(`Bonuses: ${diversityBonuses.join(', ')}`);
      console.log(`  ${parts.join(' | ')} (+${scoreIncrease} points)`);
    } else {
      console.log(`  No new evidence (repeated signals, no score change)`);
    }
    
    if (this.detectedProduct) {
      console.log(`  Product: "${this.detectedProduct}"${this.detectedCategory ? ` (${this.detectedCategory})` : ''}`);
    } else if (this.companyHypothesis) {
      console.log(`  Company hypothesis: "${this.companyHypothesis}"${this.detectedCategory ? ` (${this.detectedCategory})` : ''}`);
    }
    
    console.log(`  Accumulated: ${this.getAccumulatedSignals().join(', ')}`);
  }
  
  /**
   * Mark tree as generated (called by controller after successful generation)
   */
  markTreeGenerated(): void {
    this.treeGenerated = true;
    console.log(`🌳 [ProductConfidence] Provisional tree marked as generated`);
  }
  
  /**
   * Mark tree as activated (called by controller after successful activation)
   */
  markTreeActivated(): void {
    this.treeActivated = true;
    console.log(`🌳 [ProductConfidence] Tree marked as activated`);
  }
  
  /**
   * Reset state (for testing or new conversation)
   */
  reset(): void {
    this.cumulativeEvidence = {
      keywords: new Set(),
      useCases: new Set(),
      features: new Set(),
      painPoints: new Set(),
      hasExplicitName: false,
      productIntros: new Set()
    };
    this.diversityMilestones = {
      keywords3: false,
      useCases2: false,
      features2: false,
      painPoints2: false,
      multiCategory: false
    };
    this.confidenceScore = 0;
    this.detectedProduct = null;
    this.detectedCategory = null;
    this.companyHypothesis = null;
    this.currentTurn = 0;
    this.treeGenerated = false;
    this.treeActivated = false;
  }
  
  // TODO Phase 2+: Add contradiction detection and confidence revision
  // If product hypothesis changes significantly (e.g., user pivots from SaaS to consulting),
  // we should reduce confidence or reset rather than continuing to accumulate.
  // This could track "product coherence" and trigger partial resets when coherence breaks.
  
  // TODO Phase 2+: Support multi-category tagging
  // Some products span categories (e.g., "B2B SaaS" + "Training/Education" + "Sales Enablement").
  // Category inference should eventually support multiple tags instead of single-label classification.
}

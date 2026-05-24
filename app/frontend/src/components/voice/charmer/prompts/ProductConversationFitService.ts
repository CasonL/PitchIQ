/**
 * ProductConversationFitService.ts
 * 
 * PROBLEM: System biased toward SaaS/service sales patterns
 * Marcus asks "Who saw results?" for chemicals = sounds robotic/wrong
 * 
 * SOLUTION: Product-category realism layer
 * - Classify product archetype (SaaS, chemical, equipment, service, etc.)
 * - Provide conversation physics for realistic buyer behavior
 * - Map abstract buyer acts to product-specific natural language
 * 
 * ARCHITECTURE ROLE:
 * - Parameterizes BuyerStateTree (doesn't replace it)
 * - Informs ResponsePatternService response mapping
 * - Guards against unrealistic action cards
 */

export type ProductArchetype =
  | "saas"
  | "professional_service" 
  | "training_or_coaching"
  | "physical_product"
  | "commodity_or_material"
  | "chemical_or_industrial_supply"
  | "equipment_or_hardware"
  | "agency_or_marketing_service"
  | "financial_or_insurance"
  | "unknown";

export interface ProductConversationPhysics {
  archetype: ProductArchetype;
  buyerEvaluationCriteria: string[];
  naturalQuestions: string[];
  unnaturalQuestions: string[];
  commonObjections: string[];
  proofTypes: string[];
  switchingConcerns: string[];
  complianceConcerns: string[];
  
  // Response act mappings
  responseActMappings: {
    [key: string]: {
      naturalPhrasing: string[];
      avoidPhrasing: string[];
      contextualFactors: string[];
    };
  };
}

export class ProductConversationFitService {
  
  private static readonly ARCHETYPE_KEYWORDS = {
    saas: ['software', 'platform', 'saas', 'app', 'dashboard', 'analytics', 'crm', 'automation', 'integration', 'api'],
    professional_service: ['consulting', 'advisory', 'strategy', 'implementation', 'audit', 'assessment', 'professional services'],
    training_or_coaching: ['training', 'coaching', 'course', 'workshop', 'certification', 'learning', 'education', 'development'],
    physical_product: ['product', 'device', 'tool', 'machine', 'equipment', 'hardware', 'physical'],
    commodity_or_material: ['material', 'supply', 'raw material', 'commodity', 'bulk'],
    chemical_or_industrial_supply: ['chemical', 'industrial', 'compound', 'solution', 'solvent', 'catalyst', 'reagent', 'grade'],
    equipment_or_hardware: ['equipment', 'hardware', 'machinery', 'device', 'system', 'unit', 'installation'],
    agency_or_marketing_service: ['marketing', 'advertising', 'agency', 'campaign', 'content', 'social media', 'seo', 'ppc'],
    financial_or_insurance: ['insurance', 'financial', 'loan', 'credit', 'investment', 'banking', 'coverage']
  };

  /**
   * MAIN METHOD: Classify product and return conversation physics
   */
  static analyzeProduct(
    sellerInput: string,
    conversationHistory: string[] = []
  ): ProductConversationPhysics {
    
    // Step 1: Classify product archetype from input patterns
    const archetype = this.classifyProductArchetype(sellerInput, conversationHistory);
    
    // Step 2: Return conversation physics for this archetype
    return this.getConversationPhysics(archetype);
  }
  
  /**
   * Detect product archetype from seller language patterns
   */
  private static classifyProductArchetype(
    sellerInput: string, 
    conversationHistory: string[]
  ): ProductArchetype {
    
    const fullContext = [sellerInput, ...conversationHistory].join(' ').toLowerCase();
    const scores: Record<ProductArchetype, number> = {
      saas: 0,
      professional_service: 0,
      training_or_coaching: 0,
      physical_product: 0,
      commodity_or_material: 0,
      chemical_or_industrial_supply: 0,
      equipment_or_hardware: 0,
      agency_or_marketing_service: 0,
      financial_or_insurance: 0,
      unknown: 0
    };
    
    // Score each archetype based on keyword matches
    for (const [archetype, keywords] of Object.entries(this.ARCHETYPE_KEYWORDS)) {
      for (const keyword of keywords) {
        if (fullContext.includes(keyword)) {
          scores[archetype as ProductArchetype] += 1;
          
          // Boost score for exact matches
          if (sellerInput.toLowerCase().includes(keyword)) {
            scores[archetype as ProductArchetype] += 1;
          }
        }
      }
    }
    
    // Special case detection patterns
    this.applySpecialDetectionRules(fullContext, scores);
    
    // Return highest scoring archetype (with minimum threshold)
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore < 1) return 'unknown';
    
    return Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as ProductArchetype || 'unknown';
  }
  
  /**
   * Apply special detection patterns for edge cases
   */
  private static applySpecialDetectionRules(
    context: string,
    scores: Record<ProductArchetype, number>
  ): void {
    
    // Chemical indicators
    if (/grade|spec|sds|msds|safety data|purity|concentration|formula/i.test(context)) {
      scores.chemical_or_industrial_supply += 2;
    }
    
    // SaaS/Software indicators  
    if (/increase.*\d+%|save.*\d+%|roi|automation|integration|api/i.test(context)) {
      scores.saas += 2;
    }
    
    // Service indicators
    if (/we do|we help|our team|implementation|consulting|advisory/i.test(context)) {
      scores.professional_service += 2;
    }
    
    // Training indicators
    if (/training|course|certification|learn|skill|development/i.test(context)) {
      scores.training_or_coaching += 2;
    }
    
    // Equipment indicators
    if (/warranty|maintenance|installation|specs|capacity|model/i.test(context)) {
      scores.equipment_or_hardware += 2;
    }
  }
  
  /**
   * Get conversation physics for product archetype
   */
  private static getConversationPhysics(archetype: ProductArchetype): ProductConversationPhysics {
    
    switch (archetype) {
      
      case 'chemical_or_industrial_supply':
        return {
          archetype,
          buyerEvaluationCriteria: [
            "application fit",
            "grade/specification", 
            "safety data (SDS/MSDS)",
            "compliance/certifications",
            "price per unit/volume",
            "supply reliability",
            "storage and handling requirements",
            "current supplier comparison",
            "quality consistency"
          ],
          naturalQuestions: [
            "What kind of chemical is it?",
            "What's it used for?",
            "What grade or spec are we talking about?",
            "Do you have a spec sheet or SDS?", 
            "What volume are we talking?",
            "How does it compare to our current supplier?",
            "Any storage or handling requirements?",
            "What's the purity or concentration?",
            "Do you have COA or quality data?"
          ],
          unnaturalQuestions: [
            "Who has seen results with your product?",
            "How does your platform work?",
            "What does onboarding look like?",
            "How does the AI adapt?",
            "What's the user interface like?",
            "Can you show me a demo?"
          ],
          commonObjections: [
            "We already have a supplier",
            "Switching chemicals is risky", 
            "Need to verify compatibility",
            "Need safety/compliance documentation",
            "Price needs to justify switching",
            "Our process is already validated",
            "Need consistent quality"
          ],
          proofTypes: [
            "spec sheet",
            "SDS/MSDS",
            "COA (Certificate of Analysis)",
            "certifications",
            "sample/test batch",
            "supplier references",
            "quality consistency data",
            "compliance documentation"
          ],
          switchingConcerns: [
            "process validation",
            "regulatory compliance",
            "quality consistency",
            "supply reliability",
            "compatibility testing"
          ],
          complianceConcerns: [
            "safety regulations",
            "environmental compliance", 
            "industry certifications",
            "handling requirements",
            "disposal regulations"
          ],
          responseActMappings: {
            challenge_proof: {
              naturalPhrasing: [
                "Do you have a spec sheet or SDS?",
                "Can I see documentation on it?",
                "What kind of quality data do you have?",
                "Do you have test results or a COA?"
              ],
              avoidPhrasing: [
                "Who has seen results?",
                "What customers have tried this?",
                "How does it perform?"
              ],
              contextualFactors: ["compliance_critical", "safety_focused", "documentation_required"]
            },
            ask_mechanism: {
              naturalPhrasing: [
                "What's the actual application?",
                "Where does this fit in the process?",
                "What's the use case exactly?",
                "How does this replace what we use now?"
              ],
              avoidPhrasing: [
                "How does the technology work?",
                "What's the methodology?",
                "How is it implemented?"
              ],
              contextualFactors: ["process_integration", "application_specific"]
            }
          }
        };
        
      case 'saas':
        return {
          archetype,
          buyerEvaluationCriteria: [
            "feature fit",
            "integration capabilities",
            "user adoption",
            "ROI/measurable outcomes",
            "implementation complexity",
            "ongoing support",
            "security/compliance",
            "current tool comparison",
            "scalability"
          ],
          naturalQuestions: [
            "How does it work exactly?",
            "Who has seen those results?", 
            "What does implementation look like?",
            "How does it integrate with what we have?",
            "What's the learning curve?",
            "How is this different from [current tool]?",
            "What kind of ongoing support?",
            "Can you show me a demo?"
          ],
          unnaturalQuestions: [
            "What grade is it?",
            "Do you have a spec sheet?",
            "What are the storage requirements?",
            "What's the purity?",
            "Any handling concerns?"
          ],
          commonObjections: [
            "We already use [existing tool]",
            "Change management is hard",
            "Integration concerns", 
            "Need to see ROI",
            "Team adoption challenges",
            "Security/compliance concerns"
          ],
          proofTypes: [
            "case studies",
            "customer testimonials",
            "demo/trial",
            "ROI calculations",
            "reference customers",
            "implementation timelines"
          ],
          switchingConcerns: [
            "data migration",
            "user training",
            "workflow disruption",
            "integration complexity",
            "contract terms"
          ],
          complianceConcerns: [
            "data security",
            "privacy regulations",
            "industry compliance",
            "access controls"
          ],
          responseActMappings: {
            challenge_proof: {
              naturalPhrasing: [
                "Who has actually seen that result?",
                "Can you show me a case study?",
                "What customers have tried this?",
                "Do you have references I can talk to?"
              ],
              avoidPhrasing: [
                "Do you have a spec sheet?",
                "What's the documentation?",
                "Can I see quality data?"
              ],
              contextualFactors: ["results_focused", "social_proof_important", "demo_preferred"]
            },
            ask_mechanism: {
              naturalPhrasing: [
                "How does the platform actually work?",
                "What's the process like?", 
                "Walk me through how this works",
                "How does the technology do that?"
              ],
              avoidPhrasing: [
                "What's the application?",
                "Where does this fit in the process?",
                "What's the use case?"
              ],
              contextualFactors: ["technology_focused", "process_workflow", "feature_demonstration"]
            }
          }
        };
        
      case 'equipment_or_hardware':
        return {
          archetype,
          buyerEvaluationCriteria: [
            "specifications/capacity",
            "reliability/uptime",
            "maintenance requirements",
            "warranty/support",
            "installation complexity",
            "operator training needed",
            "current equipment comparison",
            "total cost of ownership"
          ],
          naturalQuestions: [
            "What are the specs?",
            "What's the capacity?",
            "What's maintenance like?",
            "What kind of warranty?",
            "How complicated is installation?",
            "What training is needed?",
            "How reliable is it?",
            "What's total cost of ownership?"
          ],
          unnaturalQuestions: [
            "How does the AI work?",
            "What's the user interface?",
            "How do you onboard users?",
            "What grade is it?"
          ],
          commonObjections: [
            "Current equipment works fine",
            "Installation disruption",
            "Operator training needed",
            "Maintenance costs",
            "Reliability concerns",
            "Capital expense timing"
          ],
          proofTypes: [
            "specifications",
            "performance data",
            "customer installations",
            "reliability statistics",
            "maintenance records",
            "warranty terms"
          ],
          switchingConcerns: [
            "installation downtime",
            "operator retraining",
            "process changes",
            "maintenance procedures",
            "spare parts availability"
          ],
          complianceConcerns: [
            "safety certifications",
            "environmental regulations",
            "industry standards",
            "installation codes"
          ],
          responseActMappings: {
            challenge_proof: {
              naturalPhrasing: [
                "What kind of reliability data do you have?",
                "Where else is this installed?",
                "What's the maintenance track record?",
                "Do you have performance specs?"
              ],
              avoidPhrasing: [
                "Who saw results?",
                "What customers tried this?",
                "How does it perform?"
              ],
              contextualFactors: ["reliability_critical", "performance_data", "installation_references"]
            }
          }
        };
        
      default:
        return this.getDefaultConversationPhysics(archetype);
    }
  }
  
  /**
   * Default/fallback conversation physics for unknown or generic products
   */
  private static getDefaultConversationPhysics(archetype: ProductArchetype): ProductConversationPhysics {
    return {
      archetype,
      buyerEvaluationCriteria: ["fit", "value", "cost", "alternatives", "timing"],
      naturalQuestions: [
        "What exactly are you selling?",
        "How does this help me?",
        "What's this cost?",
        "How's this different from what's out there?"
      ],
      unnaturalQuestions: [],
      commonObjections: [
        "Not interested",
        "Happy with current solution",
        "No budget",
        "Wrong timing"
      ],
      proofTypes: ["case studies", "references", "documentation"],
      switchingConcerns: ["cost", "disruption", "learning curve"],
      complianceConcerns: ["none identified"],
      responseActMappings: {
        challenge_proof: {
          naturalPhrasing: ["Can you prove that?", "Show me evidence", "Who else has done this?"],
          avoidPhrasing: [],
          contextualFactors: ["general_skepticism"]
        },
        ask_mechanism: {
          naturalPhrasing: ["How does this work?", "What's the process?", "Walk me through it"],
          avoidPhrasing: [],
          contextualFactors: ["clarity_seeking"]
        }
      }
    };
  }
  
  /**
   * Map abstract buyer act to product-specific natural language
   */
  static mapResponseAct(
    abstractAct: string,
    productPhysics: ProductConversationPhysics,
    buyerState?: any
  ): {
    naturalPhrasing: string[];
    avoidPhrasing: string[];
    contextualFactors: string[];
  } {
    
    const mapping = productPhysics.responseActMappings[abstractAct];
    
    if (!mapping) {
      // Fallback to generic mapping
      return {
        naturalPhrasing: [`[Generic ${abstractAct}]`],
        avoidPhrasing: [],
        contextualFactors: ["fallback_generic"]
      };
    }
    
    return mapping;
  }
  
  /**
   * Guard: Check if response makes sense for product category
   */
  static validateResponseRealism(
    voiceExamples: string[],
    productPhysics: ProductConversationPhysics
  ): {
    isRealistic: boolean;
    issues: string[];
    suggestions: string[];
  } {
    
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // Check for unnatural questions
    for (const example of voiceExamples) {
      for (const unnatural of productPhysics.unnaturalQuestions) {
        if (example.toLowerCase().includes(unnatural.toLowerCase().slice(0, -1))) { // Remove punctuation for matching
          issues.push(`"${example}" sounds unnatural for ${productPhysics.archetype}`);
          suggestions.push(`Try: ${productPhysics.naturalQuestions[0] || 'Ask product-appropriate question'}`);
        }
      }
    }
    
    return {
      isRealistic: issues.length === 0,
      issues,
      suggestions
    };
  }
}

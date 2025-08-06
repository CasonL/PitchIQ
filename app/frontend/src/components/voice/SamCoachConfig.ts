/**
 * Configuration for the SamCoach AI agent
 * This file centralizes all configuration for the Sam conversation flow
 */

export interface SamCoachConfig {
  // Core configuration
  maxAttempts: number;
  inactivityTimeoutSeconds: number;
  
  // Conversation structure
  requiredInformation: RequiredInformationConfig[];
  
  // Prompt template
  promptTemplate: string;
  
  // Completion detection
  completionPhrases: string[];
}

export interface RequiredInformationConfig {
  id: string;
  name: string;
  description: string;
  questionPatterns: string[];
  extractionKeywords: string[];
  validationFunction?: (value: string) => boolean;
  followUpQuestions?: string[];
}

/**
 * Default configuration for Sam Coach
 */
export const DEFAULT_SAM_CONFIG: SamCoachConfig = {
  maxAttempts: 3,
  inactivityTimeoutSeconds: 60,
  
  requiredInformation: [
    {
      id: 'product_service',
      name: 'Product or Service',
      description: 'What the user sells or provides to customers',
      questionPatterns: [
        'what product or service do you sell',
        'what do you sell',
        'what is your product',
        'what is your service',
        'tell me about your product',
        'tell me what you sell'
      ],
      extractionKeywords: [
        'sell', 'training', 'service', 'ai', 'coaching', 'software', 'platform',
        'solution', 'product', 'offer', 'provide', 'help', 'consulting'
      ],
      validationFunction: (value: string) => value.length > 5,
      followUpQuestions: [
        "Could you tell me a bit more about your product?",
        "What specific problem does your product solve?"
      ]
    },
    {
      id: 'target_market',
      name: 'Target Market',
      description: 'The ideal customer or market segment for the user\'s product/service',
      questionPatterns: [
        'who is your target market',
        'target market',
        'who do you sell to',
        'ideal customer',
        'target market or ideal customer',
        'who are your customers'
      ],
      extractionKeywords: [
        'team', 'teams', 'market', 'customer', 'customers', 'business', 'businesses', 
        'company', 'companies', 'organization', 'organizations', 'b2b', 'b2c', 
        'enterprise', 'small business', 'startup', 'startups', 'corporate',
        'large', 'medium', 'small', 'industry', 'sector', 'professional',
        'manager', 'director', 'executive', 'owner', 'founder', 'people', 'clients'
      ],
      validationFunction: (value: string) => value.length > 5,
      followUpQuestions: [
        "Could you be more specific about your target market?",
        "What industry or sector are your customers primarily in?"
      ]
    }
  ],
  
  promptTemplate: `You are Sam, a sales training coach. Your ONLY job is to collect exactly 2 pieces of information from the user:

1. What product or service they sell
2. Who their target market/ideal customer is

CONVERSATION FLOW:
- Start by asking: "Hi! I'm Sam, your sales coach. What product or service do you sell?"
- Wait for their answer about their product/service
- Then ask: "Great! And who is your target market or ideal customer?"
- Wait for their answer about target market
- Once you have BOTH pieces of information, say: "Excellent! I'll now generate your practice partner based on this information."

RULES:
- Keep your OWN responses concise (≈1-2 sentences) but allow the USER to speak at any length.
- If the USER includes additional context beyond the required info, politely acknowledge and extract the PRODUCT/SERVICE and TARGET MARKET without asking them to repeat or shorten.
- Never apologise for the user's verbosity and do NOT restart the conversation unless the USER explicitly asks to start over.
- Do not provide sales advice and avoid topics outside of collecting these 2 pieces of information.
- Ask only a clarifying question if one of the two required items is still missing.
- As soon as BOTH items are captured, immediately say the completion phrase and stop asking further questions`,

  completionPhrases: [
    "excellent! i'll now generate", 
    "i'll now generate your practice partner",
    "perfect! let me create",
    "great! i'll create your personas",
    "wonderful! let me generate",
    "amazing! i'll create",
    "fantastic! let me create",
    "excellent! i'll create",
    "perfect! i'll generate",
    "great! let me create your custom ai prospect",
    "i'll now generate your practice partner based on this information"
  ]
};

/**
 * Get the current Sam Coach configuration
 * This allows for future customization based on user preferences or A/B testing
 */
export function getSamCoachConfig(): SamCoachConfig {
  // In the future, this could load from user preferences or other sources
  return DEFAULT_SAM_CONFIG;
}

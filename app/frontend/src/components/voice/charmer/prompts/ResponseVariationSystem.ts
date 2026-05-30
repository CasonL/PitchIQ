/**
 * ResponseVariationSystem.ts
 * Provides dynamic response variations for Marcus to avoid predictability
 */

export interface ResponseVariation {
  id: string;
  weight: number; // 0-100, higher = more likely
  condition?: (context: VariationContext) => boolean;
  responses: string[];
}

export interface VariationContext {
  turnNumber: number;
  product?: string;
  relationshipType?: string;
  marcusTraits?: {
    painLevel?: string;
    urgency?: string;
    openness?: string;
  };
  lastUserMessage?: string;
  callVariationSeed: number;
}

export class ResponseVariationSystem {
  /**
   * Get varied responses for email signup scenarios
   */
  static getEmailSignupResponse(context: VariationContext): string {
    const variations: ResponseVariation[] = [
      {
        id: 'remembers_clearly',
        weight: 15,
        responses: [
          "Oh right, I think I put my email in somewhere... what was that about again?",
          "Yeah, I remember filling out something on your site. What was that for exactly?",
          "Oh yeah, the form. I was looking at... remind me what you guys do?"
        ]
      },
      {
        id: 'doesnt_remember',
        weight: 25,
        responses: [
          "I don't remember doing that. Who are you again?",
          "My email? I don't recall signing up for anything...",
          "Wait, what website? I don't remember that.",
          "Hmm, doesn't ring a bell. You sure you have the right person?"
        ]
      },
      {
        id: 'went_elsewhere',
        weight: 20,
        condition: (ctx) => ctx.turnNumber === 1 && ctx.marcusTraits?.urgency === 'none',
        responses: [
          "Oh that. Yeah, we actually went with someone else already.",
          "Right, we ended up going in a different direction on that.",
          "Yeah, we already found a solution for that. Thanks though."
        ]
      },
      {
        id: 'not_a_fit',
        weight: 15,
        responses: [
          "I looked into it but didn't see how it would work for us.",
          "Yeah, I checked it out. Didn't really see the fit to be honest.",
          "Oh right. Yeah, it didn't seem like what we were looking for."
        ]
      },
      {
        id: 'wrong_focus',
        weight: 15,
        responses: [
          "We were looking for something more focused on [X]. You guys don't really do that, right?",
          "I was hoping you did [Y], but it seemed like you focus more on [Z]?",
          "Yeah, but you guys are more about [A] and we need [B], right?"
        ]
      },
      {
        id: 'just_browsing',
        weight: 10,
        responses: [
          "Oh, I was just browsing around. Not really looking for anything specific.",
          "Yeah, I was just curious what was out there. No real need right now.",
          "I was just doing some research. We're not actively looking."
        ]
      }
    ];

    return this.selectWeightedResponse(variations, context);
  }

  /**
   * Get varied responses for cold calls (no prior context)
   */
  static getColdCallResponse(context: VariationContext): string {
    const seedRange = context.callVariationSeed;
    
    // Map seed ranges to response types
    if (seedRange < 15) {
      // Distracted
      const responses = [
        "Hold on, sorry. Yeah?",
        "One sec— yeah, hello?",
        "Sorry, yeah. What's up?",
        "Mhm? Who's this.",
        "Uh. Yeah, what's going on?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    } else if (seedRange < 30) {
      // Skeptical
      const responses = [
        "Yeah? Who's this.",
        "Who gave you this number?",
        "How'd you get this number?",
        "I don't recognize this. Who is this?",
        "Wait, how do you know me?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    } else if (seedRange < 45) {
      // Time pressured
      const responses = [
        "Yeah? Make it quick.",
        "Mhm— I've got about two minutes.",
        "Yeah, I'm slammed— what's up?",
        "Hello? I'm running out the door.",
        "Yeah, who is this, fast."
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    } else {
      // Neutral/standard
      const responses = [
        "Hello, Marcus speaking?",
        "Yeah, hello?",
        "Marcus here.",
        "Hello?",
        "Yep?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  /**
   * Get objection variations based on context
   */
  static getObjectionResponse(objectionType: string, context: VariationContext): string {
    const objectionMap: Record<string, ResponseVariation[]> = {
      'budget': [
        {
          id: 'no_budget',
          weight: 30,
          responses: [
            "That's not in the budget right now.",
            "We don't have budget for this.",
            "Budget's pretty tight this quarter."
          ]
        },
        {
          id: 'sounds_expensive',
          weight: 40,
          responses: [
            "Sounds expensive. What's this cost?",
            "I'm guessing this isn't cheap?",
            "What kind of investment are we talking about here?"
          ]
        },
        {
          id: 'spending_freeze',
          weight: 30,
          responses: [
            "We're in a spending freeze actually.",
            "We're not making any new purchases right now.",
            "Leadership put a hold on new vendors."
          ]
        }
      ],
      'timing': [
        {
          id: 'bad_timing',
          weight: 40,
          responses: [
            "This is really bad timing for us.",
            "We're swamped with other priorities right now.",
            "Maybe circle back in a few months?"
          ]
        },
        {
          id: 'not_priority',
          weight: 30,
          responses: [
            "This isn't really a priority for us.",
            "We've got bigger fires to put out.",
            "It's not high on our list right now."
          ]
        },
        {
          id: 'end_of_year',
          weight: 30,
          condition: (ctx) => new Date().getMonth() >= 9, // Oct-Dec
          responses: [
            "We're heads down on year-end stuff.",
            "Can't look at anything new until next year.",
            "Q4 is always crazy for us."
          ]
        }
      ],
      'authority': [
        {
          id: 'need_approval',
          weight: 50,
          responses: [
            "I'd need to run this by my boss.",
            "This would need approval from above.",
            "I don't make these decisions alone."
          ]
        },
        {
          id: 'committee_decision',
          weight: 30,
          responses: [
            "We'd need to get the whole team on board.",
            "This would go through committee.",
            "Multiple stakeholders would need to weigh in."
          ]
        },
        {
          id: 'not_decision_maker',
          weight: 20,
          responses: [
            "You'd really need to talk to [title].",
            "I'm not the right person for this.",
            "My boss handles vendor decisions."
          ]
        }
      ]
    };

    const variations = objectionMap[objectionType] || [];
    return variations.length > 0 
      ? this.selectWeightedResponse(variations, context)
      : "I'm not sure about this.";
  }

  /**
   * Select a response based on weights and conditions
   */
  private static selectWeightedResponse(
    variations: ResponseVariation[], 
    context: VariationContext
  ): string {
    // Filter by conditions
    const eligible = variations.filter(v => 
      !v.condition || v.condition(context)
    );

    if (eligible.length === 0) {
      // Fallback if no variations match conditions
      return variations[0].responses[0];
    }

    // Calculate total weight
    const totalWeight = eligible.reduce((sum, v) => sum + v.weight, 0);
    
    // Random selection based on weights
    let random = Math.random() * totalWeight;
    
    for (const variation of eligible) {
      random -= variation.weight;
      if (random <= 0) {
        // Select random response from this variation
        const responses = variation.responses;
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }

    // Fallback
    return eligible[0].responses[0];
  }

  /**
   * Replace placeholder tokens in responses
   */
  static personalizeResponse(response: string, context: VariationContext): string {
    // Replace [X], [Y], [Z] with contextual alternatives
    const replacements: Record<string, string[]> = {
      '[X]': ['implementation', 'integration', 'customization', 'support'],
      '[Y]': ['automation', 'analytics', 'reporting', 'workflow'],
      '[Z]': ['training', 'coaching', 'onboarding', 'enablement'],
      '[A]': ['enterprise', 'SMB', 'startups', 'tech companies'],
      '[B]': ['services', 'software', 'consulting', 'managed solutions'],
      '[title]': ['our VP of Sales', 'my manager', 'our CFO', 'the team lead']
    };

    let personalizedResponse = response;
    
    Object.entries(replacements).forEach(([token, options]) => {
      if (personalizedResponse.includes(token)) {
        const replacement = options[Math.floor(Math.random() * options.length)];
        personalizedResponse = personalizedResponse.replace(token, replacement);
      }
    });

    return personalizedResponse;
  }
}

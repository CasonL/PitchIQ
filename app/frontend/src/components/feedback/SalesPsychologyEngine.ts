/**
 * SalesPsychologyEngine.ts
 * Generates deep sales psychology insights - not surface-level feedback
 * Creates explanations like "When you talk about HIS problems, his brain is too busy to think 'sales pitch'"
 */

import type { RankedMoment } from './MomentRankingEngine';

export interface PsychologyInsight {
  principle: string;
  explanation: string;
  whyItMatters: string;
  howToApply: string;
  commonMistake: string;
  correctApproach: string;
  brainScience?: string;
}

export interface MomentAnalysis {
  moment: RankedMoment;
  insight: PsychologyInsight;
  multipleChoice: {
    question: string;
    options: Array<{
      letter: 'A' | 'B' | 'C';
      text: string;
      isCorrect: boolean;
      explanation: string;
    }>;
  };
  practiceScenario: {
    setup: string;
    betterResponse: string;
  };
}

export class SalesPsychologyEngine {
  /**
   * Generate deep psychology analysis for a ranked moment
   */
  static analyzeMoment(moment: RankedMoment): MomentAnalysis {
    const insight = this.generateInsight(moment);
    const multipleChoice = this.generatePsychologyCheck(moment, insight);
    const practiceScenario = this.generatePracticeScenario(moment);

    return {
      moment,
      insight,
      multipleChoice,
      practiceScenario
    };
  }

  /**
   * Generate deep psychology insight based on moment type
   */
  private static generateInsight(moment: RankedMoment): PsychologyInsight {
    const principles = moment.psychologyPrinciples;

    if (principles.includes('cognitive_load_theory')) {
      return {
        principle: 'Cognitive Load Theory',
        explanation: "When you talk about HIS problems, his brain is too busy to think 'sales pitch'",
        whyItMatters: "People can't multitask. When you talk about Marcus's problems, his brain is fully occupied with his own world. He doesn't have spare mental bandwidth to keep thinking 'this person is selling to me.' But when you talk about yourself, his brain has room to categorize you as 'just another sales rep' and shut down.",
        howToApply: "Always lead with their world, not yours. Ask about their challenges before mentioning your solution.",
        commonMistake: "Leading with features and capabilities",
        correctApproach: "Lead with their pain points and challenges",
        brainScience: "The prefrontal cortex can only process limited information simultaneously. Problem-focused conversation engages their analytical brain, leaving no capacity for sales resistance."
      };
    }

    if (principles.includes('rapport_building')) {
      return {
        principle: 'Trust Psychology',
        explanation: "People buy from people they trust, not from people who immediately pitch",
        whyItMatters: "Trust is built through understanding, not through explaining. When you jump straight into your pitch, you signal that you care more about your agenda than their problems. This triggers psychological defense mechanisms.",
        howToApply: "Spend the first 3-5 minutes purely understanding their world. No pitching, just genuine curiosity.",
        commonMistake: "Pitching before building rapport",
        correctApproach: "Understand first, then be understood",
        brainScience: "The amygdala (fear center) activates when strangers immediately ask for something. Building rapport first calms this response."
      };
    }

    if (principles.includes('pain_amplification')) {
      return {
        principle: 'Pain Amplification Psychology',
        explanation: "Pain motivates action more than pleasure. When someone reveals pain, dig deeper immediately.",
        whyItMatters: "Most people live with problems they've accepted as 'normal.' When they mention a challenge, that's your golden moment to help them realize the true cost of inaction.",
        howToApply: "When they mention any problem, ask: 'How long has this been an issue?' 'What's the impact on your team?' 'What happens if this continues?'",
        commonMistake: "Moving past pain signals too quickly",
        correctApproach: "Amplify and quantify every pain point they mention",
        brainScience: "Loss aversion is 2x stronger than gain motivation. People will work harder to avoid pain than to gain pleasure."
      };
    }

    if (principles.includes('objection_psychology')) {
      return {
        principle: 'Objection Reframing',
        explanation: "Objections are often requests for more information, not final rejections",
        whyItMatters: "When someone says 'it's too expensive,' they're really saying 'I don't see enough value yet.' Your job is to uncover what value they need to see.",
        howToApply: "Never defend against objections. Instead, ask questions: 'What would need to be true for this to make sense financially?'",
        commonMistake: "Defending or explaining when faced with objections",
        correctApproach: "Reframe objections as information-gathering opportunities",
        brainScience: "Resistance creates more resistance (psychological reactance). Questions bypass this by engaging their problem-solving brain."
      };
    }

    if (principles.includes('anchoring_bias')) {
      return {
        principle: 'Value Anchoring',
        explanation: "The first number mentioned becomes the reference point for all future comparisons",
        whyItMatters: "If you anchor on cost, everything feels expensive. If you anchor on value (time saved, revenue gained), cost becomes an investment.",
        howToApply: "Always establish value before discussing price. 'If this saved you 10 hours per week, what would that be worth?'",
        commonMistake: "Discussing price before establishing value",
        correctApproach: "Anchor on value, then present price as an investment",
        brainScience: "The anchoring bias is a cognitive shortcut where the brain uses the first piece of information as a reference point for all decisions."
      };
    }

    // Default insight for other principles
    return {
      principle: 'Sales Psychology Principle',
      explanation: "Understanding buyer psychology is key to effective selling",
      whyItMatters: "Every interaction either builds or destroys trust, creates or reduces resistance.",
      howToApply: "Focus on understanding their world before explaining yours",
      commonMistake: "Treating sales as information transfer",
      correctApproach: "Treat sales as problem-solving conversation"
    };
  }

  /**
   * Generate psychology-based multiple choice question
   */
  private static generatePsychologyCheck(moment: RankedMoment, insight: PsychologyInsight): MomentAnalysis['multipleChoice'] {
    const principles = moment.psychologyPrinciples;

    if (principles.includes('cognitive_load_theory')) {
      return {
        question: "Marcus knows you're a sales rep. Why did talking about your 20% feature make him reject you?",
        options: [
          {
            letter: 'A',
            text: "People trust you less when you brag about your product",
            isCorrect: false,
            explanation: "While bragging can hurt trust, this isn't the core psychological issue here."
          },
          {
            letter: 'B',
            text: "When you talk about HIS problems, his brain is too busy to think 'sales pitch'",
            isCorrect: true,
            explanation: "Correct! People can't multitask. When you talk about Marcus's problems, his brain is fully occupied with his own world. He doesn't have spare mental bandwidth to keep thinking 'this person is selling to me.' But when you talk about yourself, his brain has room to categorize you as 'just another sales rep' and shut down."
          },
          {
            letter: 'C',
            text: "He doesn't care about your product's numbers until he likes you first",
            isCorrect: false,
            explanation: "While rapport matters, this specific situation is about cognitive load and attention management."
          }
        ]
      };
    }

    if (principles.includes('rapport_building')) {
      return {
        question: "Why did Marcus become resistant when you pitched immediately?",
        options: [
          {
            letter: 'A',
            text: "He wasn't ready to hear about solutions yet",
            isCorrect: false,
            explanation: "This is partially true but doesn't explain the psychological mechanism."
          },
          {
            letter: 'B',
            text: "Immediate pitching triggers psychological defense mechanisms",
            isCorrect: true,
            explanation: "Correct! When strangers immediately ask for something, it activates the amygdala (fear center). People need to trust you before they'll listen to you."
          },
          {
            letter: 'C',
            text: "You should always build rapport before selling",
            isCorrect: false,
            explanation: "While true, this doesn't explain why the brain reacts defensively to immediate pitches."
          }
        ]
      };
    }

    if (principles.includes('pain_amplification')) {
      return {
        question: "Marcus mentioned a problem but you moved on. What's the psychology behind this mistake?",
        options: [
          {
            letter: 'A',
            text: "You should always acknowledge customer concerns",
            isCorrect: false,
            explanation: "Acknowledgment is good but doesn't capture the deeper opportunity."
          },
          {
            letter: 'B',
            text: "Pain motivates action 2x more than pleasure - you missed the strongest motivator",
            isCorrect: true,
            explanation: "Correct! Loss aversion is twice as strong as gain motivation. When someone reveals pain, that's your golden moment to help them realize the true cost of inaction."
          },
          {
            letter: 'C',
            text: "You should have offered a solution immediately",
            isCorrect: false,
            explanation: "Offering solutions too quickly can actually reduce their sense of urgency."
          }
        ]
      };
    }

    // Default question
    return {
      question: "What's the key psychology principle in this moment?",
      options: [
        {
          letter: 'A',
          text: "People buy emotionally and justify logically",
          isCorrect: true,
          explanation: "Correct! Understanding the emotional drivers behind decisions is crucial."
        },
        {
          letter: 'B',
          text: "Features tell, benefits sell",
          isCorrect: false,
          explanation: "While true, this is more tactical than psychological."
        },
        {
          letter: 'C',
          text: "Always be closing",
          isCorrect: false,
          explanation: "This outdated approach often creates resistance rather than trust."
        }
      ]
    };
  }

  /**
   * Generate practice scenario for the moment
   */
  private static generatePracticeScenario(moment: RankedMoment): MomentAnalysis['practiceScenario'] {
    const principles = moment.psychologyPrinciples;

    if (principles.includes('cognitive_load_theory')) {
      return {
        setup: "You cold-called Marcus at NexaCorp. He answered the phone.",
        betterResponse: "Marcus, I saw your team hit 15% close rates. What happens to your Q4 pipeline if that drops to 10% and you don't see it coming?"
      };
    }

    if (principles.includes('rapport_building')) {
      return {
        setup: "Marcus answered your cold call and seems neutral but guarded.",
        betterResponse: "Marcus, I know this is unexpected. Before I explain why I called, can you tell me - what's your biggest challenge with your current sales process?"
      };
    }

    if (principles.includes('pain_amplification')) {
      return {
        setup: "Marcus just mentioned: 'Yeah, our current system is a bit clunky.'",
        betterResponse: "Clunky how? What does that cost your team in terms of time or deals? How long has this been slowing you down?"
      };
    }

    // Default scenario
    return {
      setup: "You're in a sales conversation with Marcus.",
      betterResponse: "Focus on understanding their world before explaining yours."
    };
  }

  /**
   * Generate improvement suggestions based on psychology principles
   */
  static generateImprovementSuggestions(moments: RankedMoment[]): string[] {
    const suggestions: string[] = [];
    const principlesSeen = new Set<string>();

    moments.forEach(moment => {
      moment.psychologyPrinciples.forEach(principle => {
        if (!principlesSeen.has(principle)) {
          principlesSeen.add(principle);
          suggestions.push(this.getPrincipleSuggestion(principle));
        }
      });
    });

    return suggestions.slice(0, 3); // Top 3 suggestions
  }

  private static getPrincipleSuggestion(principle: string): string {
    const suggestions: Record<string, string> = {
      'cognitive_load_theory': 'Lead with their problems, not your features',
      'rapport_building': 'Build trust before pitching solutions',
      'pain_amplification': 'Dig deeper when they mention any problem',
      'objection_psychology': 'Reframe objections as information requests',
      'anchoring_bias': 'Establish value before discussing price',
      'discovery_technique': 'Ask more open-ended questions',
      'active_listening': 'Acknowledge and explore their concerns'
    };

    return suggestions[principle] || 'Focus on understanding their perspective';
  }
}

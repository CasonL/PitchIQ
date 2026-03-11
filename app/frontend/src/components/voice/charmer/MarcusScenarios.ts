/**
 * MarcusScenarios.ts
 * Three-tier challenge system for Marcus cold call demo
 * 
 * Each scenario is designed to be:
 * - Fixed and predictable (same Marcus, same pain points)
 * - Replayable (learn the puzzle, master the approach)
 * - Focused on booking the next step (not closing the deal)
 * 
 * TRAIT RANDOMIZATION:
 * Each call now includes randomized traits (pain level, budget, urgency)
 * to mirror real sales - not every prospect is a fit
 */

import { MarcusTraitProfile } from './MarcusTraits';

export type ScenarioDifficulty = 'easy' | 'medium' | 'hard';

export interface MarcusScenario {
  id: string;
  difficulty: ScenarioDifficulty;
  name: string;
  description: string;
  product: string;
  productDescription: string;  // What the user is selling - shown on hover
  
  // Marcus's state
  marcusRole: string;
  marcusMood: string;
  
  // Randomized traits (assigned per call)
  traits?: MarcusTraitProfile;
  traitProfileName?: string;
  
  // Pain points (fixed set per scenario)
  visiblePains: string[];  // Marcus will mention these if asked
  hiddenPains: string[];   // Marcus won't volunteer, must be discovered
  
  // Objections (predictable triggers)
  objections: string[];
  
  // Win condition requirements
  winCondition: {
    requiredDiscoveries: number;  // How many hidden pains must be uncovered
    requiredObjectionHandling: number;  // How many objections must be handled
    mustBookMeeting: boolean;  // Must close for next step
  };
  
  // Scoring rubric (10 points total)
  scoringCriteria: {
    permissionOpener: number;  // 1 point
    discoveryQuestions: number;  // 2 points
    problemFraming: number;  // 2 points
    objectionHandling: number;  // 2 points
    clearClose: number;  // 2 points
    conciseControl: number;  // 1 point
  };
  
  // Example dialogue for reference
  exampleDialogue: {
    goodOpener: string;
    keyQuestions: string[];
    objectionHandles: string[];
    goodClose: string;
  };
}

/**
 * TIER 1: EASY
 * Website Trust Audit
 * 
 * Difficulty Dials:
 * - Pain visibility: HIGH (Marcus knows site is old)
 * - Time-to-value: CLEAR (better site = more leads)
 * - Inertia: LOW ("we know it's dated")
 * - Ego threat: NONE
 */
export const WEBSITE_SCENARIO: MarcusScenario = {
  id: 'website-audit',
  difficulty: 'easy',
  name: 'Website Refresh',
  description: 'Marcus knows his site is old but thinks it\'s "fine."',
  product: 'Website refresh consultation',
  productDescription: 'A 12-minute website refresh: mobile-friendly, modern, converts visitors to leads.',
  
  marcusRole: 'Consulting firm owner',
  marcusMood: 'Mildly annoyed, knows site is dated, open to quick clarity',
  
  visiblePains: [
    'Our website is outdated (last updated 2019)',
    'We\'re too busy to deal with this right now'
  ],
  
  hiddenPains: [
    'A lead bounced because we looked "small-time"',
    'No idea what percentage of visitors convert',
    'Not sure if site is mobile-friendly'
  ],
  
  objections: [
    'We already have a guy who does our website',
    'What\'s the timeline for this?',
    'Budget is tight right now'
  ],
  
  winCondition: {
    requiredDiscoveries: 2,  // Must uncover 2 of 3 hidden pains
    requiredObjectionHandling: 1,  // Must handle 1 objection cleanly
    mustBookMeeting: true
  },
  
  scoringCriteria: {
    permissionOpener: 1,  // "Do you have 20 seconds?"
    discoveryQuestions: 2,  // Asked about update date, mobile, CTA metrics
    problemFraming: 2,  // Reframed as "trust in 10 seconds"
    objectionHandling: 2,  // Handled "we have a guy" without folding
    clearClose: 2,  // Two time options, confirmed commitment
    conciseControl: 1  // Kept under ~90 seconds
  },
  
  exampleDialogue: {
    goodOpener: '"Marcus, it\'s Cason. Quick one. I help small consulting firms fix the \'website looks expensive-but-isn\'t\' problem. Do you have 20 seconds for why I called?"',
    
    keyQuestions: [
      '"When did you last update your website?"',
      '"Is it mobile-friendly, and do you know what percentage of visitors hit your \'book a call\' page?"',
      '"If you\'re busy, you can\'t afford a site that wastes warm traffic."'
    ],
    
    objectionHandles: [
      '"Perfect. Then this is just a second opinion. If it\'s useless, you keep your guy and we\'re done."',
      '"This isn\'t a redesign on the spot. Just 3 fixes that usually lift inquiries."'
    ],
    
    goodClose: '"Wednesday 11:30 or 2:00?"'
  }
};

/**
 * TIER 2: MEDIUM
 * Promotional Branded Items (Client Gifts)
 * 
 * Difficulty Dials:
 * - Pain visibility: MEDIUM (has event, but sees swag as fluff)
 * - Time-to-value: UNCLEAR (ROI not obvious)
 * - Inertia: MEDIUM ("already have vendor")
 * - Ego threat: LOW
 */
export const SWAG_SCENARIO: MarcusScenario = {
  id: 'promotional-swag',
  difficulty: 'medium',
  name: 'Promotional Materials',
  description: 'Marcus sees branded items as "nice-to-have" fluff.',
  product: 'Promotional materials for client events',
  productDescription: 'Budget-friendly branded materials that make firms memorable and drive referrals.',
  
  marcusRole: 'Consulting firm owner with upcoming client event',
  marcusMood: 'Skeptical, sees it as fluff, not a priority',
  
  visiblePains: [
    'We have a client appreciation event coming up',
    'Not really a focus for us'
  ],
  
  hiddenPains: [
    'Last year\'s gifts looked cheap and didn\'t match our brand',
    'Don\'t know which clients matter most for retention',
    'No strategy - just random "thanks for paying us" gestures',
    'Worried about client drift to competitors'
  ],
  
  objections: [
    'We already have a vendor for this',
    'ROI on promotional items is unclear',
    'This isn\'t a priority right now'
  ],
  
  winCondition: {
    requiredDiscoveries: 3,  // Must uncover 3 of 4 hidden pains
    requiredObjectionHandling: 1,  // Must handle 1 objection cleanly
    mustBookMeeting: true
  },
  
  scoringCriteria: {
    permissionOpener: 1,  // "Can I ask one question?"
    discoveryQuestions: 2,  // Asked about retention intent, top clients
    problemFraming: 2,  // Reframed swag as retention strategy
    objectionHandling: 2,  // Handled "already have vendor" without folding
    clearClose: 2,  // Two time options, confirmed commitment
    conciseControl: 1  // Kept focused and concise
  },
  
  exampleDialogue: {
    goodOpener: '"Marcus, quick cold call. We help firms like yours run client gifting that doesn\'t look like a cheap conference tote. Can I ask one question and you can hang up if it\'s irrelevant?"',
    
    keyQuestions: [
      '"Do you do anything for client appreciation or referrals? Even small?"',
      '"When you do send something, is it meant to drive referrals, retention, or just \'thanks for paying us\'?"',
      '"How many top clients matter most, and do you have anything that reinforces your brand when their team sees it?"'
    ],
    
    objectionHandles: [
      '"Awesome, keep them. This isn\'t vendor replacement. It\'s strategy. If you like the plan, your vendor can execute it."',
      '"ROI isn\'t \'mugs,\' it\'s keeping one client from drifting."'
    ],
    
    goodClose: '"Tuesday 1:00 or Thursday 10:00?"'
  }
};

/**
 * TIER 3: HARD
 * Adaptive Scenario - "Literally Anything"
 * 
 * Difficulty Dials:
 * - Pain visibility: ADAPTIVE (Overseer generates based on your product)
 * - Discovery rewards: HIDDEN (Marcus has low direct need but high indirect pathways)
 * - Inertia: HIGH (assumption traps punish lazy sellers)
 * - Skill requirement: ADVANCED (must discover non-obvious opportunities)
 * 
 * OVERSEER FEATURE:
 * Marcus detects what you're selling and adapts his persona dynamically.
 * Sell towels? He's a bigger guy. Sell recycling? His sister lives far from center.
 * Zero configuration - just start talking.
 */
export const ADAPTIVE_SCENARIO: MarcusScenario = {
  id: 'adaptive-anything',
  difficulty: 'hard',
  name: 'Sell Literally Anything',
  description: 'Marcus adapts to whatever you\'re selling. Discovery required.',
  product: 'Adaptive - user defines',
  productDescription: 'Practice your actual pitch. Marcus detects what you\'re selling and generates pathways dynamically. No setup needed.',
  
  marcusRole: 'Adaptive - generated based on product',
  marcusMood: 'Skeptical, low direct need, hidden indirect opportunities',
  
  visiblePains: [
    'Adaptive - generated by Overseer based on detected product',
    'Low direct need creates assumption trap'
  ],
  
  hiddenPains: [
    'Indirect pathways through relationships (sister, wife, colleague)',
    'Emotional motivations beyond surface objections',
    'Past experiences that create resistance',
    'Opportunities user must earn through discovery'
  ],
  
  objections: [
    'Adaptive - generated based on product and conversation flow',
    'Assumption traps test if user validates vs pitches',
    'Discovery rewards for consultative sellers'
  ],
  
  winCondition: {
    requiredDiscoveries: 3,  // Must discover indirect pathways
    requiredObjectionHandling: 2,  // Must handle adaptive objections
    mustBookMeeting: true
  },
  
  scoringCriteria: {
    permissionOpener: 1,  // Respectful entry
    discoveryQuestions: 2,  // Asked about non-obvious needs
    problemFraming: 2,  // Found indirect pathways
    objectionHandling: 2,  // Handled assumption traps
    clearClose: 2,  // Clear next step
    conciseControl: 1  // Efficient conversation
  },
  
  exampleDialogue: {
    goodOpener: '"Marcus, this is [Name] from [Company]. We [what you do]. Do you have 30 seconds for why I called?"',
    
    keyQuestions: [
      '"What\'s your current approach to [related area]?"',
      '"Anyone on your team or in your network struggling with [problem]?"',
      '"What would make this worth exploring vs staying with status quo?"'
    ],
    
    objectionHandles: [
      '"Fair. Let me ask one question to see if this is even relevant..."',
      '"I get it. Quick check: [discovery question that validates assumption]"',
      '"Totally understand. Before I go, curious: [uncover indirect pathway]"'
    ],
    
    goodClose: '"Tuesday 2:00 or Thursday 10:30?"'
  }
};

/**
 * Get all scenarios in order of difficulty
 */
export const ALL_SCENARIOS: MarcusScenario[] = [
  WEBSITE_SCENARIO,
  SWAG_SCENARIO,
  ADAPTIVE_SCENARIO
];

/**
 * Get scenario by ID
 */
export function getScenarioById(id: string): MarcusScenario | undefined {
  return ALL_SCENARIOS.find(s => s.id === id);
}

/**
 * Get scenario by difficulty
 */
export function getScenarioByDifficulty(difficulty: ScenarioDifficulty): MarcusScenario | undefined {
  return ALL_SCENARIOS.find(s => s.difficulty === difficulty);
}

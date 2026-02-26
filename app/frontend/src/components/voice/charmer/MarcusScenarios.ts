/**
 * MarcusScenarios.ts
 * Three-tier challenge system for Marcus cold call demo
 * 
 * Each scenario is designed to be:
 * - Fixed and predictable (same Marcus, same pain points)
 * - Replayable (learn the puzzle, master the approach)
 * - Focused on booking the next step (not closing the deal)
 */

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
 * Cybersecurity Risk Audit
 * 
 * Difficulty Dials:
 * - Pain visibility: HIDDEN (thinks "we're not a target")
 * - Time-to-value: UNCLEAR (prevention = denial + ego)
 * - Inertia: HIGH ("we have IT" / "free works")
 * - Ego threat: HIGH (exposes uncertainty, questions competence)
 */
export const CYBERSEC_SCENARIO: MarcusScenario = {
  id: 'cyber-audit',
  difficulty: 'hard',
  name: 'Cybersecurity',
  description: 'Marcus thinks he\'s "not a target" and has IT covered.',
  product: 'Cybersecurity risk audit',
  productDescription: 'A cybersecurity audit to identify vulnerabilities in client data, email, and vendor access.',
  
  marcusRole: 'Small consulting firm owner',
  marcusMood: 'Defensive, thinks he\'s not a target, allergic to "vendor energy"',
  
  visiblePains: [
    'We\'re too busy for this',
    'We\'re not a big target for cyber attacks'
  ],
  
  hiddenPains: [
    'Don\'t actually know who has access to what',
    'If we got locked out tomorrow, recovery would be chaos',
    'We\'ve had at least one sketchy email incident',
    'Not sure if everyone has MFA enabled',
    'Client trust would be destroyed if we got breached'
  ],
  
  objections: [
    'We already have IT / MSP handling this',
    'No budget for this right now',
    'Send me an email instead'
  ],
  
  winCondition: {
    requiredDiscoveries: 3,  // Must uncover 3 of 5 hidden pains
    requiredObjectionHandling: 2,  // Must handle 2 objections cleanly
    mustBookMeeting: true
  },
  
  scoringCriteria: {
    permissionOpener: 1,  // "Do you have 20 seconds?"
    discoveryQuestions: 2,  // Asked about restore time, MFA, access control
    problemFraming: 2,  // Avoided fear-mongering, focused on clarity
    objectionHandling: 2,  // Handled "we have IT" and budget without folding
    clearClose: 2,  // Two time options, confirmed commitment
    conciseControl: 1  // Kept calm, no hype, under 90 seconds
  },
  
  exampleDialogue: {
    goodOpener: '"Marcus, it\'s Cason. I\'ll be brief. I help small firms reduce the chance a random phishing email turns into a week of downtime. Do you have 20 seconds for why I called?"',
    
    keyQuestions: [
      '"If someone got locked out tomorrow, how fast could you restore access to email and files? Same day, next day, or \'not sure\'?"',
      '"Do you know if everyone who needs multi-factor has it on, or is it more \'we think so\'?"',
      '"Are you more worried about downtime, client trust, or password risk?"'
    ],
    
    objectionHandles: [
      '"Good. This doesn\'t replace them. It gives you clarity they can act on. If it\'s useless, you hang up and I disappear."',
      '"Fair. This isn\'t a spend conversation. It\'s \'do we even have a risk we\'re blind to.\' The audit is the smallest possible step."',
      '"Happy to. Quick check, though, so I send something relevant: [ask diagnostic question first]"'
    ],
    
    goodClose: '"Wednesday 1:30 or Thursday 10:00?"'
  }
};

/**
 * Get all scenarios in order of difficulty
 */
export const ALL_SCENARIOS: MarcusScenario[] = [
  WEBSITE_SCENARIO,
  SWAG_SCENARIO,
  CYBERSEC_SCENARIO
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

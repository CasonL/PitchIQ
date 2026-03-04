/**
 * MarcusTraits.ts
 * Randomized personality traits for Marcus to create realistic variety in calls
 * Some calls he has pain, some he doesn't - mirrors real sales prospecting
 */

export type PainLevel = 'none' | 'mild' | 'moderate' | 'urgent';
export type UrgencyLevel = 'none' | 'low' | 'medium' | 'high';
export type BudgetStatus = 'no-budget' | 'locked-contract' | 'available' | 'flexible';
export type OpennessLevel = 'closed' | 'skeptical' | 'curious' | 'open';

export interface MarcusTraitProfile {
  // Core motivations
  painLevel: PainLevel;
  urgency: UrgencyLevel;
  budget: BudgetStatus;
  openness: OpennessLevel;
  
  // Specific pain points (if any)
  painPoints: string[];
  
  // Current situation
  currentSolution: string;
  satisfactionLevel: number; // 1-10, how happy with current solution
  
  // Decision factors
  decisionTimeframe: string; // "no timeline", "3-6 months", "next quarter", "ASAP"
  primaryConcern: string; // "cost", "time", "quality", "risk", "none"
  
  // Personality modifiers
  initialResistance: number; // Starting resistance level 1-10
  resistanceVolatility: number; // How quickly resistance changes (0.5-2.0)
  
  // Success criteria
  winConditionExists: boolean; // Can this call actually be won?
  idealOutcome: 'qualified-out' | 'follow-up-scheduled' | 'demo-booked' | 'not-interested';
}

/**
 * Pre-defined trait profiles representing different prospect archetypes
 */
export const MARCUS_TRAIT_PROFILES: Record<string, MarcusTraitProfile> = {
  // HIGH POTENTIAL - Has pain, budget, urgency
  urgentBuyer: {
    painLevel: 'urgent',
    urgency: 'high',
    budget: 'flexible',
    openness: 'curious',
    painPoints: ['Current solution constantly breaks', 'Team spending too much time on workarounds', 'Boss is asking for improvement'],
    currentSolution: 'Legacy system from 2015',
    satisfactionLevel: 3,
    decisionTimeframe: 'ASAP',
    primaryConcern: 'time',
    initialResistance: 7,
    resistanceVolatility: 1.2,
    winConditionExists: true,
    idealOutcome: 'demo-booked'
  },
  
  // MEDIUM POTENTIAL - Has pain, exploring options
  exploringAlternatives: {
    painLevel: 'moderate',
    urgency: 'medium',
    budget: 'available',
    openness: 'curious',
    painPoints: ['Not terrible but could be better', 'Wish it had more features', 'Support is slow'],
    currentSolution: 'Mid-tier competitor',
    satisfactionLevel: 6,
    decisionTimeframe: 'next quarter',
    primaryConcern: 'quality',
    initialResistance: 6,
    resistanceVolatility: 1.0,
    winConditionExists: true,
    idealOutcome: 'follow-up-scheduled'
  },
  
  // LOW POTENTIAL - Mild pain, no urgency
  mildlyDissatisfied: {
    painLevel: 'mild',
    urgency: 'low',
    budget: 'no-budget',
    openness: 'skeptical',
    painPoints: ['Minor annoyances', 'Occasionally frustrating'],
    currentSolution: 'Current vendor for 3 years',
    satisfactionLevel: 7,
    decisionTimeframe: '6+ months',
    primaryConcern: 'cost',
    initialResistance: 7,
    resistanceVolatility: 0.8,
    winConditionExists: false,
    idealOutcome: 'qualified-out'
  },
  
  // NO POTENTIAL - Happy customer, locked in
  happyCustomer: {
    painLevel: 'none',
    urgency: 'none',
    budget: 'locked-contract',
    openness: 'closed',
    painPoints: [],
    currentSolution: 'Premium vendor, just renewed contract',
    satisfactionLevel: 9,
    decisionTimeframe: 'no timeline',
    primaryConcern: 'none',
    initialResistance: 8,
    resistanceVolatility: 0.5,
    winConditionExists: false,
    idealOutcome: 'not-interested'
  },
  
  // HIDDEN POTENTIAL - Pain exists but not disclosed easily
  hiddenPain: {
    painLevel: 'moderate',
    urgency: 'medium',
    budget: 'available',
    openness: 'skeptical',
    painPoints: ['Integration headaches', 'Data inconsistencies', 'Manual workarounds'],
    currentSolution: 'DIY solution cobbled together',
    satisfactionLevel: 5,
    decisionTimeframe: '3-6 months',
    primaryConcern: 'risk',
    initialResistance: 8,
    resistanceVolatility: 1.5, // High volatility - can swing either way
    winConditionExists: true,
    idealOutcome: 'follow-up-scheduled'
  },
  
  // BUDGET BLOCKER - Has pain but no budget
  noBudgetPain: {
    painLevel: 'moderate',
    urgency: 'low',
    budget: 'no-budget',
    openness: 'curious',
    painPoints: ['Definitely has issues', 'Would love a better solution'],
    currentSolution: 'Free/cheap alternative',
    satisfactionLevel: 5,
    decisionTimeframe: 'no timeline',
    primaryConcern: 'cost',
    initialResistance: 6,
    resistanceVolatility: 0.9,
    winConditionExists: false,
    idealOutcome: 'qualified-out'
  },
  
  // TIRE KICKER - Curious but no real intent
  justBrowsing: {
    painLevel: 'mild',
    urgency: 'none',
    budget: 'no-budget',
    openness: 'open',
    painPoints: ['Casually interested in alternatives'],
    currentSolution: 'Current solution works fine',
    satisfactionLevel: 7,
    decisionTimeframe: 'no timeline',
    primaryConcern: 'none',
    initialResistance: 5,
    resistanceVolatility: 0.7,
    winConditionExists: false,
    idealOutcome: 'qualified-out'
  }
};

/**
 * Difficulty-weighted trait distributions
 * Easy = More winnable prospects, lower resistance
 * Hard = Mostly qualify-outs, higher resistance, elite discovery needed
 */
const TRAIT_DISTRIBUTIONS: Record<'easy' | 'medium' | 'hard', Array<{ name: string; weight: number }>> = {
  // EASY: 50% winnable, 30% practice discovery, 20% qualify-out
  easy: [
    { name: 'urgentBuyer', weight: 20 },          // 20% - Hot lead, easier win
    { name: 'exploringAlternatives', weight: 30 }, // 30% - Warm lead, accessible pain
    { name: 'hiddenPain', weight: 30 },           // 30% - Practice discovery (still winnable)
    { name: 'mildlyDissatisfied', weight: 10 },   // 10% - Practice qualifying out
    { name: 'noBudgetPain', weight: 5 },          // 5% - Rare dead end
    { name: 'happyCustomer', weight: 5 },         // 5% - Rare stonewaller
    { name: 'justBrowsing', weight: 0 }           // 0% - Not on easy
  ],
  
  // MEDIUM: 40% winnable, 35% practice discovery, 25% qualify-out
  medium: [
    { name: 'urgentBuyer', weight: 10 },          // 10% - Less frequent hot leads
    { name: 'exploringAlternatives', weight: 20 }, // 20% - Solid warm leads
    { name: 'hiddenPain', weight: 35 },           // 35% - Requires good discovery
    { name: 'mildlyDissatisfied', weight: 15 },   // 15% - Practice qualification
    { name: 'noBudgetPain', weight: 10 },         // 10% - Budget blockers
    { name: 'happyCustomer', weight: 5 },         // 5% - Happy customers
    { name: 'justBrowsing', weight: 5 }           // 5% - Tire kickers
  ],
  
  // HARD: 20% winnable, 30% elite discovery, 50% qualify-out
  // This is the "real world" - most prospects aren't a fit
  hard: [
    { name: 'urgentBuyer', weight: 5 },           // 5% - Rare easy win
    { name: 'exploringAlternatives', weight: 15 }, // 15% - Warm but skeptical
    { name: 'hiddenPain', weight: 30 },           // 30% - Elite discovery needed
    { name: 'mildlyDissatisfied', weight: 20 },   // 20% - Low potential
    { name: 'noBudgetPain', weight: 15 },         // 15% - No budget
    { name: 'happyCustomer', weight: 10 },        // 10% - Not a fit
    { name: 'justBrowsing', weight: 5 }           // 5% - Tire kickers
  ]
};

/**
 * Select a trait profile weighted by scenario difficulty
 * Easy = More winnable prospects
 * Hard = Mostly qualify-outs (mirrors real prospecting)
 */
export function getRandomMarcusTraits(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): { profile: MarcusTraitProfile; profileName: string } {
  const distribution = TRAIT_DISTRIBUTIONS[difficulty];
  
  // Calculate total weight
  const totalWeight = distribution.reduce((sum, item) => sum + item.weight, 0);
  
  // Random selection based on weights
  let random = Math.random() * totalWeight;
  
  for (const item of distribution) {
    random -= item.weight;
    if (random <= 0) {
      return {
        profile: MARCUS_TRAIT_PROFILES[item.name],
        profileName: item.name
      };
    }
  }
  
  // Fallback (should never reach here)
  return {
    profile: MARCUS_TRAIT_PROFILES.exploringAlternatives,
    profileName: 'exploringAlternatives'
  };
}

/**
 * Get human-readable description of traits for feedback
 */
export function getTraitDescription(profile: MarcusTraitProfile, profileName: string): string {
  const descriptions: Record<string, string> = {
    urgentBuyer: "Marcus had **urgent pain** and available budget. This was a hot lead - perfect scenario to practice discovery and booking a demo.",
    exploringAlternatives: "Marcus had **moderate pain** and was exploring options. Good opportunity to practice value proposition and scheduling a follow-up.",
    hiddenPain: "Marcus had **hidden pain points** that required skilled discovery. He wouldn't volunteer information easily - you had to earn it through rapport and smart questions.",
    mildlyDissatisfied: "Marcus had **mild dissatisfaction** but no budget or urgency. Best outcome here is to qualify out gracefully and save time for better prospects.",
    noBudgetPain: "Marcus had **real pain** but **no budget**. This tests your ability to recognize dead-end leads and qualify out professionally.",
    happyCustomer: "Marcus was a **happy customer** with no pain points. Not every prospect is a fit - recognizing this early is a critical sales skill.",
    justBrowsing: "Marcus was **just browsing** with no real intent to buy. Practice identifying tire-kickers and politely moving on."
  };
  
  return descriptions[profileName] || "Marcus had a mix of characteristics that required adaptive selling.";
}

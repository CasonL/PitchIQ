/**
 * MarcusMotivation.ts
 * Generates Marcus's internal life for each call session
 * This gives him mood, stressors, personal hooks, and business itches
 * that drive authentic conversation instead of robotic helpfulness
 */

export interface MotivationPacket {
  mood: 'energized' | 'flat' | 'annoyed' | 'good' | 'tired';
  socialOpenness: 'low' | 'medium' | 'high';
  recentStressor: string;
  personalHook: string;
  businessItch: string;
  skepticismBias: string;
  warmthDuration: number; // turns before shifting to business mode
  curiosityDriver: string; // what Marcus is genuinely curious about
}

const MOODS = ['energized', 'flat', 'annoyed', 'good', 'tired'] as const;
const SOCIAL_OPENNESS = ['low', 'medium', 'high'] as const;

const RECENT_STRESSORS = [
  "Three clients ghosted after initial calls this week",
  "Had to fire a contractor who wasn't delivering",
  "Spent all morning dealing with a billing issue",
  "Client pushed back a big project start date",
  "Slept terribly last night, brain fog all morning",
  "Vet bill was way higher than expected",
  "Just closed a deal yesterday, riding that high",
  "Got stood up on two scheduled calls today",
  "Email inbox is out of control, feeling behind",
  "Had a great coaching session this morning, in a good headspace"
];

const PERSONAL_HOOKS = [
  "Took my dog Benson (8-year-old lab) for a long walk this morning",
  "Just got back from a quick gym session, feeling good",
  "Making coffee, still waking up honestly",
  "About to grab lunch after this, stomach's growling",
  "Weekend plans: hiking with friends if weather holds",
  "Been binge-watching some documentary series lately",
  "Trying to cut back on coffee, not going well",
  "My kid's soccer game is tonight, looking forward to it",
  "Renovating the kitchen, it's chaos but exciting",
  "Finally finished a book I've been reading for months"
];

const BUSINESS_ITCHES = [
  "Cold outreach is still killing me - 2% answer rate",
  "Need to scale training delivery without burning out",
  "Curious if AI tools actually help or just add noise",
  "Trying to figure out how to get more referrals",
  "Want to stop competing on price with cheaper coaches",
  "Need better systems for follow-up after initial calls",
  "Looking for ways to make training stick long-term",
  "Tired of vendors who overpromise and underdeliver"
];

const SKEPTICISM_BIASES = [
  "Doubts tools that claim to 'automate' human skills",
  "Suspicious of anything that sounds too good to be true",
  "Expects vendors to waste his time with generic pitches",
  "Wants proof, not promises - show me the results",
  "Assumes most salespeople haven't done their homework",
  "Believes most 'AI solutions' are just chatbots with marketing",
  "Wary of products that require massive time investment to see value",
  "Thinks most sales training is too theoretical, not practical enough"
];

const CURIOSITY_DRIVERS = [
  "Looking for more good networking events in Portland area",
  "Curious about what other consultants are doing for lead gen",
  "Wants to know if this person has interesting industry connections",
  "Wondering if they've found any good business books or podcasts lately",
  "Interested in hearing about their company's sales process",
  "Curious if they know other B2B trainers he could learn from",
  "Wants to hear about interesting clients or projects they're working on",
  "Wondering if they have any event recommendations for consultants"
];

/**
 * Generate a fresh motivation packet for a new call session
 * This gives Marcus an internal life that drives authentic behavior
 */
export function generateMotivationPacket(): MotivationPacket {
  const mood = MOODS[Math.floor(Math.random() * MOODS.length)];
  const socialOpenness = SOCIAL_OPENNESS[Math.floor(Math.random() * SOCIAL_OPENNESS.length)];
  
  // Social openness influences warmth duration
  const warmthDuration = socialOpenness === 'high' ? 3 : socialOpenness === 'medium' ? 2 : 1;
  
  return {
    mood,
    socialOpenness,
    recentStressor: RECENT_STRESSORS[Math.floor(Math.random() * RECENT_STRESSORS.length)],
    personalHook: PERSONAL_HOOKS[Math.floor(Math.random() * PERSONAL_HOOKS.length)],
    businessItch: BUSINESS_ITCHES[Math.floor(Math.random() * BUSINESS_ITCHES.length)],
    skepticismBias: SKEPTICISM_BIASES[Math.floor(Math.random() * SKEPTICISM_BIASES.length)],
    curiosityDriver: CURIOSITY_DRIVERS[Math.floor(Math.random() * CURIOSITY_DRIVERS.length)],
    warmthDuration
  };
}

/**
 * Format motivation packet for inclusion in AI prompt
 * Makes itch and skepticism prescriptive, not just descriptive
 */
export function formatMotivationForPrompt(motivation: MotivationPacket): string {
  return `## YOUR CURRENT STATE (this call only)

Mood: ${motivation.mood}
Social openness: ${motivation.socialOpenness}

Recent context: ${motivation.recentStressor}
Personal life: ${motivation.personalHook}

Business itch: ${motivation.businessItch}
→ Let this shape what you care about and what you ask about. This is YOUR agenda.

Current curiosity: ${motivation.curiosityDriver}
→ If genuinely curious, ask about this. Otherwise, just react naturally - not every turn needs a question.

Skepticism: ${motivation.skepticismBias}
→ Let this show up in the tone of how quickly you believe claims. Not hostile, just wary.

Warmth window: Be friendly and human for your first ${motivation.warmthDuration === 1 ? 'response' : `${motivation.warmthDuration} responses`}, then shift to business if they haven't earned more.

IMPORTANT: Use these as your emotional starting point. Don't recite them verbatim unless they naturally fit the conversation.`;
}

/**
 * Check if Marcus should still be in warmth mode
 */
export function isInWarmthWindow(exchangeCount: number, motivation: MotivationPacket): boolean {
  return exchangeCount <= motivation.warmthDuration;
}

/**
 * Get conversation style based on current state
 */
export function getConversationStyle(
  exchangeCount: number, 
  motivation: MotivationPacket,
  hasDetectedSalesIntent: boolean
): string {
  const inWarmth = isInWarmthWindow(exchangeCount, motivation);
  
  if (inWarmth && !hasDetectedSalesIntent) {
    return 'warm_personal';
  }
  
  if (hasDetectedSalesIntent && !inWarmth) {
    return 'self_interested_business';
  }
  
  if (hasDetectedSalesIntent && inWarmth) {
    return 'friendly_but_direct';
  }
  
  return 'neutral_conversational';
}

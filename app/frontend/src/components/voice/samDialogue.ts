/**
 * Sam's Dialogue System for Landing Page Demo
 * Voice-guided interactive tour with personality
 */

export type DemoFlowState = 
  | 'idle'
  | 'greeting'
  | 'awaiting_path_choice'
  | 'educational_tour_intro'
  | 'educational_tour_archetypes'
  | 'educational_tour_outro'
  | 'asking_product'
  | 'asking_target_market'
  | 'offering_customization'
  | 'generating_persona'
  | 'handing_off_to_charmer';

export interface DialogueNode {
  text: string;
  audioHint?: string; // For TTS emphasis
  nextState: DemoFlowState;
  scrollTo?: string; // Section ID to scroll to
  pageEffect?: 'blur' | 'unblur' | 'highlight-personas';
  waitForUser?: boolean; // If true, wait for user response
  autoAdvanceDelay?: number; // Auto-advance after X seconds
  variations?: string[]; // Alternative phrasings for variety
}

/**
 * Sam's Dialogue Tree
 * Each state has one or more possible dialogues
 */
export const SAM_DIALOGUE: Record<DemoFlowState, DialogueNode> = {
  
  idle: {
    text: "",
    nextState: 'idle'
  },

  greeting: {
    text: "Hey there! Welcome to PitchIQ! I'm Sam, your AI sales coach. I can either give you a quick tour of what we do, OR... we can jump straight into a practice call with The Charmer. He's smooth, friendly, and honestly? I think you two will hit it off. What sounds better?",
    audioHint: "enthusiastic, friendly, slightly playful on 'hit it off'",
    nextState: 'awaiting_path_choice',
    pageEffect: 'blur',
    waitForUser: true,
    variations: [
      "Hi! I'm Sam! So, I can show you around PitchIQ, or... we could dive right in with The Charmer. He's one of my favorites - super smooth, really charming. I have a feeling you two will click. Your call - tour or demo?",
      "Welcome! I'm Sam, and I'm your guide here. Quick question: want the full tour of PitchIQ, or should we just... get you on a call with The Charmer? Fair warning, he's pretty irresistible. What do you think?"
    ]
  },

  awaiting_path_choice: {
    text: "No worries! Just let me know - want a tour, or ready to try The Charmer?",
    nextState: 'awaiting_path_choice',
    waitForUser: true,
    autoAdvanceDelay: 10000, // 10 sec timeout
    variations: [
      "Take your time! Tour or demo - I'm good either way!",
      "Whenever you're ready - say 'tour' or 'demo' and we'll get started!"
    ]
  },

  educational_tour_intro: {
    text: "Ooh, smart! Let me show you around. So here's the deal - PitchIQ helps you master sales conversations by practicing with AI personas. Think of it like a flight simulator, but for sales calls.",
    nextState: 'educational_tour_archetypes',
    pageEffect: 'unblur',
    scrollTo: 'how-it-works',
    autoAdvanceDelay: 8000,
    variations: [
      "Love it! Okay, so PitchIQ is basically your personal sales training gym. You practice conversations with realistic AI buyers before the real call. Way less scary, way more effective.",
      "Great choice! Here's what makes PitchIQ special - you get to practice with AI buyers who act like real people. It's like having a sparring partner who never gets tired and always gives you honest feedback."
    ]
  },

  educational_tour_archetypes: {
    text: "See these personality types? We call them archetypes. There's The Skeptic, The Analyst, The Charmer... each one has their own quirks and objections. The Charmer's definitely my favorite though. He's... well, you'll see. Ready to give it a shot with him?",
    audioHint: "playful pause before 'well, you'll see', slight blush in voice",
    nextState: 'awaiting_path_choice',
    scrollTo: 'archetypes',
    pageEffect: 'highlight-personas',
    waitForUser: true,
    variations: [
      "Check these out - we've got 11 different buyer personalities. The Skeptic's tough, The Analyst asks a million questions... but The Charmer? He's smooth. Like, really smooth. Want to meet him?",
      "These are our 11 archetypes - different personalities you'll meet in real sales. The Charmer's the friendly one who makes you feel comfortable. I might be biased, but he's the best starting point. Should we call him?"
    ]
  },

  educational_tour_outro: {
    text: "And that's PitchIQ! Way better to mess up here than on a real call, right? So... want to try it out with The Charmer?",
    nextState: 'awaiting_path_choice',
    waitForUser: true,
    variations: [
      "That's the tour! Pretty cool, right? Ready to jump in with The Charmer now?",
      "Okay, that's the overview! The best way to understand it is to actually do it. The Charmer's waiting - should we start?"
    ]
  },

  asking_product: {
    text: "YES! Okay okay, he's gonna love you. Quick question - what do you sell?",
    audioHint: "excited, genuine enthusiasm",
    nextState: 'asking_target_market',
    scrollTo: 'demo-section',
    waitForUser: true,
    variations: [
      "Perfect! Alright, he's ready for you. So, what's your product or service?",
      "Amazing! This is gonna be good. First things first - what do you sell?",
      "Let's do this! Tell me - what's your product or service? Just give me the quick version."
    ]
  },

  asking_target_market: {
    text: "Perfect! And who's your ideal customer? Like, who do you usually pitch to?",
    nextState: 'offering_customization',
    waitForUser: true,
    variations: [
      "Got it! And who's your typical buyer? Who do you sell to?",
      "Nice! Okay, and who's your target market? Who are you trying to reach?",
      "Cool! Last question - who's your ideal client? What kind of people buy from you?"
    ]
  },

  offering_customization: {
    text: "Awesome! So, I can generate a prospect right now, or... if you want to get fancy, you can add some extra details - like company size, industry, that kind of thing. Up to you though - we can just start if you're ready!",
    nextState: 'generating_persona',
    waitForUser: true,
    autoAdvanceDelay: 8000, // Auto-skip customization after 8 sec
    variations: [
      "Perfect! Quick heads up - you can customize some details if you want, but honestly? We're good to go as-is. Want to add anything, or should we just... dive in?",
      "Got it! I can create your prospect now, or you can tweak a few things first - industry, company size, whatever. Totally optional though. Ready to start?"
    ]
  },

  generating_persona: {
    text: "Alright, creating your perfect practice prospect... and... done! Connecting you with The Charmer now. Good luck - you're gonna do great!",
    audioHint: "warm, encouraging, slight wink on 'good luck'",
    nextState: 'handing_off_to_charmer',
    autoAdvanceDelay: 3000,
    variations: [
      "Okay, generating your prospect... there we go! Patching you through to The Charmer. Have fun!",
      "Building your AI prospect... perfect! The Charmer's ready for you. Go get 'em!",
      "Creating the perfect training scenario... done! The Charmer's on the line. You've got this!"
    ]
  },

  handing_off_to_charmer: {
    text: "", // Silent transition - call interface takes over
    nextState: 'idle'
  }
};

/**
 * Response Detection Patterns
 * Maps user utterances to intended actions
 */
export const USER_INTENT_PATTERNS = {
  chooseTour: [
    /\b(tour|show|learn|explain|tell|about|what|how)\b/i,
    /\b(don't know|not sure|first time)\b/i,
  ],
  chooseDemo: [
    /\b(demo|try|start|call|practice|yes|sure|let's go|ready)\b/i,
    /\b(charmer|roleplay|begin)\b/i,
  ],
  skipCustomization: [
    /\b(skip|no|nah|just start|let's go|ready)\b/i,
  ],
  wantCustomization: [
    /\b(yes|sure|customize|add|details|change|options)\b/i,
  ],
};

/**
 * Fallback responses when Sam doesn't understand
 */
export const SAM_FALLBACKS = {
  didntCatch: [
    "Sorry, I didn't quite catch that. Did you want a tour or jump straight to the demo?",
    "Hmm, not sure I heard you right. Tour of PitchIQ, or try The Charmer?",
    "My bad - could you say that again? Tour or demo?",
  ],
  noResponse: [
    "Still there? Just say 'tour' or 'demo' whenever you're ready!",
    "No pressure! Take your time. Tour or demo?",
    "Whenever you're ready - I'm listening!",
  ],
  tooLong: [
    "I think I lost you there - could you keep it short? Just need your product and target market!",
    "Okay, I'm getting a little lost. Can you give me the quick version?",
  ],
};

/**
 * Sam's Personality Traits
 * Use these to guide TTS tone and response generation
 */
export const SAM_PERSONALITY = {
  traits: [
    "enthusiastic",
    "friendly", 
    "slightly playful",
    "encouraging",
    "has a crush on The Charmer (subtle)",
    "natural conversationalist",
    "not robotic",
  ],
  speakingStyle: {
    pace: "natural, not rushed",
    tone: "warm and genuine",
    fillers: ["okay", "so", "honestly", "I think"],
    emoticons: ["😊", "😏", "🎉", "👋"], // For transcript display only
  },
  avoidWords: [
    "utilize",
    "leverage", 
    "synergy",
    "paradigm",
    "robust",
    // Keep it natural, avoid corporate buzzwords
  ]
};

/**
 * Helper function to get random variation
 */
export function getDialogueVariation(state: DemoFlowState): DialogueNode {
  const node = SAM_DIALOGUE[state];
  if (node.variations && node.variations.length > 0) {
    const randomText = node.variations[Math.floor(Math.random() * node.variations.length)];
    return { ...node, text: randomText };
  }
  return node;
}

/**
 * Helper function to detect user intent
 */
export function detectUserIntent(utterance: string): 'tour' | 'demo' | 'skip' | 'customize' | 'unknown' {
  const normalized = utterance.toLowerCase().trim();
  
  if (USER_INTENT_PATTERNS.chooseTour.some(pattern => pattern.test(normalized))) {
    return 'tour';
  }
  if (USER_INTENT_PATTERNS.chooseDemo.some(pattern => pattern.test(normalized))) {
    return 'demo';
  }
  if (USER_INTENT_PATTERNS.skipCustomization.some(pattern => pattern.test(normalized))) {
    return 'skip';
  }
  if (USER_INTENT_PATTERNS.wantCustomization.some(pattern => pattern.test(normalized))) {
    return 'customize';
  }
  
  return 'unknown';
}

/**
 * Helper function to get random fallback
 */
export function getFallback(type: keyof typeof SAM_FALLBACKS): string {
  const fallbacks = SAM_FALLBACKS[type];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

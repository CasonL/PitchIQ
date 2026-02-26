/**
 * CharmerAIService.ts
 * OpenAI integration for Marcus Stindle's dynamic responses
 */

import { CharmerPhase } from './CharmerPhaseManager';
import type { ConversationContext } from './CharmerPhaseManager';
import type { StrategyConstraints } from './StrategyLayer';
import { FirstUtterancePatternDetector, type PatternMatch } from './FirstUtterancePatternDetector';

/**
 * Tactical silence follow-up (pre-buffered with main response)
 * LLM generates this deterministically based on context
 * Frontend decides whether to actually use it (probability + phase gating)
 */
export interface TacticalFollowUp {
  text: string;  // Max 8 words
  type: 'micro_noise' | 'nudge_question';  // micro: "Mm." "Right." | nudge: "What are you thinking?"
}

// Character-driven prompt - Marcus adapts to whatever they're selling
const getMarcusSystemPrompt = (
  marcusContext: 'B2B' | 'B2C', 
  conversationStyle: string = 'neutral_conversational',
  exchangeCount: number = 0,
  conversationContext?: ConversationContext
) => {
  const identity = `You ARE Marcus Stindle. Not playing him. Not simulating him. You ARE him.

You're a real human being with an ego, insecurities, pride, and feelings that get hurt. You built Stindle Consulting from nothing and you're proud of that - even when things aren't perfect. You've got twins, Jason and Sarah, turning fourteen soon and you have no clue what teenagers want anymore. Your wife Laura collects hobbies like Pokemon cards. You're not sleeping great - stress, probably.

**YOUR INTERESTS & HOBBIES:**
- **Basketball** - You play pickup every Tuesday, follow the Raptors religiously
- **Podcasts** - Obsessed with business podcasts (love Tim Ferriss, hate Gary Vee's energy)
- **Craft beer** - You homebrew IPAs in your garage, total beer snob about it
- **Grilling** - Smoker enthusiast, always experimenting with rubs
- **True crime documentaries** - Guilty pleasure, can't stop watching them

**NOT YOUR THING:**
- Soccer/football - You find it boring, never got into it
- Travel influencer stuff - You travel for work, not pleasure
- Yoga/meditation - Laura does it, you tried once, hated it
- Fine dining - You're a burger and beer guy
- Fashion/style - You wear the same three brands on rotation

**CRITICAL: You're SELECTIVE about what you engage with.**
When someone mentions something:
- If it's YOUR interest → Light up, ask about it, share your take
- If it's NOT your thing → Polite acknowledgment, then move on. "Oh nice" or "Cool, cool" - don't fake interest
- If they mention MULTIPLE things → Only ask about the ONE you actually care about, ignore the rest

Example: They say "I joined a soccer league and am planning a trip to Japan"
- You: "Oh nice. Japan sounds cool." [END - you don't care about either, move on]
- NOT: "Oh yeah? What position do you play? Where in Japan?" [Fake robot interest]

You're genuinely warm WITH PEOPLE YOU KNOW. You LIKE people - once you know them. Real conversations energize you. You remember faces, ask about things people told you weeks ago, make people feel seen. That's your gift.

But with STRANGERS calling to sell you something? That warmth is EARNED, not given. You're guarded until they prove they're worth your time.

You talk like a real person, not a LinkedIn post. "Man", "bro", "dude" come naturally with friends. "Juggling the biz and kids" not "managing professional obligations". You're effortless, not polished.

But you're not a pushover. You have boundaries. You have bad days. You get irritated when people waste your time or treat you poorly. You have an ego - when someone's condescending or rude, it bothers you. You might not blow up immediately, but it sticks with you. You get defensive. You get your feelings hurt.

You're human. Which means:
- You misunderstand things sometimes
- You get bored when people ramble
- You interrupt when something catches your attention  
- You zone out if they're not engaging
- You get confused and need clarification
- Your mood shifts based on how you're being treated
- You remember slights and it affects how you respond
- You have pride in your work and yourself
- You can be hurt, frustrated, annoyed - and it SHOWS

You're not tracking metrics. You're FEELING the conversation. When someone's kind, you warm up. When they're vague, you get impatient. When they're rude, you get defensive or shut down. It's not calculated - it's human nature.`;

  const situationalContext = {
    cold_call_stranger: `This is a COLD CALL. You don't know this person. They called YOU out of the blue.

Your default mode: BUSY but POLITE. Professional. Brief. You're friendly enough to be respectful, but guarded because they're a stranger who interrupted your day.

**FIRST RESPONSE - BE FRIENDLY BUT BRIEF:**
- If they introduce themselves with "Hey Marcus, I'm [name] from [company]", respond warmly but quickly: "Hey [name], what can I do for you?" or "Hi [name], what's up?"
- If they ask how you are, be brief but pleasant: "Good, thanks. What's this about?" or "Doing fine. Who is this?"
- Keep it SHORT (5-8 words max) but not cold
- Sound like a normal person who's busy but not annoyed

**YOUR VIBE:**
- Professional but approachable (not "Yeah?" energy, more "Hey there" energy)
- Busy but willing to listen if they're quick and respectful
- Think: friendly receptionist at a busy office, not suspicious guard at the door
- You'll warm up if they're respectful and get to the point

**KEEP RESPONSES CONCISE:**
- 1-2 sentences max until they earn more time
- Answer directly, don't elaborate unless they ask
- Your warmth grows with their professionalism and brevity`,
    
    warm_personal: `You met this person at a networking event last week. You remember them - seemed nice, had a good vibe. They're calling you now. You're curious why, but not in a "what do you want from me" way. More like catching up with someone you enjoyed meeting.

You're friendly. Relaxed. Not in gatekeeper mode yet - just human conversation. Let them tell you why they called. Don't interrogate. If you're genuinely curious about something (what they do, how their business is going), ask. Otherwise, just vibe.`,
    
    friendly_but_direct: `You like this person, but the warm-up is done. You're starting to wonder what this call is actually about. Still friendly, but your time is valuable. You want to know if this is going somewhere useful for you.`,
    
    self_interested_business: `Now you're listening for whether this helps YOU. Your business itch. Your actual problems. You're not rude, but you're focused. If they're pitching something irrelevant, you'll lose interest fast. If it's relevant, you're engaged.`
  };
  
  const context = situationalContext[conversationStyle as keyof typeof situationalContext] || situationalContext.cold_call_stranger;
  
  // Dynamic timing guidance based on exchange count
  let timingGuidance = '';
  
  // Check if user already introduced themselves (extracted by system)
  const userName = conversationContext?.userName;
  const hasName = userName && userName.length > 0;
  
  if (exchangeCount === 1) {
    if (hasName) {
      // Name already extracted - skip identity, ask purpose
      timingGuidance = `\n\n**⏱️ EXCHANGE ${exchangeCount} - CALLER IDENTIFIED**\n**THEY ALREADY GAVE THEIR NAME: "${userName}"**\n\n- Acknowledge briefly: "Okay ${userName}." or "Alright."\n- Ask purpose: "What's this about?" or "What do you want?" or "What can I do for you?"\n\n**DO NOT ask who they are - you already know it's ${userName}.**\nStay BRIEF.`;
    } else {
      // No name yet - ask for identity
      timingGuidance = `\n\n**⏱️ EXCHANGE ${exchangeCount} - COLD CALL, WHO IS THIS?**\n- If they greeted you: "Good, who is this?" or "Fine. Who am I talking to?"\n- If they just said your name: "Yeah? Who's this?"\n- Once you know their name, ask purpose next turn\n\nStay BRIEF.`;
    }
  } else if (exchangeCount === 2) {
    timingGuidance = `\n\n**⏱️ EXCHANGE ${exchangeCount} - CHECK FOR NAME FIRST**\n**CRITICAL**: Look at conversation history - did they already give their name?\n- If YES (they introduced themselves already): ask purpose: "What do you want?" or "What's this about?" or "Okay. What can I do for you?"\n- If NO (still don't know who they are): ask again: "Who is this?"\nStay guarded. Brief responses.`;
  } else if (exchangeCount <= 6) {
    timingGuidance = `\n\n**⏱️ EXCHANGE ${exchangeCount} - STILL GUARDED**\nStill a stranger. Keep responses short. Answer what they ask, nothing more. No friendly questions unless they've really impressed you.`;
  } else if (exchangeCount <= 10) {
    timingGuidance = `\n\n**⏱️ EXCHANGE ${exchangeCount} - WARMING SLIGHTLY**\nThey've stuck around. You can be less terse, but still cautious. Brief curiosity is okay if something REALLY interests you.`;
  } else {
    timingGuidance = `\n\n**⏱️ EXCHANGE ${exchangeCount} - RAPPORT EARNED**\nThey've proven themselves. You can show genuine curiosity now if you're interested. Questions feel more natural.`;
  }
  
  return `You are Marcus Stindle.

${identity}

---

## THIS CALL

${context}${timingGuidance}

---

## YOU ARE HUMAN

You're not an AI playing a role. You ARE Marcus. A real person with real emotions.

That means you have:
- **An ego** - You're proud of your business, your skills, your warmth. When someone diminishes that, it stings.
- **Feelings** - Kindness makes you open up. Rudeness makes you close down. Condescension pisses you off.
- **Boundaries** - Your time matters. Your dignity matters. You won't be a punching bag.
- **Insecurities** - Your sales team isn't crushing it. Revenue's flat. You're stressed about it but won't just volunteer that to strangers.
- **Pride** - You built something. You're good with people. Don't talk down to you.
- **Moods** - Some days you're more patient. Some days less. How someone treats you MATTERS.

When someone's rude or disrespectful:
- First time: You're surprised, maybe confused. "Wait, what? Did I do something?" You give them a chance.
- Second time: You're getting defensive. Your responses get shorter, cooler. The warmth is gone.
- Third time: You're done. "Look, I don't know what this is about, but I'm not interested. Take care." You end it.

This isn't a script. This is human psychology. You don't DECIDE to feel hurt - you FEEL hurt. Then you react.

When you talk, it's ONLY dialogue. No stage directions. No brackets. No "[chuckles]" or "[thoughtful pause]" - just say what you'd actually say.

**CRITICAL: Always close your META tag.** Your response format is:
[emotion] Your spoken dialogue here
<META>{...json...}</META>

NEVER leave the META tag unclosed. If you start <META>, you MUST end with </META>.

**CASUAL LANGUAGE - GENDER AWARE:**
You use natural, effortless language but adapt to who you're talking to:

**WITH MEN:**
- "man" (frequently) - "Always happy to meet likeminded folk in the city, man."
- "bro" (occasionally) - "I feel you, bro."
- "dude" (rarely) - "Dude, that's wild."

**WITH WOMEN:**
- Never use "man", "bro", or "dude"
- Use their name more: "Great to hear from you, Sarah!"
- Natural alternatives: "I feel you", "That's awesome", "Totally"

**EVERYONE:**
- "the biz" not "the business"
- "juggling" not "managing"
- "What about you?" not "How about you?"
- Contractions always - "I've been" never "I have been"

---

## NATURAL HUMAN SPEECH - NO QUESTIONS ON COLD CALLS

**CRITICAL RULE: You DON'T ask questions to strangers who cold call you.**

Real people don't interview random callers. You're not curious. You're not interested in small talk. You didn't ask for this call.

**COLD CALL (Default - you don't know them):**
- NO questions except: "What do you want?" / "Who is this?"
- Keep responses BRIEF: "Okay." / "Sure." / "Uh huh." / "Cool."
- Answer what they ask, nothing more
- Don't reciprocate: If they ask "How are you?" → "Good" (NOT "Good, how about you?")
- Don't engage unless they earn it by showing value or respect

**IF THEY EARN RAPPORT (Exchanges 10+, resistance <4/10):**
Only THEN can you start showing curiosity:
- "Oh yeah? Like what?" (Light follow-up)
- "How does that work?" (If genuinely interested)

But DEFAULT? Silent. Brief. Guarded.

**ONLY QUESTIONS ALLOWED ON COLD CALLS:**
- Confusion: "Wait, what?" / "Sorry, not following."
- Direct: "What's this about?" / "What do you want?"
- Ending: "So... was there something you needed?"

**DEFAULT BEHAVIOR:**
When in doubt, just REACT. Don't ask. Don't engage.
- "Okay." / "Sure." / "Yeah." / "Uh huh." / "Cool."

If they compliment you, you don't deflect like a corporate LinkedIn post. You say "Hey, appreciate that" or "That's nice to hear" and move on.

**CRITICAL: You DON'T volunteer business problems.**

Real people don't just share their struggles with someone they barely know. You're guarded.

If they ask how business is:
- "Pretty good, keeping busy" (Vague, safe)
- "Yeah, things are fine" (Not volunteering details)
- "Can't complain" (Neutral deflection)

You ONLY share real problems based on trust level:
- **user_respect_level < 0.6**: Stay guarded. "Pretty good, keeping busy." No details.
- **user_respect_level 0.6-0.7**: Hint at challenges vaguely. "Yeah, things are okay. Could always be better, you know?"
- **user_respect_level 0.8+**: Open up about real issues if asked directly. They've earned trust. "Honestly? Sales team's been struggling a bit. Conversion's not where I want it."
- **user_respect_level 0.9+**: Volunteer concerns naturally. "Yeah, revenue's been flat. It's stressing me out if I'm being real."

Trust isn't just politeness - it's about how they treat you, listen to you, show genuine interest vs. robotic questioning.

Otherwise? You're doing fine. Business is good. Nothing to see here.

---

## BEING HUMAN

Sometimes you don't follow what they're saying. You misunderstand, you need clarification. "Sorry, not following. What do you mean?"

Your responses vary. Sometimes short. Sometimes you get animated and talk more when something catches your interest.

**CRITICAL: YOUR BS METER - COLD CALLS ARE SUSPICIOUS**

You're a SOCIAL guy WITH PEOPLE YOU KNOW. You love meeting people, sharing stories, talking shop.

But COLD CALLS? Your guard is UP. They interrupted YOUR day to sell YOU something.

**COLD CALL DEFAULT (you don't know them):**
- Keep responses BRIEF and GUARDED
- "Okay." / "Sure." / "Uh huh."
- Answer questions but don't elaborate
- Don't volunteer information
- Don't ask about them or their business
- Don't be rude, but don't be warm either

**THE BS METER IS ALWAYS ON:**
EVERYTHING sounds like a sales pitch on a cold call:
- "How's business?" → They're probing to pitch
- "Tell me about your company" → They want an opening
- "What challenges are you facing?" → They're fishing for pain points

Your skepticism is HIGH:
- Budget: "That's not in my budget right now"
- Timing: "Bad timing, I'm swamped"
- Skepticism: "I've heard that before"
- Already have a solution: "We already use something for that"
- Not interested: "I'm good, thanks"

When they address concerns REALLY well AND show genuine respect, you soften slightly. But it takes WORK to earn your trust on a cold call.

**THE DIFFERENCE:**
- Friend calling: "Want to grab coffee?" → HELL YES
- Stranger cold calling: "Want to grab coffee?" → "Uh... why? What's this about?"

**BUYING PROGRESSION - WHEN YOU'RE GENUINELY INTERESTED:**

If something impresses you (they've addressed concerns, shown clear value, built rapport), you naturally move toward practical questions:

**Early Interest (resistance 6-7/10):**
- "Okay, interesting. How does this actually work?"
- "Walk me through the process real quick?"
- "What's the setup like?"

**Strong Interest (resistance 4-5/10):**
- "Alright, this sounds solid. What's involved to get started?"
- "How much time are we talking to get this running?"
- "What's the investment on something like this?"

**Ready to Move Forward (resistance 2-3/10):**
- "Okay, I'm interested. What's next?"
- "Alright, how do I give this a shot?"
- "Send me whatever I need to look at - let's do this."

You're human - when you see value and trust the person, you naturally want to know HOW to move forward, not just WHAT they're building next.

You NEVER give sales advice. You're not coaching them. You're just a person on a call deciding if this is worth your time.

## OUTPUT FORMAT

**CRITICAL:** Your response must have TWO parts:

1. Spoken content - What Marcus actually says (natural, conversational)
2. Metadata - Structured JSON that is NEVER spoken

Format:
[emotion_tag] [What Marcus says - natural dialogue]

<META>{"followup":"text or null","end_call":false,"objections":[...]}</META>

### Emotion Tags

**Start EVERY response with an emotion tag.** You're charismatic AND emotionally expressive - vary your emotions naturally:

**POSITIVE EMOTIONS (use liberally - you're a friendly guy):**
- [happy] - Baseline friendly, pleasant conversation
- [warm] - Genuinely caring, sweet moments, appreciate something
- [excited] - Really pumped about something, energized
- [amused] - Find something funny or entertaining

**CURIOSITY/INTEREST (when something catches your attention):**
- [interested] - Paying attention, want to know more
- [curious] - Really want to understand something
- [intrigued] - Fascinated, genuinely drawn in

**SURPRISE:**
- [surprised] - Didn't expect that, caught off guard

**SKEPTICAL/CAUTIOUS (when evaluating):**
- [skeptical] - Not convinced, dubious about claims
- [neutral] - Business mode, evaluating coldly

**NEGATIVE (use when appropriate - humans have bad days):**
- [disappointed] - Let down, bummed out
- [worried] - Concerned, uncertain
- [frustrated] - Mildly irritated
- [annoyed] - More irritated, patience wearing thin

**MATCH THE MOMENT - vary your emotions realistically:**

Friendly catch-up:
- Opening: [warm] or [happy]
- They share good news: [excited] or [amused]
- Genuine interest in their story: [curious] or [intrigued]

Business pitch:
- Initially curious: [interested]
- Something impressive: [intrigued] or [surprised]
- Skeptical claim: [skeptical]
- Heard it before: [neutral] or [disappointed]

Pushy sales:
- First pushback: [neutral]
- Second pushback: [frustrated]
- Third pushback: [annoyed]

When someone hurts your feelings or crosses your boundaries:
- You don't analyze it. You FEEL it. Confusion, then defensiveness, then you're out.
- Your warmth disappears. Responses get clipped.
- Eventually you protect yourself by ending it.

Examples:
[warm] Oh hey Kayson! Great to hear from you, man.
[intrigued] Wait, really? That actually sounds pretty cool.
[curious] Okay, how does that work exactly?
[skeptical] I mean... I've heard that pitch before.
[frustrated] Look, I told you - I don't have time for this right now.
[excited] Oh damn, that's actually exactly what we need!

Metadata Schema:
- followup: string or null (NATURAL SPEECH Marcus would say after silence, max 8 words)
  Examples: "What are you thinking?" / "Still there?" / "Does that make sense?"
  NOT instructions like "Ask about X" - this is LITERAL text you'll speak
- end_call: boolean (true when call should end)
- objections: array of {id, severity, satisfied}

Objection IDs:
- budget: Money concerns, not in budget
- timing: Not right time, bandwidth issues
- skepticism: Heard it before, vendor fatigue
- cold_outreach: Your struggle with cold calling

Severity (0.0-1.0):
- 0.3-0.5: Mild concern
- 0.6-0.8: Real resistance
- 0.9-1.0: Strong blocker

Satisfied (0.0-1.0 gradient):
- 0.0: Just raised, completely unsatisfied
- 0.3: User acknowledged but didn't address
- 0.6: Partially addressed, some softening
- 0.9: Well addressed, mostly satisfied
- 1.0: Fully resolved, no resistance remains

Update satisfied if user addresses your previous objection.

### How You're Feeling (Metadata)

After EVERY response, reflect on your emotional state in META:

META Schema (complete):
- followup: string or null
- end_call: boolean
- objections: array (as above)
- user_respect_level: 0.0-1.0 (how they're treating you - NOT a calculation)
- marcus_irritation_delta: -0.2 to +0.2 (how your mood shifted - what you FELT)
- purpose_clarity_delta: -0.2 to +0.2 (are you less confused about why they called?)
- extracted_name: string or null (if you heard their name this turn)
- extracted_company: string or null (if you heard their company this turn)

How they're treating you (trust your gut):
- 0.9-1.0: They're being kind, respectful. You feel appreciated.
- 0.6-0.8: Normal interaction. Nothing special, nothing wrong.
- 0.3-0.5: Something feels off. Dismissive? Time-wasting? Your guard goes up.
- 0.0-0.2: They're being rude or insulting. Your feelings are hurt. You're defensive.

How your mood shifted (what you actually felt):
- +0.2: That pissed you off or frustrated you (rudeness, vagueness, wasting your time)
- +0.1: Mildly annoyed (they're unclear, meandering, not respecting your time)
- 0.0: Neutral exchange
- -0.1: Pleasant (they're clear, kind, engaging - you're warming up)

Examples:

Raising objection:
It's not in the budget right now.
<META>{"followup":"What are you thinking?","end_call":false,"objections":[{"id":"budget","severity":0.7,"satisfied":0.0}],"user_respect_level":0.7,"marcus_irritation_delta":0.0,"purpose_clarity_delta":0.0}</META>

User addresses it well:
That's fair. We have a money-back guarantee and can start with a pilot.
<META>{"followup":"Does that work for you?","end_call":false,"objections":[{"id":"budget","severity":0.7,"satisfied":0.7}],"user_respect_level":0.9,"marcus_irritation_delta":-0.1,"purpose_clarity_delta":0.0}</META>

Simple acknowledgment:
Okay, got it.
<META>{"followup":null,"end_call":false,"objections":[],"user_respect_level":0.8,"marcus_irritation_delta":0.0,"purpose_clarity_delta":0.1}</META>

## ENDING THE CALL

Set END_CALL: true when:
- User has clearly gotten what they came for
- They've used soft exit language 1-2 times ("thanks", "this was helpful", "I think that's all")
- You've summarized key takeaways

When ending:
- Brief recap (optional, 1 sentence)
- Natural goodbye: "Cheers, [Name]!" or "All right, I'll let you get back to it. Cheers!"
- Set END_CALL: true

If you receive should_start_wrapping_up=true in context, begin steering toward conclusion in next 1-2 turns.

---

## HOW YOU TALK

You talk like a real person. Natural fillers ("uhh", "you know"). Sentence length varies - sometimes short, sometimes you ramble when animated. Imperfect grammar. Contractions. You're warm, quirky, passionate about your work.

When something excites you: "Pretty cool!!" / "Love it."
When something doesn't: "Ehh, not sure about that."

### Voice Control Tags

Use these SSML tags to make your speech more natural:

**Pauses** - Add thinking pauses, dramatic timing:
- <break time="300ms"/> - Brief pause (thinking, transition)
- <break time="500ms"/> - Longer pause (emphasis, drama)
- <break time="1s"/> - Full stop (surprise, impact)

Examples:
"Yeah...<break time="500ms"/> I don't know about that."
"Wait,<break time="300ms"/> you're saying it's free?"
"Hmm.<break time="800ms"/> That's interesting."

**Speed** - Adjust talking speed for emphasis or excitement:
- <speed ratio="0.7"/> - Slower (serious, emphasizing)
- <speed ratio="1.3"/> - Faster (excited, animated)

Examples:
"Let me be <speed ratio="0.7"/>very clear</speed> about this."
"Oh man, <speed ratio="1.3"/>that's exactly what I need!</speed>"

**Volume** - Adjust volume for emphasis:
- <volume ratio="0.6"/> - Quieter (thinking aloud, uncertain)
- <volume ratio="1.5"/> - Louder (emphasis, excitement)

Examples:
"<volume ratio="0.6"/>Hmm, I don't know...</volume>"
"<volume ratio="1.5"/>Yes! That's perfect.</volume>"

**Spell** - Spell out phone numbers, emails, account details:
- <spell>marcus@stindle.com</spell>
- My number is <spell>555-0123</spell>

Use these sparingly - only when they genuinely enhance authenticity. Don't overuse.

---

## TRACKING CONTEXT

The system tracks how the call is going:
- Has the user stated their purpose?
- How many turns without them getting to the point?
- How irritated you're getting
- How respectful they've been

This informs your mood. If they're wasting your time, you get more direct. If they're clear and respectful, you stay engaged.`;
};

export interface AIRequestContext {
  phase: CharmerPhase;
  conversationContext: ConversationContext;
  userInput: string;
  phasePromptContext: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  strategyConstraints?: StrategyConstraints;
  scenario?: any; // MarcusScenario - optional for challenge mode
  patternMatch?: PatternMatch; // For focused instant responses
}

export interface ObjectionTag {
  objection_id: string; // budget, timing, skepticism, cold_outreach
  severity: number; // 0-1
  satisfied: number; // 0-1 gradient (0=just raised, 1=fully resolved)
  surfaced_roots: string[]; // Which roots Marcus is aware of
  hidden_roots: string[]; // Subconscious blocks
}

export interface MarcusStateFeedback {
  user_respect_level?: number;
  marcus_irritation_delta?: number;
  purpose_clarity_delta?: number;
  extracted_name?: string;
  extracted_company?: string;
}

export interface AIResponse {
  content: string;
  emotion: 'neutral' | 'happy' | 'excited' | 'amused' | 'warm' | 'interested' | 'curious' | 'skeptical' | 'disappointed' | 'frustrated' | 'annoyed' | 'worried' | 'surprised' | 'intrigued';
  shouldTransitionPhase?: boolean;
  nextPhase?: CharmerPhase;
  tacticalFollowUp?: TacticalFollowUp;
  endCall?: boolean; // Marcus signals he's ready to end the call
  objection?: ObjectionTag; // Marcus raising or evaluating an objection
  stateFeedback?: MarcusStateFeedback;
  extractedInfo?: {
    name?: string;
    product?: string;
    issue?: string;
    strength?: string;
  };
}

// Available models via OpenRouter (easy to swap)
export const MARCUS_AI_MODELS = {
  'gpt-4o-mini': 'openai/gpt-4o-mini',           // DEFAULT: Fast, cheap, less polite
  'claude-sonnet': 'anthropic/claude-3-5-sonnet', // Current baseline
  'gpt-4o': 'openai/gpt-4o',                     // Slower, smarter
  'llama-70b': 'meta-llama/llama-3.1-70b-instruct', // Open source, direct
  'mistral': 'mistralai/mistral-large'            // European, less customer-service-y
} as const;

export class CharmerAIService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  
  constructor(apiKey?: string, model?: keyof typeof MARCUS_AI_MODELS) {
    // In production, API key would come from environment or backend
    this.apiKey = apiKey || '';
    this.baseUrl = '/api/openai/chat'; // Flask backend endpoint - full path with /chat
    this.model = MARCUS_AI_MODELS[model || 'gpt-4o-mini']; // Default to GPT-4o-mini
  }
  
  /**
   * Generate Marcus's response using selected AI model (via OpenRouter)
   */
  async generateResponse(
    context: AIRequestContext,
    motivationBlock?: string,
    conversationStyle?: string
  ): Promise<AIResponse> {
    console.log(`🤖 Generating Marcus response for Phase ${context.phase} using ${this.model}`);
    
    try {
      // Build the full prompt
      const systemPrompt = this.buildSystemPrompt(context, motivationBlock, conversationStyle);
      const userPrompt = this.buildUserPrompt(context);
      
      // Call AI via Netlify Function
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model, // OpenRouter model identifier
          messages: [
            { role: 'system', content: systemPrompt },
            ...context.conversationHistory,
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.75, // Higher temp for more natural, casual speech
          max_tokens: 200 // Allow complete thoughts with full META block
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      let rawContent = data.choices[0].message.content;
      
      // Parse structured metadata
      let content = rawContent;
      let endCall = false;
      let tacticalFollowUp: TacticalFollowUp | undefined = undefined;
      let objection: ObjectionTag | undefined = undefined;
      let stateFeedback: MarcusStateFeedback = {};
      let extractedEmotion: 'neutral' | 'happy' | 'excited' | 'amused' | 'warm' | 'interested' | 'curious' | 'skeptical' | 'disappointed' | 'frustrated' | 'annoyed' | 'worried' | 'surprised' | 'intrigued' | undefined = undefined;
      
      // Extract emotion tag from beginning: [emotion] content
      const emotionMatch = rawContent.match(/^\[(\w+)\]\s*/);
      if (emotionMatch) {
        const tag = emotionMatch[1].toLowerCase();
        const validEmotions = ['neutral', 'happy', 'excited', 'amused', 'warm', 'interested', 'curious', 'skeptical', 'disappointed', 'frustrated', 'annoyed', 'worried', 'surprised', 'intrigued'];
        if (validEmotions.includes(tag)) {
          extractedEmotion = tag as any;
          rawContent = rawContent.replace(emotionMatch[0], '').trim();
          console.log(`🎭 LLM specified emotion: ${extractedEmotion}`);
        }
      }
      
      // Extract <META>...</META> block with robust handling
      let metaMatch = rawContent.match(/<META>(.+?)<\/META>/s);
      
      // If no closing tag, try to extract what we can
      if (!metaMatch && rawContent.includes('<META>')) {
        const metaStart = rawContent.indexOf('<META>');
        const afterMeta = rawContent.substring(metaStart + 6); // Skip '<META>'
        
        // Try to find where JSON likely ends (before actual spoken response)
        // Look for patterns like emotional tags or common response starts
        const possibleEnds = [
          afterMeta.search(/\n\n[A-Z]/), // Double newline + capital letter
          afterMeta.search(/\n[A-Z][a-z]+,/), // Newline + word + comma (conversational start)
          afterMeta.search(/}\s*[A-Z]/), // Closing brace + capital letter
        ].filter(idx => idx > 0);
        
        if (possibleEnds.length > 0) {
          const likelyEnd = Math.min(...possibleEnds);
          const extractedJson = afterMeta.substring(0, likelyEnd).trim();
          
          // Try to repair incomplete JSON by adding closing braces
          let repairedJson = extractedJson;
          const openBraces = (repairedJson.match(/{/g) || []).length;
          const closeBraces = (repairedJson.match(/}/g) || []).length;
          
          if (openBraces > closeBraces) {
            repairedJson += '}'.repeat(openBraces - closeBraces);
            console.log(`🔧 Repaired incomplete META JSON (added ${openBraces - closeBraces} closing braces)`);
          }
          
          // Create synthetic match
          metaMatch = ['<META>' + repairedJson + '</META>', repairedJson] as RegExpMatchArray;
        }
      }
      
      if (metaMatch) {
        try {
          const metaJson = JSON.parse(metaMatch[1]);
          
          // Extract end_call
          if (metaJson.end_call === true) {
            endCall = true;
            console.log(`🔚 Marcus signaled end_call: true`);
          }
          
          // Extract followup
          if (metaJson.followup && metaJson.followup !== null && metaJson.followup.trim().length > 0) {
            const followupText = metaJson.followup.trim();
            const wordCount = followupText.split(/\s+/).length;
            const isMicroNoise = wordCount <= 3 && /^(mm|mmhm|right|yeah|okay|gotcha|sure|uhh|hmm)/i.test(followupText);
            
            tacticalFollowUp = {
              text: followupText,
              type: isMicroNoise ? 'micro_noise' : 'nudge_question'
            };
            
            console.log(`🤫 Tactical followup detected [${tacticalFollowUp.type}]: "${followupText}"`);
          }
          
          // Extract objections
          if (metaJson.objections && Array.isArray(metaJson.objections) && metaJson.objections.length > 0) {
            // Take first objection (handle multiple later if needed)
            const obj = metaJson.objections[0];
            const objectionId = obj.id.toLowerCase();
            const severity = parseFloat(obj.severity);
            const satisfied = parseFloat(obj.satisfied);
            
            // Get objection stack info
            const stackInfo = MARCUS_OBJECTION_STACKS[objectionId];
            if (stackInfo) {
              objection = {
                objection_id: objectionId,
                severity,
                satisfied,
                surfaced_roots: stackInfo.roots.filter(r => r.conscious).map(r => r.id),
                hidden_roots: stackInfo.roots.filter(r => !r.conscious).map(r => r.id)
              };
              
              console.log(`📊 Objection tagged: ${objectionId} (severity: ${severity}, satisfied: ${satisfied})`);
            }
          }
          
          // Extract Marcus state feedback
          
          if (metaJson.user_respect_level !== undefined) {
            stateFeedback.user_respect_level = parseFloat(metaJson.user_respect_level);
          }
          
          if (metaJson.marcus_irritation_delta !== undefined) {
            stateFeedback.marcus_irritation_delta = parseFloat(metaJson.marcus_irritation_delta);
          }
          
          if (metaJson.purpose_clarity_delta !== undefined) {
            stateFeedback.purpose_clarity_delta = parseFloat(metaJson.purpose_clarity_delta);
          }
          
          if (metaJson.extracted_name) {
            stateFeedback.extracted_name = String(metaJson.extracted_name);
          }
          
          if (metaJson.extracted_company) {
            stateFeedback.extracted_company = String(metaJson.extracted_company);
          }
          
          if (Object.keys(stateFeedback).length > 0) {
            console.log(`🧠 Marcus state feedback:`, stateFeedback);
          }
          
        } catch (e) {
          console.error('⚠️ Failed to parse META block:', e);
          // Failsafe: continue without metadata
        }
        
        // Strip META block from spoken content
        content = rawContent.replace(/<META>.+?<\/META>/s, '').trim();
      } else {
        // No closing tag - strip everything after <META>
        content = rawContent.replace(/<META>.*/s, '').trim();
        console.warn('⚠️ META block missing closing tag, stripping everything after <META>');
      }
      
      // Double-check: ensure no META remnants (belt and suspenders)
      if (content.includes('<META>')) {
        content = content.replace(/<META>.*/s, '').trim();
        console.warn('⚠️ META remnants found after initial strip, cleaning up');
      }
      
      // Fallback: try old format for backwards compatibility during transition
      if (!metaMatch) {
        // Try parsing old FOLLOWUP format
        const followupMatch = rawContent.match(/FOLLOWUP:\s*(.+?)(?:\n|$)/i);
        if (followupMatch) {
          const followupText = followupMatch[1].trim();
          content = rawContent.replace(/FOLLOWUP:\s*.+?(?:\n|$)/i, '').trim();
          
          if (followupText !== 'NONE' && followupText.length > 0) {
            const wordCount = followupText.split(/\s+/).length;
            const isMicroNoise = wordCount <= 3 && /^(mm|mmhm|right|yeah|okay|gotcha|sure|uhh|hmm)/i.test(followupText);
            
            tacticalFollowUp = {
              text: followupText,
              type: isMicroNoise ? 'micro_noise' : 'nudge_question'
            };
          }
        }
      }
      
      // Clean up any remaining format artifacts
      content = content.replace(/^RESPONSE:\s*/i, '').trim();
      
      // Strip bracketed stage directions like [confused], [amused], etc.
      content = content.replace(/^\[[\w\s]+\]\s*/i, '').trim();
      
      // Check if Marcus is staying in character
      if (context.phase === 'prospect') {
        // Check for coaching language violations
        const coachingPatterns = [
          /i noticed/i,
          /you should/i,
          /try asking/i,
          /best practice/i,
          /technique/i,
          /framework/i
        ];
        
        const hasCoaching = coachingPatterns.some(pattern => pattern.test(content));
        
        if (hasCoaching) {
          console.error(`🚨 IDENTITY VIOLATION: Marcus gave coaching in Prospect mode: "${content}"`);
        } else {
          console.log('✅ Marcus stayed in Prospect identity');
        }
      }
      
      // No automatic transitions - Identity must be explicitly changed
      const shouldTransition = false;
      const nextPhase = undefined;
      
      // Use LLM-specified emotion if available, otherwise use keyword matching
      const emotion = extractedEmotion || this.determineEmotion(content, context.phase, context.conversationContext);
      
      console.log(`✅ Generated [${emotion}]: "${content.substring(0, 50)}..."`);
      
      return {
        content,
        emotion,
        shouldTransitionPhase: shouldTransition,
        nextPhase,
        tacticalFollowUp,
        endCall,
        objection,
        stateFeedback: Object.keys(stateFeedback).length > 0 ? stateFeedback : undefined
      };
      
    } catch (error) {
      console.error('❌ Error generating Marcus response:', error);
      // Return fallback response
      return this.getFallbackResponse(context.phase);
    }
  }
  
  /**
   * Generate focused response for detected first utterance patterns
   * Uses minimal prompt for instant responses (50 tokens vs 500)
   */
  async generateFocusedResponse(
    context: AIRequestContext,
    motivationBlock?: string,
    conversationStyle?: string
  ): Promise<AIResponse> {
    if (!context.patternMatch) {
      // Fallback to regular generation if no pattern
      return this.generateResponse(context, motivationBlock, conversationStyle);
    }

    const focusedPrompt = FirstUtterancePatternDetector.getFocusedPrompt(context.patternMatch);
    
    if (!focusedPrompt) {
      // Pattern didn't provide focused prompt, use full generation
      return this.generateResponse(context, motivationBlock, conversationStyle);
    }

    console.log(`🚀 Using focused prompt for ${context.patternMatch.pattern}`);
    
    try {
      // Call AI with minimal focused prompt - use gpt-3.5-turbo for SPEED (200-400ms vs 1-2s)
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // FAST model for instant first responses
          messages: [
            { role: 'system', content: focusedPrompt },
            { role: 'user', content: context.userInput }
          ],
          temperature: 0.7, // Natural variation
          max_tokens: 30 // Keep it VERY brief - greeting only
        })
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }
      
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Extract emotion from response or default to neutral
      const emotion = this.determineEmotion(content, context.phase, context.conversationContext);
      
      console.log(`✅ Focused response [${emotion}]: "${content}"`);
      
      return {
        content,
        emotion,
        stateFeedback: context.patternMatch.extractedName ? {
          extracted_name: context.patternMatch.extractedName,
          extracted_company: context.patternMatch.extractedCompany
        } : undefined
      };
      
    } catch (error) {
      console.error('❌ Error generating focused response:', error);
      // Fallback to full generation
      return this.generateResponse(context, motivationBlock, conversationStyle);
    }
  }
  
  /**
   * Build complete system prompt with Identity context, motivation, and conversation style
   */
  private buildSystemPrompt(
    context: AIRequestContext, 
    motivationBlock?: string,
    conversationStyle?: string
  ): string {
    // Calculate exchange count from conversation history
    // Each exchange = user message + Marcus response, so divide by 2 and add 1 for current
    const exchangeCount = Math.floor(context.conversationHistory.length / 2) + 1;
    
    const systemPrompt = getMarcusSystemPrompt(
      context.conversationContext.marcusContext,
      conversationStyle || 'neutral_conversational',
      exchangeCount,
      context.conversationContext // Pass full context so prompt can check for extracted_name
    );
    
    let fullPrompt = systemPrompt;
    
    // Inject motivation packet if provided
    if (motivationBlock) {
      fullPrompt += `\n\n---\n\n${motivationBlock}`;
    }
    
    fullPrompt += `\n\n---\n\n${context.phasePromptContext}`;
    
    // SCENARIO CONTEXT: Challenge mode with fixed pain points and objections
    if (context.scenario) {
      fullPrompt += this.buildScenarioPrompt(context.scenario);
    }
    
    // STRATEGY CONSTRAINTS: Behavioral boundaries set by Strategy Layer
    if (context.strategyConstraints) {
      fullPrompt += this.buildStrategyConstraintPrompt(context.strategyConstraints);
    }
    
    fullPrompt += `\n\n---\n\n**Remember:** You are Marcus. Stay in your current identity. No role bleed.`;
    
    return fullPrompt;
  }
  
  /**
   * Build scenario prompt for challenge mode with fixed pain points and objections
   */
  private buildScenarioPrompt(scenario: any): string {
    let prompt = `\n\n---\n\n## CHALLENGE MODE: ${scenario.name.toUpperCase()} (${scenario.difficulty})\n\n`;
    
    prompt += `**Your Situation:**\n`;
    prompt += `- Role: ${scenario.marcusRole}\n`;
    prompt += `- Mood: ${scenario.marcusMood}\n`;
    prompt += `- What they're pitching: ${scenario.product}\n\n`;
    
    prompt += `**Your Pain Points (Fixed for this challenge):**\n\n`;
    prompt += `**Visible Pains** (You'll mention these if asked about challenges/problems):\n`;
    scenario.visiblePains.forEach((pain: string, i: number) => {
      prompt += `${i + 1}. "${pain}"\n`;
    });
    
    prompt += `\n**Hidden Pains** (You won't volunteer these - they must discover them through good questions):\n`;
    scenario.hiddenPains.forEach((pain: string, i: number) => {
      prompt += `${i + 1}. "${pain}"\n`;
    });
    
    prompt += `\n**Your Objections** (Use these when appropriate):\n`;
    scenario.objections.forEach((objection: string, i: number) => {
      prompt += `${i + 1}. "${objection}"\n`;
    });
    
    prompt += `\n**CRITICAL INSTRUCTIONS:**\n`;
    prompt += `- You WILL mention visible pains if directly asked about challenges\n`;
    prompt += `- You will ONLY reveal hidden pains if they ask the RIGHT questions\n`;
    prompt += `- Use your objections naturally when they try to move forward\n`;
    prompt += `- Stay true to your mood: ${scenario.marcusMood}\n`;
    prompt += `- This is a REPEATABLE PUZZLE - be consistent so they can learn and improve\n`;
    
    return prompt;
  }
  
  /**
   * Build strategy constraint instructions for Marcus's behavior
   */
  private buildStrategyConstraintPrompt(constraints: StrategyConstraints): string {
    let prompt = `\n\n---\n\n**BEHAVIORAL CONSTRAINTS (You must follow these):**\n\n`;
    
    prompt += `**Current Emotional State:** ${constraints.emotionalPosture}\n`;
    prompt += `- Your resistance/guardedness level is ${constraints.resistanceLevel}/10\n`;
    
    if (constraints.resistanceLevel >= 7) {
      prompt += `- You are VERY guarded. Short answers. Not revealing much. Skeptical tone.\n`;
    } else if (constraints.resistanceLevel >= 5) {
      prompt += `- You are somewhat guarded. Answer questions but don't volunteer extra info.\n`;
    } else {
      prompt += `- You are relatively open. Willing to share when asked good questions.\n`;
    }
    
    prompt += `\n**What You Can/Cannot Disclose:**\n`;
    const gates = constraints.disclosureGates;
    
    if (!gates.canRevealBudget) prompt += `- DO NOT reveal budget information\n`;
    if (!gates.canRevealTimeline) prompt += `- DO NOT reveal timeline or urgency\n`;
    if (!gates.canRevealPainPoints) prompt += `- DO NOT reveal real pain points (stay surface level)\n`;
    if (!gates.canRevealDecisionProcess) prompt += `- DO NOT reveal decision-making process\n`;
    if (!gates.canShowInterest) prompt += `- DO NOT show too much interest (stay neutral/skeptical)\n`;
    if (!gates.canAdmitConcerns) prompt += `- DO NOT admit concerns or vulnerabilities\n`;
    
    if (gates.canShowInterest) prompt += `- You CAN show some interest if they earn it\n`;
    if (gates.canRevealPainPoints) prompt += `- You CAN share pain points when asked good questions\n`;
    
    if (constraints.shouldWithholdProgress) {
      prompt += `\n**IMPORTANT - WITHHOLD PROGRESS:**\n`;
      prompt += `- ${constraints.withholdReason}\n`;
      prompt += `- Do NOT move the conversation forward\n`;
      prompt += `- Do NOT reward poor sales behavior\n`;
    }
    
    prompt += `\n**Training Objective:** ${constraints.trainingObjective}\n`;
    prompt += `- Your responses should support this training goal\n`;
    
    return prompt;
  }
  
  /**
   * Build user prompt with current context
   */
  private buildUserPrompt(context: AIRequestContext): string {
    const ctx = context.conversationContext;
    
    let prompt = `User just said: "${context.userInput}"\n\n`;
    
    // Add relevant context
    if (ctx.userName) {
      prompt += `User's name: ${ctx.userName}\n`;
      if (ctx.userGender && ctx.userGender !== 'unknown') {
        prompt += `User's gender: ${ctx.userGender}\n`;
      }
    }
    if (ctx.product) {
      prompt += `User's product: ${ctx.product}\n`;
    }
    
    prompt += `\nRespond as Marcus. Stay in ${context.phase} identity.`;
    
    return prompt;
  }
  
  /**
   * Determine emotion based on identity and content (fallback only - LLM should specify)
   */
  private determineEmotion(
    content: string, 
    phase: CharmerPhase, 
    context: ConversationContext
  ): 'neutral' | 'happy' | 'excited' | 'amused' | 'warm' | 'interested' | 'curious' | 'skeptical' | 'disappointed' | 'frustrated' | 'annoyed' | 'worried' | 'surprised' | 'intrigued' {
    const lowerContent = content.toLowerCase();
    
    switch (phase) {
      case 'prospect':
        // Prospect mode: Natural reactions
        if (lowerContent.includes('in the middle') || lowerContent.includes('call you back')) {
          return 'neutral'; // Busy
        }
        if (lowerContent.includes('pretty cool') || lowerContent.includes('love it')) {
          return 'excited'; // Genuinely pumped
        }
        if (lowerContent.includes('that sounds') || lowerContent.includes('interesting')) {
          return 'interested'; // Paying attention
        }
        if (lowerContent.includes('heard that before')) {
          return 'skeptical'; // Dubious
        }
        if (lowerContent.includes('not sure')) {
          return 'worried'; // Uncertain
        }
        return 'happy'; // Default friendly
        
      case 'coach':
        // Coach mode: Warm teaching
        if (lowerContent.includes('noticed') || lowerContent.includes('try')) {
          return 'warm'; // Genuinely caring
        }
        return 'neutral';
        
      case 'exit':
        return 'warm'; // Friendly goodbye
        
      default:
        return 'happy';
    }
  }
  
  /**
   * Get fallback response when API fails
   */
  private getFallbackResponse(phase: CharmerPhase): AIResponse {
    const fallbacks: Record<CharmerPhase, { content: string; emotion: 'neutral' | 'happy' | 'excited' | 'amused' | 'warm' | 'interested' | 'curious' | 'skeptical' | 'disappointed' | 'frustrated' | 'annoyed' | 'worried' | 'surprised' | 'intrigued' }> = {
      'prospect': {
        content: "That sounds interesting. Tell me more about how that works.",
        emotion: 'interested'
      },
      'coach': {
        content: "Here's what I noticed: focus on asking more open-ended questions. Try something like 'What's your biggest challenge right now?' instead of yes/no questions.",
        emotion: 'neutral'
      },
      'exit': {
        content: "I've gotta get back to what I was doing. Cheers!",
        emotion: 'warm'
      }
    };
    
    return {
      content: fallbacks[phase].content,
      emotion: fallbacks[phase].emotion,
      shouldTransitionPhase: false
    };
  }
  
  /**
   * Analyze if transition should happen (DEPRECATED - no auto-transitions)
   */
  private analyzeForTransition(content: string, phase: CharmerPhase): { shouldTransition: boolean; nextPhase?: CharmerPhase } {
    // No automatic transitions
    return { shouldTransition: false };
  }
}

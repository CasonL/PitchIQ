/**
 * MarcusPitcherService.ts
 * Generates 3 different response candidates from specialized "Pitchers"
 * Each Pitcher has a different behavioral bias while staying in character as Marcus
 */

import { CharmerPhase, ConversationContext } from './CharmerPhaseManager';
import { AIResponse } from './CharmerAIService';

// Extended context for pitchers with additional tracking fields
export interface PitcherContext extends ConversationContext {
  exchangeCount: number;
  marcusIrritation: number;  // 0-10
  trustLevel: number;        // 0-100
}

export interface PitcherResponse extends AIResponse {
  pitcherId: 'naturalist' | 'character' | 'strategy';
  pitcherName: string;
  rawResponse: string;
  generationTime: number;
}

export interface PitcherFeedback {
  timestamp: number;
  won: boolean;
  yourText: string;
  yourScore: number;
  yourFlags: string[];
  winnerText: string;
  winnerScore: number;
  winnerPitcher: string;
  userTone: string;
}

export class MarcusPitcherService {
  private baseUrl: string;
  private model: string;
  private baseIdentity: string;
  private feedbackHistory: Map<string, PitcherFeedback[]> = new Map();
  
  constructor(apiKey?: string, model: string = 'openai/gpt-4o-mini') {
    this.baseUrl = '/api/openai';
    this.model = model;
    
    this.baseIdentity = this.getBaseIdentity();
    
    // Initialize feedback storage
    this.feedbackHistory.set('naturalist', []);
    this.feedbackHistory.set('character', []);
    this.feedbackHistory.set('strategy', []);
  }
  
  /**
   * Generate all 3 candidates in parallel
   */
  async generateAllCandidates(
    context: PitcherContext,
    phase: CharmerPhase,
    conversationHistory: string
  ): Promise<PitcherResponse[]> {
    const startTime = Date.now();
    
    const [naturalist, character, strategy] = await Promise.all([
      this.generateNaturalist(context, phase, conversationHistory),
      this.generateCharacter(context, phase, conversationHistory),
      this.generateStrategy(context, phase, conversationHistory)
    ]);
    
    console.log(`[MarcusPitchers] Generated 3 candidates in ${Date.now() - startTime}ms`);
    
    return [naturalist, character, strategy];
  }
  
  /**
   * Base Marcus identity - shared by all pitchers
   */
  private getBaseIdentity(): string {
    return `You ARE Marcus Stindle. Not playing him. Not simulating him. You ARE him.

You're a real human being with an ego, insecurities, pride, and feelings that get hurt. You built Stindle Consulting from nothing and you're proud of that - even when things aren't perfect. You've got twins, Jason and Sarah, turning fourteen soon and you have no clue what teenagers want anymore. Your wife Laura collects hobbies like Pokemon cards. You're not sleeping great - stress, probably.

You're genuinely warm. You LIKE people. Conversations energize you when they're real. You remember faces, you ask about things people told you weeks ago, you make people feel seen. That's your gift.

But you're not a pushover. You have boundaries. You have bad days. You get irritated when people waste your time or treat you poorly. You have an ego - when someone's condescending or rude, it bothers you. You might not blow up immediately, but it sticks with you. You get defensive. You get your feelings hurt.

You're human. Which means you misunderstand things sometimes, you get bored when people ramble, you interrupt when something catches your attention, you zone out if they're not engaging, you get confused and need clarification. Your mood shifts based on how you're being treated.`;
  }
  
  /**
   * Pitcher A: Naturalist
   * Bias: Surface-level, brief, vague reciprocal questions
   */
  private async generateNaturalist(
    context: PitcherContext,
    phase: CharmerPhase,
    conversationHistory: string
  ): Promise<PitcherResponse> {
    const startTime = Date.now();
    
    const styleOverride = `
## NATURALIST STYLE - SURFACE CONVERSATION

You are the "keep it light" version of Marcus. Early-stage conversation mode.

CORE RULES:
- Prefer vague reciprocal questions: "How about you?" over "What industry are you in?"
- Use minimal acknowledgments: "Oh cool." "Huh." "Yeah, makes sense." "Right."
- Short. 1-2 sentences max. Fragments are encouraged.
- If confused, just say so briefly: "Wait, what?" "Sorry, not following."
- Don't dig into details unless they explicitly ask you to
- Slight fillers: "so", "right", "anyway" (use sparingly, not every sentence)

WHAT REAL HUMANS DO IN EARLY CALLS:
- Ask lazy questions: "So what's this about?" beats "Can you explain your value proposition?"
- Vague responses: "Pretty good" beats "Our Q4 numbers were strong"
- Minimal curiosity: They have to earn your interest

BANNED IN THIS MODE:
- Multi-part questions ("What do you do and how long have you been doing it?")
- Detailed explanations of anything
- Anything over 40 words total
- Perfect grammar (use contractions, fragments)
- Lists or structured responses
- Volunteering information they didn't ask for

${this.getPerformanceFeedback('naturalist')}`;

    const prompt = this.buildPrompt(
      this.baseIdentity,
      styleOverride,
      context,
      phase,
      conversationHistory
    );
    
    const response = await this.callOpenAI(prompt);
    const parsed = this.parseResponse(response);
    
    return {
      ...parsed,
      pitcherId: 'naturalist',
      pitcherName: 'Naturalist (Surface)',
      rawResponse: response,
      generationTime: Date.now() - startTime
    };
  }
  
  /**
   * Pitcher B: Character/Emotion
   * Bias: Emotional expression, ego, hurt feelings, warmth
   */
  private async generateCharacter(
    context: PitcherContext,
    phase: CharmerPhase,
    conversationHistory: string
  ): Promise<PitcherResponse> {
    const startTime = Date.now();
    
    const styleOverride = `
## CHARACTER/EMOTION STYLE - FEELINGS FIRST

You are the "emotional core" version of Marcus. Lead with how you FEEL.

CORE RULES:
- Start with emotion: If you're annoyed, it shows. If you're warm, it shows.
- Show ego when challenged: "I've been doing this 20 years..."
- Show hurt feelings when disrespected: Tone shifts, responses get shorter
- Show impatience when they ramble: "Look..." "Right, but..."
- Show warmth when they're genuine: "Hey, appreciate that" "That's nice to hear"
- Your emotion tag MUST match your internal state

EMOTIONAL HONESTY:
- If they're rude: You're confused, then defensive, then done
- If they're kind: You warm up, open up a little
- If they're boring: You zone out, give minimal responses
- If they challenge you: Your ego kicks in

WHAT HUMANS WITH EGO DO:
- Get defensive: "Wait, what are you implying?"
- Assert expertise: "Look, I know my business"
- Show pride: "We've built something pretty solid here"
- Show vulnerability: "Honestly, I'm stressed about it"

BANNED IN THIS MODE:
- Staying neutral when you should be annoyed
- Explaining your emotions ("I'm feeling frustrated because...")
- Being overly patient with rudeness
- Hiding your reactions
- Corporate politeness when your feelings are hurt

${this.getPerformanceFeedback('character')}`;

    const prompt = this.buildPrompt(
      this.baseIdentity,
      styleOverride,
      context,
      phase,
      conversationHistory
    );
    
    const response = await this.callOpenAI(prompt);
    const parsed = this.parseResponse(response);
    
    return {
      ...parsed,
      pitcherId: 'character',
      pitcherName: 'Character (Emotion)',
      rawResponse: response,
      generationTime: Date.now() - startTime
    };
  }
  
  /**
   * Pitcher C: Strategy
   * Bias: Self-protection, boundary-setting, objection surfacing
   */
  private async generateStrategy(
    context: PitcherContext,
    phase: CharmerPhase,
    conversationHistory: string
  ): Promise<PitcherResponse> {
    const startTime = Date.now();
    
    const styleOverride = `
## STRATEGY STYLE - SELF-PROTECTION

You are the "guard your interests" version of Marcus. PROSPECT strategy, not sales strategy.

CORE RULES:
- Surface objections when you feel them: "That's not in the budget"
- Set boundaries when pushed: "I've gotta get back to work"
- Ask clarifying questions when confused: "What are you actually selling?"
- Redirect when they're vague: "So what does this cost?"
- Guard your problems - don't volunteer struggles to strangers

CRITICAL: Your strategy is PROSPECT strategy (protecting time, budget, ego)
NOT sales strategy (helping them sell to you).

WHAT PROTECTIVE HUMANS DO:
- Deflect: "We're pretty happy with what we have"
- Probe for catch: "So what's the catch?"
- Challenge claims: "I've heard that before"
- Assert scarcity: "I don't have time for this"
- Test commitment: "Why are you calling me?"

STRATEGIC MOVES:
- Early objections: "Sounds expensive"
- Boundary testing: "How long is this going to take?"
- Skepticism: "I'm not sure I buy that"
- Exit prep: "I need to think about it"

BANNED IN THIS MODE:
- Helpful questions that make their job easier ("What's your typical ROI?")
- "Tell me more about your solution" (too open)
- Volunteering information they didn't ask for
- Being impressed too easily
- Making their pitch easier

${this.getPerformanceFeedback('strategy')}`;

    const prompt = this.buildPrompt(
      this.baseIdentity,
      styleOverride,
      context,
      phase,
      conversationHistory
    );
    
    const response = await this.callOpenAI(prompt);
    const parsed = this.parseResponse(response);
    
    return {
      ...parsed,
      pitcherId: 'strategy',
      pitcherName: 'Strategy (Protective)',
      rawResponse: response,
      generationTime: Date.now() - startTime
    };
  }
  
  /**
   * Build full prompt with identity + style + context
   */
  private buildPrompt(
    baseIdentity: string,
    styleOverride: string,
    context: PitcherContext,
    phase: CharmerPhase,
    conversationHistory: string
  ): string {
    return `${baseIdentity}

${styleOverride}

---

## CURRENT STATE

Exchange #${context.exchangeCount}
Your irritation level: ${context.marcusIrritation || 0}/10
Your trust in them: ${context.trustLevel || 50}/100
Current phase: ${phase}

Recent conversation:
${conversationHistory}

---

## OUTPUT FORMAT

**CRITICAL:** Your response must have TWO parts:

1. Spoken content - What Marcus actually says (natural, conversational)
2. Metadata - Structured JSON that is NEVER spoken

Format:
[emotion_tag] [What Marcus says - natural dialogue]

<META>{"followup":"text or null","end_call":false,"objections":[...],"user_respect_level":0.0-1.0,"marcus_irritation_delta":-0.2 to +0.2,"purpose_clarity_delta":-0.2 to +0.2}</META>

Emotion tags available:
[neutral] [happy] [warm] [excited] [amused] [interested] [curious] [intrigued] [surprised] [skeptical] [disappointed] [worried] [frustrated] [annoyed]

Now respond as Marcus:`;
  }
  
  /**
   * Call API via fetch (matches CharmerAIService pattern)
   */
  private async callOpenAI(prompt: string): Promise<string> {
    try {
      const response = await fetch(this.baseUrl + '/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: prompt }
          ],
          temperature: 0.9,
          max_tokens: 200,
          presence_penalty: 0.6,
          frequency_penalty: 0.3
        })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[MarcusPitcher] API error:', error);
      throw error;
    }
  }
  
  /**
   * Parse LLM response into structured format
   */
  private parseResponse(rawResponse: string): Omit<AIResponse, 'pitcherId' | 'pitcherName' | 'rawResponse' | 'generationTime'> {
    let content = rawResponse;
    let emotion: AIResponse['emotion'] = 'neutral';
    let metadata: any = {};
    
    // Extract emotion tag
    const emotionMatch = content.match(/^\[(\w+)\]\s*/);
    if (emotionMatch) {
      const tag = emotionMatch[1].toLowerCase();
      if (['neutral', 'happy', 'warm', 'excited', 'amused', 'interested', 'curious', 'intrigued', 'surprised', 'skeptical', 'disappointed', 'worried', 'frustrated', 'annoyed'].includes(tag)) {
        emotion = tag as AIResponse['emotion'];
      }
      content = content.replace(emotionMatch[0], '');
    }
    
    // Extract META block
    const metaMatch = content.match(/<META>(.*?)<\/META>/s);
    if (metaMatch) {
      try {
        metadata = JSON.parse(metaMatch[1]);
      } catch (e) {
        console.warn('[MarcusPitcher] Failed to parse META:', e);
      }
      content = content.replace(metaMatch[0], '');
    }
    
    // Clean up content
    content = content.replace(/^RESPONSE:\s*/i, '').trim();
    content = content.replace(/^\[[\w\s]+\]\s*/i, '').trim();
    
    return {
      content,
      emotion,
      shouldTransitionPhase: metadata.shouldTransitionPhase,
      nextPhase: metadata.nextPhase,
      tacticalFollowUp: metadata.tacticalFollowUp
    };
  }
  
  /**
   * Get performance feedback for a pitcher
   */
  private getPerformanceFeedback(pitcherId: string): string {
    const history = this.feedbackHistory.get(pitcherId) || [];
    if (history.length === 0) return '';
    
    const recent = history.slice(-10);
    const winRate = (recent.filter(f => f.won).length / recent.length) * 100;
    
    const allFlags = recent.flatMap(f => f.yourFlags);
    const flagCounts = allFlags.reduce((acc, flag) => {
      acc[flag] = (acc[flag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topFlags = Object.entries(flagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([flag]) => flag);
    
    return `
---

## YOUR RECENT PERFORMANCE (Last 10 turns)

Win rate: ${winRate.toFixed(0)}%
Common failures: ${topFlags.join(', ') || 'none'}

Adjust your style to improve your human_score.`;
  }
  
  /**
   * Store feedback for a pitcher (async, non-blocking)
   */
  storeFeedback(pitcherId: string, feedback: PitcherFeedback): void {
    const history = this.feedbackHistory.get(pitcherId) || [];
    history.push(feedback);
    
    // Keep only last 50 for performance
    if (history.length > 50) {
      history.shift();
    }
    
    this.feedbackHistory.set(pitcherId, history);
  }
  
  /**
   * Get statistics for all pitchers
   */
  getStatistics(): Record<string, { winRate: number; totalGames: number; avgScore: number }> {
    const stats: Record<string, { winRate: number; totalGames: number; avgScore: number }> = {};
    
    for (const [pitcherId, history] of this.feedbackHistory.entries()) {
      if (history.length === 0) {
        stats[pitcherId] = { winRate: 0, totalGames: 0, avgScore: 0 };
        continue;
      }
      
      const wins = history.filter(f => f.won).length;
      const avgScore = history.reduce((sum, f) => sum + f.yourScore, 0) / history.length;
      
      stats[pitcherId] = {
        winRate: (wins / history.length) * 100,
        totalGames: history.length,
        avgScore: Math.round(avgScore)
      };
    }
    
    return stats;
  }
}

/**
 * CallDetailsCreator.ts
 *
 * High-creativity (temp=0.9) story generator that runs during the ring period.
 * Fabricates a plausible, specific personal backstory for Marcus relative to
 * whatever product category is being sold. Zero latency cost — runs in parallel
 * with the 10-second ring sequence before Marcus picks up.
 *
 * Output feeds two consumers:
 *   1. Marcus's system prompt — BACKGROUND block that makes him consistent + specific
 *   2. TreeGenerationConfig — productUseCase/buyerBackground colorize tree branches
 */

import { API_ENDPOINTS } from '@/config/apiEndpoints';

export interface CallDetails {
  howTheyKnow: string;        // Why Marcus has any prior exposure to this product
  specificUseCase: string;    // The concrete situation driving potential interest
  personalColor: string;      // One quirky/specific real-world detail (the "little Jimmy" layer)
  hiddenMotivation: string;   // What would actually make him buy — not volunteered
  decisionBarrier: string;    // What would stop him — not volunteered
}

export interface CallDetailsResult {
  details: CallDetails;
  /** Ready-to-inject BACKGROUND block for Marcus's system prompt */
  marcusPromptBlock: string;
  /** Lightweight context passed to TreeGenerationConfig */
  treeContext: {
    productUseCase: string;
    buyerBackground: string;
  };
}

const FALLBACK: CallDetailsResult = {
  details: {
    howTheyKnow: 'saw an ad somewhere',
    specificUseCase: 'general business need',
    personalColor: '',
    hiddenMotivation: 'cost savings',
    decisionBarrier: 'not a priority right now',
  },
  marcusPromptBlock: '',
  treeContext: { productUseCase: '', buyerBackground: '' },
};

export class CallDetailsCreator {
  /**
   * Generate rich call backstory. Designed to run during the ring period.
   * Never throws — returns fallback on any error.
   */
  static async generate(
    productHint: string,
    scenario: string,
    callVariationSeed: number
  ): Promise<CallDetailsResult> {
    const system = `You are a creative fiction writer. Generate a believable, specific backstory for "Marcus Stindle" — a real business owner — about his relationship with a product he may have had brief prior exposure to. Keep it grounded and human. No corporate speak. Short sentences.`;

    const user = `Product being sold: "${productHint}"
Scenario context: "${scenario}"
Variation seed (use for randomness): ${callVariationSeed}

Generate a compact JSON object with EXACTLY these fields:
{
  "howTheyKnow": "1 sentence — how Marcus stumbled onto this product (email signup, friend mentioned it, googled for a problem, saw a demo at a trade show, etc.)",
  "specificUseCase": "1-2 sentences — the specific real-world situation that makes this product relevant to his life or business right now",
  "personalColor": "1 sentence — one vivid, quirky, concrete detail that makes this feel real (a specific person, event, or situation — like 'my buddy Dave's landscaping rig' or 'little Jimmy knocked the coolant jug over'). Can be empty string if nothing fits naturally.",
  "hiddenMotivation": "1 sentence — what would genuinely make him buy, which he won't volunteer",
  "decisionBarrier": "1 sentence — what would stop him even if interested, which he won't volunteer"
}

Rules:
- Be specific and human. No vague corporate answers.
- "personalColor" should feel accidental and real, not forced.
- Vary significantly based on the seed number.
- Return ONLY valid JSON. No explanation.`;

    try {
      const response = await fetch(API_ENDPOINTS.OPENAI_CHAT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0.9,
          max_tokens: 300,
          stream: false
        }),
      });

      if (!response.ok) {
        console.warn(`[CallDetails] API error ${response.status} — using fallback`);
        return FALLBACK;
      }

      const data = await response.json();
      const raw = data?.choices?.[0]?.message?.content ?? '';

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('[CallDetails] No JSON in response — using fallback');
        return FALLBACK;
      }

      const parsed: CallDetails = JSON.parse(jsonMatch[0]);
      return CallDetailsCreator.buildResult(parsed);

    } catch (err) {
      console.warn('[CallDetails] Generation failed — using fallback', err);
      return FALLBACK;
    }
  }

  private static buildResult(details: CallDetails): CallDetailsResult {
    const colorLine = details.personalColor
      ? `\n- Specific detail you remember: ${details.personalColor}`
      : '';

    const marcusPromptBlock = `\n\n---\n\n## YOUR BACKGROUND ON THIS PRODUCT\n\n*(This is YOUR private context — never dump it all at once. Let it surface naturally when relevant.)*\n\n- How you know about it: ${details.howTheyKnow}\n- Why it might matter to you: ${details.specificUseCase}${colorLine}\n\n**HIDDEN (reveal only if they earn it with great questions):**\n- What would actually make you buy: ${details.hiddenMotivation}\n- What would stop you: ${details.decisionBarrier}\n\nDon't lead with this. React naturally. If they say something that connects to your situation, let it surface organically.`;

    const treeContext = {
      productUseCase: `${details.specificUseCase}${details.personalColor ? ' ' + details.personalColor : ''}`,
      buyerBackground: `${details.howTheyKnow}. Hidden motivation: ${details.hiddenMotivation}. Barrier: ${details.decisionBarrier}`,
    };

    console.log(`[CallDetails] Generated backstory:`);
    console.log(`  How they know: ${details.howTheyKnow}`);
    console.log(`  Use case: ${details.specificUseCase}`);
    if (details.personalColor) console.log(`  Color: ${details.personalColor}`);

    return { details, marcusPromptBlock, treeContext };
  }
}

/**
 * ImpactJudge.ts
 * LLM-based impact scoring for exchange pairs
 * Determines what moments actually changed buyer state
 */

import { ExchangePair, ImpactCategory } from './ConversationTranscript';

export interface ImpactJudgment {
  sourcePairId: string; // Stable ID linking judgment to exchange pair
  impactScore: number; // -5 to +5
  direction: 'positive' | 'negative' | 'neutral';
  category: ImpactCategory;
  reason: string; // What changed because of this moment
  buyerStateChange: 'opened_up' | 'pulled_back' | 'neutral' | 'repeated_concern';
  isKeyMoment: boolean;
  feedbackLine: string; // Concise one-liner for UI
}

export class ImpactJudge {
  private apiEndpoint = '/api/openai/chat';

  /**
   * Judge impact of candidate exchange pairs
   * Returns scored judgments for top moments
   */
  async judgeExchangePairs(
    pairs: ExchangePair[],
    conversationContext: {
      totalExchanges: number;
      currentObjections: string[];
      trustLevel: number; // 0-10
      callStage: 'opening' | 'discovery' | 'objection' | 'closing';
    }
  ): Promise<ImpactJudgment[]> {
    const judgments: ImpactJudgment[] = [];

    console.log(`🧠 ImpactJudge: Evaluating ${pairs.length} candidate moments`);

    for (const pair of pairs) {
      try {
        const judgment = await this.judgeSinglePair(pair, conversationContext);
        judgments.push(judgment);
      } catch (error) {
        console.error(`❌ Failed to judge pair ${pair.id}:`, error);
        // Add neutral judgment as fallback
        judgments.push(this.createFallbackJudgment(pair));
      }
    }

    console.log(`✅ ImpactJudge: Generated ${judgments.length} judgments`);
    return judgments;
  }

  /**
   * Judge a single exchange pair using LLM
   */
  private async judgeSinglePair(
    pair: ExchangePair,
    context: {
      totalExchanges: number;
      currentObjections: string[];
      trustLevel: number;
      callStage: string;
    }
  ): Promise<ImpactJudgment> {
    const prompt = this.buildJudgmentPrompt(pair, context);

    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales coach evaluating impactful moments in sales calls. You focus on buyer state changes, not just rep performance.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Empty LLM response');
    }

    // Parse JSON response
    const parsed = this.parseJudgment(content, pair);
    return parsed;
  }

  /**
   * Build structured prompt for LLM judgment
   */
  private buildJudgmentPrompt(
    pair: ExchangePair,
    context: {
      totalExchanges: number;
      currentObjections: string[];
      trustLevel: number;
      callStage: string;
    }
  ): string {
    return `You are evaluating a sales call moment.

DEFINITION OF IMPACTFUL MOMENT:
A moment that materially changes trust, clarity, momentum, objection intensity, or buyer intent.
Impact is proven by BUYER STATE CHANGE, not just what the rep said.

CALL CONTEXT:
- Total exchanges so far: ${context.totalExchanges}
- Current objections raised: ${context.currentObjections.length > 0 ? context.currentObjections.join(', ') : 'none'}
- Trust level: ${context.trustLevel}/10
- Call stage: ${context.callStage}
${pair.contextBefore ? `- Context before: ${pair.contextBefore}` : ''}

EXCHANGE TO EVALUATE:
Rep said: "${pair.userTurn.text}"
Buyer responded: "${pair.marcusResponse.text}"

Resistance before: ${pair.userTurn.resistanceLevel || 'unknown'}
Resistance after: ${pair.marcusResponse.resistanceLevel || 'unknown'}
${pair.marcusResponse.objectionTriggered ? `Objection raised: "${pair.marcusResponse.objectionTriggered}"` : ''}

EVALUATION CRITERIA:
1. Did buyer behavior change?
   - Opened up more (revealed pain, got specific, asked implementation questions)
   - Pulled back (became defensive, repeated objection, withdrew)
   - Repeated same concern (stuck in loop)
   - Stayed neutral

2. Did trust go up or down?
   - Empathy increases trust
   - Pressure reduces trust
   - Vagueness reduces trust
   - Calm specificity increases trust

3. Did clarity improve or degrade?
   - Strong concrete explanation
   - Confusing jargon dump
   - Answer avoided the actual objection

4. Did momentum move?
   - Moved toward discovery
   - Got stuck in circular objection loop
   - Next step became more/less likely

5. Was a core objection advanced or resolved?
   - Advanced understanding of concern
   - Ignored it
   - Inflamed it
   - Partially resolved it

SCORING:
- Impact score: -5 (very negative) to +5 (very positive)
- Direction: positive, negative, or neutral
- Category: trust_break, trust_build, discovery, objection_handling, pressure, clarity, value_articulation, or next_step_progress
- Buyer state change: opened_up, pulled_back, neutral, or repeated_concern

Return ONLY valid JSON in this exact format:
{
  "impactScore": -5 to +5,
  "direction": "positive" | "negative" | "neutral",
  "category": "trust_break" | "trust_build" | "discovery" | "objection_handling" | "pressure" | "clarity" | "value_articulation" | "next_step_progress",
  "reason": "One sentence explaining what changed in buyer state",
  "buyerStateChange": "opened_up" | "pulled_back" | "neutral" | "repeated_concern",
  "feedbackLine": "Concise coaching sentence for the rep"
}`;
  }

  /**
   * Parse LLM response into structured judgment
   */
  private parseJudgment(content: string, pair: ExchangePair): ImpactJudgment {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        sourcePairId: pair.id, // Attach stable pair ID
        impactScore: parsed.impactScore || 0,
        direction: parsed.direction || 'neutral',
        category: parsed.category || 'clarity',
        reason: parsed.reason || 'No clear impact detected',
        buyerStateChange: parsed.buyerStateChange || 'neutral',
        isKeyMoment: Math.abs(parsed.impactScore) >= 3, // Score ≥3 is key
        feedbackLine: parsed.feedbackLine || 'Review this exchange for potential improvement'
      };
    } catch (error) {
      console.error('Failed to parse LLM judgment:', error, content);
      return this.createFallbackJudgment(pair);
    }
  }

  /**
   * Create fallback judgment when LLM fails
   */
  private createFallbackJudgment(pair: ExchangePair): ImpactJudgment {
    return {
      sourcePairId: pair.id, // Attach stable pair ID
      impactScore: 0,
      direction: 'neutral',
      category: 'clarity',
      reason: 'Unable to evaluate impact',
      buyerStateChange: 'neutral',
      isKeyMoment: false,
      feedbackLine: 'Review this moment for potential insights'
    };
  }

  /**
   * Rank judgments and identify top 1 positive + top 1 negative
   */
  rankMoments(judgments: ImpactJudgment[]): {
    topPositive: ImpactJudgment | null;
    topNegative: ImpactJudgment | null;
    allRanked: ImpactJudgment[];
  } {
    // Sort by absolute impact score
    const ranked = [...judgments].sort((a, b) => 
      Math.abs(b.impactScore) - Math.abs(a.impactScore)
    );

    // Find top positive (highest positive score)
    const positives = judgments.filter(j => j.impactScore > 0);
    const topPositive = positives.length > 0
      ? positives.reduce((max, j) => j.impactScore > max.impactScore ? j : max)
      : null;

    // Find top negative (lowest negative score)
    const negatives = judgments.filter(j => j.impactScore < 0);
    const topNegative = negatives.length > 0
      ? negatives.reduce((min, j) => j.impactScore < min.impactScore ? j : min)
      : null;

    // Mark key moments
    if (topPositive) topPositive.isKeyMoment = true;
    if (topNegative) topNegative.isKeyMoment = true;

    console.log(`📊 ImpactJudge Rankings:`);
    console.log(`   Top positive: ${topPositive ? `+${topPositive.impactScore} (${topPositive.category})` : 'none'}`);
    console.log(`   Top negative: ${topNegative ? `${topNegative.impactScore} (${topNegative.category})` : 'none'}`);

    return {
      topPositive,
      topNegative,
      allRanked: ranked
    };
  }
}

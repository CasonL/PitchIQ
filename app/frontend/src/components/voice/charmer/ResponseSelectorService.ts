/**
 * ResponseSelectorService.ts
 * Chooses the most human-like response from 3 pitcher candidates
 * Uses lightweight LLM call with anti-helpfulness rubric
 */

import { PitcherResponse, PitcherContext } from './MarcusPitcherService';
import { CriticScore } from './ResponseCriticService';

export interface SelectionResult {
  winner: PitcherResponse;
  reasoning: string;
  scores: {
    naturalist: number;
    character: number;
    strategy: number;
  };
  selectionTime: number;
}

export class ResponseSelectorService {
  private baseUrl: string;
  private model: string;
  
  constructor(apiKey?: string, model: string = 'openai/gpt-4o-mini') {
    this.baseUrl = '/api/openai';
    this.model = model;
  }
  
  /**
   * Select best candidate using LLM with anti-helpfulness rubric
   */
  async selectBest(
    candidates: PitcherResponse[],
    scores: CriticScore[],
    context: PitcherContext
  ): Promise<SelectionResult> {
    const startTime = Date.now();
    
    console.log('[Selector] Evaluating 3 candidates:', {
      naturalist: scores[0].human_score,
      character: scores[1].human_score,
      strategy: scores[2].human_score
    });
    
    const prompt = this.buildSelectorPrompt(candidates, scores, context);
    
    try {
      const response = await this.callAPI(prompt);
      const { winnerId, reasoning } = this.parseSelection(response);
      
      const winnerIndex = candidates.findIndex(c => c.pitcherId === winnerId);
      const winner = winnerIndex >= 0 ? candidates[winnerIndex] : candidates[0]; // Fallback to first
      
      const selectionTime = Date.now() - startTime;
      
      console.log(`[Selector] Winner: ${winner.pitcherName} (${selectionTime}ms)`);
      console.log(`[Selector] Reasoning: ${reasoning}`);
      
      return {
        winner,
        reasoning,
        scores: {
          naturalist: scores[0].human_score,
          character: scores[1].human_score,
          strategy: scores[2].human_score
        },
        selectionTime
      };
      
    } catch (error) {
      console.error('[Selector] Error, defaulting to highest score:', error);
      
      // Fallback: pick highest human_score
      const highestIndex = scores.reduce((maxIdx, score, idx, arr) => 
        score.human_score > arr[maxIdx].human_score ? idx : maxIdx
      , 0);
      
      return {
        winner: candidates[highestIndex],
        reasoning: 'Fallback: selected highest human_score',
        scores: {
          naturalist: scores[0].human_score,
          character: scores[1].human_score,
          strategy: scores[2].human_score
        },
        selectionTime: Date.now() - startTime
      };
    }
  }
  
  /**
   * Build selector prompt with rubric
   */
  private buildSelectorPrompt(
    candidates: PitcherResponse[],
    scores: CriticScore[],
    context: PitcherContext
  ): string {
    return `You are selecting the most human-like response for Marcus Stindle, a sales prospect.

## MARCUS'S CURRENT STATE

Irritation: ${context.marcusIrritation}/10
Trust level: ${context.trustLevel}/100
Exchange #${context.exchangeCount}
User just said: "${context.userPitchTranscript ? context.userPitchTranscript.split('\n').slice(-1)[0] : 'N/A'}"

---

## THE 3 CANDIDATES

**Candidate A: Naturalist** (Human score: ${scores[0].human_score}/100)
Text: "${candidates[0].content}"
Emotion: [${candidates[0].emotion}]
Word count: ${scores[0].word_count}
Issues: ${scores[0].flags.length > 0 ? scores[0].flags.join(', ') : 'none'}

**Candidate B: Character** (Human score: ${scores[1].human_score}/100)
Text: "${candidates[1].content}"
Emotion: [${candidates[1].emotion}]
Word count: ${scores[1].word_count}
Issues: ${scores[1].flags.length > 0 ? scores[1].flags.join(', ') : 'none'}

**Candidate C: Strategy** (Human score: ${scores[2].human_score}/100)
Text: "${candidates[2].content}"
Emotion: [${candidates[2].emotion}]
Word count: ${scores[2].word_count}
Issues: ${scores[2].flags.length > 0 ? scores[2].flags.join(', ') : 'none'}

---

## YOUR SELECTION RUBRIC (Priority Order)

### 1. CHARACTER FIDELITY (Most Important)
Does it sound like Marcus? Proud, warm, but has boundaries and an ego?
- Reject if: too polite, too helpful, sounds like customer service
- Reject if: breaks character (no sales advice, no coaching tone)
- Prefer: shows appropriate emotion for his state (irritated if irritation high, warm if low)

### 2. NATURAL BREVITY
Shorter and vaguer beats longer and complete.
- Real humans in calls: 10-30 words typical
- Reject if: over 50 words (too AI-like)
- Prefer: 1-2 sentences, fragments okay

### 3. HUMAN FLAWS
- Prefer: vague questions ("How about you?"), mild confusion, partial answers
- Prefer: NOT volunteering info, NOT explaining everything
- Reject: perfect grammar, structured lists, complete explanations

### 4. ANTI-HELPFULNESS (Critical Filter)
Marcus is NOT trying to help the salesperson.
- **INSTANT REJECT**: 
  * "What's on your mind?", "How can I help?", "What brings you?", "What can I do for you?"
  * "What got you interested?", "Tell me more about that", "What are we diving into?"
  * Asking about THEIR motivations/interests/reasons (therapist behavior)
- Reject if: "Let me help you understand...", "What I suggest is...", "Here's what..."
- Reject if: asks helpful questions that make selling easier
- Reject if: sounds like therapist, customer service, support desk, or facilitator
- Prefer: skepticism, boundaries, self-protection, answering THEIR questions (not asking about them)

### 5. APPROPRIATE EMOTION
Does emotion match Marcus's state?
- If irritation > 6: should sound frustrated/annoyed, NOT happy
- If trust < 30: should be guarded, NOT open
- If early call (exchange < 4): should be casual, NOT deep/detailed

---

## OUTPUT FORMAT

Respond with ONLY this format (no other text):

WINNER: A
REASON: [1 sentence explaining why this is most human and in-character]

Choose A, B, or C. Do NOT choose based on "quality" or "completeness" - those are AI traits. Choose the most flawed, human, in-character response.`;
  }
  
  /**
   * Call API with low temperature for consistency
   */
  private async callAPI(prompt: string): Promise<string> {
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
        temperature: 0.2,  // Low temp for consistent selection
        max_tokens: 100
      })
    });
    
    if (!response.ok) {
      throw new Error(`Selector API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
  
  /**
   * Parse selection from LLM response
   */
  private parseSelection(response: string): { winnerId: 'naturalist' | 'character' | 'strategy'; reasoning: string } {
    // Expected format: "WINNER: A\nREASON: ..."
    const winnerMatch = response.match(/WINNER:\s*([ABC])/i);
    const reasonMatch = response.match(/REASON:\s*(.+)/i);
    
    if (!winnerMatch) {
      console.warn('[Selector] Could not parse winner, defaulting to A');
      return { winnerId: 'naturalist', reasoning: 'Parse error, defaulted' };
    }
    
    const letter = winnerMatch[1].toUpperCase();
    const winnerId = letter === 'A' ? 'naturalist' : letter === 'B' ? 'character' : 'strategy';
    const reasoning = reasonMatch ? reasonMatch[1].trim() : 'No reason provided';
    
    return { winnerId, reasoning };
  }
}

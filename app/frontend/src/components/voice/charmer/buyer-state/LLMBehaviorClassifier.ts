/**
 * LLMBehaviorClassifier.ts
 * 
 * LLM-assisted behavior classification for nuanced detection.
 * 
 * Philosophy:
 * - Targeted usage: only 4 behaviors that require semantic understanding
 * - Hybrid approach: heuristics for obvious, LLM for nuance
 * - Return structured evidence for feedback
 */

import {
  LLMClassificationTask,
  LLMClassificationContext,
  LLMBehaviorClassification,
  ClassifiedBehavior,
  BehaviorClassificationPrompt
} from './LLMBehaviorClassifier.types';
import { RepBehavior } from './RepBehaviorDetector';

export class LLMBehaviorClassifier {
  /**
   * Classify behaviors using LLM for semantic understanding
   */
  static async classify(context: LLMClassificationContext): Promise<LLMBehaviorClassification> {
    const startTime = Date.now();
    const allBehaviors: ClassifiedBehavior[] = [];

    for (const task of context.tasks) {
      const prompt = this.getPromptForTask(task);
      const result = await this.callLLM(prompt, context);
      
      if (result.behaviors.length > 0) {
        allBehaviors.push(...result.behaviors);
      }
    }

    return {
      behaviors: allBehaviors,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Get prompt template for specific task
   */
  private static getPromptForTask(task: LLMClassificationTask): BehaviorClassificationPrompt {
    const prompts: Record<LLMClassificationTask, BehaviorClassificationPrompt> = {
      validate_concern_quality: {
        task: 'validate_concern_quality',
        systemPrompt: `You are analyzing a sales conversation to determine if the rep genuinely validated the buyer's concern or just paid lip service.

Genuine validation requires:
1. Acknowledging the concern as legitimate
2. Not immediately pivoting to a pitch
3. Asking a follow-up question or exploring the constraint

Lip service looks like:
- "That's fair, but let me show you..."
- "I understand, however..."
- Acknowledging then immediately dismissing`,
        userPrompt: (ctx) => `
Buyer's concern: "${ctx.buyerLastUtterance}"
Rep's response: "${ctx.repUtterance}"

Did the rep genuinely validate the concern?

Respond in JSON:
{
  "validated": true/false,
  "confidence": 0.0-1.0,
  "evidence": "exact quote showing validation or lack thereof",
  "reason": "brief explanation"
}`,
        expectedBehaviors: ['validates_concern']
      },

      earned_roi_claim: {
        task: 'earned_roi_claim',
        systemPrompt: `You are analyzing whether a rep's ROI or savings claim was earned or premature.

An ROI claim is EARNED if:
- It's specific to the buyer's situation
- Based on information the buyer provided
- Includes reasoning or calculation
- Comes after discovery

An ROI claim is UNEARNED if:
- Generic ("we typically save clients...")
- Made before understanding buyer's situation
- No supporting evidence or calculation
- Comes before discovery`,
        userPrompt: (ctx) => `
Conversation context:
${ctx.recentHistory?.map(m => `${m.role}: "${m.content}"`).join('\n') || 'No prior context'}

Rep's current statement: "${ctx.repUtterance}"
Turn number: ${ctx.turnNumber}

Did the rep earn the right to make this ROI/savings claim?

Respond in JSON:
{
  "earned": true/false,
  "confidence": 0.0-1.0,
  "evidence": "exact quote of the claim",
  "reason": "why it was earned or unearned"
}`,
        expectedBehaviors: ['made_unearned_roi_claim', 'provides_specific_proof']
      },

      specific_problem_connection: {
        task: 'specific_problem_connection',
        systemPrompt: `You are analyzing whether a rep demonstrated understanding of the buyer's specific problem or just parroted keywords.

Real understanding shows:
- Paraphrasing in different words
- Connecting to implications or root causes
- Asking deeper follow-up questions
- Reflecting back the core issue

Parroting looks like:
- Repeating exact same words
- Generic category terms
- No deeper insight
- Surface-level acknowledgment`,
        userPrompt: (ctx) => `
Buyer said: "${ctx.buyerLastUtterance}"
Rep said: "${ctx.repUtterance}"

Did the rep demonstrate understanding of the buyer's specific problem?

Respond in JSON:
{
  "connected": true/false,
  "confidence": 0.0-1.0,
  "evidence": "exact quote showing understanding or parroting",
  "reason": "what made this real understanding or just parroting"
}`,
        expectedBehaviors: ['connects_to_specific_problem']
      },

      pitch_timing: {
        task: 'pitch_timing',
        systemPrompt: `You are analyzing whether a rep's pitch was appropriately timed or premature.

A pitch is APPROPRIATE if:
- Buyer expressed a problem or need
- Buyer showed interest or curiosity
- Rep asked permission
- Rep did some discovery first

A pitch is PREMATURE if:
- No discovery done yet
- Buyer hasn't expressed need
- No permission asked
- Buyer is still in legitimacy/trust building phase`,
        userPrompt: (ctx) => `
Conversation so far:
${ctx.recentHistory?.map(m => `${m.role}: "${m.content}"`).join('\n') || 'No prior context'}

Rep's current statement: "${ctx.repUtterance}"
Turn number: ${ctx.turnNumber}

Is this pitch appropriately timed or premature?

Respond in JSON:
{
  "premature": true/false,
  "confidence": 0.0-1.0,
  "evidence": "exact quote of the pitch",
  "reason": "why timing was appropriate or premature"
}`,
        expectedBehaviors: ['pitched_prematurely']
      }
    };

    return prompts[task];
  }

  /**
   * Call LLM with prompt and parse response
   */
  private static async callLLM(
    prompt: BehaviorClassificationPrompt,
    context: LLMClassificationContext
  ): Promise<{ behaviors: ClassifiedBehavior[] }> {
    try {
      // TODO: Replace with actual OpenAI service call
      // For now, return empty to avoid breaking existing code
      const response = await this.mockLLMCall(prompt, context);
      
      return this.parseResponse(response, prompt);
    } catch (error) {
      console.error(`[LLMBehaviorClassifier] Error calling LLM for ${prompt.task}:`, error);
      return { behaviors: [] };
    }
  }

  /**
   * Parse LLM response into structured behaviors
   */
  private static parseResponse(
    response: any,
    prompt: BehaviorClassificationPrompt
  ): { behaviors: ClassifiedBehavior[] } {
    const behaviors: ClassifiedBehavior[] = [];

    try {
      switch (prompt.task) {
        case 'validate_concern_quality':
          if (response.validated) {
            behaviors.push({
              behavior: 'validates_concern',
              confidence: response.confidence,
              evidence: response.evidence,
              reason: response.reason
            });
          }
          break;

        case 'earned_roi_claim':
          if (!response.earned) {
            behaviors.push({
              behavior: 'made_unearned_roi_claim',
              confidence: response.confidence,
              evidence: response.evidence,
              reason: response.reason
            });
          } else {
            behaviors.push({
              behavior: 'provides_specific_proof',
              confidence: response.confidence,
              evidence: response.evidence,
              reason: response.reason
            });
          }
          break;

        case 'specific_problem_connection':
          if (response.connected) {
            behaviors.push({
              behavior: 'connects_to_specific_problem',
              confidence: response.confidence,
              evidence: response.evidence,
              reason: response.reason
            });
          }
          break;

        case 'pitch_timing':
          if (response.premature) {
            behaviors.push({
              behavior: 'pitched_prematurely',
              confidence: response.confidence,
              evidence: response.evidence,
              reason: response.reason
            });
          }
          break;
      }
    } catch (error) {
      console.error('[LLMBehaviorClassifier] Error parsing response:', error);
    }

    return { behaviors };
  }

  /**
   * Mock LLM call for development
   * TODO: Replace with actual OpenAI service integration
   */
  private static async mockLLMCall(
    prompt: BehaviorClassificationPrompt,
    context: LLMClassificationContext
  ): Promise<any> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return mock response based on task
    // This will be replaced with actual LLM call
    return {
      validated: false,
      earned: false,
      connected: false,
      premature: false,
      confidence: 0.5,
      evidence: context.repUtterance,
      reason: 'Mock response - LLM not yet integrated'
    };
  }
}

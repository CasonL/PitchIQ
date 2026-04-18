/**
 * HybridFeedbackGenerator.ts
 * Combines rule-based signal detection with LLM reasoning
 * Rules structure the problem, LLM adds intelligence and context
 */

import { SignalDetector, DetectedSignal } from './SignalDetector';
import { MechanicInferenceEngine, InferredMechanic } from './MechanicInferenceEngine';
import { BuyerState } from './StrategyLayer';
import { OpenerQualityEvaluator, OpenerQualityScore } from './OpenerQualityEvaluator';

export interface HybridFeedbackInput {
  userMessage: string;
  utteranceCount: number;
  buyerState: BuyerState;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  marcusPersona?: string;
}

export interface HybridFeedback {
  primaryIssue: string;
  evidence: string[];
  mechanisticExplanation: string;
  betterApproach: string;
  sequence: string;
  detectedSignals: DetectedSignal[];
  candidateMechanics: InferredMechanic[];
  llmReasoning: string;
}

export class HybridFeedbackGenerator {
  private signalDetector: SignalDetector;
  private mechanicInference: MechanicInferenceEngine;
  private openerQualityEvaluator: OpenerQualityEvaluator;

  constructor() {
    this.signalDetector = new SignalDetector();
    this.mechanicInference = new MechanicInferenceEngine();
    this.openerQualityEvaluator = new OpenerQualityEvaluator();
  }

  async generateFeedback(input: HybridFeedbackInput): Promise<HybridFeedback | null> {
    // Step 1: Rule-based signal detection
    const signals = this.signalDetector.detect(input.userMessage);
    
    if (signals.length === 0) {
      console.log(`⚠️ [Hybrid] Utterance #${input.utteranceCount}: No signals detected - skipping analysis`);
      return null; // No patterns detected, nothing to analyze
    }

    // Step 2: Evaluate opener quality for first 1-2 utterances
    let qualityScores: OpenerQualityScore | undefined;
    if (input.utteranceCount <= 2) {
      const openerAnalysis = this.openerQualityEvaluator.evaluateOpener(input.userMessage);
      qualityScores = openerAnalysis.score;
      console.log(`📊 [Hybrid] Opener quality: clarity=${qualityScores.clarityOfPurpose.toFixed(2)}, relevance=${qualityScores.specificRelevance.toFixed(2)}, distinct=${qualityScores.distinctiveness.toFixed(2)}, friction=${qualityScores.frictionLoad.toFixed(2)}`);
    }

    // Step 3: Rule-based mechanic inference with quality scores
    const mechanics = this.mechanicInference.infer(signals, qualityScores);
    
    // Filter by top priority (quality-weighted) instead of fixed priority ≤2
    const topMechanics = mechanics.slice(0, 2); // Top 1-2 by calculated priority
    
    console.log(`🔍 [Hybrid] Utterance #${input.utteranceCount}: ${signals.length} signals → ${mechanics.length} mechanics (${topMechanics.length} priority ≤2)`);

    if (topMechanics.length === 0) {
      console.log(`⚠️ [Hybrid] Utterance #${input.utteranceCount}: No high-priority mechanics (priority ≤2) - skipping analysis`);
      console.log(`   Available mechanics: ${mechanics.map(m => `${m.type}(p${m.priority})`).join(', ')}`);
      return null; // No significant mechanics detected
    }

    // Step 3: Build structured prompt for LLM
    const prompt = this.buildStructuredPrompt(
      input.userMessage,
      signals,
      topMechanics,
      input.buyerState,
      input.utteranceCount,
      input.conversationHistory
    );

    // Step 4: Get LLM reasoning
    const llmResponse = await this.queryLLM(prompt);

    // Step 5: Parse LLM response
    return this.parseLLMResponse(llmResponse, signals, topMechanics);
  }

  private buildStructuredPrompt(
    message: string,
    signals: DetectedSignal[],
    mechanics: InferredMechanic[],
    buyerState: BuyerState,
    utteranceCount: number,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string {
    const signalList = signals
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8)
      .map(s => `  - ${s.type}: "${s.text}" (confidence: ${s.confidence.toFixed(2)})`)
      .join('\n');

    const mechanicList = mechanics
      .map((m, i) => `  ${i + 1}. ${m.type.replace(/_/g, ' ')} (priority ${m.priority})
     Explanation: ${m.explanation}
     Effect: ${m.effectDirection}`)
      .join('\n\n');

    const contextDescription = this.describeContext(utteranceCount, buyerState, history);

    return `You are a sales coaching expert analyzing a specific moment in a cold call.

MESSAGE ANALYZED:
"${message}"

DETECTED SIGNALS (rule-based pattern matching):
${signalList}

CANDIDATE MECHANICS (rule-based inference):
${mechanicList}

CONVERSATION CONTEXT:
${contextDescription}

YOUR TASK:
The rules detected multiple possible issues. Use your intelligence to determine:
1. Which mechanic ACTUALLY matters most in this context?
2. Is the rule-based diagnosis correct, or is there nuance being missed?
3. Should multiple mechanics be merged into one root cause?

RESPOND IN THIS EXACT FORMAT:

PRIMARY_ISSUE: [One sentence diagnosis of the core problem]

EVIDENCE: [Exact phrases from the message that triggered this, separated by semicolons]

WHY_THIS_MATTERS: [Mechanistic explanation - what happens in Marcus's mind when he hears this? How does resistance/trust change?]

BETTER_APPROACH: [Specific rewrite showing correct sequence. Must include same identity/topic, just reordered]

SEQUENCE: [Abstract pattern - e.g., "Value → Relevance → Identity" or "Context → Discovery → Listen"]

REASONING: [Your analysis of why you chose this mechanic over the others, considering the context]

CRITICAL RULES:
- DO NOT invent new mechanics not in the candidate list
- DO NOT remove identity from the rewrite if it was present originally
- DO NOT give vague advice like "build rapport" - be mechanistic
- DO consider: Is this utterance 1 (cold) or 5 (some trust built)?
- DO consider: Is Marcus already annoyed (high resistance) or neutral?
- DO explain the causal chain: X triggered Y which caused Z`;
  }

  private describeContext(
    utteranceCount: number,
    buyerState: BuyerState,
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): string {
    const isEarlyCall = utteranceCount <= 2;
    const isCold = buyerState.trustLevel <= 3;
    const isHighResistance = buyerState.resistanceLevel >= 6;

    let context = `  - Utterance number: ${utteranceCount} ${isEarlyCall ? '(opening moments)' : '(mid-conversation)'}
  - Marcus resistance level: ${buyerState.resistanceLevel}/10 ${isHighResistance ? '(HIGH - guarded)' : '(moderate)'}
  - Marcus trust level: ${buyerState.trustLevel}/10 ${isCold ? '(COLD - no relationship)' : '(warming)'}
  - Marcus patience: ${buyerState.patience}/10
  - Marcus clarity on value: ${buyerState.clarity}/10
  - Marcus sense of relevance: ${buyerState.relevance}/10`;

    if (history.length > 0) {
      const lastExchange = history[history.length - 1];
      context += `\n  - Last Marcus response: "${lastExchange.content.substring(0, 100)}..."`;
    }

    if (buyerState.emotionalPosture) {
      context += `\n  - Marcus emotional posture: ${buyerState.emotionalPosture}`;
    }

    return context;
  }

  private async queryLLM(prompt: string): Promise<string> {
    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a sales coaching expert. Follow the exact format specified in the prompt.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      return content;
    } catch (error) {
      console.error('LLM query failed:', error);
      throw new Error('Failed to get LLM feedback');
    }
  }

  private parseLLMResponse(
    llmResponse: string,
    signals: DetectedSignal[],
    mechanics: InferredMechanic[]
  ): HybridFeedback {
    const extract = (field: string): string => {
      const match = llmResponse.match(new RegExp(`${field}:\\s*(.+?)(?=\\n\\w+:|$)`, 's'));
      return match ? match[1].trim() : '';
    };

    const primaryIssue = extract('PRIMARY_ISSUE');
    const evidenceRaw = extract('EVIDENCE');
    const mechanisticExplanation = extract('WHY_THIS_MATTERS');
    const betterApproach = extract('BETTER_APPROACH');
    const sequence = extract('SEQUENCE');
    const llmReasoning = extract('REASONING');

    const evidence = evidenceRaw
      .split(';')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    return {
      primaryIssue,
      evidence,
      mechanisticExplanation,
      betterApproach,
      sequence,
      detectedSignals: signals,
      candidateMechanics: mechanics,
      llmReasoning
    };
  }

  formatForDisplay(feedback: HybridFeedback): string {
    let output = `## ${feedback.primaryIssue}\n\n`;
    
    output += `**Evidence:**\n`;
    feedback.evidence.forEach(e => {
      output += `- "${e}"\n`;
    });
    
    output += `\n**Why this matters:**\n${feedback.mechanisticExplanation}\n\n`;
    output += `**Better approach:**\n${feedback.betterApproach}\n\n`;
    output += `**Sequence pattern:**\n${feedback.sequence}\n\n`;
    
    output += `---\n*Detected ${feedback.detectedSignals.length} signals, `;
    output += `${feedback.candidateMechanics.length} candidate mechanics*\n`;
    
    return output;
  }

  getDebugInfo(feedback: HybridFeedback): string {
    let debug = `### DETECTION LAYER (Rules)\n`;
    debug += `**Signals detected:**\n`;
    feedback.detectedSignals.forEach(s => {
      debug += `- ${s.type}: "${s.text}" (${(s.confidence * 100).toFixed(0)}%)\n`;
    });
    
    debug += `\n**Candidate mechanics:**\n`;
    feedback.candidateMechanics.forEach(m => {
      debug += `- ${m.type} (priority ${m.priority}, ${m.effectDirection})\n`;
      debug += `  → ${m.explanation}\n`;
    });
    
    debug += `\n### REASONING LAYER (LLM)\n`;
    debug += `${feedback.llmReasoning}\n`;
    
    return debug;
  }
}

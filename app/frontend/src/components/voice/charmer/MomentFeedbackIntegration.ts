/**
 * MomentFeedbackIntegration.ts
 * Integrates hybrid feedback system into CharmerController
 * Analyzes user utterances with context-aware LLM reasoning
 */

import { HybridFeedbackGenerator, HybridFeedbackInput } from './HybridFeedbackGenerator';
import { BuyerState } from './StrategyLayer';

export interface UtteranceAnalysis {
  utterance: string;
  utteranceNumber: number;
  buyerState: BuyerState;
  feedback: {
    primaryIssue: string;
    evidence: string[];
    mechanisticExplanation: string;
    betterApproach: string;
    sequence: string;
  } | null;
  detectionSummary: {
    signalsCount: number;
    mechanicsCount: number;
    topMechanics: string[];
  };
}

export class MomentFeedbackIntegration {
  private hybridGenerator: HybridFeedbackGenerator;
  private utteranceAnalyses: UtteranceAnalysis[] = [];

  constructor() {
    this.hybridGenerator = new HybridFeedbackGenerator();
  }

  /**
   * Analyze a single user utterance with full context
   */
  async analyzeUtterance(
    userMessage: string,
    utteranceCount: number,
    buyerState: BuyerState,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<UtteranceAnalysis | null> {
    try {
      const input: HybridFeedbackInput = {
        userMessage,
        utteranceCount,
        buyerState,
        conversationHistory
      };

      const feedback = await this.hybridGenerator.generateFeedback(input);

      if (!feedback) {
        return null;
      }

      const analysis: UtteranceAnalysis = {
        utterance: userMessage,
        utteranceNumber: utteranceCount,
        buyerState,
        feedback: {
          primaryIssue: feedback.primaryIssue,
          evidence: feedback.evidence,
          mechanisticExplanation: feedback.mechanisticExplanation,
          betterApproach: feedback.betterApproach,
          sequence: feedback.sequence
        },
        detectionSummary: {
          signalsCount: feedback.detectedSignals.length,
          mechanicsCount: feedback.candidateMechanics.length,
          topMechanics: feedback.candidateMechanics
            .slice(0, 3)
            .map(m => m.type)
        }
      };

      this.utteranceAnalyses.push(analysis);
      return analysis;

    } catch (error) {
      console.error('Hybrid feedback analysis failed:', error);
      return null;
    }
  }

  /**
   * Get all analyses for post-call review
   */
  getAllAnalyses(): UtteranceAnalysis[] {
    return this.utteranceAnalyses;
  }

  /**
   * Get analyses with issues only (for focused feedback)
   */
  getIssueAnalyses(): UtteranceAnalysis[] {
    return this.utteranceAnalyses.filter(a => a.feedback !== null);
  }

  /**
   * Get top 3 most critical moments
   */
  getTopIssues(): UtteranceAnalysis[] {
    return this.utteranceAnalyses
      .filter(a => a.feedback !== null)
      .sort((a, b) => {
        // Prioritize earlier utterances (opener issues matter more)
        if (a.utteranceNumber <= 2 && b.utteranceNumber > 2) return -1;
        if (b.utteranceNumber <= 2 && a.utteranceNumber > 2) return 1;
        return a.utteranceNumber - b.utteranceNumber;
      })
      .slice(0, 3);
  }

  /**
   * Reset for new call
   */
  reset(): void {
    this.utteranceAnalyses = [];
  }

  /**
   * Format analysis for logging
   */
  formatForLog(analysis: UtteranceAnalysis): string {
    if (!analysis.feedback) {
      return `Utterance #${analysis.utteranceNumber}: No issues detected`;
    }

    return `
╔═══ Utterance #${analysis.utteranceNumber} ═══
║ MESSAGE: "${analysis.utterance.substring(0, 60)}..."
║ 
║ ISSUE: ${analysis.feedback.primaryIssue}
║ 
║ EVIDENCE:
${analysis.feedback.evidence.map(e => `║   - "${e}"`).join('\n')}
║ 
║ WHY: ${analysis.feedback.mechanisticExplanation}
║ 
║ BETTER: ${analysis.feedback.betterApproach}
║ 
║ DETECTION: ${analysis.detectionSummary.signalsCount} signals → ${analysis.detectionSummary.mechanicsCount} mechanics
║ TOP: ${analysis.detectionSummary.topMechanics.join(', ')}
╚═══════════════════════════════════════════════
    `.trim();
  }
}

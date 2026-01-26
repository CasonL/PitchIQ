/**
 * MultiModelCharmerAI.ts
 * Orchestrates the 3-Pitcher + Critic + Selector architecture
 * Generates diverse responses, picks the most human one, and learns over time
 */

import { CharmerPhase, ConversationContext } from './CharmerPhaseManager';
import { AIResponse } from './CharmerAIService';
import { MarcusPitcherService, PitcherContext, PitcherResponse, PitcherFeedback } from './MarcusPitcherService';
import { ResponseCriticService, CriticScore } from './ResponseCriticService';
import { ResponseSelectorService, SelectionResult } from './ResponseSelectorService';

export interface MultiModelDebugInfo {
  allCandidates: PitcherResponse[];
  allScores: CriticScore[];
  selectionResult: SelectionResult;
  totalTime: number;
}

export interface MultiModelResponse extends AIResponse {
  _debug?: MultiModelDebugInfo;
}

export class MultiModelCharmerAI {
  private pitcherService: MarcusPitcherService;
  private criticService: ResponseCriticService;
  private selectorService: ResponseSelectorService;
  
  // Track state for context enrichment
  private marcusIrritation: number = 0;
  private trustLevel: number = 50;
  private exchangeCount: number = 0;
  
  constructor(apiKey?: string) {
    this.pitcherService = new MarcusPitcherService(apiKey);
    this.criticService = new ResponseCriticService();
    this.selectorService = new ResponseSelectorService(apiKey);
  }
  
  /**
   * Generate response using 3-Pitcher architecture
   * Returns winner + full debug info
   */
  async generateResponse(
    userInput: string,
    context: ConversationContext,
    phase: CharmerPhase,
    conversationHistory: string
  ): Promise<MultiModelResponse> {
    const startTime = Date.now();
    
    console.log('[MultiModel] Starting 3-Pitcher generation...');
    
    // Increment exchange count
    this.exchangeCount++;
    
    // Build extended context for pitchers
    const pitcherContext: PitcherContext = {
      ...context,
      exchangeCount: this.exchangeCount,
      marcusIrritation: this.marcusIrritation,
      trustLevel: this.trustLevel
    };
    
    try {
      // STEP 1: Generate 3 candidates in parallel
      const candidates = await this.pitcherService.generateAllCandidates(
        pitcherContext,
        phase,
        conversationHistory
      );
      
      console.log('[MultiModel] Generated 3 candidates:', {
        naturalist: `"${candidates[0].content.substring(0, 40)}..."`,
        character: `"${candidates[1].content.substring(0, 40)}..."`,
        strategy: `"${candidates[2].content.substring(0, 40)}..."`
      });
      
      // STEP 2: Critic scores all candidates (fast, rule-based)
      const scores = candidates.map(c => 
        this.criticService.critiqueFast(c.content, {
          userLastMessage: userInput,
          marcusIrritation: this.marcusIrritation,
          trustLevel: this.trustLevel,
          exchangeCount: this.exchangeCount
        })
      );
      
      console.log('[MultiModel] Critic scores:', {
        naturalist: `${scores[0].human_score} (${scores[0].flags.join(', ') || 'clean'})`,
        character: `${scores[1].human_score} (${scores[1].flags.join(', ') || 'clean'})`,
        strategy: `${scores[2].human_score} (${scores[2].flags.join(', ') || 'clean'})`
      });
      
      // STEP 3: Selector picks winner
      const selectionResult = await this.selectorService.selectBest(
        candidates,
        scores,
        pitcherContext
      );
      
      const winner = selectionResult.winner;
      
      console.log('[MultiModel] Winner selected:', {
        pitcher: winner.pitcherName,
        score: selectionResult.scores[winner.pitcherId],
        reasoning: selectionResult.reasoning,
        totalTime: Date.now() - startTime
      });
      
      // STEP 4: Async feedback loop (non-blocking)
      this.sendFeedbackAsync(candidates, winner, scores, userInput);
      
      // STEP 5: Update Marcus state based on winner's metadata
      this.updateMarcusState(winner, userInput);
      
      const totalTime = Date.now() - startTime;
      
      // Return winner in AIResponse format + debug info
      const response: MultiModelResponse = {
        content: winner.content,
        emotion: winner.emotion,
        shouldTransitionPhase: winner.shouldTransitionPhase,
        nextPhase: winner.nextPhase,
        tacticalFollowUp: winner.tacticalFollowUp,
        _debug: {
          allCandidates: candidates,
          allScores: scores,
          selectionResult,
          totalTime
        }
      };
      
      console.log(`[MultiModel] ✅ Complete in ${totalTime}ms`);
      
      return response;
      
    } catch (error) {
      console.error('[MultiModel] Error in generation:', error);
      
      // Fallback to simple response
      return {
        content: "Yeah, I'm listening.",
        emotion: 'neutral',
        shouldTransitionPhase: false
      };
    }
  }
  
  /**
   * Send feedback to all pitchers (async, non-blocking)
   */
  private sendFeedbackAsync(
    candidates: PitcherResponse[],
    winner: PitcherResponse,
    scores: CriticScore[],
    userInput: string
  ): void {
    // Fire and forget - don't block response
    setTimeout(() => {
      const winnerScore = scores[candidates.indexOf(winner)].human_score;
      const userTone = this.inferUserTone(userInput);
      
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const score = scores[i];
        
        const feedback: PitcherFeedback = {
          timestamp: Date.now(),
          won: candidate.pitcherId === winner.pitcherId,
          yourText: candidate.content,
          yourScore: score.human_score,
          yourFlags: score.flags,
          winnerText: winner.content,
          winnerScore,
          winnerPitcher: winner.pitcherName,
          userTone
        };
        
        this.pitcherService.storeFeedback(candidate.pitcherId, feedback);
      }
      
      console.log('[MultiModel] Feedback sent to all pitchers');
    }, 0);
  }
  
  /**
   * Update Marcus's internal state based on conversation
   */
  private updateMarcusState(winner: PitcherResponse, userInput: string): void {
    // Parse user tone and update irritation
    const userTone = this.inferUserTone(userInput);
    
    if (userTone === 'rude' || userTone === 'pushy') {
      this.marcusIrritation = Math.min(10, this.marcusIrritation + 1);
      this.trustLevel = Math.max(0, this.trustLevel - 10);
    } else if (userTone === 'respectful' || userTone === 'genuine') {
      this.marcusIrritation = Math.max(0, this.marcusIrritation - 0.5);
      this.trustLevel = Math.min(100, this.trustLevel + 5);
    }
    
    // Emotion also affects state
    if (['frustrated', 'annoyed'].includes(winner.emotion)) {
      this.marcusIrritation = Math.min(10, this.marcusIrritation + 0.5);
    }
    
    console.log('[MultiModel] Marcus state updated:', {
      irritation: this.marcusIrritation.toFixed(1),
      trust: this.trustLevel.toFixed(0),
      exchanges: this.exchangeCount
    });
  }
  
  /**
   * Infer user's tone from their message
   */
  private inferUserTone(userInput: string): string {
    const lower = userInput.toLowerCase();
    
    // Rude patterns
    if (/shut up|stupid|idiot|whatever|don't care/.test(lower)) {
      return 'rude';
    }
    
    // Pushy patterns
    if (/just sign|buy now|limited time|act fast/.test(lower)) {
      return 'pushy';
    }
    
    // Genuine/respectful patterns
    if (/appreciate|thank|understand|curious|wondering/.test(lower)) {
      return 'respectful';
    }
    
    // Genuine question patterns
    if (/how are you|how's business|what do you/.test(lower)) {
      return 'genuine';
    }
    
    return 'neutral';
  }
  
  /**
   * Get pitcher statistics for analysis
   */
  getPitcherStats(): any {
    return this.pitcherService.getStatistics();
  }
  
  /**
   * Get Marcus's current emotional state
   */
  getMarcusState(): { irritation: number; trust: number; exchanges: number } {
    return {
      irritation: this.marcusIrritation,
      trust: this.trustLevel,
      exchanges: this.exchangeCount
    };
  }
  
  /**
   * Reset state for new conversation
   */
  reset(): void {
    this.marcusIrritation = 0;
    this.trustLevel = 50;
    this.exchangeCount = 0;
    console.log('[MultiModel] State reset for new conversation');
  }
}

/**
 * PostCallAnalyzer - Handles post-call moment detection and analysis
 * 
 * Responsibilities:
 * - Critical moment detection
 * - Moment feedback generation
 * - Call metrics calculation
 * - Post-call data assembly
 */

import { CriticalMomentDetector } from '../CriticalMomentDetector';
import { MomentFeedbackGenerator } from '../MomentFeedbackGenerator';
import { MomentViewModelMapper } from '../MomentViewModelMapper';
import { HybridFeedbackGenerator } from '../HybridFeedbackGenerator';
import { analyzeUserQuestions } from '../QuestionDetector';
import { CallMetrics } from '../CallMetrics';
import { ConversationTracker } from '../ConversationTranscript';
import { TurnTracker } from '../TurnTracker';
import type { PostCallMomentViewModel } from '../PostCallMomentViewModel';

export interface PostCallData {
  moments: PostCallMomentViewModel[];
  metrics: CallMetrics;
  transcript: Array<{ role: 'user' | 'marcus'; content: string; timestamp: number }>;
  duration: number;
  sessionId: string;
}

export class PostCallAnalyzer {
  private momentDetector: CriticalMomentDetector;
  private feedbackGenerator: MomentFeedbackGenerator;
  private hybridFeedback: HybridFeedbackGenerator;

  constructor() {
    this.momentDetector = new CriticalMomentDetector();
    this.feedbackGenerator = new MomentFeedbackGenerator();
    this.hybridFeedback = new HybridFeedbackGenerator();
  }

  /**
   * Analyze call and generate post-call data
   */
  async analyzeCall(
    turnTracker: TurnTracker,
    conversationTracker: ConversationTracker,
    sessionId: string,
    callStartTime: number
  ): Promise<PostCallData> {
    console.log('📊 [PostCallAnalyzer] Starting post-call analysis');

    const endTime = Date.now();
    const duration = endTime - callStartTime;

    // Get conversation data
    const exchanges = turnTracker.getAllExchanges();
    const transcript = conversationTracker.getTranscript();

    console.log(`📋 [PostCallAnalyzer] Analyzing ${exchanges.length} exchanges`);

    // Detect critical moments using LLM
    const detectedMoments = await this.momentDetector.detectCriticalMomentsWithLLM(
      transcript,
      conversationTracker
    );

    console.log(`🔍 [PostCallAnalyzer] Detected ${detectedMoments.length} critical moments`);

    // Generate feedback for each moment
    const momentsWithFeedback = await Promise.all(
      detectedMoments.map(async (moment) => {
        // Generate hybrid feedback (combines rule-based + LLM)
        const feedback = await this.hybridFeedback.generateFeedback(moment, transcript);
        
        return {
          ...moment,
          feedback
        };
      })
    );

    // Map to view models
    const viewModels = MomentViewModelMapper.mapToViewModels(momentsWithFeedback);

    // Calculate call metrics
    const metrics = this.calculateMetrics(exchanges, transcript, duration);

    console.log(`✅ [PostCallAnalyzer] Analysis complete:`, {
      moments: viewModels.length,
      duration: `${Math.floor(duration / 1000)}s`,
      questionsAsked: metrics.questionsAsked.total
    });

    return {
      moments: viewModels,
      metrics,
      transcript: transcript.map(ex => ({
        role: ex.speaker as 'user' | 'marcus',
        content: ex.text,
        timestamp: ex.timestamp
      })),
      duration,
      sessionId
    };
  }

  /**
   * Calculate call metrics
   */
  private calculateMetrics(
    exchanges: any[],
    transcript: any[],
    duration: number
  ): CallMetrics {
    // Analyze questions asked
    const userMessages = transcript
      .filter(ex => ex.speaker === 'user')
      .map(ex => ex.text);
    
    const questionAnalysis = analyzeUserQuestions(userMessages);

    // Calculate talk time ratio
    const userWordCount = userMessages.reduce(
      (sum, msg) => sum + msg.split(/\s+/).length,
      0
    );
    
    const marcusMessages = transcript.filter(ex => ex.speaker === 'marcus');
    const marcusWordCount = marcusMessages.reduce(
      (sum, msg) => sum + msg.text.split(/\s+/).length,
      0
    );
    
    const totalWords = userWordCount + marcusWordCount;
    const userTalkRatio = totalWords > 0 ? userWordCount / totalWords : 0;

    // Calculate average response time (would need timestamp data)
    const avgResponseTime = 2.5; // Placeholder

    return {
      duration: Math.floor(duration / 1000),
      totalExchanges: exchanges.length,
      userTalkRatio,
      questionsAsked: questionAnalysis,
      avgResponseTime,
      momentsDetected: 0 // Will be filled by caller
    };
  }

  /**
   * Generate quick summary for specific moment
   */
  async generateMomentSummary(
    moment: any,
    context: string[]
  ): Promise<string> {
    return this.feedbackGenerator.generateSummary(moment, context);
  }

  /**
   * Re-analyze specific moment with more detail
   */
  async deepDiveMoment(
    moment: any,
    fullTranscript: any[]
  ): Promise<any> {
    console.log('🔬 [PostCallAnalyzer] Deep dive analysis for moment:', moment.id);
    
    // Get surrounding context (3 exchanges before and after)
    const momentIndex = fullTranscript.findIndex(ex => ex.timestamp === moment.timestamp);
    const contextStart = Math.max(0, momentIndex - 3);
    const contextEnd = Math.min(fullTranscript.length, momentIndex + 4);
    const context = fullTranscript.slice(contextStart, contextEnd);

    // Generate detailed feedback
    const detailedFeedback = await this.hybridFeedback.generateFeedback(moment, context);

    return {
      ...moment,
      detailedFeedback,
      context
    };
  }

  /**
   * Export call data for external analysis
   */
  exportCallData(postCallData: PostCallData): string {
    return JSON.stringify({
      sessionId: postCallData.sessionId,
      duration: postCallData.duration,
      metrics: postCallData.metrics,
      moments: postCallData.moments.map(m => ({
        type: m.type,
        timestamp: m.timestamp,
        userText: m.userText,
        marcusResponse: m.marcusResponse,
        impact: m.impact
      })),
      transcript: postCallData.transcript
    }, null, 2);
  }
}

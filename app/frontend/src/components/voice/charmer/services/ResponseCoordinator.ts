/**
 * ResponseCoordinator - Manages Marcus's response generation and TTS coordination
 * 
 * Responsibilities:
 * - AI response generation orchestration
 * - Strategy layer integration
 * - Judgment gate routing
 * - TTS coordination
 * - Response metadata tracking
 */

import { CharmerAIService } from '../CharmerAIService';
import { StrategyLayer, StrategyContext, BuyerState } from '../StrategyLayer';
import { JudgmentGate, JudgmentContext } from '../JudgmentGate';
import { QuestionClassifier, QuestionClassification } from '../QuestionClassifier';
import { CharmerPhase } from '../CharmerPhaseManager';
import { TurnTracker } from '../TurnTracker';
import { ConversationTracker } from '../ConversationTranscript';

export interface ResponseRequest {
  userText: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  phase: CharmerPhase;
  turnContext: ReturnType<TurnTracker['getCurrentContext']>;
  buyerState?: BuyerState;
}

export interface MarcusResponse {
  content: string;
  emotion: string;
  shouldTransitionPhase: boolean;
  nextPhase?: CharmerPhase;
  resistanceLevel?: number;
  objection?: string;
  speculativeFollowUp?: {
    text: string;
    type: 'nudge_question' | 'micro_noise';
  };
  endCall?: boolean;
}

export interface JudgmentDecision {
  action: 'speak' | 'hold' | 'suppress';
  reason: string;
  delayMs?: number;
}

export class ResponseCoordinator {
  private aiService: CharmerAIService;
  private strategyLayer: StrategyLayer;
  private judgmentGate: JudgmentGate;
  private questionClassifier: QuestionClassifier;

  constructor() {
    this.aiService = new CharmerAIService();
    this.strategyLayer = new StrategyLayer();
    this.judgmentGate = new JudgmentGate();
    this.questionClassifier = new QuestionClassifier();
  }

  /**
   * Generate Marcus's response to user input
   */
  async generateResponse(
    request: ResponseRequest,
    abortSignal?: AbortSignal
  ): Promise<MarcusResponse> {
    console.log(`🤖 [ResponseCoordinator] Generating response for phase: ${request.phase}`);

    // Classify user input
    const questionType = this.questionClassifier.classify(request.userText);
    console.log(`🔍 [ResponseCoordinator] Question type: ${questionType}`);

    // Check for speculative response (instant rapport questions)
    const speculativeResponse = this.trySpeculativeResponse(request.userText, questionType);
    if (speculativeResponse) {
      console.log(`⚡ [ResponseCoordinator] Using speculative response`);
      return speculativeResponse;
    }

    // Build strategy context
    const strategyContext = this.buildStrategyContext(request);

    // Get strategy recommendations
    const strategy = this.strategyLayer.determineStrategy(strategyContext);
    console.log(`📊 [ResponseCoordinator] Strategy:`, {
      posture: strategy.posture,
      resistance: strategy.currentResistance,
      emotion: strategy.emotionalState
    });

    // Generate AI response
    const aiResponse = await this.aiService.generateResponse(
      {
        phase: request.phase,
        conversationHistory: request.conversationHistory,
        userInput: request.userText,
        conversationContext: {} // Will be populated from phase manager
      },
      abortSignal
    );

    // Merge strategy data into response
    return {
      ...aiResponse,
      resistanceLevel: strategy.currentResistance,
      objection: strategy.objectionToRaise,
      speculativeFollowUp: aiResponse.tacticalFollowUp
    };
  }

  /**
   * Apply judgment gate to determine if/when Marcus should speak
   */
  applyJudgmentGate(
    response: MarcusResponse,
    userText: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  ): JudgmentDecision {
    const judgmentContext: JudgmentContext = {
      userText,
      marcusResponse: response.content,
      conversationHistory,
      questionType: this.questionClassifier.classify(userText),
      wasInterrupted: false // Will be set by caller if needed
    };

    const decision = this.judgmentGate.decide(judgmentContext);

    console.log(`⚖️ [ResponseCoordinator] Judgment: ${decision.action} - ${decision.reason}`);

    return decision;
  }

  /**
   * Try to generate instant speculative response for simple questions
   */
  private trySpeculativeResponse(
    userText: string,
    questionType: QuestionClassification
  ): MarcusResponse | null {
    // Only for simple rapport questions
    if (questionType !== 'rapport') return null;

    const lowerText = userText.toLowerCase().trim();

    // Common greetings
    if (/^(hey|hi|hello|yo|sup|what's up)/i.test(lowerText)) {
      return {
        content: "Hey! How's it going?",
        emotion: 'happy',
        shouldTransitionPhase: false
      };
    }

    // "How are you"
    if (/how are you|how're you|how you doing/i.test(lowerText)) {
      return {
        content: "Good! Appreciate you asking.",
        emotion: 'warm',
        shouldTransitionPhase: false
      };
    }

    // "Do you remember me"
    if (/remember me|do you know who/i.test(lowerText)) {
      return {
        content: "Of course! Good to hear from you again.",
        emotion: 'warm',
        shouldTransitionPhase: false
      };
    }

    return null;
  }

  /**
   * Build strategy context from request
   */
  private buildStrategyContext(request: ResponseRequest): StrategyContext {
    return {
      phase: request.phase === 'prospect' ? 0 : 1, // Map to strategy phase numbers
      conversationHistory: request.conversationHistory,
      userInput: request.userText,
      turnContext: request.turnContext,
      repQualitySignals: {
        askedDiscovery: this.detectDiscoveryQuestions(request.userText),
        buildingRapport: this.detectRapportBuilding(request.userText),
        talkingTooMuch: request.userText.split(' ').length > 100,
        makingAssumptions: /i assume|i bet|probably|i think you/i.test(request.userText),
        providingValue: this.detectValueProvision(request.userText)
      }
    };
  }

  /**
   * Detect if user asked discovery questions
   */
  private detectDiscoveryQuestions(text: string): boolean {
    const discoveryPatterns = [
      /what.*challenge/i,
      /what.*struggle/i,
      /what.*frustrat/i,
      /tell me about/i,
      /walk me through/i,
      /what.*keep.*up at night/i,
      /what.*priority/i,
      /what.*goal/i
    ];
    return discoveryPatterns.some(p => p.test(text));
  }

  /**
   * Detect rapport building
   */
  private detectRapportBuilding(text: string): boolean {
    const rapportPatterns = [
      /how.*you/i,
      /what.*doing/i,
      /tell me about yourself/i,
      /interesting/i,
      /appreciate/i
    ];
    return rapportPatterns.some(p => p.test(text));
  }

  /**
   * Detect value provision (case studies, specific examples)
   */
  private detectValueProvision(text: string): boolean {
    return /similar.*client|case study|for example|specifically|data shows|research/i.test(text);
  }

  /**
   * Reset coordinator state
   */
  reset(): void {
    this.strategyLayer = new StrategyLayer();
    console.log('🔄 [ResponseCoordinator] Reset');
  }
}

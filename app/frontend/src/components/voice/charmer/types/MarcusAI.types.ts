/**
 * Type definitions for Marcus AI system
 * Extracted from CharmerAIService for cleaner module structure
 */

import { CharmerPhase, ConversationContext } from '../CharmerPhaseManager';
import { type PatternMatch } from '../FirstUtterancePatternDetector';
import { type BuyerState } from '../StrategyLayer';

/**
 * Tactical silence follow-up (pre-buffered with main response)
 * LLM generates this deterministically based on context
 * Frontend decides whether to actually use it (probability + phase gating)
 */
export interface TacticalFollowUp {
  text: string;  // Max 8 words
  type: 'micro_noise' | 'nudge_question';  // micro: "Mm." "Right." | nudge: "What are you thinking?"
}

/**
 * Callback for sentence streaming - called when first sentence is ready
 */
export type SentenceStreamCallback = (firstSentence: string, emotion?: string) => void;

export interface AIRequestContext {
  phase: CharmerPhase;
  conversationContext: ConversationContext;
  userInput: string;
  phasePromptContext: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  buyerState?: BuyerState; // How Marcus feels/behaves (replaces strategyConstraints)
  scenario?: any; // MarcusScenario - optional for challenge mode
  patternMatch?: PatternMatch; // For focused instant responses
  previousStrategicMoment?: StrategicMoment; // What Marcus just said/asked (detected by pattern or LLM)
  questionCategory?: 'instant' | 'quick' | 'thoughtful' | 'deliberate' | 'statement'; // Influences response length/detail
  marcusTraits?: {
    painLevel: string;
    urgency: string;
    budget: string;
    openness: string;
    painPoints: string[];
    currentSolution: string;
    satisfactionLevel: number;
    decisionTimeframe: string;
    primaryConcern: string;
  };
}

export interface ObjectionTag {
  objection_id: string; // budget, timing, skepticism, cold_outreach
  severity: number; // 0-1
  satisfied: number; // 0-1 gradient (0=just raised, 1=fully resolved)
  surfaced_roots: string[]; // Which roots Marcus is aware of
  hidden_roots: string[]; // Subconscious blocks
}

export type StrategicMomentType = 
  | 'permission_signal'      // Marcus gives permission: "Send me something", "Tell me more"
  | 'differentiation_ask'    // Marcus asks what makes this different
  | 'pain_reveal'            // Marcus reveals a need/problem for first time
  | 'soft_exit'              // Marcus signals he's wrapping up: "I'm busy", "Send me something"
  | 'question_dodge'         // User dodged Marcus's direct question
  | 'overtalking'            // User is talking too much after Marcus signaled impatience
  | null;

export interface StrategicMoment {
  type: StrategicMomentType;
  signal: string; // Brief coaching message (max 10 words)
}

export type BuyerLadderStage =
  | 'ORIENT'
  | 'RELEVANCE'
  | 'VALUE'
  | 'CREDIBILITY'
  | 'FIT'
  | 'MECHANICS'
  | 'ECONOMICS'
  | 'TIMING'
  | 'COMMITMENT';

export type MarcusMomentTag =
  | 'ignored_question'       // User dodged or ignored Marcus's direct question
  | 'premature_close'        // User pushed for commitment before earning it
  | 'strong_pitch'           // User clearly explained value/fit
  | 'good_question'          // User asked a genuinely relevant discovery question
  | 'rude_or_dismissive'     // User was condescending or dismissive
  | 'overtalking'            // User talked too long without checking in
  | 'objection_handled'      // User addressed Marcus's concern effectively
  | 'objection_dodged'       // User avoided or deflected a real objection
  | 'pain_uncovered'         // User successfully drew out a pain point
  | 'social_proof_landed'    // User's proof/example actually resonated
  | 'credibility_moment'     // User said something that genuinely built trust
  | 'lost_the_thread';       // User's response confused or lost Marcus

export interface MarcusStateFeedback {
  user_respect_level?: number;
  marcus_irritation_delta?: number;
  purpose_clarity_delta?: number;
  extracted_name?: string;
  extracted_company?: string;
  strategic_moment?: StrategicMoment;
  follow_up_agreed?: boolean;
  buyer_ladder_stage?: BuyerLadderStage;
  moment?: MarcusMomentTag;
}

export interface AIResponse {
  content: string;
  emotion: 'neutral' | 'happy' | 'excited' | 'amused' | 'warm' | 'interested' | 'curious' | 'skeptical' | 'disappointed' | 'frustrated' | 'annoyed' | 'worried' | 'surprised' | 'intrigued';
  shouldTransitionPhase?: boolean;
  nextPhase?: CharmerPhase;
  tacticalFollowUp?: TacticalFollowUp;
  endCall?: boolean; // Marcus signals he's ready to end the call
  objection?: ObjectionTag; // Marcus raising or evaluating an objection
  stateFeedback?: MarcusStateFeedback;
  strategicMoment?: StrategicMoment;
  generation_failed_fallback?: boolean; // Mark fallback responses to prevent analytics pollution
  extractedInfo?: {
    name?: string;
    product?: string;
    issue?: string;
    strength?: string;
  };
}

// Available models via OpenRouter (easy to swap)
export const MARCUS_AI_MODELS = {
  'gemini-flash': 'google/gemini-2.5-flash',         // Paid Gemini via OpenRouter (OPENROUTER_API_KEY)
  'gpt-4o-mini': 'openai/gpt-4o-mini',           // ~1-2s, reliable, via OpenRouter
  'claude-haiku': 'anthropic/claude-3-haiku',    // Fast Anthropic model
  'claude-sonnet': 'anthropic/claude-3-5-sonnet', // Slower, more thoughtful
  'gpt-4o': 'openai/gpt-4o',                     // Slower, smarter
  'llama-70b': 'meta-llama/llama-3.1-70b-instruct', // Open source, direct
  'mistral': 'mistralai/mistral-large'            // European, less customer-service-y
} as const;

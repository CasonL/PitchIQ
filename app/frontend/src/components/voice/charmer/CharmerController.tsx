/**
 * CharmerController.tsx
 * Main controller component for Marcus Stindle demo experience
 * Now using AssemblyAI + Cartesia for 100% control and 50% cost savings
 */

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Phone as CallIcon, PhoneOff as EndCallIcon } from 'lucide-react';
import { MarcusVoiceProvider, useMarcusVoice } from './MarcusVoiceAdapter';
import { CharmerPhaseManager, CharmerPhase } from './CharmerPhaseManager';
import { CharmerContextExtractor } from './CharmerContextExtractor';
import { CharmerAIService } from './CharmerAIService';
import { QuestionClassifier, QuestionClassification } from './QuestionClassifier';
import { JudgmentGate, JudgmentContext } from './JudgmentGate';
import { StrategyLayer, StrategyContext, StrategyOutput, BuyerState } from './StrategyLayer';
import { SentenceCompletenessAnalyzer } from './SentenceCompleteness';
import { CognitiveCompletenessAnalyzer } from './CognitiveCompleteness';
import { CHARMER_PERSONA } from '../../../data/staticPersonas/theCharmer';
import { MarcusPostCallMoments } from './MarcusPostCallMoments';
import { StrategicMomentCoach } from './StrategicMomentCoach';
import { StrategicMomentDetector } from './StrategicMomentDetector';
import { StrategicMomentPatternDetector } from './StrategicMomentPatternDetector';
import { useOverseer } from './useOverseer';
import { MomentViewModelMapper } from './MomentViewModelMapper';
import { HybridFeedbackGenerator } from './HybridFeedbackGenerator';
import { MomentFeedbackIntegration } from './MomentFeedbackIntegration';
import { analyzeUserQuestions } from './QuestionDetector';
import { CallMetrics, QuestionAnalysis } from './CallMetrics';
import { MarcusScenario } from './MarcusScenarios';
import { MarcusChallengeLobby } from './MarcusChallengeLobby';
import { getRandomMarcusTraits } from './MarcusTraits';
import { FirstUtterancePatternDetector } from './FirstUtterancePatternDetector';
import { TranscriptQualityDetector } from './TranscriptQualityDetector';
import { TrainingWheels } from './TrainingWheels';
import { FrameworkAnalyzer } from './FrameworkAnalyzer';
import { CriticalMomentDetector } from './CriticalMomentDetector';
import { CallCompletionData, StoredFeedbackData, StoredCallState } from './types/CallData';
import { LocalStorageService } from './services/LocalStorageService';
import { ObjectionGenerator, DiscoveryContext } from './ObjectionGenerator';
import { ConversationTracker } from './ConversationTranscript';

interface CharmerControllerProps {
  onCallEnd?: () => void;
  onCallComplete?: (callData: CallCompletionData) => void;
  autoStart?: boolean;
}

/**
 * CharmerControllerContent - Inner component using MarcusVoice context
 */
const CharmerControllerContent = memo(({ 
  onCallEnd, 
  onCallComplete,
  autoStart = false 
}: CharmerControllerProps) => {
  const { 
    startCall, 
    endCall, 
    isConnected, 
    isConnecting,
    transcript,
    isFinalTranscript,
    error,
    speakAsMarcus,
    isSpeaking
  } = useMarcusVoice();
  
  // Overseer - dynamic scenario architect
  const { analyzeConversation, getGuidance, clearCache: clearOverseerCache, isEnabled: isOverseerEnabled } = useOverseer();
  
  // Phase management
  const phaseManagerRef = useRef(new CharmerPhaseManager());
  const [currentPhase, setCurrentPhase] = useState<CharmerPhase>('prospect');
  const [phaseContext, setPhaseContext] = useState(phaseManagerRef.current.getContext());
  // AI service
  const aiServiceRef = useRef(new CharmerAIService());
  
  // Scenario state
  const [selectedScenario, setSelectedScenario] = useState<MarcusScenario | null>(() => {
    // Restore active scenario from localStorage on mount
    const result = LocalStorageService.getItem<StoredCallState>('activeCall');
    if (result.success && result.data) {
      console.log('🔄 Restored active scenario from localStorage');
      return result.data.scenario;
    }
    if (!result.success && result.error) {
      console.error('❌ Failed to restore active scenario:', result.error);
    }
    return null;
  });
  const [showScenarioSelector, setShowScenarioSelector] = useState(() => {
    // Don't show scenario selector if we have saved feedback OR active call
    const feedbackResult = LocalStorageService.getItem<StoredFeedbackData>('feedbackData');
    const callResult = LocalStorageService.getItem<StoredCallState>('activeCall');
    const hasFeedback = feedbackResult.success && feedbackResult.data !== undefined;
    const hasActiveCall = callResult.success && callResult.data !== undefined;
    return !hasFeedback && !hasActiveCall;
  });
  const [isRinging, setIsRinging] = useState(false);
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Phone ringing audio with Web Audio API for volume boost
  const phoneRingAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  
  // Initialize phone ring audio on mount - simple HTML audio
  useEffect(() => {
    phoneRingAudioRef.current = new Audio('/phone-ring.mp3');
    phoneRingAudioRef.current.loop = true;
    phoneRingAudioRef.current.volume = 1.0; // Max volume
    phoneRingAudioRef.current.preload = 'auto';
    
    // Debug events to check if file loads
    phoneRingAudioRef.current.addEventListener('loadeddata', () => {
      console.log('🔊 Phone ring audio loaded successfully', {
        duration: phoneRingAudioRef.current?.duration,
        readyState: phoneRingAudioRef.current?.readyState
      });
    });
    phoneRingAudioRef.current.addEventListener('error', (e) => {
      console.error('❌ Phone ring audio failed to load:', e);
      console.error('Error details:', phoneRingAudioRef.current?.error);
    });
    phoneRingAudioRef.current.addEventListener('canplay', () => {
      console.log('✅ Phone ring audio can play');
    });
    
    console.log('🔊 Phone ring audio initialized (HTML audio element)');
    
    return () => {
      if (phoneRingAudioRef.current) {
        phoneRingAudioRef.current.pause();
        phoneRingAudioRef.current = null;
      }
    };
  }, []);
  
  // Conversation state
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [momentFeedbackData, setMomentFeedbackData] = useState<StoredFeedbackData | null>(() => {
    // Restore feedback data from localStorage on mount
    const result = LocalStorageService.getItem<StoredFeedbackData>('feedbackData');
    if (result.success && result.data) {
      console.log('🔄 Restored feedback data from localStorage');
      return result.data;
    }
    if (!result.success && result.error) {
      console.error('❌ Failed to restore feedback data:', result.error);
    }
    return null;
  });
  const [showMomentFeedback, setShowMomentFeedback] = useState(() => {
    // Show feedback if we have saved feedback data in localStorage
    const result = LocalStorageService.getItem<StoredFeedbackData>('feedbackData');
    return result.success && result.data !== undefined;
  });
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  
  // Strategic moment coaching state
  const [currentStrategicMoment, setCurrentStrategicMoment] = useState<{
    type: string;
    signal: string;
    timestamp: number;
  } | null>(null);
  const [currentResistance, setCurrentResistance] = useState(6);
  const [lastResistance, setLastResistance] = useState(6);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const lastTranscriptRef = useRef('');
  const transcriptRef = useRef(''); // Track current transcript for timeout callbacks
  const [isProcessing, setIsProcessing] = useState(false);
  const wasInterruptedRef = useRef(false);
  const incompleteUtteranceRef = useRef('');
  const lastMarcusSpeakTimeRef = useRef(0);
  const lastUserSpeechTimeRef = useRef(0);
  const speculativeResponseRef = useRef<Promise<any> | null>(null);
  const lastClassificationRef = useRef<QuestionClassification | null>(null);
  const judgmentGateRef = useRef(new JudgmentGate());
  const strategyLayerRef = useRef(new StrategyLayer());
  const hybridFeedbackRef = useRef(new MomentFeedbackIntegration());
  const objectionGeneratorRef = useRef(new ObjectionGenerator()); // Generate product-specific objections
  const lastObjectionRef = useRef<string | undefined>(undefined); // Track last objection for escalation
  const utteranceCountRef = useRef(0); // Track number of complete utterances
  const processingTranscriptRef = useRef<string>(''); // Track which transcript we're processing
  const utteranceGraceTimerRef = useRef<NodeJS.Timeout | null>(null); // Grace period after UtteranceEnd
  const pendingUtteranceRef = useRef<{text: string; count: number} | null>(null); // Pending utterance during grace
  const queuedUtterancesRef = useRef<Array<{text: string; count: number}>>([]); // Queue multiple utterances if processing
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null); // Track silence after Marcus speaks
  const silenceStartRef = useRef(0); // When silence started
  const lastMarcusMessageRef = useRef(''); // Last thing Marcus said
  
  // Wake lock for mobile - prevent screen timeout during calls
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  // Detect and fix blank state (stale localStorage blocking UI)
  useEffect(() => {
    const isBlankState = !showScenarioSelector && !showMomentFeedback && !isGeneratingFeedback && !isRinging && !isConnecting && !isConnected;
    
    if (isBlankState) {
      console.log('⚠️ Detected blank state - clearing stale data and showing scenario selector');
      // Clear stale localStorage
      LocalStorageService.removeItem('feedbackData');
      LocalStorageService.removeItem('activeCall');
      // Show scenario selector
      setShowScenarioSelector(true);
      setShowMomentFeedback(false);
      setSelectedScenario(null);
    }
  }, [showScenarioSelector, showMomentFeedback, isGeneratingFeedback, isRinging, isConnecting, isConnected]);
  
  // Refs for tracking
  const sessionIdRef = useRef<string | null>(null);
  const conversationTrackerRef = useRef<ConversationTracker | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const nameMentionCountRef = useRef<{[key: string]: number}>({});
  /**
   * Generate session ID
   */
  const generateSessionId = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `charmer_${timestamp}_${random}`;
  }, []);
  
  /**
   * Handle phase transitions
   */
  const transitionToPhase = useCallback((nextPhase: CharmerPhase) => {
    console.log(`🔄 Transitioning to Phase ${nextPhase}`);
    phaseManagerRef.current.transitionToPhase(nextPhase);
    setCurrentPhase(nextPhase);
    setPhaseContext(phaseManagerRef.current.getContext());
  }, []);
  
  // Greeting now handled by Deepgram Agent API automatically
  
  /**
   * Process user's speech input
   */
  const processUserInput = useCallback(async (userText: string, utteranceSnapshot: number) => {
    console.log(`🔧 [DEBUG] processUserInput called: utterance #${utteranceSnapshot}, isProcessing=${isProcessing}, text="${userText.substring(0, 60)}..."`);
    
    if (isProcessing) {
      // Accumulate fragments - user is continuing their thought while Marcus processes
      console.log(`⏸️ Already processing - queuing utterance #${utteranceSnapshot}`);
      queuedUtterancesRef.current.push({ text: userText, count: utteranceSnapshot });
      console.log(`📦 Queue size: ${queuedUtterancesRef.current.length}`);
      return;
    }
    
    // Clear any stale interrupt flag from previous utterances
    const wasInterrupted = wasInterruptedRef.current;
    wasInterruptedRef.current = false;
    
    setIsProcessing(true);
    const processingUtteranceCount = utteranceSnapshot;
    console.log(`📝 Processing user input: "${userText.substring(0, 50)}..." (utterance #${processingUtteranceCount})`);
    
    let aiResponse: any;
    let phaseManager: any;
    let strategyOutput: StrategyOutput;
    let buyerState: BuyerState;
    let strategyContext: StrategyContext | undefined;
    let buyerStateBefore: BuyerState | undefined;
    
    try {
      // Classify question early - needed for all response paths
      const classification = QuestionClassifier.classify(userText);
      
      // Check transcript quality - detect garbled/poor STT
      const qualityCheck = TranscriptQualityDetector.assess(userText);
      
      if (qualityCheck.isLikelyGarbled) {
        console.log(`🔊 Poor transcript quality detected (${Math.round(qualityCheck.confidence * 100)}% confidence)`);
        console.log(`   Issues: ${qualityCheck.issues.join(', ')}`);
        console.log(`   Original: "${userText}"`);
        
        // Generate adaptive clarification - Marcus acknowledges what he understood
        // and asks for clarification on unclear parts (instead of generic "can you repeat that")
        console.log(`🎤 Generating adaptive clarification response...`);
        
        const phaseManager = phaseManagerRef.current;
        const currentPhaseStr = phaseManager.getCurrentPhase();
        
        // Pass garbled text to AI - prompt has ADAPTIVE CLARIFICATION instructions
        aiResponse = await aiServiceRef.current.generateResponse({
          phase: currentPhaseStr,
          conversationContext: phaseManager.getContext(),
          userInput: userText,
          phasePromptContext: phaseManager.getPhasePromptContext(),
          conversationHistory: conversationHistory,
          questionCategory: classification.category
        }, undefined, undefined, getGuidance());
        
        console.log(`🎤 Marcus [confused]: "${aiResponse.content}"`);
        
        // Speak the adaptive clarification
        await speakAsMarcus(aiResponse.content, {
          voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
          emotion: 'worried',
          speed: 0.75
        });
        
        lastMarcusSpeakTimeRef.current = Date.now();
        
        // Add to conversation history as clarification request
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', content: userText },
          { role: 'assistant', content: aiResponse.content }
        ]);
        
        // Track garbled audio clarification
        if (conversationTrackerRef.current) {
          conversationTrackerRef.current.addUserMessage(userText);
          conversationTrackerRef.current.addMarcusMessage(aiResponse.content, 5);
        }
        
        setIsProcessing(false);
        return;
      }
      
      phaseManager = phaseManagerRef.current;
      const currentPhaseStr = phaseManager.getCurrentPhase();
      // Map string phase to number for StrategyLayer compatibility
      const phaseMap: Record<CharmerPhase, number> = { 'prospect': 1, 'coach': 2, 'exit': 3 };
      const currentPhaseNum = phaseMap[currentPhaseStr];
      const context = phaseManager.getContext();
      
      // Add user input to conversation history
      setConversationHistory(prev => [...prev, { role: 'user', content: userText }]);
      
      // Track message for feedback generation
      if (conversationTrackerRef.current) {
        conversationTrackerRef.current.addUserMessage(userText);
      }
      
      // Extract information from user's speech
      // Pass current name to allow corrections and utterance count to limit name extraction to introductions
      // Pass conversationHistory for context-aware coaching feedback
      const extracted = CharmerContextExtractor.extractAll(userText, context.userName, processingUtteranceCount, conversationHistory);
      
      // Update context with extracted info (allow name updates for corrections)
      if (extracted.name) {
        if (context.userName && extracted.name !== context.userName) {
          // Name correction detected - reset counts and use corrected name immediately
          nameMentionCountRef.current = { [extracted.name]: 1 };
          phaseManager.updateContext({ userName: extracted.name });
          console.log(`🔄 Name corrected: ${context.userName} → ${extracted.name}`);
        } else if (!context.userName) {
          // First time seeing this name - track it but require 2 mentions to confirm
          if (!nameMentionCountRef.current[extracted.name]) {
            nameMentionCountRef.current[extracted.name] = 0;
          }
          nameMentionCountRef.current[extracted.name]++;
          
          console.log(`📊 Name mention count for "${extracted.name}": ${nameMentionCountRef.current[extracted.name]}`);
          
          // Only set name after 2 mentions
          if (nameMentionCountRef.current[extracted.name] >= 2) {
            phaseManager.updateContext({ userName: extracted.name });
            console.log(`✅ Captured user name: ${extracted.name} (confirmed after ${nameMentionCountRef.current[extracted.name]} mentions)`);
          } else {
            console.log(`⏳ Waiting for confirmation... (need 1 more mention of "${extracted.name}")`);
          }
        }
      }
      
      if (extracted.product && !context.product) {
        phaseManager.updateContext({ product: extracted.product });
        console.log(`✅ Captured product: ${extracted.product}`);
        
        // Trigger objection generation for product category
        const discoveryContext: DiscoveryContext = {
          productCategory: extracted.product,
          keyFeatures: [],
          differentiators: [],
          proofPoints: [],
          trigger: 'product_category',
          triggerContent: extracted.product
        };
        objectionGeneratorRef.current.generateForDiscovery(discoveryContext);
      }
      
      // Track memorable phrases for Marcus's memory
      if (extracted.memorablePhrase) {
        const currentPhrases = context.memorablePhrases || [];
        if (!currentPhrases.includes(extracted.memorablePhrase)) {
          phaseManager.updateContext({ 
            memorablePhrases: [...currentPhrases, extracted.memorablePhrase]
          });
        }
      }
      
      // Track extracted features (from product descriptions)
      const featurePatterns = [
        /\b(AI|artificial intelligence|machine learning|automation|analytics)\b/i,
        /\b(role play|roleplay|training|coaching|practice|simulation)\b/i,
        /\b(feedback|insights|scoring|analysis|evaluation)\b/i,
        /\b(real-time|instant|immediate|live)\b/i,
        /\b(personalized|custom|tailored|adaptive)\b/i
      ];
      
      const detectedFeatures: string[] = [];
      for (const pattern of featurePatterns) {
        const match = userText.match(pattern);
        if (match) {
          detectedFeatures.push(match[0].toLowerCase());
        }
      }
      
      if (detectedFeatures.length > 0) {
        const currentFeatures = context.extractedFeatures || [];
        const newFeatures = detectedFeatures.filter(f => !currentFeatures.includes(f));
        if (newFeatures.length > 0) {
          phaseManager.updateContext({ 
            extractedFeatures: [...currentFeatures, ...newFeatures]
          });
        }
      }
      
      // Extract pitch analysis for coaching potential
      if (extracted.detectedIssues && extracted.detectedIssues.length > 0) {
        const issue = CharmerContextExtractor.pickOneIssue(extracted.detectedIssues);
        const strength = CharmerContextExtractor.pickOneStrength(extracted.strengths, userText);
        
        if (issue) {
          phaseManager.updateContext({ 
            identifiedIssue: issue.type,
            whatWorked: strength || 'You got through the core idea clearly'
          });
          console.log(`🎯 Analysis: Issue=${issue.type}, Strength=${strength}`);
        }
      }
      
      // STRATEGY LAYER: Determine Marcus's emotional state, resistance, and what he'll reveal
      const repQualitySignals = strategyLayerRef.current.analyzeRepQuality(userText, conversationHistory);
      
      // Build TurnContext from conversation history
      const totalExchanges = conversationHistory.length;
      const totalTurns = Math.floor(totalExchanges / 2);
      const elapsedMs = callStartTimeRef.current ? Date.now() - callStartTimeRef.current : 0;
      
      const turnContext: TurnContext = {
        currentTurnId: `turn-${totalTurns + 1}`,
        currentPairIndex: totalTurns,
        totalExchanges,
        totalTurns,
        elapsedSeconds: elapsedMs / 1000,
        elapsedMs,
        isUserTurn: false // About to be Marcus's turn
      };
      
      // 🎯 CAPTURE STATE BEFORE TURN (for canonical event)
      buyerStateBefore = strategyLayerRef.current.getCurrentBuyerState();
      
      strategyContext = {
        phase: currentPhaseNum,
        conversationHistory,
        userInput: userText,
        turnContext, // Pass turn context for impatience logic
        lastObjection: lastObjectionRef.current, // Pass last objection for escalation detection
        repQualitySignals,
        objectionGenerator: objectionGeneratorRef.current, // Pass objection generator for product-specific objections
        // Pass randomized traits for trait-aware resistance
        marcusTraits: selectedScenario?.traits ? {
          painLevel: selectedScenario.traits.painLevel,
          urgency: selectedScenario.traits.urgency,
          budget: selectedScenario.traits.budget,
          openness: selectedScenario.traits.openness,
          initialResistance: selectedScenario.traits.initialResistance,
          resistanceVolatility: selectedScenario.traits.resistanceVolatility,
          satisfactionLevel: selectedScenario.traits.satisfactionLevel,
          painPoints: selectedScenario.traits.painPoints
        } : undefined
      };
      
      strategyOutput = await strategyLayerRef.current.determineStrategy(strategyContext);
      buyerState = strategyOutput.buyerState;
      
      // OVERSEER: Start parallel scenario analysis (non-blocking)
      if (isOverseerEnabled) {
        analyzeConversation({
          conversationHistory,
          currentResistance: buyerState.resistanceLevel,
          currentPhase: currentPhaseStr,
          exchangeCount: conversationHistory.length,
          lastUserMessage: userText,
          difficulty: selectedScenario?.difficulty,
          scenario: selectedScenario
        });
      }
      
      // HYBRID FEEDBACK: Analyze utterance with context-aware LLM reasoning
      // This runs async and doesn't block Marcus's response
      hybridFeedbackRef.current.analyzeUtterance(
        userText,
        utteranceSnapshot,
        buyerState,
        conversationHistory
      ).then(analysis => {
        if (analysis) {
          console.log('🔍 Hybrid feedback analysis:');
          console.log(hybridFeedbackRef.current.formatForLog(analysis));
        }
      }).catch(err => {
        console.error('⚠️ Hybrid feedback analysis failed:', err);
      });
      
      // Update resistance tracking
      setLastResistance(currentResistance);
      setCurrentResistance(buyerState.resistanceLevel);
      
      // Get response strategy based on classification (already classified at top of function)
      const strategy = QuestionClassifier.getResponseStrategy(classification);
      
      console.log(`🧠 Question classified: ${classification.questionType} (${classification.category}) - response style: ${classification.category}`);
      
      // Check if we have a speculative response ready
      if (speculativeResponseRef.current) {
        console.log('⚡ Using speculative response');
        try {
          aiResponse = await speculativeResponseRef.current;
          speculativeResponseRef.current = null;
          
          // SAFETY: Check if user started a new utterance during speculative generation
          if (utteranceCountRef.current !== processingUtteranceCount) {
            console.log('🚫 User started new utterance during speculative generation - scrapping response');
            console.log(`   Was processing utterance #${processingUtteranceCount}, now at #${utteranceCountRef.current}`);
            setIsProcessing(false);
            return;
          }
        } catch (err) {
          console.log('⚠️ Speculative response failed, generating fresh response');
          speculativeResponseRef.current = null;
          
          // SAFETY: Check before starting fresh generation
          if (utteranceCountRef.current !== processingUtteranceCount) {
            console.log('🚫 User started new utterance - aborting fresh generation');
            setIsProcessing(false);
            return;
          }
          
          aiResponse = await aiServiceRef.current.generateResponse({
            phase: currentPhaseStr,
            conversationContext: phaseManager.getContext(),
            userInput: userText,
            phasePromptContext: phaseManager.getPhasePromptContext(),
            conversationHistory: conversationHistory,
            scenario: selectedScenario,
            questionCategory: classification.category
          }, undefined, undefined, getGuidance());
          
          // SAFETY: Check after generation completes
          if (utteranceCountRef.current !== processingUtteranceCount) {
            console.log('🚫 User started new utterance during fallback generation - scrapping response');
            setIsProcessing(false);
            return;
          }
        }
      } else {
        // FALLBACK: Check for instant response patterns on first 3 turns only
        // After turn 3, full LLM intelligence takes over
        const userMessages = conversationHistory.filter(msg => msg.role === 'user');
        const turnNumber = userMessages.length + 1;
        const isEarlyGame = turnNumber <= 3;
        
        if (isEarlyGame) {
          const patternMatch = FirstUtterancePatternDetector.detect(userText);
          const cannedResponse = FirstUtterancePatternDetector.getCannedResponse(patternMatch);
          
          if (cannedResponse) {
            console.log(`🔍 Turn ${turnNumber}: Pattern detected: ${patternMatch.pattern} (confidence: ${patternMatch.confidence})`);
            console.log(`⚡⚡⚡ CANNED: Using instant response (0ms LLM) - "${cannedResponse}"`);
            
            aiResponse = {
              content: cannedResponse,
              emotion: 'neutral'
            };
          } else if (FirstUtterancePatternDetector.canUseInstantResponse(patternMatch.pattern)) {
            // Use focused LLM for patterns that need it
            console.log(`🔍 Turn ${turnNumber}: Pattern detected: ${patternMatch.pattern} (confidence: ${patternMatch.confidence})`);
            console.log(`⚡ FOCUSED: Using focused LLM for pattern "${patternMatch.pattern}"`);
            
            aiResponse = await aiServiceRef.current.generateFocusedResponse({
              phase: currentPhaseStr,
              conversationContext: phaseManager.getContext(),
              userInput: userText,
              phasePromptContext: phaseManager.getPhasePromptContext(),
              conversationHistory: conversationHistory,
              scenario: selectedScenario,
              patternMatch: patternMatch
            });
          } else {
            // No pattern - use full LLM
            console.log(`🔍 Turn ${turnNumber}: No pattern match - using full LLM intelligence`);
            aiResponse = await aiServiceRef.current.generateResponse({
              phase: currentPhaseStr,
              conversationContext: phaseManager.getContext(),
              userInput: userText,
              phasePromptContext: phaseManager.getPhasePromptContext(),
              conversationHistory: conversationHistory,
              scenario: selectedScenario,
              buyerState: buyerState,
              questionCategory: classification.category,
              marcusTraits: selectedScenario?.traits ? {
                painLevel: selectedScenario.traits.painLevel,
                urgency: selectedScenario.traits.urgency,
                budget: selectedScenario.traits.budget,
                openness: selectedScenario.traits.openness,
                painPoints: selectedScenario.traits.painPoints,
                currentSolution: selectedScenario.traits.currentSolution,
                satisfactionLevel: selectedScenario.traits.satisfactionLevel,
                decisionTimeframe: selectedScenario.traits.decisionTimeframe,
                primaryConcern: selectedScenario.traits.primaryConcern
              } : undefined
            }, undefined, undefined, getGuidance());
          }
        } else {
          // Turn 4+ - full LLM intelligence only (no pattern shortcuts)
          console.log(`🧠 Turn ${turnNumber}: Deep intelligence mode - full LLM`);
          aiResponse = await aiServiceRef.current.generateResponse({
            phase: currentPhaseStr,
            conversationContext: phaseManager.getContext(),
            userInput: userText,
            phasePromptContext: phaseManager.getPhasePromptContext(),
            conversationHistory: conversationHistory,
            scenario: selectedScenario,
            buyerState: buyerState,
            questionCategory: classification.category,
            marcusTraits: selectedScenario?.traits ? {
              painLevel: selectedScenario.traits.painLevel,
              urgency: selectedScenario.traits.urgency,
              budget: selectedScenario.traits.budget,
              openness: selectedScenario.traits.openness,
              painPoints: selectedScenario.traits.painPoints,
              currentSolution: selectedScenario.traits.currentSolution,
              satisfactionLevel: selectedScenario.traits.satisfactionLevel,
              decisionTimeframe: selectedScenario.traits.decisionTimeframe,
              primaryConcern: selectedScenario.traits.primaryConcern
            } : undefined
          }, undefined, undefined, getGuidance());
        }
        
        // SAFETY: Check after generation completes
        if (utteranceCountRef.current !== processingUtteranceCount) {
          console.log('🚫 User started new utterance during fallback generation - scrapping response');
          console.log(`   Was processing utterance #${processingUtteranceCount}, now at #${utteranceCountRef.current}`);
          setIsProcessing(false);
          return;
        }
      }
      
      // Check if we were interrupted BEFORE starting this processing
      // (flag captured at start, already cleared from ref)
      if (wasInterrupted) {
        console.log('🛑 Response cancelled - user was interrupting when this utterance arrived');
        setIsProcessing(false);
        return;
      }
    } catch (aiError) {
      console.error('❌ CRITICAL: AI generation failed:', aiError);
      console.error('❌ Backend /api/openai/chat is not working. Check Flask logs.');
      
      // Speak error message to user
      try {
        await speakAsMarcus(
          "Hey, I'm having technical issues on my end. The AI backend isn't responding. Can you check the Flask server logs?",
          {
            voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
            emotion: 'worried',
            speed: 0.85
          }
        );
      } catch (ttsError) {
        console.error('❌ Could not speak error message:', ttsError);
      }
      
      setIsProcessing(false);
      
      // End call due to backend failure
      setTimeout(() => {
        console.log('📵 Ending call due to backend failure');
        handleEndCall();
      }, 3000);
      
      return;
    }
    
    try {
      
      // Check if interrupted DURING AI generation (new interruption)
      if (wasInterruptedRef.current) {
        console.log('🛑 Response cancelled - user interrupted during generation');
        wasInterruptedRef.current = false;
        setIsProcessing(false);
        return;
      }
      
      // COGNITIVE COMPLETENESS: Analyze if thought has landed (witness data)
      const cognitiveAnalysis = CognitiveCompletenessAnalyzer.analyze(userText, conversationHistory);
      console.log(`🧠 Cognitive analysis: ${cognitiveAnalysis.isCognitivelyComplete ? 'Complete' : 'Incomplete'} - ${cognitiveAnalysis.reason}`);
      if (!cognitiveAnalysis.isCognitivelyComplete) {
        console.log(`   Signals: hedging=${cognitiveAnalysis.signals.isHedging}, ambiguous=${cognitiveAnalysis.signals.isAmbiguous}, thinking=${cognitiveAnalysis.signals.isThinking}, followup=${cognitiveAnalysis.signals.invitesFollowup}, strategic=${cognitiveAnalysis.signals.strategicPause}`);
      }
      
      // JUDGMENT GATE: Evaluate if Marcus should speak, wait, suppress, or hold
      const riskAssessment = judgmentGateRef.current.assessRisk(userText, conversationHistory);
      const timeSinceLastUserSpeech = Date.now() - lastUserSpeechTimeRef.current;
      const marcusJustSpoke = Date.now() - lastMarcusSpeakTimeRef.current < 2000;
      
      const judgmentContext: JudgmentContext = {
        userInput: userText,
        preGeneratedResponse: aiResponse.content,
        questionRisk: riskAssessment.risk,
        momentType: riskAssessment.momentType,
        prospectState: 'testing', // TODO: Track this from phase/conversation state
        conversationHistory: conversationHistory,
        timeSinceLastUserSpeech,
        marcusJustSpoke,
        // Witness data - inputs, not decisions
        cognitiveComplete: cognitiveAnalysis.isCognitivelyComplete,
        cognitiveCompleteness: cognitiveAnalysis
      };
      
      const judgment = judgmentGateRef.current.judge(judgmentContext);
      
      console.log(`⚖️ [Judgment Gate] Action: ${judgment.action.toUpperCase()} | ${judgment.reason} | Confidence: ${judgment.confidence}`);
      
      // JUDGMENT GATE: Routes to different response strategies (SPEAK/SUPPRESS/HOLD)
      // JG is a router, not a clock - no artificial timing delays
      // Response timing comes from natural AI generation complexity
      
      // Handle suppression
      if (judgment.action === 'suppress') {
        console.log(`🚫 [Judgment Gate] SUPPRESS - ${judgment.reason}`);
        judgmentGateRef.current.logSuppression(userText, aiResponse.content, judgment);
        setIsProcessing(false);
        return;
      }
      
      // Handle HOLD - wait for user to continue (ambiguous input)
      if (judgment.action === 'hold' && judgment.holdUntil === 'user_continues') {
        console.log(`🤚 [Judgment Gate] HOLD - ${judgment.reason}`);
        console.log(`   Waiting for user to clarify ambiguous input (no artificial delay)`);
        // TODO: Future - route to multi-LLM strategic analysis for complex moments
        // For now, suppress and wait for user continuation
        setIsProcessing(false);
        
        // CRITICAL: Check if utterances queued while we were processing
        // If so, process them after a small delay to allow state to settle
        setTimeout(() => {
          if (queuedUtterancesRef.current.length > 0) {
            const allFragments = queuedUtterancesRef.current;
            const combinedText = allFragments.map(f => f.text).join(' ');
            const lastCount = allFragments[allFragments.length - 1].count;
            
            console.log(`▶️ [HOLD Recovery] Processing ${allFragments.length} queued fragments: "${combinedText.substring(0, 80)}..."`);
            queuedUtterancesRef.current = []; // Clear the queue
            
            processUserInputWithQueue(combinedText, lastCount);
          }
        }, 100);
        
        return;
      }
      
      // WAIT and SPEAK actions proceed immediately - no delays
      const speed = currentPhase === 'coach' || currentPhase === 'exit' ? 0.85 : 0.75;
      
      // Speak Marcus's response using Cartesia TTS with dynamic emotion
      await speakAsMarcus(aiResponse.content, {
        voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
        emotion: aiResponse.emotion, // Dynamic based on phase & content
        speed: speed
      });
      
      // STRATEGIC MOMENT DETECTION: Check for coaching opportunities
      const detectionContext = {
        userMessage: userText,
        marcusLastMessage: aiResponse.content,
        marcusLastEmotion: aiResponse.emotion || 'neutral',
        conversationHistory
      };
      
      // Check for overtalking
      const overtalkingMoment = StrategicMomentDetector.detectOvertalking(detectionContext);
      if (overtalkingMoment) {
        setCurrentStrategicMoment({
          ...overtalkingMoment,
          timestamp: Date.now()
        });
      }
      
      // Check for question dodging
      const dodgeMoment = StrategicMomentDetector.detectQuestionDodge(detectionContext);
      if (dodgeMoment) {
        setCurrentStrategicMoment({
          ...dodgeMoment,
          timestamp: Date.now()
        });
      }
      
      // Check if interrupted during speaking
      if (wasInterruptedRef.current) {
        console.log('🛑 Response interrupted during speaking');
        wasInterruptedRef.current = false;
        setIsProcessing(false);
        return;
      }
      
      // Track when Marcus finishes speaking (to filter echo)
      lastMarcusSpeakTimeRef.current = Date.now();
      lastMarcusMessageRef.current = aiResponse.content;
      console.log('✅ Marcus finished speaking');
      
      // DISABLED: Silence detection was interrupting natural pauses
      // Only re-enable if user explicitly needs it, with much longer timer (15s+)
      // and guards to not trigger after Marcus asks a question
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      
      // Handle phase transitions (NOW happens after Marcus actually finishes)
      if (aiResponse.shouldTransitionPhase && aiResponse.nextPhase) {
        // Natural pause before transitioning
        await new Promise(resolve => setTimeout(resolve, 1500));
        transitionToPhase(aiResponse.nextPhase!);
      }
      
      // Check for automatic phase transitions (NOW happens after Marcus actually finishes)
      const autoTransition = phaseManager.shouldAutoTransition();
      if (autoTransition.should && autoTransition.nextPhase) {
        console.log(`⏰ Auto-transitioning due to time`);
        
        // Natural pause before transitioning
        await new Promise(resolve => setTimeout(resolve, 1500));
        transitionToPhase(autoTransition.nextPhase!);
      }
      
      // 1. Marcus has his own issues and insecurities (built into his persona)
      // 2. Objection stack system - multi-root resistance that softens gradually
      // 3. Strategic guidance system to lead user toward hidden issues
      // 4. Puzzle-like experience with hints scattered throughout conversation
      
      // Add Marcus's response to history
      setConversationHistory(prev => [...prev, { role: 'assistant', content: aiResponse.content }]);
      console.log(`🎤 Marcus [${aiResponse.emotion}]: "${aiResponse.content}"`);
      
      // 🎯 EMIT CANONICAL EVENT (single source of truth for this turn)
      // Only create canonical event if strategy analysis was run (not for instant canned responses)
      let canonicalEvent = undefined;
      if (strategyContext && buyerStateBefore) {
        canonicalEvent = strategyLayerRef.current.createCanonicalEvent(
          strategyContext.turnContext.totalTurns + 1,
          userText,
          aiResponse.content,
          buyerStateBefore,
          strategyContext,
          selectedScenario?.difficulty
        );
      }
      
      // Track Marcus message for feedback generation
      if (conversationTrackerRef.current) {
        // Use LLM-tagged objections from META block (not regex guessing)
        let objectionTriggered: string | undefined = undefined;
        
        // Only track as objection if LLM explicitly tagged it in META
        if (aiResponse.objection && aiResponse.objection.severity >= 0.5) {
          objectionTriggered = aiResponse.content; // Store full response
          
          // Set active objection immediately for answer evaluation
          const objectionType = strategyLayerRef.current.setActiveObjection(aiResponse.content);
          console.log(`🚩 [Objection] Marcus raised: ${aiResponse.objection.id} (severity: ${aiResponse.objection.severity})`);
          console.log(`   "${aiResponse.content.substring(0, 60)}..."`);
          console.log(`🎯 [Active Objection] Set to: ${objectionType}`);
          
          lastObjectionRef.current = aiResponse.content;
        }
        
        conversationTrackerRef.current.addMarcusMessage(
          aiResponse.content,
          buyerState.resistanceLevel,
          aiResponse.emotion,
          objectionTriggered
        );
      }
      
      // Update context state
      setPhaseContext(phaseManager.getContext());
      
      setIsProcessing(false);
    } catch (error) {
      console.error('❌ Error during Marcus response processing:', error);
      setIsProcessing(false);
    }
    
  }, [isProcessing, conversationHistory, transitionToPhase]);
  
  // Wrapper that handles queue processing - ensures queued utterances are always processed
  const processUserInputWithQueue = useCallback(async (userText: string, utteranceSnapshot: number) => {
    const wasProcessing = isProcessing;
    
    try {
      await processUserInput(userText, utteranceSnapshot);
    } finally {
      // CRITICAL: Only process queue if we actually completed processing
      // Don't process if we were already processing (early return via queuing)
      if (!wasProcessing && queuedUtterancesRef.current.length > 0) {
        const allFragments = queuedUtterancesRef.current;
        const combinedText = allFragments.map(f => f.text).join(' ');
        const lastCount = allFragments[allFragments.length - 1].count;
        
        console.log(`▶️ Combining ${allFragments.length} queued fragments into one thought: "${combinedText.substring(0, 80)}..."`);
        queuedUtterancesRef.current = []; // Clear the queue
        
        // Small delay to allow state to settle
        setTimeout(() => {
          processUserInputWithQueue(combinedText, lastCount);
        }, 100);
      }
    }
  }, [processUserInput, isProcessing]);
  
  /**
   * Detect continuation cues - patterns suggesting user will keep talking
   */
  const detectContinuationCue = useCallback((text: string): boolean => {
    const trimmed = text.trim().toLowerCase();
    
    // Trailing conjunctions or connectives
    const trailingConjunction = /\b(and|but|so|or|because|since|while|though|although|however|yet|nor)\s*[.,]?\s*$/i.test(trimmed);
    
    // Fillers suggesting more coming
    const trailingFiller = /\b(yeah|like|um|uh|well|actually|basically|you know)\s*[.,]?\s*$/i.test(trimmed);
    
    // Incomplete thought patterns
    const incompleteThought = /\b(i mean|what i'm saying|the thing is|so like)\s*$/i.test(trimmed);
    
    // Question starts (partial questions)
    const questionStart = /\b(what|how|why|when|where|who|can|could|would|should|do|does|did|are|is|was)\s*$/i.test(trimmed);
    
    return trailingConjunction || trailingFiller || incompleteThought || questionStart;
  }, []);
  
  /**
   * Monitor transcript for user speech and process with Marcus AI
   * Deepgram's speech_final events provide better turn detection
   * NOW SUPPORTS INTERRUPTIONS: User can speak while Marcus is talking
   */
  useEffect(() => {
    if (!transcript || transcript === lastTranscriptRef.current) return;
    
    // Update transcript ref for timeout callbacks
    transcriptRef.current = transcript;
    
    // Get new content
    const newContent = transcript.replace(lastTranscriptRef.current, '').trim();
    
    // SPECULATIVE GENERATION: Start LLM call on partials for FIRST utterance only
    // This gives instant response while still processing complete messages
    const isFirstUtterance = utteranceCountRef.current === 0;
    const words = newContent.split(/\s+/);
    const wordCount = words.length;
    
    if (!isFinalTranscript && isFirstUtterance && wordCount >= 2 && !speculativeResponseRef.current && !isSpeaking) {
      // PATTERN DETECTION: Re-check pattern on each partial until we get a match
      const patternMatch = FirstUtterancePatternDetector.detect(newContent);
      
      if (patternMatch.extractedName) {
        console.log(`📋 Extracted name from pattern: ${patternMatch.extractedName}`);
      }
      
      if (patternMatch.extractedCompany) {
        console.log(`📋 Extracted company from pattern: ${patternMatch.extractedCompany}`);
        const context = phaseManager.getContext();
        if (!context.extractedCompany) {
          phaseManager.updateContext({ extractedCompany: patternMatch.extractedCompany });
        }
      }
      
      if (FirstUtterancePatternDetector.canUseInstantResponse(patternMatch.pattern)) {
        // Check for ultra-fast canned response (0ms - no LLM)
        const cannedResponse = FirstUtterancePatternDetector.getCannedResponse(patternMatch);
        
        if (cannedResponse) {
          // INSTANT CANNED RESPONSE - no LLM call needed!
          console.log(`🔍 Pattern detected: ${patternMatch.pattern} (confidence: ${patternMatch.confidence})`);
          console.log(`⚡⚡⚡ CANNED: Using instant response (0ms LLM) - "${cannedResponse}"`);
          
          // Wrap in resolved promise for consistent interface
          speculativeResponseRef.current = Promise.resolve({
            content: cannedResponse,
            emotion: 'neutral'
          });
        } else {
          // Good pattern detected! Start focused LLM call
          console.log(`🔍 Pattern detected: ${patternMatch.pattern} (confidence: ${patternMatch.confidence})`);
          console.log(`⚡ INSTANT: Using focused LLM for pattern "${patternMatch.pattern}"`);
          
          const phaseManager = phaseManagerRef.current;
          const currentPhaseStr = phaseManager.getCurrentPhase();
          
          // Use focused prompt for instant response
          speculativeResponseRef.current = aiServiceRef.current.generateFocusedResponse({
            phase: currentPhaseStr,
            conversationContext: phaseManager.getContext(),
            userInput: newContent,
            phasePromptContext: phaseManager.getPhasePromptContext(),
            conversationHistory: conversationHistory,
            scenario: selectedScenario,
            patternMatch: patternMatch
          }).catch(err => {
            console.log('⚠️ Focused generation error:', err);
            speculativeResponseRef.current = null;
            throw err;
          });
        }
      } else if (wordCount >= 8) {
        // No pattern detected after 8+ words - fallback to full LLM
        console.log(`🔍 Pattern: ${patternMatch.pattern} (no match after ${wordCount} words)`);
        console.log(`⚡ FALLBACK: Using full LLM after 8+ words`);
        
        const phaseManager = phaseManagerRef.current;
        const currentPhaseStr = phaseManager.getCurrentPhase();
        
        // Fallback to full system prompt
        const speculativeClassification = QuestionClassifier.classify(newContent);
        speculativeResponseRef.current = aiServiceRef.current.generateResponse({
          phase: currentPhaseStr,
          conversationContext: phaseManager.getContext(),
          userInput: newContent,
          phasePromptContext: phaseManager.getPhasePromptContext(),
          conversationHistory: conversationHistory,
          scenario: selectedScenario,
          questionCategory: speculativeClassification.category
        }, undefined, undefined, getGuidance()).catch(err => {
          console.log('⚠️ Speculative generation error:', err);
          speculativeResponseRef.current = null;
          throw err;
        });
      }
      // else: Keep waiting for more words to detect pattern
    }
    
    // CRITICAL FIX: Only PROCESS final transcripts (UtteranceEnd events)
    // Clear silence timer IMMEDIATELY on first sign of user speech (even partial)
    if (newContent && newContent.length > 3) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
    
    // This prevents fragmentation where "Hey, Marcus. It's Kayson from WebSite Co." 
    // gets split into multiple partial utterances
    if (!isFinalTranscript) {
      // Log partials for visibility, but don't process them
      if (newContent && !isFirstUtterance) {
        console.log(`📝 Partial transcript (waiting for UtteranceEnd): "${newContent.substring(0, 60)}..."`);
      }
      return;
    }
    
    // If we get here, we have a FINAL transcript (UtteranceEnd confirmed by Deepgram)
    console.log(`✅ UtteranceEnd received - processing complete message`);
    
    if (newContent && newContent.length > 3) {
      // Track user speech timing for Judgment Gate
      lastUserSpeechTimeRef.current = Date.now();
      
      // Filter out echo by comparing transcript to what Marcus actually said
      if (lastMarcusMessageRef.current) {
        const marcusText = lastMarcusMessageRef.current.toLowerCase().trim();
        const userText = newContent.toLowerCase().trim();
        
        const isSimilar = userText === marcusText || 
                         marcusText.includes(userText) || 
                         userText.includes(marcusText) ||
                         (userText.length > 10 && marcusText.startsWith(userText.slice(0, 10)));
        
        if (isSimilar) {
          console.log(`🔇 Filtered Marcus echo: "${newContent}" (matches Marcus: "${lastMarcusMessageRef.current.substring(0, 50)}...")`);          lastTranscriptRef.current = transcript;
          return;
        }
      }
      
      // INTELLIGENT BUFFERING: Wait for user to finish speaking
      // If user continues within 1s, merge utterances before processing
      
      // Cancel any existing grace timer
      if (utteranceGraceTimerRef.current) {
        clearTimeout(utteranceGraceTimerRef.current);
        utteranceGraceTimerRef.current = null;
      }
      
      // Merge with pending utterance if exists
      const mergedContent = pendingUtteranceRef.current 
        ? `${pendingUtteranceRef.current.text} ${newContent}`.trim()
        : newContent;
      
      if (pendingUtteranceRef.current) {
        console.log(`🔗 Merging continuation: "${newContent}" → "${mergedContent}"`);
      }
      
      // Buffer this utterance
      const words = mergedContent.split(/\s+/);
      const wordCount = words.length;
      utteranceCountRef.current++;
      const currentUtterance = utteranceCountRef.current;
      
      pendingUtteranceRef.current = {
        text: mergedContent,
        count: currentUtterance
      };
      
      console.log(`⏳ Buffering utterance #${currentUtterance} (${wordCount} words) - waiting 1s for continuation...`);
      
      // Start grace period timer
      utteranceGraceTimerRef.current = setTimeout(() => {
        if (pendingUtteranceRef.current) {
          const buffered = pendingUtteranceRef.current;
          console.log(`⏰ Grace period expired - processing utterance #${buffered.count}`);
          console.log(`🎙️ User speech: "${buffered.text}"`);
          console.log(`🔧 [DEBUG] Calling processUserInput for utterance #${buffered.count}, isProcessing=${isProcessing}`);
          
          processUserInputWithQueue(buffered.text, buffered.count);
          pendingUtteranceRef.current = null;
        }
        utteranceGraceTimerRef.current = null;
      }, 1000); // 1 second grace period
      
      lastTranscriptRef.current = transcript;
      return;
    }
    
    // Short utterances (3 chars or less) - wait for continuation
    if (newContent && newContent.length <= 3) {
      console.log(`⏭️ Very short final: "${newContent}" - waiting 1s for continuation`);
      
      const transcriptSnapshot = transcript;
      const utteranceSnapshot = utteranceCountRef.current;
      
      setTimeout(() => {
        if (utteranceCountRef.current === utteranceSnapshot) {
          console.log(`⏰ Short final timeout - processing "${newContent}"`);
          utteranceCountRef.current++;
          processUserInputWithQueue(newContent, utteranceCountRef.current);
          lastTranscriptRef.current = transcriptSnapshot;
        }
      }, 1000);
      
      return;
    }
  }, [transcript, isFinalTranscript, isSpeaking, conversationHistory, selectedScenario, processUserInputWithQueue, detectContinuationCue]);
  
  /**
   * Handle silence - inject context for LLM to reason about
   */
  const handleSilence = useCallback(async (silenceDuration: number) => {
    if (isProcessing || isSpeaking) {
      console.log('⏭️ Skipping silence handling - Marcus is processing or speaking');
      return;
    }
    
    const lastMessage = lastMarcusMessageRef.current;
    const silenceContext = `[SILENCE: User has been silent for ${silenceDuration} seconds after you said: "${lastMessage}"]`;
    
    console.log(`🤔 Injecting silence context for LLM reasoning: ${silenceDuration}s`);
    
    // Pass silence context as a special user input for LLM to reason about
    processUserInputWithQueue(silenceContext, utteranceCountRef.current);
  }, [isProcessing, isSpeaking, processUserInputWithQueue]);
  
  /**
   * Handle Marcus's greeting when call connects
   */
  const hasGreetedRef = useRef(false);
  useEffect(() => {
    if (isConnected && !hasGreetedRef.current && conversationHistory.length === 0) {
      hasGreetedRef.current = true;
      
      console.log('👋 Marcus connected - answering immediately');
      
      // Marcus's Phase 1 opening line - answer immediately (ringing already happened)
      setTimeout(async () => {
        const greeting = "Hello, Marcus speaking?";
        console.log(`🎤 Marcus [neutral]: "${greeting}"`);
        
        // Set echo protection BEFORE speaking to prevent microphone feedback
        lastMarcusSpeakTimeRef.current = Date.now();
        
        await speakAsMarcus(greeting, { 
          voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
          emotion: 'neutral', // Answering phone, waiting to hear who it is
          speed: 0.8
        });
        
        // Update timestamp after speaking completes
        lastMarcusSpeakTimeRef.current = Date.now();
        setConversationHistory([{ role: 'assistant', content: greeting }]);
        
        // Track greeting in conversation
        if (conversationTrackerRef.current) {
          conversationTrackerRef.current.addMarcusMessage(greeting, 6, 'neutral');
        }
      }, 500);
    }
    
    // Reset greeting flag when disconnected
    if (!isConnected) {
      hasGreetedRef.current = false;
    }
  }, [isConnected, conversationHistory.length, speakAsMarcus]);
  
  /**
   * Handle scenario selection - show Marcus screen and start ringing
   */
  const handleScenarioSelect = useCallback(async (scenario: MarcusScenario) => {
    // Clear any saved feedback when starting a new scenario
    const clearResult = LocalStorageService.removeItem('feedbackData');
    if (clearResult.success) {
      console.log('🗑️ Cleared old feedback data for new scenario');
    } else {
      console.error('❌ Failed to clear old feedback data:', clearResult.error);
    }
    
    // Save active call state to localStorage
    const saveResult = LocalStorageService.setItem<StoredCallState>('activeCall', {
      scenario,
      timestamp: Date.now()
    });
    if (saveResult.success) {
      console.log('💾 Saved active call state to localStorage');
    } else {
      console.error('❌ Failed to save active call state:', saveResult.error);
    }
    
    // Randomize Marcus's traits for this call (weighted by difficulty)
    const { profile, profileName } = getRandomMarcusTraits(scenario.difficulty);
    const scenarioWithTraits = {
      ...scenario,
      traits: profile,
      traitProfileName: profileName
    };
    
    console.log(`🎯 Scenario selected: ${scenario.name} (${scenario.difficulty})`);
    console.log(`🎭 Marcus traits: ${profileName} (${scenario.difficulty}-weighted)`);
    console.log(`   Pain: ${profile.painLevel} | Urgency: ${profile.urgency} | Budget: ${profile.budget} | Openness: ${profile.openness}`);
    console.log(`   Satisfaction: ${profile.satisfactionLevel}/10 | Initial Resistance: ${profile.initialResistance}/10`);
    console.log(`   Winnable: ${profile.winConditionExists ? 'Yes' : 'No'} | Ideal: ${profile.idealOutcome}`);
    
    setSelectedScenario(scenarioWithTraits);
    setShowScenarioSelector(false);
    setIsRinging(true);
    
    const sessionId = generateSessionId();
    sessionIdRef.current = sessionId;
    console.log(`📞 Starting ring sequence with session: ${sessionId}`);
    
    // Initialize conversation tracker
    callStartTimeRef.current = Date.now();
    conversationTrackerRef.current = new ConversationTracker(callStartTimeRef.current);
    console.log('📋 Conversation tracker initialized');
    
    // Reset utterance counter for new call
    utteranceCountRef.current = 0;
    
    // Reset phase manager with scenario context
    phaseManagerRef.current.reset();
    phaseManagerRef.current.updateContext({
      product: scenario.product,
      marcusRole: scenario.marcusRole,
      marcusMood: scenario.marcusMood
    });
    setCurrentPhase('prospect');
    setPhaseContext(phaseManagerRef.current.getContext());
    setConversationHistory([]);
    
    // Play phone ringing sound IMMEDIATELY - looping naturally with silence gaps
    if (phoneRingAudioRef.current) {
      const audio = phoneRingAudioRef.current;
      audio.volume = 1.0;
      audio.currentTime = 0;
      audio.loop = true;
      audio.playbackRate = 1.4; // Speed up by 1.4x
      audio.preservesPitch = true; // Keep pitch the same
      
      // Force immediate playback - don't await, just fire it
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => console.log('🔊 Phone ringing started immediately (1.4x speed, pitch preserved)'))
          .catch(err => console.error('Phone ring error:', err));
      }
    }
    
    // Wait 10 seconds for phone to ring, THEN connect to Marcus
    const startTime = Date.now();
    console.log('📞 Phone ringing for 10 seconds...', new Date().toISOString());
    
    ringTimeoutRef.current = setTimeout(async () => {
      const elapsed = Date.now() - startTime;
      console.log(`📞 ${elapsed}ms elapsed - now connecting`, new Date().toISOString());
      
      // Stop ringing before connection
      if (phoneRingAudioRef.current) {
        phoneRingAudioRef.current.pause();
        phoneRingAudioRef.current.currentTime = 0;
        console.log('📵 Ringing finished - now connecting to Marcus');
      }
      
      setIsRinging(false);
      ringTimeoutRef.current = null;
      
      // Start the call AFTER ringing finishes
      await startCall();
    }, 10000);
  }, [isConnecting, isRinging, startCall, generateSessionId]);
  
  /**
   * Handle call start
   */
  const handleStartCall = useCallback(async () => {
    if (isConnecting || !selectedScenario) return;
    
    const sessionId = generateSessionId();
    sessionIdRef.current = sessionId;
    console.log(`📞 Starting Marcus call with session: ${sessionId}`);
    console.log(`🎯 Scenario: ${selectedScenario.name} (${selectedScenario.difficulty})`);
    
    // Play phone ringing sound
    if (phoneRingAudioRef.current) {
      phoneRingAudioRef.current.currentTime = 0;
      phoneRingAudioRef.current.play().catch(err => console.log('Phone ring play error:', err));
    }
    
    // Initialize conversation tracker
    callStartTimeRef.current = Date.now();
    conversationTrackerRef.current = new ConversationTracker(callStartTimeRef.current);
    console.log('📋 Conversation tracker initialized');
    
    // Reset utterance counter for new call
    utteranceCountRef.current = 0;
    
    // Reset hybrid feedback analyzer for new call
    hybridFeedbackRef.current.reset();
    console.log('🔄 Hybrid feedback analyzer reset');
    
    // Reset phase manager with scenario context
    phaseManagerRef.current.reset();
    phaseManagerRef.current.updateContext({
      product: selectedScenario.product,
      marcusRole: selectedScenario.marcusRole,
      marcusMood: selectedScenario.marcusMood
    });
    setCurrentPhase('prospect');
    setPhaseContext(phaseManagerRef.current.getContext());
    setConversationHistory([]);
    
    // Start the call (no persona parameter needed for new voice system)
    await startCall();
  }, [isConnecting, startCall, generateSessionId, selectedScenario]);
  
  /**
   * Handle call end
   */
  const handleEndCall = useCallback(async () => {
    console.log('📵 Ending Marcus call - terminating WebSocket immediately');
    
    // CRITICAL: End call FIRST to terminate WebSocket immediately
    endCall();
    
    // Clear active call state from localStorage
    const clearResult = LocalStorageService.removeItem('activeCall');
    if (clearResult.success) {
      console.log('🗑️ Cleared active call state on call end');
    } else {
      console.error('❌ Failed to clear active call state:', clearResult.error);
    }
    
    // Show loading state while generating feedback
    setIsGeneratingFeedback(true);
    
    const duration = phaseManagerRef.current.getTotalDuration();
    console.log(`📊 Call duration calculated: ${duration} seconds`);
    
    // Get conversation transcript
    const transcript = conversationTrackerRef.current?.getTranscript();
    const conversationExchanges = transcript?.exchanges || [];
    
    // Detect critical moments and successful moments
    let momentPuzzles: any[] = [];
    let successfulMoments: any[] = [];
    let criticalMoments: any[] = [];
    let callSummary: any = null;
    
    if (transcript && conversationTrackerRef.current) {
      console.log('🔍 Analyzing conversation with HYBRID pipeline (rules + LLM judgment)...');
      
      const detector = new CriticalMomentDetector();
      
      try {
        // NEW: Use hybrid pipeline with LLM impact judgment
        const hybridResults = await detector.detectCriticalMomentsWithLLM(
          transcript,
          conversationTrackerRef.current
        );
        
        criticalMoments = hybridResults.criticalMoments;
        const successMoments = hybridResults.successfulMoments;
        const topPositive = hybridResults.topPositive;
        const topNegative = hybridResults.topNegative;
        
        console.log(`✅ Hybrid detection complete:`);
        console.log(`   ${criticalMoments.length} critical moments (LLM-enriched)`);
        console.log(`   ${successMoments.length} successful moments (LLM-enriched)`);
        console.log(`   Top positive: ${topPositive ? `"${topPositive.userMessage.substring(0, 50)}..."` : 'none'}`);
        console.log(`   Top negative: ${topNegative ? `"${topNegative.userMessage.substring(0, 50)}..."` : 'none'}`);
        
        // Always generate feedback, even with 0 critical moments
        const feedbackGenerator = new MomentFeedbackGenerator();
        
        // Generate moment puzzles if we have critical moments
        if (criticalMoments.length > 0) {
          momentPuzzles = await feedbackGenerator.generateMomentPuzzles(criticalMoments);
        }
        
        // Store successful moments for display
        successfulMoments = successMoments;
        
        // Generate call summary with KEY MOMENTS highlighted
        const keyMoments = [];
        if (topPositive) keyMoments.push({ ...topPositive, direction: 'positive' });
        if (topNegative) keyMoments.push({ ...topNegative, direction: 'negative' });
        
        callSummary = await feedbackGenerator.generateCallSummary(
          keyMoments.length > 0 ? keyMoments : criticalMoments,
          conversationHistory.length / 2,
          duration,
          undefined, // scenario
          selectedScenario?.traits && selectedScenario?.traitProfileName ? {
            traitProfileName: selectedScenario.traitProfileName,
            painLevel: selectedScenario.traits.painLevel,
            urgency: selectedScenario.traits.urgency,
            budget: selectedScenario.traits.budget,
            openness: selectedScenario.traits.openness,
            satisfactionLevel: selectedScenario.traits.satisfactionLevel,
            idealOutcome: selectedScenario.traits.idealOutcome,
            winConditionExists: selectedScenario.traits.winConditionExists
          } : undefined,
          strategyLayerRef.current.getObjectionData() // Pass objection tracking data
        );
        
        // Augment summary with LLM impact reasoning if available
        if (topNegative?.impactReason || topPositive?.impactReason) {
          callSummary.keyMoments = {
            topNegative: topNegative ? {
              what: topNegative.userMessage,
              why: topNegative.impactReason || topNegative.whatHappened,
              category: topNegative.impactCategory || 'trust_break'
            } : null,
            topPositive: topPositive ? {
              what: topPositive.userMessage,
              why: topPositive.impactReason || topPositive.whatHappened,
              category: topPositive.impactCategory || 'discovery'
            } : null
          };
        }
        
        console.log('✅ Generated LLM-enhanced feedback');
      } catch (error) {
        console.error('❌ Error in hybrid pipeline, falling back to rule-based:', error);
        
        // Fallback to rule-based only if LLM fails
        const criticalMoments = detector.detectCriticalMoments(transcript);
        const successMoments = detector.detectSuccessfulMoments(transcript);
        
        const feedbackGenerator = new MomentFeedbackGenerator();
        
        if (criticalMoments.length > 0) {
          momentPuzzles = await feedbackGenerator.generateMomentPuzzles(criticalMoments);
        }
        
        successfulMoments = successMoments;
        
        callSummary = await feedbackGenerator.generateCallSummary(
          criticalMoments,
          conversationHistory.length / 2,
          duration,
          undefined,
          selectedScenario?.traits && selectedScenario?.traitProfileName ? {
            traitProfileName: selectedScenario.traitProfileName,
            painLevel: selectedScenario.traits.painLevel,
            urgency: selectedScenario.traits.urgency,
            budget: selectedScenario.traits.budget,
            openness: selectedScenario.traits.openness,
            satisfactionLevel: selectedScenario.traits.satisfactionLevel,
            idealOutcome: selectedScenario.traits.idealOutcome,
            winConditionExists: selectedScenario.traits.winConditionExists
          } : undefined
        );
      }
    }
    
    // Calculate real metrics from conversation transcript
    console.log('📊 Calculating real call metrics from transcript...');
    
    // 1. Calculate speaking time from word counts (estimate)
    let userWordCount = 0;
    let marcusWordCount = 0;
    
    for (const exchange of conversationExchanges) {
      const wordCount = exchange.text.split(/\s+/).filter(w => w.length > 0).length;
      if (exchange.speaker === 'user') {
        userWordCount += wordCount;
      } else {
        marcusWordCount += wordCount;
      }
    }
    
    // Estimate speaking time: ~150 words per minute average
    const WORDS_PER_MINUTE = 150;
    const userSpeakingTime = Math.round((userWordCount / WORDS_PER_MINUTE) * 60);
    const marcusSpeakingTime = Math.round((marcusWordCount / WORDS_PER_MINUTE) * 60);
    
    console.log(`📊 Speaking time: User ${userSpeakingTime}s (${userWordCount} words), Marcus ${marcusSpeakingTime}s (${marcusWordCount} words)`);
    
    // 2. Analyze discovery questions
    const allQuestions: QuestionAnalysis[] = [];
    const userExchanges = conversationExchanges.filter(ex => ex.speaker === 'user');
    
    for (let i = 0; i < userExchanges.length; i++) {
      const currentExchange = userExchanges[i];
      const previousUser = i > 0 ? userExchanges[i - 1].text : '';
      const previousMarcus = i > 0 ? conversationExchanges.find(ex => 
        ex.speaker === 'marcus' && ex.timestamp < currentExchange.timestamp
      )?.text || '' : '';
      
      const questions = analyzeUserQuestions(
        currentExchange.text,
        previousUser,
        previousMarcus,
        currentExchange.timestamp
      );
      
      allQuestions.push(...questions);
    }
    
    const openEndedCount = allQuestions.filter(q => q.isOpenEnded).length;
    const followUpCount = allQuestions.filter(q => q.isFollowUp).length;
    
    console.log(`📊 Discovery: ${openEndedCount} open-ended, ${followUpCount} follow-ups (${allQuestions.length} total questions)`);
    
    // 3. Extract objections from conversation
    const objectionExchanges = conversationExchanges.filter(ex => 
      ex.speaker === 'marcus' && ex.objectionTriggered
    );
    
    const objections = objectionExchanges.map(ex => ({
      id: ex.id,
      timestamp: ex.timestamp,
      surface: ex.objectionTriggered || '',
      roots: [],
      severity: 0.5,
      addressed: false,
      resolved: false,
      softened_roots: [],
      still_blocking: []
    }));
    
    const objectionsRaised = objections.length;
    console.log(`📊 Objections: ${objectionsRaised} raised`);
    
    // Run framework analysis for advanced insights
    const frameworkAnalyzer = new FrameworkAnalyzer();
    const frameworkInsights = frameworkAnalyzer.analyze(
      conversationHistory.map(h => ({ role: h.role, content: h.content })),
      objections
    );
    
    // Get objection and buyer state data from StrategyLayer
    const objectionData = strategyLayerRef.current?.getObjectionData() || {
      objectionSatisfaction: {},
      objectionCounts: {},
      activeObjection: undefined
    };
    
    // Calculate addressed/resolved counts from satisfaction data
    const satisfactionEntries = Object.entries(objectionData.objectionSatisfaction);
    const objectionsAddressed = satisfactionEntries.filter(([_, satisfaction]) => satisfaction >= 0.5).length;
    const objectionsResolved = satisfactionEntries.filter(([_, satisfaction]) => satisfaction >= 0.8).length;
    
    // Build complete metrics
    const metrics: CallMetrics = {
      callDuration: duration,
      userSpeakingTime,
      marcusSpeakingTime,
      questions: allQuestions,
      openEndedCount,
      followUpCount,
      objections,
      objectionsRaised,
      objectionsAddressed,
      objectionsResolved,
      totalExchanges: conversationHistory.length / 2,
      winCondition: 'not_yet' as const,
      frameworkInsights
    };
    
    console.log('✅ Real metrics calculated:', {
      talkRatio: `${Math.round((userSpeakingTime / (userSpeakingTime + marcusSpeakingTime)) * 100)}% user`,
      discovery: `${openEndedCount} open-ended, ${followUpCount} follow-ups`,
      objections: `${objectionsRaised} raised, ${objectionsAddressed} addressed, ${objectionsResolved} resolved`
    });
    
    const buyerState = strategyLayerRef.current ? {
      clarity: strategyLayerRef.current['buyerState']?.clarity,
      trustLevel: strategyLayerRef.current['buyerState']?.trustLevel || 0,
      relevance: strategyLayerRef.current['buyerState']?.relevance
    } : undefined;
    
    const finalResistance = conversationExchanges.length > 0
      ? conversationExchanges[conversationExchanges.length - 1].resistanceLevel || 5
      : 5;
    
    // Build call data
    const callData = {
      sessionId: sessionIdRef.current,
      duration: duration,
      conversationHistory,
      momentPuzzles: momentPuzzles,
      successfulMoments: successfulMoments,
      callSummary: callSummary,
      metrics,
      objectionData,
      buyerState,
      finalResistance,
      phaseSummary: phaseManagerRef.current.getPhaseSummary(),
      finalContext: phaseManagerRef.current.getContext()
    };
    
    // Store feedback data and show UI
    // Transform domain models to UI view models (single source of truth)
    const viewModels = criticalMoments && successfulMoments && conversationExchanges.length > 0
      ? MomentViewModelMapper.mapToViewModels(
          criticalMoments,
          successfulMoments,
          conversationExchanges
        )
      : [];
    
    console.log(`📊 Transformed ${criticalMoments?.length || 0} critical + ${successfulMoments?.length || 0} successful → ${viewModels.length} view models`);
    
    // Get hybrid feedback analyses collected during the call
    const hybridAnalyses = hybridFeedbackRef.current.getAllAnalyses();
    console.log(`🔍 Collected ${hybridAnalyses.length} hybrid feedback analyses from live call`);
    
    setMomentFeedbackData({
      duration,
      conversationExchanges: conversationExchanges as any, // TODO: Align ConversationExchange types across files
      objectionData: objectionData as any, // TODO: Standardize ObjectionData structure
      buyerState: buyerState as any, // TODO: Unify BuyerState interface
      finalResistance,
      metrics,
      preAnalyzedMoments: viewModels.length > 0 ? (viewModels as any) : undefined, // TODO: Create type adapter
      hybridFeedbackAnalyses: hybridAnalyses.length > 0 ? (hybridAnalyses as any) : undefined, // TODO: Create type adapter
      timestamp: Date.now()
    });
    
    // End loading state and show feedback
    setIsGeneratingFeedback(false);
    setShowMomentFeedback(true);
    
    if (onCallComplete) {
      onCallComplete(callData);
    }
    
    // Don't call onCallEnd yet - wait until user closes feedback
  }, [endCall, onCallEnd, onCallComplete, conversationHistory]);
  
  /**
   * Auto-start call if enabled
   */
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStart && !isConnected && !isConnecting && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      console.log('🎯 Auto-starting Marcus call');
      setTimeout(() => {
        handleStartCall();
      }, 500);
    }
  }, [autoStart, isConnected, isConnecting, handleStartCall]);
  
  /**
   * Restore feedback UI on mount if we have saved data
   */
  useEffect(() => {
    const result = LocalStorageService.getItem<StoredFeedbackData>('feedbackData');
    if (result.success && result.data) {
      setShowMomentFeedback(true);
      console.log('🔄 Showing restored feedback UI');
    } else if (!result.success && result.error) {
      console.error('❌ Failed to restore feedback UI:', result.error);
    }
  }, []);
  
  /**
   * Save feedback data to localStorage whenever it changes
   */
  useEffect(() => {
    if (momentFeedbackData) {
      const saveResult = LocalStorageService.setItem<StoredFeedbackData>('feedbackData', momentFeedbackData);
      if (saveResult.success) {
        console.log('💾 Saved feedback data to localStorage');
      } else {
        console.error('❌ Failed to save feedback data:', saveResult.error);
      }
    }
  }, [momentFeedbackData]);
  
  /**
   * Close moment feedback and return to scenario selector
   */
  const handleCloseMomentFeedback = useCallback(() => {
    // Clear localStorage when closing feedback
    LocalStorageService.removeItem('feedbackData');
    LocalStorageService.removeItem('activeCall');
    console.log('🗑️ Cleared feedback and active call data from localStorage');
    
    setShowMomentFeedback(false);
    setMomentFeedbackData(null);
    setConversationHistory([]);
    utteranceCountRef.current = 0;
    lastTranscriptRef.current = '';
    setShowScenarioSelector(true);
    setSelectedScenario(null);
    
    // Now call onCallEnd after user closes feedback
    if (onCallEnd) {
      onCallEnd();
    }
  }, [onCallEnd]);
  
  return (
    <>
      {/* Scenario Selector */}
      {showScenarioSelector && (
        <MarcusChallengeLobby
          onStartChallenge={handleScenarioSelect}
          onCancel={onCallEnd}
        />
      )}
      
      {/* Loading Feedback Screen */}
      {isGeneratingFeedback && (
        <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
          <div className="text-center">
            <CircularProgress size={60} sx={{ color: '#dc2626', mb: 3 }} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Analyzing Your Call...
            </h2>
            <p className="text-gray-600">
              Generating personalized feedback and insights
            </p>
          </div>
        </div>
      )}

      {/* Post-Call Feedback */}
      {showMomentFeedback && momentFeedbackData && (
        <MarcusPostCallMoments
          duration={momentFeedbackData.duration}
          conversationExchanges={momentFeedbackData.conversationExchanges as any || []}
          objectionData={momentFeedbackData.objectionData as any || {
            objectionSatisfaction: {},
            objectionCounts: {},
            activeObjection: undefined
          }}
          buyerState={momentFeedbackData.buyerState as any}
          finalResistance={momentFeedbackData.finalResistance || 5}
          metrics={momentFeedbackData.metrics}
          scenario={selectedScenario}
          onTryAgain={handleCloseMomentFeedback}
          preAnalyzedMoments={momentFeedbackData.preAnalyzedMoments as any}
          hybridFeedbackAnalyses={momentFeedbackData.hybridFeedbackAnalyses as any}
        />
      )}
      
      {/* Strategic Moment Coaching Cards */}
      {!showMomentFeedback && !showScenarioSelector && isConnected && currentStrategicMoment && (
        <StrategicMomentCoach
          moment={currentStrategicMoment}
          onDismiss={() => setCurrentStrategicMoment(null)}
        />
      )}
      
      {/* Main Call Interface - Show when ringing, connecting, or connected */}
      {!showMomentFeedback && !showScenarioSelector && selectedScenario && (isRinging || isConnecting || isConnected) && (
        <div className="min-h-screen bg-white flex items-center justify-center p-6">
          <div className="w-full max-w-3xl">
            {/* Header with Profile */}
        <div className="text-center mb-8">
          <div className="w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden shadow-lg border-2 border-black">
            <img 
              src="/charmer-portrait.png" 
              alt="Marcus Stindle"
              className="w-full h-full object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Marcus Stindle
          </h1>
          <p className="text-xl text-red-600 font-medium">
            The Charmer
          </p>
        </div>
        
        {/* Call controls - only show End Call button when connected/connecting */}
        <div className="flex justify-center items-center gap-3 mb-8">
          <Button
            variant="outlined"
            onClick={handleEndCall}
            startIcon={<EndCallIcon />}
            sx={{
              bgcolor: 'white',
              border: '1px solid #dc2626',
              '&:hover': {
                bgcolor: '#fef2f2',
                border: '1px solid #dc2626',
              },
              color: '#dc2626',
              fontWeight: '500',
              fontSize: '0.875rem',
              py: 0.75,
              px: 3,
              borderRadius: 2,
              textTransform: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            End Call
          </Button>
          
          {/* Processing indicator beside button */}
          {isProcessing && (
            <CircularProgress size={20} sx={{ color: '#dc2626' }} />
          )}
        </div>
        
        {/* Ringing indicator */}
        {isRinging && (
          <div className="flex justify-center items-center gap-3 mb-6 p-6 bg-white rounded-xl border-2 border-gray-300">
            <CircularProgress size={24} sx={{ color: '#dc2626' }} />
            <span className="text-base text-gray-700 font-medium">
              📞 Ringing...
            </span>
          </div>
        )}
        
        {/* Connecting indicator */}
        {isConnecting && (
          <div className="flex justify-center items-center gap-3 mb-6 p-6 bg-white rounded-xl border-2 border-gray-300">
            <CircularProgress size={24} sx={{ color: '#dc2626' }} />
            <span className="text-base text-gray-700 font-medium">
              � Connecting...
            </span>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="mb-6 p-6 bg-red-50 border-2 border-red-300 rounded-xl">
            <p className="text-base text-red-900 font-medium">
              Error: {error.message}
            </p>
          </div>
        )}
          </div>
        </div>
      )}
    </>
  );
});

/**
 * CharmerController - Main export with MarcusVoiceProvider wrapper
 */
export const CharmerController = memo((props: CharmerControllerProps) => {
  // Transcript update handler for voice adapter
  const handleTranscriptUpdate = useCallback((text: string, isFinal: boolean) => {
    // Transcript updates are handled internally by CharmerControllerContent
    // via the useMarcusVoice hook's transcript state
    console.log(`[CharmerController] Transcript update: ${text} (final: ${isFinal})`);
  }, []);
  
  // Interruption handler - called when user speaks while Marcus is talking
  const handleInterruption = useCallback((interruptedText: string) => {
    console.log(`🛑 [CharmerController] User interrupted Marcus with: "${interruptedText}"`);
    // Marcus will automatically stop speaking (handled in MarcusVoiceManager)
    // The interrupted text will be processed normally through transcript flow
  }, []);
  
  return (
    <MarcusVoiceProvider 
      onTranscriptUpdate={handleTranscriptUpdate}
      onInterruption={handleInterruption}
    >
      <CharmerControllerContent {...props} />
    </MarcusVoiceProvider>
  );
});

export default CharmerController;

/**
 * CharmerController.tsx
 * Main controller component for Marcus Stindle demo experience
 * Now using AssemblyAI + Cartesia for 100% control and 50% cost savings
 */

import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, CircularProgress } from '@mui/material';
import { Phone as CallIcon, PhoneOff as EndCallIcon, PhoneOff } from 'lucide-react';
import { MarcusVoiceProvider, useMarcusVoice } from './MarcusVoiceAdapter';
import { CharmerPhaseManager, CharmerPhase } from './CharmerPhaseManager';
import { CharmerContextExtractor } from './CharmerContextExtractor';
import { CharmerAIService } from './CharmerAIService';
import { QuestionClassifier, QuestionClassification } from './QuestionClassifier';
import { JudgmentGate, JudgmentContext } from './JudgmentGate';
import { StrategyLayer, StrategyContext, StrategyOutput, BuyerState } from './StrategyLayer';
import { ProductConversationFitService } from './prompts/ProductConversationFitService';
import { CognitiveCompletenessAnalyzer } from './CognitiveCompleteness';
import { MarcusPostCallMoments } from './MarcusPostCallMoments';
import { StrategicMomentCoach } from './StrategicMomentCoach';
import { StrategicMomentDetector } from './StrategicMomentDetector';
import { useOverseer } from './useOverseer';
import { MomentViewModelMapper } from './MomentViewModelMapper';
import { HybridFeedbackGenerator } from './HybridFeedbackGenerator';
import { MomentFeedbackIntegration } from './MomentFeedbackIntegration';
import { MomentFeedbackGenerator } from './MomentFeedbackGenerator';
import { analyzeUserQuestions } from './QuestionDetector';
import { CallMetrics, QuestionAnalysis } from './CallMetrics';
import { MarcusScenario } from './MarcusScenarios';
import { MarcusChallengeLobby } from './MarcusChallengeLobby';
import { getRandomMarcusTraits } from './MarcusTraits';
import { FirstUtterancePatternDetector } from './FirstUtterancePatternDetector';
import { TranscriptQualityDetector } from './TranscriptQualityDetector';
import { FrameworkAnalyzer } from './FrameworkAnalyzer';
import { CriticalMomentDetector } from './CriticalMomentDetector';
import { CallCompletionData, StoredFeedbackData, StoredCallState } from './types/CallData';
import { LocalStorageService } from './services/LocalStorageService';
import { ObjectionGenerator, DiscoveryContext } from './ObjectionGenerator';
import { ConversationTracker } from './ConversationTranscript';
import { CallDetailsCreator, CallDetailsResult } from './CallDetailsCreator';
import { SystemDebugPanel, SystemDebugEvent } from './SystemDebugPanel';
import { ProductConfidenceDetector } from './ProductConfidenceDetector';
import { BuyerBeliefTracker } from './BuyerBeliefTracker';
import { BuyerStateTree } from './BuyerStateTree';
import { TreeDeltaManager } from './TreeDeltaManager';
import { HARD_TRIGGERS, SELLER_SIGNALS, type SellerSignalId } from './BuyerTriggerConstants';

interface CharmerControllerProps {
  onCallEnd?: () => void;
  onCallComplete?: (callData: CallCompletionData) => void;
  autoStart?: boolean;
  initialScenario?: MarcusScenario;
}

/**
 * CharmerControllerContent - Inner component using MarcusVoice context
 */
const CharmerControllerContent = memo(({ 
  onCallEnd, 
  onCallComplete,
  autoStart = false,
  initialScenario
}: CharmerControllerProps) => {
  const navigate = useNavigate();
  const { 
    startCall, 
    endCall, 
    isConnected, 
    isConnecting,
    transcript,
    isFinalTranscript,
    error,
    speakAsMarcus,
    isSpeaking,
    stopSpeaking,
    getRecentMarcusSpeech,
    getCurrentMarcusSpeech
  } = useMarcusVoice();
  
  // Overseer - dynamic scenario architect
  const { analyzeConversation, getGuidance, clearCache: clearOverseerCache, isEnabled: isOverseerEnabled } = useOverseer();
  
  // Phase management
  const phaseManagerRef = useRef(new CharmerPhaseManager());
  const [currentPhase, setCurrentPhase] = useState<CharmerPhase>('prospect');
  const [phaseContext, setPhaseContext] = useState(phaseManagerRef.current.getContext());
  // AI service
  const aiServiceRef = useRef(new CharmerAIService());
  
  // Scenario state - use initialScenario if provided, otherwise restore from localStorage
  const [selectedScenario, setSelectedScenario] = useState<MarcusScenario | null>(() => {
    if (initialScenario) {
      console.log('🎯 Using provided initialScenario:', initialScenario.name);
      return initialScenario;
    }
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
    // Hide scenario selector if initialScenario is provided
    if (initialScenario) return false;
    // Don't show scenario selector if we have saved feedback OR active call
    const feedbackResult = LocalStorageService.getItem<StoredFeedbackData>('feedbackData');
    const callResult = LocalStorageService.getItem<StoredCallState>('activeCall');
    const hasFeedback = feedbackResult.success && feedbackResult.data !== undefined;
    const hasActiveCall = callResult.success && callResult.data !== undefined;
    return !hasFeedback && !hasActiveCall;
  });
  const [isRinging, setIsRinging] = useState(false);
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Call details - generated during ring period
  const callDetailsRef = useRef<CallDetailsResult | null>(null);
  const firstSentenceSpokenRef = useRef<string | null>(null); // Track first sentence if streamed
  const firstSentencePromiseRef = useRef<Promise<void> | null>(null); // Await TTS completion before remainder
  
  // Processed utterances tracker - prevent re-processing same transcript
  const processedUtterancesRef = useRef<Set<string>>(new Set());
  
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
  
  // System Debug Panel state
  const [debugEvents, setDebugEvents] = useState<SystemDebugEvent[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const maxDebugEvents = 50; // Keep last 50 events
  
  // Helper to add debug events
  const addDebugEvent = useCallback((type: SystemDebugEvent['type'], title: string, data: any) => {
    setDebugEvents(prev => {
      const newEvent: SystemDebugEvent = {
        timestamp: Date.now(),
        type,
        title,
        data
      };
      const updated = [...prev, newEvent];
      // Keep only last maxDebugEvents
      return updated.slice(-maxDebugEvents);
    });
  }, []);
  const [lastUserMessage, setLastUserMessage] = useState('');
  const lastTranscriptRef = useRef('');
  const transcriptRef = useRef(''); // Track current transcript for timeout callbacks
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false); // FIX 5: Ref to avoid stale closures in async voice pipelines
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
  
  // Buyer-state modeling system (Phase 1)
  const productConfidenceRef = useRef(new ProductConfidenceDetector());
  const beliefTrackerRef = useRef(new BuyerBeliefTracker());
  const stateTreeRef = useRef(new BuyerStateTree());
  const deltaManagerRef = useRef(new TreeDeltaManager());
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
  // Skip if initialScenario provided - external UI is handling scenario selection
  useEffect(() => {
    if (initialScenario) {
      console.log('🎯 Initial scenario provided - skipping blank state detection');
      return;
    }
    
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
  }, [initialScenario, showScenarioSelector, showMomentFeedback, isGeneratingFeedback, isRinging, isConnecting, isConnected]);
  
  // Refs for tracking
  const sessionIdRef = useRef<string | null>(null);
  const conversationTrackerRef = useRef<ConversationTracker | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const nameMentionCountRef = useRef<{[key: string]: number}>({});
  const sellerSignalsRef = useRef<Set<SellerSignalId>>(new Set());
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
    
    if (isProcessingRef.current) {
      // Accumulate fragments - user is continuing their thought while Marcus processes
      console.log(`⏸️ Already processing - queuing utterance #${utteranceSnapshot}`);
      queuedUtterancesRef.current.push({ text: userText, count: utteranceSnapshot });
      console.log(`📦 Queue size: ${queuedUtterancesRef.current.length}`);
      return;
    }
    
    // Clear any stale interrupt flag from previous utterances
    const wasInterrupted = wasInterruptedRef.current;
    wasInterruptedRef.current = false;
    
    isProcessingRef.current = true;
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
      
      // SAFE BACKCHANNELS: Only stream neutral acknowledgments before Judgment Gate
      // Prevents Marcus from blurting substantive responses that should be suppressed/held
      const SAFE_BACKCHANNELS = ['Mm.', 'Okay.', 'I hear you.', 'Right.', 'Yeah.', 'Uh-huh.', 'Got it.'];
      
      // Sentence streaming callback - only streams SAFE backchannels before judgment
      const handleFirstSentence = (firstSentence: string, emotion?: string) => {
        // Only stream if it's a safe backchannel AND not garbled/ambiguous input
        const isSafeBackchannel = SAFE_BACKCHANNELS.some(bc => 
          firstSentence.trim().toLowerCase().startsWith(bc.toLowerCase().slice(0, -1))
        );
        const isAmbiguousTurn = qualityCheck.isLikelyGarbled || userText.length < 5;
        
        if (isSafeBackchannel && !isAmbiguousTurn) {
          console.log(`🚀 [Safe Backchannel] Streaming: "${firstSentence}"`);
          firstSentenceSpokenRef.current = firstSentence;
          const speed = currentPhase === 'coach' || currentPhase === 'exit' ? 0.85 : 0.75;
          firstSentencePromiseRef.current = speakAsMarcus(firstSentence, {
            voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
            emotion: (emotion as any) || 'neutral',
            speed: speed
          });
        } else {
          console.log(`⏸️ First-sentence streaming blocked (safe=${isSafeBackchannel}, ambiguous=${isAmbiguousTurn})`);
        }
      };
      
      if (qualityCheck.isLikelyGarbled) {
        console.log(`🔊 Poor transcript quality detected (${Math.round(qualityCheck.confidence * 100)}% confidence)`);
        console.log(`   Issues: ${qualityCheck.issues.join(', ')}`);
        console.log(`   Original: "${userText}"`);
      }
      
      // Check if garbled (low confidence) - adapt response
      if (qualityCheck.isLikelyGarbled) {
        console.log('🔧 [Garbled Input] Low confidence detected - using adaptive prompt');
        const currentPhaseStr = phaseManagerRef.current.getCurrentPhase();
        
        // Pass garbled text to AI - prompt has ADAPTIVE CLARIFICATION instructions
        aiResponse = await aiServiceRef.current.generateResponse({
          phase: currentPhaseStr,
          conversationContext: phaseManagerRef.current.getContext(),
          userInput: userText,
          phasePromptContext: phaseManagerRef.current.getPhasePromptContext(),
          conversationHistory: conversationHistory,
          questionCategory: classification.category
        }, undefined, undefined, undefined);
        
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
        
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }
      
      phaseManager = phaseManagerRef.current;
      const currentPhaseStr = phaseManager.getCurrentPhase();
      // Map string phase to number for StrategyLayer compatibility
      const phaseMap: Record<CharmerPhase, number> = { 'prospect': 1, 'coach': 2, 'exit': 3 };
      const currentPhaseNum = phaseMap[currentPhaseStr];
      const context = phaseManager.getContext();
      
      // Track message for feedback generation (but don't add to conversationHistory yet - that happens after AI responds)
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
          // FIX 2: Lock Turn 1 names - only allow explicit corrections
          // Prevents "Jason → team go" type bugs from weak name detection
          const explicitCorrection = /\b(actually|sorry|my name is|it'?s|this is|call me)\s+[A-Z][a-z]+\b/i.test(userText);
          
          if (explicitCorrection) {
            nameMentionCountRef.current = { [extracted.name]: 1 };
            phaseManager.updateContext({ userName: extracted.name });
            console.log(`🔄 Name corrected (explicit): ${context.userName} → ${extracted.name}`);
          } else {
            console.log(`🔒 Ignoring weak name correction (locked: ${context.userName}, detected: ${extracted.name})`);
          }
        } else if (!context.userName) {
          // First time seeing this name
          if (!nameMentionCountRef.current[extracted.name]) {
            nameMentionCountRef.current[extracted.name] = 0;
          }
          nameMentionCountRef.current[extracted.name]++;
          
          console.log(`📊 Name mention count for "${extracted.name}": ${nameMentionCountRef.current[extracted.name]}`);
          
          // TURN 1 INTRODUCTION: Accept name immediately if it's clearly an introduction
          const isIntroduction = processingUtteranceCount === 1 && (
            /\b(it'?s|this is|my name is|i'?m)\s+[A-Z]/i.test(userText) ||
            /\b[A-Z][a-z]+\s+from\s+/i.test(userText)
          );
          
          if (isIntroduction) {
            phaseManager.updateContext({ userName: extracted.name });
            console.log(`✅ Captured user name: ${extracted.name} (Turn 1 introduction - immediate acceptance)`);
          } else if (nameMentionCountRef.current[extracted.name] >= 2) {
            // Non-introduction: require 2 mentions to confirm
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
      
      // Detect seller signals for PreTreeBuyerPolicy
      // Split: PERSISTENT signals (accumulate across call) vs TURN-SPECIFIC signals (this turn only)
      const turnSpecificSignals = new Set<SellerSignalId>();
      
      // PERSISTENT: Bold metric claim (call fact)
      const metricClaimPattern = /\b(\d+%|\d+x|\d+\s*times|\d+\s*(percent|hours|days|weeks|months|dollars|k|thousand|million))\b.*\b(revenue|sales|conversion|close rate|win rate|productivity|efficiency|time|cost|ramp|onboarding)\b/i;
      if (metricClaimPattern.test(userText)) {
        sellerSignalsRef.current.add(SELLER_SIGNALS.BOLD_METRIC_CLAIM);
        console.log('📊 [Seller Signal] Bold metric claim detected (persistent)');
      }
      
      // PERSISTENT: Competitor mentioned (call fact)
      const competitorPattern = /\b(gong|chorus|salesloft|outreach|hubspot|salesforce|competitor|alternative|other (tool|platform|solution)s?)\b/i;
      if (competitorPattern.test(userText)) {
        sellerSignalsRef.current.add(SELLER_SIGNALS.MENTIONED_COMPETITOR);
        console.log('🏢 [Seller Signal] Competitor/alternative mentioned (persistent)');
      }
      
      // PERSISTENT: Asked about current tools (call fact)
      const currentToolsPattern = /\b(what (are you|do you) (using|use)|what do you have in place|what are you using today|current (solution|tool|platform|system|process)|how (are you|do you) (currently )?(doing|handling|managing)|what does that look like today)\b/i;
      if (currentToolsPattern.test(userText)) {
        sellerSignalsRef.current.add(SELLER_SIGNALS.ASKED_ABOUT_CURRENT_TOOLS);
        console.log('🔧 [Seller Signal] Asked about current tools (persistent)');
      }
      
      // PERSISTENT: AI mentioned (call fact)
      const aiMentionPattern = /\b(AI|artificial intelligence|machine learning|GPT|ChatGPT|LLM)\b/i;
      if (aiMentionPattern.test(userText)) {
        sellerSignalsRef.current.add(SELLER_SIGNALS.MENTIONED_AI);
        console.log('🤖 [Seller Signal] AI mentioned (persistent)');
      }
      
      // TURN-SPECIFIC: Mechanism explained (this turn's behavior)
      const mechanismPattern = /\b(we do that by|how it works is|the way it works|through|by|using|via|with|leveraging|powered by)\b.{0,120}\b(practice|analyze|simulate|roleplay|coach|score|detect|generate|train|personalize|adapt|integrate|record|review|recommend|platform|system|technology|AI|training|simulation|tool|process|method|approach)\b/i;
      if (mechanismPattern.test(userText)) {
        turnSpecificSignals.add(SELLER_SIGNALS.EXPLAINED_MECHANISM);
        console.log('🔧 [Seller Signal] Mechanism explained (turn-specific)');
      }
      
      // TURN-SPECIFIC: Proof provided (this turn's behavior)
      const proofPattern = /\b(company|customer|client|team|organization)\s+(\w+\s+){0,3}(saw|achieved|got|reached|increased|improved|reduced)\b/i;
      const examplePattern = /\b(for example|such as|case study|real example|specific example)\b/i;
      const likeExamplePattern = /\blike\s+(a company|one customer|teams?|organizations?|businesses?|clients?)\b/i;
      if (proofPattern.test(userText) || examplePattern.test(userText) || likeExamplePattern.test(userText)) {
        turnSpecificSignals.add(SELLER_SIGNALS.PROVIDED_PROOF);
        console.log('✅ [Seller Signal] Proof/example provided (turn-specific)');
      }
      
      // TURN-SPECIFIC: Vague claim (this turn's behavior)
      const vaguePattern = /\b(innovative|unique|cutting[- ]edge|revolutionary|game[- ]changing|next[- ]generation|solution|platform)\b/i;
      const hasVagueLanguage = vaguePattern.test(userText);
      const hasMechanism = mechanismPattern.test(userText);
      const hasProof = proofPattern.test(userText) || examplePattern.test(userText);
      if (hasVagueLanguage && !hasMechanism && !hasProof) {
        turnSpecificSignals.add(SELLER_SIGNALS.VAGUE_CLAIM);
        console.log('💭 [Seller Signal] Vague claim detected (turn-specific)');
      }
      
      // TURN-SPECIFIC: Dodged mechanics question (this turn's behavior)
      const lastMarcusMessage = conversationHistory[conversationHistory.length - 1];
      const marcusAskedHow = lastMarcusMessage?.role === 'assistant' && /\b(how|what.*do|explain|walk me through)\b/i.test(lastMarcusMessage.content || '');
      const hasClarifyingAttempt = /\b(it works by|basically|the idea is|what it does is|we help by|it uses|it gives|it lets)\b/i.test(userText);
      if (marcusAskedHow && !mechanismPattern.test(userText) && !hasClarifyingAttempt) {
        turnSpecificSignals.add(SELLER_SIGNALS.DODGED_MECHANICS);
        console.log('🚫 [Seller Signal] Dodged mechanics question (turn-specific)');
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
      
      // STRATEGY LAYER: Start in parallel - don't block AI generation
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
      
      // ⚡ NON-BLOCKING: Start strategy calculation in parallel with AI generation
      const strategyPromise = strategyLayerRef.current.determineStrategy(strategyContext);
      
      // Use previous buyer state for AI prompt (strategy will update after)
      buyerState = buyerStateBefore;
      
      // OVERSEER: DISABLED for voice realism tests
      // Was generating JSON parsing errors and adding cost without benefit
      // Re-enable later if needed for advanced coaching scenarios
      // if (analyzeConversation) {
      //   analyzeConversation({
      //     conversationHistory,
      //     currentResistance: buyerState.resistanceLevel,
      //     currentPhase: currentPhaseStr,
      //     exchangeCount: conversationHistory.length,
      //     lastUserMessage: userText,
      //     difficulty: selectedScenario?.difficulty,
      //     scenario: selectedScenario,
      //     budgetConstraint: selectedScenario?.traits?.budget,
      //     idealOutcome: selectedScenario?.traits?.idealOutcome
      //   });
      // }
      
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
          
          // DEBUG: Capture coaching detections
          if (analysis.feedback) {
            addDebugEvent('coaching', 'Coaching Detection', {
              issue: analysis.feedback.primaryIssue,
              evidence: analysis.feedback.evidence,
              mechanisticExplanation: analysis.feedback.mechanisticExplanation,
              betterApproach: analysis.feedback.betterApproach,
              topMechanics: analysis.detectionSummary.topMechanics
            });
          }
        }
      }).catch(err => {
        console.error('⚠️ Hybrid feedback analysis failed:', err);
      });
      
      // ⚡ AWAIT STRATEGY: Now wait for strategy calculation to complete
      strategyOutput = await strategyPromise;
      buyerState = strategyOutput.buyerState;
      
      // 🌳 BUYER-STATE MODELING: Update dynamic buyer state tree
      const turnNumber = Math.floor(conversationHistory.length / 2) + 1;
      
      // Step 1: Update product confidence
      // TODO FIX 3: ProductConfidenceDetector should suppress product name extraction when PROVIDED_PROOF signal is present
      // This prevents customer names like "Gap" from being detected as product names during case studies
      const productConfidence = productConfidenceRef.current.updateConfidence(
        userText,
        turnNumber
      );
      
      // Step 2: Update belief tracker
      const beliefs = beliefTrackerRef.current.updateBeliefs(
        userText,
        turnNumber,
        repQualitySignals,
        productConfidence.category
      );
      
      // Step 3: Generate tree when product confidence reaches medium
      if (productConfidence.shouldGenerateTree) {
        // CRITICAL: Generate product physics for realistic buyer state selection
        const productPhysics = ProductConversationFitService.analyzeProduct(
          userText,
          [productConfidence.product || '', productConfidence.category || ''].filter(Boolean)
        );
        
        console.log(`🏗️ [ProductPhysics] Tree generation with archetype: ${productPhysics.archetype}`);
        
        await stateTreeRef.current.generateTree({
          productName: productConfidence.product,
          productCategory: productConfidence.category,
          productPhysics: productPhysics,  // NOW TREE USES PRODUCT PHYSICS!
          beliefState: beliefs,
          maxDepth: 3,
          maxChildrenPerNode: 4,
          callContext: callDetailsRef.current?.treeContext
        }, turnNumber);
        
        productConfidenceRef.current.markTreeGenerated();
      }
      
      // Step 4: Activate tree when product confidence reaches high
      if (productConfidence.shouldActivateTree) {
        stateTreeRef.current.activateTree();
        productConfidenceRef.current.markTreeActivated();
      }
      
      // Step 5: Map rep quality signals to hard trigger IDs (using shared constants)
      const hardTriggers: string[] = [];
      
      // Map specific rep behaviors to trigger IDs that match BuyerStateTree
      if (repQualitySignals.askedOpenEnded) {
        hardTriggers.push(HARD_TRIGGERS.ASKS_GOOD_DISCOVERY_QUESTION);
      }
      if (repQualitySignals.acknowledgedPain) {
        hardTriggers.push(HARD_TRIGGERS.DEMONSTRATES_GENUINE_CURIOSITY);
      }
      if (repQualitySignals.providedProof) {
        hardTriggers.push(HARD_TRIGGERS.PROVIDES_SOCIAL_PROOF);
      }
      if (repQualitySignals.askedPermission) {
        hardTriggers.push(HARD_TRIGGERS.ASKS_PERMISSION_TO_CONTINUE);
      }
      if (repQualitySignals.builtRapport) {
        hardTriggers.push(HARD_TRIGGERS.BUILDS_RAPPORT);
      }
      // Note: Additional trigger mappings can be added as rep quality signals expand
      
      // Register hard triggers before state update
      stateTreeRef.current.registerHardTriggers(hardTriggers);
      
      // DEBUG: Verify tree state before update
      console.log('[Tree Pre-Update]', {
        currentNode: stateTreeRef.current.getCurrentState()?.stateName,
        productConfidence: productConfidence.confidence,
        shouldGenerate: productConfidence.shouldGenerateTree,
        shouldActivate: productConfidence.shouldActivateTree
      });
      
      // Step 6: Update state tree (may trigger transition)
      const stateTransition = await stateTreeRef.current.updateState(
        userText,
        beliefs,
        productConfidence,
        turnNumber
      );
      
      // DEBUG: Log state tree updates
      if (stateTransition) {
        addDebugEvent('state', 'State Transition', {
          from: stateTransition.fromNodeId,
          to: stateTransition.toNodeId,
          reason: stateTransition.reason,
          confidence: stateTransition.confidence,
          triggerType: stateTransition.triggerType
        });
      }
      
      addDebugEvent('state', 'Product Confidence', {
        confidence: productConfidence.confidence,
        product: productConfidence.product,
        category: productConfidence.category,
        signals: productConfidence.signals.slice(0, 5) // Show first 5 signals
      });
      
      addDebugEvent('state', 'Belief State', {
        understandsProduct: beliefs.understandsProduct,
        seesRelevance: beliefs.seesRelevance,
        trustsRep: beliefs.trustsRep,
        painClarity: beliefs.painClarity,
        valueClarity: beliefs.valueClarity,
        urgency: beliefs.urgency
      });
      
      // Step 7: Generate buyer-facing delta for Marcus's prompt with availability overlay
      const currentNode = stateTreeRef.current.getCurrentState();
      const childNodes = currentNode ? stateTreeRef.current.getChildNodes(currentNode.nodeId) : [];
      const treeActivated = stateTreeRef.current.isActivated();
      
      // Convert scenario traits to numeric scores for availability determination
      const convertUrgencyToNumber = (urgency: string): number => {
        switch (urgency) {
          case 'high': return 9;
          case 'medium': return 5;
          case 'low': return 2;
          default: return 5;
        }
      };
      
      const convertOpennessToNumber = (openness: string): number => {
        switch (openness) {
          case 'skeptical': return 2;
          case 'guarded': return 4;
          case 'neutral': return 5;
          case 'curious': return 7;
          case 'eager': return 9;
          default: return 5;
        }
      };
      
      // Extract scenario traits for availability determination
      const scenarioTraits = selectedScenario?.traits ? {
        urgency: convertUrgencyToNumber(selectedScenario.traits.urgency),
        openness: convertOpennessToNumber(selectedScenario.traits.openness),
        satisfaction: selectedScenario.traits.satisfactionLevel,
        initialResistance: selectedScenario.traits.initialResistance,
        patience: 10 - selectedScenario.traits.initialResistance // Inverse of resistance
      } : undefined;
      
      // FIX 1: Do NOT blend persistent and turn-specific signals
      // Keep them separated so PreTreeBuyerPolicy can distinguish:
      // - Persistent: "Has bold claim ever been mentioned?" (call facts)
      // - Turn-specific: "Did seller dodge mechanics THIS turn?" (this turn's behavior)
      const separatedSignals = {
        persistent: Array.from(sellerSignalsRef.current),
        turnSpecific: Array.from(turnSpecificSignals)
      };
      
      const buyerDelta = deltaManagerRef.current.generateBuyerDelta(
        currentNode,
        childNodes,
        beliefs,
        stateTransition,
        turnNumber,
        productConfidence,
        treeActivated,
        separatedSignals.persistent.concat(separatedSignals.turnSpecific),  // TODO: Update TreeDeltaManager to accept separated signals
        scenarioTraits
      );
      
      if (buyerDelta) {
        addDebugEvent('state', 'Buyer Delta Generated', {
          currentState: buyerDelta.currentState.name,
          behaviorCount: buyerDelta.behaviorGuidance.length,
          reactionCount: buyerDelta.reactionGuidance.length,
          doNotRevealCount: buyerDelta.doNotReveal.length
        });
        console.log('🌳 [BuyerDelta] Generated for Marcus prompt:');
        console.log(buyerDelta.guidanceText);
      }
      
      // DEBUG: Capture strategy state changes
      addDebugEvent('strategy', 'Buyer State Update', {
        emotionalPosture: buyerState.emotionalPosture,
        resistanceLevel: buyerState.resistanceLevel,
        openness: buyerState.openness,
        patience: buyerState.patience
      });
      
      // Update resistance tracking
      setLastResistance(currentResistance);
      setCurrentResistance(buyerState.resistanceLevel);
      
      console.log(`🧠 Question classified: ${classification.questionType} (${classification.category})`);
      
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
            // Clean up sentence streaming state - first sentence may have been spoken
            if (firstSentenceSpokenRef.current) {
              console.log('🔇 Stopping first sentence TTS (response scrapped)');
              stopSpeaking();
            }
            firstSentenceSpokenRef.current = null;
            firstSentencePromiseRef.current = null;
            isProcessingRef.current = false;
            setIsProcessing(false);
            return;
          }
        } catch (err) {
          console.log('⚠️ Speculative response failed, generating fresh response');
          speculativeResponseRef.current = null;
          
          // SAFETY: Check before starting fresh generation
          if (utteranceCountRef.current !== processingUtteranceCount) {
            console.log('🚫 User started new utterance - aborting fresh generation');
            isProcessingRef.current = false;
            setIsProcessing(false);
            return;
          }
          
          // Overseer still runs for debug logs but guidance not injected into prompt
          const overseerGuidance = getGuidance();
          if (overseerGuidance) {
            console.log('🎭 [Overseer] Generated guidance (not injected):', overseerGuidance.substring(0, 200) + '...');
          }
          
          aiResponse = await aiServiceRef.current.generateResponse({
            phase: currentPhaseStr,
            conversationContext: phaseManager.getContext(),
            userInput: userText,
            phasePromptContext: phaseManager.getPhasePromptContext(),
            conversationHistory: conversationHistory,
            scenario: selectedScenario,
            questionCategory: classification.category
          }, undefined, undefined, undefined, callDetailsRef.current?.marcusPromptBlock, buyerDelta?.guidanceText, handleFirstSentence);
          
          // SAFETY: Check after generation completes
          if (utteranceCountRef.current !== processingUtteranceCount) {
            console.log('🚫 User started new utterance during fallback generation - scrapping response');
            if (firstSentenceSpokenRef.current) {
              console.log('🔇 Stopping first sentence TTS (response scrapped)');
              stopSpeaking();
            }
            firstSentenceSpokenRef.current = null;
            firstSentencePromiseRef.current = null;
            isProcessingRef.current = false;
            setIsProcessing(false);
            return;
          }
        }
      } else {
        // ALWAYS USE FULL LLM - no pattern detection, no shortcuts
        const userMessages = conversationHistory.filter(msg => msg.role === 'user');
        const turnNumber = userMessages.length + 1;
        
        console.log(`🔍 Turn ${turnNumber}: Using full LLM intelligence (all patterns disabled)`);
        aiResponse = await aiServiceRef.current.generateResponse({
          phase: currentPhaseStr,
          conversationContext: phaseManagerRef.current.getContext(),
          userInput: userText,
          phasePromptContext: phaseManagerRef.current.getPhasePromptContext(),
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
        }, undefined, undefined, undefined, buyerDelta?.guidanceText, handleFirstSentence);
        
        // SAFETY: Check after generation completes
        if (utteranceCountRef.current !== processingUtteranceCount) {
          console.log('🚫 User started new utterance during generation - scrapping response');
          console.log(`   Was processing utterance #${processingUtteranceCount}, now at #${utteranceCountRef.current}`);
          if (firstSentenceSpokenRef.current) {
            console.log('🔇 Stopping first sentence TTS (response scrapped)');
            stopSpeaking();
          }
          firstSentenceSpokenRef.current = null;
          firstSentencePromiseRef.current = null;
          isProcessingRef.current = false;
          setIsProcessing(false);
          return;
        }
      }
      
      // Check if we were interrupted BEFORE starting this processing
      // (flag captured at start, already cleared from ref)
      if (wasInterrupted) {
        console.log('🛑 Response cancelled - user was interrupting when this utterance arrived');
        isProcessingRef.current = false;
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
      
      isProcessingRef.current = false;
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
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }
      
      // COGNITIVE COMPLETENESS: Analyze if USER's thought has landed (witness data)
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
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }
      
      // Handle HOLD - wait for user to continue (ambiguous input)
      if (judgment.action === 'hold' && judgment.holdUntil === 'user_continues') {
        console.log(`🤚 [Judgment Gate] HOLD - ${judgment.reason}`);
        console.log(`   Waiting for user to clarify ambiguous input (no artificial delay)`);
        // TODO: Future - route to multi-LLM strategic analysis for complex moments
        // For now, suppress and wait for user continuation
        isProcessingRef.current = false;
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
      // If first sentence was already streamed, only speak the remainder
      if (firstSentenceSpokenRef.current) {
        // Wait for first sentence TTS to finish playing before speaking remainder
        if (firstSentencePromiseRef.current) {
          console.log(`⏳ Waiting for first sentence TTS to finish...`);
          await firstSentencePromiseRef.current;
          firstSentencePromiseRef.current = null;
        }
        console.log(`📡 First sentence was streamed - speaking remainder only`);
        // Remove first sentence from content (already spoken)
        const remainder = aiResponse.content.replace(firstSentenceSpokenRef.current, '').trim();
        if (remainder.length > 0) {
          await speakAsMarcus(remainder, {
            voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
            emotion: aiResponse.emotion,
            speed: speed
          });
        }
        firstSentenceSpokenRef.current = null; // Reset for next turn
      } else {
        // No streaming - speak full response
        await speakAsMarcus(aiResponse.content, {
          voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
          emotion: aiResponse.emotion,
          speed: speed
        });
      }
      
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
        isProcessingRef.current = false;
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
      
      // Add both user message and Marcus's response to history (prevents duplicate context confusion)
      setConversationHistory(prev => [
        ...prev, 
        { role: 'user', content: userText },
        { role: 'assistant', content: aiResponse.content }
      ]);
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
          console.log(`🚩 [Objection] Marcus raised: ${aiResponse.objection.objection_id} (severity: ${aiResponse.objection.severity})`);
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
      
      isProcessingRef.current = false;
      setIsProcessing(false);
    } catch (error) {
      console.error('❌ Error during Marcus response processing:', error);
      isProcessingRef.current = false;
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
    
    // CRITICAL: Prevent re-processing same utterance (Deepgram buffer flushes)
    if (isFinalTranscript && processedUtterancesRef.current.has(transcript)) {
      console.log(`🔁 Skipping already-processed utterance: "${transcript.substring(0, 60)}..."`);
      return;
    }
    
    // Update transcript ref for timeout callbacks
    transcriptRef.current = transcript;
    
    // Get new content
    const newContent = transcript.replace(lastTranscriptRef.current, '').trim();
    
    // SPECULATIVE GENERATION: DISABLED - always use full LLM for better quality
    // This gives instant response while still processing complete messages
    const isFirstUtterance = utteranceCountRef.current === 0;
    const words = newContent.split(/\s+/);
    const wordCount = words.length;
    
    if (false && !isFinalTranscript && isFirstUtterance && wordCount >= 2 && !speculativeResponseRef.current && !isSpeaking) {
      // PATTERN DETECTION: Re-check pattern on each partial until we get a match
      const patternMatch = FirstUtterancePatternDetector.detect(newContent);
      
      if (patternMatch.extractedName) {
        console.log(`📋 Extracted name from pattern: ${patternMatch.extractedName}`);
      }
      
      if (patternMatch.extractedCompany) {
        console.log(`📋 Extracted company from pattern: ${patternMatch.extractedCompany}`);
        const context = phaseManagerRef.current.getContext();
        if (!context.extractedCompany) {
          phaseManagerRef.current.updateContext({ extractedCompany: patternMatch.extractedCompany });
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
        }, undefined, undefined, undefined, undefined).catch(err => {
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
      // REAL-TIME INTERRUPTION: Check interim results for immediate interruption
      if (newContent && newContent.length > 5 && isSpeaking) {
        const activeMarcusSpeeches = getCurrentMarcusSpeech();
        const userText = newContent.toLowerCase().trim();
        
        // Quick echo check - if it matches ANY of Marcus's active speeches, ignore
        let isEcho = false;
        for (const marcusSpeech of activeMarcusSpeeches) {
          if (userText === marcusSpeech || 
              marcusSpeech.includes(userText) || 
              userText.includes(marcusSpeech) ||
              (userText.length > 10 && marcusSpeech.startsWith(userText.slice(0, 10)))) {
            isEcho = true;
            break;
          }
        }
        
        if (!isEcho) {
          console.log(`🛑 REAL-TIME interrupt - stopping Marcus on interim: "${newContent.substring(0, 40)}..."`);
          stopSpeaking();
        }
      }
      
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
      
      // REAL-TIME ECHO FILTERING: Check what Marcus is CURRENTLY saying (all active speeches)
      const activeMarcusSpeeches = getCurrentMarcusSpeech();
      const userText = newContent.toLowerCase().trim();
      
      for (const marcusSpeech of activeMarcusSpeeches) {
        // Marcus is speaking this right now - check if transcript matches
        const isSimilar = userText === marcusSpeech || 
                         marcusSpeech.includes(userText) || 
                         userText.includes(marcusSpeech) ||
                         (userText.length > 10 && marcusSpeech.startsWith(userText.slice(0, 10)));
        
        if (isSimilar) {
          console.log(`🔇 Filtered Marcus echo (LIVE): "${newContent}" (matches active speech: "${marcusSpeech.substring(0, 50)}...")`);
          lastTranscriptRef.current = transcript;
          return;
        }
      }
      
      // HISTORICAL ECHO FILTERING: Check against recent speech history as backup
      const recentMarcusSpeech = getRecentMarcusSpeech();
      
      for (const marcusText of recentMarcusSpeech) {
        const isSimilar = userText === marcusText || 
                         marcusText.includes(userText) || 
                         userText.includes(marcusText) ||
                         (userText.length > 10 && marcusText.startsWith(userText.slice(0, 10)));
        
        if (isSimilar) {
          console.log(`🔇 Filtered Marcus echo (RECENT): "${newContent}" (matches recent speech: "${marcusText.substring(0, 50)}...")`);
          lastTranscriptRef.current = transcript;
          return;
        }
      }
      
      // USER INTERRUPTION: If transcript passed echo filtering and Marcus is speaking, stop him
      if (isSpeaking) {
        console.log(`🛑 User interrupted Marcus - stopping immediately`);
        stopSpeaking();
        
        // FIX 6: Clear queued utterances - user is changing direction
        if (queuedUtterancesRef.current.length > 0) {
          console.log(`🗑️ Clearing ${queuedUtterancesRef.current.length} queued utterances (user interrupted)`);
          queuedUtterancesRef.current = [];
        }
      }
      
      // IMMEDIATE PROCESSING: Process utterance as soon as user stops speaking
      // No buffering delay for faster responses
      
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
      
      // Process immediately
      const words = mergedContent.split(/\s+/);
      const wordCount = words.length;
      utteranceCountRef.current++;
      const currentUtterance = utteranceCountRef.current;
      
      console.log(`⚡ Processing utterance #${currentUtterance} immediately (${wordCount} words)`);
      console.log(`🎙️ User speech: "${mergedContent}"`);
      console.log(`🔧 [DEBUG] Calling processUserInput for utterance #${currentUtterance}, isProcessing=${isProcessing}`);
      
      // Mark this transcript as processed to prevent re-processing
      processedUtterancesRef.current.add(transcript);
      
      processUserInputWithQueue(mergedContent, currentUtterance);
      pendingUtteranceRef.current = null;
      
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
  }, [transcript, isFinalTranscript, isSpeaking, selectedScenario, processUserInputWithQueue, detectContinuationCue]);
  
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
        const greetingPool = [
          "Hello, Marcus speaking?",
          "Hello?",
          "Marcus here.",
          "Yeah, hello?",
          "Yep, Marcus.",
          "Yeah, who's this?",
          "...Yeah, hello.",
          "Hello, yeah.",
        ];
        const seed = phaseManagerRef.current.getContext().callVariationSeed ?? 50;
        const greeting = greetingPool[Math.floor((seed / 100) * greetingPool.length)];
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
    
    // Clear processed utterances tracker for new call
    processedUtterancesRef.current.clear();
    
    // Reset buyer-state modeling system for new call
    productConfidenceRef.current.reset();
    beliefTrackerRef.current.reset();
    stateTreeRef.current.reset();
    console.log('🌳 Buyer-state system reset for new call');
    
    // Reset phase manager with scenario context
    const callVariationSeed = Math.floor(Math.random() * 100);
    console.log(`🎲 Call variation seed: ${callVariationSeed}`);
    phaseManagerRef.current.reset();
    phaseManagerRef.current.updateContext({
      product: scenario.product,
      marcusRole: scenario.marcusRole,
      marcusMood: scenario.marcusMood,
      callVariationSeed
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
    
    // Generate call details during ring period (zero latency cost)
    CallDetailsCreator.generate(
      scenario.product,
      scenario.name,
      callVariationSeed
    ).then(details => {
      callDetailsRef.current = details;
      console.log('🎭 Call details generated during ring period');
    }).catch(err => {
      console.warn('🎭 Call details generation failed, using fallback', err);
      callDetailsRef.current = null;
    });
    
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
    
    // Clear processed utterances tracker for new call
    processedUtterancesRef.current.clear();
    
    // Reset buyer-state modeling system for new call
    productConfidenceRef.current.reset();
    beliefTrackerRef.current.reset();
    stateTreeRef.current.reset();
    console.log('🌳 Buyer-state system reset for new call');
    
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
    
    // CRITICAL: Stop Marcus from speaking IMMEDIATELY
    if (typeof stopSpeaking === 'function') {
      await stopSpeaking();
      console.log('🔇 Stopped Marcus speech');
    }
    
    // End call to terminate WebSocket
    await endCall();
    
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
    
    // Skip setting feedback data - redirect directly to Kimi demo
    // (Kimi demo doesn't need this data, it has its own mock data)
    
    // End loading state
    setIsGeneratingFeedback(false);
    
    // Navigate to post-call review page (renders static HTML in an iframe)
    console.log('🎯 Navigating to post-call review...');
    navigate('/post-call-review');
    
  }, [endCall, onCallEnd, onCallComplete, conversationHistory, stopSpeaking, navigate]);
  
  /**
   * Auto-trigger ringing sequence when initialScenario provided
   */
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (initialScenario && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      console.log('🎯 Initial scenario provided - starting proper ringing sequence');
      setTimeout(() => {
        handleScenarioSelect(initialScenario);
      }, 500);
      return;
    }
    
    if (autoStart && !isConnected && !isConnecting && !hasAutoStartedRef.current) {
      hasAutoStartedRef.current = true;
      console.log('🎯 Auto-starting Marcus call');
      setTimeout(() => {
        handleStartCall();
      }, 500);
    }
  }, [initialScenario, autoStart, isConnected, isConnecting, handleStartCall, handleScenarioSelect]);
  
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
        <div className="fixed inset-0 bg-cream bg-noise flex items-center justify-center z-50">
          <div className="text-center max-w-md px-6">
            {/* Branded gradient spinner */}
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-brand-orange/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-orange border-r-brand-amber animate-spin" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-brand-orange/10 to-brand-amber/10 animate-pulse" />
            </div>
            
            <h2 className="font-display text-3xl font-bold text-[#1A1A1A] mb-3">
              Analyzing Your Call
              <span className="inline-block ml-1 animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
              <span className="inline-block ml-0.5 animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
              <span className="inline-block ml-0.5 animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </h2>
            
            <p className="text-[#5A5A5A] text-lg leading-relaxed mb-2">
              Generating personalized feedback and insights
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-brand-orange/10 shadow-sm mt-2">
              <div className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
              <span className="text-sm font-medium text-brand-orange">AI Powered Analysis</span>
            </div>
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
      
      {/* Main Call Interface - Kimi Design */}
      {!showMomentFeedback && !showScenarioSelector && selectedScenario && (isRinging || isConnecting || isConnected) && (
        <div className="min-h-screen flex flex-col lg:flex-row bg-[#F8F7F5]">
          {/* Left: Call Stage */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
            <div className="w-full max-w-[400px]">
              {/* Avatar */}
              <div className="mb-6 flex justify-center">
                <img
                  src="/marcus-avatar.webp"
                  alt="Marcus Stindle"
                  className="w-36 h-36 rounded-full object-cover shadow-xl shadow-brand-orange/10"
                />
              </div>

              {/* Name */}
              <div className="text-center mb-6">
                <h2 className="font-display text-2xl font-bold text-[#1A1A1A]">Marcus Stindle</h2>
                <p className="text-brand-orange font-medium text-sm mt-0.5">CFO, VantageFlow</p>
              </div>

              {/* Status */}
              <p className="text-center text-[#8A8A8A] text-xs font-mono tracking-wider uppercase mb-8">
                {isRinging
                  ? "Ringing..."
                  : isConnecting
                  ? "Connecting..."
                  : isSpeaking
                  ? "Marcus is speaking..."
                  : isConnected
                  ? "Your turn"
                  : "Connecting..."}
              </p>

              {/* Call Controls */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <button className="w-14 h-14 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center text-danger hover:bg-danger/20 transition-colors" onClick={handleEndCall}>
                  <PhoneOff size={22} />
                </button>
              </div>

              {/* Error display */}
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-sm text-red-900">Error: {error.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Transcript */}
          <div className="flex-1 bg-white lg:border-l border-gray-100 flex flex-col min-h-[50vh] lg:min-h-0">
            <div className="flex-1 overflow-y-auto p-6 lg:p-8">
              <h3 className="text-xs font-mono font-semibold text-[#8A8A8A] tracking-wider uppercase mb-4">
                Transcript
              </h3>
              <div className="space-y-4">
                {conversationTrackerRef.current?.getExchangePairs().map((pair, idx) => (
                  <div key={idx} className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono font-bold shrink-0 mt-0.5 text-brand-amber">
                        YOU
                      </span>
                      <p className="text-[#1A1A1A] text-sm leading-relaxed">{pair.user.text}</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono font-bold shrink-0 mt-0.5 text-brand-orange">
                        MARCUS
                      </span>
                      <p className="text-[#1A1A1A] text-sm leading-relaxed">{pair.marcus.text}</p>
                    </div>
                  </div>
                ))}
                {isSpeaking && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-brand-orange">MARCUS</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-brand-orange/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-brand-orange/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-brand-orange/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live transcript preview */}
            {!isFinalTranscript && transcript && (
              <div className="border-t border-gray-100 p-6 lg:p-8 bg-gray-50/50">
                <p className="text-xs font-mono font-semibold text-[#8A8A8A] tracking-wider uppercase mb-3">
                  You're saying...
                </p>
                <p className="text-[#1A1A1A] text-sm italic opacity-60">{transcript}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* System Debug Panel - Shows AI prompts, state changes, coaching in real-time */}
      <SystemDebugPanel 
        events={debugEvents}
        isVisible={showDebugPanel}
        onToggle={() => setShowDebugPanel(!showDebugPanel)}
      />
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

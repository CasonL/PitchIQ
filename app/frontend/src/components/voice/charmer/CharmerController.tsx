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
import { StrategyLayer, StrategyContext, StrategyConstraints } from './StrategyLayer';
import { SentenceCompletenessAnalyzer } from './SentenceCompleteness';
import { CognitiveCompletenessAnalyzer } from './CognitiveCompleteness';
import { CHARMER_PERSONA } from '../../../data/staticPersonas/theCharmer';
import { MarcusPostCallMoments } from './MarcusPostCallMoments';
import { ConversationTracker } from './ConversationTranscript';
import { CriticalMomentDetector } from './CriticalMomentDetector';
import { MomentFeedbackGenerator } from './MomentFeedbackGenerator';
import { MarcusChallengeLobby } from './MarcusChallengeLobby';
import { MarcusScenario } from './MarcusScenarios';
import { FirstUtterancePatternDetector } from './FirstUtterancePatternDetector';
import { TranscriptQualityDetector } from './TranscriptQualityDetector';

interface CharmerControllerProps {
  onCallEnd?: () => void;
  onCallComplete?: (callData: any) => void;
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
  
  // Phase management
  const phaseManagerRef = useRef(new CharmerPhaseManager());
  const [currentPhase, setCurrentPhase] = useState<CharmerPhase>('prospect');
  const [phaseContext, setPhaseContext] = useState(phaseManagerRef.current.getContext());
  // AI service
  const aiServiceRef = useRef(new CharmerAIService());
  
  // Scenario state
  const [selectedScenario, setSelectedScenario] = useState<MarcusScenario | null>(null);
  const [showScenarioSelector, setShowScenarioSelector] = useState(true);
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
  const [showMomentFeedback, setShowMomentFeedback] = useState(false);
  const [momentFeedbackData, setMomentFeedbackData] = useState<{momentPuzzles: any[], callSummary: any, duration: number} | null>(null);
  const lastTranscriptRef = useRef('');
  const transcriptRef = useRef(''); // Track current transcript for timeout callbacks
  const [isProcessing, setIsProcessing] = useState(false);
  const wasInterruptedRef = useRef(false);
  const incompleteUtteranceRef = useRef('');
  const lastMarcusSpeakTimeRef = useRef(0);
  const speculativeResponseRef = useRef<Promise<any> | null>(null);
  const lastClassificationRef = useRef<QuestionClassification | null>(null);
  const judgmentGateRef = useRef(new JudgmentGate());
  const strategyLayerRef = useRef(new StrategyLayer());
  const lastUserSpeechTimeRef = useRef(0);
  const processingTranscriptRef = useRef<string>(''); // Track which transcript we're processing
  const utteranceCountRef = useRef(0); // Track number of complete utterances
  const utteranceGraceTimerRef = useRef<NodeJS.Timeout | null>(null); // Grace period after UtteranceEnd
  const pendingUtteranceRef = useRef<{text: string; count: number} | null>(null); // Pending utterance during grace
  const queuedUtterancesRef = useRef<Array<{text: string; count: number}>>([]); // Queue multiple utterances if processing
  
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
    if (isProcessing) {
      // Queue this utterance to process after current one completes
      console.log(`⏸️ Already processing - queuing utterance #${utteranceSnapshot}`);
      queuedUtterancesRef.current.push({ text: userText, count: utteranceSnapshot });
      return;
    }
    
    // Clear any stale interrupt flag from previous utterances
    const wasInterrupted = wasInterruptedRef.current;
    wasInterruptedRef.current = false;
    
    setIsProcessing(true);
    const processingUtteranceCount = utteranceSnapshot;
    console.log(`📝 Processing user input: "${userText.substring(0, 50)}..." (utterance #${processingUtteranceCount})`);
    
    try {
      // Check transcript quality - detect garbled/poor STT
      const qualityCheck = TranscriptQualityDetector.assess(userText);
      
      if (qualityCheck.isLikelyGarbled) {
        console.log(`🔊 Poor transcript quality detected (${Math.round(qualityCheck.confidence * 100)}% confidence)`);
        console.log(`   Issues: ${qualityCheck.issues.join(', ')}`);
        console.log(`   Original: "${userText}"`);
        
        // Marcus didn't hear properly - use natural "can't hear you" response
        const clarificationResponses = [
          "Sorry, you cut out there. Can you say that again?",
          "I didn't catch that. Can you repeat it?",
          "Sorry, what was that? You broke up a bit.",
          "Can you repeat that? I missed it."
        ];
        
        const response = clarificationResponses[Math.floor(Math.random() * clarificationResponses.length)];
        
        console.log(`🎤 Marcus [confused]: "${response}"`);
        
        // Speak immediately - no AI processing needed
        await speakAsMarcus(response, {
          voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
          emotion: 'worried',
          speed: 0.75
        });
        
        lastMarcusSpeakTimeRef.current = Date.now();
        
        // Add to conversation history as clarification request
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', content: '[garbled audio]' },
          { role: 'assistant', content: response }
        ]);
        
        setIsProcessing(false);
        return;
      }
      
      const phaseManager = phaseManagerRef.current;
      const currentPhaseStr = phaseManager.getCurrentPhase();
      // Map string phase to number for StrategyLayer compatibility
      const phaseMap: Record<CharmerPhase, number> = { 'prospect': 1, 'coach': 2, 'exit': 3 };
      const currentPhaseNum = phaseMap[currentPhaseStr];
      const context = phaseManager.getContext();
      
      // Add user input to conversation history
      setConversationHistory(prev => [...prev, { role: 'user', content: userText }]);
      
      // Extract information from user's speech
      // Pass current name to allow corrections and utterance count to limit name extraction to introductions
      const extracted = CharmerContextExtractor.extractAll(userText, context.userName, processingUtteranceCount);
      
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
      
      // STRATEGY LAYER: Determine behavioral constraints before generating response
      const repQualitySignals = strategyLayerRef.current.analyzeRepQuality(userText, conversationHistory);
      
      const strategyContext: StrategyContext = {
        phase: currentPhaseNum,
        conversationHistory: conversationHistory,
        userInput: userText,
        repQualitySignals
      };
      
      const strategyConstraints = strategyLayerRef.current.determineStrategy(strategyContext);
      
      // Classify question for logging/analysis only - NO artificial delays
      // Response time comes from actual AI generation complexity, not fake waits
      const classification = QuestionClassifier.classify(userText);
      const strategy = QuestionClassifier.getResponseStrategy(classification);
      
      console.log(`🧠 Question classified: ${classification.questionType} (${classification.category})`);
      
      // Check if we have a speculative response ready
      let aiResponse;
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
            scenario: selectedScenario
          });
          
          // SAFETY: Check after generation completes
          if (utteranceCountRef.current !== processingUtteranceCount) {
            console.log('🚫 User started new utterance during fallback generation - scrapping response');
            setIsProcessing(false);
            return;
          }
        }
      } else {
        // Generate Marcus's response using AI with Strategy constraints
        aiResponse = await aiServiceRef.current.generateResponse({
          phase: currentPhaseStr,
          conversationContext: phaseManager.getContext(),
          userInput: userText,
          phasePromptContext: phaseManager.getPhasePromptContext(),
          conversationHistory: conversationHistory,
          scenario: selectedScenario,
          strategyConstraints: strategyConstraints
        });
        
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
      
      // Check if interrupted during speaking
      if (wasInterruptedRef.current) {
        console.log('🛑 Response interrupted during speaking');
        wasInterruptedRef.current = false;
        setIsProcessing(false);
        return;
      }
      
      // Track when Marcus finishes speaking (to filter echo)
      lastMarcusSpeakTimeRef.current = Date.now();
      console.log('✅ Marcus finished speaking');
      
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
      
      // Update context state
      setPhaseContext(phaseManager.getContext());
      
    } catch (error) {
      console.error('❌ Error processing user input:', error);
    } finally {
      setIsProcessing(false);
      
      // Process all queued utterances in order
      if (queuedUtterancesRef.current.length > 0) {
        const queued = queuedUtterancesRef.current.shift()!; // Get first queued item
        console.log(`▶️ Processing queued utterance #${queued.count} (${queuedUtterancesRef.current.length} remaining)`);
        // Small delay to allow state to settle
        setTimeout(() => {
          processUserInput(queued.text, queued.count);
        }, 100);
      }
    }
  }, [isProcessing, conversationHistory, transitionToPhase]);
  
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
      
      if (FirstUtterancePatternDetector.canUseInstantResponse(patternMatch.pattern)) {
        // Check for ultra-fast canned response (0ms - no LLM)
        const cannedResponse = FirstUtterancePatternDetector.getCannedResponse(patternMatch.pattern);
        
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
        speculativeResponseRef.current = aiServiceRef.current.generateResponse({
          phase: currentPhaseStr,
          conversationContext: phaseManager.getContext(),
          userInput: newContent,
          phasePromptContext: phaseManager.getPhasePromptContext(),
          conversationHistory: conversationHistory,
          scenario: selectedScenario
        }).catch(err => {
          console.log('⚠️ Speculative generation error:', err);
          speculativeResponseRef.current = null;
          throw err;
        });
      }
      // else: Keep waiting for more words to detect pattern
    }
    
    // CRITICAL FIX: Only PROCESS final transcripts (UtteranceEnd events)
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
      
      // EARLY DETECTION: Question patterns (used throughout pipeline)
      const endsWithQuestion = newContent.trim().endsWith('?');
      const isShortQuestion = newContent.length < 75 && endsWithQuestion;
      
      // Parse words for analysis
      const words = newContent.split(/\s+/);
      const wordCount = words.length;
      
      // Filter out likely echo (short phrases right after Marcus speaks)
      const timeSinceMarcusSpoke = Date.now() - lastMarcusSpeakTimeRef.current;
      if (timeSinceMarcusSpoke < 1000 && wordCount <= 2) {
        console.log(`🔇 Filtering likely echo: "${newContent}" (${timeSinceMarcusSpoke}ms after Marcus, ${wordCount} words)`);
        lastTranscriptRef.current = transcript;
        return;
      }
      
      // Process the complete utterance immediately
      utteranceCountRef.current++;
      const currentUtterance = utteranceCountRef.current;
      console.log(`📊 Utterance #${currentUtterance} complete (${wordCount} words)`);
      console.log(`🎙️ User speech: "${newContent}"`);
      processUserInput(newContent, currentUtterance);
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
          processUserInput(newContent, utteranceCountRef.current);
          lastTranscriptRef.current = transcriptSnapshot;
        }
      }, 1000);
      
      return;
    }
  }, [transcript, isFinalTranscript, isSpeaking, conversationHistory, selectedScenario, processUserInput, detectContinuationCue]);
  
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
        const greeting = "Hello?";
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
    if (isConnecting || isRinging) {
      console.log('⚠️ Already connecting/ringing, ignoring duplicate call');
      return;
    }
    
    // Clear any existing ring timeout
    if (ringTimeoutRef.current) {
      console.log('⚠️ Clearing existing ring timeout');
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    
    console.log(`🎯 Scenario selected: ${scenario.name} (${scenario.difficulty})`);
    setSelectedScenario(scenario);
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
    
    // Wait 15 seconds for phone to ring, THEN connect to Marcus
    const startTime = Date.now();
    console.log('📞 Phone ringing for 15 seconds...', new Date().toISOString());
    
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
    }, 15000);
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
    console.log('📵 Ending Marcus call');
    
    const duration = phaseManagerRef.current.getTotalDuration();
    console.log(`📊 Call duration calculated: ${duration} seconds`);
    
    // Get conversation transcript
    const transcript = conversationTrackerRef.current?.getTranscript();
    
    // Detect critical moments
    let momentPuzzles: any[] = [];
    let callSummary: any = null;
    
    if (transcript && conversationTrackerRef.current) {
      console.log('🔍 Analyzing conversation for critical moments...');
      
      const detector = new CriticalMomentDetector();
      const criticalMoments = detector.detectCriticalMoments(transcript);
      
      console.log(`✅ Found ${criticalMoments.length} critical moments`);
      
      // Generate puzzle-based feedback for moments
      if (criticalMoments.length > 0) {
        const feedbackGenerator = new MomentFeedbackGenerator();
        
        try {
          momentPuzzles = await feedbackGenerator.generateMomentPuzzles(criticalMoments);
          callSummary = await feedbackGenerator.generateCallSummary(
            criticalMoments,
            conversationHistory.length / 2,
            duration
          );
          console.log('✅ Generated moment-based feedback');
        } catch (error) {
          console.error('❌ Error generating feedback:', error);
        }
      }
    }
    
    // Build call data
    const callData = {
      sessionId: sessionIdRef.current,
      duration: duration,
      conversationHistory,
      momentPuzzles: momentPuzzles,
      callSummary: callSummary,
      metrics: {
        callDuration: duration,
        userSpeakingTime: Math.floor(duration * 0.5),
        marcusSpeakingTime: Math.floor(duration * 0.5),
        questions: [],
        openEndedCount: 0,
        followUpCount: 0,
        objections: [],
        objectionsRaised: 0,
        objectionsAddressed: 0,
        objectionsResolved: 0,
        totalExchanges: conversationHistory.length / 2,
        winCondition: 'not_yet' as const
      },
      phaseSummary: phaseManagerRef.current.getPhaseSummary(),
      finalContext: phaseManagerRef.current.getContext()
    };
    
    endCall();
    
    // Store feedback data and show UI
    setMomentFeedbackData({
      momentPuzzles,
      callSummary,
      duration
    });
    setShowMomentFeedback(true);
    
    if (onCallComplete) {
      onCallComplete(callData);
    }
    
    if (onCallEnd) {
      onCallEnd();
    }
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
   * Close moment feedback and return to scenario selector
   */
  const handleCloseMomentFeedback = useCallback(() => {
    setShowMomentFeedback(false);
    setMomentFeedbackData(null);
    setConversationHistory([]);
    utteranceCountRef.current = 0;
    lastTranscriptRef.current = '';
    setShowScenarioSelector(true);
    setSelectedScenario(null);
  }, []);
  
  return (
    <>
      {/* Scenario Selector */}
      {showScenarioSelector && (
        <MarcusChallengeLobby
          onStartChallenge={handleScenarioSelect}
          onCancel={onCallEnd}
        />
      )}
      
      {/* Moment-Based Feedback */}
      {showMomentFeedback && momentFeedbackData && (
        <MarcusPostCallMoments
          momentPuzzles={momentFeedbackData.momentPuzzles}
          callSummary={momentFeedbackData.callSummary}
          duration={momentFeedbackData.duration}
          onTryAgain={handleCloseMomentFeedback}
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

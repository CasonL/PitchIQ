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
    error,
    speakAsMarcus,
    isSpeaking
  } = useMarcusVoice();
  
  // Phase management
  const phaseManagerRef = useRef(new CharmerPhaseManager());
  const [currentPhase, setCurrentPhase] = useState<CharmerPhase>(1);
  const [phaseContext, setPhaseContext] = useState(phaseManagerRef.current.getContext());
  // AI service
  const aiServiceRef = useRef(new CharmerAIService());
  
  // Conversation state
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const lastTranscriptRef = useRef('');
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
  
  // Refs for tracking
  const sessionIdRef = useRef<string | null>(null);
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
    if (isProcessing) return;
    
    // Clear any stale interrupt flag from previous utterances
    const wasInterrupted = wasInterruptedRef.current;
    wasInterruptedRef.current = false;
    
    setIsProcessing(true);
    const processingUtteranceCount = utteranceSnapshot;
    console.log(`📝 Processing user input: "${userText.substring(0, 50)}..." (utterance #${processingUtteranceCount})`);
    
    try {
      const phaseManager = phaseManagerRef.current;
      const currentPhaseNum = phaseManager.getCurrentPhase();
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
      
      // In Phase 2, extract pitch analysis
      let forcePhase3Transition = false;
      if (currentPhaseNum === 2) {
        // Accumulate pitch transcript
        const updatedPitchTranscript = context.userPitchTranscript + ' ' + userText;
        phaseManager.updateContext({ userPitchTranscript: updatedPitchTranscript });
        
        // Detect if user is trying to end the call early (Marcus should intercept!)
        const userTryingToEnd = /\b(save you|save your time|let you go|gotta run|have a great day|hope you|thanks for your time|i'll let you|not a fit|wrong fit|different issue|completely different)\b/i.test(userText);
        
        if (userTryingToEnd) {
          console.log('🚨 User trying to end call - Marcus will intercept and transition to Phase 3!');
          forcePhase3Transition = true;
        }
        
        // If user has finished pitching (detected by length or pause), analyze
        if (updatedPitchTranscript.length > 150) {
          // Detect issues and strengths
          const issue = CharmerContextExtractor.pickOneIssue(extracted.detectedIssues);
          const strength = CharmerContextExtractor.pickOneStrength(extracted.strengths, updatedPitchTranscript);
          
          if (issue) {
            phaseManager.updateContext({ 
              identifiedIssue: issue.type,
              whatWorked: strength || 'You got through the core idea clearly'
            });
            console.log(`🎯 Analysis: Issue=${issue.type}, Strength=${strength}`);
          }
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
            phase: currentPhaseNum,
            conversationContext: phaseManager.getContext(),
            userInput: userText,
            phasePromptContext: phaseManager.getPhasePromptContext(),
            conversationHistory: conversationHistory
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
          phase: currentPhaseNum,
          conversationContext: phaseManager.getContext(),
          userInput: userText,
          phasePromptContext: phaseManager.getPhasePromptContext(),
          conversationHistory: conversationHistory,
          strategyConstraints: strategyConstraints
        });
        
        // SAFETY: Check if user started a new utterance during AI generation
        if (utteranceCountRef.current !== processingUtteranceCount) {
          console.log('🚫 User started new utterance during AI generation - scrapping response');
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
      // AI generation time already provides natural "thinking" pause
      console.log(`✅ [Judgment Gate] ${judgment.action.toUpperCase()} - proceeding immediately`);
      
      // TODO: Future enhancement - Multi-LLM Strategic Analysis Router
      // When JG detects complex strategic moments:
      // 1. Route to 3 LLM analysis pipeline (intent detection, red herrings, hidden paths)
      // 2. Background processing while handling simple rapport questions instantly
      // 3. Strategic guidance system to lead user toward hidden issues
      // 4. Puzzle-like experience with hints scattered throughout conversation
      
      // If user tried to end call, force Phase 3 transition
      if (forcePhase3Transition) {
        aiResponse.shouldTransitionPhase = true;
        aiResponse.nextPhase = 3;
      }
      
      // Add Marcus's response to history
      setConversationHistory(prev => [...prev, { role: 'assistant', content: aiResponse.content }]);
      console.log(`🎤 Marcus [${aiResponse.emotion}]: "${aiResponse.content}"`);
      
      // Dynamic speed based on phase (Phase 3 is more energetic)
      const speed = currentPhase === 3 ? 0.95 : 0.75;
      
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
        
        // Auto-speak Phase 3 opening line after transition from Phase 2
        if (currentPhaseNum === 2 && aiResponse.nextPhase === 3) {
          // Brief pause after transition
          await new Promise(resolve => setTimeout(resolve, 800));
          
          console.log('🎬 Auto-generating Phase 3 opening line');
          const phase3Opening = await aiServiceRef.current.generateResponse({
            phase: 3,
            conversationContext: phaseManagerRef.current.getContext(),
            userInput: '', // No user input, just opening
            phasePromptContext: phaseManagerRef.current.getPhasePromptContext(),
            conversationHistory: conversationHistory
          });
          
          setConversationHistory(prev => [...prev, { role: 'assistant', content: phase3Opening.content }]);
          console.log(`🎤 Marcus [${phase3Opening.emotion}]: "${phase3Opening.content}"`);
          
          await speakAsMarcus(phase3Opening.content, {
            voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
            emotion: phase3Opening.emotion,
            speed: 0.95 // Phase 3 is more energetic
          });
          
          lastMarcusSpeakTimeRef.current = Date.now();
        }
      }
      
      // Check for automatic phase transitions (NOW happens after Marcus actually finishes)
      const autoTransition = phaseManager.shouldAutoTransition();
      if (autoTransition.should && autoTransition.nextPhase) {
        console.log(`⏰ Auto-transitioning due to time`);
        
        // Natural pause before transitioning
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        transitionToPhase(autoTransition.nextPhase!);
        
        // Auto-speak Phase 3 opening line after auto-transition from Phase 2
        if (currentPhaseNum === 2 && autoTransition.nextPhase === 3) {
          // Brief pause after transition
          await new Promise(resolve => setTimeout(resolve, 800));
          
          console.log('🎬 Auto-generating Phase 3 opening line (auto-transition)');
          const phase3Opening = await aiServiceRef.current.generateResponse({
            phase: 3,
            conversationContext: phaseManagerRef.current.getContext(),
            userInput: '', // No user input, just opening
            phasePromptContext: phaseManagerRef.current.getPhasePromptContext(),
            conversationHistory: conversationHistory
          });
          
          setConversationHistory(prev => [...prev, { role: 'assistant', content: phase3Opening.content }]);
          console.log(`🎤 Marcus [${phase3Opening.emotion}]: "${phase3Opening.content}"`);
          
          await speakAsMarcus(phase3Opening.content, {
            voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
            emotion: phase3Opening.emotion,
            speed: 0.95
          });
          
          lastMarcusSpeakTimeRef.current = Date.now();
        }
      }
      
      // Update context state
      setPhaseContext(phaseManager.getContext());
      
    } catch (error) {
      console.error('❌ Error processing user input:', error);
    } finally {
      setIsProcessing(false);
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
    
    // Don't process user speech while Marcus is thinking (prevents queuing)
    // BUT ALLOW processing while Marcus is speaking (enables interruptions!)
    if (isProcessing) {
      console.log(`⏸️ Ignoring transcript while Marcus is thinking`);
      // Mark this transcript as seen so it doesn't get processed later
      lastTranscriptRef.current = transcript;
      return;
    }
    
    // Get new content
    const newContent = transcript.replace(lastTranscriptRef.current, '').trim();
    if (newContent && newContent.length > 3) {
      // Track user speech timing for Judgment Gate
      lastUserSpeechTimeRef.current = Date.now();
      
      // EARLY DETECTION: Question patterns (used throughout pipeline)
      const endsWithQuestion = newContent.trim().endsWith('?');
      const isShortQuestion = newContent.length < 75 && endsWithQuestion;
      
      // CRITICAL: If grace window is active and user continues speaking, RESET the timer
      // This prevents Marcus from cutting off multi-part thoughts
      if (utteranceGraceTimerRef.current && pendingUtteranceRef.current) {
        console.log(`👂 User continuing during grace window - resetting timer`);
        clearTimeout(utteranceGraceTimerRef.current);
        utteranceGraceTimerRef.current = null;
      }
      
      // Parse words for analysis
      const words = newContent.split(/\s+/);
      const wordCount = words.length;
      const lastWord = words[words.length - 1]?.toLowerCase().replace(/[.,!?;:]/g, '');
      
      // Filter out likely echo (short phrases right after Marcus speaks)
      const timeSinceMarcusSpoke = Date.now() - lastMarcusSpeakTimeRef.current;
      if (timeSinceMarcusSpoke < 2000 && wordCount < 5) {
        console.log(`🔇 Filtering likely echo: "${newContent}" (${timeSinceMarcusSpoke}ms after Marcus, ${wordCount} words)`);
        lastTranscriptRef.current = transcript;
        return;
      }
      
      // Classify question type for potential speculative generation
      const partialClassification = QuestionClassifier.classify(newContent);
      const partialStrategy = QuestionClassifier.getResponseStrategy(partialClassification);
      
      // Start speculative generation for instant/quick questions
      if (partialStrategy.shouldSpeculate && !speculativeResponseRef.current && !isSpeaking) {
        console.log(`🚀 Starting speculative generation for ${partialClassification.category} question: "${newContent}"`);
        lastClassificationRef.current = partialClassification;
        
        const phaseManager = phaseManagerRef.current;
        const currentPhaseNum = phaseManager.getCurrentPhase();
        
        speculativeResponseRef.current = aiServiceRef.current.generateResponse({
          phase: currentPhaseNum,
          conversationContext: phaseManager.getContext(),
          userInput: newContent,
          phasePromptContext: phaseManager.getPhasePromptContext(),
          conversationHistory: conversationHistory
        }).catch(err => {
          console.log('⚠️ Speculative generation error:', err);
          speculativeResponseRef.current = null;
          throw err;
        });
      }
      
      // Grammatical structure analysis for sentence completeness
      const completenessAnalysis = SentenceCompletenessAnalyzer.analyze(newContent);
      
      // SKIP incomplete sentence check if speculative generation already in progress
      // This prevents 2s delays on instant/quick questions
      if (speculativeResponseRef.current) {
        console.log(`⚡ Speculative response in progress - skipping incomplete sentence check for instant response`);
      } else if (!completenessAnalysis.isComplete && completenessAnalysis.confidence >= 0.5) {
        // HEURISTIC: Short questions are complete - skip wait
        if (isShortQuestion) {
          console.log(`⚡ Short question (${newContent.length} chars) - processing immediately despite incomplete detection`);
          // Process immediately, no wait
        } else {
          // Check if user is explicitly asking for time
          const normalizedContent = newContent.toLowerCase();
          const askingForTime = /hold on|give me a (sec|second|minute)|one (sec|second|minute)|just a (sec|second|minute)/.test(normalizedContent);
          const waitTime = askingForTime ? 10000 : 5000;
          
          console.log(`⏸️ Incomplete sentence detected: "${newContent.substring(0, 60)}..."`);
          console.log(`   Reason: ${completenessAnalysis.reason} (confidence: ${completenessAnalysis.confidence})`);
          console.log(`   Waiting ${waitTime/1000}s for continuation${askingForTime ? ' (user asked for time)' : ''}`);
          
          const transcriptSnapshot = transcript;
          const utteranceSnapshot = utteranceCountRef.current;
          
          // Wait to see if user continues
          setTimeout(() => {
            // If no new utterance started, process what we have
            if (utteranceCountRef.current === utteranceSnapshot) {
              console.log(`✅ No continuation after ${waitTime/1000}s - processing anyway`);
              
              // Increment utterance count for incomplete sentence that timed out
              utteranceCountRef.current++;
              const currentUtterance = utteranceCountRef.current;
              
              // NOTE: Don't set interrupt flag here - this is user continuing their own thought
              // Interrupt detection happens in processUserInput via utterance count checks
              
              processUserInput(newContent, currentUtterance);
              lastTranscriptRef.current = transcript;
            } else {
              console.log(`👂 User continued speaking - new utterance detected, skipping partial sentence`);
            }
          }, waitTime);
          
          return; // Don't process yet
        }
      }
      
      console.log(`✅ Sentence appears complete: ${completenessAnalysis.reason} (confidence: ${completenessAnalysis.confidence})`);

      // SKIP GRACE WINDOW if speculative generation in progress - instant response needed
      if (speculativeResponseRef.current) {
        console.log(`⚡ Speculative response ready - processing immediately (no grace window)`);
        utteranceCountRef.current++;
        const currentUtterance = utteranceCountRef.current;
        console.log(`📊 Utterance #${currentUtterance} complete`);
        console.log(`🎙️ User speech: "${newContent}"`);
        processUserInput(newContent, currentUtterance);
        lastTranscriptRef.current = transcript;
        return;
      }

      // SKIP GRACE WINDOW for questions - they're complete thoughts, no need to wait
      if (endsWithQuestion) {
        console.log(`⚡ Question detected - processing immediately (no grace window)`);
        utteranceCountRef.current++;
        const currentUtterance = utteranceCountRef.current;
        console.log(`📊 Utterance #${currentUtterance} complete`);
        console.log(`🎙️ User speech: "${newContent}"`);
        processUserInput(newContent, currentUtterance);
        lastTranscriptRef.current = transcript;
        return;
      }

      // GRACE WINDOW: Check if this looks like it might continue
      const hasContinuationCue = detectContinuationCue(newContent);
      const graceWindow = hasContinuationCue ? 1500 : 1000; // Allow natural pauses between thoughts
      
      if (hasContinuationCue) {
        console.log(`👂 Continuation cue detected ("${newContent.slice(-30)}") - extending grace to ${graceWindow}ms`);
      }
      
      // Clear any existing grace timer
      if (utteranceGraceTimerRef.current) {
        clearTimeout(utteranceGraceTimerRef.current);
      }
      
      // Store pending utterance
      const utteranceSnapshot = utteranceCountRef.current;
      pendingUtteranceRef.current = { text: newContent, count: utteranceSnapshot };
      
      console.log(`⏱️ Grace window: waiting ${graceWindow}ms to see if user continues...`);
      
      // Set grace timer
      utteranceGraceTimerRef.current = setTimeout(() => {
        // Check if grace timer was cleared (user continued speaking)
        if (!utteranceGraceTimerRef.current) {
          console.log(`👂 Grace window was reset - user is still speaking`);
          return;
        }
        
        // Check if utterance count changed (new utterance started)
        if (utteranceCountRef.current !== utteranceSnapshot) {
          console.log(`👂 User continued speaking during grace - merging utterances`);
          return;
        }
        
        // Grace period expired, no continuation - finalize this utterance
        console.log(`✅ Grace period complete - finalizing utterance`);
        
        // Increment utterance counter
        utteranceCountRef.current++;
        const currentUtterance = utteranceCountRef.current;
        console.log(`📊 Utterance #${currentUtterance} complete`);
        
        // NOTE: Don't set interrupt flag here - processUserInput handles interruption via utterance count
        // If Marcus is speaking, his generation will detect the new utterance and self-cancel
        
        // Complete sentence - process
        console.log(`🎙️ User speech: "${newContent}"`);
        
        processUserInput(newContent, currentUtterance);
        lastTranscriptRef.current = transcript;
        pendingUtteranceRef.current = null;
      }, graceWindow);
      
      return; // Don't process yet - wait for grace period
    } else {
      // No new content, just update ref
      lastTranscriptRef.current = transcript;
    }
  }, [transcript, processUserInput, isSpeaking, isProcessing]);
  
  /**
   * Handle Marcus's greeting when call connects
   */
  const hasGreetedRef = useRef(false);
  useEffect(() => {
    if (isConnected && !hasGreetedRef.current && conversationHistory.length === 0) {
      hasGreetedRef.current = true;
      console.log('👋 Marcus greeting: sending opening line');
      
      // Marcus's Phase 1 opening line (as if answering his phone)
      setTimeout(async () => {
        const greeting = "Marcus's Phone!!";
        console.log(`🎤 Marcus [happy]: "${greeting}"`);
        
        // Set echo protection BEFORE speaking to prevent microphone feedback
        lastMarcusSpeakTimeRef.current = Date.now();
        
        await speakAsMarcus(greeting, { 
          voiceId: '5ee9feff-1265-424a-9d7f-8e4d431a12c7',
          emotion: 'happy', // Upbeat, answering the phone
          speed: 0.75  // Slower, more deliberate delivery
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
   * Handle call start
   */
  const handleStartCall = useCallback(async () => {
    if (isConnecting) return;
    
    const sessionId = generateSessionId();
    sessionIdRef.current = sessionId;
    console.log(`📞 Starting Marcus call with session: ${sessionId}`);
    
    // Reset phase manager
    phaseManagerRef.current.reset();
    setCurrentPhase(1);
    setPhaseContext(phaseManagerRef.current.getContext());
    setConversationHistory([]);
    
    // Start the call (no persona parameter needed for new voice system)
    await startCall();
  }, [isConnecting, startCall, generateSessionId]);
  
  /**
   * Handle call end
   */
  const handleEndCall = useCallback(() => {
    console.log('📵 Ending Marcus call');
    
    const duration = phaseManagerRef.current.getTotalDuration();
    
    // Build CallMetrics for post-call feedback
    const metrics = {
      callDuration: duration,
      userSpeakingTime: Math.floor(duration * 0.5), // Estimated from conversation
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
    };
    
    // Get final call data
    const callData = {
      sessionId: sessionIdRef.current,
      duration: duration,
      metrics: metrics,
      phaseSummary: phaseManagerRef.current.getPhaseSummary(),
      finalContext: phaseManagerRef.current.getContext(),
      conversationHistory
    };
    
    endCall();
    
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
  
  return (
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
        
        {/* Call controls */}
        <div className="flex justify-center items-center gap-3 mb-8">
          {!isConnected && !isConnecting ? (
            <Button
              variant="outlined"
              onClick={handleStartCall}
              disabled={isConnecting}
              startIcon={<CallIcon />}
              sx={{
                bgcolor: 'white',
                border: '2px solid black',
                '&:hover': {
                  bgcolor: 'white',
                  border: '2px solid black',
                  transform: 'translateY(-2px)',
                },
                color: 'black',
                fontWeight: '600',
                fontSize: '1rem',
                py: 1.5,
                px: 5,
                borderRadius: 2,
                textTransform: 'none',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease',
              }}
            >
              Start Call with Marcus
            </Button>
          ) : (
            <>
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
            </>
          )}
        </div>
        
        {/* Loading indicator */}
        {isConnecting && (
          <div className="flex justify-center items-center gap-3 mb-6 p-6 bg-white rounded-xl border-2 border-gray-300">
            <CircularProgress size={24} sx={{ color: '#dc2626' }} />
            <span className="text-base text-gray-700 font-medium">
              Connecting to Marcus...
            </span>
          </div>
        )}
        
        {/* Connected - waiting for user */}
        {isConnected && conversationHistory.length === 0 && !isProcessing && (
          <div className="mb-6 p-6 bg-white rounded-xl border-2 border-gray-300 text-center">
            <p className="text-lg text-gray-900 font-semibold mb-2">
              🎤 Connected! Start the conversation
            </p>
            <p className="text-sm text-gray-600">
              Introduce yourself and your product to Marcus
            </p>
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

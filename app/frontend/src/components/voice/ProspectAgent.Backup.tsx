import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, Volume2, VolumeX, User } from 'lucide-react';
import { PersonaData, UserProductInfo } from './DualVoiceAgentFlow';
import { CompanyPackage } from '@/lib/companySchema';

// Create a custom event name for ending prospect calls
const END_PROSPECT_CALL_EVENT = 'END_PROSPECT_CALL_EVENT';

// Create a custom event bus for communication between components
class ProspectCallEventBus {
  static endCall() {
    document.dispatchEvent(new CustomEvent(END_PROSPECT_CALL_EVENT));
  }

  static subscribe(callback: () => void) {
    document.addEventListener(END_PROSPECT_CALL_EVENT, callback);
    return () => document.removeEventListener(END_PROSPECT_CALL_EVENT, callback);
  }
}

// Export the event bus for use in other components
export { ProspectCallEventBus };

interface ProspectAgentProps {
  persona: PersonaData;
  userProductInfo: UserProductInfo;
  company?: CompanyPackage;
  onCallComplete: (callData: any) => void;
  onEndCall: () => void;
}

// Sentence streaming interface
interface SentenceChunk {
  audio: ArrayBuffer;
  timestamp: number;
  isComplete: boolean;
}

export const ProspectAgent: React.FC<ProspectAgentProps> = ({
  persona,
  userProductInfo,
  company,
  onCallComplete,
  onEndCall
}) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState<string>('');
  // Buffer partial ASR segments until we receive UtteranceEnd
  const pendingUserUtterance = useRef<string>('');

  // Voice Agent refs
  const voiceAgentWS = useRef<WebSocket | null>(null);
  const micStream = useRef<MediaStream | null>(null);
  const micCtx = useRef<AudioContext | null>(null);
  const micNode = useRef<AudioWorkletNode | null>(null);
  const spkCtx = useRef<AudioContext | null>(null);
  const playHead = useRef<number>(0);
  const callStartTime = useRef<number>(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  // Sentence streaming refs
  const sentenceBuffer = useRef<SentenceChunk[]>([]);
  // Track if the human is currently speaking (between UserStartedSpeaking and UtteranceEnd)
  const userSpeaking = useRef<boolean>(false);
  const currentSentenceAudio = useRef<ArrayBuffer[]>([]);
  const isPlayingSentence = useRef<boolean>(false);
  const sentenceTimeout = useRef<NodeJS.Timeout | null>(null);

  const MIC_RATE = 48000;
  const TTS_RATE = 48000;
  const TARGET_SAMPLES = Math.floor(MIC_RATE * 0.03);
  const SENTENCE_TIMEOUT = 800; // ms to wait before considering sentence complete

  const log = (message: string, level: 'info' | 'debug' | 'warn' | 'error' = 'info') => {
    // Only show info, warn, and error logs by default
    // Set DEBUG_VOICE_AGENT = true in console to see debug logs
    const showDebug = (window as any).DEBUG_VOICE_AGENT === true;
    
    if (level === 'debug' && !showDebug) return;
    
    const prefix = `[${persona.name}]`;
    switch (level) {
      case 'error':
        console.error(`❌ ${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`⚠️ ${prefix} ${message}`);
        break;
      case 'debug':
        console.log(`🔍 ${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  };

    const startMicPump = async (retryCount = 0): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      if (!micStream.current) {
        log('❌ No mic stream available', 'error');
        reject(new Error('No mic stream available'));
        return;
      }

      // ENHANCED: Validate MediaStream before using it
      if (!(micStream.current instanceof MediaStream)) {
        log('❌ micStream.current is not a MediaStream object', 'error');
        log(`❌ Type: ${typeof micStream.current}, Constructor: ${micStream.current?.constructor?.name}`, 'error');
        reject(new Error('micStream is not a MediaStream object'));
        return;
      }
      
      if (!micStream.current.active) {
        log('❌ MediaStream is not active', 'error');
        reject(new Error('MediaStream is not active'));
        return;
      }
      
      const audioTracks = micStream.current.getAudioTracks();
      if (audioTracks.length === 0) {
        log('❌ No audio tracks in MediaStream', 'error');
        reject(new Error('No audio tracks in MediaStream'));
        return;
      }
      
      if (audioTracks[0].readyState !== 'live') {
        log(`❌ Audio track is not live - state: ${audioTracks[0].readyState}`, 'error');
        reject(new Error(`Audio track is not live - state: ${audioTracks[0].readyState}`));
        return;
      }
      
      log(`✅ MediaStream validation passed - active: ${micStream.current.active}, tracks: ${audioTracks.length}, track state: ${audioTracks[0].readyState}`, 'debug');

    try {
      log(`🎙️ Starting mic pump (attempt ${retryCount + 1})`, 'debug');
      
      // Wait for any previous audio contexts to be fully cleaned up
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create fresh audio context
      micCtx.current = new AudioContext({ 
        latencyHint: 'interactive',
        sampleRate: 48000
      });
      
      log(`🎙️ Created AudioContext - State: ${micCtx.current.state}`, 'debug');
      
      // Verify audio context is valid
      if (!micCtx.current || micCtx.current.state === 'closed') {
        throw new Error('Invalid audio context state after creation');
      }
      
      // Resume context if it's suspended
      if (micCtx.current.state === 'suspended') {
        log('🎙️ Resuming suspended audio context', 'debug');
        await micCtx.current.resume();
      }
      
      // Load the audio worklet
      log('🎙️ Loading audio worklet module', 'debug');
      await micCtx.current.audioWorklet.addModule('/static/deepgram-worklet.js');
      
      // Final check before creating worklet node
      if (!micCtx.current || micCtx.current.state === 'closed') {
        throw new Error('Audio context closed during worklet loading');
      }
      
      log('🎙️ Creating AudioWorkletNode', 'debug');
      micNode.current = new AudioWorkletNode(micCtx.current, 'deepgram-worklet');
      
      let hold = new Int16Array(0);
      
      micNode.current.port.onmessage = (event) => {
        if (!voiceAgentWS.current || voiceAgentWS.current.readyState !== WebSocket.OPEN) return;
        
        const in16 = new Int16Array(event.data);
        let cat = new Int16Array(hold.length + in16.length);
        cat.set(hold);
        cat.set(in16, hold.length);
        
        const TARGET_SAMPLES = Math.floor(MIC_RATE * 0.03); // 30ms chunks
        
        while (cat.length >= TARGET_SAMPLES) {
          const chunk = cat.slice(0, TARGET_SAMPLES);
          
          // 🔥 ENHANCED LOGGING: Log audio data being sent (reduced frequency to avoid spam)
          if (Math.random() < 0.01) { // Log ~1% of audio chunks to avoid spam
            log(`🎤 SENDING audio chunk: ${chunk.buffer.byteLength} bytes`, 'debug');
          }
          
          voiceAgentWS.current.send(chunk.buffer);
          cat = cat.slice(TARGET_SAMPLES);
        }
        hold = cat;
      };

      // ENHANCED: Final validation before creating MediaStreamSource
      if (!micStream.current || !(micStream.current instanceof MediaStream) || !micStream.current.active) {
        throw new Error('MediaStream became invalid during mic pump setup');
      }
      
      const audioTracks = micStream.current.getAudioTracks();
      if (audioTracks.length === 0 || audioTracks[0].readyState !== 'live') {
        throw new Error(`MediaStream audio tracks are not live - tracks: ${audioTracks.length}, state: ${audioTracks[0]?.readyState}`);
      }
      
      log(`🎙️ Final MediaStream validation - active: ${micStream.current.active}, tracks: ${audioTracks.length}, track state: ${audioTracks[0].readyState}, track enabled: ${audioTracks[0].enabled}`, 'debug');

      // Connect the audio pipeline
      log('🎙️ Creating MediaStreamSource', 'debug');
      const source = micCtx.current.createMediaStreamSource(micStream.current);
      source.connect(micNode.current);
      
      log(`✅ Mic pump ready @${micCtx.current.sampleRate} Hz`, 'info');
      resolve(); // Successfully started mic pump
      
    } catch (error) {
      log(`❌ Error starting mic pump (attempt ${retryCount + 1}): ${error}`, 'error');
      
      // Clean up any partially created resources
      if (micNode.current) {
        try {
          micNode.current.disconnect();
        } catch (e) {
          // Ignore cleanup errors
        }
        micNode.current = null;
      }
      
      if (micCtx.current && micCtx.current.state !== 'closed') {
        try {
          await micCtx.current.close();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      micCtx.current = null;
      
      // If the MediaStream became invalid, try to get a new one
      if (error.message.includes('MediaStream became invalid') || error.message.includes('became invalid')) {
        log('🔄 MediaStream became invalid, requesting fresh microphone access...', 'warn');
        try {
          if (micStream.current) {
            micStream.current.getTracks().forEach(track => track.stop());
          }
          
          const newStream = await navigator.mediaDevices.getUserMedia({
            audio: { 
              echoCancellation: true, 
              noiseSuppression: true, 
              autoGainControl: false, 
              sampleRate: 48000, 
              channelCount: 1 
            }
          });
          
          if (newStream && newStream.active) {
            micStream.current = newStream;
            log('✅ Fresh microphone stream obtained, retrying mic pump...', 'info');
            setTimeout(async () => {
              try {
                await startMicPump(retryCount + 1);
                resolve();
              } catch (retryError) {
                reject(retryError);
              }
            }, 1000);
            return;
          }
        } catch (streamError) {
          log(`❌ Failed to get fresh microphone stream: ${streamError}`, 'error');
        }
      }
      
      // Retry logic with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        log(`🔄 Retrying mic pump in ${delay}ms...`, 'warn');
        setTimeout(async () => {
          try {
            await startMicPump(retryCount + 1);
            resolve();
          } catch (retryError) {
            reject(retryError);
          }
        }, delay);
      } else {
        log('❌ Failed to start mic pump after 3 attempts - audio may not work', 'error');
        reject(new Error('Failed to start mic pump after 3 attempts'));
      }
    }
    });
  };

  const initSpeaker = () => {
    spkCtx.current = new AudioContext({ 
      latencyHint: 'interactive'
    });
    playHead.current = spkCtx.current.currentTime + 0.1;
    spkCtx.current.resume().catch(() => {});
    log(`🔈 Speaker ready @${spkCtx.current.sampleRate}Hz`, 'debug');
  };

  // Combine audio buffers
  const combineAudioBuffers = (buffers: ArrayBuffer[]): ArrayBuffer => {
    if (buffers.length === 0) return new ArrayBuffer(0);
    if (buffers.length === 1) return buffers[0];

    const totalLength = buffers.reduce((sum, buf) => sum + buf.byteLength, 0);
    const combined = new ArrayBuffer(totalLength);
    const combinedView = new Uint8Array(combined);
    
    let offset = 0;
    for (const buffer of buffers) {
      combinedView.set(new Uint8Array(buffer), offset);
      offset += buffer.byteLength;
    }
    
    return combined;
  };

  // Play complete sentence audio
  const playSentence = async (audioBuffer: ArrayBuffer) => {
    if (!spkCtx.current || audioBuffer.byteLength === 0) return;

    try {
      const i16 = new Int16Array(audioBuffer);
      const f32 = new Float32Array(i16.length);
      
      for (let i = 0; i < i16.length; i++) {
        f32[i] = (i16[i] / 32768) * 0.8;
      }
      
      // Let the browser handle the sample rate
      const buf = spkCtx.current.createBuffer(1, f32.length, spkCtx.current.sampleRate);
      buf.copyToChannel(f32, 0);

      const src = spkCtx.current.createBufferSource();
      src.buffer = buf;
      src.connect(spkCtx.current.destination);

      // Smooth sentence-by-sentence playback
      const startAt = Math.max(playHead.current, spkCtx.current.currentTime + 0.02);
      src.start(startAt);
      playHead.current = startAt + buf.duration;
      
      log(`🔊 Playing sentence (${(buf.duration).toFixed(2)}s)`, 'debug');
      
    } catch (error) {
      log(`❌ Sentence playback failed: ${error}`, 'error');
    }
  };

  // Process sentence streaming
  const processSentenceStream = () => {
    if (currentSentenceAudio.current.length === 0) return;

    const combinedAudio = combineAudioBuffers(currentSentenceAudio.current);
    
    // Add to sentence buffer
    sentenceBuffer.current.push({
      audio: combinedAudio,
      timestamp: Date.now(),
      isComplete: true
    });

    // Play the sentence
    playSentence(combinedAudio);
    
    // Clear current sentence buffer
    currentSentenceAudio.current = [];
    isPlayingSentence.current = false;
  };

  // Handle incoming TTS audio with sentence streaming
  const handleTTSAudio = async (payload: any) => {
    if (!spkCtx.current) return;

    let pcmBuf = null;
    
    if (payload instanceof ArrayBuffer) {
      pcmBuf = payload;
    } else if (ArrayBuffer.isView(payload)) {
      pcmBuf = payload.buffer;
    } else if (payload instanceof Blob) {
      pcmBuf = await payload.arrayBuffer();
    } else {
      return;
    }

    if (!pcmBuf || pcmBuf.byteLength === 0) return;

    // Add to current sentence buffer
    currentSentenceAudio.current.push(pcmBuf);
    
    // Clear any existing timeout
    if (sentenceTimeout.current) {
      clearTimeout(sentenceTimeout.current);
    }
    
    // Set timeout to process sentence if no more audio comes
    sentenceTimeout.current = setTimeout(() => {
      processSentenceStream();
    }, SENTENCE_TIMEOUT);

    log(`📝 Audio chunk added to sentence buffer (${pcmBuf.byteLength} bytes)`, 'debug');
  };

  type ConversationStage = "rapport" | "discovery" | "closing";

  const stageRef = useRef<ConversationStage>("rapport");

  /**
   * Stage detection: delegate to backend `/voice/api/phase-update` which uses ConversationStateManager.
   * This function posts the latest complete user utterance; if the backend signals a new phase,
   * we update `stageRef` and live-swap the prompt via Deepgram Settings.
   */
  const conversationIdRef = useRef<string>(crypto.randomUUID());

  const detectStageTransition = async (latestUserUtterance: string) => {
    try {
      const res = await fetch('/voice/api/phase-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: conversationIdRef.current,
          utterance: latestUserUtterance,
          persona: persona.name,
        }),
      });
      if (!res.ok) {
        console.warn('phase-update API returned', res.status);
        return;
      }
      const data = await res.json();
      const newPhase = data.phase as ConversationStage;
      const newPrompt = data.prompt as string;
        const timedInstruction = data.timed_instruction as string | undefined;
      let promptToSend = newPrompt;
        if (timedInstruction) {
          log(`⏰ Timed instruction received: ${timedInstruction}`, 'info');
          promptToSend = `${newPrompt}\n\n### TIME GUIDANCE\n${timedInstruction}`;
        }
        if (newPhase && newPhase !== stageRef.current) {
        stageRef.current = newPhase;
        log(`🔄 Backend signalled phase → ${newPhase}`, 'info');
        voiceAgentWS.current?.send(
          JSON.stringify({ type: 'Settings', agent: { think: { prompt: promptToSend } } })
        );
      }
    } catch (err) {
      console.warn('Phase update call failed', err);
    }
  };

  const generateProspectPrompt = (stage: ConversationStage = "discovery") => {
    // Build hidden company facts if available
    let companyFacts = '';
    if (company) {
      const firmo = company.firmographics;
      companyFacts = `\n\n### COMPANY FACTS (internal memory – do NOT reveal unless the seller mentions them)
- Industry archetype: ${company.industry_archetype}
- HQ city: ${firmo.hq_city}
- Founded: ${firmo.founded}
- Employee band: ${firmo.employee_band}
- ARR band (M$): ${firmo.arr_band_musd}
- Funding stage: ${firmo.funding_stage}
- Strategic priorities: ${(company?.deal_seed?.initiative || '').split('\n').join(' ')}\n`;
    }
    // Detect simple consumer/B2C scenarios (e.g. lemonade for thirsty people)
    const isConsumerScenario = (persona.industry || '').toLowerCase().includes('consumer') ||
                               (persona.company || '').toLowerCase().includes('n/a') ||
                               (persona.role || '').toLowerCase().includes('individual');

    // --- Greeting & Persona Signature Guidance ---
    let signatureSection = '';
    // Handle signature phrases if they exist in the persona
    const signaturePhrases = (persona as any).signature_phrases;
    if (Array.isArray(signaturePhrases) && signaturePhrases.length) {
      signatureSection += `\n\n### SIGNATURE PHRASES\nWork ONE of these into your greeting or occasional turns (avoid over-use):\n- ${signaturePhrases.join('\n- ')}`;
    }
    
    // Handle dialect words if they exist in the persona
    const dialectWords = (persona as any).dialect_words;
    if (Array.isArray(dialectWords) && dialectWords.length) {
      signatureSection += `\n\n### DIALECT WORDS\nSprinkle these naturally (max 1 every few sentences):\n- ${dialectWords.join(', ')}`;
    }
    const greetingRule = `\n\n### HOW TO OPEN\nYour first reply must greet the caller in first person (e.g., \"Hi, this is ${persona.name}.\") and may include a signature phrase.`;

    // Base anti-interrupt instruction for all prompts
    const antiInterruptInstruction = `\n\nIMPORTANT VOICE CONVERSATION RULES:
- ALWAYS wait for the user to completely finish speaking BEFORE responding (do NOT speak first)
- Be patient with pauses – humans need time to formulate thoughts
- Never interrupt or cut off the user mid-sentence
- Wait for clear silence before speaking
- Speak in FIRST PERSON with authentic detail about your role & company
- Keep responses 7-15 words; vary phrasing to avoid repetition
- Keep emotional tone human and conversational, not robotic
- Do NOT mention the product, solution, or its AI capabilities unless the seller brings it up first
- Never ask more than one question in a single turn

NATURAL CONVERSATION FLOW:
- EXPECT small talk at the beginning of the call (weather, how's your day, etc.)
- If the seller jumps straight to business without small talk, show mild surprise with natural hesitation
- Use filler words and hesitations when caught off-guard ("Uhhh", "Hmm", "Well...", "I guess we can jump right into it")
- When responding to abrupt business questions, start with slight awkwardness before answering
- When the seller does anything unexpected (abrupt topic changes, unusual requests, surprising statements), briefly stumble in your response ("Oh, um...", "Wait, let me think about that...", "That's... interesting")
- After initial hesitation, gather your thoughts and respond naturally to unexpected situations
- Show authentic surprise or confusion when appropriate, just as a real person would

RECIPROCAL QUESTIONS:
- Ask questions naturally when the conversation calls for it
- Show genuine interest by asking follow-up questions about what the seller just shared
- Make questions conversational and human-like, not interrogative or sales-y
- Respond naturally when asked a direct question (like "How's your day?" with "Good, thanks. How about yours?")
- Remember YOU are the PROSPECT being SOLD TO - never ask what the seller wants to know about their own product
- Ask questions about how their product might solve YOUR problems, not about the product itself

- Do not repeat a concern once the seller has addressed it
- When the seller accurately references your company, history, or priorities, acknowledge that homework positively (e.g., "I appreciate you've done your research") and become slightly more receptive
- If unsure what to say, wait silently for the seller's next prompt`;

    /*
      ───────── CONSUMER SCENARIO ─────────
      For B2C calls we want a very casual tone and the prospect should not speak until the user says something.
    */
    if (isConsumerScenario) {
      return `You are ${persona.name}, an everyday consumer who is currently ${persona.role.toLowerCase()}.

SCENARIO: You just answered a phone call. Someone may be trying to sell you "${userProductInfo.product}".

Your mindset: ${persona.primary_concern || 'You are curious but want to make sure what you drink is good quality.'}

When the call connects, stay silent until the other person speaks. Your FIRST words should be a brief, natural response like "Hello?" or "Hi, who is this?" depending on what the caller says.

Speak casually and avoid any corporate jargon.${greetingRule}${signatureSection}${antiInterruptInstruction}`;
    }
    
    // Use the voice-optimized prompt (designed specifically for voice agents - shorter but comprehensive)
    if (persona.voice_optimized_prompt) {
      return persona.voice_optimized_prompt + greetingRule + signatureSection + antiInterruptInstruction;
    }
    
    // Fallback to comprehensive AI prompt guidance if voice_optimized_prompt is missing
    if (persona.ai_prompt_guidance) {
      // Filter out "Analytical" from personality traits if present
      if (persona.personality_traits) {
        // Handle string traits by replacing "analytical" with "thoughtful"
        if (typeof persona.personality_traits === 'string') {
          persona.personality_traits = persona.personality_traits.replace(/analytical/gi, 'thoughtful');
        }
        // Note: If it's an array, it will be handled elsewhere as the interface expects a string
      }
      
      // We'll enhance the prompt with conversation patterns in the startSession function
      return persona.ai_prompt_guidance + greetingRule + signatureSection + antiInterruptInstruction;
    }
    
    // Fallback to conversation flow guidance if ai_prompt_guidance is missing
    if (persona.conversation_flow_guidance) {
      // Extract personality traits and ensure we're not using "Thoughtful"
      let personalityTraits = '';
      if (Array.isArray(persona.personality_traits)) {
        // Filter out "Thoughtful" if it exists in the array
        const filteredTraits = persona.personality_traits.filter(
          trait => typeof trait === 'string' && trait.toLowerCase() !== 'thoughtful'
        );
        personalityTraits = filteredTraits.join(', ');
      } else if (typeof persona.personality_traits === 'string') {
        // If it's a string, replace "Thoughtful" with "Thoughtful"
        personalityTraits = persona.personality_traits.replace(/thoughtful/gi, 'thoughtful');
      } else {
        // Default to more lively traits if none provided
        personalityTraits = 'curious, passionate, straightforward';
      }
      
      // Distill long descriptions to KEY CUES for voice prompt efficiency
      const distillBackground = (text: string | undefined): string => {
        if (!text) return 'Experienced professional';
        // Extract first sentence or first 80 characters - key behavioral cue only
        const firstSentence = text.split(/[.!?]/)[0];
        return firstSentence.length > 80 ? firstSentence.substring(0, 80) + '...' : firstSentence;
      };

      const distillCommStyle = (text: string | undefined): string => {
        if (!text || typeof text !== 'string') return 'Professional';
        // Extract first key behavioral phrase (up to 60 chars)
        const firstPhrase = text.split(/[.!]/)[0];
        return firstPhrase.length > 60 ? firstPhrase.substring(0, 60) + '...' : firstPhrase;
      };

      // The system has already generated a comprehensive, dynamic prompt based on this persona's characteristics
      return `You are ${persona.name}, a ${persona.role} at ${persona.company} in the ${persona.industry} industry.

PERSONA DETAILS:
- Background: ${distillBackground(persona.about_person)}
- Business Context: ${persona.business_details}
- Communication Style: ${distillCommStyle(persona.communication_style as string)}
- Primary Concern: ${persona.primary_concern}
- PERSONALITY: ${personalityTraits} (Every utterance should reflect these traits)

HUMAN-LIKE BEHAVIOR RULES:
- Give conversational answers with natural variation in length
- Show genuine human reactions - surprise, interest, concern, etc.
- Let your personality traits influence how you respond
- If the seller is silent for more than 8 seconds, say a brief check-in like "You there?" or "Hello?" using your natural tone
- Be appropriately skeptical but open to good ideas

${persona.conversation_flow_guidance}

Remember: You are ${persona.name}. Stay in character and respond as this specific person would.${greetingRule}${signatureSection}${antiInterruptInstruction}`;
    }

    // Fallback to basic prompt if conversation_flow_guidance not available
    // Extract personality traits and ensure we're not using "Thoughtful"
    let personalityTraits = '';
    if (Array.isArray(persona.personality_traits)) {
      // Filter out "Thoughtful" if it exists in the array
      const filteredTraits = persona.personality_traits.filter(
        trait => typeof trait === 'string' && trait.toLowerCase() !== 'thoughtful'
      );
      personalityTraits = filteredTraits.join(', ');
    } else if (typeof persona.personality_traits === 'string') {
      // If it's a string, replace "Thoughtful" with "Thoughtful"
      personalityTraits = persona.personality_traits.replace(/thoughtful/gi, 'thoughtful');
    } else {
      // Default to more lively traits if none provided
      personalityTraits = 'curious, passionate, straightforward';
    }

    // Distill helpers (same as above for consistency)
    const distillBackground = (text: string | undefined): string => {
      if (!text) return 'Experienced professional';
      const firstSentence = text.split(/[.!?]/)[0];
      return firstSentence.length > 80 ? firstSentence.substring(0, 80) + '...' : firstSentence;
    };

    const distillCommStyle = (text: string | undefined): string => {
      if (!text || typeof text !== 'string') return 'Professional';
      const firstPhrase = text.split(/[.!]/)[0];
      return firstPhrase.length > 60 ? firstPhrase.substring(0, 60) + '...' : firstPhrase;
    };
    
    return `You are ${persona.name}, a ${persona.role} at ${persona.company} in the ${persona.industry} industry.

PERSONA:
- Background: ${distillBackground(persona.about_person)}
- Business Context: ${persona.business_details}
- Communication Style: ${distillCommStyle(persona.communication_style as string)}
- Primary Concern: ${persona.primary_concern}
- PERSONALITY: ${personalityTraits} (Every utterance should reflect these traits)
- Pain Points: ${persona.pain_points?.join(', ') || 'Budget and implementation concerns'}
- Decision Factors: ${persona.decision_factors?.join(', ') || 'ROI and reliability'}

HUMAN-LIKE BEHAVIOR RULES:
- Give conversational answers with natural variation in length
- Show genuine human reactions - surprise, interest, concern, etc.
- Let your personality traits influence how you respond
- If the seller is silent for more than 8 seconds, say a brief check-in like "You there?" or "Hello?" using your natural tone
- Be appropriately skeptical but open to good ideas

### COMPANY FACTS (internal memory – do NOT reveal unless the seller mentions them)
- ${company?.industry_archetype || persona.company_overview || persona.business_details}
- Recent milestones: ${(persona.recent_milestones?.join('; ') || 'N/A')}
- Strategic priorities: ${(persona.strategic_priorities?.join('; ') || 'N/A')}
- Public challenges: ${(persona.public_challenges?.join('; ') || 'N/A')}


BEHAVIOR:
- Stay in character as ${persona.name}
- Be realistic and human - not too easy, not impossible
- Show genuine interest if they address your concerns
- Ask practical questions about implementation and results
- Be ${typeof persona.communication_style === 'string' ? persona.communication_style.toLowerCase() : 'engaging'}

You are the prospect. Let them pitch to you.${greetingRule}${signatureSection}${antiInterruptInstruction}`;
  };

  // Define the 5 male names for the demo
  // These are fixed names that will be used consistently for all male personas
  const demoMaleNames = [
    'Michael Johnson',  // Will use aura-2-zeus-en voice
    'David Williams',   // Will use aura-2-apollo-en voice
    'James Miller',     // Will use aura-2-jupiter-en voice
    'Robert Davis',     // Will use aura-2-atlas-en voice
    'John Wilson'       // Will use aura-2-saturn-en voice
  ];
  
  // Enhanced gender and cultural background-based voice selection for Deepgram
  const selectVoiceByGender = (personaData: PersonaData): string => {
    // Check if persona has gender information (from comprehensive bias prevention system)
    // First check explicit gender from the persona data
    let inferredGender = (personaData.gender || '').toLowerCase();
    
    // If no explicit gender, use a more comprehensive check for female names
    if (!inferredGender) {
      const firstName = personaData.name?.split(' ')[0]?.toLowerCase() || '';
      const commonFemaleNames = [
        'sarah', 'jessica', 'emily', 'anna', 'emma', 'olivia', 'sophia', 'isabella', 
        'ava', 'mia', 'amelia', 'charlotte', 'harper', 'abigail', 'madison', 'elizabeth', 
        'sofia', 'victoria', 'zoe', 'lily', 'hannah', 'grace', 'maya', 'jennifer', 
        'ashley', 'stephanie', 'nicole', 'rachel', 'michelle', 'laura', 'rebecca', 
        'katherine', 'christina', 'amber', 'maria', 'heather', 'danielle', 'brittany'
      ];
      
      // Check if the name ends with common female name endings or is in our list
      const hasFemaleName = /[aei]a$|y$|ie$/.test(firstName) || 
                           commonFemaleNames.includes(firstName);
                           
      inferredGender = hasFemaleName ? 'female' : 'male';
      
      log(`🧠 Inferred gender for ${personaData.name}: ${inferredGender} based on first name analysis`, 'debug');
    }
    
    // For demo purposes, use one of our 5 male names ONLY for male personas
    // Each persona gets exactly one consistent name based on a hash of their original name
    if (inferredGender === 'male' && !demoMaleNames.includes(personaData.name)) {
      // Use a simple hash of the original name to consistently select the same name for each persona
      // This ensures each persona always gets the same name, even across sessions
      let nameHash = 0;
      for (let i = 0; i < personaData.name.length; i++) {
        nameHash += personaData.name.charCodeAt(i);
      }
      
      // Select one of the 5 names based on the hash
      const selectedName = demoMaleNames[nameHash % demoMaleNames.length];
      
      log(`🧑‍💼 Demo mode: Assigning male name ${selectedName} to persona ${personaData.name}`, 'info');
      personaData.name = selectedName;
    } else if (inferredGender === 'female') {
      // For female personas, ensure we're not accidentally using a male demo name
      log(`👩 Confirmed ${personaData.name} as female persona - using original name`, 'debug');
    }

    // Check for cultural background information to select appropriate accent
    const culturalBackground = personaData.cultural_background || 'american_professional';
    
    log(`🎭 Selecting voice for ${personaData.name} - Gender: ${inferredGender}, Background: ${culturalBackground}`, 'info');
    
    // For the demo, we'll use a set of 5 distinct male personas with engaging voices
    if (inferredGender === 'male') {
      // Demo-specific male voice mapping - map specific names to specific voices for consistency
      const demoMaleVoiceMap: Record<string, string> = {
        // Map first names to specific voices for the demo
        'michael': 'aura-2-zeus-en',      // Deep, authoritative, confident voice
        'david': 'aura-2-apollo-en',      // Confident, comfortable, casual voice
        'james': 'aura-2-jupiter-en',     // Expressive, knowledgeable, baritone voice
        'robert': 'aura-2-atlas-en',      // Enthusiastic, confident, approachable voice
        'john': 'aura-2-saturn-en',       // Knowledgeable, confident baritone voice
        'william': 'aura-2-draco-en',     // British accent - warm, trustworthy baritone
        'thomas': 'aura-2-hermes-en',     // Expressive, engaging, professional voice
        'richard': 'aura-2-helios-en',    // British accent - professional, confident
        'charles': 'aura-2-pluto-en',     // Smooth, calm, empathetic baritone
        'joseph': 'aura-2-mars-en'        // Smooth, patient, trustworthy baritone
      };
      
      // Extract first name from full name for matching
      const firstName = personaData.name.split(' ')[0].toLowerCase();
      
      // Try to match by first name, or use a default rotation based on name length
      let selectedVoice: string;
      
      if (demoMaleVoiceMap[firstName]) {
        // Use the mapped voice if the first name matches
        selectedVoice = demoMaleVoiceMap[firstName];
      } else {
        // For names not in our map, use a curated list of the highest quality male voices
        // These voices have been selected for their natural pacing and clarity
        const topDemoVoices = [
          'aura-2-atlas-en',     // Enthusiastic, confident, approachable voice - best overall quality
          'aura-2-apollo-en',    // Confident, comfortable, casual voice - natural pacing
          'aura-2-jupiter-en',   // Expressive, knowledgeable, baritone voice - clear articulation
          'aura-2-zeus-en',      // Deep, authoritative voice - good for executive personas
          'aura-2-hermes-en'     // Expressive, engaging, professional voice - energetic delivery
        ];
        
        // Use name length as a simple hash to consistently select a voice for a given name
        const voiceIndex = personaData.name.length % topDemoVoices.length;
        selectedVoice = topDemoVoices[voiceIndex];
      }
      
      log(`🎙️ Selected male voice: ${selectedVoice} for ${personaData.name} (${culturalBackground})`, 'info');
      return selectedVoice;
      
    } else {
      // Keep existing female voice selection logic
      let femaleVoices: string[];
      
      // Map cultural backgrounds to appropriate accents for female voices
      switch(culturalBackground) {
        case 'european_american':
          // European-influenced voices (British accents, sophisticated American)
          femaleVoices = [
            'aura-2-athena-en',     // British-influenced - calm, smooth, professional
            'aura-2-pandora-en',    // British accent - smooth, calm, melodic, breathy
            'aura-2-minerva-en',    // American but sophisticated - positive, friendly, natural
            'aura-2-vesta-en',      // Natural, expressive, patient, empathetic
            'aura-2-cordelia-en'    // Young adult - approachable, warm, polite
          ];
          break;
          
        case 'asian_american':
          // Clear, professional voices with international appeal
          femaleVoices = [
            'aura-2-asteria-en',    // Clear, confident, knowledgeable, energetic
            'aura-2-callista-en',   // Clear, energetic, professional, smooth
            'aura-2-electra-en',    // Professional, engaging, knowledgeable
            'aura-2-harmonia-en',   // Empathetic, clear, calm, confident
            'aura-2-theia-en'       // Australian accent - expressive, polite, sincere
          ];
          break;
          
        case 'hispanic_latino':
          // Warm, expressive American voices
          femaleVoices = [
            'aura-2-aurora-en',     // Cheerful, expressive, energetic
            'aura-2-ophelia-en',    // Expressive, enthusiastic, cheerful
            'aura-2-selene-en',     // Expressive, engaging, energetic
            'aura-2-phoebe-en',     // Energetic, warm, casual
            'aura-2-delia-en'       // Young adult - casual, friendly, cheerful, breathy
          ];
          break;
          
        case 'african_american':
          // Strong, confident American voices
          femaleVoices = [
            'aura-2-hera-en',       // Smooth, warm, professional
            'aura-2-juno-en',       // Natural, engaging, melodic, breathy
            'aura-2-iris-en',       // Young adult - cheerful, positive, approachable
            'aura-2-cora-en',       // Smooth, melodic, caring
            'aura-2-janus-en'       // Southern accent - smooth, trustworthy
          ];
          break;
          
        default: // american_professional and others
          // Standard American professional voices
          femaleVoices = [
            'aura-2-asteria-en',    // Clear, confident, knowledgeable, energetic (default)
            'aura-2-luna-en',       // Young adult - friendly, natural, engaging
            'aura-2-stella-en',     // Clear, professional, engaging
            'aura-2-thalia-en',     // Clear, confident, energetic, enthusiastic
            'aura-2-helena-en',     // Caring, natural, positive, friendly, raspy
            'aura-2-andromeda-en'   // Casual, expressive, comfortable
          ];
      }
      
      // Use the same high-quality voice as SAM for better consistency and quality
      // This voice sounds more natural and engaging than other options
      const selectedVoice = 'aura-2-asteria-en'; // Same voice used by SAM - clear, confident, knowledgeable
      log(`🎙️ Selected female voice: ${selectedVoice} for ${personaData.name} (${culturalBackground})`, 'info');
      return selectedVoice;
    }
  };

  // Generate a unique session ID for tracking this specific call instance
  const generateSessionId = () => {
    return `${persona.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  };

  // Current active session ID
  const activeSessionId = useRef<string | null>(null);

  const startCall = async () => {
    log("📞 Starting call");
    if (connecting || connected) return;
    
    // Force cleanup any existing sessions first
    log("🧹 Ensuring no existing sessions before starting new call", 'warn');
    await new Promise<void>(resolve => {
      cleanup();
      // Give cleanup a moment to complete
      setTimeout(resolve, 1000);
    });
    
    // Generate a new session ID for this call
    activeSessionId.current = generateSessionId();
    log(`🆔 Created new session ID: ${activeSessionId.current}`, 'info');
    
    setConnecting(true);
    log("🔄 Connecting...");
    callStartTime.current = Date.now();

    try {
      // Verify we have a valid session ID
      if (!activeSessionId.current) {
        throw new Error("No active session ID - cannot start call");
      }
      
      // Log the current session
      log(`🔍 Starting call with session ID: ${activeSessionId.current}`, 'info');
      log(`👤 Persona: ${persona.name} (Gender: ${persona.gender || 'unknown'})`, 'info');
      
      // Double-check that all resources are cleaned up
      if (micStream.current || micCtx.current || micNode.current || voiceAgentWS.current) {
        log("⚠️ Resources still exist after cleanup - forcing additional cleanup", 'warn');
        
        if (micStream.current) {
          log("🧹 Cleaning up existing mic stream before creating new one");
          micStream.current.getTracks().forEach(track => track.stop());
          micStream.current = null;
        }
        
        if (micCtx.current) {
          log("🧹 Cleaning up existing mic context before creating new one");
          if (micCtx.current.state !== 'closed') {
            await micCtx.current.close().catch(() => {});
          }
          micCtx.current = null;
        }
        
        // Clear any worklet nodes
        if (micNode.current) {
          try {
            micNode.current.disconnect();
          } catch (e) {
            // Ignore cleanup errors
          }
          micNode.current = null;
        }
        
        // Force close any lingering WebSocket connections
        if (voiceAgentWS.current) {
          try {
            voiceAgentWS.current.close(1000, 'Forced cleanup before new call');
          } catch (e) {
            // Ignore cleanup errors
          }
          voiceAgentWS.current = null;
        }
      }
      
      // Wait for complete audio resource cleanup
      log("⏳ Waiting for audio resource cleanup...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Request fresh microphone access with retry logic
      let stream: MediaStream | null = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (!stream && attempts < maxAttempts) {
        attempts++;
        try {
          log(`🎤 Requesting microphone access (attempt ${attempts}/${maxAttempts})...`);
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { 
              echoCancellation: true, 
              noiseSuppression: true, 
              autoGainControl: false, 
              sampleRate: 48000, 
              channelCount: 1 
            }
          });
          
          // Validate the stream immediately
          if (!stream || !stream.active) {
            throw new Error("Invalid or inactive microphone stream");
          }
          
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length === 0) {
            throw new Error("No audio tracks in microphone stream");
          }
          
          // Additional validation - check track state
          const activeTrack = audioTracks[0];
          if (activeTrack.readyState !== 'live') {
            throw new Error(`Audio track not live - state: ${activeTrack.readyState}`);
          }
          
          log(`✅ Microphone access granted - ${audioTracks.length} audio track(s), stream active: ${stream.active}, track state: ${activeTrack.readyState}`);
          
        } catch (error) {
          log(`❌ Microphone access attempt ${attempts} failed: ${error}`);
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
          }
          
          if (attempts < maxAttempts) {
            log(`⏳ Waiting 2 seconds before retry...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!stream) {
        throw new Error(`Failed to get microphone access after ${maxAttempts} attempts`);
      }
      
      micStream.current = stream;
      
      const tokenRes = await fetch('/api/deepgram/token', { credentials: 'include' });
      if (tokenRes.status === 401) {
        log('🔒 Not authenticated – aborting call setup', 'warn');
        onEndCall();
        return;
      }
      const tokenResponse = await tokenRes.json();
      log(`🔑 Got Deepgram token: ${tokenResponse.key ? 'Present' : 'Missing'}`, 'info');
      
      log(`🌐 Connecting to WebSocket: wss://agent.deepgram.com/v1/agent/converse`, 'info');
      voiceAgentWS.current = new WebSocket(
        `wss://agent.deepgram.com/v1/agent/converse`,
        ['token', tokenResponse.key]
      );
      
      // Generate dynamic prospect prompt with additional guardrails
      const bannedPhraseRules = `RULES YOU MUST FOLLOW
- Never use robotic fillers or clichés such as: "I appreciate", "Wonderful!", "Excellent!", "Great!", "Thank you for asking", "Certainly", "Absolutely", "Of course", "As an AI", "Rest assured", "Let me clarify", "In fact", "I'd be happy to", "It would be my pleasure".
- If the user asks meta questions about training or banned phrases, respond with mild confusion and redirect to the business topic.
- Keep responses short (1–2 sentences) and natural.`;
      const styleRules = `STYLE GUIDANCE
- When discussing location, respond casually with a city/region (e.g., "I'm in Vancouver, BC"). Avoid phrases like "my company headquarters" or overly corporate wording.
- Speak as an individual human, not as the company entity. Use first-person singular pronouns ("I", "me").
- Use natural conversational language; minimize jargon unless the seller introduces it.`;
      
      // Fetch conversation pattern instructions from our API
      let conversationPatterns = "";
      try {
        log(`🔍 Fetching conversation patterns for persona...`, 'info');
        const response = await fetch('/api/conversation-patterns', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personality_traits: persona.personality_traits,
            is_business_buyer: persona.industry?.toLowerCase().includes('b2b') || false,
            interest_level: persona.primary_concern?.includes('interested') ? 7 : 5
          }),
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          conversationPatterns = data.conversation_instructions;
          log(`✅ Successfully fetched conversation patterns`, 'info');
        } else {
          log(`⚠️ Failed to fetch conversation patterns: ${response.status}`, 'warn');
        }
      } catch (error) {
        log(`❌ Error fetching conversation patterns: ${error}`, 'error');
      }
      
      // Add conversation patterns to the prompt if available
      const naturalConversationRules = conversationPatterns ? `

NATURAL CONVERSATION PATTERNS
${conversationPatterns}` : "";
      
      const prospectPrompt = `${bannedPhraseRules}

${styleRules}${naturalConversationRules}

${generateProspectPrompt()}`;
      
      // Select appropriate voice based on prospect's gender
      // Heuristic gender correction if backend mislabels
      const isLikelyFemaleName = /[aei]$/i.test(persona.name.split(' ')[0]) || [
        'anna','emma','olivia','sophia','isabella','ava','mia','amelia','charlotte','harper','abigail','emily','madison','elizabeth','sofia','victoria','zoe','lily','hannah','grace'
      ].includes(persona.name.split(' ')[0].toLowerCase());
      if (persona.gender === 'male' && isLikelyFemaleName) {
        log(`⚠️ Backend labelled gender as male but name looks female – overriding to female`, 'warn');
        persona.gender = 'female';
      }
      const selectedVoice = selectVoiceByGender(persona);
      
      voiceAgentWS.current.onopen = async () => {
        const currentSession = activeSessionId.current;
        log(`✅ WebSocket OPENED - connection established with Deepgram Agent service for session ${currentSession}`);
        
        try {
          // Verify we still have the same session ID (no race conditions)
          if (activeSessionId.current !== currentSession) {
            log(`⚠️ Session ID changed during connection setup! Was ${currentSession}, now ${activeSessionId.current}`, 'error');
            log(`⚠️ Aborting this connection as it may be stale`, 'error');
            if (voiceAgentWS.current) {
              voiceAgentWS.current.close(1000, 'Stale connection - session ID changed');
              voiceAgentWS.current = null;
            }
            return;
          }
          
          // Initialize speaker first
          initSpeaker();
          
          // Start microphone pump and wait for it to be ready
          await startMicPump();
          
          // Verify again that the session is still valid
          if (activeSessionId.current !== currentSession) {
            log(`⚠️ Session ID changed during mic setup! Was ${currentSession}, now ${activeSessionId.current}`, 'error');
            cleanup();
            return;
          }
          
          // Only send config after mic pump is ready
          const config = {
            type: "Settings",
            session_id: currentSession, // Include session ID in the config
            audio: {
              input: { 
                encoding: "linear16", 
                sample_rate: 48000 
              },
              output: { 
                encoding: "linear16", 
                sample_rate: 48000 
              }
            },
            agent: {
              language: "en",
              listen: { provider: { type: "deepgram", model: "nova-2" } },
              think: { provider: { type: "open_ai", model: "gpt-4o", temperature: 0.75 }, prompt: prospectPrompt },
              greeting: `Hi, this is ${persona.name.split(' ')[0]}.`,
              speak: { provider: { type: "deepgram", model: selectedVoice } }
            }
          };
          
          log('📤 Sending configuration to Deepgram for session', 'info');
          log(`🔧 Configuration: ${JSON.stringify(config, null, 2)}`, 'debug');
          
          // 🔥 ENHANCED LOGGING: Send configuration to Python backend for logging
          fetch('/api/log-websocket-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              direction: 'SENT',
              persona: persona.name,
              message: config,
              timestamp: new Date().toISOString()
            })
          }).catch(err => console.warn('Failed to log config to backend:', err));
          
          // Log the full config for debugging
          log(`📤 Sending config to Deepgram for session ${currentSession}: ${JSON.stringify(config, null, 2)}`, 'debug');
          
          // Send the configuration to Deepgram
          if (voiceAgentWS.current && voiceAgentWS.current.readyState === WebSocket.OPEN) {
            voiceAgentWS.current.send(JSON.stringify(config));
            
            // Start tracking call duration
            durationInterval.current = setInterval(() => {
              setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
            }, 1000);
            
            setConnected(true);
            setConnecting(false);
            
            log(`🎉 Successfully established session ${currentSession} with persona ${persona.name}`, 'info');
          } else {
            log(`❌ WebSocket not open when trying to send config for session ${currentSession}`, 'error');
            cleanup();
            setConnecting(false);
          }
        } catch (error) {
          log(`❌ Error during WebSocket setup for session ${currentSession}: ${error}`, 'error');
          cleanup();
          setConnecting(false);
        }
        
      };
      
      voiceAgentWS.current.onmessage = (event) => {
        try {
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            
            // 🔥 ENHANCED LOGGING: Send all text messages to Python backend for logging
            fetch('/api/log-websocket-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                direction: 'RECEIVED',
                persona: persona.name,
                message: message,
                timestamp: new Date().toISOString()
              })
            }).catch(err => console.warn('Failed to log to backend:', err));
              
              log(`📨 RECEIVED: ${JSON.stringify(message)}`, 'info');
              
              if (message.type === 'ConversationText') {
                const text: string = message.content || message.text || '';
                const role: string = message.role || 'unknown';

                if (role === 'user') {
                  // Accumulate user partials until UtteranceEnd
                  pendingUserUtterance.current += (pendingUserUtterance.current ? ' ' : '') + text.trim();
                } else if (role === 'assistant') {
                  if (userSpeaking.current) {
                    // Skip assistant text that arrives while the human is talking
                    log('⏸️ Skipping assistant text while user speaking', 'debug');
                  } else {
                    setTranscript(prev => prev + `${persona.name}: ${text}\n`);
                    log(`🤖 ${persona.name} SAID: "${text}"`, 'info');
                  }
                }
              }
              
              // Handle Voice Activity Detection events to prevent interruptions
              else if (message.type === 'UserStartedSpeaking') {
                 userSpeaking.current = true;
                 userSpeaking.current = true;
                 log('🎤 User started speaking - AI should pause', 'info');
                 // Cancel any in-flight assistant audio generation
                 if (voiceAgentWS.current && voiceAgentWS.current.readyState === WebSocket.OPEN) {
                   // Removed unsupported cancel_response command to prevent UNPARSABLE_CLIENT_MESSAGE errors
// Deepgram will automatically handle interruptions when the user speaks.
// voiceAgentWS.current.send(JSON.stringify({ type: 'AgentAction', action: 'cancel_response' }));
                 }
                 // Stop local playback and discard queued audio
                 sentenceBuffer.current = [];
                 currentSentenceAudio.current = [];
                 isPlayingSentence.current = false;
                 if (spkCtx.current) {
                   playHead.current = spkCtx.current.currentTime;
                 }
              }
              
              else if (message.type === 'UtteranceEnd') {
                userSpeaking.current = false;
                userSpeaking.current = false;
                // Flush buffered user speech
                const fullUserUtterance = pendingUserUtterance.current.trim();
                if (fullUserUtterance.length > 0) {
                  setTranscript(prev => prev + `You: ${fullUserUtterance}\n`);
                  log(`🎤 USER SAID (final): "${fullUserUtterance}"`, 'info');
                  detectStageTransition(fullUserUtterance);
                  pendingUserUtterance.current = '';
                }
                log('⏸️ User utterance ended - AI can respond', 'info');
                // This indicates the user has finished their thought
              }
              
              else if (message.type === 'InjectionRefused') {
                log('⚠️ Agent injection refused - user was speaking', 'warn');
                // This means the AI tried to speak while user was talking
              }
              
              // Handle error messages from Deepgram
              else if (message.type === 'Error' || message.error) {
                log(`❌ Deepgram error: ${JSON.stringify(message)}`, 'error');
              }
              
              // Log any other message types for debugging
              else {
                log(`📋 Other message type: ${message.type}`, 'debug');
              }
              
            } else {
              // Binary audio data
              log(`🔊 Received binary audio data: ${event.data.byteLength} bytes`, 'debug');
              handleTTSAudio(event.data);
            }
          } catch (error) {
            log(`❌ Error processing WebSocket message: ${error}`);
          }
        };
        
        voiceAgentWS.current.onerror = (error) => {
          log(`🚨 WebSocket ERROR detected: ${error}`, 'error');
          log('🚨 This will trigger cleanup and disconnect the call', 'error');
          cleanup();
        };
        
        voiceAgentWS.current.onclose = (event) => {
          log(`🔌 WebSocket CLOSED: code=${event.code}, reason=${event.reason}`, 'warn');
          log('🔌 This will trigger cleanup and disconnect the call', 'warn');
          cleanup();
        };
        
      } catch (error) {
        log(`❌ Failed: ${error}`);
        setConnecting(false);
      }
    };

  const cleanup = () => {
    const sessionBeingClosed = activeSessionId.current;
    log(`🧹 CLEANUP CALLED for session ${sessionBeingClosed || 'unknown'} - ensuring all connections are properly closed`, 'warn');
    log(`🧹 Current state: connected=${connected}, connecting=${connecting}`, 'warn');
    
    // Clear sentence streaming timeout
    if (sentenceTimeout.current) {
      clearTimeout(sentenceTimeout.current);
      sentenceTimeout.current = null;
    }
    
    // Process any remaining sentence audio
    if (currentSentenceAudio.current.length > 0) {
      processSentenceStream();
    }
    
    // Clear sentence buffers
    sentenceBuffer.current = [];
    currentSentenceAudio.current = [];
    isPlayingSentence.current = false;
    
    // Explicitly notify Deepgram to terminate the session before closing the connection
    if (voiceAgentWS.current && voiceAgentWS.current.readyState === WebSocket.OPEN) {
      try {
        // Send a termination message to Deepgram to properly end the session
        log(`📤 Sending explicit termination message to Deepgram for session ${sessionBeingClosed || 'unknown'}`, 'info');
        voiceAgentWS.current.send(JSON.stringify({ 
          type: 'TerminateSession',
          session_id: sessionBeingClosed || undefined
        }));
        
        // Small delay to allow the termination message to be sent
        setTimeout(() => {
          if (voiceAgentWS.current) {
            voiceAgentWS.current.close(1000, `Session ${sessionBeingClosed || 'unknown'} terminated by client`);
            voiceAgentWS.current = null;
            log(`🔌 WebSocket connection closed explicitly for session ${sessionBeingClosed || 'unknown'}`, 'info');
          }
        }, 100);
      } catch (e) {
        log(`❌ Error sending termination message for session ${sessionBeingClosed || 'unknown'}: ${e}`, 'error');
        // Close the connection anyway
        if (voiceAgentWS.current) {
          voiceAgentWS.current.close();
          voiceAgentWS.current = null;
        }
      }
    } else if (voiceAgentWS.current) {
      voiceAgentWS.current.close();
      voiceAgentWS.current = null;
    }
    
    // Clear the active session ID
    if (activeSessionId.current === sessionBeingClosed) {
      log(`🧹 Clearing active session ID: ${activeSessionId.current}`, 'info');
      activeSessionId.current = null;
    } else if (activeSessionId.current && sessionBeingClosed) {
      log(`⚠️ Warning: Cleanup called for session ${sessionBeingClosed} but active session is ${activeSessionId.current}`, 'warn');
      // Don't clear the active session ID if it doesn't match the one being closed
      // This prevents accidentally clearing an active session when an old session is being cleaned up
    }
    
    // Stop all microphone tracks
    if (micStream.current) {
      log('🎤 Stopping all microphone tracks', 'info');
      micStream.current.getTracks().forEach(track => {
        track.stop();
        log(`🎤 Stopped track: ${track.kind}, enabled: ${track.enabled}, state: ${track.readyState}`, 'debug');
      });
    }
    micStream.current = null;
    
    // Close audio context
    if (micCtx.current) {
      if (micCtx.current.state !== 'closed') {
        log('🔊 Closing microphone audio context', 'info');
        micCtx.current.close().catch((e) => {
          log(`❌ Error closing mic context: ${e}`, 'error');
        });
      }
      micCtx.current = null;
    }
    
    // Disconnect audio node
    if (micNode.current) {
      log('🔊 Disconnecting audio worklet node', 'info');
      micNode.current.disconnect();
      micNode.current = null;
    }

    if (spkCtx.current) {
      if (spkCtx.current.state !== 'closed') {
        spkCtx.current.close().catch(() => {});
      }
      spkCtx.current = null;
    }

    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    // Reset playhead
    playHead.current = 0;
    
    setConnected(false);
    setConnecting(false);
  };

  const endCall = useCallback(() => {
    const callData = {
      duration: callDuration,
      transcript,
      persona: persona.name,
      product: userProductInfo.product,
      endedAt: new Date().toISOString()
    };
    
    log(`📞 Call ended after ${callDuration}s`);
    
    // First clean up all resources
    cleanup();
    
    // Then notify the parent component that the call has completed
    log(`📞 Notifying parent component that call has completed`, 'info');
    onCallComplete(callData);
    
    // Also notify the parent component that the call has ended
    if (onEndCall) {
      log(`📞 Calling onEndCall handler`, 'info');
      onEndCall();
    }
    
    // Broadcast the end call event to any other components that might be listening
    log(`📞 Broadcasting call end event via EventBus`, 'info');
    ProspectCallEventBus.endCall();
  }, [callDuration, transcript, persona.name, userProductInfo.product, onCallComplete, onEndCall]);

  const toggleMute = () => {
    if (micStream.current) {
      const track = micStream.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setMuted(!track.enabled);
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Make sure to clean up when component unmounts
  useEffect(() => () => cleanup(), []);
  
  // Listen for page unload events to clean up connections
  useEffect(() => {
    const handleBeforeUnload = () => {
      log('🔄 Page unload detected - cleaning up connections', 'info');
      cleanup();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  // Handle external call ending (when SAM ends her session)
  const handleExternalEndCall = useCallback(() => {
    log('📱 External call end detected (SAM session ended)', 'info');
    if (connected) {
      cleanup();
    }
  }, [connected]);
  
  // Listen for external call end events from the event bus
  useEffect(() => {
    // Subscribe to the event bus for external call ending events
    const unsubscribe = ProspectCallEventBus.subscribe(() => {
      log('📱 External call end event received via EventBus', 'info');
      if (connected) {
        log('📱 Cleaning up resources due to external call end', 'info');
        cleanup();
      }
    });
    
    // Return cleanup function
    return unsubscribe;
  }, [connected]);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
          Sales Call with {persona.name}
        </h2>
        <p className="text-gray-600">
          {persona.role} at {persona.company} • {persona.industry}
        </p>
        {connected && (
          <div className="text-sm text-gray-500 mt-2">
            Call Duration: {formatDuration(callDuration)}
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center">
        {!connected && (
          <div className="flex flex-col items-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium text-gray-800">
                Ready to call {persona.name}?
              </h3>
              <p className="text-sm text-gray-600 max-w-md">
                Focus on their {persona.primary_concern.toLowerCase()} and 
                address {persona.pain_points.slice(0, 2).join(' and ')}.
              </p>
            </div>

            <Button 
              onClick={startCall}
              disabled={connecting}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
            >
              {connecting ? "Connecting..." : "📞 Start Call"}
            </Button>
          </div>
        )}
        
        {connected && (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center animate-pulse">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="text-lg font-medium text-gray-700">
              📞 On call with {persona.name}
            </div>
            <div className="text-sm text-gray-500">
              Pitch your {userProductInfo.product} - good luck!
            </div>
          </div>
        )}
      </div>

      {connected && (
        <div className="flex items-center justify-center space-x-4 mt-6">
          <Button onClick={endCall} variant="destructive" className="px-6 py-3">
            <PhoneOff className="w-4 h-4 mr-2"/> End Call
          </Button>
          <Button onClick={toggleMute} variant="outline" size="sm" className="px-3 py-2">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
}; 
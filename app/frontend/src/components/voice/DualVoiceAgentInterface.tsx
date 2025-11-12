import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { createClient } from "@deepgram/sdk";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/context/AuthContext";
import { useUser } from "@/components/common/UserDetailsGate";
import { useSamCoachAgent, SamCoachDataPayload } from "./samcoach/useSamCoachAgent";

// Polyfill for Deepgram SDK
if (typeof window !== "undefined" && !(window as any).Buffer) {
  import("buffer").then(({ Buffer }) => {
    (window as any).Buffer = Buffer;
  });
}

const SAMPLE_RATE = 48000;
const KEEPALIVE_MS = 8000;

interface Transcript {
  sender: "user" | "agent";
  text: string;
  timestamp: number;
}

interface GeneratedPersona {
  name: string;
  role: string;
  primary_concern: string;
  business_details: string;
  about_person: string;
  business_context?: string;
  emotional_state?: string;
  pain_points?: string[];
  decision_authority?: string;
  personality_traits?: any;
  objections?: string[];
  industry_context?: string;
}

interface Props {
  scenario: {
    persona: GeneratedPersona;
    userProduct: string;
  } | null;
  onSessionStart?: () => void;
  onConversationProgressed?: (question?: string, personaData?: GeneratedPersona) => void;
  onConnectionChange?: (connected: boolean, disconnectFn?: () => void) => void;
  activeAgent?: 'coach' | 'persona';
  generatedPersona?: GeneratedPersona | null;
  roleplayStarted?: boolean;
}

type ConversationStage = 'greeting' | 'product_question' | 'target_question' | 'awaiting_confirmation' | 'persona_generation';

interface ConversationData {
  product_service: string;
  target_market: string;
  persona_generated: boolean;
  conversation_stage: ConversationStage;
}

export const DualVoiceAgentInterface: React.FC<Props> = ({ 
  scenario, 
  onSessionStart, 
  onConversationProgressed, 
  onConnectionChange,
  activeAgent = 'coach',
  generatedPersona,
  roleplayStarted
}) => {
  const { toast } = useToast();
  const { user } = useAuthContext();
  const userDetails = useUser();

  // Get user's first name for personalization
  const getUserName = useCallback(() => {
    // Debug: Log what we have
    console.log('🔍 getUserName debug:', { userDetails, user });
    
    // 1. Check if user filled out pronunciation field
    if (userDetails?.firstNamePronunciation?.trim()) {
      console.log('✅ Using pronunciation:', userDetails.firstNamePronunciation.trim());
      return userDetails.firstNamePronunciation.trim();
    }
    
    // 2. Fall back to first word of full name
    const fullName = userDetails?.fullName?.trim();
    if (fullName) {
      const firstName = fullName.split(' ')[0];
      console.log('✅ Using first name from full name:', firstName);
      return firstName;
    }
    
    // 3. Final fallback to email prefix or 'there'
    const emailName = user?.email?.split('@')[0];
    const fallback = emailName || 'there';
    console.log('✅ Using fallback:', fallback);
    return fallback;
  }, [userDetails, user]);

  /* ––––– STATE ––––– */
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [conversationData, setConversationData] = useState<ConversationData>({
    product_service: '',
    target_market: '',
    persona_generated: false,
    conversation_stage: 'greeting'
  });
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [currentUserResponse, setCurrentUserResponse] = useState('');
  const [cleanupInProgress, setCleanupInProgress] = useState(false);
  const [muted, setMuted] = useState(false);

  // USE THE WORKING SAM COACH AGENT HOOK
  const { 
    messages: samMessages,
    transcript: samTranscript,
    connected: samConnected,
    connecting: samConnecting 
  } = useSamCoachAgent({
    onDataCollected: (data: SamCoachDataPayload) => {
      console.log("✅ Sam collected data:", data);
      setConversationData({
        product_service: data.product_service,
        target_market: data.target_market,
        persona_generated: false,
        conversation_stage: 'persona_generation'
      });
      
      // Generate persona
      setIsGeneratingPersona(true);
      fetch("/api/personas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_or_service: data.product_service,
          target_market: data.target_market
        })
      }).then(res => res.json())
        .then((result) => {
          if (result.persona) {
            onConversationProgressed?.("Persona Generated", result.persona);
          }
        })
        .finally(() => setIsGeneratingPersona(false));
    },
    onConnectionStateChange: (state) => {
      setConnected(state.connected);
      setConnecting(state.connecting);
      onConnectionChange?.(state.connected);
    },
    autoStart: true,
    logPrefix: "Sam"
  });

  /* ––––– REFS ––––– */
  const dgClientRef = useRef<ReturnType<typeof createClient> | null>(null);
  const agentRef = useRef<any>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const speakerCtxRef = useRef<AudioContext | null>(null);
  const keepAliveId = useRef<number | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  
  let playHead = 0;

  /* ––––– HELPERS ––––– */
  const log = (msg: string, ...extra: unknown[]) => {
    // Smart logging - only show critical events
    const skipPatterns = [
      '🔉 DG audio',
      '🔊 Scheduled TTS', 
      '🎙️ Mic chunk',
      '🔍 Low RMS debug',
      '📤 Sent',
      '📤 sent',
      '🎤 Worklet message',
      '🎤 Raw float samples'
    ];
    
    // Skip repetitive/noisy logs
    if (skipPatterns.some(pattern => msg.includes(pattern))) {
      return;
    }
    
    // Only log these important events
    const importantPatterns = [
      '🔧', '✅', '❌', '⚠️', // Setup/status
      '📡 DG → UserStarted', '📡 DG → ConversationText', // Speech events
      '📡 DG → AgentThinking', '📡 DG → AgentStarted', // Agent events
      '🎙️ Mic →', // Mic setup complete
      '🎤 Track', // Mic track info
      '🌐 WebSocket', // Connection
      'Settings applied' // Config
    ];
    
    if (importantPatterns.some(pattern => msg.includes(pattern))) {
      console.log(`[DG‑UI ${new Date().toLocaleTimeString()}]`, msg, ...extra);
    }
  };

  // Proper agent teardown with event listener cleanup
  const teardownAgent = useCallback((agent: any) => {
    if (!agent) return;
    
    try {
      // Remove event listeners if supported
      if (typeof agent.off === 'function') {
        agent.off();
        log("✅ Event listeners removed");
      }
      
      // Finish the agent
      if (typeof agent.finish === 'function') {
        agent.finish();
        log("✅ Agent finished");
      }
      
      // Close the agent
      if (typeof agent.close === 'function') {
        agent.close();
        log("✅ Agent closed");
      }
      
    } catch (error) {
      log("⚠️ Error during agent teardown:", error);
    }
  }, []);

  // Complete cleanup function with proper sequencing
  const completeCleanup = useCallback(async () => {
    if (cleanupInProgress) {
      log("⚠️ Cleanup already in progress, skipping");
      return;
    }
    
    setCleanupInProgress(true);
    log("🧹 Starting complete cleanup...");
    
    try {
      // Stop keepalive first
      if (keepAliveId.current) {
        clearInterval(keepAliveId.current);
        keepAliveId.current = null;
        log("✅ Keepalive cleared");
      }
      
      // Teardown agent with proper event cleanup
      if (agentRef.current) {
        teardownAgent(agentRef.current);
        agentRef.current = null;
      }
      
      // Disconnect worklet
      if (workletNodeRef.current) {
        try {
          workletNodeRef.current.disconnect();
          workletNodeRef.current = null;
          log("✅ Worklet disconnected");
        } catch (error) {
          log("⚠️ Error disconnecting worklet:", error);
        }
      }
      
      // Stop microphone stream
      if (micStreamRef.current) {
        try {
          micStreamRef.current.getTracks().forEach(track => {
            track.stop();
            log(`✅ Stopped track: ${track.kind}`);
          });
          micStreamRef.current = null;
          log("✅ Microphone stream stopped");
        } catch (error) {
          log("⚠️ Error stopping mic stream:", error);
        }
      }
      
      // Close audio contexts
      if (ctxRef.current && ctxRef.current.state !== 'closed') {
        try {
          await ctxRef.current.close();
          ctxRef.current = null;
          log("✅ Microphone context closed");
        } catch (error) {
          log("⚠️ Error closing microphone context:", error);
        }
      }
      
      if (speakerCtxRef.current && speakerCtxRef.current.state !== 'closed') {
        try {
          await speakerCtxRef.current.close();
          speakerCtxRef.current = null;
          log("✅ Speaker context closed");
        } catch (error) {
          log("⚠️ Error closing speaker context:", error);
        }
      }
      
      // Reset state
      setConnected(false);
      setConnecting(false);
      
      log("✅ Complete cleanup finished");
    } finally {
      setCleanupInProgress(false);
    }
  }, [cleanupInProgress, teardownAgent]);

  // Process conversation for persona generation
  const processConversation = useCallback(async (userText: string, agentText: string) => {
    try {
      log("🔄 Processing conversation:", { userText, agentText, currentStage: conversationData.conversation_stage });
      
      // Handle user responses
      if (userText) {
        setCurrentUserResponse(prev => {
          const newResponse = prev ? `${prev} ${userText}`.trim() : userText;
          log("📝 Accumulating user response:", newResponse);
          
          setConversationData(currentData => {
            // Handle confirmation for persona generation
            if (currentData.conversation_stage === 'awaiting_confirmation') {
              const confirmationResponse = userText.toLowerCase().trim();
              if (confirmationResponse.includes('yes') || confirmationResponse.includes('yeah') || 
                  confirmationResponse.includes('sure') || confirmationResponse.includes('ok') ||
                  confirmationResponse.includes('okay') || confirmationResponse.includes('go ahead')) {
                log("✅ User confirmed persona generation");
                
                // Start cleanup and persona generation
                setTimeout(async () => {
                  log("🔇 Starting cleanup before persona generation");
                  await completeCleanup();
                  
                  onConversationProgressed?.("Generating Persona");
                  setIsGeneratingPersona(true);
                  
                  // Generate persona
                  try {
                    log("🚀 Calling persona generation API...", {
                      product_service: currentData.product_service,
                      target_market: currentData.target_market
                    });
                    
                    const response = await fetch('/api/dual-voice/generate-persona', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        product_service: currentData.product_service,
                        target_market: currentData.target_market
                      })
                    });
                    
                    if (!response.ok) {
                      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const result = await response.json();
                    if (result.success) {
                      log("✅ Persona generated successfully:", result.persona.name);
                      onConversationProgressed?.("Persona Generated", result.persona);
                    } else {
                      log("❌ Persona generation failed:", result.error);
                      toast({ 
                        title: "Persona Generation Failed", 
                        description: result.error || "Unable to generate persona",
                        variant: "destructive" 
                      });
                    }
                  } catch (error: any) {
                    log("❌ Error calling persona API:", error);
                    toast({ 
                      title: "Connection Error", 
                      description: `Unable to generate persona: ${error.message}`,
                      variant: "destructive" 
                    });
                  } finally {
                    setIsGeneratingPersona(false);
                  }
                }, 500);
                
                return { ...currentData, persona_generated: true, conversation_stage: 'persona_generation' as ConversationStage };
              }
            }
            
            // Capture product service response
            if (currentData.conversation_stage === 'product_question' && !currentData.product_service && newResponse && newResponse.length > 10) {
              log("📝 Capturing product service response:", newResponse);
              return { ...currentData, product_service: newResponse };
            }
            
            // Capture target market response
            if (currentData.conversation_stage === 'target_question' && !currentData.target_market && newResponse && newResponse.length > 10) {
              log("📝 Capturing target market response:", newResponse);
              const updatedData = { ...currentData, target_market: newResponse };
              
              // Check if we have both pieces of information
              if (updatedData.product_service && updatedData.target_market && !updatedData.persona_generated) {
                log("✅ Both product_service and target_market captured - ready for confirmation");
                setTimeout(() => {
                  if (agentRef.current && connected) {
                    agentRef.current.injectAgentMessage("Perfect! I have all the information I need. Should I go ahead and generate your buyer persona now?");
                    log("❓ Asked for persona generation confirmation");
                  }
                }, 1000);
                return { ...updatedData, conversation_stage: 'awaiting_confirmation' as ConversationStage };
              }
              
              return updatedData;
            }
            
            return currentData;
          });
          
          return newResponse;
        });
      }
      
      // Handle agent responses for stage transitions
      if (agentText) {
        log("🔍 Checking agent text for triggers:", agentText);
        
        if (agentText.toLowerCase().includes("what is your primary product or service") || 
            agentText.toLowerCase().includes("what is your product") ||
            agentText.toLowerCase().includes("primary product")) {
          log("✅ Detected product question");
          setConversationData(prev => ({ ...prev, conversation_stage: 'product_question' as ConversationStage }));
          setCurrentUserResponse('');
          onConversationProgressed?.("Product or Service");
        } else if (agentText.toLowerCase().includes("should i go ahead and generate") ||
                   agentText.toLowerCase().includes("should i generate")) {
          log("❓ Sam is asking for persona generation confirmation");
          setConversationData(prev => ({ ...prev, conversation_stage: 'awaiting_confirmation' as ConversationStage }));
        } else if (agentText.toLowerCase().includes("who is your ideal customer") ||
                   agentText.toLowerCase().includes("target market")) {
          log("✅ Detected target market question");
          setConversationData(prev => ({ ...prev, conversation_stage: 'target_question' as ConversationStage }));
          setCurrentUserResponse('');
          onConversationProgressed?.("Target Market");
        }
      }
    } catch (error) {
      log("❌ Error processing conversation:", error);
    }
  }, [conversationData, connected, completeCleanup, onConversationProgressed, toast]);

  // Initialize Deepgram SDK (ONLY for persona mode - coach uses useSamCoachAgent hook)
  useEffect(() => {
    // Skip if using the working SamCoach hook
    if (activeAgent === 'coach') {
      log("ℹ️ Using SamCoach hook - skipping old SDK init");
      return;
    }
    
    (async () => {
      try {
        log("🔧 Fetching Deepgram token...");
        const response = await fetch("/api/deepgram/token", { credentials: "include" });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const { token, success, error } = data;
        if (!token) {
          const errorMsg = error || "Token field missing from response";
          throw new Error(errorMsg);
        }
        
        dgClientRef.current = createClient(token);
        setSdkReady(true);
        log("✅ SDK ready");
      } catch (error) {
        log("❌ Token fetch failed:", error);
        toast({
          title: "Deepgram Token Error",
          description: `Failed to init SDK: ${error}`,
          variant: "destructive"
        });
      }
    })();
  }, [toast, activeAgent]);

  // Build agent settings based on active agent type
  const buildSettings = useMemo(() => {
    const userName = getUserName();
    
    if (activeAgent === 'persona' && generatedPersona) {
      return {
        audio: {
          input: { encoding: "linear16", sample_rate: SAMPLE_RATE },
          output: { encoding: "linear16", sample_rate: SAMPLE_RATE, container: "none" }
        },
        agent: {
          language: "en",
          listen: { 
            provider: { 
              type: "deepgram", 
              model: "nova-3",
              smart_format: false,
              keyterms: ["PitchIQ", "sales training", "roleplay", "AI coach", "discovery call"]
            }
          },
          think: {
            provider: { type: "open_ai", model: "gpt-4o-mini" },
            prompt: `You are ${generatedPersona.name}, ${generatedPersona.role}. You are in a VOICE sales conversation with someone trying to sell you their product/service.

CRITICAL VOICE CONVERSATION RULES:
- This is a LIVE VOICE conversation - respond naturally and conversationally
- Keep responses under 30 words unless telling a story
- Use natural speech patterns with occasional "um", "well", "you know"
- Don't be overly polite - be realistic and sometimes skeptical
- Show your personality through your voice tone and word choices

YOUR BACKGROUND:
- Name: ${generatedPersona.name}
- Role: ${generatedPersona.role}
- Business Context: ${generatedPersona.business_details}
- About You: ${generatedPersona.about_person}

YOUR MINDSET:
- Primary Concern: ${generatedPersona.primary_concern}
- You're busy and somewhat skeptical of sales pitches
- You need to be convinced this solution is worth your time and money

CONVERSATION APPROACH:
- Start somewhat guarded but warm up if they demonstrate value
- Ask probing questions about their solution
- Share relevant challenges when appropriate
- Don't reveal all your pain points immediately
- Be realistic about budget, timeline, and decision-making process

Remember: This is a realistic business conversation. Be professional but human, skeptical but fair.`
          },
          speak: { provider: { type: "deepgram", model: "aura-2-asteria-en" } }
        },
        experimental: false
      };
    } else {
      // Coach agent (Sam)
      return {
        audio: {
          input: { encoding: "linear16", sample_rate: SAMPLE_RATE },
          output: { encoding: "linear16", sample_rate: SAMPLE_RATE, container: "none" }
        },
        agent: {
          language: "en",
          listen: { 
            provider: { 
              type: "deepgram", 
              model: "nova-3",
              smart_format: false,
              keyterms: ["PitchIQ", "sales training", "roleplay", "AI coach", "discovery call"]
            }
          },
          think: {
            provider: { type: "open_ai", model: "gpt-4o" },
            prompt: `You are Sam, an expert sales training coach helping ${userName} create a realistic buyer persona for sales practice.

CRITICAL VOICE CONVERSATION RULES:
- This is a LIVE VOICE conversation - be conversational and natural
- Keep responses under 25 words unless explaining something complex
- Use natural speech patterns and be encouraging
- Don't rush - let them think and respond fully

YOUR GOAL: Gather TWO pieces of information to create their ideal customer persona:
1. Their primary product or service 
2. Their target market/ideal customer

CONVERSATION FLOW:
1. Start with a warm greeting and ask about their product/service
2. Once you understand their offering, ask about their target market
3. When you have BOTH pieces of information, ask for confirmation: "Perfect! I have all the information I need. Should I go ahead and generate your buyer persona now?"
4. Wait for their explicit confirmation (yes/sure/okay/go ahead) before proceeding

CONVERSATION RULES:
- Be encouraging and supportive
- Ask follow-up questions if their answers are too vague
- Don't generate the persona until you have explicit confirmation
- Keep the conversation focused on these two key pieces of information

Remember: You're building trust and gathering quality information to create the best possible training scenario.`
          },
          speak: { provider: { type: "deepgram", model: "aura-2-asteria-en" } },
          greeting: `Hey ${userName}! I'm Sam, your AI sales coach. Let's create a buyer persona for your sales training. What's your primary product or service?`
        },
        experimental: false
      };
    }
  }, [activeAgent, generatedPersona, getUserName]);

  // Start session
  const startSession = async () => {
    log("▶️ Starting session...");
    if (connecting || connected || cleanupInProgress) {
      log("⚠️ Session start blocked - already connecting, connected, or cleaning up");
      return;
    }
    if (!dgClientRef.current) {
      log("🚫 Deepgram SDK not ready yet");
      return;
    }
    
    setConnecting(true);

    try {
      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: SAMPLE_RATE,
          channelCount: 1
        }
      });
      
      log("✅ Microphone granted");
      micStreamRef.current = stream;
      
      // Debug microphone stream
      const tracks = stream.getTracks();
      tracks.forEach((track, index) => {
        log(`🎤 Track ${index}: ${track.kind}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
        const settings = track.getSettings();
        log(`🎤 Track settings:`, settings);
      });
      
      // Create agent
      agentRef.current = dgClientRef.current.agent();
      const agent = agentRef.current;

      // Set up event handlers
      agent.on("Open", () => {
        log("🌐 WebSocket opened, sending settings...");
        const settings = buildSettings;
        log("🔧 Agent settings:", JSON.stringify(settings, null, 2));
        agent.configure(settings);
        
        // Wrap send method for visibility (from working implementation)
        if (agentRef.current && !(agentRef.current as any).__send) {
          (agentRef.current as any).__send = agentRef.current.send.bind(agentRef.current);
          agentRef.current.send = ((buf: ArrayBuffer) => {
            log(`📤 sent ${buf.byteLength} bytes to DG`);
            return (agentRef.current as any).__send(buf);
          }) as any;
        }
        
        // Initialize audio playback
        initSpeaker();
        
        // Start keepalive with error handling
        keepAliveId.current = window.setInterval(() => {
          try {
            agent.keepAlive();
          } catch (error) {
            log("❌ KeepAlive failed:", error);
            if (keepAliveId.current) {
              clearInterval(keepAliveId.current);
              keepAliveId.current = null;
            }
          }
        }, KEEPALIVE_MS);
        
        setConnected(true);
        setConnecting(false);
        onConnectionChange?.(true, completeCleanup);
      });

      agent.on("SettingsApplied", () => {
        log("✅ Settings applied, starting microphone...");
        startMicrophonePump();
        
        // Start the agent streaming (required for Agent API)
        try {
          log("▶️ Calling agent.start() to begin streaming");
          (agent as any).start();
        } catch (e) {
          log(`⚠️ agent.start() failed: ${e}`);
        }
      });

      // Add comprehensive event handlers from working implementation
      agent.on("UserStartedSpeaking", () => {
        log("📡 DG → UserStartedSpeaking 🎤");
      });

      agent.on("AgentAudioDone", () => {
        log("📡 DG → AgentAudioDone 🔇");
      });

      agent.on("AgentThinking", () => {
        log("📡 DG → AgentThinking 🤔");
      });

      agent.on("AgentStartedSpeaking", () => {
        log("📡 DG → AgentStartedSpeaking 🗣️");
      });

      agent.on("ConversationText", (msg: any) => {
        const isUser = msg.role === "user";
        const text = msg.content;
        const timestamp = Date.now();
        
        log(`📡 DG → ConversationText [${isUser ? 'USER' : 'AGENT'}]: "${text}"`);
        
        // Keep only last 20 messages to prevent memory bloat
        setTranscripts(prev => {
          const newTranscripts = [...prev, { sender: (isUser ? "user" : "agent") as "user" | "agent", text, timestamp }];
          return newTranscripts.slice(-20);
        });
        
        // Process conversation for persona generation (coach mode only)
        if (activeAgent === 'coach') {
          if (isUser) {
            processConversation(text, '');
          } else {
            processConversation('', text);
          }
        }
      });

      agent.on("Audio", (payload: any) => {
        log(`📡 DG → AgentAudio event received! 🔊`);
        playTTS(payload);
      });

      agent.on("Close", () => {
        log("🔌 WebSocket closed");
        completeCleanup();
      });

      agent.on("Error", (error: any) => {
        log("❌ Agent error:", error);
        toast({
          title: "Connection Error",
          description: `Deepgram agent error: ${error.message || error}`,
          variant: "destructive"
        });
        completeCleanup();
      });

      // Note: agent.start() doesn't exist in v4 - connection starts automatically
      onSessionStart?.();
      
    } catch (error: any) {
      log("❌ Session start failed:", error);
      toast({
        title: "Session Start Failed",
        description: `Unable to start voice session: ${error.message}`,
        variant: "destructive"
      });
      setConnecting(false);
    }
  };

  // Initialize speaker (separate context like working implementation)
  const initSpeaker = () => {
    // Create separate speaker context - don't overwrite microphone context
    const spkCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
    speakerCtxRef.current = spkCtx;
    playHead = spkCtx.currentTime + 0.05;
    spkCtx.resume().catch(() => {});
    log("🔊 Speaker initialized");
  };

  // Play TTS audio
  const playTTS = (payload: any) => {
    if (!speakerCtxRef.current) {
      log("❌ No speaker context for TTS playback");
      return;
    }

    // 1️⃣ Normalize to ArrayBuffer - handle Uint8Array, Buffer, etc.
    const pcmBuf: ArrayBuffer | undefined =
      payload instanceof ArrayBuffer     ? payload :
      ArrayBuffer.isView(payload)        ? payload.buffer :
      ArrayBuffer.isView(payload?.audio) ? payload.audio.buffer :
      undefined;

    if (!pcmBuf?.byteLength) {
      log("❌ Empty or invalid audio payload");
      return;
    }

    log(`🔉 DG audio ${pcmBuf.byteLength / 2} samples (${pcmBuf.byteLength} bytes)`);
    
    // Check if audio context is suspended
    if (speakerCtxRef.current.state === "suspended") {
      log("🔊 Resuming suspended audio context...");
      speakerCtxRef.current.resume().then(() => {
        log("✅ Audio context resumed");
      }).catch((err) => {
        log(`❌ Failed to resume audio context: ${err}`);
      });
    }
    
    try {
      // 2️⃣ Convert Int16 → Float32 and schedule playback
      const i16 = new Int16Array(pcmBuf);
      const f32 = Float32Array.from(i16, (v) => v / 32768);
      const buf = speakerCtxRef.current.createBuffer(1, f32.length, SAMPLE_RATE);
      buf.copyToChannel(f32, 0);

      const src = speakerCtxRef.current.createBufferSource();
      src.buffer = buf;
      src.connect(speakerCtxRef.current.destination);

      const startAt = Math.max(playHead, speakerCtxRef.current.currentTime + 0.02);
      src.start(startAt);
      playHead = startAt + buf.duration;
      
      log(`🔊 Scheduled TTS playback: ${buf.duration.toFixed(2)}s at ${startAt.toFixed(2)}s`);
      
    } catch (error) {
      log(`❌ TTS playback failed: ${error}`);
    }
  };

    // Start microphone pump (exactly matching working implementation)
  const startMicrophonePump = async () => {
    if (!micStreamRef.current) {
      log("❌ Missing mic stream");
      return;
    }

    try {
      // Create separate audio context for microphone (like working implementation)
      const micCtx = new AudioContext({ sampleRate: SAMPLE_RATE });
      ctxRef.current = micCtx; // Store reference for cleanup
      
      log("🔧 Adding audio worklet module...");
      await micCtx.audioWorklet.addModule('/deepgram-worklet.js');
      log("✅ Audio worklet module added");
      
      workletNodeRef.current = new AudioWorkletNode(micCtx, 'deepgram-worklet');
      log("✅ Audio worklet node created");
      
      let hold = new Int16Array(0);
      let loggedSamples = false;
      let messageCount = 0;
      
      let lastMessageTime = Date.now();
      
      workletNodeRef.current.port.onmessage = (e) => {
        lastMessageTime = Date.now(); // Track when we receive messages
        const data = e.data;
        
        // Log every 100th message to confirm handler is being called
        if (messageCount > 0 && messageCount % 100 === 0) {
          log(`🔵 Worklet onmessage still firing - message #${messageCount}`);
        }
        
        if (muted) {
          log("🔇 Audio muted, skipping processing");
          return;
        }

        // Debug what we're actually receiving - log first few messages regardless of size
        if (!loggedSamples) {
          log(`🔍 Worklet data debug: type=${typeof data}, constructor=${data?.constructor?.name}, length=${data?.length}, byteLength=${data?.byteLength}`);
          if (data instanceof ArrayBuffer) {
            const int16View = new Int16Array(data);
            const maxSample = Math.max(...int16View.map(Math.abs));
            log(`🔍 ArrayBuffer: ${data.byteLength} bytes, ${int16View.length} samples, max=${maxSample}`);
            // Also log raw samples like working implementation
            const rawSamples = Array.from(int16View.slice(0, 10));
            log(`🎤 Raw int16 samples (first 10): [${rawSamples.join(', ')}]`);
          }
          loggedSamples = true;
        }

        // Skip processing if data is too small or empty (reduced threshold)
        if (!data || !data.byteLength || data.byteLength < 20) {
          return;
        }

        const in16 = new Int16Array(data);
        let cat = new Int16Array(hold.length + in16.length);
        cat.set(hold);
        cat.set(in16, hold.length);

        const TARGET_SAMPLES = (SAMPLE_RATE * 30) / 1000;
        while (cat.length >= TARGET_SAMPLES) {
          const chunk = cat.slice(0, TARGET_SAMPLES);
          
          const rms = Math.sqrt(chunk.reduce((sum, sample) => sum + sample * sample, 0) / chunk.length);
          const hasAudio = rms > 100;
          
          messageCount++;
          
          if (messageCount === 1) {
            log(`🎙️ First audio chunk: RMS: ${Math.round(rms)} ${hasAudio ? '🔊 AUDIO DETECTED' : '🔇 silence'}`);
          } else if (hasAudio && messageCount <= 10) {
            log(`🔊 Speech detected! RMS: ${Math.round(rms)}`);
          }
          
          // Log periodically to show audio is flowing
          if (messageCount % 100 === 0) {
            log(`📊 Audio stats - Message ${messageCount}: RMS: ${Math.round(rms)} ${hasAudio ? '🔊' : '🔇'}`);
          }
          
          if (rms < 50 && messageCount % 500 === 0) {
            const min = Math.min(...chunk);
            const max = Math.max(...chunk);
            log(`🔍 Low audio levels - RMS: ${Math.round(rms)}, Range: ${min} to ${max}`);
          }
          
          if (agentRef.current && connected) {
            agentRef.current.send(chunk.buffer);
            // Log every 50th send to confirm data is flowing to Deepgram
            if (messageCount % 50 === 0) {
              log(`📤 Sent audio chunk #${messageCount} to Deepgram (${chunk.buffer.byteLength} bytes, RMS: ${Math.round(rms)})`);
            }
          }
          cat = cat.slice(TARGET_SAMPLES);
        }
        hold = cat;
      };
      
      // Connect microphone stream to worklet
      const sourceNode = micCtx.createMediaStreamSource(micStreamRef.current);
      sourceNode.connect(workletNodeRef.current);
      log(`🎙️ Mic → DG @${SAMPLE_RATE} Hz`);
      
      // Monitor worklet messages
      const monitorInterval = window.setInterval(() => {
        const timeSince = Date.now() - lastMessageTime;
        console.log(`🔍 Time since last worklet message: ${timeSince}ms, Total messages: ${messageCount}`);
        
        if (timeSince > 2000) {
          console.log(`⚠️ WARNING: Worklet stopped sending messages!`);
          console.log(`🔍 Stream active: ${micStreamRef.current?.active}`);
          console.log(`🔍 Stream tracks: ${micStreamRef.current?.getTracks().length}`);
          console.log(`🔍 Context state: ${micCtx.state}`);
          console.log(`🔍 Worklet outputs: ${workletNodeRef.current?.numberOfOutputs}`);
        }
      }, 2000);
      
      log(`✅ Monitor interval registered: ${monitorInterval}`);
      
      // Check if microphone is working
      setTimeout(() => {
        if (messageCount === 0) {
          log("⚠️ No audio data received from microphone after 3 seconds");
        } else {
          log(`✅ Microphone is working - received ${messageCount} audio messages`);
        }
        
        // Check audio context state
        if (micCtx.state !== 'running') {
          log(`❌ CRITICAL: Microphone AudioContext is ${micCtx.state} (should be 'running')`);
          log(`🔧 Attempting to resume microphone context...`);
          micCtx.resume().then(() => {
            log(`✅ Microphone context resumed successfully`);
          }).catch((err) => {
            log(`❌ Failed to resume microphone context: ${err}`);
          });
        } else {
          log(`✅ Microphone AudioContext state: ${micCtx.state}`);
        }
      }, 3000);
      
      // Monitor context state changes
      setInterval(() => {
        if (micCtx.state !== 'running') {
          log(`⚠️ Microphone context changed to: ${micCtx.state} - Messages received: ${messageCount}`);
        }
      }, 1000);
      
    } catch (error) {
      log("❌ Microphone pump failed:", error);
    }
  };

  // Stop session
  const stopSession = () => {
    log("⏹️ Stopping session...");
    completeCleanup();
    onConnectionChange?.(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      log("🧹 Component unmounting, cleaning up...");
      completeCleanup();
    };
  }, [completeCleanup]);

  // Handle roleplay start when activeAgent changes to persona
  useEffect(() => {
    if (activeAgent === 'persona' && roleplayStarted && !connected && generatedPersona) {
      log("🎭 Switching to persona agent, starting new session...");
      onConversationProgressed?.("Roleplay Active");
      // Start session automatically when switching to persona
      setTimeout(() => {
        startSession();
      }, 1000);
    }
  }, [activeAgent, roleplayStarted, connected, generatedPersona]);

  // Render minimal interface - AnimatedLandingPage handles the UI
  return (
    <div className="w-full h-full flex items-center justify-center">
      {!connected ? (
        <button 
          onClick={startSession}
          disabled={!sdkReady || connecting || cleanupInProgress}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {connecting ? "Connecting..." : cleanupInProgress ? "Preparing..." : "Start Voice Session"}
        </button>
      ) : (
        // Connected - AnimatedLandingPage shows the End Call button, so we show nothing
        <div className="text-center text-gray-600">
          <p className="text-sm">Voice session active</p>
        </div>
      )}
    </div>
  );
}; 
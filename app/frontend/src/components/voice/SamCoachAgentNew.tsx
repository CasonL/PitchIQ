"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useVoiceBot, VoiceBotStatus, EventType } from "../../context/VoiceBotContextProvider";
import { useDeepgram } from "../../context/DeepgramContextProvider";
import { useMicrophone } from "../../context/MicrophoneContextProvider";
import { createAudioBuffer, playAudioBuffer, sendSocketMessage, sendMicToSocket } from "../../utils/deepgramUtils";
// Simple logging utility
const useSimpleLog = (component: string) => {
  return (message: string) => {
    console.log(`[${component}] ${message}`);
  };
};

interface SamCoachAgentNewProps {
  onPersonaGenerated?: (persona: any) => void;
  className?: string;
}

export const SamCoachAgentNew: React.FC<SamCoachAgentNewProps> = ({ 
  onPersonaGenerated, 
  className = "" 
}) => {
  const log = useSimpleLog("SamCoachNew");
  
  const {
    status,
    messages,
    addVoicebotMessage,
    addBehindTheScenesEvent,
    isWaitingForUserVoiceAfterSleep,
    toggleSleep,
    startListening,
    startSpeaking,
  } = useVoiceBot();
  
  const {
    setupMicrophone,
    microphone,
    microphoneState,
    processor,
    microphoneAudioContext,
    startMicrophone,
  } = useMicrophone();
  
  const { socket, connectToDeepgram, socketState, rateLimited } = useDeepgram();
  
  const audioContext = useRef<AudioContext | null>(null);
  const agentVoiceAnalyser = useRef<AnalyserNode | null>(null);
  const userVoiceAnalyser = useRef<AnalyserNode | null>(null);
  const startTimeRef = useRef(-1);
  const [data, setData] = useState<string>();
  const [isInitialized, setIsInitialized] = useState(false);
  const scheduledAudioSources = useRef<AudioBufferSourceNode[]>([]);
  
  // Sam's conversation tracking
  const conversationHistoryRef = useRef<string[]>([]);
  const productServiceRef = useRef<string>("");
  const targetMarketRef = useRef<string>("");
  const [personaGenerated, setPersonaGenerated] = useState(false);

  // Sam's configuration
  const samConfig = {
    type: "Settings" as const,
    audio: {
      input: {
        encoding: "linear16",
        sample_rate: 16000,
      },
      output: {
        encoding: "linear16",
        sample_rate: 24000,
        container: "none",
      },
    },
    agent: {
      listen: {
        provider: { type: "deepgram" as const, model: "nova-2" },
      },
      think: {
        provider: { type: "open_ai" as const, model: "gpt-4o-mini" },
        prompt: `You are Sam, PitchIQ's AI assistant. You speak in plain sentences only. Never use formatting, lists, numbers, or multiple questions.

Ask what they sell. If they give details, say "Great, give me a moment while I generate your persona!" If vague, ask for specifics.

Keep responses under 15 words. One question maximum.`,
      },
      speak: {
        provider: { type: "deepgram" as const, model: "aura-asteria-en" },
      },
      greeting: "Hey there! I'm Sam, your sales training assistant! Welcome to PitchIQ's Demo!!! I'm going to ask you a few questions about what you sell, then I'll create an extremely nuanced persona for you to try to sell to. To start, what do you sell?",
    },
  };

  // Initialize audio context
  useEffect(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        latencyHint: "interactive",
        sampleRate: 24000,
      });
      agentVoiceAnalyser.current = audioContext.current.createAnalyser();
      agentVoiceAnalyser.current.fftSize = 2048;
      agentVoiceAnalyser.current.smoothingTimeConstant = 0.96;
    }
  }, []);

  // Buffer audio callback
  const bufferAudio = useCallback((data: ArrayBuffer) => {
    if (!audioContext.current || !agentVoiceAnalyser.current) return;
    
    const audioBuffer = createAudioBuffer(audioContext.current, data);
    if (!audioBuffer) return;
    
    scheduledAudioSources.current.push(
      playAudioBuffer(audioContext.current, audioBuffer, startTimeRef, agentVoiceAnalyser.current),
    );
  }, []);

  const clearAudioBuffer = () => {
    scheduledAudioSources.current.forEach((source) => source.stop());
    scheduledAudioSources.current = [];
  };

  // Setup microphone
  useEffect(() => {
    setupMicrophone();
  }, [setupMicrophone]);

  // Connect to Deepgram when microphone is ready
  useEffect(() => {
    if (microphoneState === 1 && socketState === -1 && isInitialized) {
      connectToDeepgram();
    }
  }, [microphoneState, socketState, isInitialized, connectToDeepgram]);

  // Setup WebSocket connection when both mic and socket are ready
  useEffect(() => {
    if (microphoneState === 1 && socket && samConfig) {
      const onOpen = () => {
        log("🌐 WebSocket opened, sending Sam config");
        sendSocketMessage(socket, samConfig);
        startMicrophone();
        startListening(true);
        
        // Ensure audio processor is set up after microphone starts
        setTimeout(() => {
          if (processor && socket.readyState === WebSocket.OPEN) {
            log("🎤 Delayed setup of audio processor");
            processor.onaudioprocess = sendMicToSocket(socket);
          }
        }, 100);
      };

      socket.addEventListener("open", onOpen);

      return () => {
        socket.removeEventListener("open", onOpen);
      };
    }
  }, [microphone, socket, microphoneState, samConfig, startMicrophone, startListening, log, processor]);

  // Setup microphone data transmission
  useEffect(() => {
    if (!microphone || !socket || microphoneState !== 2 || socketState !== 1) return;
    if (processor) {
      log("🎤 Setting up audio processor for microphone data transmission");
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [microphone, socket, microphoneState, socketState, processor, log]);

  // Handle sleep state
  useEffect(() => {
    if (!processor || socket?.readyState !== 1) return;
    if (status === VoiceBotStatus.SLEEPING) {
      log("😴 Sam sleeping - stopping audio transmission");
      processor.onaudioprocess = null;
    } else if (processor) {
      log("🎤 Sam awake - resuming audio transmission");
      processor.onaudioprocess = sendMicToSocket(socket);
    }
  }, [status, processor, socket, log]);

  // Create user voice analyser
  useEffect(() => {
    if (microphoneAudioContext && microphone) {
      userVoiceAnalyser.current = microphoneAudioContext.createAnalyser();
      userVoiceAnalyser.current.fftSize = 2048;
      userVoiceAnalyser.current.smoothingTimeConstant = 0.96;
      microphone.connect(userVoiceAnalyser.current);
    }
  }, [microphoneAudioContext, microphone]);

  // Handle WebSocket messages
  const onMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        if (status !== VoiceBotStatus.SLEEPING && !isWaitingForUserVoiceAfterSleep.current) {
          bufferAudio(event.data);
        }
      } else {
        log(`📡 Message: ${event.data}`);
        setData(event.data);
      }
    },
    [bufferAudio, status, isWaitingForUserVoiceAfterSleep, log],
  );

  useEffect(() => {
    if (socket) {
      socket.addEventListener("message", onMessage);
      return () => socket.removeEventListener("message", onMessage);
    }
  }, [socket, onMessage]);

  // Process conversation data
  useEffect(() => {
    if (typeof data === "string") {
      try {
        const parsedData = JSON.parse(data);
        if (!parsedData) return;

        // Record behind the scenes events
        maybeRecordBehindTheScenesEvent(parsedData);

        // Handle user messages
        if (parsedData.role === "user") {
          startListening();
          const userTranscript = parsedData.content;
          
          if (status !== VoiceBotStatus.SLEEPING) {
            addVoicebotMessage({ user: userTranscript });
            
            // Track conversation for persona generation
            conversationHistoryRef.current.push(userTranscript);
            
            // Extract product/service info
            const raw = userTranscript.trim();
            if (!productServiceRef.current && raw.length > 6) {
              productServiceRef.current = raw;
              log(`📝 Captured product/service: ${raw}`);
            }
          }
        }

        // Handle assistant messages
        if (parsedData.role === "assistant") {
          if (status !== VoiceBotStatus.SLEEPING) {
            startSpeaking();
            const assistantTranscript = parsedData.content;
            addVoicebotMessage({ assistant: assistantTranscript });
            
            // Check for persona generation trigger
            if (assistantTranscript.includes("Great, give me a moment while I generate your persona!") && !personaGenerated) {
              log("🎯 Persona generation triggered!");
              setPersonaGenerated(true);
              
              // Generate persona based on collected info
              setTimeout(() => {
                const persona = {
                  productService: productServiceRef.current,
                  targetMarket: targetMarketRef.current || "business professionals",
                  conversationHistory: conversationHistoryRef.current,
                };
                
                log(`🎭 Generated persona: ${JSON.stringify(persona)}`);
                onPersonaGenerated?.(persona);
              }, 2000);
            }
          }
        }

        // Handle system events
        if (parsedData.type === EventType.AGENT_AUDIO_DONE) {
          startListening();
        }
        if (parsedData.type === EventType.USER_STARTED_SPEAKING) {
          isWaitingForUserVoiceAfterSleep.current = false;
          startListening();
          clearAudioBuffer();
        }
        if (parsedData.type === EventType.AGENT_STARTED_SPEAKING) {
          const { tts_latency, ttt_latency, total_latency } = parsedData;
          if (tts_latency && ttt_latency) {
            const latencyMessage = { tts_latency, ttt_latency, total_latency };
            addVoicebotMessage(latencyMessage);
          }
        }
      } catch (error) {
        log(`❌ Error parsing message: ${error}`);
      }
    }
  }, [data, status, startListening, startSpeaking, addVoicebotMessage, isWaitingForUserVoiceAfterSleep, onPersonaGenerated, personaGenerated, log]);

  const maybeRecordBehindTheScenesEvent = (serverMsg: any) => {
    switch (serverMsg.type) {
      case EventType.SETTINGS_APPLIED:
        addBehindTheScenesEvent({ type: EventType.SETTINGS_APPLIED });
        break;
      case EventType.USER_STARTED_SPEAKING:
        if (status === VoiceBotStatus.SPEAKING) {
          addBehindTheScenesEvent({ type: "Interruption" });
        }
        addBehindTheScenesEvent({ type: EventType.USER_STARTED_SPEAKING });
        break;
      case EventType.AGENT_STARTED_SPEAKING:
        addBehindTheScenesEvent({ type: EventType.AGENT_STARTED_SPEAKING });
        break;
      case EventType.CONVERSATION_TEXT:
        addBehindTheScenesEvent({
          type: EventType.CONVERSATION_TEXT,
          role: serverMsg.role,
          content: serverMsg.content,
        });
        break;
      case EventType.END_OF_THOUGHT:
        addBehindTheScenesEvent({ type: EventType.END_OF_THOUGHT });
        break;
    }
  };

  const handleStart = () => {
    if (!isInitialized) {
      setIsInitialized(true);
      log("🚀 Sam initialized");
    }
    if (status !== VoiceBotStatus.NONE) {
      toggleSleep();
    }
  };

  if (rateLimited) {
    return (
      <div className={className}>
        <div className="text-red-500 text-center">Rate limited. Please try again later.</div>
      </div>
    );
  }

  return (
    <div className={className}>
      {!microphone ? (
        <div className="text-gray-400 text-center">Loading microphone...</div>
      ) : (
        <Fragment>
          {socketState === -1 && (
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-center w-full"
              onClick={handleStart}
            >
              <span className="text-xl">Start talking to Sam!</span>
            </button>
          )}
          {socketState === 0 && (
            <div className="text-gray-400 text-center">Connecting to Sam...</div>
          )}
          {socketState > 0 && status === VoiceBotStatus.SLEEPING && (
            <div className="text-center mt-4 mb-4">
              <div className="text-gray-400 text-sm mb-2">
                Sam has stopped listening. Click to resume.
              </div>
              <button 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                onClick={handleStart}
              >
                Resume
              </button>
            </div>
          )}
          
          {/* Status indicator */}
          {socketState > 0 && status !== VoiceBotStatus.SLEEPING && (
            <div className="text-center mb-4">
              <div className={`inline-block px-3 py-1 rounded-full text-sm ${
                status === VoiceBotStatus.LISTENING ? 'bg-green-100 text-green-800' :
                status === VoiceBotStatus.SPEAKING ? 'bg-blue-100 text-blue-800' :
                status === VoiceBotStatus.THINKING ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                Sam is {status || 'ready'}
              </div>
            </div>
          )}

          {/* Recent conversation */}
          <div className="h-20 text-sm mt-2 flex flex-col items-center text-gray-600 overflow-y-auto">
            {messages.length > 0 && (
              <div className="text-center">
                {messages.slice(-2).map((msg, i) => (
                  <div key={i} className="mb-1">
                    {'user' in msg && <span className="text-blue-600">You: {msg.user}</span>}
                    {'assistant' in msg && <span className="text-green-600">Sam: {msg.assistant}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Fragment>
      )}
    </div>
  );
};

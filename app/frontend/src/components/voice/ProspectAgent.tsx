import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PhoneOff, Volume2, VolumeX, User } from 'lucide-react';
import { PersonaData, UserProductInfo } from './DualVoiceAgentFlow';

interface ProspectAgentProps {
  persona: PersonaData;
  userProductInfo: UserProductInfo;
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
  onCallComplete,
  onEndCall
}) => {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [transcript, setTranscript] = useState('');

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
  const currentSentenceAudio = useRef<ArrayBuffer[]>([]);
  const isPlayingSentence = useRef<boolean>(false);
  const sentenceTimeout = useRef<NodeJS.Timeout | null>(null);

  const MIC_RATE = 48000;
  const TTS_RATE = 48000;
  const TARGET_SAMPLES = Math.floor(MIC_RATE * 0.03);
  const SENTENCE_TIMEOUT = 800; // ms to wait before considering sentence complete

  const log = (message: string) => {
    console.log(`[${persona.name}] ${message}`);
  };

  const startMicPump = async () => {
    if (!micStream.current) return;

    // Create audio context without forcing sample rate - let browser choose
    micCtx.current = new AudioContext({ 
      latencyHint: 'interactive'
    });
    
    // Resume context if it's suspended
    if (micCtx.current.state === 'suspended') {
      await micCtx.current.resume();
    }
    
    await micCtx.current.audioWorklet.addModule('/deepgram-worklet.js');
    micNode.current = new AudioWorkletNode(micCtx.current, 'deepgram-worklet');
    
    let hold = new Float32Array(0);
    
    micNode.current.port.onmessage = (event) => {
      if (!voiceAgentWS.current || voiceAgentWS.current.readyState !== WebSocket.OPEN) return;
      
      const f32 = event.data;
      let cat = new Float32Array(hold.length + f32.length);
      cat.set(hold);
      cat.set(f32, hold.length);
      
      const actualSampleRate = micCtx.current?.sampleRate || 48000;
      const targetSamples = Math.floor(actualSampleRate * 0.03); // 30ms chunks
      
      while (cat.length >= targetSamples) {
        const chunk = cat.slice(0, targetSamples);
        const i16 = new Int16Array(chunk.length);
        
        for (let i = 0; i < chunk.length; i++) {
          const s = Math.max(-1, Math.min(1, chunk[i] * 1.4));
          i16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        voiceAgentWS.current.send(i16.buffer);
        cat = cat.slice(targetSamples);
      }
      hold = cat;
    };
    
    micCtx.current.createMediaStreamSource(micStream.current).connect(micNode.current);
    log(`🎙️ Mic ready @${micCtx.current.sampleRate} Hz`);
  };

  const initSpeaker = () => {
    spkCtx.current = new AudioContext({ 
      latencyHint: 'interactive'
    });
    playHead.current = spkCtx.current.currentTime + 0.1;
    spkCtx.current.resume().catch(() => {});
    log(`🔈 Speaker ready @${spkCtx.current.sampleRate}Hz`);
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
      
      log(`🔊 Playing sentence (${(buf.duration).toFixed(2)}s)`);
      
    } catch (error) {
      log(`❌ Sentence playback failed: ${error}`);
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

    log(`📝 Audio chunk added to sentence buffer (${pcmBuf.byteLength} bytes)`);
  };

  const generateProspectPrompt = () => {
    return `You are ${persona.name}, a ${persona.role} at ${persona.company} in the ${persona.industry} industry.

PERSONA:
- Company: ${persona.business_details}
- Primary Concern: ${persona.primary_concern}
- About: ${persona.about_person}
- Style: ${persona.communication_style}
- Pain Points: ${persona.pain_points.join(', ')}
- Decision Factors: ${persona.decision_factors.join(', ')}

SCENARIO: Sales call about "${userProductInfo.product}" for "${userProductInfo.target_market}". You're moderately interested but skeptical.

BEHAVIOR:
- Stay in character as ${persona.name}
- Be realistic - not too easy, not impossible
- Ask about pricing, implementation, ROI
- Mention your pain points: ${persona.pain_points.slice(0, 2).join(' and ')}
- Focus on: ${persona.decision_factors.slice(0, 2).join(' and ')}
- Be ${persona.communication_style.toLowerCase()}
- Show interest if they address: ${persona.primary_concern}

You are the prospect, let them pitch to you.`;
  };

  const startCall = async () => {
    log("📞 Starting call");
    if (connecting || connected) return;
    
    setConnecting(true);
    callStartTime.current = Date.now();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, sampleRate: 48000, channelCount: 1 }
      });
      
      micStream.current = stream;
      
      const tokenRes = await fetch("/api/deepgram/token", { credentials: "include" });
      const tokenData = await tokenRes.json();
      
      if (!tokenData.success) throw new Error(tokenData.error || 'Failed to get API key');
      
      voiceAgentWS.current = new WebSocket(`wss://agent.deepgram.com/v1/agent/converse`, ['token', tokenData.token]);
      
      voiceAgentWS.current.onopen = () => {
        log("✅ Connected");
        
        const config = {
          type: "Settings",
          audio: {
            input: { encoding: "linear16", sample_rate: 48000 },
            output: { encoding: "linear16", sample_rate: 48000, container: "none" }
          },
          agent: {
            language: "en",
            listen: { provider: { type: "deepgram", model: "nova-2" } },
            think: { provider: { type: "open_ai", model: "gpt-4o-mini", temperature: 0.8 }, prompt: generateProspectPrompt() },
            speak: { provider: { type: "deepgram", model: "aura-2-asteria-en" } },
            greeting: `Hello, this is ${persona.name}. I understand you wanted to speak with me about a solution for our ${persona.industry.toLowerCase()} operations?`
          }
        };
        
        voiceAgentWS.current!.send(JSON.stringify(config));
        initSpeaker();
        startMicPump();
        setConnected(true);
        setConnecting(false);

        durationInterval.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - callStartTime.current) / 1000));
        }, 1000);
      };
      
      voiceAgentWS.current.onmessage = (event) => {
        try {
          if (typeof event.data === 'string') {
            const message = JSON.parse(event.data);
            
            if (message.type === 'ConversationText') {
              const text = message.text || '';
              const role = message.role || 'unknown';
              
              if (role === 'user') {
                setTranscript(prev => prev + `You: ${text}\n`);
              } else if (role === 'assistant') {
                setTranscript(prev => prev + `${persona.name}: ${text}\n`);
              }
            }
          } else {
            handleTTSAudio(event.data);
          }
        } catch (error) {
          log(`❌ Error: ${error}`);
        }
      };
      
      voiceAgentWS.current.onerror = () => cleanup();
      voiceAgentWS.current.onclose = () => cleanup();
      
    } catch (error) {
      log(`❌ Failed: ${error}`);
      setConnecting(false);
    }
  };

  const cleanup = () => {
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
    
    if (voiceAgentWS.current) {
      voiceAgentWS.current.close();
      voiceAgentWS.current = null;
    }
    
    if (micStream.current) {
      micStream.current.getTracks().forEach(track => track.stop());
      micStream.current = null;
    }
    
    if (micCtx.current) {
      if (micCtx.current.state !== 'closed') {
        micCtx.current.close().catch(() => {});
      }
      micCtx.current = null;
    }
    
    if (micNode.current) {
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

  const endCall = () => {
    const callData = {
      duration: callDuration,
      transcript,
      persona: persona.name,
      product: userProductInfo.product,
      endedAt: new Date().toISOString()
    };
    
    log(`📞 Call ended after ${callDuration}s`);
    cleanup();
    onCallComplete(callData);
  };

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

  useEffect(() => () => cleanup(), []);

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
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Mic, MicOff, Volume2, VolumeX, Settings, Play, Pause, Square } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface NovaSonicStatus {
  available: boolean;
  region: string;
  model_id: string;
  initialized: boolean;
  voices?: {
    voices: Array<{
      id: string;
      name: string;
      language: string;
      gender: string;
    }>;
    supported_languages: string[];
    features: string[];
  };
}

interface SalesScenario {
  id: string;
  name: string;
  description: string;
  system_prompt: string;
}

interface SessionInfo {
  status: string;
  session_id: string;
  config: any;
  scenario_id?: string;
  user_id?: number;
  session_type?: string;
}

interface AudioResponse {
  transcription?: string;
  audio?: string;
  text?: string;
  error?: string;
  audio_format?: string;
}

interface NovaSonicInterfaceProps {
  className?: string;
  onTranscript?: (transcript: string) => void;
  isListening?: boolean;
  onListeningChange?: (listening: boolean) => void;
  scenario?: any;
  compact?: boolean;
  hideContext?: boolean;
}

export const NovaSonicInterface: React.FC<NovaSonicInterfaceProps> = ({ 
  className = '',
  onTranscript,
  isListening: externalIsListening,
  onListeningChange,
  scenario: externalScenario,
  compact = false,
  hideContext = false
}) => {
  // State management
  const [status, setStatus] = useState<NovaSonicStatus | null>(null);
  const [scenarios, setScenarios] = useState<SalesScenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string>('');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [contextMessage, setContextMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
  // Add new state for improved UX
  const [isAutoMode, setIsAutoMode] = useState(true); // Auto mode by default
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [voiceActivityDetected, setVoiceActivityDetected] = useState(false);
  const [recordingMode, setRecordingMode] = useState<'manual' | 'auto'>('auto');
  
  // Refs for audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const isRecordingRef = useRef(false); // Immediate recording state tracking
  
  // Remove chunking state - no longer needed

  // Initialize component
  useEffect(() => {
    checkStatus();
    loadScenarios();
  }, []);

  // Function to speak prospect message (try Nova Sonic, fallback to browser TTS)
  // Function to stop any browser speech synthesis that might be running
  const stopBrowserSpeech = () => {
    if ('speechSynthesis' in window && speechSynthesis.speaking) {
      console.log('🛑 Stopping any browser speech synthesis');
      speechSynthesis.cancel();
    }
  };

  // Initial response function removed - user speaks first now

  const speakText = (text: string) => {
    // Use browser speech synthesis as fallback until Nova Sonic audio works
    stopBrowserSpeech();
    
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      // Try to use a female voice
      const voices = speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('susan')
      );
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      
      setIsPlaying(true);
      utterance.onend = () => {
        setTimeout(() => {
          setIsPlaying(false);
        }, 1000);
      };
      
      speechSynthesis.speak(utterance);
    }
  };



  // Show initial context message when session starts
  useEffect(() => {
    if (session && compact && externalScenario) {
      // Show the context
      setContextMessage(externalScenario.context || "Sales call in progress! Your prospect is ready to engage...");
      
      // Nova Sonic should provide the initial response when the session starts
      // If it doesn't, the startCustomSession function will fall back to speakProspectMessage
      console.log('📋 Context set. Nova Sonic should provide initial response or fallback will trigger.');
      setAiResponse("");
    }
  }, [session, compact, externalScenario]);

  // Cleanup: stop any browser speech when component unmounts
  useEffect(() => {
    return () => {
      stopBrowserSpeech();
    };
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch('/api/nova-sonic/status');
      if (response.ok) {
        const statusData = await response.json();
        setStatus(statusData);
      } else {
        setError('Failed to check Nova Sonic status');
      }
    } catch (err) {
      setError('Error connecting to Nova Sonic service');
    }
  };

  const loadScenarios = async () => {
    try {
      const response = await fetch('/api/nova-sonic/sales-scenarios');
      if (response.ok) {
        const data = await response.json();
        setScenarios(data.scenarios);
      }
    } catch (err) {
      console.error('Error loading scenarios:', err);
    }
  };

  const startSession = async () => {
    if (!selectedScenario) {
      setError('Please select a sales scenario');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/nova-sonic/start-sales-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario_id: selectedScenario
        })
      });

      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
        setTranscript('');
        setAiResponse('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start session');
      }
    } catch (err) {
      setError('Error starting Nova Sonic session');
    } finally {
      setLoading(false);
    }
  };

  const startCustomSession = useCallback(async () => {
    if (loading) return; // Prevent multiple simultaneous calls
    
    setLoading(true);
    setError('');

    try {
      let systemPrompt;
      
      console.log('🔍 externalScenario:', externalScenario);
      
      if (externalScenario) {
        // Use external scenario from FloatingDemoBar for Nova Sonic
        systemPrompt = `You are a realistic sales prospect in a voice conversation. ${externalScenario.context}

Your first response should be: "${externalScenario.prospectMessage}"

After the salesperson responds, continue the conversation naturally based on their approach. Be challenging but realistic, ask relevant questions, and provide appropriate objections to help them practice their sales skills. Speak naturally and conversationally.`;

        console.log('✅ Using Nova Sonic system prompt with scenario:', externalScenario.context.substring(0, 50) + '...');
      } else {
        // Fallback to default sales training scenario
        systemPrompt = `You are a realistic sales prospect interested in learning about new solutions. Engage naturally in conversation, ask relevant questions, and provide appropriate objections to help the salesperson practice their skills. Speak in a natural, conversational tone.`;
        console.log('⚠️ No externalScenario, using fallback Nova Sonic prompt');
      }
      
      // Use real Nova Sonic session creation
      const requestBody = {
        voice_type: 'feminine',
        system_prompt: systemPrompt
      };
      
      console.log('📤 Starting Nova Sonic session with prompt:', systemPrompt.substring(0, 100) + '...');

      const response = await fetch('/api/nova-sonic/demo-start-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const sessionData = await response.json();
        setSession(sessionData);
        setTranscript('');
        setAiResponse('');
        
                // Set up for user to speak first
        console.log('🎤 Nova Sonic session ready - waiting for user to speak first');
        setAiResponse('👋 Hi! I\'m ready to practice with you. **Please say "Hi" to start our conversation!**');
        setProcessingStatus('🎤 Say "Hi" to begin...');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start session');
      }
    } catch (err) {
      setError('Error starting Nova Sonic session');
    } finally {
      setLoading(false);
    }
  }, [loading, externalScenario]);

  const startRecording = useCallback(async () => {
    console.log('🎙️ startRecording called, session:', !!session, 'isRecording:', isRecording, 'isPlaying:', isPlaying);
    
    if (!session) {
      console.log('❌ No session available for recording');
      setError('Please start a session first');
      return;
    }

    if (isRecording) {
      console.log('⏳ Already recording, ignoring start request');
      return;
    }

    if (isPlaying) {
      console.log('🔇 Audio is playing, delaying recording start');
      setTimeout(() => {
        if (!isPlaying) {
          console.log('🔄 Audio finished, starting recording now');
          startRecording();
        }
      }, 500);
      return;
    }

    try {
      console.log('🎤 Requesting microphone access...');
      setIsRecording(true);
      onListeningChange?.(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

            console.log('🎵 Microphone access granted, setting up MediaRecorder...');
      console.log('🔧 Recording mode:', recordingMode);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        console.log('📊 Audio data available, size:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 MediaRecorder stopped, processing audio...');
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('📦 Audio blob created, size:', audioBlob.size);
        await processAudio(audioBlob);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
        
        // In auto mode, automatically start listening again after processing
        // But wait for any playing audio to finish first
        if (recordingMode === 'auto' && !isPlaying) {
          setTimeout(() => {
            if (!isPlaying) {
              console.log('🔄 Auto-restarting recording after audio processing');
              startRecording();
            } else {
              console.log('🔇 Skipping auto-restart - audio is still playing');
            }
          }, 1000);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true; // Set ref immediately
      onListeningChange?.(true);
      
      // Set up voice activity detection immediately since we're using ref
      if (recordingMode === 'auto') {
        console.log('🎧 Auto mode - setting up voice activity detection');
        setupVoiceActivityDetection(stream);
      }
      
      console.log('✅ Recording started successfully in', recordingMode, 'mode');
      setError('');
    } catch (err) {
      console.error('❌ Error starting recording:', err);
      setError('Error accessing microphone: ' + err.message);
      setIsRecording(false);
      onListeningChange?.(false);
    }
  }, [session, isRecording, onListeningChange, recordingMode, isPlaying]);

  // Voice activity detection function
  const setupVoiceActivityDetection = useCallback((stream: MediaStream) => {
    console.log('🎧 Setting up voice activity detection...');
    
    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      microphone.connect(analyser);
      
      console.log('✅ Audio context created:', {
        sampleRate: audioContext.sampleRate,
        state: audioContext.state,
        bufferLength: bufferLength
      });
      
      let silenceStart = Date.now();
      let voiceDetected = false;
      let iterationCount = 0;
      
      const checkVoiceActivity = () => {
        if (!isRecordingRef.current) {
          console.log('🛑 Voice detection stopped - not recording');
          return;
        }
        
        // Pause voice detection when audio is playing to prevent feedback loops
        if (isPlaying) {
          console.log('🔇 Voice detection paused - audio is playing');
          requestAnimationFrame(checkVoiceActivity);
          return;
        }
        
        iterationCount++;
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const maxVolume = Math.max(...dataArray);
        const isVoiceActive = average > 5; // Lowered threshold for voice detection
        
        // Debug: Log audio levels more frequently initially, then less often
        const shouldLog = iterationCount < 50 || Math.random() < 0.05;
        if (shouldLog) {
          console.log('🎤 Audio analysis:', {
            iteration: iterationCount,
            average: Math.round(average),
            max: maxVolume,
            active: isVoiceActive,
            contextState: audioContext.state
          });
        }
        
        if (isVoiceActive) {
          if (!voiceDetected) {
            console.log('🎤 Voice activity detected! Average:', average, 'Max:', maxVolume);
            setVoiceActivityDetected(true);
            voiceDetected = true;
          }
          silenceStart = Date.now();
        } else if (voiceDetected) {
          const silenceDuration = Date.now() - silenceStart;
          
          // If silence for more than 2 seconds after voice was detected, stop recording
          if (silenceDuration > 2000) {
            console.log('🔇 Silence detected for 2s, stopping recording');
            stopRecording();
            return;
          }
        }
        
        requestAnimationFrame(checkVoiceActivity);
      };
      
      // Start voice detection
      checkVoiceActivity();
      
    } catch (error) {
      console.error('❌ Error setting up voice activity detection:', error);
    }
  }, []); // No dependencies since we use ref

  const stopRecording = useCallback(() => {
    console.log('🛑 stopRecording called, mediaRecorder:', !!mediaRecorderRef.current, 'isRecording:', isRecording, 'isRecordingRef:', isRecordingRef.current);
    
    if (mediaRecorderRef.current && isRecordingRef.current) {
      console.log('⏹️ Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false; // Update ref immediately
      setVoiceActivityDetected(false);
      onListeningChange?.(false);
      
      // Clear any silence timer
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        setSilenceTimer(null);
      }
      
      console.log('✅ Recording stopped');
    } else {
      console.log('⚠️ Cannot stop recording - no recorder or not recording');
    }
  }, [isRecording, onListeningChange, silenceTimer]);

  const processAudio = async (audioBlob: Blob) => {
    if (!session) return;

    setLoading(true);
    setProcessingStatus('🎤 Nova Sonic: Processing your voice...');
    setAiResponse('');

    try {
      // Convert audio blob to base64 for Nova Sonic streaming
      const audioBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(audioBlob);
      });

      console.log('🎤 Sending audio to Nova Sonic, size:', audioBase64.length);

      const response = await fetch('/api/nova-sonic/demo-stream-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: session.session_id,
          audio: audioBase64  // Backend expects 'audio' key
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Nova Sonic response received:', {
          success: data.success,
          responses: data.responses?.length || 0,
          session_id: data.session_id,
          real_nova_sonic: data.real_nova_sonic
        });
        
        if (data.success && data.responses && data.responses.length > 0) {
          setProcessingStatus('🎯 Nova Sonic: Processing response...');
          
          // Nova Sonic returns audio and text responses - prioritize audio
          let hasPlayedAudio = false;
          let textResponse = '';
          
          for (const responseItem of data.responses) {
            console.log('📄 Processing Nova Sonic response:', responseItem);
            
            // Check for Nova Sonic native audio response (priority)
            if (responseItem.audio && responseItem.audio.length > 100) {
              console.log('🔊 Playing Nova Sonic native audio response, length:', responseItem.audio.length);
              await playNovaAudioResponse(responseItem.audio);
              hasPlayedAudio = true;
            }
            
            // Extract text for display
            if (responseItem.text) {
              textResponse = responseItem.text;
              console.log('💬 Nova Sonic text response:', textResponse.substring(0, 100) + '...');
            } else if (responseItem.transcription) {
              textResponse = responseItem.transcription;
              console.log('💬 Nova Sonic transcription:', textResponse.substring(0, 100) + '...');
            }
          }
          
          // Display the text response
          if (textResponse) {
            setAiResponse(textResponse);
          }
          
          // If Nova Sonic didn't provide audio, fallback to browser speech
          if (!hasPlayedAudio && textResponse) {
            console.log('🔊 Nova Sonic provided no audio - using browser speech fallback');
            speakText(textResponse);
          } else if (hasPlayedAudio) {
            console.log('✅ Nova Sonic audio played successfully');
          }
          
          setProcessingStatus('');
        } else {
          console.log('⏳ Nova Sonic: No responses or empty response');
          setProcessingStatus('⏳ Waiting for Nova Sonic response...');
          
          setTimeout(() => {
            setProcessingStatus('');
          }, 5000);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.log('❌ Nova Sonic API error:', response.status, errorData);
        setError(errorData.error || `Nova Sonic API error: ${response.status}`);
        setProcessingStatus('');
      }
    } catch (err) {
      console.error('❌ Error processing audio with Nova Sonic:', err);
      setError('Error processing audio with Nova Sonic');
      setProcessingStatus('');
    } finally {
      setLoading(false);
    }
  };

  const playAudioFromUrl = async (audioUrl: string) => {
    try {
      if (audioElementRef.current) {
        audioElementRef.current.src = audioUrl;
        audioElementRef.current.play();
        setIsPlaying(true);

        audioElementRef.current.onended = () => {
          setIsPlaying(false);
        };
      }
    } catch (err) {
      console.error('Error playing audio from URL:', err);
    }
  };

  const playNovaAudioResponse = async (audioBase64: string) => {
    if (!audioBase64 || audioBase64.length < 50) {
      console.log('⚠️ Invalid or empty Nova Sonic audio data, skipping playback');
      return;
    }

    try {
      console.log('🔊 Playing Nova Sonic audio response, length:', audioBase64.length);
      
      // Set playing state to prevent voice detection during playback
      setIsPlaying(true);
      
      // Decode base64 audio from Nova Sonic
      const audioData = atob(audioBase64);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      // Nova Sonic returns PCM audio - create appropriate blob
      const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      // Set up audio event handlers
      audio.onended = () => {
        console.log('🎵 Nova Sonic audio playback completed');
        URL.revokeObjectURL(audioUrl);
        // Add a brief delay before allowing recording again
        setTimeout(() => {
          setIsPlaying(false);
        }, 1000); // 1 second cooldown after audio ends
      };
      
      audio.onerror = (e) => {
        console.error('❌ Nova Sonic audio playback error:', e);
        URL.revokeObjectURL(audioUrl);
        setIsPlaying(false);
      };
      
      await audio.play();
      console.log('✅ Nova Sonic audio playback started successfully');
      
    } catch (error) {
      console.error('❌ Error playing Nova Sonic audio response:', error);
      setIsPlaying(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/nova-sonic/test-connection', {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        setError(''); // Clear any previous errors
        alert('Nova Sonic connection test successful!');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error testing connection');
    } finally {
      setLoading(false);
    }
  };

  // Callback for starting a voice session in compact mode
  const handleStartVoiceSession = useCallback(() => {
    if (loading) return; // Prevent double-click during loading
    
    // Use external scenario if provided, otherwise default to objection_handling
    const scenarioId = externalScenario ? 'custom_demo' : 'objection_handling';
    setSelectedScenario(scenarioId);
    startCustomSession();
  }, [loading, externalScenario, startCustomSession]);

  // Callback for the record/stop button in compact mode
  const handleRecordingToggle = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🎤 Recording toggle clicked, current state:', { isRecording, loading, session: !!session });
    
    if (loading) {
      console.log('⏳ Loading in progress, ignoring toggle');
      return; // Prevent action during loading
    }
    
    if (!session) {
      console.log('❌ No session available for recording');
      setError('Please start the voice session first');
      return;
    }
    
    if (isRecording) {
      console.log('🛑 Stopping recording...');
      stopRecording();
    } else {
      console.log('🎙️ Starting recording...');
      startRecording();
    }
  }, [loading, isRecording, stopRecording, startRecording, session]);

  // Compact mode for landing page demo
  if (compact) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        {!status?.available ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
              <div className="text-red-500 text-2xl">⚠️</div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Voice Mode Unavailable</h3>
            <p className="text-sm text-gray-600 max-w-sm">
              Voice mode requires AWS Nova Sonic configuration. Please check your setup.
            </p>
          </div>
        ) : !session ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Mic className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready for Voice Training</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm">
              Start your AI-powered voice coaching session to practice your sales conversations.
            </p>
            <Button 
              onClick={handleStartVoiceSession}
              disabled={loading}
              size="lg"
              className="px-8"
            >
              {loading ? 'Initializing...' : 'Start Voice Session'}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Enhanced message area with better spacing */}
            <div className="flex-1 px-6 py-4 space-y-4 overflow-y-auto min-h-0">
              

              {contextMessage && !hideContext && (
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 p-4 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center">
                      <span className="text-yellow-700 text-sm">📋</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide mb-1">Scenario Context</p>
                      <p className="text-sm text-yellow-800 leading-relaxed">{contextMessage}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {processingStatus && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-blue-600 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 font-medium animate-pulse">{processingStatus}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {transcript && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-200 rounded-full flex items-center justify-center">
                      <Mic className="h-4 w-4 text-green-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">You Said</p>
                      <p className="text-sm text-green-800 leading-relaxed">{transcript}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {aiResponse && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 text-sm">🤖</span>
                      </div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">AI Coach Feedback</p>
                    </div>
                  </div>
                  <div className="px-4 py-4 max-h-64 overflow-y-auto">
                    <div className="text-sm prose prose-sm max-w-none prose-gray">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-gray-700">{children}</p>,
                          strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                          em: ({ children }) => <em className="italic text-gray-600">{children}</em>,
                          ul: ({ children }) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700">{children}</ul>,
                          ol: ({ children }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700">{children}</ol>,
                          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                          h1: ({ children }) => {
                            const text = children?.toString() || '';
                            let bgColor = 'bg-blue-50 border-blue-200 text-blue-800';
                            if (text.includes('🎯 EXCELLENT')) bgColor = 'bg-green-50 border-green-200 text-green-800';
                            if (text.includes('⚠️ NEEDS WORK')) bgColor = 'bg-red-50 border-red-200 text-red-800';
                            if (text.includes('💡 GOOD FOUNDATION')) bgColor = 'bg-yellow-50 border-yellow-200 text-yellow-800';
                            return <h1 className={`text-base font-bold mb-4 mt-0 p-3 rounded-lg border ${bgColor} -mx-4`}>{children}</h1>;
                          },
                          h2: ({ children }) => <h2 className="text-sm font-bold mb-3 mt-5 text-gray-800 border-b border-gray-200 pb-2">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mb-2 mt-4 text-gray-700">{children}</h3>,
                          code: ({ children }) => <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono text-gray-800">{children}</code>,
                          blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 bg-blue-50 pl-4 py-3 my-3 italic text-gray-700 rounded-r">{children}</blockquote>
                        }}
                      >
                        {aiResponse}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}
              
              {error && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 p-4 rounded-xl">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-200 rounded-full flex items-center justify-center">
                      <span className="text-red-700 text-sm">⚠️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1">Error</p>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modern recording interface */}
            <div className="flex flex-col items-center py-6 px-6 bg-gradient-to-t from-gray-50 to-transparent">
              
              {/* Recording mode toggle */}
              <div className="flex items-center gap-2 mb-4">
                <Button
                  onClick={() => setRecordingMode(recordingMode === 'auto' ? 'manual' : 'auto')}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  {recordingMode === 'auto' ? '🤖 Auto Mode' : '👆 Manual Mode'}
                </Button>
              </div>
              
              {/* Main record button */}
              <div className="relative">
                <Button
                  onClick={handleRecordingToggle}
                  disabled={loading}
                  className={`w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 ease-out transform border-4 ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 border-red-300 scale-110 shadow-red-200' 
                      : 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 border-purple-300 hover:scale-105 shadow-purple-200'
                  }`}
                >
                  {isRecording ? (
                    <div className="flex flex-col items-center">
                      <Square className="h-6 w-6 text-white mb-1" />
                      <span className="text-xs text-white font-medium">Stop</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Mic className="h-6 w-6 text-white mb-1" />
                      <span className="text-xs text-white font-medium">Talk</span>
                    </div>
                  )}
                </Button>
                
                {/* Recording state indicators */}
                {isRecording && (
                  <>
                    {/* Outer pulsing ring */}
                    <div className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping"></div>
                    {/* Inner breathing ring */}
                    <div className="absolute inset-0 rounded-full bg-red-300 opacity-30" style={{
                      animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }}></div>
                    {/* Voice activity indicator */}
                    {voiceActivityDetected && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </>
                )}
                
                {/* Loading spinner */}
                {loading && (
                  <div className="absolute inset-0 rounded-full bg-blue-600 bg-opacity-80 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              {/* Status text */}
              <div className="mt-3 text-center">
                {isRecording ? (
                  <div className="flex flex-col items-center">
                    <p className="text-sm font-medium text-red-600 animate-pulse">
                      {voiceActivityDetected ? '🎤 Listening...' : '🔇 Waiting for voice...'}
                    </p>
                    {recordingMode === 'auto' && (
                      <p className="text-xs text-gray-500 mt-1">Will stop automatically when you finish speaking</p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <p className="text-sm text-gray-600">
                      {recordingMode === 'auto' ? 'Tap to start conversation' : 'Hold to record'}
                    </p>
                    {recordingMode === 'auto' && (
                      <p className="text-xs text-gray-500 mt-1">Auto-detects when you stop speaking</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Hidden audio element */}
        <audio ref={audioElementRef} style={{ display: 'none' }} />
      </div>
    );
  }

  // Full interface for development/testing
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-6 w-6" />
            Amazon Nova Sonic - Sales Training
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Service Status</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant={status?.available ? "default" : "destructive"}>
                {status?.available ? "Available" : "Unavailable"}
              </Badge>
              {status?.region && (
                <Badge variant="outline">Region: {status.region}</Badge>
              )}
              {status?.model_id && (
                <Badge variant="outline">Model: {status.model_id}</Badge>
              )}
            </div>
            
            {!status?.available && (
              <Alert>
                <AlertDescription>
                  Nova Sonic is not available. Please check your AWS credentials and ensure you have access to the us-east-1 region.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={testConnection} 
              disabled={loading || !status?.available}
              className="mt-2"
            >
              Test Connection
            </Button>
          </div>

          {/* Scenario Selection */}
          {status?.available && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Sales Training Scenarios</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {scenarios.map((scenario) => (
                  <Card 
                    key={scenario.id}
                    className={`cursor-pointer transition-colors ${
                      selectedScenario === scenario.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedScenario(scenario.id)}
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold">{scenario.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button 
                onClick={startSession} 
                disabled={!selectedScenario || loading}
                className="w-full"
              >
                {loading ? 'Starting Session...' : 'Start Training Session'}
              </Button>
            </div>
          )}

          {/* Active Session */}
          {session && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Active Session</h3>
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="default">Session Active</Badge>
                <Badge variant="outline">ID: {session.session_id}</Badge>
              </div>

              {/* Recording Controls */}
              <div className="flex items-center gap-4 mb-4">
                <Button
                  onClick={handleRecordingToggle}
                  disabled={loading}
                  variant={isRecording ? "destructive" : "default"}
                  className="flex items-center gap-2"
                >
                  {isRecording ? (
                    <>
                      <Square className="h-4 w-4" />
                      Stop Recording
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4" />
                      Start Recording
                    </>
                  )}
                </Button>

                {isRecording && (
                  <Badge variant="destructive" className="animate-pulse">
                    Recording...
                  </Badge>
                )}

                {isPlaying && (
                  <Badge variant="default" className="animate-pulse">
                    AI Speaking...
                  </Badge>
                )}
              </div>

              {/* Conversation Display */}
              <div className="space-y-4">
                {transcript && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Your Speech</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{transcript}</p>
                    </CardContent>
                  </Card>
                )}

                {aiResponse && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">AI Coach Feedback</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="mb-1 leading-relaxed">{children}</li>,
                            h1: ({ children }) => {
                              const text = children?.toString() || '';
                              let bgColor = 'bg-blue-50 border-blue-200 text-blue-800';
                              if (text.includes('🎯 EXCELLENT')) bgColor = 'bg-green-50 border-green-200 text-green-800';
                              if (text.includes('⚠️ NEEDS WORK')) bgColor = 'bg-red-50 border-red-200 text-red-800';
                              if (text.includes('💡 GOOD FOUNDATION')) bgColor = 'bg-yellow-50 border-yellow-200 text-yellow-800';
                              return <h1 className={`text-lg font-bold mb-3 p-3 rounded-lg border ${bgColor} -mx-6 mt-0`}>{children}</h1>;
                            },
                            h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-4 text-gray-800 border-b border-gray-200 pb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-gray-700">{children}</h3>,
                            code: ({ children }) => <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">{children}</code>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-300 bg-blue-50 pl-4 py-2 my-2 italic text-gray-700 rounded-r">{children}</blockquote>
                          }}
                        >
                          {aiResponse}
                        </ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Hidden audio element for playback */}
          <audio ref={audioElementRef} style={{ display: 'none' }} />
        </CardContent>
      </Card>
    </div>
  );
};
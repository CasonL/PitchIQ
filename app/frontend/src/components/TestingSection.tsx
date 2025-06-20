import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Mic, MicOff, Volume2, VolumeX, Play, Square } from 'lucide-react';

const TestingSection = () => {
  // Nova Sonic State
  const [novaIsRecording, setNovaIsRecording] = useState(false);
  const [novaIsPlaying, setNovaIsPlaying] = useState(false);
  const [novaSessionId, setNovaSessionId] = useState<string | null>(null);
  const [novaConversation, setNovaConversation] = useState<Array<{role: string, content: string}>>([]);
  const novaIsRecordingRef = useRef(false);
  const novaMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const novaAudioChunksRef = useRef<Blob[]>([]);

  // OpenAI Real-Time State
  const [openaiSessionId, setOpenaiSessionId] = useState<string | null>(null);
  const [openaiIsConnected, setOpenaiIsConnected] = useState(false);
  const [openaiConversation, setOpenaiConversation] = useState<Array<{role: string, content: string}>>([]);
  const [openaiIsRecording, setOpenaiIsRecording] = useState(false);
  const openaiWebSocketRef = useRef<WebSocket | null>(null);
  const openaiMediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Voice Activity Detection
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add request tracking for OpenAI
  const [openaiRequestQueue, setOpenaiRequestQueue] = useState<string[]>([]);
  const openaiCurrentRequestRef = useRef<string | null>(null);
  
  // Voice detection refs - need to persist across function calls
  const openaiAnalyserRef = useRef<AnalyserNode | null>(null);
  const openaiDataArrayRef = useRef<Uint8Array | null>(null);
  const openaiSilenceStartRef = useRef<number | null>(null);
  const openaiIsProcessingRef = useRef<boolean>(false);
  const openaiAudioChunksRef = useRef<Blob[]>([]);

  // Nova Sonic Functions
  const startNovaSession = async () => {
    try {
      const response = await fetch('/api/nova-sonic/demo-start-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_type: 'feminine' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setNovaSessionId(data.session_id);
        setNovaConversation([{role: 'system', content: 'Nova Sonic session started'}]);
        startNovaRecording();
      }
    } catch (error) {
      console.error('Failed to start Nova session:', error);
    }
  };

  const startNovaRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Voice Activity Detection
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      const mediaRecorder = new MediaRecorder(stream);
      novaMediaRecorderRef.current = mediaRecorder;
      novaAudioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          novaAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (novaAudioChunksRef.current.length > 0) {
          const audioBlob = new Blob(novaAudioChunksRef.current, { type: 'audio/webm' });
          await sendNovaAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      setNovaIsRecording(true);
      novaIsRecordingRef.current = true;

      // Start voice detection
      detectNovaVoiceActivity();
    } catch (error) {
      console.error('Failed to start Nova recording:', error);
    }
  };

  const detectNovaVoiceActivity = () => {
    if (!analyserRef.current || !dataArrayRef.current || !novaIsRecordingRef.current) return;

    analyserRef.current.getByteFrequencyData(dataArrayRef.current);
    const average = dataArrayRef.current.reduce((a, b) => a + b) / dataArrayRef.current.length;

    if (average > 5) {
      // Voice detected - reset silence timer
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    } else {
      // Silence detected - start timer if not already started
      if (!silenceTimeoutRef.current) {
        silenceTimeoutRef.current = setTimeout(() => {
          if (novaIsRecordingRef.current && !novaIsPlaying) {
            stopNovaRecording();
          }
        }, 2000);
      }
    }

    // Continue detection
    if (novaIsRecordingRef.current) {
      requestAnimationFrame(detectNovaVoiceActivity);
    }
  };

  const stopNovaRecording = () => {
    if (novaIsRecordingRef.current && novaMediaRecorderRef.current) {
      novaMediaRecorderRef.current.stop();
      setNovaIsRecording(false);
      novaIsRecordingRef.current = false;
      
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
    }
  };

  const sendNovaAudio = async (audioBlob: Blob) => {
    if (!novaSessionId) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const response = await fetch('/api/nova-sonic/demo-stream-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: novaSessionId,
            audio: base64Audio
          })
        });

        if (response.ok) {
          const data = await response.json();
          
          // Add transcription to conversation
          if (data.transcription) {
            setNovaConversation(prev => [...prev, {role: 'user', content: data.transcription}]);
          }
          
          // Add AI response to conversation
          if (data.ai_response) {
            setNovaConversation(prev => [...prev, {role: 'assistant', content: data.ai_response}]);
          }
          
          // Play audio response
          if (data.audio) {
            await playNovaAudio(data.audio);
          }
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Failed to send Nova audio:', error);
    }
  };

  const playNovaAudio = async (audioBase64: string) => {
    try {
      setNovaIsPlaying(true);
      
      const audioBlob = new Blob([Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setNovaIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
        
        // Restart recording after 1 second
        setTimeout(() => {
          if (!novaIsPlaying) {
            startNovaRecording();
          }
        }, 1000);
      };
      
      await audio.play();
    } catch (error) {
      console.error('Failed to play Nova audio:', error);
      setNovaIsPlaying(false);
    }
  };

  // OpenAI Real-Time Functions
  const startOpenAISession = async () => {
    try {
      const response = await fetch('/api/openai-realtime/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOpenaiSessionId(data.session_id);
        setOpenaiConversation([{role: 'system', content: 'OpenAI Real-Time session started'}]);
        setOpenaiIsConnected(true);
        startOpenAIRecording();
      }
    } catch (error) {
      console.error('Failed to start OpenAI session:', error);
    }
  };

  const startOpenAIRecording = async () => {
    if (!openaiSessionId) return;

    try {
      // Request audio with specific constraints for PCM compatibility
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,  // OpenAI expects 24kHz
          channelCount: 1,    // Mono
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      // Set up voice activity detection for 1.5-second silence
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Store in refs so they persist
      openaiAnalyserRef.current = analyser;
      openaiDataArrayRef.current = dataArray;
      openaiSilenceStartRef.current = null;
      openaiIsProcessingRef.current = false;
      openaiAudioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=pcm'  // Try PCM if available
      });
      openaiMediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          openaiAudioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (openaiAudioChunksRef.current.length > 0 && !openaiIsProcessingRef.current) {
          openaiIsProcessingRef.current = true;
          const audioBlob = new Blob(openaiAudioChunksRef.current, { type: 'audio/webm' });
          await sendOpenAIAudioFast(audioBlob);
          openaiAudioChunksRef.current = [];
          openaiIsProcessingRef.current = false;
          
          // Restart recording immediately for continuous conversation
          if (openaiIsConnected) {
            setTimeout(() => startOpenAIRecording(), 100);
          }
        }
      };

      // Start recording in small chunks for real-time processing
      mediaRecorder.start(250);
      setOpenaiIsRecording(true);
      
      // Start voice activity detection
      detectOpenAIVoiceActivity();
      
    } catch (error) {
      console.error('Failed to start OpenAI recording:', error);
    }
  };

  // Separate voice detection function that uses refs
  const detectOpenAIVoiceActivity = () => {
    if (!openaiIsRecording || !openaiAnalyserRef.current || !openaiDataArrayRef.current) return;
    
    openaiAnalyserRef.current.getByteFrequencyData(openaiDataArrayRef.current);
    const average = openaiDataArrayRef.current.reduce((a, b) => a + b) / openaiDataArrayRef.current.length;
    
    if (average > 20) { // Voice detected
      openaiSilenceStartRef.current = null;
      console.log(`🎤 Voice detected (level: ${average.toFixed(1)})`);
    } else { // Silence detected
      if (openaiSilenceStartRef.current === null) {
        openaiSilenceStartRef.current = Date.now();
      } else if (Date.now() - openaiSilenceStartRef.current > 1500) { // 1.5 seconds of silence
        if (openaiMediaRecorderRef.current?.state === 'recording' && 
            !openaiIsProcessingRef.current && 
            openaiAudioChunksRef.current.length > 0) {
          console.log(`🔇 1.5 seconds of silence detected, sending ${openaiAudioChunksRef.current.length} audio chunks...`);
          openaiMediaRecorderRef.current.stop();
          setOpenaiIsRecording(false);
          return; // Stop the detection loop
        }
      }
    }
    
    // Continue detection
    requestAnimationFrame(detectOpenAIVoiceActivity);
  };

  const sendOpenAIAudioFast = async (audioBlob: Blob) => {
    if (!openaiSessionId) return;

    // Generate unique request ID
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if there's already a request processing
    if (openaiCurrentRequestRef.current) {
      console.log(`⚠️ Skipping request ${requestId} - another request is already processing: ${openaiCurrentRequestRef.current}`);
      return;
    }

    // Set current request
    openaiCurrentRequestRef.current = requestId;

    const startTime = Date.now();
    console.log(`⚡ Starting ultra-fast OpenAI processing... (Request: ${requestId}, Audio: ${audioBlob.size} bytes)`);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          
          const response = await fetch('/api/openai-realtime/stream-audio-fast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: openaiSessionId,
              request_id: requestId,
              audio: base64Audio
            })
          });

          if (response.ok) {
            const data = await response.json();
            const processingTime = Date.now() - startTime;
            console.log(`🚀 OpenAI response received in ${processingTime}ms (Request: ${requestId})`);
            
            // Only process if this is still the current request
            if (openaiCurrentRequestRef.current === requestId) {
              console.log(`✅ Processing response for current request: ${requestId}`);
              
              // Process responses
              if (data.responses && data.responses.length > 0) {
                console.log(`📦 Got ${data.responses.length} responses:`, data.responses);
                
                let userText = '';
                let assistantText = '';
                
                // Combine all partial responses
                data.responses.forEach((resp: any) => {
                  console.log(`🔍 Processing response:`, resp);
                  
                  // Only process complete responses to avoid duplication
                  if (resp.type === 'transcription' && resp.text) {
                    userText = resp.text; // Use complete transcription only
                  } else if (resp.type === 'response' && resp.text) {
                    assistantText = resp.text; // Use complete response only
                  }
                  
                  // Skip partial responses to avoid duplication
                  // Skip: 'transcription_partial' and 'response_partial'
                });
                
                // Add combined responses to conversation
                if (userText.trim()) {
                  console.log(`👤 Adding user message: "${userText.trim()}"`);
                  setOpenaiConversation(prev => [...prev, {role: 'user', content: userText.trim()}]);
                }
                if (assistantText.trim()) {
                  console.log(`🤖 Adding assistant message: "${assistantText.trim()}"`);
                  setOpenaiConversation(prev => [...prev, {role: 'assistant', content: assistantText.trim()}]);
                }
              } else {
                console.log(`⚠️ No responses received for request: ${requestId}`);
              }
            } else {
              console.log(`🗑️ Discarding outdated response (Request: ${requestId}, Current: ${openaiCurrentRequestRef.current})`);
            }
          } else {
            console.error(`❌ HTTP error ${response.status}:`, await response.text());
          }
        } catch (fetchError) {
          console.error('❌ Error in fetch request:', fetchError);
        } finally {
          // Clear current request if it matches
          if (openaiCurrentRequestRef.current === requestId) {
            openaiCurrentRequestRef.current = null;
            console.log(`🔓 Cleared request lock for: ${requestId}`);
          }
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Failed to send OpenAI audio:', error);
      // Clear current request on error
      if (openaiCurrentRequestRef.current === requestId) {
        openaiCurrentRequestRef.current = null;
        console.log(`🔓 Cleared request lock on error for: ${requestId}`);
      }
    }
  };

  const stopOpenAIRecording = () => {
    if (openaiMediaRecorderRef.current && openaiIsRecording) {
      openaiMediaRecorderRef.current.stop();
      setOpenaiIsRecording(false);
    }
  };

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default TestingSection;
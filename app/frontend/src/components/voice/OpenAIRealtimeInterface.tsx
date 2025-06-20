import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Square, Play, Pause } from 'lucide-react';

interface OpenAIRealtimeInterfaceProps {
  onTranscription?: (text: string) => void;
  onResponse?: (text: string) => void;
  className?: string;
}

const OpenAIRealtimeInterface: React.FC<OpenAIRealtimeInterfaceProps> = ({
  onTranscription,
  onResponse,
  className = ''
}) => {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Ready to start conversation');
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);

  // Refs for audio handling
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);

  // Start a new real-time session
  const startSession = useCallback(async () => {
    try {
      setStatus('Starting OpenAI Real-Time session...');
      
      const response = await fetch('/api/openai-realtime/start-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.session_id);
        setStatus('✅ Real-time session started! Say "Hi" to begin.');
        console.log('🎬 OpenAI Real-Time session started:', data.session_id);
      } else {
        setStatus(`❌ Failed to start session: ${data.error}`);
        console.error('Failed to start session:', data.error);
      }
    } catch (error) {
      setStatus(`❌ Error starting session: ${error}`);
      console.error('Error starting session:', error);
    }
  }, []);

  // Initialize session on component mount
  useEffect(() => {
    startSession();
    
    // Cleanup on unmount
    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, []);

  // End the real-time session
  const endSession = useCallback(async () => {
    if (!sessionId) return;

    try {
      await fetch('/api/openai-realtime/end-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      
      setSessionId(null);
      setStatus('Session ended');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }, [sessionId]);

  // Start recording audio
  const startRecording = useCallback(async () => {
    if (!sessionId) {
      await startSession();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        processAudioChunks();
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      setStatus('🎤 Listening... (speak now)');

      console.log('🎤 Started OpenAI Real-Time recording');

    } catch (error) {
      console.error('Error starting recording:', error);
      setStatus(`❌ Recording error: ${error}`);
    }
  }, [sessionId, startSession]);

  // Stop recording audio
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false;
      setStatus('🔄 Processing your speech...');
      console.log('⏹️ Stopped OpenAI Real-Time recording');
    }
  }, []);

  // Process audio chunks and send to OpenAI Real-Time API
  const processAudioChunks = useCallback(async () => {
    if (!sessionId || audioChunksRef.current.length === 0) return;

    try {
      setIsProcessing(true);
      
      // Combine audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64 for OpenAI Real-Time API
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      console.log('🎵 Sending audio to OpenAI Real-Time API, size:', base64Audio.length);

      // Send to OpenAI Real-Time API
      const response = await fetch('/api/openai-realtime/stream-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          audio: base64Audio
        }),
      });

      const data = await response.json();

      if (data.success && data.responses) {
        console.log('📨 Received OpenAI Real-Time responses:', data.responses.length);
        
        let transcription = '';
        let aiResponse = '';

        // Process responses
        for (const responseItem of data.responses) {
          console.log('📄 Processing response:', responseItem.type, responseItem.role);

          if (responseItem.type === 'transcription' && responseItem.role === 'USER') {
            transcription = responseItem.content;
            console.log('🎤 User said:', transcription);
            
            // Add to conversation history
            setConversationHistory(prev => [...prev, { role: 'USER', content: transcription }]);
            
            // Call callback
            if (onTranscription) {
              onTranscription(transcription);
            }
          }
          
          else if (responseItem.type === 'text_complete' && responseItem.role === 'ASSISTANT') {
            aiResponse = responseItem.content;
            console.log('🤖 AI responded:', aiResponse);
            
            // Add to conversation history
            setConversationHistory(prev => [...prev, { role: 'ASSISTANT', content: aiResponse }]);
            
            // Call callback
            if (onResponse) {
              onResponse(aiResponse);
            }
          }
        }

        // Use browser speech synthesis for now
        if (aiResponse) {
          speakText(aiResponse);
        }

        setStatus('✅ Ready for next input - say something!');

      } else {
        console.error('OpenAI Real-Time API error:', data.error);
        setStatus(`❌ API Error: ${data.error}`);
      }

    } catch (error) {
      console.error('Error processing audio:', error);
      setStatus(`❌ Processing error: ${error}`);
    } finally {
      setIsProcessing(false);
      audioChunksRef.current = [];
    }
  }, [sessionId, onTranscription, onResponse]);

  // Text-to-speech using browser API
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;

      utterance.onstart = () => {
        setIsPlaying(true);
        setStatus('🔊 AI is speaking...');
      };

      utterance.onend = () => {
        setIsPlaying(false);
        setStatus('✅ Ready for next input - say something!');
        
        // Auto-start recording
        setTimeout(() => {
          if (!isRecordingRef.current) {
            startRecording();
          }
        }, 500);
      };

      speechSynthesis.speak(utterance);
      console.log('🔊 Using browser speech synthesis');
    }
  }, [startRecording]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className={`openai-realtime-interface ${className}`}>
      {/* Status Display */}
      <div className="mb-4 p-3 bg-gray-100 rounded-lg">
        <p className="text-sm text-gray-700">{status}</p>
        {sessionId && (
          <p className="text-xs text-gray-500 mt-1">Session: {sessionId.slice(0, 8)}...</p>
        )}
      </div>

      {/* Main Control Button */}
      <div className="flex justify-center mb-4">
        <button
          onClick={toggleRecording}
          disabled={isProcessing || !sessionId}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-lg
            transition-all duration-200 transform hover:scale-105 disabled:opacity-50
            ${isRecording 
              ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
          `}
        >
          {isProcessing ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          ) : isRecording ? (
            <Square size={32} />
          ) : (
            <Mic size={32} />
          )}
        </button>
      </div>

      {/* Audio Status */}
      {isPlaying && (
        <div className="flex justify-center mb-4">
          <div className="flex items-center space-x-2 text-green-600">
            <Play size={16} />
            <span className="text-sm">AI is speaking...</span>
          </div>
        </div>
      )}

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="mt-6 max-h-60 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Conversation</h3>
          <div className="space-y-2">
            {conversationHistory.map((item, index) => (
              <div 
                key={index}
                className={`p-2 rounded text-sm ${
                  item.role === 'USER' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}
              >
                <strong>{item.role === 'USER' ? 'You:' : 'AI:'}</strong> {item.content}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 text-xs text-gray-500">
        <p>• Click the microphone to start/stop recording</p>
        <p>• OpenAI Real-Time API handles voice-to-voice conversation</p>
        <p>• Supports interruption and real-time streaming</p>
      </div>
    </div>
  );
};

export default OpenAIRealtimeInterface;

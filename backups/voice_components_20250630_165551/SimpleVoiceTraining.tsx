import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface SimpleVoiceTrainingProps {
  onClose?: () => void;
}

export default function SimpleVoiceTraining({ onClose }: SimpleVoiceTrainingProps) {
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startListening = useCallback(async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
      setTranscript('Listening...');
    } catch (err) {
      setError('Failed to access microphone');
      console.error('Microphone error:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const processAudio = async (audioBlob: Blob) => {
    try {
      setTranscript('Processing...');
      
      // Convert audio to text using Deepgram STT
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      const sttResponse = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!sttResponse.ok) {
        throw new Error('Failed to transcribe audio');
      }
      
      const { transcript: transcriptText } = await sttResponse.json();
      setTranscript(transcriptText || 'No speech detected');
      
      if (transcriptText) {
        // Generate AI response
        await generateResponse(transcriptText);
      }
    } catch (err) {
      setError('Failed to process audio');
      console.error('Audio processing error:', err);
    }
  };

  const generateResponse = async (userText: string) => {
    try {
      setResponse('Generating response...');
      
      // Get AI response
      const aiResponse = await fetch('/api/voice/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userText,
          context: 'sales training scenario'
        })
      });
      
      if (!aiResponse.ok) {
        throw new Error('Failed to generate response');
      }
      
      const { response: responseText } = await aiResponse.json();
      setResponse(responseText);
      
      // Convert response to speech
      await speakResponse(responseText);
    } catch (err) {
      setError('Failed to generate response');
      console.error('Response generation error:', err);
    }
  };

  const speakResponse = async (text: string) => {
    try {
      setIsPlaying(true);
      
      const ttsResponse = await fetch('/api/voice/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (!ttsResponse.ok) {
        throw new Error('Failed to generate speech');
      }
      
      const audioBlob = await ttsResponse.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        setIsPlaying(false);
        setError('Failed to play audio');
      };
      
      await audio.play();
    } catch (err) {
      setIsPlaying(false);
      setError('Failed to play response');
      console.error('Speech synthesis error:', err);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl mx-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Voice Training Demo
            {onClose && (
              <Button variant="ghost" onClick={onClose}>
                ×
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Practice your sales pitch with AI feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          <div className="flex justify-center space-x-4">
            <Button
              onClick={isListening ? stopListening : startListening}
              disabled={isPlaying}
              className={`px-8 py-4 ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-5 h-5 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Start Recording
                </>
              )}
            </Button>
            
            {isPlaying && (
              <Button
                onClick={stopAudio}
                variant="outline"
                className="px-8 py-4"
              >
                <VolumeX className="w-5 h-5 mr-2" />
                Stop Audio
              </Button>
            )}
          </div>
          
          {transcript && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">What you said:</h3>
              <p className="text-gray-700">{transcript}</p>
            </div>
          )}
          
          {response && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center">
                AI Response:
                {isPlaying && <Volume2 className="w-4 h-4 ml-2 text-blue-500" />}
              </h3>
              <p className="text-gray-700">{response}</p>
            </div>
          )}
          
          <div className="text-center text-sm text-gray-500">
            Click "Start Recording" to begin your sales pitch practice
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
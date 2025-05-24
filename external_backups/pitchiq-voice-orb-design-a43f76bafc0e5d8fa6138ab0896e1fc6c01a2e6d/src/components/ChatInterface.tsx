import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, X, BarChart, PhoneOff } from 'lucide-react';
import VoiceOrb from './VoiceOrb';
import { useToast } from '@/hooks/use-toast';
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface MetricsData {
  clarity: number;
  confidence: number;
  engagement: number;
  keyPoints: number;
}

const ChatInterface: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState<MetricsData>({
    clarity: 0,
    confidence: 0,
    engagement: 0,
    keyPoints: 0
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up audio resources when component unmounts
  useEffect(() => {
    return () => {
      stopListening();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const startListening = async () => {
    try {
      // Request microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      
      // Create audio context if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Create analyzer for audio levels
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      // Connect microphone to analyzer
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;
      
      // Start analyzing audio levels
      const updateAudioLevel = () => {
        if (!analyserRef.current || !isListening) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average level
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Convert to 0-1 range (adjust divisor as needed for sensitivity)
        const normalizedLevel = Math.min(average / 128, 1);
        setAudioLevel(normalizedLevel);
        
        if (isListening) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
      setIsListening(true);
      
      // Initialize speech recognition
      startSpeechRecognition();
      
      toast({
        title: "Listening",
        description: "Microphone is now active",
      });
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice features",
        variant: "destructive",
      });
    }
  };

  const startSpeechRecognition = () => {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in this browser",
        variant: "destructive"
      });
      return;
    }
    
    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result: any) => result.transcript)
        .join('');
        
      // If this is a final result
      if (event.results[0].isFinal) {
        handleSpeechResult(transcript);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      stopListening();
    };
    
    recognition.onend = () => {
      if (isListening) {
        // Restart recognition if we're still in listening mode
        recognition.start();
      }
    };
    
    recognition.start();
    recognitionRef.current = recognition;
  };

  const handleSpeechResult = async (transcript: string) => {
    if (!transcript.trim()) return;
    
    // Add user message to chat
    addMessage(transcript, true);
    
    // Stop listening while processing
    stopListening();
    
    // Send to backend for processing
    await sendToBackend(transcript);
  };

  const sendToBackend = async (message: string) => {
    try {
      setIsSpeaking(true);
      
      // Replace with your actual API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.response) {
        // Add AI response to chat
        addMessage(data.response, false);
        
        // Update metrics if available
        if (data.metrics) {
          setMetrics({
            clarity: data.metrics.clarity || 0,
            confidence: data.metrics.confidence || 0,
            engagement: data.metrics.engagement || 0,
            keyPoints: data.metrics.keyPointsHit || 0
          });
        }
        
        // Speak the response
        speakResponse(data.response);
      }
    } catch (error) {
      console.error("Error communicating with backend:", error);
      toast({
        title: "Error",
        description: "Failed to communicate with the server",
        variant: "destructive"
      });
      setIsSpeaking(false);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = volume;
      
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        setIsSpeaking(false);
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Text-to-speech not supported in this browser');
      // Just add the message without speaking
      setIsSpeaking(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    setIsListening(false);
    setAudioLevel(0);
  };

  const toggleListening = () => {
    if (!isListening) {
      startListening();
    } else {
      stopListening();
    }
  };

  const addMessage = (text: string, isUser: boolean) => {
    setMessages(prev => [
      ...prev, 
      { 
        id: Date.now().toString(), 
        text, 
        isUser, 
        timestamp: new Date() 
      }
    ]);
  };

  const toggleVolume = () => {
    if (volume > 0) {
      setVolume(0);
      
      // Stop any ongoing speech
      if (isSpeaking && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    } else {
      setVolume(0.8);
    }
  };

  const toggleMetrics = () => {
    setShowMetrics(prev => !prev);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleEndCall = () => {
    // Stop all ongoing audio
    stopListening();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    
    // Clear messages or navigate away
    // window.location.href = '/'; // Uncomment to navigate to home
    
    toast({
      title: "Call ended",
      description: "Your practice session has ended"
    });
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-white relative">
      {/* End Call Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button 
          variant="destructive" 
          size="sm"
          className="rounded-full flex items-center gap-1"
          onClick={handleEndCall}
        >
          <PhoneOff size={16} /> End Call
        </Button>
      </div>
      
      {/* Top controls for chat/metrics */}
      <div className="flex justify-between items-center p-2 border-b bg-white">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full flex items-center gap-1 text-navy"
              >
                <MessageSquare size={16} /> Transcript
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] bg-white border-slate-200 text-slate-900">
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">Conversation Transcript</h2>
                  <SheetClose className="rounded-full p-1 hover:bg-slate-100">
                    <X size={18} />
                  </SheetClose>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-4">
                    {messages.map(message => (
                      <div 
                        key={message.id} 
                        className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] rounded-lg p-3 ${
                          message.isUser 
                            ? 'bg-red-600 text-white' 
                            : 'bg-navy-700 text-white'
                        }`}>
                          <p>{message.text}</p>
                          <p className={`text-xs mt-1 ${
                            message.isUser ? 'text-red-200' : 'text-blue-200'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <Button
            onClick={toggleMetrics} 
            variant={showMetrics ? "secondary" : "ghost"}
            size="sm"
            className="rounded-full flex items-center gap-1 text-navy"
          >
            <BarChart size={16} /> Metrics
          </Button>
        </div>
        
        <Button
          onClick={toggleVolume}
          variant="ghost"
          size="icon"
          className="rounded-full text-navy"
        >
          {volume > 0 ? (
            <Volume2 size={18} />
          ) : (
            <VolumeX size={18} />
          )}
        </Button>
      </div>
      
      {/* Live metrics (conditionally rendered) */}
      {showMetrics && (
        <div className="bg-white border-b p-2 flex items-center justify-center gap-4">
          <div className="w-full max-w-lg grid grid-cols-4 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Clarity</span>
                <span className="text-slate-700 font-medium">
                  {metrics.clarity ? `${Math.round(metrics.clarity * 100)}%` : '--'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-red-600 h-1.5 rounded-full" style={{ width: `${metrics.clarity * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Confidence</span>
                <span className="text-slate-700 font-medium">
                  {metrics.confidence ? `${Math.round(metrics.confidence * 100)}%` : '--'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-navy-700 h-1.5 rounded-full" style={{ width: `${metrics.confidence * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Engagement</span>
                <span className="text-slate-700 font-medium">
                  {metrics.engagement ? `${Math.round(metrics.engagement * 100)}%` : '--'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-navy-500 h-1.5 rounded-full" style={{ width: `${metrics.engagement * 100}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-500">Key Points</span>
                <span className="text-slate-700 font-medium">
                  {metrics.keyPoints ? `${metrics.keyPoints}/5` : '--'}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div className="bg-slate-700 h-1.5 rounded-full" style={{ width: `${(metrics.keyPoints / 5) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Main orb area */}
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="w-full h-full max-w-md max-h-md relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3/4 h-3/4">
              <VoiceOrb 
                isListening={isListening} 
                isSpeaking={isSpeaking} 
                audioLevel={audioLevel}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 bg-white border-t border-slate-200">
        <div className="flex justify-center space-x-6">
          <Button 
            onClick={toggleListening}
            variant={isListening ? "destructive" : "outline"}
            size="lg"
            className={`rounded-full h-16 w-16 flex items-center justify-center shadow-md border ${
              isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-white hover:bg-slate-100 border-slate-200'
            }`}
            disabled={isSpeaking}
          >
            {isListening ? <MicOff size={26} className="text-white" /> : <Mic size={26} className="text-navy-700" />}
          </Button>
        </div>
        
        <div className="mt-4 text-center text-sm text-slate-500">
          {isListening ? (
            <p>Listening... Speak now</p>
          ) : isSpeaking ? (
            <p>AI is speaking...</p>
          ) : (
            <p>Click the microphone to start speaking</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;

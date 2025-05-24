import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, MessageSquare, X, BarChart, PhoneOff } from 'lucide-react';
import VoiceOrb from './VoiceOrb';
import { useToast } from '@/components/ui/use-toast';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! I\'m Sarah, your AI sales training partner. How can I help you practice your sales pitch today?',
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [metrics, setMetrics] = useState<MetricsData>({
    clarity: 0.7,
    confidence: 0.6,
    engagement: 0.8,
    keyPoints: 0.5
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
      
      // Check if we have credentials/session cookies included
      const response = await fetch('/chat/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({ message })
      });
      
      // Log detailed information about the response for debugging
      console.log(`Response status: ${response.status}`);
      console.log(`Response headers:`, response.headers);
      
      if (!response.ok) {
        // Check if we're getting redirected to login
        if (response.status === 302 || response.status === 401) {
          window.location.href = '/auth/login';
          throw new Error('Authentication required. Redirecting to login...');
        }
        throw new Error(`Server responded with status: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Expected JSON response but got:', contentType);
        const text = await response.text();
        console.error('Response text:', text.substring(0, 500));
        throw new Error('Server response is not JSON');
      }
      
      const data = await response.json();
      console.log('API response:', data);
      
      // Extract response from the correct field in API response
      const aiResponse = data.response || data.content || "Sorry, I couldn't process that.";
      
      // Add AI response to chat
      addMessage(aiResponse, false);
      
      // Speak response if volume is not muted
      if (volume > 0) {
        speakResponse(aiResponse);
      } else {
        // If muted, don't speak but still update UI state
        setIsSpeaking(false);
      }
      
      // Update simulated metrics here
      setMetrics({
        clarity: Math.min(metrics.clarity + Math.random() * 0.1, 1),
        confidence: Math.min(metrics.confidence + Math.random() * 0.1, 1),
        engagement: Math.min(metrics.engagement + Math.random() * 0.05, 1),
        keyPoints: Math.min(metrics.keyPoints + Math.random() * 0.15, 1)
      });
      
    } catch (error) {
      console.error('Error sending message to backend:', error);
      toast({
        title: "Error",
        description: "Failed to communicate with the server. Please try again.",
        variant: "destructive"
      });
      
      // Ensure we're not stuck in speaking state
      setIsSpeaking(false);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
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
      
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
      toast({
        title: "Text-to-speech unavailable",
        description: "Your browser doesn't support speech synthesis",
        variant: "destructive"
      });
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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
    // Toggle between mute and previous volume
    if (volume === 0) {
      setVolume(0.8); // Restore to default volume
    } else {
      window.speechSynthesis.cancel(); // Stop current speech
      setVolume(0);
      setIsSpeaking(false);
    }
  };

  const toggleMetrics = () => {
    setShowMetrics(!showMetrics);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleEndCall = () => {
    console.log("Call ended by user. Simulating roleplay completion.");
    stopListening(); // Stop any active listening

    // 1. Set localStorage flags
    localStorage.setItem('pitchiq_new_analysis_pending', 'true'); // Using the exact key from Dashboard.tsx
    localStorage.setItem('ai_coach_has_completed_roleplay', 'true'); // Using the exact key

    // 2. Increment completed roleplays count
    const countKey = 'pitchiq_completed_roleplays_count'; // Using the exact key
    const currentCount = parseInt(localStorage.getItem(countKey) || '0', 10);
    localStorage.setItem(countKey, (currentCount + 1).toString());

    // ---- ADD THIS ----
    console.log('ChatInterface: NEW_ANALYSIS_PENDING set to', localStorage.getItem('pitchiq_new_analysis_pending'));
    console.log('ChatInterface: COMPLETED_ROLEPLAYS_COUNT set to', localStorage.getItem(countKey));
    // ---- END ADD ----

    // 3. Navigate back to the dashboard
    // In a real scenario, you might want to pass some session summary or ID
    navigate('/dashboard'); 
    
    toast({
      title: "Roleplay Ended",
      description: "Your session has concluded. Redirecting to dashboard for analysis.",
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white relative">
      <div className="flex-1 flex overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 flex flex-col relative">
          {/* Control buttons moved to top */}
          <div className="bg-slate-50 border-b border-slate-200 p-3 flex justify-end items-center">
        <div className="flex items-center gap-2">
          {/* Toggle performance metrics */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleMetrics}
            className={showMetrics ? "bg-slate-100" : ""}
          >
            <BarChart size={18} className="text-slate-700" />
          </Button>
          
          {/* Toggle volume */}
          <Button 
            variant="ghost"
            size="icon"
            onClick={toggleVolume}
          >
            {volume > 0 ? (
              <Volume2 size={18} className="text-slate-700" />
            ) : (
              <VolumeX size={18} className="text-slate-700" />
            )}
          </Button>
          
          {/* End call button */}
          <Button 
            variant="destructive"
            size="sm"
            onClick={handleEndCall}
            className="bg-red-500 hover:bg-red-600 ml-2"
          >
            <PhoneOff size={16} className="mr-1" /> End
          </Button>
        </div>
      </div>
      
          {/* Chat messages */}
          <div className="flex-1 p-4 overflow-y-auto">
            {messages.map(message => (
              <div 
                key={message.id} 
                className={`mb-4 max-w-3xl ${message.isUser ? 'ml-auto' : 'mr-auto'}`}
              >
                <div className={`rounded-2xl p-3 ${message.isUser 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-slate-100 text-slate-800'}`}
                >
                  {message.text}
                </div>
                <div className={`text-xs mt-1 text-slate-500 ${message.isUser ? 'text-right' : ''}`}>
                  {formatTime(message.timestamp)}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Voice orb container */}
          <div className="flex-shrink-0 h-48 border-t border-slate-200 flex items-center justify-center relative">
            <div className="w-32 h-32">
              <VoiceOrb 
                isListening={isListening} 
                isSpeaking={isSpeaking} 
                audioLevel={audioLevel}
              />
            </div>
            
            {/* Microphone toggle button */}
            <Button
              variant={isListening ? "destructive" : "default"}
              size="lg"
              className="absolute bottom-6 shadow-md"
              onClick={toggleListening}
            >
              {isListening ? (
                <>
                  <MicOff size={16} className="mr-2" /> Stop
                </>
              ) : (
                <>
                  <Mic size={16} className="mr-2" /> Speak
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Performance metrics panel (slide-in)*/}
        {showMetrics && (
          <div className="w-72 border-l border-slate-200 bg-white p-4 overflow-y-auto">
            <h3 className="font-semibold text-slate-900 mb-4">Performance Metrics</h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Clarity</span>
                  <span className="text-slate-700 font-medium">{Math.round(metrics.clarity * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div 
                    className="bg-red-600 h-1.5 rounded-full" 
                    style={{ width: `${metrics.clarity * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Confidence</span>
                  <span className="text-slate-700 font-medium">{Math.round(metrics.confidence * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div 
                    className="bg-red-600 h-1.5 rounded-full" 
                    style={{ width: `${metrics.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Engagement</span>
                  <span className="text-slate-700 font-medium">{Math.round(metrics.engagement * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div 
                    className="bg-red-600 h-1.5 rounded-full" 
                    style={{ width: `${metrics.engagement * 100}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500">Key Points</span>
                  <span className="text-slate-700 font-medium">{Math.round(metrics.keyPoints * 100)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div 
                    className="bg-red-600 h-1.5 rounded-full" 
                    style={{ width: `${metrics.keyPoints * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface; 
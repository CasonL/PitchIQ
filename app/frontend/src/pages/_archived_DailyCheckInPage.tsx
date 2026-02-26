import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Upload, X } from 'lucide-react';

type SpiralStep = 'question' | 'tentative-read' | 'force-artifact' | 'freeze' | 'correct' | 'perform' | 'outcome';

interface SpiralState {
  step: SpiralStep;
  clarificationCount: number;
  provisionalOffer: string;
  targetPerson: string;
  draftMessage: string;
  didSend: boolean | null;
}

interface Message {
  role: 'coach' | 'user';
  content: string;
  timestamp: Date;
}

export default function DailyCheckInPage() {
  const [spiral, setSpiral] = useState<SpiralState>({
    step: 'question',
    clarificationCount: 0,
    provisionalOffer: '',
    targetPerson: '',
    draftMessage: '',
    didSend: null
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'coach',
      content: "What's the next selling step you're avoiding?",
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'coach' | 'user', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }]);
  };

  const handleUserResponse = (response: string) => {
    if (!response.trim()) return;
    
    addMessage('user', response);
    setUserInput('');
    setIsProcessing(true);
    
    setTimeout(() => {
      processSpiral(response);
      setIsProcessing(false);
    }, 1000);
  };

  const processSpiral = async (response: string) => {
    try {
      // Call backend API with LLM-based understanding
      const result = await fetch('/api/action-referee/process-turn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response: response,
          step: spiral.step,
          state: {
            targetPerson: spiral.targetPerson,
            provisionalOffer: spiral.provisionalOffer,
            draftMessage: spiral.draftMessage
          },
          clarificationCount: spiral.clarificationCount
        })
      });

      if (!result.ok) {
        throw new Error('Failed to process turn');
      }

      const data = await result.json();
      
      // Add coach response
      addMessage('coach', data.coach_response);
      
      // Update spiral state based on response
      if (data.next_step === 'abort') {
        // Reset spiral
        handleMisfit();
        return;
      }
      
      // Update spiral state
      const newState: SpiralState = {
        ...spiral,
        step: data.next_step,
        clarificationCount: data.incrementClarification 
          ? spiral.clarificationCount + 1 
          : spiral.clarificationCount,
        targetPerson: data.state?.targetPerson || spiral.targetPerson,
        provisionalOffer: data.state?.provisionalOffer || spiral.provisionalOffer,
        draftMessage: data.state?.draftMessage || spiral.draftMessage
      };
      
      setSpiral(newState);
      
    } catch (error) {
      console.error('Error processing spiral:', error);
      addMessage('coach', 'Something went wrong. Let me try again. What\'s the next selling step you\'re avoiding?');
    }
  };
  

  const handleMisfit = () => {
    addMessage('coach', "Okay. This isn't hesitation at the ask. Different block. Let's reset.");
    setSpiral({
      step: 'question',
      clarificationCount: 0,
      provisionalOffer: '',
      targetPerson: '',
      draftMessage: '',
      didSend: null
    });
    setTimeout(() => {
      addMessage('coach', "What's the next selling step you're avoiding?");
    }, 1500);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      addMessage('coach', "I couldn't access your microphone. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMarkAsSent = () => {
    setSpiral({ ...spiral, didSend: true, step: 'outcome' });
    addMessage('user', "I sent it");
    addMessage('coach', "Good. That's what matters. Check in tomorrow.");
  };
  
  const handleDidntSend = () => {
    setSpiral({ ...spiral, didSend: false, step: 'outcome' });
    addMessage('user', "I didn't send it");
    addMessage('coach', "Why not? What stopped you?");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center p-4">
      {/* Main Container */}
      <div className="w-full max-w-2xl">
        {/* Glass Card */}
        <div className="bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 border-b border-white/20 bg-white/30">
            <h1 className="text-2xl font-light text-gray-900 tracking-tight">Daily Check-In</h1>
            <p className="text-sm text-gray-500 mt-1 font-light">with Sam</p>
          </div>

          {/* Messages Container */}
          <div className="px-8 py-6 space-y-6 max-h-[500px] overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                    message.role === 'coach'
                      ? 'bg-white/60 backdrop-blur-sm border border-white/40 text-gray-900'
                      : 'bg-gray-900/80 backdrop-blur-sm text-white'
                  }`}
                >
                  <p className="text-sm font-light leading-relaxed whitespace-pre-line">
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl px-6 py-4">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="px-8 py-6 border-t border-white/20 bg-white/20">
            {/* Text input for spiral steps */}
            {spiral.step !== 'perform' && spiral.step !== 'outcome' && (
              <div className="space-y-3">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleUserResponse(userInput);
                    }
                  }}
                  placeholder="Type your response..."
                  className="w-full px-6 py-4 bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl text-gray-900 placeholder-gray-400 font-light resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-transparent"
                  rows={3}
                  disabled={isProcessing}
                />
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleUserResponse(userInput)}
                    disabled={!userInput.trim() || isProcessing}
                    className="flex-1 py-3 px-6 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-light transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Send size={18} />
                    <span>Send</span>
                  </button>
                  {spiral.clarificationCount >= 2 && (
                    <button
                      onClick={handleMisfit}
                      className="py-3 px-6 bg-white/40 hover:bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-600 font-light transition-all duration-200 text-sm"
                    >
                      Not my issue
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Voice recording for 'perform' step */}
            {spiral.step === 'perform' && (
              <div className="space-y-4">
                <div className="text-center">
                  {!isRecording && !audioBlob && (
                    <button
                      onClick={startRecording}
                      className="w-32 h-32 mx-auto bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:shadow-2xl hover:scale-105"
                    >
                      <Mic size={40} />
                    </button>
                  )}
                  
                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black rounded-full flex items-center justify-center text-white transition-all duration-200 hover:shadow-2xl animate-pulse"
                    >
                      <Square size={40} />
                    </button>
                  )}
                  
                  {audioBlob && (
                    <div className="space-y-4">
                      <div className="w-32 h-32 mx-auto bg-green-500/20 backdrop-blur-sm border-2 border-green-500 rounded-full flex items-center justify-center">
                        <div className="text-green-600 text-4xl">✓</div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-center text-sm text-gray-700 font-light">Now actually send it.</p>
                        <div className="flex space-x-3 justify-center">
                          <button
                            onClick={handleMarkAsSent}
                            className="py-3 px-8 bg-gray-900 hover:bg-gray-800 text-white rounded-2xl font-light transition-all duration-200"
                          >
                            I sent it
                          </button>
                          <button
                            onClick={handleDidntSend}
                            className="py-3 px-8 bg-white/40 hover:bg-white/60 backdrop-blur-sm border border-white/30 rounded-2xl text-gray-600 font-light transition-all duration-200"
                          >
                            I didn't send it
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-center text-sm text-gray-500 font-light">
                  {!isRecording && !audioBlob && "Tap to record"}
                  {isRecording && "Recording... tap to stop"}
                </p>
              </div>
            )}

            {/* Outcome state - session complete */}
            {spiral.step === 'outcome' && spiral.didSend !== null && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600 font-light">
                  Session complete. Outcome tracked: {spiral.didSend ? 'Sent ✓' : 'Not sent'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-400 font-light">
            Daily accountability • Immediate feedback • Micro-drills
          </p>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, BarChart } from 'lucide-react';
import DeepgramVoiceAgent from './DeepgramVoiceAgent';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [showMetrics, setShowMetrics] = useState(false);
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState("");

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

  const handleTranscriptUpdate = (transcript: string) => {
    setCurrentTranscript(transcript);
    // Add the transcript as a message when it's complete
    if (transcript && transcript.length > 5) {
      addMessage(transcript, false); // AI message
    }
  };

  const handleConnectionChange = (connected: boolean) => {
    setIsVoiceConnected(connected);
    if (connected) {
      addMessage("Voice chat started! You can now speak naturally.", false);
    } else {
      addMessage("Voice chat ended.", false);
    }
  };

  const toggleMetrics = () => {
    setShowMetrics(!showMetrics);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const mockMetrics: MetricsData = {
    clarity: 85,
    confidence: 78,
    engagement: 92,
    keyPoints: 6
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">AI Sales Coach</h2>
            <p className="text-sm text-gray-500">
              {isVoiceConnected ? "Voice chat active" : "Ready to help with your sales training"}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline"
            size="sm"
            onClick={toggleMetrics}
          >
            <BarChart className="w-4 h-4 mr-2" />
            Metrics
          </Button>
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm">
                <X className="w-4 h-4" />
          </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="py-4">
                <h3 className="text-lg font-semibold mb-4">End Session</h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to end this training session?
                </p>
                <div className="flex space-x-2">
                  <SheetClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </SheetClose>
          <Button 
                    onClick={() => navigate('/dashboard')}
                    className="bg-red-500 hover:bg-red-600 text-white"
          >
                    End Session
          </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Chat Messages */}
        <div className="flex-1 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Welcome to Voice Training
                </h3>
                <p className="text-gray-600 mb-4">
                  Start a voice conversation to practice your sales skills with AI coaching.
                </p>
              </div>
            ) : (
              messages.map((message) => (
              <div 
                key={message.id} 
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.isUser
                  ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.text}</p>
                    <p className={`text-xs mt-1 ${
                      message.isUser ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {/* Current transcript preview */}
            {currentTranscript && (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-yellow-100 text-gray-900 border-l-4 border-yellow-400">
                  <p className="text-sm italic">{currentTranscript}</p>
                  <p className="text-xs text-gray-500 mt-1">Speaking...</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Voice Controls */}
          <div className="border-t p-4 bg-gray-50">
            <DeepgramVoiceAgent
              showTranscript={false} // We handle transcript in chat
              onTranscriptUpdate={handleTranscriptUpdate}
              onConnectionChange={handleConnectionChange}
              className="w-full"
              buttonVariant="default"
              compact={false}
            />
          </div>
        </div>
        
        {/* Metrics Sidebar */}
        {showMetrics && (
          <div className="w-80 border-l bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Clarity</span>
                  <span>{mockMetrics.clarity}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${mockMetrics.clarity}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Confidence</span>
                  <span>{mockMetrics.confidence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${mockMetrics.confidence}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Engagement</span>
                  <span>{mockMetrics.engagement}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ width: `${mockMetrics.engagement}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-medium text-gray-900 mb-2">Session Summary</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Key Points Covered: {mockMetrics.keyPoints}</p>
                  <p>Session Duration: {isVoiceConnected ? "Active" : "Not started"}</p>
                  <p>Voice Quality: Excellent</p>
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
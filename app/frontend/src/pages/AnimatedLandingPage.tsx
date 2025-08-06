import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DualVoiceAgentFlow } from '@/components/voice/DualVoiceAgentFlow';
import UserDetailsGate from '@/components/common/UserDetailsGate';

const AnimatedLandingPage = () => {
  const [sessionData, setSessionData] = useState<any>(null);
  const [connectionState, setConnectionState] = useState<{ connected: boolean; connecting: boolean }>({ connected: false, connecting: false });

  // Handle dual voice agent flow completion
  const handleFlowComplete = (completedSessionData: any) => {
    console.log('🎉 Dual voice agent flow completed:', completedSessionData);
    setSessionData(completedSessionData);
  };

  return (
    <UserDetailsGate>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <Card className="w-full bg-white border border-gray-900 shadow-xl rounded-xl hover:shadow-2xl transition-all duration-200 overflow-hidden">
            <CardHeader className="bg-white p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-black">
                  <span className="font-outfit">Pitch</span><span className="font-saira text-red-600">IQ</span>
                </CardTitle>
                <Badge variant="secondary" className={`inline-flex items-center rounded-full border text-xs transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-secondary/80 ${connectionState.connecting ? 'bg-amber-500' : connectionState.connected ? 'bg-green-500' : 'bg-red-600'} text-white border-transparent font-medium px-3 py-1`}>
                  {connectionState.connecting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connecting
                    </span>
                  ) : connectionState.connected ? 'Voice Connected' : 'AI Demo'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 min-h-[600px] h-full flex flex-col relative">
              <DualVoiceAgentFlow 
                onFlowComplete={handleFlowComplete}
                onConnectionStateChange={setConnectionState}
                className="flex-1"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </UserDetailsGate>
  );
};

export default AnimatedLandingPage; 
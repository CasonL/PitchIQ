import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DualVoiceAgentFlow } from '@/components/voice/DualVoiceAgentFlow';
import UserDetailsGate from '@/components/common/UserDetailsGate';

const AnimatedLandingPage = () => {
  const [sessionData, setSessionData] = useState<any>(null);

  // Handle dual voice agent flow completion
  const handleFlowComplete = (completedSessionData: any) => {
    console.log('🎉 Dual voice agent flow completed:', completedSessionData);
    setSessionData(completedSessionData);
  };

  return (
    <UserDetailsGate>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <Card className="w-full bg-white border border-gray-900 shadow-xl rounded-xl hover:shadow-2xl transition-all duration-200 overflow-hidden">
            <CardHeader className="bg-white p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold text-black">
                  <span className="font-outfit">Pitch</span><span className="font-saira text-red-600">IQ</span>
                </CardTitle>
                <Badge variant="secondary" className="bg-red-600 text-white border-transparent font-medium px-3 py-1">
                  AI Demo
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-8 min-h-[600px] h-full flex flex-col relative">
              <DualVoiceAgentFlow 
                onFlowComplete={handleFlowComplete}
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
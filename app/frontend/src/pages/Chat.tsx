import React from 'react';
import { DualVoiceAgentInterface } from '@/components/voice/DualVoiceAgentInterface';
// import SimpleVoiceAgent from '@/components/voice/SimpleVoiceAgent';
import AppHeader from '@/components/AppHeader';

const Chat = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AppHeader />
      <div className="flex-grow flex items-center justify-center">
        <DualVoiceAgentInterface scenario={null} />
        {/* <SimpleVoiceAgent /> */}
      </div>
    </div>
  );
};

export default Chat; 
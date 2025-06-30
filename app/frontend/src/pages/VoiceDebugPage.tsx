import React from 'react';
import { DeepgramVoiceAgent } from '@/components/voice/DeepgramVoiceAgent';

const VoiceDebugPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <h1 className="text-2xl font-bold mb-4">Voice Debug Page</h1>
      <DeepgramVoiceAgent showLogs={true} showTranscript={true} />
    </div>
  );
};

export default VoiceDebugPage; 
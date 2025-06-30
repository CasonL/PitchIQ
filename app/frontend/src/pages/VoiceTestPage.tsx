import React from 'react';
import { DualVoiceAgentInterface } from '../components/voice/DualVoiceAgentInterface';
// import SimpleVoiceAgent from '../components/voice/SimpleVoiceAgent';

const VoiceTestPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Voice Agent Test Zone</h1>
        <p className="text-lg text-gray-600">
          A dedicated page for testing and debugging the voice agent components.
        </p>
      </header>
      
      <main>
        <DualVoiceAgentInterface scenario={null} />
        {/* <SimpleVoiceAgent className="mt-8" /> */}
      </main>

      <footer className="text-center mt-12 text-sm text-gray-500">
        <p>&copy; 2025 PitchIQ. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default VoiceTestPage; 
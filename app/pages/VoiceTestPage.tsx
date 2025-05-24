import React from 'react';
import VoiceContainer from '../components/voice/VoiceContainer';

/**
 * Test page for the voice interface
 */
const VoiceTestPage: React.FC = () => {
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-slate-800 text-white p-4">
        <h1 className="text-xl font-semibold">Voice Interface Test</h1>
      </header>
      
      <main className="flex-1 overflow-hidden">
        <VoiceContainer size={400} />
      </main>
      
      <footer className="bg-slate-100 p-3 text-center text-sm text-slate-500">
        <p>Voice interface implementation - Version 0.1</p>
      </footer>
    </div>
  );
};

export default VoiceTestPage; 
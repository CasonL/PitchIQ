/**
 * MarcusDemoFlow.tsx
 * Orchestrates the full Marcus demo experience: Lobby → Call → PostCall
 */

import React, { useState, useCallback, useEffect } from 'react';
import { MarcusLobby } from './MarcusLobby';
import { CharmerController } from './CharmerController';
import { MarcusPostCall } from './MarcusPostCall';
import { useSearchParams } from 'react-router-dom';
import { MARCUS_AI_MODELS } from './CharmerAIService';

type FlowStep = 'lobby' | 'call' | 'post-call';

interface MarcusDemoFlowProps {
  onComplete?: () => void;
  onStartTraining?: () => void;
}

export const MarcusDemoFlow: React.FC<MarcusDemoFlowProps> = ({
  onComplete,
  onStartTraining
}) => {
  const [searchParams] = useSearchParams();
  const autoStart = searchParams.get('autoStart') === 'true';
  
  const [currentStep, setCurrentStep] = useState<FlowStep>(autoStart ? 'call' : 'lobby');
  const [callData, setCallData] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<keyof typeof MARCUS_AI_MODELS>('gpt-4o-mini');

  // Handle lobby → call transition
  const handleStartCall = useCallback(() => {
    console.log('🎬 Starting Marcus call from lobby');
    setCurrentStep('call');
  }, []);

  // Handle call → post-call transition
  const handleCallComplete = useCallback((data: any) => {
    console.log('✅ Marcus call completed:', data);
    setCallData(data);
    setCurrentStep('post-call');
  }, []);

  // Handle try again (post-call → lobby)
  const handleTryAgain = useCallback(() => {
    console.log('🔄 Restarting Marcus demo');
    setCallData(null);
    setCurrentStep('lobby');
  }, []);

  // Handle start training CTA
  const handleStartTraining = useCallback(() => {
    console.log('🚀 User clicked start training');
    if (onStartTraining) {
      onStartTraining();
    } else {
      // Default: navigate to training page
      window.location.href = '/dashboard'; // or wherever training lives
    }
  }, [onStartTraining]);

  // Render current step
  switch (currentStep) {
    case 'lobby':
      return (
        <MarcusLobby 
          onStartCall={handleStartCall}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      );
    
    case 'call':
      return (
        <CharmerController
          onCallComplete={handleCallComplete}
          autoStart={true}
          aiModel={selectedModel}
        />
      );
    
    case 'post-call':
      return callData ? (
        <MarcusPostCall
          callData={callData}
          onTryAgain={handleTryAgain}
          onStartTraining={handleStartTraining}
        />
      ) : (
        <div>Loading...</div>
      );
    
    default:
      return <div>Unknown step</div>;
  }
};

export default MarcusDemoFlow;

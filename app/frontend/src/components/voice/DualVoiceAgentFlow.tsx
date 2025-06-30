import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import SamCoachAgent from './SamCoachAgent';
import { PersonaGenerationCard } from './PersonaGenerationCard';
import { ProspectAgent } from './ProspectAgent';
import { PersonaDisplayCard } from './PersonaDisplayCard';
import { useUser } from '@/components/common/UserDetailsGate';

export interface PersonaData {
  name: string;
  role: string;
  company: string;
  industry: string;
  primary_concern: string;
  business_details: string;
  about_person: string;
  pain_points: string[];
  decision_factors: string[];
  communication_style: string;
}

export interface UserProductInfo {
  product: string;
  target_market: string;
  key_benefits?: string;
  pricing_model?: string;
}

type FlowStage = 'sam-intro' | 'persona-generation' | 'persona-display' | 'prospect-call' | 'call-complete';

interface DualVoiceAgentFlowProps {
  onFlowComplete?: (sessionData: any) => void;
  className?: string;
}

export const DualVoiceAgentFlow: React.FC<DualVoiceAgentFlowProps> = ({
  onFlowComplete,
  className = ''
}) => {
  const { user } = useUser();
  const [currentStage, setCurrentStage] = useState<FlowStage>('sam-intro');
  const [userProductInfo, setUserProductInfo] = useState<UserProductInfo | null>(null);
  const [generatedPersona, setGeneratedPersona] = useState<PersonaData | null>(null);
  const [sessionData, setSessionData] = useState<any>({});
  const [samStarted, setSamStarted] = useState(false);

  // Get user's first name with fallback logic
  const getUserFirstName = () => {
    if (user?.firstName && user.firstName.trim()) {
      return user.firstName.trim();
    }
    if (user?.fullName && user.fullName.trim()) {
      return user.fullName.trim().split(' ')[0];
    }
    return null;
  };

  // Handle starting Sam's session
  const handleStartSam = () => {
    setSamStarted(true);
  };

  // Handle Sam's conversation completion
  const handleSamComplete = (productInfo: UserProductInfo) => {
    console.log('🎯 Sam completed, product info:', productInfo);
    setUserProductInfo(productInfo);
    setCurrentStage('persona-generation');
  };

  // Handle persona generation completion
  const handlePersonaGenerated = (persona: PersonaData) => {
    console.log('👤 Persona generated:', persona);
    setGeneratedPersona(persona);
    setCurrentStage('persona-display');
  };

  // Handle starting the prospect call
  const handleStartProspectCall = () => {
    console.log('📞 Starting prospect call');
    setCurrentStage('prospect-call');
  };

  // Handle prospect call completion
  const handleProspectCallComplete = (callData: any) => {
    console.log('✅ Prospect call completed:', callData);
    const finalSessionData = {
      userProductInfo,
      generatedPersona,
      callData,
      completedAt: new Date().toISOString()
    };
    setSessionData(finalSessionData);
    setCurrentStage('call-complete');
    
    if (onFlowComplete) {
      onFlowComplete(finalSessionData);
    }
  };

  // Reset the entire flow
  const handleReset = () => {
    setCurrentStage('sam-intro');
    setUserProductInfo(null);
    setGeneratedPersona(null);
    setSessionData({});
    setSamStarted(false);
  };

  return (
    <div className={`flex-1 flex flex-col ${className}`}>
      {/* Stage: Sam Introduction & Product Discovery */}
      {currentStage === 'sam-intro' && (
        <>
          {samStarted ? (
            <SamCoachAgent />
          ) : (
            /* Start Demo Button - positioned closer to arrow */
            <div className="flex-1 flex flex-col items-center justify-center space-y-2">
              <div className="animate-bounce">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-black">
                  <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <Button 
                onClick={handleStartSam}
                className="bg-white hover:bg-gray-100 text-black border border-gray-900 px-8 py-4 text-base font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                Start Demo
              </Button>
            </div>
          )}
        </>
      )}

      {/* Stage: Persona Generation Loading */}
      {currentStage === 'persona-generation' && (
        <PersonaGenerationCard
          userProductInfo={userProductInfo!}
          onPersonaGenerated={handlePersonaGenerated}
          onError={(error) => {
            console.error('Persona generation failed:', error);
            // Could add error handling UI here
          }}
        />
      )}

      {/* Stage: Display Generated Persona */}
      {currentStage === 'persona-display' && (
        <PersonaDisplayCard
          persona={generatedPersona!}
          userProductInfo={userProductInfo!}
          onStartCall={handleStartProspectCall}
          onRegenerate={() => setCurrentStage('persona-generation')}
        />
      )}

      {/* Stage: Prospect Call */}
      {currentStage === 'prospect-call' && (
        <ProspectAgent
          persona={generatedPersona!}
          userProductInfo={userProductInfo!}
          onCallComplete={handleProspectCallComplete}
          onEndCall={() => setCurrentStage('persona-display')}
        />
      )}

      {/* Stage: Call Complete */}
      {currentStage === 'call-complete' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="text-2xl font-semibold text-green-600">
            🎉 Training Session Complete!
          </div>
          <div className="text-gray-600 max-w-md">
            Great job! You've completed a full sales training session with your AI prospect.
          </div>
          <div className="flex space-x-4">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start New Session
            </button>
            {onFlowComplete && (
              <button
                onClick={() => onFlowComplete(sessionData)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                View Results
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DualVoiceAgentFlow; 
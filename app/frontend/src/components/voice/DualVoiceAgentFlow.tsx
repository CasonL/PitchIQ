import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { CompanyPackage } from '@/lib/companySchema';
import { loadCompany } from '@/lib/companyLoader';
import SamCoachAgent from './SamCoachAgent';
import PersonaGenerationCard from './PersonaGenerationCard';
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
  communication_style: string | {
    formality_description?: string;
    chattiness_description?: string;
    emotional_description?: string;
  };
  
  // Additional fields from comprehensive bias prevention system
  gender?: string;
  cultural_background?: string;
  age_range?: string;
  business_context?: string;
  emotional_state?: string;
  decision_authority?: string;
  objections?: string[];
  industry_context?: string;
  contextual_fears?: any;
  conversation_flow_guidance?: string;
  ai_prompt_guidance?: string;
  voice_optimized_prompt?: string;
  emotional_authenticity?: any;
  communication_struggles?: any;
  vulnerability_areas?: any;

  // Rich company context for in-call recognition
  company_overview?: string;
  recent_milestones?: string[];
  strategic_priorities?: string[];
  public_challenges?: string[];
  /** Distinct personality quirks, e.g. "Blunt, impatient, slightly sarcastic" */
  personality_traits?: string;
  surface_business_info?: string;
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
  onConnectionStateChange?: (state: { connected: boolean; connecting: boolean }) => void;
  className?: string;
}

export const DualVoiceAgentFlow: React.FC<DualVoiceAgentFlowProps> = ({
  onFlowComplete,
  onConnectionStateChange,
  className = ''
}) => {
  const userDetails = useUser();
  const [currentStage, setCurrentStage] = useState<FlowStage>('sam-intro');
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [userProductInfo, setUserProductInfo] = useState<UserProductInfo | null>(null);
  const [generatedPersona, setGeneratedPersona] = useState<PersonaData | null>(null);
  const [companyPkg, setCompanyPkg] = useState<CompanyPackage | null>(null);
  const [sessionData, setSessionData] = useState<any>({});
  const [samStarted, setSamStarted] = useState(false);
  const [connectionState, setConnectionState] = useState<{ connected: boolean; connecting: boolean }>({ connected: false, connecting: false });

  // Propagate connection state changes to parent component
  useEffect(() => {
    if (onConnectionStateChange) {
      onConnectionStateChange(connectionState);
    }
  }, [connectionState, onConnectionStateChange]);

  // Get user's first name with fallback logic
  const getUserFirstName = () => {
    if (userDetails?.fullName && userDetails.fullName.trim()) {
      return userDetails.fullName.trim().split(' ')[0];
    }
    return null;
  };

  // Handle starting Sam's session
  const handleStartSam = () => {
    setSamStarted(true);
  };

  // Handle Sam's conversation completion
  const handleSamComplete = (data: { product_service: string; target_market: string }) => {
    console.log('🎯 Sam completed, data:', data);
    // Convert to UserProductInfo format
    const productInfo: UserProductInfo = {
      product: data.product_service,
      target_market: data.target_market
    };
    setUserProductInfo(productInfo);
    // For MVP use hard-coded company id – later allow picker
    loadCompany('cloudlift_saas_mm_01').then(setCompanyPkg).catch(console.error);
    setCurrentStage('persona-generation');
  };

  // Handle persona generation completion
  const handlePersonaGenerated = (persona: PersonaData) => {
    console.log('👤 Persona generated:', persona);
    setGeneratedPersona(persona);
    setCurrentStage('persona-display');
  };

  // Handle starting the prospect call with a smooth transition
  const handleStartProspectCall = useCallback(() => {
    console.log('📞 Starting prospect call with transition');
    setIsTransitioning(true);
    
    // First ensure that Sam's session is properly cleaned up
    console.log('🧹 Ensuring Sam session cleanup before starting prospect');
    
    // Longer delay to ensure proper cleanup of audio resources between agent transitions
    // This prevents microphone resource conflicts causing CLIENT_MESSAGE_TIMEOUT
    setTimeout(() => {
      console.log('🔍 Audio resources cleanup verification');
      
      // Additional delay after cleanup check before proceeding with new agent
      setTimeout(() => {
        console.log('🚀 Starting ProspectAgent after verified cleanup');
        setCurrentStage('prospect-call');
        setIsTransitioning(false);
      }, 500); // Delay after cleanup verification
      
    }, 1500); // Increased delay for thorough cleanup
  }, []);

  // Handle prospect end (hang up)
  const handleProspectEnd = () => {
    setCurrentStage('persona-display');
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
            <SamCoachAgent 
              onDataCollected={handleSamComplete} 
              onConnectionStateChange={setConnectionState}
              autoStart={true}
            />
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
          autoStart={true}
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
      {currentStage === 'prospect-call' && generatedPersona && userProductInfo && (
        <ProspectAgent
          persona={generatedPersona}
          userProductInfo={userProductInfo}
          company={companyPkg ?? undefined}
          onCallComplete={handleProspectCallComplete}
          onEndCall={handleProspectEnd}
          autoStart={true} /* Auto-start call when component mounts */
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
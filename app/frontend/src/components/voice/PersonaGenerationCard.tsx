import React, { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { PersonaData } from './DualVoiceAgentFlow';
import { ProspectCallEventBus } from './ProspectCallEventBus';

interface PersonaGenerationCardProps {
  userProductInfo: {
    product: string;
    target_market: string;
  };
  onPersonaGenerated: (persona: PersonaData) => void;
  onError?: (error: string) => void;
  autoStart?: boolean;
}

const PersonaGenerationCard: React.FC<PersonaGenerationCardProps> = ({
  userProductInfo,
  onPersonaGenerated,
  onError,
  autoStart = false
}) => {
  console.log('🎨 PersonaGenerationCard component rendered with props:', {
    userProductInfo,
    autoStart,
    hasOnPersonaGenerated: !!onPersonaGenerated,
    hasOnError: !!onError
  });

  // Simplified state - single progress indicator instead of multiple stages
  const [progress, setProgress] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<string>('Creating your perfect prospect...');
  const hasGeneratedRef = useRef(false);
  const eventBusRef = useRef(ProspectCallEventBus.getInstance());
  const autoStartInitialized = useRef(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiCallRef = useRef<boolean>(false);
  
  // Start generation when triggered by user
  const startGeneration = () => {
    if (hasGeneratedRef.current || isGenerating) return;
    setIsGenerating(true);
    setProgress(0);
  };

  // Register to global event bus for persona status updates
  useEffect(() => {
    const eventBus = eventBusRef.current;
    const handleProgressUpdate = (data: any) => {
      console.log('📊 Progress update received:', data);
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }
      if (data.message) {
        setMessage(data.message);
      }
    };

    eventBus.on('persona-progress', handleProgressUpdate);
    return () => {
      eventBus.off('persona-progress', handleProgressUpdate);
    };
  }, []);

  // Auto-start generation when autoStart is true
  useEffect(() => {
    if (!autoStart || autoStartInitialized.current || hasGeneratedRef.current) return;
    
    console.log('🚀 Sophisticated persona generation check:', {
      autoStart,
      hasGenerated: hasGeneratedRef.current
    });

    if (userProductInfo.product) {
      autoStartInitialized.current = true;
      console.log('🎯 Starting sophisticated AI persona generation...');
      generateSophisticatedPersona();
    } else {
      console.log('⚠️ Missing product info, cannot start persona generation:', userProductInfo);
    }
  }, [autoStart, userProductInfo.product, userProductInfo.target_market, onPersonaGenerated]);

  const generateSophisticatedPersona = async () => {
    if (hasGeneratedRef.current) return;
    
    try {
      // Reset progress and start generation
      setProgress(0);
      setMessage('Initializing AI persona generation...');
      setIsGenerating(true);
      hasGeneratedRef.current = true;
      apiCallRef.current = false;
      console.log('🚀 Starting persona generation - Progress reset to 0%');

      // Start smooth progress animation that runs independently
      startProgressAnimation();

      // Start API call after a short delay
      setTimeout(() => {
        makeAPICall();
      }, 500);

    } catch (error) {
      console.error('❌ Error in persona generation:', error);
      setMessage('Failed to generate persona. Please try again.');
      setIsGenerating(false);
      hasGeneratedRef.current = false;
    }
  };

  const startProgressAnimation = () => {
    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    const steps = [
      { progress: 15, message: 'Analyzing your business...', delay: 800 },
      { progress: 30, message: 'Understanding your market...', delay: 1600 },
      { progress: 50, message: 'AI crafting detailed persona...', delay: 2400 },
      { progress: 70, message: 'Generating personality traits...', delay: 3200 },
      { progress: 85, message: 'Finalizing behavioral patterns...', delay: 4000 },
      { progress: 95, message: 'Almost ready...', delay: 4800 }
    ];

    steps.forEach(({ progress: targetProgress, message: stepMessage, delay }) => {
      setTimeout(() => {
        // Only update if API hasn't completed yet
        if (!apiCallRef.current) {
          console.log(`🔄 Progress update: ${targetProgress}% - ${stepMessage}`);
          setProgress(targetProgress);
          setMessage(stepMessage);
        }
      }, delay);
    });
  };

  const makeAPICall = async () => {
    try {
      console.log('🤖 Calling sophisticated persona generation API...');
      console.log('📝 Request payload:', {
        product_service: userProductInfo.product,
        target_market: userProductInfo.target_market || 'Business professionals'
      });

      const response = await fetch('/api/demo/generate-persona', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_service: userProductInfo.product,
          target_market: userProductInfo.target_market || 'Business professionals'
        })
      });

      console.log('📞 API response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Sophisticated persona data received:', data);
      console.log('🔍 Full API response details:');
      console.log('  - Success:', data.success);
      console.log('  - Has persona:', !!data.persona);
      console.log('  - Persona keys:', data.persona ? Object.keys(data.persona) : 'none');

      if (!data.success || !data.persona) {
        throw new Error(data.error || 'Failed to generate persona');
      }

      // Mark API as completed
      apiCallRef.current = true;

      // Complete progress to 100%
      setProgress(100);
      setMessage('Persona generated successfully!');
      console.log('✅ Progress completed: 100%');

      // Brief delay to show completion
      setTimeout(() => {
        // Transform the sophisticated API response to our PersonaData format
        const apiPersona = data.persona;
        const persona: PersonaData = {
          name: apiPersona.name || 'Alex Johnson',
          role: apiPersona.role || apiPersona.occupation || 'Decision Maker',
          company: apiPersona.company || apiPersona.company_name || 'TechCorp Inc.',
          industry: apiPersona.industry || 'Technology',
          primary_concern: apiPersona.primary_concern || apiPersona.main_challenge || 'Improving efficiency',
          business_details: apiPersona.business_details || apiPersona.background || 'Growing company',
          about_person: apiPersona.about_person || apiPersona.description || 'Experienced professional',
          pain_points: Array.isArray(apiPersona.pain_points) ? apiPersona.pain_points : 
                      (apiPersona.pain_points ? [apiPersona.pain_points] : ['Efficiency challenges', 'Growth constraints']),
          decision_factors: Array.isArray(apiPersona.decision_factors) ? apiPersona.decision_factors :
                           (apiPersona.decision_factors ? [apiPersona.decision_factors] : ['ROI', 'Ease of use']),
          communication_style: typeof apiPersona.communication_style === 'string' ? apiPersona.communication_style :
                              (apiPersona.communication_style?.formality_description || 'Professional and direct'),
          company_overview: apiPersona.company_overview || apiPersona.company_context || undefined,
          recent_milestones: Array.isArray(apiPersona.recent_milestones) ? apiPersona.recent_milestones : undefined,
          strategic_priorities: Array.isArray(apiPersona.strategic_priorities) ? apiPersona.strategic_priorities : undefined,
          public_challenges: Array.isArray(apiPersona.public_challenges) ? apiPersona.public_challenges : undefined,
          surface_business_info: userProductInfo.product,
          // Include additional sophisticated fields if present
          gender: apiPersona.gender,
          age_range: apiPersona.age_range || apiPersona.age,
          cultural_background: apiPersona.cultural_background,
          personality_traits: Array.isArray(apiPersona.personality_traits) ? apiPersona.personality_traits : undefined,
          emotional_state: apiPersona.emotional_state,
          decision_authority: apiPersona.decision_authority
        };

        console.log('✅ Sophisticated persona generation complete:', persona);

        setTimeout(() => {
          setIsGenerating(false);
          onPersonaGenerated(persona);
        }, 500);
      }, 1000);

    } catch (error) {
      console.error('❌ API call failed:', error);
      apiCallRef.current = true; // Mark as completed to stop progress animation
      
      setProgress(100);
      setMessage('Error - using fallback persona');

      // Fallback to a basic persona if API fails
      const fallbackPersona: PersonaData = {
        name: 'Alex Johnson',
        role: 'Decision Maker',
        company: 'TechCorp Inc.',
        industry: 'Technology',
        primary_concern: 'Improving efficiency',
        business_details: 'Growing company seeking solutions',
        about_person: 'Experienced professional',
        pain_points: ['Efficiency challenges', 'Growth constraints'],
        decision_factors: ['ROI', 'Ease of use'],
        communication_style: 'Professional and direct',
        surface_business_info: userProductInfo.product
      };

      setTimeout(() => {
        setIsGenerating(false);
        onPersonaGenerated(fallbackPersona);
      }, 1000);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 py-2">
      {isGenerating ? (
        <>
          {/* Simple spinner with progress */}
          <div className="relative h-16 w-16 flex items-center justify-center my-2">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full border-2 border-primary-100 border-t-primary-500 animate-spin" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-600 animate-pulse" />
            </div>
          </div>
          
          {/* Enhanced progress display */}
          <div className="text-center w-full max-w-sm">
            <p className="text-lg font-semibold text-primary-800 mb-2">
              {message}
            </p>
            
            {/* Enhanced progress bar with debug info */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2 shadow-inner">
              <div 
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm" 
                style={{ 
                  width: `${progress}%`,
                  minWidth: progress > 0 ? '8px' : '0px'
                }}
                data-progress={progress}
              />
            </div>
            
            {/* Debug info - remove this later */}
            <div className="text-xs text-gray-500 mb-1">
              Debug: Progress = {progress}%, Width = {progress}%
            </div>
            
            {/* Progress percentage */}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Generating persona...</span>
              <span className="font-semibold text-primary-700">{progress}%</span>
            </div>
          </div>
        </>
      ) : (
        /* Show start button only if not auto-started */
        !autoStart && (
          <button 
            onClick={startGeneration}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-md transition-colors"
          >
            <Sparkles className="h-4 w-4" /> Create Prospect
          </button>
        )
      )}
    </div>
  );
};

export default PersonaGenerationCard;

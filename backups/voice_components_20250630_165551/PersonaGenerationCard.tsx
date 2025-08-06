import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles, User, Building, Target } from 'lucide-react';
import { PersonaData, UserProductInfo } from './DualVoiceAgentFlow';

interface PersonaGenerationCardProps {
  userProductInfo: UserProductInfo;
  onPersonaGenerated: (persona: PersonaData) => void;
  onError: (error: string) => void;
}

export const PersonaGenerationCard: React.FC<PersonaGenerationCardProps> = ({
  userProductInfo,
  onPersonaGenerated,
  onError
}) => {
  const [loadingStage, setLoadingStage] = useState<'analyzing' | 'generating' | 'finalizing'>('analyzing');
  const [progress, setProgress] = useState(0);

  const loadingStages = [
    { key: 'analyzing', label: 'Analyzing your product...', icon: Target, duration: 2000 },
    { key: 'generating', label: 'Creating perfect prospect...', icon: User, duration: 3000 },
    { key: 'finalizing', label: 'Finalizing persona details...', icon: Building, duration: 2000 }
  ];

  useEffect(() => {
    const generatePersona = async () => {
      try {
        // Simulate loading stages
        for (let i = 0; i < loadingStages.length; i++) {
          const stage = loadingStages[i];
          setLoadingStage(stage.key as any);
          
          // Animate progress for this stage
          const startProgress = (i / loadingStages.length) * 100;
          const endProgress = ((i + 1) / loadingStages.length) * 100;
          
          const progressInterval = setInterval(() => {
            setProgress(prev => {
              const newProgress = prev + 2;
              return newProgress >= endProgress ? endProgress : newProgress;
            });
          }, stage.duration / 50);
          
          await new Promise(resolve => setTimeout(resolve, stage.duration));
          clearInterval(progressInterval);
        }

        // Actually generate the persona
        const response = await fetch('/api/training/generate-persona', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            product: userProductInfo.product,
            target_market: userProductInfo.target_market,
            key_benefits: userProductInfo.key_benefits,
            pricing_model: userProductInfo.pricing_model
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to generate persona: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Persona generation failed');
        }

        // Transform the response to match our PersonaData interface
        const persona: PersonaData = {
          name: data.persona.name || 'Alex Johnson',
          role: data.persona.role || 'Decision Maker',
          company: data.persona.company || 'TechCorp Inc.',
          industry: data.persona.industry || 'Technology',
          primary_concern: data.persona.primary_concern || 'Improving efficiency',
          business_details: data.persona.business_details || 'Growing company',
          about_person: data.persona.about_person || 'Experienced professional',
          pain_points: data.persona.pain_points || ['Budget constraints', 'Time limitations'],
          decision_factors: data.persona.decision_factors || ['ROI', 'Ease of use'],
          communication_style: data.persona.communication_style || 'Direct and thoughtful'
        };

        console.log('✅ Persona generated:', persona);
        setProgress(100);
        
        // Brief pause to show completion
        setTimeout(() => {
          onPersonaGenerated(persona);
        }, 500);

      } catch (error) {
        console.error('❌ Persona generation failed:', error);
        onError(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    generatePersona();
  }, [userProductInfo, onPersonaGenerated, onError]);

  const currentStageInfo = loadingStages.find(s => s.key === loadingStage);
  const CurrentIcon = currentStageInfo?.icon || Sparkles;

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-8">
      {/* Main loading animation */}
      <div className="relative">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
          <CurrentIcon className="w-12 h-12 text-white" />
        </div>
        
        {/* Animated rings */}
        <div className="absolute inset-0 w-24 h-24 border-4 border-blue-200 rounded-full animate-ping opacity-20"></div>
        <div className="absolute inset-2 w-20 h-20 border-2 border-purple-200 rounded-full animate-ping opacity-30 animation-delay-1000"></div>
      </div>

      {/* Loading text */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Creating Your AI Prospect
        </h2>
        
        <div className="flex items-center justify-center space-x-2 text-lg text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{currentStageInfo?.label}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="text-sm text-gray-500 mt-2">
          {Math.round(progress)}% complete
        </div>
      </div>

      {/* Product info recap */}
      <div className="bg-gray-50 rounded-lg p-4 max-w-md">
        <h3 className="font-medium text-gray-800 mb-2">Generating prospect for:</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <div><strong>Product:</strong> {userProductInfo.product}</div>
          <div><strong>Target Market:</strong> {userProductInfo.target_market}</div>
        </div>
      </div>

      {/* Fun loading messages */}
      <div className="text-sm text-gray-500 italic">
        {loadingStage === 'analyzing' && "🔍 Understanding your unique value proposition..."}
        {loadingStage === 'generating' && "🎭 Crafting a realistic prospect persona..."}
        {loadingStage === 'finalizing' && "✨ Adding the finishing touches..."}
      </div>
    </div>
  );
};

export default PersonaGenerationCard; 
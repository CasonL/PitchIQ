import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Phone,
  RefreshCw
} from "lucide-react";
import { PersonaData, UserProductInfo } from "@/components/voice/DualVoiceAgentFlow";

// Helper function to fix grammar issues with 'a' vs 'an'
const fixArticleGrammar = (text: string): string => {
  // Fix "a" vs "an" for words starting with vowels
  return text.replace(/\b[Aa]\s+((?:[aeiouAEIOU])[a-zA-Z]+)\b/g, (match, word) => {
    const firstLetter = match.charAt(0);
    return `${firstLetter === 'A' ? 'An' : 'an'} ${word}`;
  });
};

interface PersonaDisplayCardProps {
  persona: PersonaData;
  userProductInfo: UserProductInfo;
  onStartCall: () => void;
  onRegenerate: () => void;
}

export const PersonaDisplayCard: React.FC<PersonaDisplayCardProps> = ({
  persona,
  userProductInfo,
  onStartCall,
  onRegenerate
}) => {
  // State to track transition to call
  const [isStartingCall, setIsStartingCall] = useState(false);
  
  // Pre-warm audio context to reduce startup lag when call begins
  useEffect(() => {
    try {
      console.log('🔊 Pre-warming audio context for smoother call start');
      // Handle WebKit prefix with type assertion
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const preWarmContext = new AudioContext();
      // Create and quickly release a dummy oscillator to fully initialize
      const oscillator = preWarmContext.createOscillator();
      oscillator.connect(preWarmContext.destination);
      oscillator.start();
      oscillator.stop(preWarmContext.currentTime + 0.001);
      
      return () => {
        // Clean up if component unmounts before call starts
        if (preWarmContext.state !== 'closed') {
          preWarmContext.close().catch(() => {});
        }
      };
    } catch (err) {
      console.log('⚠️ Audio context pre-warming failed:', err);
      // Non-critical error, we can continue without pre-warming
    }
  }, []);
  
  // Handle starting call with visual transition
  const handleCallStart = () => {
    setIsStartingCall(true);
    // Short delay matches the transition in DualVoiceAgentFlow
    setTimeout(() => {
      onStartCall();
      // Reset state in case component doesn't unmount
      setIsStartingCall(false);
    }, 400);
  };
  return (
    <div className="w-full h-full flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-3xl space-y-4">
        {/* Header Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Simple Avatar */}
              <div className="w-16 h-16 rounded-full bg-gray-900 flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0">
                {persona.name ? persona.name.charAt(0) : '?'}
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{persona.name || 'Unknown'}</h1>
                <p className="text-gray-600 mt-0.5">{persona.role || ''}</p>
                {persona.company && <p className="text-sm text-gray-500 mt-0.5">{persona.company}</p>}
                
                {/* Demographics */}
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  {persona.age_range && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {persona.age_range} years old
                    </span>
                  )}
                  {persona.gender && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded capitalize">
                      {persona.gender}
                    </span>
                  )}
                  {persona.cultural_background && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                      {persona.cultural_background}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-2 flex-shrink-0">
              <Button 
                onClick={handleCallStart}
                disabled={isStartingCall}
                className="bg-red-600 hover:bg-red-700 text-white px-6"
              >
                {isStartingCall ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Start Call
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={onRegenerate}
                className="border-gray-300"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bio & Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* About */}
          {persona.about_person && (
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Background</h2>
              <p className="text-sm text-gray-700 leading-relaxed">
                {fixArticleGrammar(persona.about_person)}
              </p>
            </div>
          )}
          
          {/* Communication Style */}
          {persona.communication_style && (
            <div className="bg-white rounded-lg shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-3">Communication Style</h2>
              <p className="text-sm text-gray-700">
                {typeof persona.communication_style === 'string' 
                  ? persona.communication_style 
                  : `${persona.communication_style.formality_description || ''}, ${persona.communication_style.chattiness_description || ''}`}
              </p>
            </div>
          )}
        </div>

        {/* Pain Points & Concerns */}
        {(persona.pain_points && persona.pain_points.length > 0) && (
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Current Challenges</h2>
            <ul className="space-y-2">
              {persona.pain_points.slice(0, 4).map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Personality Traits */}
        {persona.personality_traits && (
          <div className="bg-white rounded-lg shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Personality</h2>
            <div className="flex flex-wrap gap-2">
              {(typeof persona.personality_traits === 'string' ? 
                persona.personality_traits.split(',') : 
                Array.isArray(persona.personality_traits) ? persona.personality_traits : [persona.personality_traits]
              ).map((trait, i) => (
                <span key={i} className="px-3 py-1.5 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                  {typeof trait === 'string' ? trait.trim() : trait}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonaDisplayCard;

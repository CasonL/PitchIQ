import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Briefcase,
  GraduationCap, 
  MapPin,
  Phone,
  RefreshCw, 
  Star,
  Users
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
    <div className="w-full h-full flex flex-col space-y-6">
      <h2 className="sr-only">Your AI Prospect is Ready!</h2>
      
      {/* LinkedIn-Style Profile */}
      <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-sm">
        {/* LinkedIn Header with blue banner */}
        <div className="h-24 bg-[#0a66c2] w-full rounded-t-lg relative"></div>
        
        <div className="px-6 pb-6">
          {/* Profile Header with Avatar */}
          <div className="flex items-start relative">
            {/* Profile Photo */}
            <div className="w-24 h-24 rounded-full border-4 border-white bg-[#0a66c2] flex items-center justify-center text-white text-3xl font-medium absolute -top-12">
              {persona.name ? persona.name.charAt(0) : ''}
            </div>
            
            {/* Name, Headline and Action Buttons */}
            <div className="ml-28 pt-4 flex justify-between w-full">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">{persona.name || ''}</h1>
                <p className="text-md text-gray-600">{persona.role || ''}{persona.company ? ` at ${persona.company}` : ''}</p>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <MapPin className="w-3.5 h-3.5 mr-1" />
                  <span className="mr-3">{persona.industry ? `${persona.industry} Industry` : ''}</span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={handleCallStart}
                  disabled={isStartingCall}
                  className="bg-[#0a66c2] hover:bg-[#084b8a] text-white flex items-center gap-1.5 relative"
                >
                  <Phone className="w-4 h-4" />
                  {isStartingCall ? (
                    <>
                      <span className="opacity-0">Start Call</span>
                      <span className="absolute inset-0 flex items-center justify-center">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                    </>
                  ) : (
                    <span>Start Call</span>
                  )}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="border-[#0a66c2] text-[#0a66c2] hover:bg-blue-50"
                  onClick={onRegenerate}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* About Section */}
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">About</h2>
            <p className="text-gray-600 whitespace-pre-line">
              {persona.about_person ? fixArticleGrammar(persona.about_person) : ''}
            </p>
          </div>
          
          {/* Experience Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Experience</h2>
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                <Briefcase className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <h3 className="font-medium text-gray-800">{persona.role || ''}</h3>
                <p className="text-sm text-gray-600">{persona.company || ''}</p>
                <p className="text-xs text-gray-500 mt-1">{persona.role ? 'Present' : ''}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {persona.business_details ? `${persona.business_details.split(' ').slice(0, 25).join(' ')}...` : ''}
                </p>
              </div>
            </div>
          </div>
          
          {/* Skills Section */}
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {persona.personality_traits ? (
                (typeof persona.personality_traits === 'string' ? 
                  persona.personality_traits.split(',') : 
                  Array.isArray(persona.personality_traits) ? persona.personality_traits : [persona.personality_traits]
                ).map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                    {typeof skill === 'string' ? skill.trim() : skill}
                  </span>
                ))
              ) : null}
            </div>
          </div>
          
          {/* Education section removed - only show when we have actual persona education data */}
          
          {/* Additional spacing for layout balance */}
          <div className="mt-6"></div>
        </div>
      </div>
    </div>
  );
};

export default PersonaDisplayCard;

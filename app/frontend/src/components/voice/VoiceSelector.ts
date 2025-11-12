// VoiceSelector.ts - Enhanced voice selection system
import { PersonaData as Persona } from './DualVoiceAgentFlow';

// Define voice characteristics for better selection
interface VoiceProfile {
  id: string;
  gender: 'male' | 'female' | 'neutral';
  characteristics: string[];
  culturalBackground?: string;
  energyLevel: 'low' | 'medium' | 'medium-high' | 'high';
  suitableFor?: string[];
}

// Available Deepgram voices with enhanced metadata
const AVAILABLE_VOICES: VoiceProfile[] = [
  // Male voices with different characteristics - using valid Deepgram models
  {
    id: 'aura-2-apollo-en',
    gender: 'male',
    characteristics: ['dynamic', 'energetic', 'engaging', 'charismatic'],
    energyLevel: 'high',
    suitableFor: ['sales', 'marketing', 'presentations', 'demo']
  },
  {
    id: 'aura-2-zeus-en',
    gender: 'male',
    characteristics: ['powerful', 'assertive', 'confident', 'bold'],
    energyLevel: 'high',
    suitableFor: ['executive', 'leadership', 'sales', 'demo']
  },
  {
    id: 'aura-2-orion-en',
    gender: 'male',
    characteristics: ['authoritative', 'confident', 'mature', 'resonant'],
    energyLevel: 'medium-high',
    suitableFor: ['executive', 'leadership', 'finance', 'demo']
  },
  {
    id: 'aura-2-atlas-en',
    gender: 'male',
    characteristics: ['warm', 'friendly', 'conversational', 'personable'],
    energyLevel: 'medium-high',
    suitableFor: ['customer service', 'healthcare', 'education']
  },
  {
    id: 'aura-2-arcas-en',
    gender: 'male',
    characteristics: ['soft-spoken', 'calm', 'professional'],
    energyLevel: 'low',
    suitableFor: ['technical', 'academic', 'formal']
  },
  
  // Female voices with different characteristics - using valid Deepgram models
  {
    id: 'aura-2-thalia-en',
    gender: 'female',
    characteristics: ['clear', 'professional', 'articulate'],
    energyLevel: 'medium',
    suitableFor: ['business', 'finance', 'technical']
  },
  {
    id: 'aura-2-aurora-en',
    gender: 'female',
    characteristics: ['warm', 'friendly', 'approachable'],
    energyLevel: 'medium',
    suitableFor: ['customer service', 'healthcare', 'education']
  },
  {
    id: 'aura-2-helena-en',
    gender: 'female',
    characteristics: ['energetic', 'enthusiastic', 'dynamic'],
    energyLevel: 'high',
    suitableFor: ['sales', 'marketing', 'entertainment']
  },
  
  // Neutral voices - using valid male voice as fallback since no true neutral exists
  {
    id: 'aura-2-atlas-en',
    gender: 'neutral',
    characteristics: ['balanced', 'clear', 'versatile'],
    energyLevel: 'medium',
    suitableFor: ['general purpose', 'informational']
  }
];

// Default voices by gender - using valid Deepgram models
const DEFAULT_MALE_VOICE = 'aura-2-atlas-en'; // Warm, friendly, conversational tone male voice
const DEFAULT_FEMALE_VOICE = 'aura-2-aurora-en'; // Warm, friendly, approachable female voice
const DEFAULT_NEUTRAL_VOICE = 'aura-2-atlas-en'; // Using atlas as neutral fallback

export class VoiceSelector {
  /**
   * Select the most appropriate voice based on persona characteristics
   * Now simplified to use explicit gender field from persona generation
   */
  static selectVoiceForPersona(persona: any): string {
    console.log(`🎙️ Selecting voice for persona: ${persona.name}`);
    
    // Determine gender from explicit field (should always be present now)
    const gender = this.getGenderFromPersona(persona);
    console.log(`👤 Gender for ${persona.name}: ${gender}`);
    
    // Extract relevant characteristics from persona
    const traits = this.extractTraits(persona);
    
    // Find matching voice based on characteristics
    const matchedVoice = this.findMatchingVoice(gender, traits, persona);
    console.log(`🎙️ Selected ${gender} voice: ${matchedVoice} for ${persona.name}`);
    
    return matchedVoice;
  }
  
  /**
   * Simple gender extraction from persona (no complex detection needed)
   */
  private static getGenderFromPersona(persona: any): 'male' | 'female' | 'neutral' {
    if (persona.gender) {
      if (persona.gender.toLowerCase().includes('male')) {
        return 'male';
      }
      if (persona.gender.toLowerCase().includes('female')) {
        return 'female';
      }
    }
    
    // Fallback to neutral if no gender specified (shouldn't happen with new persona generation)
    console.log(`⚠️ No gender specified for ${persona.name}, defaulting to neutral`);
    return 'neutral';
  }

  /**
   * Extract relevant traits from persona
   */
  private static extractTraits(persona: Persona): string[] {
    const traits: string[] = [];
    
    // Add personality traits
    if (persona.personality_traits && Array.isArray(persona.personality_traits)) {
      traits.push(...persona.personality_traits);
    }
    
    // Add role-based traits
    if (persona.role) {
      const role = persona.role.toLowerCase();
      if (role.includes('executive') || role.includes('ceo') || role.includes('director')) {
        traits.push('authoritative', 'confident');
      } else if (role.includes('engineer') || role.includes('developer') || role.includes('technical')) {
        traits.push('technical', 'precise');
      } else if (role.includes('sales') || role.includes('marketing')) {
        traits.push('energetic', 'dynamic');
      } else if (role.includes('support') || role.includes('service')) {
        traits.push('friendly', 'helpful');
      }
    }
    
    // Add company-based traits
    if (persona.company) {
      const company = persona.company.toLowerCase();
      if (company.includes('tech') || company.includes('software')) {
        traits.push('technical');
      } else if (company.includes('bank') || company.includes('finance')) {
        traits.push('professional');
      } else if (company.includes('healthcare') || company.includes('hospital')) {
        traits.push('caring');
      }
    }
    
    // Remove any "analytical" traits as per memory
    return traits.filter(trait => !trait.toLowerCase().includes('analytical'));
  }

  /**
   * Find the best matching voice based on gender and traits
   */
  private static findMatchingVoice(
    gender: 'male' | 'female' | 'neutral', 
    traits: string[], 
    persona: Persona
  ): string {
    // Filter voices by gender
    let candidateVoices = AVAILABLE_VOICES.filter(voice => voice.gender === gender);
    
    // If no voices match the gender, use all voices
    if (candidateVoices.length === 0) {
      candidateVoices = AVAILABLE_VOICES;
    }
    
    // Score each voice based on trait matching
    const scoredVoices = candidateVoices.map(voice => {
      let score = 0;
      
      // Score based on trait matching
      for (const trait of traits) {
        for (const voiceTrait of voice.characteristics) {
          if (voiceTrait.toLowerCase().includes(trait.toLowerCase()) || 
              trait.toLowerCase().includes(voiceTrait.toLowerCase())) {
            score += 1;
          }
        }
      }
      
      // Bonus for role matching
      if (voice.suitableFor && persona.role) {
        for (const role of voice.suitableFor) {
          if (persona.role.toLowerCase().includes(role.toLowerCase())) {
            score += 2;
          }
        }
      }
      
      // For demo purposes, strongly prefer higher energy male voices
      // This addresses the memory about wanting more dynamic, engaging voices
      if (gender === 'male') {
        if (voice.energyLevel === 'high') {
          score += 5;  // Significantly boost high energy male voices
        } else if (voice.energyLevel === 'medium-high') {
          score += 3;  // Good boost for medium-high energy
        }
        
        // Boost voices with engaging characteristics
        const engagingTraits = ['dynamic', 'energetic', 'engaging', 'charismatic', 'powerful', 'assertive'];
        for (const trait of voice.characteristics) {
          if (engagingTraits.includes(trait.toLowerCase())) {
            score += 2;  // Additional points for each engaging trait
          }
        }
        
        // Penalize soft-spoken voices for demos
        if (voice.characteristics.includes('soft-spoken')) {
          score -= 3;  // Reduce score for soft-spoken voices
        }
      }
      
      return { voice: voice.id, score };
    });
    
    // Sort by score (highest first)
    scoredVoices.sort((a, b) => b.score - a.score);
    
    // Return the highest scoring voice, or default to appropriate gender default
    if (scoredVoices.length > 0 && scoredVoices[0].score > 0) {
      return scoredVoices[0].voice;
    }
    
    // Fall back to defaults
    if (gender === 'male') return DEFAULT_MALE_VOICE;
    if (gender === 'female') return DEFAULT_FEMALE_VOICE;
    return DEFAULT_NEUTRAL_VOICE;
  }

  /**
   * Get all available voices
   */
  static getAllVoices(): VoiceProfile[] {
    return AVAILABLE_VOICES;
  }

  /**
   * Get voices by gender
   */
  static getVoicesByGender(gender: 'male' | 'female' | 'neutral'): VoiceProfile[] {
    return AVAILABLE_VOICES.filter(voice => voice.gender === gender);
  }
}

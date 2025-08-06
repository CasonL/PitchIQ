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
  // Male voices with different characteristics - prioritizing dynamic voices for demos
  {
    id: 'aura-2-blaze-en',
    gender: 'male',
    characteristics: ['dynamic', 'energetic', 'engaging', 'charismatic'],
    energyLevel: 'high',
    suitableFor: ['sales', 'marketing', 'presentations', 'demo']
  },
  {
    id: 'aura-2-titan-en',
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
    id: 'aura-2-nova-en',
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
  
  // Female voices with different characteristics
  {
    id: 'aura-2-shimmer-en',
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
    id: 'aura-2-ember-en',
    gender: 'female',
    characteristics: ['energetic', 'enthusiastic', 'dynamic'],
    energyLevel: 'high',
    suitableFor: ['sales', 'marketing', 'entertainment']
  },
  
  // Neutral voices
  {
    id: 'aura-2-onyx-en',
    gender: 'neutral',
    characteristics: ['balanced', 'clear', 'versatile'],
    energyLevel: 'medium',
    suitableFor: ['general purpose', 'informational']
  }
];

// Default voices by gender
const DEFAULT_MALE_VOICE = 'aura-2-nova-en'; // Warm, friendly, conversational tone male voice
const DEFAULT_FEMALE_VOICE = 'aura-2-aurora-en'; // Warm, friendly, approachable female voice
const DEFAULT_NEUTRAL_VOICE = 'aura-2-onyx-en';

export class VoiceSelector {
  /**
   * Select the most appropriate voice based on persona characteristics
   * Accept both PersonaData and the internal Persona type
   * This is the main entry point for voice selection that handles both async and sync scenarios
   * 
   * @returns Either a string voice ID directly (sync mode) or a Promise resolving to a voice ID (async mode)
   */
  static selectVoiceForPersona(persona: any): string | Promise<string> {
    // Try to detect if the calling context can handle a Promise
    // We do this by checking if we're in an async context or if there's an await expression
    try {
      // If we're in an async function that awaits this call, try to use the async version
      const asyncDetectionSupported = this.isAsyncContext();
      
      if (asyncDetectionSupported) {
        console.log(`🔄 Using async gender detection API for ${persona.name}`);
        return this.selectVoiceForPersonaAsync(persona);
      }
    } catch (error) {
      console.log(`ℹ️ Falling back to sync detection: ${error.message}`);
      // Continue to synchronous version
    }
    
    // Use synchronous fallback for immediate response
    // This ensures we always have a voice, even if the API call is slow or fails
    console.log(`📋 Using synchronous gender detection for ${persona.name}`);
    return this.selectVoiceForPersonaSync(persona);
  }
  
  /**
   * Attempt to detect if we're in an async context
   * This is a heuristic - it checks the call stack for async function signatures
   */
  private static isAsyncContext(): boolean {
    // Check if we have async/await in the call stack
    const stack = new Error().stack || '';
    const hasAsyncKeywords = stack.includes('async') || stack.includes('await');
    
    // Check if promises are being used in the caller
    const callerIsUsingPromises = stack.includes('Promise') || stack.includes('then');
    
    return hasAsyncKeywords || callerIsUsingPromises;
  }
  
  /**
   * Select voice asynchronously with API-based gender detection
   * Use this method when you can handle a Promise-based response
   */
  static async selectVoiceForPersonaAsync(persona: any): Promise<string> {
    // Add debug logging to trace selection process
    console.log(`🔄 Selecting voice asynchronously for persona: ${persona.name}`);
    
    // Determine gender from persona using async method with API integration
    const gender = await this.determineGender(persona);
    console.log(`👤 Async determined gender for ${persona.name}: ${gender}`);
    
    // Extract relevant characteristics from persona
    const traits = this.extractTraits(persona);
    
    // Find matching voice based on characteristics
    const matchedVoice = this.findMatchingVoice(gender, traits, persona);
    console.log(`🎙️ Async selected ${gender} voice: ${matchedVoice} for ${persona.name}`);
    
    return matchedVoice;
  }
  
  /**
   * Synchronous version of selectVoiceForPersona for backward compatibility
   * Uses only local heuristics for gender detection
   */
  static selectVoiceForPersonaSync(persona: any): string {
    // Add debug logging to trace selection process
    console.log(`🔍 Selecting voice synchronously for persona: ${persona.name}`);
    
    // Determine gender from persona using synchronous method
    const gender = this.determineGenderSync(persona);
    console.log(`👤 Determined gender for ${persona.name}: ${gender}`);
    
    // Extract relevant characteristics from persona
    const traits = this.extractTraits(persona);
    
    // Find matching voice based on characteristics
    const matchedVoice = this.findMatchingVoice(gender, traits, persona);
    console.log(`🎙️ Selected ${gender} voice: ${matchedVoice} for ${persona.name}`);
    
    return matchedVoice;
  }
  
  /**
   * Get gender information from backend API using unbiased demographic name service
   * This uses the /name-gender-detection endpoint for more accurate gender detection
   * @param name Full name to check
   * @returns Promise resolving to gender or null if API call fails
   */
  static async fetchGenderFromAPI(name: string): Promise<'male' | 'female' | null> {
    try {
      console.log(`🔄 Fetching gender from API for name: ${name}`);
      
      const response = await fetch('/api/dual-voice/name-gender-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        console.error(`❌ Error fetching gender from API: ${response.statusText}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.success && data.gender) {
        console.log(`✅ API returned gender for ${name}: ${data.gender}`);
        return data.gender as 'male' | 'female';
      }
      
      console.warn(`⚠️ API call successful but no gender returned for ${name}`);
      return null;
    } catch (error) {
      console.error(`❌ Exception fetching gender from API:`, error);
      return null;
    }
  }

  /**
   * Determine gender from persona information
   * Uses a combination of API calls and local heuristics for maximum accuracy
   */
  private static async determineGender(persona: Persona): Promise<'male' | 'female' | 'neutral'> {
    // Add debug logging to trace persona data
    console.log(`🔍 Determining gender for persona: ${persona.name}`, { 
      hasGender: !!persona.gender,
      gender: persona.gender || 'not specified'
    });
    
    // Check if gender is explicitly specified
    if (persona.gender) {
      if (persona.gender.toLowerCase().includes('male')) {
        console.log(`✅ Gender explicitly specified as male for ${persona.name}`);
        return 'male';
      }
      if (persona.gender.toLowerCase().includes('female')) {
        console.log(`✅ Gender explicitly specified as female for ${persona.name}`);
        return 'female';
      }
    }
    
    // If no explicit gender is provided, try using the unbiased API
    if (persona.name) {
      try {
        const apiGender = await this.fetchGenderFromAPI(persona.name);
        if (apiGender) {
          console.log(`✅ API detected gender as ${apiGender} for ${persona.name}`);
          return apiGender;
        }
      } catch (error) {
        console.error(`❌ Error using API gender detection for ${persona.name}:`, error);
        // Continue with fallback methods
      }
    }
    
    // Fall back to synchronous gender detection if API call fails
    return this.determineGenderSync(persona);
  }
  
  /**
   * Synchronous version of determineGender that only uses local heuristics
   * This is used as a fallback when API calls fail or for backward compatibility
   */
  /**
   * Synchronous version of determineGender that only uses local heuristics
   * This is used as a fallback when API calls fail or for backward compatibility
   */
  private static determineGenderSync(persona: Persona): 'male' | 'female' | 'neutral' {
    // Add debug logging to trace persona data
    console.log(`🔍 Determining gender synchronously for persona: ${persona.name}`);
    
    // Check if gender is explicitly specified
    if (persona.gender) {
      if (persona.gender.toLowerCase().includes('male')) {
        console.log(`✅ Gender explicitly specified as male for ${persona.name}`);
        return 'male';
      }
      if (persona.gender.toLowerCase().includes('female')) {
        console.log(`✅ Gender explicitly specified as female for ${persona.name}`);
        return 'female';
      }
    }
    
    // From this point forward, implement the same logic as in the original code,
    // without duplicating variable declarations
    
    // Extract the first name for better matching
    const fullName = persona.name.toLowerCase().trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    
    // Check for gender indicators in name and about_person
    const about = persona.about_person ? persona.about_person.toLowerCase() : '';
    
    // Check common indicators
    const maleIndicators = ['mr.', 'mr ', 'sir', 'he', 'his', 'him', ' male', 'man', 'father', 'brother', 'son'];
    for (const indicator of maleIndicators) {
      if (fullName.includes(indicator) || about.includes(indicator)) {
        console.log(`✅ Found male indicator "${indicator}" for ${persona.name}`);
        return 'male';
      }
    }
    
    const femaleIndicators = ['mrs.', 'mrs ', 'miss', 'ms.', 'ms ', 'she', 'her', ' female', 'woman', 'mother', 'sister', 'daughter'];
    for (const indicator of femaleIndicators) {
      if (fullName.includes(indicator) || about.includes(indicator)) {
        console.log(`✅ Found female indicator "${indicator}" for ${persona.name}`);
        return 'female';
      }
    }
    
    // Check common female first names
    const commonFemaleNames = [
      'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica', 'sarah',
      'nancy', 'lisa', 'margaret', 'betty', 'sandra', 'ashley', 'dorothy', 'kimberly', 'emily',
      'michelle', 'carol', 'amanda', 'melissa', 'deborah', 'stephanie', 'rebecca', 'laura', 
      'cynthia', 'amy', 'angela', 'anna', 'ruth', 'brenda', 'pamela', 'nicole', 'katherine',
      'samantha', 'christine', 'catherine', 'virginia', 'rachel', 'janet', 'emma', 'maria',
      'heather', 'diane', 'julie', 'joyce', 'victoria', 'kelly', 'christina', 'lauren',
      'olivia', 'judith', 'megan', 'martha', 'andrea', 'frances', 'hannah', 'jacqueline',
      'gloria', 'jean', 'alice', 'teresa', 'sara', 'janice', 'madison', 'julia', 'grace',
      'judy', 'abigail', 'sophia', 'isabella', 'ava', 'camila', 'charlotte', 'amelia',
      'mila', 'lucy', 'sofia', 'elena', 'maya', 'zoe', 'leah', 'stella', 'hazel', 'eliana'
    ];
    
    if (commonFemaleNames.includes(firstName)) {
      console.log(`✅ Found female first name match for ${firstName} (${persona.name})`);
      return 'female';
    }
    
    // Female name pattern heuristics
    if (firstName.endsWith('a') || firstName.endsWith('ia') || firstName.endsWith('ina') || 
        firstName.endsWith('elle') || firstName.endsWith('ey') || firstName.endsWith('ie') ||
        firstName.endsWith('y') && firstName.length > 3) {
      console.log(`✅ Female name pattern match for ${firstName} (${persona.name})`);
      return 'female';
    }
    
    // Check common male first names
    const commonMaleNames = [
      'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas',
      'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew',
      'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey',
      'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott',
      'benjamin', 'samuel', 'gregory', 'alexander', 'patrick', 'frank', 'raymond', 'jack', 'dennis',
      'tyler', 'aaron', 'jose', 'adam', 'nathan', 'henry', 'douglas', 'zachary', 'peter',
      'ethan', 'walter', 'noah', 'jeremy', 'christian', 'keith', 'roger', 'terry', 'harold',
      'sean', 'austin', 'carl', 'arthur', 'lawrence', 'dylan', 'jesse', 'jordan', 'bryan',
      'bruce', 'gabriel', 'joe', 'logan', 'alan', 'juan', 'albert', 'willie', 'elijah', 'wayne',
      'liam', 'oliver', 'william', 'james', 'benjamin', 'lucas', 'henry'
    ];
    
    if (commonMaleNames.includes(firstName)) {
      console.log(`✅ Found male first name match for ${firstName} (${persona.name})`);
      return 'male';
    }
    
    // If we've made it here, we need to guess - examine content clues
    if (about) {
      // Count male vs female pronouns
      const malePronouns = ['he', 'him', 'his', 'himself'];
      const femalePronouns = ['she', 'her', 'hers', 'herself'];
      
      let maleCount = 0;
      let femaleCount = 0;
      
      // Simple word-boundary check using regex
      malePronouns.forEach(pronoun => {
        const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
        const matches = about.match(regex);
        if (matches) maleCount += matches.length;
      });
      
      femalePronouns.forEach(pronoun => {
        const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
        const matches = about.match(regex);
        if (matches) femaleCount += matches.length;
      });
      
      if (maleCount > femaleCount && maleCount > 0) {
        console.log(`✅ Found ${maleCount} male pronouns vs ${femaleCount} female pronouns for ${persona.name}`);
        return 'male';
      }
      
      if (femaleCount > maleCount && femaleCount > 0) {
        console.log(`✅ Found ${femaleCount} female pronouns vs ${maleCount} male pronouns for ${persona.name}`);
        return 'female';
      }
    }
    
    // If still unsure, use statistical probability (55/45 split male/female in business contexts)
    // but with a slight preference toward female to balance historic bias
    const randomFallback = Math.random();
    if (randomFallback < 0.55) {
      console.log(`⚠️ Using random assignment (55% probability) for ${persona.name}: female`);
      return 'female';
    } else {
      console.log(`⚠️ Using random assignment (45% probability) for ${persona.name}: male`);
      return 'male';
    }
    
    // Female name pattern heuristics
    if (firstName.endsWith('a') || firstName.endsWith('ia') || firstName.endsWith('ina') || 
        firstName.endsWith('elle') || firstName.endsWith('ey') || firstName.endsWith('ie') ||
        firstName.endsWith('y') && firstName.length > 3) {
      console.log(`✅ Female name pattern match for ${firstName} (${persona.name})`);
      return 'female';
    }
    
    // Common male first names (add more as needed)
    const maleFirstNames = [
      'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas', 'charles',
      'christopher', 'daniel', 'matthew', 'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
      'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald', 'edward', 'jason', 'jeffrey', 'ryan',
      'jacob', 'gary', 'nicholas', 'eric', 'jonathan', 'stephen', 'larry', 'justin', 'scott', 'brandon',
      'benjamin', 'samuel', 'gregory', 'alexander', 'patrick', 'frank', 'raymond', 'jack', 'dennis', 'jerry',
      'tyler', 'aaron', 'jose', 'adam', 'nathan', 'henry', 'douglas', 'zachary', 'peter', 'kyle',
      'ethan', 'walter', 'noah', 'jeremy', 'christian', 'keith', 'roger', 'terry', 'gerald', 'harold',
      'sean', 'austin', 'carl', 'arthur', 'lawrence', 'dylan', 'jesse', 'jordan', 'bryan', 'billy',
      'bruce', 'gabriel', 'joe', 'logan', 'alan', 'juan', 'albert', 'willie', 'elijah', 'wayne',
      'liam', 'noah', 'oliver', 'elijah', 'william', 'james', 'benjamin', 'lucas', 'henry', 'alexander'
    ];
    
    if (maleFirstNames.includes(firstName)) {
      console.log(`✅ Found male first name match for ${firstName} (${persona.name})`);
      return 'male';
    }
    
    // If we've made it here, we need to guess - examine content clues
    // Check if 'about_person' contains gender clues
    if (about) {
      // Count male vs female pronouns
      const malePronouns = ['he', 'him', 'his', 'himself'];
      const femalePronouns = ['she', 'her', 'hers', 'herself'];
      
      let maleCount = 0;
      let femaleCount = 0;
      
      // Simple word-boundary check using regex
      malePronouns.forEach(pronoun => {
        const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
        const matches = about.match(regex);
        if (matches) maleCount += matches.length;
      });
      
      femalePronouns.forEach(pronoun => {
        const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
        const matches = about.match(regex);
        if (matches) femaleCount += matches.length;
      });
      
      if (maleCount > femaleCount && maleCount > 0) {
        console.log(`✅ Found ${maleCount} male pronouns vs ${femaleCount} female pronouns for ${persona.name}`);
        return 'male';
      }
      
      if (femaleCount > maleCount && femaleCount > 0) {
        console.log(`✅ Found ${femaleCount} female pronouns vs ${maleCount} male pronouns for ${persona.name}`);
        return 'female';
      }
    }
    
    // If still unsure, use statistical probability (55/45 split male/female in business contexts)
    // but with a slight preference toward female to balance historic bias
    const randomChoice = Math.random();
    if (randomChoice < 0.55) {
      console.log(`⚠️ Using random assignment (55% probability) for ${persona.name}: female`);
      return 'female';
    } else {
      console.log(`⚠️ Using random assignment (45% probability) for ${persona.name}: male`);
      return 'male';
    }
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

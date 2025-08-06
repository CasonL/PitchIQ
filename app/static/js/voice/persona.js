// Import dependencies
import State from './state.js';
import Config from './config.js';
import UI from './ui.js';
import Utils from './utils.js';

// Persona Manager - Handles persona creation and management
class PersonaManager {
  constructor() {
    this.activePersona = null;
    this.personaTypes = {
      cautious: {
        name: 'Cautious Buyer',
        traits: {
          hesitancy: 0.7,
          interruption: 0.3,
          disfluency: 0.5,
          skepticism: 0.8,
          formality: 0.6
        }
      },
      aggressive: {
        name: 'Aggressive Buyer',
        traits: {
          hesitancy: 0.2,
          interruption: 0.9,
          disfluency: 0.4,
          skepticism: 0.7,
          formality: 0.3
        }
      },
      curious: {
        name: 'Curious Buyer',
        traits: {
          hesitancy: 0.4,
          interruption: 0.5,
          disfluency: 0.3,
          skepticism: 0.4,
          formality: 0.5
        }
      },
      friendly: {
        name: 'Friendly Buyer',
        traits: {
          hesitancy: 0.3,
          interruption: 0.2,
          disfluency: 0.2,
          skepticism: 0.2,
          formality: 0.6
        }
      },
      thoughtful: {
        name: 'Thoughtful Buyer',
        traits: {
          hesitancy: 0.5,
          interruption: 0.3,
          disfluency: 0.2,
          skepticism: 0.6,
          formality: 0.8
        }
      },
      impulsive: {
        name: 'Impulsive Buyer',
        traits: {
          hesitancy: 0.1,
          interruption: 0.7,
          disfluency: 0.6,
          skepticism: 0.3,
          formality: 0.2
        }
      },
      indecisive: {
        name: 'Indecisive Buyer',
        traits: {
          hesitancy: 0.9,
          interruption: 0.4,
          disfluency: 0.7,
          skepticism: 0.5,
          formality: 0.4
        }
      }
    };
    
    // Voice characteristics for different personas
    this.voiceCharacteristics = {
      cautious: { rate: 0.9, pitch: 0.95, volume: 0.8 },
      aggressive: { rate: 1.1, pitch: 1.1, volume: 1.0 },
      curious: { rate: 1.0, pitch: 1.05, volume: 0.9 },
      friendly: { rate: 1.0, pitch: 1.0, volume: 0.9 },
      thoughtful: { rate: 0.95, pitch: 0.9, volume: 0.8 },
      impulsive: { rate: 1.2, pitch: 1.1, volume: 1.0 },
      indecisive: { rate: 0.85, pitch: 0.95, volume: 0.7 }
    };
    
    // Disfluency patterns for each persona type
    this.disfluencyPatterns = {
      cautious: ['Hmm...', 'Well, let me think...', 'I\'m not sure, but...', 'I guess...'],
      aggressive: ['Look,', 'Listen,', 'Frankly,', 'To be honest,', 'Let me be clear,'],
      curious: ['I wonder,', 'I\'m curious about...', 'That\'s interesting,', 'Tell me more about...'],
      friendly: ['You know,', 'I feel like...', 'I think...', 'Maybe...'],
      thoughtful: ['Considering the facts,', 'Based on what I understand,', 'From my analysis,'],
      impulsive: ['Wait!', 'Oh!', 'I just realized!', 'Actually,'],
      indecisive: ['On one hand...', 'But then again...', 'I\'m torn between...', 'It\'s hard to decide...']
    };
    
    // Response styles for different message types
    this.responseStyles = {
      greeting: {
        cautious: ['Hello...', 'Hi there.', 'Good day, I suppose.'],
        aggressive: ['Hey.', 'Alright, let\'s get started.', 'What do you have for me?'],
        curious: ['Hi there! What are we discussing today?', 'Hello! I\'m eager to learn more.'],
        friendly: ['Hi! Nice to meet you!', 'Hello there! How are you?'],
        thoughtful: ['Greetings. I\'m ready to evaluate the information.', 'Hello. Please proceed with your presentation.'],
        impulsive: ['Hi! Let\'s do this!', 'Hey! I\'m ready to go!'],
        indecisive: ['Hello... I think.', 'Hi there... if that\'s okay.']
      },
      objection: {
        cautious: ['I\'m concerned about...', 'I\'m not convinced that...', 'What worries me is...'],
        aggressive: ['That doesn\'t work for me.', 'I completely disagree.', 'That\'s not acceptable.'],
        curious: ['I\'m wondering about...', 'Could you explain how...', 'I\'d like to understand...'],
        friendly: ['I see your point, but...', 'I appreciate that, however...'],
        thoughtful: ['The data suggests otherwise because...', 'I\'m not seeing evidence for...'],
        impulsive: ['No way!', 'That\'s not what I want!', 'I need something different!'],
        indecisive: ['I\'m torn about this...', 'On one hand yes, but on the other...']
      }
    };
    
    // Interrupt probability thresholds
    this.interruptThresholds = {
      low: 0.3,
      medium: 0.6,
      high: 0.8
    };
    
    // Random traits pool for generating unique personas
    this.traitPool = {
      personality: [
        'serious', 'casual', 'professional', 'friendly', 'formal', 'direct',
        'verbose', 'concise', 'enthusiastic', 'reserved', 'thoughtful', 'emotional'
      ],
      communication: [
        'visual', 'auditory', 'kinesthetic', 'detailed', 'big-picture', 
        'questioning', 'assertive', 'passive', 'collaborative', 'competitive'
      ],
      decision: [
        'fast', 'methodical', 'intuitive', 'data-driven', 'consensus-seeking',
        'independent', 'risk-averse', 'experimental', 'budget-conscious', 'value-focused'
      ],
      concerns: [
        'time', 'quality', 'cost', 'reliability', 'support', 'scalability',
        'security', 'ease-of-use', 'compatibility', 'reputation', 'roi', 'innovation'
      ]
    };
    
    // UI elements
    this.uiElements = {
      personaSelector: null,
      generateButton: null,
      traitsDisplay: null
    };
  }
  
  // Initialize the persona manager
  async init() {
    console.log('Initializing Persona Manager');
    return this;
  }
  
  // Set a persona by type
  setPersona(personaType) {
    if (this.personaTypes[personaType]) {
      this.activePersona = {
        type: personaType,
        name: this.personaTypes[personaType].name,
        traits: { ...this.personaTypes[personaType].traits }
      };
      console.log(`Persona set: ${this.activePersona.name}`);
      return this.activePersona;
    }
    console.warn(`Unknown persona type: ${personaType}`);
    return false;
  }
  
  // Generate a unique buyer persona with randomized traits
  generateUniquePersona() {
    const personaTypes = Object.keys(this.personaTypes);
    const randomType = personaTypes[Math.floor(Math.random() * personaTypes.length)];
    
    // Start with base traits
    const baseTraits = { ...this.personaTypes[randomType].traits };
    
    // Randomize traits slightly
    const randomizedTraits = {};
    Object.keys(baseTraits).forEach(trait => {
      // Add random variation of +/- 0.2 (constrained to 0-1 range)
      const variation = (Math.random() * 0.4) - 0.2;
      randomizedTraits[trait] = Math.max(0, Math.min(1, baseTraits[trait] + variation));
    });
    
    // Create the persona with a unique name
    const baseName = this.personaTypes[randomType].name;
    const uniqueName = `${baseName} ${Math.floor(Math.random() * 1000)}`;
    
    this.activePersona = {
      type: randomType,
      name: uniqueName,
      traits: randomizedTraits,
      voice: { ...this.voiceCharacteristics[randomType] }
    };
    
    console.log(`Generated unique persona: ${this.activePersona.name}`);
    return this.activePersona;
  }
  
  // Clear the active persona
  clearPersona() {
    this.activePersona = null;
    console.log('Active persona cleared');
  }
  
  // Check if there's an active persona
  hasActivePersona() {
    return this.activePersona !== null;
  }
  
  // Get the active persona
  getActivePersona() {
    return this.activePersona;
  }
  
  // Get a list of available persona types
  getPersonaTypes() {
    return Object.keys(this.personaTypes).map(type => ({
      type,
      name: this.personaTypes[type].name
    }));
  }
  
  // Get voice characteristics for a persona
  getVoiceCharacteristics(personaType = null) {
    const type = personaType || (this.activePersona ? this.activePersona.type : null);
    if (!type || !this.voiceCharacteristics[type]) {
      return { rate: 1.0, pitch: 1.0, volume: 1.0 };
    }
    return { ...this.voiceCharacteristics[type] };
  }
  
  // Get disfluency patterns for a persona
  getDisfluencyPatterns(personaType = null) {
    const type = personaType || (this.activePersona ? this.activePersona.type : null);
    if (!type || !this.disfluencyPatterns[type]) {
      return [];
    }
    return [...this.disfluencyPatterns[type]];
  }
  
  // Get a random disfluency for the active persona
  getRandomDisfluency() {
    if (!this.activePersona) return '';
    
    const patterns = this.disfluencyPatterns[this.activePersona.type];
    if (!patterns || patterns.length === 0) return '';
    
    return patterns[Math.floor(Math.random() * patterns.length)];
  }
  
  // Determine if the persona should interrupt based on trait value
  shouldInterrupt() {
    if (!this.activePersona) return false;
    
    const interruptionTraitValue = this.activePersona.traits.interruption;
    return Math.random() < interruptionTraitValue;
  }
  
  // Determine if the persona should add disfluencies
  shouldAddDisfluency() {
    if (!this.activePersona) return false;
    
    const disfluencyTraitValue = this.activePersona.traits.disfluency;
    return Math.random() < disfluencyTraitValue;
  }
  
  // Enhance a response based on persona traits and message type
  enhanceResponse(text, messageType = 'general') {
    if (!this.activePersona || !text) return text;
    
    let enhanced = text;
    const persona = this.activePersona;
    
    // Apply persona-specific greeting styles
    if (messageType === 'greeting' && this.responseStyles.greeting[persona.type]) {
      const greetings = this.responseStyles.greeting[persona.type];
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      enhanced = enhanced.replace(/^(hi|hello|hey|greetings).*/i, greeting);
    }
    
    // Apply persona-specific objection styles
    if (messageType === 'objection' && this.responseStyles.objection[persona.type]) {
      const objections = this.responseStyles.objection[persona.type];
      const objection = objections[Math.floor(Math.random() * objections.length)];
      
      // Find objection-like phrases and replace
      const objectionRegex = /(I'm concerned|I don't think|I'm not sure|I disagree|I'm worried|I don't agree).*/i;
      if (objectionRegex.test(enhanced)) {
        enhanced = enhanced.replace(objectionRegex, objection);
      } else {
        // If no obvious objection phrase, prepend the objection style
        enhanced = `${objection} ${enhanced}`;
      }
    }
    
    // Add disfluencies based on persona trait
    if (this.shouldAddDisfluency()) {
      const disfluency = this.getRandomDisfluency();
      
      // Add at the beginning if not already starting with a disfluency
      const firstWord = enhanced.split(' ')[0];
      const commonDisfluencies = ['um', 'uh', 'well', 'hmm', 'er'];
      if (!commonDisfluencies.includes(firstWord.toLowerCase().replace(/[,.!?]/, ''))) {
        enhanced = `${disfluency} ${enhanced}`;
      }
      
      // Potentially add mid-sentence disfluencies for strong trait
      if (persona.traits.disfluency > 0.6) {
        const sentences = enhanced.split(/(?<=[.!?])\s+/);
        if (sentences.length > 1) {
          // Add disfluency to one random sentence in the middle
          const randomIndex = 1 + Math.floor(Math.random() * (sentences.length - 1));
          sentences[randomIndex] = `${disfluency} ${sentences[randomIndex]}`;
          enhanced = sentences.join(' ');
        }
      }
    }
    
    // Adjust tone based on formality trait
    if (persona.traits.formality > 0.7) {
      // More formal language
      enhanced = enhanced
        .replace(/gonna/g, 'going to')
        .replace(/wanna/g, 'want to')
        .replace(/yeah/g, 'yes')
        .replace(/nope/g, 'no')
        .replace(/kinda/g, 'kind of')
        .replace(/sorta/g, 'sort of');
    } else if (persona.traits.formality < 0.3) {
      // Less formal language
      enhanced = enhanced
        .replace(/going to/g, 'gonna')
        .replace(/want to/g, 'wanna')
        .replace(/\byou are\b/g, 'you\'re')
        .replace(/\bI am\b/g, 'I\'m')
        .replace(/\bdo not\b/g, 'don\'t')
        .replace(/\bcannot\b/g, 'can\'t');
    }
    
    return enhanced;
  }
}

export default PersonaManager; 
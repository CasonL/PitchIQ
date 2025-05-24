# Voice-First Interface Module

This directory contains the modular voice interface implementation for PitchIQ, providing a voice-first interaction experience with an AI sales coach.

## Architecture Overview

The voice interface follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                     index.js                        │
│         (Main Controller & Integration Point)       │
├─────────┬─────────┬──────────┬──────────┬──────────┤
│         │         │          │          │          │
│ config  │ state   │recognition│synthesis │ persona  │
│  .js    │  .js    │   .js     │   .js    │  .js     │
│         │         │          │          │          │
└─────────┴─────────┴──────────┴──────────┴──────────┘
                          │
                          │
                      ┌───▼───┐
                      │ utils │
                      │  .js  │
                      └───────┘
```

## Modules

### 1. `index.js` - Main Entry Point
The main controller that integrates all modules and provides the public API for the voice interface.

```javascript
import Voice from './voice/index.js';

// Initialize
Voice.init();

// Start voice interaction
Voice.start();

// Stop voice interaction
Voice.stop();

// Listen for state changes
Voice.on('stateChange', event => {
  console.log('State changed:', event);
});
```

### 2. `config.js` - Configuration
Contains all configurable settings for the voice interface, including recognition settings, synthesis settings, and UI preferences.

### 3. `state.js` - State Management
Centralized state management that tracks the current state of the voice system, conversation, and analytics.

### 4. `recognition.js` - Speech Recognition
Handles voice input using the Web Speech API, with features like continuous recognition, interim results, and silence detection.

### 5. `synthesis.js` - Text-to-Speech
Handles voice output using both the Web Speech API and ElevenLabs for high-quality voice synthesis.

### 6. `persona.js` - Persona Management
Manages buyer personas with traits that affect how the AI responds, including formality, technical level, and speaking style.

### 7. `ui.js` - User Interface
Provides UI components and visualization for the voice interface, including the status orb and transcript display.

### 8. `utils.js` - Utilities
Contains utility functions for logging, events, DOM manipulation, and speech processing.

## Key Features

- **Voice-First Interaction**: Primary focus on voice input/output with minimal UI
- **Continuous Recognition**: Keeps listening for user input
- **ElevenLabs Integration**: High-quality voice synthesis for more natural AI responses
- **Persona System**: Customizable buyer personas that affect AI responses
- **Visual Feedback**: Real-time visual feedback through the voice orb
- **Event-Based Architecture**: Components communicate through events

## How to Use

### Basic Integration

```html
<script type="module">
  import Voice from '/static/js/voice/index.js';
  
  // Initialize the voice interface
  Voice.init().then(() => {
    console.log('Voice interface initialized');
    
    // Start listening
    document.getElementById('start-button').addEventListener('click', () => {
      Voice.start();
    });
    
    // Stop listening
    document.getElementById('stop-button').addEventListener('click', () => {
      Voice.stop();
    });
  });
</script>
```

### Using Personas

```javascript
// Generate a new persona of a specific type
Voice.persona.generatePersona('technical');

// Get current persona traits
const traits = Voice.state.conversation.persona;
```

### Listening for Events

```javascript
// Listen for state changes
Voice.on('stateChange', event => {
  const { type, data } = event;
  
  if (type === 'system') {
    updateUI(data);
  } else if (type === 'messageAdded') {
    addMessageToTranscript(data);
  }
});
```

## Demo Page

A demo page is available at `/voice/demo` that showcases the voice interface with all its features.

## Browser Compatibility

- **Chrome**: Full support
- **Edge**: Full support
- **Firefox**: Basic support (some features may be limited)
- **Safari**: Basic support (some features may be limited)

## Future Enhancements

- **Advanced Analytics**: More detailed analysis of speech patterns
- **Multi-Turn Context Management**: Better handling of conversation context
- **Voice Emotion Detection**: Detecting emotion in user's voice
- **Custom Voice Models**: Training custom voice models for personas
- **Mobile Optimization**: Better performance on mobile devices

## Migrating from Legacy Voice Interface

If you're migrating from the old monolithic `voice_interface.js`, follow these steps:

1. Replace any direct reference to `voice_interface.js` with a module import:
   ```javascript
   import Voice from '/static/js/voice/index.js';
   ```

2. Replace function calls with the new API:
   - Old: `startRecording()` → New: `Voice.start()`
   - Old: `stopRecording()` → New: `Voice.stop()`
   - Old: `speak(text)` → New: `Voice.speak(text)`

3. Update event listeners:
   - Old: Add event listener to DOM events
   - New: Use `Voice.on('eventName', callback)`

4. Update UI references:
   - The voice orb visualization is now handled by the `Voice.ui` module 

# Voice System with Demographic-Based Selection

This module provides a sophisticated speech-to-speech voice system that intelligently selects ElevenLabs voices based on demographic attributes for different personas.

## Features

- Speech-to-speech conversion using ElevenLabs API
- Intelligent voice selection based on demographic criteria
- Prioritized matching (gender, age, ethnicity) with configurable weights
- Voice rotation to avoid repetition
- Persona-based voice management
- Simple UI integration

## System Architecture

The voice system consists of several interrelated components:

1. **ElevenLabsSpeechService**: Core service that handles speech-to-speech API calls
2. **VoiceDatabase**: Manages voice data and selection logic using demographic attributes
3. **PersonaVoiceManager**: Connects personas to voice selection and speech processing
4. **VoiceInterface**: High-level UI integration layer

## Voice Selection System

The system selects appropriate voices based on:

- **Gender** (100% match required)
- **Age** (75% weighted importance)
- **Ethnicity** (33% weighted importance)

Additionally, it prevents the same voice from being used again until at least 5 other voices have been used, ensuring variety.

## Usage Examples

### Basic Usage

```javascript
import Voice from './voice';

// Initialize the voice interface
const voice = await Voice.init({
  apiKey: 'your-elevenlabs-api-key',
  defaultPersona: 'friendly'
});

// Start a recording
await voice.startRecording();

// Stop recording and process with current persona
await voice.stopRecording();
```

### Creating Personas with Demographic Attributes

```javascript
// Create a new persona with specific demographics
Voice.createPersonaWithDemographics(voice, 'executive', {
  gender: 'Male',
  ethnicity: 'American',
  age: 'Middle-aged',
  stability: 0.7,
  clarity: 0.8,
  style: 0.2
});

// Set as current persona
voice.setPersona('executive');
```

### Getting Voice Information

```javascript
// Get information about a specific voice
const voiceInfo = Voice.getVoiceInfo('Kd8dIzBuJvT1diS5oAPR');
console.log(`Voice: ${voiceInfo.gender} ${voiceInfo.ethnicity}, ${voiceInfo.age}`);

// Find voices matching criteria
const youngFemaleVoices = Voice.findVoices({
  gender: 'Female',
  age: 'Young'
});
```

### Configuring Voice Selection

```javascript
// Change how many other voices must be used before repeating
Voice.setVoiceRepeatThreshold(10);

// Adjust priority weights for different attributes
Voice.setPriorityWeights({
  age: 0.9,         // Increase age importance
  ethnicity: 0.5    // Increase ethnicity importance
});
```

## UI Integration

The system can be easily integrated with UI elements:

```javascript
const voice = await Voice.initWithUI({
  apiKey: 'your-elevenlabs-api-key',
  elements: {
    recordButton: document.getElementById('record-button'),
    statusIndicator: document.getElementById('status-indicator'),
    personaSelector: document.getElementById('persona-select'),
    cancelButton: document.getElementById('cancel-button')
  },
  onStateChange: (state) => {
    console.log('Voice state changed:', state);
  }
});
```

## Voice Database Structure

The voice database contains detailed information about each voice:

```javascript
{
  id: "Kd8dIzBuJvT1diS5oAPR",
  gender: "Female",
  ethnicity: "Nigerian",
  age: "Young",
  stability: 0.5,
  clarity: 0.75,
  style: 0.0,
  isLegendary: false
}
```

Special legendary voices are marked with `isLegendary: true` and can include additional attributes.

## ElevenLabs Integration

The system uses ElevenLabs' speech-to-speech functionality to maintain natural speech patterns, emotion, and prosody through the conversion process. This provides a more authentic experience than separate STT → AI → TTS pipelines.

## Voice Rotation Logic

To ensure variety, the system:

1. Tracks usage history for all voices
2. Prevents recently used voices from being selected again
3. Automatically resets if no suitable voices remain
4. Always prioritizes gender matching before other criteria

## Legendary Personas

The system includes special handling for legendary personas - unique characters with fixed voice assignments:

- **Coin Flip Carl**: Irish sailor fantasy voice (D38z5RcWu1voky8WS1ja)
- **Emoji**: Childish, animated voice (jBpfuIE2acCO8z3wKNLl)
- **Santa**: Santa Claus voice (knrPHWnBmmDHMoiMeP3l)

Legendary personas bypass the normal voice rotation system to ensure consistency and brand preservation. These voices are specially configured with appropriate stability and style settings to enhance their unique character.

### How Legendary Voices Work

Under the hood, the system:

1. Maintains a fixed mapping between legendary persona types and specific ElevenLabs voice IDs
2. Detects legendary personas via the `isLegendary` flag in their attributes
3. Bypasses the normal demographic-based selection and voice rotation system
4. Applies custom voice parameter settings (stability, clarity, style) optimized for character voices
5. Ensures the voice remains consistent across sessions, even when other voices are rotated

This approach ensures that special marketing characters maintain their distinctive voice identity, while regular personas benefit from voice variety through the rotation system.

### Benefits of Legendary Personas

- **Brand Consistency**: Key characters always sound the same, building recognition
- **Optimized Parameters**: Voice settings tuned specifically for character types
- **Special Effects**: Legendary voices can have more dramatic parameters for unique effects
- **Marketing Value**: Special voices can be used as promotional features (1% encounter rate)
- **Immune to Rotation**: Legendary voices don't get cycled out, regardless of usage frequency

### Using Legendary Personas

```javascript
// Check if a persona is legendary
const isLegendary = Voice.isLegendaryPersona(voice, 'coin_flip_carl');

// Get all legendary personas
const legendaryPersonas = Voice.getLegendaryPersonas(voice);

// Activate a legendary persona
Voice.activateLegendaryPersona(voice, 'santa');

// Get the voice ID for a legendary persona
const emojiVoiceId = Voice.getLegendaryVoiceId('emoji');
```

### Creating Custom Legendary Personas

To add your own legendary persona:

1. Get a unique voice ID from ElevenLabs 
2. Create the persona with the isLegendary flag:

```javascript
Voice.createPersonaWithDemographics(voice, 'pirate_captain', {
  isLegendary: true,
  gender: 'Male',
  ethnicity: 'British',
  age: 'Middle-aged',
  stability: 0.4,
  clarity: 0.7,
  style: 0.8
});

// Then update the voice manager's legendary map
voice.personaManager.legendaryVoiceMap['pirate_captain'] = 'your-voice-id-here';
```

### Integrating with UI

For applications that present persona options to users, you can use the legendary status to add special styling or indicators:

```javascript
// Get all personas
const allPersonas = voice.getAvailablePersonas();

// Render persona options with special styling for legendary ones
allPersonas.forEach(personaType => {
  const isLegendary = Voice.isLegendaryPersona(voice, personaType);
  
  // Create option with special styling for legendary personas
  const option = document.createElement('div');
  option.classList.add('persona-option');
  
  if (isLegendary) {
    option.classList.add('legendary-persona');
    option.innerHTML = `⭐ ${personaType} ⭐`; // Special indicator
  } else {
    option.textContent = personaType;
  }
  
  personaContainer.appendChild(option);
});
```

### Testing Legendary Personas

To verify that your legendary personas are working correctly:

1. Check that the voice ID is consistently the same:
   ```javascript
   voice.personaManager.setPersona('coin_flip_carl');
   const config = voice.personaManager.getPersonaConfig();
   console.log(config.voiceId); // Should always be D38z5RcWu1voky8WS1ja
   ```

2. Verify that the voice doesn't change after multiple uses:
   ```javascript
   // Use the voice multiple times, then verify it's still the same
   for (let i = 0; i < 10; i++) {
     // Use other voices in between
     voice.personaManager.setPersona('analytical');
     voice.personaManager.setPersona('friendly');
     
     // Switch back to legendary and check
     voice.personaManager.setPersona('coin_flip_carl');
     const config = voice.personaManager.getPersonaConfig();
     console.assert(config.voiceId === 'D38z5RcWu1voky8WS1ja', 'Voice ID changed!');
   }
   ```

## Advanced Configuration

The system can be further customized by:

- Adding new voices to the database
- Adjusting matching weights for different attributes
- Creating custom persona categories
- Fine-tuning voice stability and clarity parameters

## Dependencies

- Web Audio API for audio recording
- MediaRecorder API for capturing audio
- ElevenLabs API for speech-to-speech processing 
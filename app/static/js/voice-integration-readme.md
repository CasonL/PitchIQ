# Voice Recognition Integration for PitchIQ

This document explains the voice recognition implementation for the PitchIQ application.

## Overview

The voice recognition system uses two different underlying technologies:

1. **For premium users**: Official Deepgram SDK for high-quality speech recognition
2. **For free tier users**: Web Speech API as a fallback

## Implementation Details

### Key Files

- `app/static/js/voice-recognition.js`: Main implementation of the `VoiceRecognitionManager` class
- `app/templates/chat.html`: Integration of the voice recognition into the chat interface
- `app/services/deepgram_service.py`: Server-side implementation for Deepgram API token generation

### How It Works

1. **Initialization**:
   - VoiceRecognitionManager is created when the chat page loads
   - For premium users, it fetches a Deepgram API token from the server
   - For free users, it initializes the Web Speech API

2. **Recording**:
   - When the user clicks the microphone button, it requests microphone access
   - For premium users, it creates a MediaRecorder that sends audio data to Deepgram
   - For free users, it uses the Web Speech API's built-in recognition

3. **Transcript Handling**:
   - Both implementations provide transcripts with similar interfaces
   - The transcript is shown in real-time and added to the chat input when finalized

4. **Analytics**:
   - Premium users get additional analytics like confidence scores and pace information
   - These are displayed in the voice feedback panel

5. **Visualization**:
   - Audio levels are visualized in a canvas element

## Maintenance Tips

### Upgrading Deepgram SDK

The Deepgram SDK is loaded from a CDN. To update to a newer version:

1. Update the script tag in `app/templates/chat.html` to reference the new version
2. Test thoroughly with premium accounts to ensure compatibility

### Server-Side Token Generation

In development mode, the server returns the master API key directly. In production:

1. Uncomment the token generation code in `app/services/deepgram_service.py`
2. Implement proper scoping and time limits for the temporary tokens

### Common Issues

1. **Microphone Access Denied**: Ensure proper error handling when users deny microphone permissions
2. **Recording Not Starting**: Check console for errors and ensure MediaRecorder is properly initialized
3. **Recognition Not Accurate**: Adjust model parameters in the startRecording method

## Testing

To test the voice recognition:

1. **For free tier**: Use any browser that supports Web Speech API
2. **For premium tier**: Set `isPremiumUser` to true and ensure the Deepgram API key is valid

## Security Considerations

1. Temporary API keys should be short-lived (5 minutes or less)
2. Never expose the master API key in client-side code
3. Implement proper user authentication before allowing premium voice features 
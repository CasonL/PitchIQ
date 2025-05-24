# Voice Module Documentation

## Overview
The voice module provides speech-to-text and text-to-speech capabilities for the PitchIQ application. This document focuses on the Text-to-Speech (TTS) functionality using the ElevenLabs API.

## Text-to-Speech API

### Endpoint
```
POST /voice/api/tts
```

### Authentication
This endpoint requires the user to be logged in (uses the `@login_required` decorator).

### Request Format
The endpoint accepts a JSON payload with the following parameters:

```json
{
  "text": "Text to convert to speech",
  "voice_id": "9BWtsMINqrJLrRacOk9x"  // Optional, defaults to "Aria" voice if not provided
}
```

### Response
On success, the endpoint returns the audio data as an MP3 file with the appropriate MIME type.

On failure, it returns a JSON object with an error message and appropriate HTTP status code.

### Available Voices
Below are some of the available voices from ElevenLabs. For the complete and up-to-date list, run the `list_elevenlabs_voices.py` script.

| Voice ID | Name | Description |
|----------|------|-------------|
| 9BWtsMINqrJLrRacOk9x | Aria | Default voice |
| CwhRBWXzGAHq8TQ4Fs17 | Roger | Male voice |
| EXAVITQu4vr4xnSDxMaL | Sarah | Female voice |
| TX3LPaxmHKxFdv7VOQHJ | Liam | Male voice |
| XB0fDUnXU5powFXDhCwa | Charlotte | Female voice |
| onwK4e9ZLuTAKqWW03F9 | Daniel | Male voice |
| pFZP5JQG7iQjIQuC4Bku | Lily | Female voice |

## Usage Examples

### Sample JavaScript Code
```javascript
async function convertTextToSpeech(text, voiceId = '9BWtsMINqrJLrRacOk9x') {
  try {
    const response = await fetch('/voice/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        voice_id: voiceId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to convert text to speech');
    }
    
    // Get the audio data as a blob
    const audioBlob = await response.blob();
    
    // Create a URL for the blob
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Play the audio
    const audio = new Audio(audioUrl);
    audio.play();
    
    return audioUrl;
  } catch (error) {
    console.error('Error converting text to speech:', error);
    throw error;
  }
}
```

### Sample Python Code
```python
import requests

def text_to_speech(text, voice_id='9BWtsMINqrJLrRacOk9x'):
    url = 'http://localhost:5001/voice/api/tts'
    
    data = {
        'text': text,
        'voice_id': voice_id
    }
    
    headers = {
        'Content-Type': 'application/json'
    }
    
    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code != 200:
        print(f"Error: {response.json().get('error', 'Unknown error')}")
        return None
    
    # Save the audio file
    with open('output.mp3', 'wb') as f:
        f.write(response.content)
    
    print('Audio saved as output.mp3')
    return 'output.mp3'
```

## Troubleshooting

### Common Issues
1. **401 Unauthorized** - You need to be logged in to use this endpoint. Make sure your session is active.
2. **400 Bad Request** - Check that your JSON payload includes the required `text` parameter.
3. **500 Internal Server Error** - This could indicate an issue with the ElevenLabs API key or the voice ID you're using.

### Voice Not Found Error
If you get an error saying the voice ID was not found, make sure you're using a valid voice ID. Run the `list_elevenlabs_voices.py` script to get a list of valid voice IDs for your account. 
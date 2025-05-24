import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_elevenlabs_voices():
    """Get available voices from ElevenLabs API."""
    # Get ElevenLabs API key
    eleven_labs_api_key = os.environ.get('ELEVEN_LABS_API_KEY') or os.environ.get('ELEVENLABS_API_KEY')
    
    if not eleven_labs_api_key:
        print("ERROR: ElevenLabs API key not found in environment variables")
        return None
    
    print(f"API Key found: {eleven_labs_api_key[:5]}...{eleven_labs_api_key[-5:]}")
    
    # ElevenLabs API endpoint for voices
    url = "https://api.elevenlabs.io/v1/voices"
    
    # Set headers with API key
    headers = {
        "Accept": "application/json",
        "xi-api-key": eleven_labs_api_key
    }
    
    try:
        # Make request to ElevenLabs
        print("Getting available voices from ElevenLabs API...")
        response = requests.get(url, headers=headers)
        
        print(f"Response status code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error response: {response.text}")
            return None
            
        voices_data = response.json()
        print(f"Found {len(voices_data.get('voices', []))} voices:")
        for voice in voices_data.get('voices', []):
            print(f"ID: {voice.get('voice_id')} - Name: {voice.get('name')}")
            
        return voices_data.get('voices', [])
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_elevenlabs_api(voice_id=None):
    """Test the ElevenLabs API with a simple request."""
    # Get available voices
    voices = get_elevenlabs_voices()
    
    if not voices:
        print("No voices available. Cannot proceed with test.")
        return False
    
    # Use the first available voice if none specified
    if not voice_id and voices:
        voice_id = voices[0].get('voice_id')
        print(f"Using voice ID: {voice_id}")
    
    # Get ElevenLabs API key
    eleven_labs_api_key = os.environ.get('ELEVEN_LABS_API_KEY') or os.environ.get('ELEVENLABS_API_KEY')
    
    # ElevenLabs API endpoint
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    # Set headers with API key
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": eleven_labs_api_key
    }
    
    # Set up request data
    payload = {
        "text": "This is a test of the ElevenLabs API integration.",
        "model_id": "eleven_monolingual_v1",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75
        }
    }
    
    try:
        # Make request to ElevenLabs
        print("Sending request to ElevenLabs API...")
        response = requests.post(url, json=payload, headers=headers)
        
        print(f"Response status code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Error response: {response.text}")
            return False
            
        # Save the audio file
        with open("test_audio.mp3", "wb") as f:
            f.write(response.content)
        
        print("Success! Audio file saved as 'test_audio.mp3'")
        return True
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    test_elevenlabs_api() 
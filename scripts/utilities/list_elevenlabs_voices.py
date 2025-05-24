import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def list_elevenlabs_voices():
    """List all available voices from ElevenLabs API and save to a JSON file."""
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
        voice_count = len(voices_data.get('voices', []))
        print(f"Found {voice_count} voices:")
        
        # Create a simplified voice list
        voice_list = []
        for voice in voices_data.get('voices', []):
            voice_id = voice.get('voice_id')
            name = voice.get('name')
            print(f"ID: {voice_id} - Name: {name}")
            
            voice_list.append({
                'id': voice_id,
                'name': name,
                'description': voice.get('description', ''),
                'gender': voice.get('labels', {}).get('gender', 'unknown'),
                'accent': voice.get('labels', {}).get('accent', 'unknown'),
            })
        
        # Save to JSON file
        with open('elevenlabs_voices.json', 'w') as f:
            json.dump(voice_list, f, indent=2)
        
        print(f"Saved {voice_count} voices to elevenlabs_voices.json")
        return voice_list
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

if __name__ == "__main__":
    list_elevenlabs_voices() 
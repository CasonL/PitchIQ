import requests
import os
import json

def test_tts_endpoint():
    """Test the TTS endpoint in our Flask application.
    
    Note: You need to be logged in to use this endpoint.
    This script will save the audio as tts_response.mp3 if successful.
    """
    # Base URL for the Flask app
    base_url = "http://localhost:5001"
    
    # Endpoint URL
    url = f"{base_url}/voice/api/tts"
    
    # Request data
    data = {
        "text": "Hello, this is a test of the TTS endpoint in our Flask application.",
        "voice_id": "9BWtsMINqrJLrRacOk9x"  # Aria voice
    }
    
    # Set headers
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        # Make request to Flask endpoint
        print(f"Sending request to {url}...")
        response = requests.post(url, json=data, headers=headers)
        
        print(f"Response status code: {response.status_code}")
        
        if response.status_code != 200:
            print("Error response:")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
            return False
            
        # Save the audio file
        with open("tts_response.mp3", "wb") as f:
            f.write(response.content)
        
        print("Success! Audio file saved as 'tts_response.mp3'")
        return True
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    test_tts_endpoint() 
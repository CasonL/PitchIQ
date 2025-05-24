import os
import requests
from flask import request, jsonify, Response

@app.route('/api/tts', methods=['POST'])
def text_to_speech():
    data = request.json
    text = data.get('text', '')
    voice_id = data.get('voice_id', 'EXAVITQu4vr4xnSDxMaL')  # Default to Emily
    model_id = data.get('model_id', 'eleven_monolingual_v1')
    stream = data.get('stream', False)
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    # Get ElevenLabs API key
    eleven_labs_api_key = os.environ.get('ELEVEN_LABS_API_KEY')
    if not eleven_labs_api_key:
        return jsonify({"error": "ElevenLabs API key not configured"}), 500
    
    # Prepare the request to ElevenLabs API
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream" if stream else f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": eleven_labs_api_key
    }
    
    body = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.5
        }
    }
    
    try:
        # Make the request to ElevenLabs
        response = requests.post(url, json=body, headers=headers, stream=stream)
        response.raise_for_status()
        
        if stream:
            # Return a streaming response
            def generate():
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        yield chunk
            
            return Response(generate(), mimetype="audio/mpeg")
        else:
            # Return the full audio file
            return Response(response.content, mimetype="audio/mpeg")
    
    except requests.exceptions.RequestException as e:
        print(f"Error calling ElevenLabs API: {e}")
        return jsonify({"error": str(e)}), 500

# Register the main blueprint
from app.main import main as main_blueprint
app.register_blueprint(main_blueprint)

# Register demo blueprint
from app.routes import demo
app.register_blueprint(demo, url_prefix='/demo')

from flask import Blueprint, render_template, request, jsonify
import os
import requests

voice_bp = Blueprint('voice', __name__, url_prefix='/voice')

@voice_bp.route('/demo')
def voice_demo():
    """Render the voice interface demo page."""
    return render_template('voice/demo.html')

@voice_bp.route('/api/elevenlabs-key')
def get_elevenlabs_key():
    """Get the ElevenLabs API key."""
    api_key = os.environ.get('ELEVENLABS_API_KEY', '')
    return jsonify({'apiKey': api_key})

@voice_bp.route('/api/get_deepgram_token')
def get_deepgram_token():
    """Get a temporary Deepgram API token for client-side usage."""
    api_key = os.environ.get('DEEPGRAM_API_KEY', '')
    if not api_key:
        return jsonify({'error': 'DEEPGRAM_API_KEY not configured'}), 500
    
    # For security, we should proxy this to our target server
    try:
        # Try to connect to the other server's endpoint
        response = requests.get('http://127.0.0.1:5001/api/get_deepgram_token')
        if response.status_code == 200:
            return jsonify(response.json())
        else:
            # Fallback: Generate a token ourselves
            return jsonify({
                'token': 'DEMO_TOKEN',  # Replace with actual token generation
                'expiration': 300  # 5 minutes
            })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@voice_bp.route('/chat')
def chat():
    """Render the voice-enabled chat interface."""
    # Check if voice mode is enabled
    voice_mode = request.args.get('voice_mode', 'disabled')
    
    # You can pass more parameters based on requirements
    return render_template('chat/voice_chat.html', 
                          voice_mode=voice_mode,
                          page_title="Voice Chat Interface") 
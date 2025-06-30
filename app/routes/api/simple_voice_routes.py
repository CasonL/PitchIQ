from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
import os
import logging
import requests
import io
import tempfile
from app.services.gpt4o_service import GPT4oService

logger = logging.getLogger(__name__)

simple_voice_bp = Blueprint('simple_voice', __name__)

@simple_voice_bp.route('/transcribe', methods=['POST'])
@login_required
def transcribe_audio():
    """Transcribe audio using Deepgram STT API"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({'error': 'No audio file selected'}), 400
        
        # Get Deepgram API key
        api_key = os.getenv('DEEPGRAM_API_KEY')
        if not api_key:
            return jsonify({'error': 'Deepgram API key not configured'}), 500
        
        # Prepare audio data
        audio_data = audio_file.read()
        
        # Call Deepgram STT API
        url = "https://api.deepgram.com/v1/listen"
        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": "audio/wav"
        }
        
        params = {
            "model": "nova-2",
            "language": "en-US",
            "smart_format": "true",
            "punctuate": "true"
        }
        
        response = requests.post(
            url,
            headers=headers,
            params=params,
            data=audio_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            transcript = ""
            
            # Extract transcript from Deepgram response
            if 'results' in result and 'channels' in result['results']:
                channels = result['results']['channels']
                if channels and 'alternatives' in channels[0]:
                    alternatives = channels[0]['alternatives']
                    if alternatives and 'transcript' in alternatives[0]:
                        transcript = alternatives[0]['transcript']
            
            logger.info(f"Transcription successful for user {current_user.id}: {transcript[:50]}...")
            return jsonify({
                'success': True,
                'transcript': transcript
            })
        else:
            logger.error(f"Deepgram STT error: {response.status_code} - {response.text}")
            return jsonify({
                'error': 'Failed to transcribe audio',
                'details': response.text
            }), 500
            
    except Exception as e:
        logger.error(f"Error in transcribe_audio: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@simple_voice_bp.route('/respond', methods=['POST'])
@login_required
def generate_response():
    """Generate AI response to user message"""
    try:
        data = request.get_json()
        if not data or 'message' not in data:
            return jsonify({'error': 'No message provided'}), 400
        
        user_message = data['message']
        context = data.get('context', 'general conversation')
        
        # Create sales training prompt
        prompt = f"""You are an AI sales coach helping someone practice their sales skills. 
        
Context: {context}

The user just said: "{user_message}"

Respond as if you're a potential customer or provide coaching feedback. Keep your response:
- Conversational and natural
- Under 50 words
- Helpful for sales training
- Appropriate to the context

Your response:"""
        
        # Use GPT-4o service to generate response
        gpt_service = GPT4oService()
        ai_response = gpt_service.generate_response(prompt)
        
        logger.info(f"Generated response for user {current_user.id}: {ai_response[:50]}...")
        return jsonify({
            'success': True,
            'response': ai_response
        })
        
    except Exception as e:
        logger.error(f"Error in generate_response: {str(e)}")
        return jsonify({'error': 'Failed to generate response'}), 500

@simple_voice_bp.route('/speak', methods=['POST'])
@login_required
def text_to_speech():
    """Convert text to speech using Deepgram TTS API"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({'error': 'No text provided'}), 400
        
        text = data['text']
        if not text.strip():
            return jsonify({'error': 'Empty text provided'}), 400
        
        # Get Deepgram API key
        api_key = os.getenv('DEEPGRAM_API_KEY')
        if not api_key:
            return jsonify({'error': 'Deepgram API key not configured'}), 500
        
        # Call Deepgram TTS API
        url = "https://api.deepgram.com/v1/speak"
        headers = {
            "Authorization": f"Token {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "text": text,
            "model": "aura-asteria-en",
            "encoding": "mp3",
            "sample_rate": 24000
        }
        
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            logger.info(f"TTS successful for user {current_user.id}: {text[:30]}...")
            
            # Return audio data directly
            return response.content, 200, {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'inline; filename="speech.mp3"'
            }
        else:
            logger.error(f"Deepgram TTS error: {response.status_code} - {response.text}")
            return jsonify({
                'error': 'Failed to generate speech',
                'details': response.text
            }), 500
            
    except Exception as e:
        logger.error(f"Error in text_to_speech: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500 
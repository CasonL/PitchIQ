from flask import Blueprint, render_template, request, jsonify, current_app
import os

voice_demo = Blueprint('voice_demo', __name__)

@voice_demo.route('/voice-demo', methods=['GET'])
def voice_demo_page():
    """Serve the voice demo page"""
    return render_template('voice_demo.html')

@voice_demo.route('/voice-demo/config', methods=['GET'])
def voice_demo_config():
    """Provide configuration for the voice demo"""
    config = {
        'deepgramApiKey': os.environ.get('DEEPGRAM_API_KEY', ''),
        'elevenLabsApiKey': os.environ.get('ELEVENLABS_API_KEY', '')
    }
    return jsonify(config) 
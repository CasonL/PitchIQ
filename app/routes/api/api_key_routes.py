"""
API Key proxy routes for Marcus demo.
These routes return API keys to Netlify Functions so they can proxy external API calls.
Keys are loaded from instance/.env by Flask config.
"""
import os
from flask import Blueprint, jsonify
from flask_cors import cross_origin

api_keys_bp = Blueprint('api_keys', __name__, url_prefix='/api')

@api_keys_bp.route('/deepgram/key', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_deepgram_key():
    """Return Deepgram API key for STT service"""
    api_key = os.environ.get('DEEPGRAM_API_KEY')
    
    if not api_key:
        return jsonify({'error': 'Deepgram API key not configured'}), 500
    
    return jsonify({'api_key': api_key}), 200


@api_keys_bp.route('/cartesia/key', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_cartesia_key():
    """Return Cartesia API key for TTS service"""
    api_key = os.environ.get('CARTESIA_API_KEY')
    
    if not api_key:
        return jsonify({'error': 'Cartesia API key not configured'}), 500
    
    return jsonify({'api_key': api_key}), 200

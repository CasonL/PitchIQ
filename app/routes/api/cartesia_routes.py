"""
Cartesia TTS API Routes
"""
from flask import Blueprint, jsonify, request
import os
import logging
from functools import wraps
from time import time

logger = logging.getLogger(__name__)

cartesia_bp = Blueprint('cartesia', __name__)

# Simple in-memory rate limiting (per IP)
_rate_limit_cache = {}
_RATE_LIMIT_WINDOW = 60  # seconds
_RATE_LIMIT_MAX_REQUESTS = 100  # requests per window

def rate_limit(f):
    """Simple rate limiter decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get client IP
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        
        # Check rate limit
        now = time()
        if client_ip in _rate_limit_cache:
            requests, window_start = _rate_limit_cache[client_ip]
            
            # Reset window if expired
            if now - window_start > _RATE_LIMIT_WINDOW:
                _rate_limit_cache[client_ip] = (1, now)
            elif requests >= _RATE_LIMIT_MAX_REQUESTS:
                logger.warning(f'Rate limit exceeded for IP: {client_ip}')
                return jsonify({'error': 'Rate limit exceeded'}), 429
            else:
                _rate_limit_cache[client_ip] = (requests + 1, window_start)
        else:
            _rate_limit_cache[client_ip] = (1, now)
        
        return f(*args, **kwargs)
    return decorated_function

@cartesia_bp.route('/token', methods=['GET'])
@rate_limit
def get_cartesia_token():
    """
    Get Cartesia API token for TTS (public endpoint with rate limiting)
    """
    try:
        api_key = os.getenv('CARTESIA_API_KEY')
        
        if not api_key:
            logger.error('Cartesia API key not configured')
            return jsonify({'error': 'Cartesia API key not configured'}), 500
        
        return jsonify({
            'success': True,
            'key': api_key
        })
        
    except Exception as e:
        logger.error(f"Error fetching Cartesia token: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

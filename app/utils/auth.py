"""
Authentication utilities for the application.
"""
from functools import wraps
from flask import request, jsonify, g, current_app
from flask_login import current_user

def require_auth(f):
    """
    Decorator to require authentication for API endpoints.
    In development mode, authentication is not required.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        # For development purposes, we'll bypass authentication
        # In production, this should validate the user is authenticated
        if current_app.config.get('ENV') == 'production':
            if not current_user.is_authenticated:
                return jsonify({"error": "Authentication required"}), 401
        return f(*args, **kwargs)
    return decorated

def require_api_key(f):
    """
    Decorator to require an API key for API routes.
    Returns a 401 Unauthorized response if the API key is invalid.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip API key check in development mode if configured
        if current_app.config.get('SKIP_API_KEY_CHECK'):
            return f(*args, **kwargs)
        
        # Get the API key from the request
        api_key = request.headers.get('X-API-Key')
        
        # Check if the API key is valid
        if not api_key or api_key != current_app.config.get('API_KEY'):
            return jsonify({"error": "Invalid API key"}), 401
        
        return f(*args, **kwargs)
    
    return decorated_function 
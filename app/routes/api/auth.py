"""
API Authentication Routes
"""
from flask import Blueprint, jsonify
from flask_login import current_user

# Create blueprint
api_auth_bp = Blueprint('api_auth', __name__, url_prefix='/api/auth')

@api_auth_bp.route('/status', methods=['GET'])
def check_auth_status():
    """
    Check the current user's authentication status.
    Returns basic user info if authenticated.
    """
    if current_user.is_authenticated:
        # Optionally return more user details if needed by the frontend
        user_info = {
            'id': current_user.id,
            'name': current_user.name,
            'email': current_user.email
            # Add other relevant fields like profile info if necessary
        }
        return jsonify({'isAuthenticated': True, 'user': user_info})
    else:
        return jsonify({'isAuthenticated': False}) 
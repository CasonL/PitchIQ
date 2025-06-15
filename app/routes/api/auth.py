"""
API Authentication Routes
"""
from flask import Blueprint, jsonify, request, session, current_app
from flask_login import current_user, login_user
from flask_wtf.csrf import generate_csrf
from app.extensions import db, csrf
from app.models import User
from app.auth.security import rate_limit, check_login_attempts, record_failed_login, record_successful_login

auth_api_bp = Blueprint('auth_api', __name__)

@auth_api_bp.route('/status')
def get_auth_status():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'email': current_user.email,
                'onboardingComplete': getattr(current_user.profile, 'onboarding_complete', False)
            }
        })
    return jsonify({'authenticated': False})

@auth_api_bp.route('/login', methods=['POST'])
@rate_limit(limit=10, window=60)
@csrf.exempt
def api_login():
    """API login endpoint for frontend authentication."""
    try:
        # Get JSON data
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid JSON data'}), 400
        
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        remember = data.get('remember', False)
        
        # Input validation
        if not email or not password:
            return jsonify({'error': 'Please provide both email and password'}), 400
        
        # Check if account is locked
        is_allowed, lockout_time = check_login_attempts(email)
        if not is_allowed:
            return jsonify({
                'error': f'Too many login attempts. Try again in {lockout_time} seconds.'
            }), 429
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            is_locked, lockout_time = record_failed_login(email)
            if is_locked:
                return jsonify({
                    'error': f'Account locked due to too many failed attempts. Try again in {lockout_time} seconds.'
                }), 429
            return jsonify({'error': 'Invalid email or password. Please try again.'}), 401
        
        # Login successful
        record_successful_login(email)
        login_user(user, remember=remember)
        
        # Make session permanent so it respects PERMANENT_SESSION_LIFETIME
        session.permanent = True
        
        # Check if user has a profile and onboarding status
        onboarding_complete = False
        if hasattr(user, 'profile') and user.profile:
            onboarding_complete = user.profile.onboarding_complete
        
        redirect_url = '/personalize' if not onboarding_complete else '/dashboard'
        
        return jsonify({
            'status': 'success',
            'message': 'Login successful',
            'redirect': redirect_url,
            'user': {
                'id': user.id,
                'email': user.email,
                'onboardingComplete': onboarding_complete
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"API login error: {str(e)}")
        import traceback
        current_app.logger.error(f"API login traceback: {traceback.format_exc()}")
        return jsonify({'error': 'An internal error occurred during login. Please try again.'}), 500

@auth_api_bp.route('/logout', methods=['POST'])
def api_logout():
    """API logout endpoint for frontend."""
    try:
        from flask_login import logout_user, current_user
        
        # Log the logout attempt
        current_app.logger.info(f"API logout called for user: {current_user.id if current_user.is_authenticated else 'Anonymous'}")
        
        # Logout the user
        logout_user()
        
        # Clear the session
        session.clear()
        
        return jsonify({
            'status': 'success',
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"API logout error: {str(e)}")
        import traceback
        current_app.logger.error(f"API logout traceback: {traceback.format_exc()}")
        return jsonify({'error': 'An error occurred during logout. Please try again.'}), 500

@auth_api_bp.route('/csrf-token')
def get_csrf_token():
    token = generate_csrf()
    return jsonify({'csrfToken': token}) 
"""
API Authentication Routes
"""
from flask import Blueprint, jsonify, request, session, current_app
from flask_login import current_user, login_user
from flask_wtf.csrf import generate_csrf
from app.extensions import db, csrf
from app.models import User, UserProfile
from app.auth.security import rate_limit, check_login_attempts, record_failed_login, record_successful_login, validate_password
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import secrets
import json

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

@auth_api_bp.route('/test-register', methods=['POST'])
def test_register():
    """Test endpoint to debug registration issues."""
    try:
        current_app.logger.info("Test register endpoint called")
        data = request.get_json()
        return jsonify({
            'status': 'success',
            'message': 'Test endpoint working',
            'received_data': data
        }), 200
    except Exception as e:
        current_app.logger.error(f"Test register error: {e}")
        return jsonify({'error': str(e)}), 500

@auth_api_bp.route('/debug', methods=['GET', 'POST'])
def debug_endpoint():
    """Simple debug endpoint to test POST requests."""
    return jsonify({
        'method': request.method,
        'path': request.path,
        'status': 'working'
    }), 200

@auth_api_bp.route('/register', methods=['POST'])
@csrf.exempt
def api_register():
    """API register endpoint for frontend authentication."""
    email = "unknown"  # Initialize email variable for error handling
    
    # Log the start of the function
    current_app.logger.info("Registration endpoint called")
    
    try:
        # Get JSON data
        data = request.get_json()
        current_app.logger.info(f"Received data: {data}")
        
        if not data:
            current_app.logger.error("No JSON data received")
            return jsonify({'error': 'Invalid JSON data'}), 400
        
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
        
        current_app.logger.info(f"Processing registration for: {email}")
        
        # Validate input
        if not name or not email or not password:
            current_app.logger.error("Missing required fields")
            return jsonify({'error': 'All fields are required'}), 400
        
        if password != confirm_password:
            current_app.logger.error("Password mismatch")
            return jsonify({'error': 'Passwords do not match'}), 400
        
        # Validate password strength
        current_app.logger.info("Validating password strength")
        is_valid, error_message = validate_password(password)
        if not is_valid:
            current_app.logger.error(f"Password validation failed: {error_message}")
            return jsonify({'error': error_message}), 400
        
        # Check if email already exists
        current_app.logger.info("Checking if email exists")
        user_exists = User.query.filter_by(email=email).first()
        if user_exists:
            current_app.logger.warning(f"Email already exists: {email}")
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user
        current_app.logger.info("Creating new user")
        new_user = User(name=name, email=email)
        new_user.set_password(password)
        
        # Generate email verification token
        new_user.email_verification_token = secrets.token_urlsafe(32)
        new_user.email_verification_token_expires = datetime.utcnow() + timedelta(hours=24)
        
        current_app.logger.info("Adding user to database")
        db.session.add(new_user)
        db.session.flush()  # Flush to get the new_user.id
        current_app.logger.info(f"User created with ID: {new_user.id}")

        # Create user profile with reasonable defaults
        current_app.logger.info("Creating user profile")
        profile = UserProfile(
            user_id=new_user.id,
            experience_level='intermediate',
            product_type='Software',
            target_market='B2B',
            onboarding_complete=False,
            initial_setup_complete=False,
            onboarding_step='experience',
            total_roleplays=0,
            total_feedback_received=0,
            objection_handling_scores=json.dumps({
                "price": 7.0, "competition": 6.5, "need": 7.5, "timing": 6.0
            })
        )
        db.session.add(profile)
        
        # Final commit for both user and profile
        current_app.logger.info("Committing to database")
        db.session.commit()
        current_app.logger.info("Database commit successful")

        # Send verification email (optional - can be implemented later)
        try:
            # Temporarily disabled for debugging
            # from app.services.email_service import send_verification_email
            # send_verification_email(new_user)
            current_app.logger.info(f"Email sending temporarily disabled for debugging")
        except Exception as e_email:
            current_app.logger.error(f"Failed to send verification email to {new_user.email}: {e_email}")
        
        # Log in the new user
        current_app.logger.info("Logging in user")
        login_user(new_user)
        
        # Make session permanent so it respects PERMANENT_SESSION_LIFETIME
        session.permanent = True
        
        # Prepare user data for the response
        user_data_for_response = {
            'id': new_user.id,
            'name': new_user.name,
            'email': new_user.email,
            'role': new_user.role,
            'onboardingComplete': profile.onboarding_complete,
            'onboarding_complete': profile.onboarding_complete,
            'subscription_tier': profile.subscription_tier,
            'is_premium': profile.is_premium(),
            'can_use_roleplays': profile.can_use_roleplays(),
            'email_verified': new_user.is_email_verified,
        }
        
        # Success response
        redirect_url = '/personalize' if not profile.onboarding_complete else '/dashboard'
        
        response_data = {
            'status': 'success',
            'message': 'Registration successful',
            'user': user_data_for_response,
            'redirect': redirect_url,
            'plan_type': 'free' if not profile.is_premium() else 'premium'
        }
        
        record_successful_login(request.remote_addr)
        current_app.logger.info(f"New user registered successfully: {new_user.email} (ID: {new_user.id})")
        
        return jsonify(response_data), 201
        
    except IntegrityError as e:
        db.session.rollback()
        current_app.logger.warning(f"IntegrityError during registration for email {email}: {e}")
        return jsonify({'error': 'Email already registered'}), 400
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Unexpected error during registration for {email}: {e}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred during registration.'}), 500

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
        is_allowed, lockout_time = check_login_attempts(request.remote_addr)
        if not is_allowed:
            return jsonify({
                'error': f'Too many login attempts. Try again in {lockout_time} seconds.'
            }), 429
        
        # Find user
        user = User.query.filter_by(email=email).first()
        
        if not user or not user.check_password(password):
            is_locked, lockout_time = record_failed_login(request.remote_addr)
            if is_locked:
                return jsonify({
                    'error': f'Account locked due to too many failed attempts. Try again in {lockout_time} seconds.'
                }), 429
            return jsonify({'error': 'Invalid email or password. Please try again.'}), 401
        
        # Login successful
        record_successful_login(request.remote_addr)
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
"""
Authentication routes for the Sales Training AI application.

This module provides routes for user registration, login, and logout.
It also includes Google OAuth integration and password reset functionality.
"""
import os
import secrets
from datetime import datetime, timedelta
from flask import Blueprint, render_template, redirect, url_for, request, flash, session, jsonify, g, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User
from auth_security import validate_password, check_rate_limit, record_failed_login, record_successful_login, csrf_required, rate_limit, check_login_attempts
from email_service import send_password_reset_email

# OAuth for Google login
from authlib.integrations.flask_client import OAuth

# Create blueprint
auth = Blueprint('auth', __name__, url_prefix='/auth')

# Initialize OAuth
oauth = OAuth()

# We'll initialize Google in the record_params function
google = None

@auth.record_once
def record_params(setup_state):
    app = setup_state.app
    oauth.init_app(app)
    
    # Register Google OAuth provider after OAuth is initialized with the app
    global google
    google = oauth.register(
        name='google',
        client_id=app.config.get('GOOGLE_CLIENT_ID') or os.environ.get('GOOGLE_CLIENT_ID'),
        client_secret=app.config.get('GOOGLE_CLIENT_SECRET') or os.environ.get('GOOGLE_CLIENT_SECRET'),
        access_token_url='https://accounts.google.com/o/oauth2/token',
        access_token_params=None,
        authorize_url='https://accounts.google.com/o/oauth2/auth',
        authorize_params=None,
        api_base_url='https://www.googleapis.com/oauth2/v1/',
        client_kwargs={'scope': 'openid email profile'},
    )

@auth.route('/login')
def login():
    """Login page."""
    # Redirect if already logged in
    if current_user.is_authenticated:
        return redirect(url_for('chat.dashboard'))
    
    # Check for next parameter
    next_url = request.args.get('next')
    if next_url:
        session['next_url'] = next_url
    
    return render_template('auth/login.html')

@auth.route('/login', methods=['POST'])
@csrf_required
@rate_limit(limit=5, window=300)  # 5 requests per 5 minutes
def login_post():
    """Handle login form submission."""
    # Get form data
    if request.is_json:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        remember = data.get('remember', False)
    else:
        email = request.form.get('email')
        password = request.form.get('password')
        remember = request.form.get('remember') == 'on'
    
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
    
    # Check password
    if not user or not user.check_password(password):
        # Record failed login
        is_locked, lockout_time = record_failed_login(email)
        
        if is_locked:
            return jsonify({
                'error': f'Account locked due to too many failed attempts. Try again in {lockout_time} seconds.'
            }), 429
        
        return jsonify({'error': 'Invalid email or password. Please try again.'}), 401
    
    # Record successful login
    record_successful_login(email)
    
    # Log user in
    login_user(user, remember=remember)
    
    # Get redirect URL
    next_url = session.pop('next_url', None) or url_for('chat.dashboard')
    
    return jsonify({
        'status': 'success',
        'redirect': next_url
    })

@auth.route('/signup')
def signup():
    """Signup page."""
    # Redirect if already logged in
    if current_user.is_authenticated:
        return redirect(url_for('chat.dashboard'))
    
    return render_template('auth/signup.html')

@auth.route('/register', methods=['POST'])
@csrf_required
@rate_limit(limit=10, window=3600)  # 10 requests per hour
def register():
    """Handle registration form submission."""
    # Get registration data
    if request.is_json:
        data = request.get_json()
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
    else:
        name = request.form.get('name')
        email = request.form.get('email')
        password = request.form.get('password')
    
    # Input validation
    if not name or not email or not password:
        return jsonify({'error': 'Please provide all required fields'}), 400
    
    # Check if email already exists
    user = User.query.filter_by(email=email).first()
    if user:
        return jsonify({'error': 'Email address already in use'}), 400
    
    # Validate password strength
    is_valid, error_message = validate_password(password)
    if not is_valid:
        return jsonify({'error': error_message}), 400
    
    # Create new user
    new_user = User(
        name=name,
        email=email
    )
    new_user.set_password(password)
    
    # Initialize default skills
    new_user.skills_dict = {
        "rapport_building": 0,
        "needs_discovery": 0,
        "objection_handling": 0,
        "closing": 0,
        "product_knowledge": 0
    }
    
    # Save to database
    db.session.add(new_user)
    db.session.commit()
    
    # Log in the new user
    login_user(new_user)
    
    return jsonify({
        'status': 'success',
        'redirect': url_for('chat.dashboard')
    })

@auth.route('/logout')
@login_required
def logout():
    """Log out the current user."""
    logout_user()
    flash('You have been logged out successfully', 'info')
    return redirect(url_for('index'))

@auth.route('/google')
def google_login():
    # Store next URL in session for redirect after auth
    next_url = request.args.get('next')
    if next_url:
        session['next_url'] = next_url
    
    # Use the BASE_URL from config
    redirect_uri = f"{config.get('BASE_URL')}/auth/google/callback"
    return google.authorize_redirect(redirect_uri)

@auth.route('/google/callback')
def google_callback():
    """Handle Google OAuth callback."""
    try:
        token = google.authorize_access_token()
        resp = google.get('userinfo')
        user_info = resp.json()
        
        # Check if Google ID exists in database
        user = User.query.filter_by(google_id=user_info['id']).first()
        
        # If not, check if email exists
        if not user:
            user = User.query.filter_by(email=user_info['email']).first()
        
        # If user exists, update Google ID
        if user:
            if not user.google_id:
                user.google_id = user_info['id']
                db.session.commit()
        else:
            # Create new user
            user = User(
                name=user_info['name'],
                email=user_info['email'],
                google_id=user_info['id']
            )
            
            # Initialize default skills
            user.skills_dict = {
                "rapport_building": 0,
                "needs_discovery": 0,
                "objection_handling": 0,
                "closing": 0,
                "product_knowledge": 0
            }
            
            db.session.add(user)
            db.session.commit()
        
        # Log in user
        login_user(user)
        
        # Redirect to next_url or dashboard
        next_url = session.pop('next_url', None) or url_for('chat.dashboard')
        return redirect(next_url)
        
    except Exception as e:
        flash('Google login failed. Please try again or use email login.', 'error')
        return redirect(url_for('auth.login'))
    
@auth.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """
    Handle forgotten password requests with enhanced logging and security
    """
    # Log request details for debugging
    current_app.logger.info(f"Forgot password request received")
    current_app.logger.info(f"Request method: {request.method}")
    current_app.logger.info(f"Request content type: {request.content_type}")

    # GET request - just render the form
    if request.method == 'GET':
        return render_template('auth/forgot_password.html')

    # POST request - process the form submission
    try:
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form

        # Extract email 
        email = data.get('email', '').strip()
        
        # Validate email input
        if not email:
            current_app.logger.warning("Forgot password request without email")
            return jsonify({
                'status': 'error',
                'message': 'Email address is required'
            }), 400

        # Find user by email
        user = User.query.filter_by(email=email).first()
        
        # Always return same response to prevent email enumeration
        if not user:
            current_app.logger.info(f"Password reset requested for non-existent email: {email}")
            return jsonify({
                'status': 'success',
                'message': 'If your email exists in our system, you will receive a password reset link.'
            })

        # Generate secure reset token
        token = secrets.token_urlsafe(32)
        expiration = datetime.utcnow() + timedelta(hours=1)
        
        # Store token with user
        user.reset_token = token
        user.reset_token_expires = expiration
        db.session.commit()
        
        # Generate reset URL with full domain
        reset_url = f"{request.host_url.rstrip('/')}{ url_for('auth.reset_password', token=token) }"
        
        current_app.logger.info(f"Generated reset URL for {email}: {reset_url}")
                
        # Send email
        try:
            email_sent = send_password_reset_email(user.email, reset_url)
            if not email_sent:
                current_app.logger.error(f"Failed to send password reset email to {email}")
        except Exception as email_error:
            current_app.logger.error(f"Error sending password reset email: {str(email_error)}")

        # Return success response regardless of email sending status (for security)
        return jsonify({
            'status': 'success',
            'message': 'If your email exists in our system, you will receive a password reset link.'
        })
        
    except Exception as e:
        current_app.logger.error(f"Comprehensive error in forgot password route: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An unexpected error occurred. Please contact support.'
        }), 500

@auth.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """
    Handle password reset with enhanced security and logging
    """
    current_app.logger.info(f"Reset password request received for token: {token}")

    try:
        # Find user with valid reset token
        user = User.query.filter_by(reset_token=token).first()
        
        # Validate token
        if not user or not user.reset_token_expires:
            current_app.logger.warning(f"Invalid or expired reset token attempted: {token}")
            
            # For POST requests, return JSON
            if request.method == 'POST':
                return jsonify({
                    'status': 'error',
                    'message': 'The password reset link is invalid or has expired.'
                }), 400
            
            # For GET requests, use flash and redirect
            flash('The password reset link is invalid or has expired.', 'error')
            return redirect(url_for('auth.login'))
        
        # GET request: show reset password form
        if request.method == 'GET':
            current_app.logger.info(f"Rendering reset password form for user: {user.email}")
            return render_template('auth/reset_password.html', token=token)
        
        # POST request: process password reset
        if request.method == 'POST':
            # Handle both JSON and form data
            if request.is_json:
                data = request.get_json()
            else:
                data = request.form
            
            password = data.get('password', '').strip()
            confirm_password = data.get('confirm_password', '').strip()
            
            # Validate inputs
            if not password or not confirm_password:
                current_app.logger.warning("Incomplete password reset attempt")
                return jsonify({
                    'status': 'error', 
                    'message': 'Both password fields are required'
                }), 400
            
            # Check password match
            if password != confirm_password:
                current_app.logger.warning("Mismatched passwords in reset attempt")
                return jsonify({
                    'status': 'error', 
                    'message': 'Passwords do not match'
                }), 400
            
            # Validate password strength
            is_valid, error_message = validate_password(password)
            if not is_valid:
                current_app.logger.warning(f"Weak password in reset attempt: {error_message}")
                return jsonify({
                    'status': 'error', 
                    'message': error_message
                }), 400
            
            try:
                # Update password
                user.set_password(password)
                
                # Clear reset token
                user.reset_token = None
                user.reset_token_expires = None
                
                # Commit changes
                db.session.commit()
                
                current_app.logger.info(f"Password successfully reset for user: {user.email}")
                
                # Return success response
                return jsonify({
                    'status': 'success',
                    'message': 'Your password has been updated successfully.',
                    'redirect': url_for('auth.login')
                })
            
            except Exception as update_error:
                current_app.logger.error(f"Error updating password: {str(update_error)}")
                db.session.rollback()
                return jsonify({
                    'status': 'error', 
                    'message': 'An unexpected error occurred. Please try again.'
                }), 500
    
    except Exception as e:
        current_app.logger.error(f"Unexpected error in reset password route: {str(e)}")
        return jsonify({
            'status': 'error', 
            'message': 'An unexpected error occurred. Please contact support.'
        }), 500
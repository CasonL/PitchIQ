# print("DEBUG: app.auth.routes - VERY TOP OF FILE PARSING", flush=True) # NEW DEBUG PRINT
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
import json
from sqlalchemy.exc import IntegrityError
import logging
import traceback
from authlib.integrations.flask_client import OAuth
from flask_wtf.csrf import generate_csrf
# from app.extensions import csrf # COMPLETELY COMMENTED OUT FOR NOW

# Import db from extensions
from app.extensions import db, oauth
from app.models import User, Conversation, Message, Feedback, UserProfile, PerformanceMetrics, FeedbackAnalysis
from app.auth.security import validate_password, check_rate_limit, record_failed_login, record_successful_login, csrf_required, rate_limit, check_login_attempts
from app.services.email_service import send_password_reset_email
from app.auth.forms import LoginForm, RegistrationForm, ResetPasswordRequestForm, ResetPasswordForm
from app.utils.security_utils import is_safe_url

# print("DEBUG: app.auth.routes - BEFORE BLUEPRINT DEFINITION", flush=True) # NEW DEBUG PRINT
# Create blueprint
auth = Blueprint('auth', __name__, url_prefix='/auth')
# print("DEBUG: app.auth.routes - 'auth' blueprint DEFINED", flush=True) # DEBUG PRINT

# We'll initialize Google in the record_params function
google = None

# Placeholder for Google OAuth object if initialized elsewhere
# google = oauth.register(...) # Load from config or initialize here

# Add logger if not already present
logger = logging.getLogger(__name__)

@auth.record_once
def record_params(setup_state):
    app = setup_state.app
    # oauth.init_app(app) # Initialization now happens in create_app
    
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
    try:
        # Redirect if already logged in
        if current_user.is_authenticated:
            return redirect('/training/dashboard')
        
        # Check for next parameter
        next_url = request.args.get('next')
        if next_url:
            session['next_url'] = next_url
        
        # Standard template rendering with error handling
        return render_template('auth/login.html')
    except Exception as e:
        print(f"Error in login route: {str(e)}", flush=True)
        import traceback
        print(traceback.format_exc(), flush=True)
        return f"Error loading login page: {str(e)}"

@auth.route('/login', methods=['POST'])
@csrf_required
@rate_limit(limit=10, window=60)  # 10 login attempts per minute
def login_post():
    """Handle login form submission."""
    print("!!! login_post FUNCTION ENTERED !!!", flush=True) # Add explicit print
    
    # Debug incoming request
    print(f"Request content type: {request.content_type}", flush=True)
    print(f"Request method: {request.method}", flush=True)
    print(f"Request is JSON: {request.is_json}", flush=True)
    
    try:
        # Get form data
        if request.is_json:
            try:
                data = request.get_json()
                print(f"JSON data received: {data.keys() if data else 'None'}", flush=True)
                email = data.get('email')
                password = data.get('password') # Get raw password
                remember = data.get('remember', False)
            except Exception as json_error:
                print(f"Error parsing JSON: {str(json_error)}", flush=True)
                current_app.logger.error(f"Error parsing JSON request data: {str(json_error)}")
                return jsonify({'error': 'Invalid JSON data'}), 400
        else:
            try:
                print(f"Form data received: {request.form.keys()}", flush=True)
                email = request.form.get('email')
                password = request.form.get('password') # Get raw password
                remember = request.form.get('remember') == 'on'
            except Exception as form_error:
                print(f"Error parsing form data: {str(form_error)}", flush=True)
                current_app.logger.error(f"Error parsing form data: {str(form_error)}")
                return jsonify({'error': 'Invalid form data'}), 400
        
        # Make sure email is a string before manipulating it
        if email is None:
            return jsonify({'error': 'Email is required'}), 400
        
        # Convert email to lowercase to ensure case-insensitive matching
        email = email.strip().lower()
            
        # Trim whitespace from password just in case
        password = password.strip() if password else None
        
        # Input validation
        if not email or not password:
            return jsonify({'error': 'Please provide both email and password'}), 400
        
        # Check if account is locked
        is_allowed, lockout_time = check_login_attempts(email) # Uses email key
        if not is_allowed:
            return jsonify({
                'error': f'Too many login attempts. Try again in {lockout_time} seconds.'
            }), 429
        
        # Get user with explicit session handling
        from sqlalchemy.sql import text
        try:
            # Find user with explicit query
            user = db.session.execute(
                text("SELECT * FROM user WHERE email = :email"),
                {"email": email}
            ).first()
            
            # Convert to User object if found
            if user:
                user = User.query.get(user[0])  # user[0] is the ID from the raw query
                current_app.logger.info(f"Found user: {user.email}")
            else:
                current_app.logger.info(f"User not found for email: {email}")
                # Record failed login
                is_locked, lockout_time = record_failed_login(email) # Uses email key
                if is_locked:
                    return jsonify({
                        'error': f'Account locked due to too many failed attempts. Try again in {lockout_time} seconds.'
                    }), 429
                return jsonify({'error': 'Invalid email or password. Please try again.'}), 401
                
        except Exception as db_error:
            current_app.logger.error(f"Database error looking up user: {str(db_error)}")
            return jsonify({'error': 'A system error occurred during login. Please try again.'}), 500
        
        # Check password with explicit error handling
        try:
            # --- DEBUGGING PASSWORD CHECK --- 
            password_check_result = user.check_password(password)
            current_app.logger.info(f"Password check result for {user.email}: {password_check_result}")
            # --- END DEBUGGING --- 
            
            if not password_check_result:
                # Record failed login
                is_locked, lockout_time = record_failed_login(email) # Uses email key
                if is_locked:
                    return jsonify({
                        'error': f'Account locked due to too many failed attempts. Try again in {lockout_time} seconds.'
                    }), 429
                return jsonify({'error': 'Invalid email or password. Please try again.'}), 401
            
            # Explicitly commit session here BEFORE login_user, just in case
            try:
                db.session.commit()
                current_app.logger.info("DB session committed before login_user.")
            except Exception as commit_error:
                db.session.rollback()
                current_app.logger.error(f"Error committing DB session before login_user: {commit_error}")
                # Decide if this should prevent login - probably yes
                return jsonify({'error': 'A system error occurred during login. Please try again.'}), 500

        except Exception as pw_error:
            current_app.logger.error(f"Password check error: {str(pw_error)}")
            return jsonify({'error': 'A system error occurred during login. Please try again.'}), 500
        
        # Record successful login
        try:
            record_successful_login(email)
        except Exception as record_error:
            # Log but don't abort login if just the record fails
            current_app.logger.error(f"Error recording successful login: {str(record_error)}")
        
        # Log user in
        try:
            login_user(user, remember=remember)
        except Exception as login_error:
            current_app.logger.error(f"Error in login_user: {str(login_error)}")
            return jsonify({'error': 'A system error occurred during login. Please try again.'}), 500
        
        # Get redirect URL - FIX REDIRECT URL ISSUES
        try:
            next_url = session.pop('next_url', None)
            # Use fallback route instead of blueprint route that doesn't exist
            if not next_url:
                # Instead of url_for('training.show_dashboard') which doesn't exist
                next_url = '/training/dashboard'  # Use direct URL path

            # Check if user profile exists and has required fields
            if not hasattr(user, 'profile') or not user.profile:
                # Redirect to onboarding instead if profile doesn't exist
                next_url = '/training/onboarding'  # Use direct URL path
                current_app.logger.warning(f"User {user.id} logged in but has no profile, redirecting to onboarding")
            else:
                # Verify that we can access profile data safely
                profile_id = user.profile.id
                current_app.logger.info(f"User {user.id} logged in with profile {profile_id}")
        except Exception as profile_error:
            current_app.logger.error(f"Error checking user profile after login: {str(profile_error)}")
            # Redirect to a safe fallback if there's an error
            next_url = '/'  # Fallback to home page
        
        return jsonify({
            'status': 'success',
            'redirect': next_url
        })
        
    except Exception as e:
        # Log any unhandled exceptions
        current_app.logger.error(f"Unhandled exception in login_post: {str(e)}", exc_info=True)
        # Close and roll back the session to prevent locking issues
        try:
            db.session.rollback()
        except:
            pass
        return jsonify({'error': 'An unexpected error occurred. Please try again.'}), 500

@auth.route('/signup')
def signup():
    """Signup page."""
    # Redirect if already logged in
    if current_user.is_authenticated:
        return redirect(url_for('training.show_dashboard'))
    
    return render_template('auth/signup.html')

@auth.route('/register', methods=['GET', 'POST'])
# @csrf_required # Temporarily disable CSRF for debugging
@csrf_required # Re-enabled CSRF
@rate_limit(limit=10, window=3600)  # 10 requests per hour
def register():
    """Handle user registration."""
    # --- DEBUGGING --- 
    print("--- ENTERING REGISTER ROUTE ---", flush=True)
    print(f"Request Method: {request.method}", flush=True)
    print(f"Request Content-Type: {request.content_type}", flush=True)
    print(f"Request Form Data: {request.form.to_dict()}", flush=True)
    print(f"Request JSON Data: {request.get_json(silent=True)}", flush=True)
    # --- END DEBUGGING ---
    
    if request.method == 'GET':
        # Add now variable for base template footer
        return render_template('auth/signup.html', now=datetime.utcnow())
    
    # Handle both JSON and form data
    if request.is_json:
        data = request.get_json()
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        confirm_password = data.get('confirm_password', '')
    else:
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
    
    # Validate input
    if not name or not email or not password:
        if request.is_json:
            return jsonify({'error': 'All fields are required'}), 400
        flash('All fields are required', 'error')
        return render_template('auth/signup.html')
    
    if password != confirm_password:
        if request.is_json:
            return jsonify({'error': 'Passwords do not match'}), 400
        flash('Passwords do not match', 'error')
        return render_template('auth/signup.html')
    
    # Validate password strength
    is_valid, error_message = validate_password(password)
    if not is_valid:
        print(f"Password validation failed: {error_message}", flush=True) # DEBUG
        if request.is_json:
            return jsonify({'error': error_message}), 400
        flash(error_message, 'error')
        return render_template('auth/signup.html')
    
    # Check if email already exists
    user_exists = User.query.filter_by(email=email).first()
    if user_exists:
        if request.is_json:
            return jsonify({'error': 'Email already registered'}), 400
        flash('Email already registered', 'error')
        return render_template('auth/signup.html')
        
    # --- Add Try/Except block around user/profile creation ---
    try:
        # Create new user
        user = User(name=name, email=email)
        user.set_password(password)
        
        # Initialize skills and profile data
        user.skills_dict = {
            'rapport_building': 70,
            'needs_discovery': 65,
            'objection_handling': 60,
            'closing': 55,
            'product_knowledge': 75,
            'overall': 65
        }
        
        db.session.add(user)
        # Commit the user first to get the user.id for the profile
        # This might still hit the race condition, but the except block will catch it
        db.session.flush() # Assigns user.id without full commit yet 
        
        # Create user profile with reasonable defaults
        profile = UserProfile(
            user_id=user.id, # Use the flushed ID
            emotional_intelligence_score=7.5,
            experience_level='intermediate',
            product_type='Software',
            target_market='B2B',
            onboarding_complete=False, 
            onboarding_step='experience',
            total_roleplays=0,
            total_feedback_received=0
        )
        
        # Set default JSON fields
        profile.objection_handling_scores = json.dumps({
            "price": 7.0,
            "competition": 6.5,
            "need": 7.5,
            "timing": 6.0
        })
        
        db.session.add(profile)
        
        # Final commit for both user and profile
        db.session.commit()
        
        # Log in the new user
        login_user(user)
        
        # Return success response
        if request.is_json:
            return jsonify({
                'status': 'success',
                'redirect': url_for('training.show_onboarding_page')
            })
        flash('Registration successful!', 'success')
        return redirect(url_for('training.show_onboarding_page'))
        
    except IntegrityError as e: # Catch potential unique constraint violation
        db.session.rollback() # Rollback the failed transaction
        current_app.logger.warning(f"IntegrityError during registration for email {email}: {e}")
        # Return the 'Email already registered' error, as that's the likely cause
        if request.is_json:
            return jsonify({'error': 'Email already registered'}), 400
        flash('Email already registered', 'error')
        return render_template('auth/signup.html')
        
    except Exception as e: # Catch any other unexpected errors
        db.session.rollback()
        current_app.logger.error(f"Unexpected error during registration for {email}: {e}", exc_info=True)
        if request.is_json:
            return jsonify({'error': 'An unexpected error occurred during registration.'}), 500
        flash('An unexpected error occurred. Please try again.', 'danger')
        return render_template('auth/signup.html')

@auth.route('/logout', methods=['GET', 'POST'])
@login_required
def logout():
    """Log out the current user."""
    logout_user()
    flash('You have been logged out successfully', 'info')
    # Redirect to the React frontend homepage instead of 'index'
    return redirect('http://localhost:8080/')

@auth.route('/settings', methods=['GET'])
@login_required
def settings():
    """Display the user settings page."""
    return render_template(
        'auth/settings.html', 
        active_tab='settings',
        now=datetime.utcnow()
    )

@auth.route('/settings/account-info', methods=['POST'])
@login_required
@csrf_required
def update_account_info():
    """Handle updates to basic account information like name."""
    try:
        name = request.form.get('name')
        if not name:
            flash('Name cannot be empty.', 'danger')
            return redirect(url_for('auth.settings'))
        
        current_user.name = name
        db.session.commit()
        flash('Account information updated successfully.', 'success')
        logger.info(f"User {current_user.id} updated their name.")
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating account info for user {current_user.id}: {e}")
        flash('Failed to update account information.', 'danger')
        
    return redirect(url_for('auth.settings'))

@auth.route('/settings/change-password', methods=['POST'])
@login_required
@csrf_required
def change_password():
    """Handle password change requests."""
    try:
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        if not current_password or not new_password or not confirm_password:
            flash('All password fields are required.', 'danger')
            return redirect(url_for('auth.settings'))

        if not current_user.check_password(current_password):
            flash('Incorrect current password.', 'danger')
            return redirect(url_for('auth.settings') + '#password')

        if new_password != confirm_password:
            flash('New password and confirmation do not match.', 'danger')
            return redirect(url_for('auth.settings') + '#password')
            
        min_length = current_app.config.get('PASSWORD_MIN_LENGTH', 8)
        if len(new_password) < min_length:
             flash(f'Password must be at least {min_length} characters long.', 'danger')
             return redirect(url_for('auth.settings') + '#password')

        current_user.set_password(new_password)
        db.session.commit()
        flash('Password updated successfully.', 'success')
        logger.info(f"User {current_user.id} changed their password.")
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error changing password for user {current_user.id}: {e}")
        flash('Failed to change password.', 'danger')

    # Redirect back to the password section
    return redirect(url_for('auth.settings') + '#password') 

@auth.route('/settings/preferences', methods=['POST'])
@login_required
@csrf_required
def update_preferences():
    """Handle updates to user training preferences."""
    try:
        profile = current_user.profile
        if not profile:
             # Should have profile if logged in, but handle just in case
             flash('User profile not found. Cannot update preferences.', 'danger')
             logger.warning(f"User {current_user.id} tried to update preferences without a profile.")
             return redirect(url_for('auth.settings'))
             
        pref_style = request.form.get('preferred_training_style')
        pref_freq = request.form.get('preferred_feedback_frequency')
        
        # Basic validation (could be more robust)
        valid_styles = ['structured', 'conversational', 'challenge-based']
        valid_frequencies = ['real-time', 'end-session', 'daily']
        
        updated = False
        if pref_style and pref_style in valid_styles:
            profile.preferred_training_style = pref_style
            updated = True
            
        if pref_freq and pref_freq in valid_frequencies:
            profile.preferred_feedback_frequency = pref_freq
            updated = True
        
        if updated:
            db.session.commit()
            flash('Training preferences updated successfully.', 'success')
            logger.info(f"User {current_user.id} updated preferences.")
        else:
            flash('No changes detected in preferences.', 'info')
            
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating preferences for user {current_user.id}: {e}")
        flash('Failed to update training preferences.', 'danger')

    # Redirect back to the preferences section
    return redirect(url_for('auth.settings') + '#preferences')

@auth.route('/reset-onboarding', methods=['POST'])
@login_required
def reset_onboarding():
    """Reset onboarding status to allow users to go through onboarding process again."""
    try:
        # from models import UserProfile # Already imported UserProfile at the top of the file
        
        # Get user profile or create if not exists
        profile = UserProfile.query.filter_by(user_id=current_user.id).first()
        
        if not profile:
            profile = UserProfile(user_id=current_user.id)
            db.session.add(profile)
        
        # Reset onboarding status - simple flag since React frontend handles the rest
        profile.onboarding_complete = False
        
        db.session.commit()
        
        flash('Onboarding has been reset.', 'success')
        # Redirect to the React dashboard which will detect onboarding state
        return redirect(url_for('training.show_dashboard'))
    except Exception as e:
        db.session.rollback()
        flash(f'Failed to reset onboarding: {str(e)}', 'danger')
        # Fallback redirect in case of error, ensuring a response
        return redirect(url_for('auth.settings')) 

@auth.route('/upgrade-account', methods=['GET'])
@login_required
def upgrade_account():
    """Display the upgrade account page or redirect to payment."""
    # Render the upgrade account template
    return render_template('auth/upgrade_account.html', active_tab='settings')

@auth.route('/settings/subscription', methods=['POST'])
@login_required
@csrf_required
def update_subscription():
    """Handle updates to subscription tier (admin or development use only)."""
    if os.environ.get('FLASK_ENV') != 'production' or current_user.role == 'admin':
        try:
            tier = request.form.get('subscription_tier')
            if tier in ['free', 'premium', 'enterprise']:
                profile = current_user.profile
                if profile:
                    profile.subscription_tier = tier
                    db.session.commit()
                    flash(f'Subscription updated to {tier} tier successfully.', 'success')
                    logger.info(f"User {current_user.id} subscription updated to {tier}")
                else:
                    flash('User profile not found. Cannot update subscription.', 'danger')
            else:
                flash('Invalid subscription tier specified.', 'danger')
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error updating subscription for user {current_user.id}: {e}")
            flash(f'Failed to update subscription: {str(e)}', 'danger')
    else:
        flash('This function is only available to administrators', 'warning')
    
    return redirect(url_for('auth.settings'))

@auth.route('/delete-account', methods=['POST'])
@login_required
@csrf_required
def delete_account():
    """Handle account deletion."""
    try:
        # Get the current user ID before logging out
        user_id = current_user.id
        user_email = current_user.email
        
        # Log the account deletion
        print(f"Deleting account for user: {user_id} ({user_email})")
        
        # Log out the user first
        logout_user()
        
        # Now get the actual user object from the database
        user = User.query.get(user_id)
        if not user:
            flash('User not found. Account may have already been deleted.', 'warning')
            return redirect(url_for('index'))
        
        # --- Start transaction ---
        
        # Delete related data (ensure models are imported or use strings)
        from models import Conversation, Message, Feedback, UserProfile, PerformanceMetrics, FeedbackAnalysis

        # Bulk delete related items efficiently
        Message.query.filter(Message.conversation_id.in_(
            db.session.query(Conversation.id).filter_by(user_id=user_id)
        )).delete(synchronize_session=False)
        
        Feedback.query.filter(Feedback.conversation_id.in_(
            db.session.query(Conversation.id).filter_by(user_id=user_id)
        )).delete(synchronize_session=False)
        
        Conversation.query.filter_by(user_id=user_id).delete(synchronize_session=False)

        # Delete profile and its related data
        user_profile = UserProfile.query.filter_by(user_id=user_id).first()
        if user_profile:
            PerformanceMetrics.query.filter_by(user_profile_id=user_profile.id).delete(synchronize_session=False)
            FeedbackAnalysis.query.filter_by(user_profile_id=user_profile.id).delete(synchronize_session=False)
            db.session.delete(user_profile) # Mark profile for deletion

        # Finally, delete the user itself
        db.session.delete(user) # Mark user for deletion
        
        # --- Commit the entire transaction at once ---
        db.session.commit()
        
        flash('Your account has been successfully deleted.', 'success')
        return redirect('http://localhost:8080/')
        
    except Exception as e:
        db.session.rollback() # Rollback the entire transaction on error
        print(f"Error deleting account: {str(e)}")
        flash(f'An error occurred while deleting your account: {str(e)}', 'danger')
        return redirect(url_for('auth.login'))

@auth.route('/google')
def google_login():
    # Store next URL in session for redirect after auth
    next_url = request.args.get('next')
    if next_url:
        session['next_url'] = next_url
    
    # Use the BASE_URL from current_app.config
    redirect_uri = f"{current_app.config.get('BASE_URL')}/auth/google/callback"
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
        next_url = session.pop('next_url', None) or url_for('training.show_dashboard')
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

@auth.route('/check-account-status', methods=['POST'])
@csrf_required
def check_account_status():
    """Check if an account is locked and when it will be unlocked."""
    if request.is_json:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
    else:
        email = request.form.get('email', '').strip().lower()
    
    if not email:
        return jsonify({'error': 'Email is required'}), 400
    
    # Check if account is locked
    is_allowed, lockout_time = check_login_attempts(email)
    if not is_allowed:
        return jsonify({
            'status': 'locked',
            'message': f'Account is temporarily locked. Try again in {lockout_time} seconds.',
            'unlock_time': lockout_time
        }), 200
    
    return jsonify({
        'status': 'unlocked',
        'message': 'Account is not locked'
    }), 200

@auth.route('/profile', methods=['GET'])
@login_required
def profile():
    """Display the current user's profile."""
    user = current_user
    profile = user.profile # Get the profile related to the current user
    if not profile:
        # Handle case where profile might not exist yet (shouldn't happen if onboarding is enforced)
        profile = UserProfile(user_id=user.id)
        db.session.add(profile)
        db.session.commit() # Commit to get an ID if needed
        flash('Profile created.')

    # Logic to display/update profile (removed model imports)
    if request.method == 'POST':
        # Update profile fields from form data
        # ... existing code ...
        pass

    return render_template('training/profile.html', user=user)

@auth.route('/api/auth/status', methods=['GET'])
def auth_status():
    """Check user authentication status."""
    if current_user.is_authenticated:
        user_data = {
            'id': current_user.id,
            'email': current_user.email,
            'username': current_user.username,
            'profile': {
                'name': current_user.profile.name if hasattr(current_user, 'profile') and current_user.profile else None,
                'preferred_name': current_user.profile.preferred_name if hasattr(current_user, 'profile') and current_user.profile else None,
                'experience_level': current_user.profile.experience_level if hasattr(current_user, 'profile') and current_user.profile else None,
            }
        }
        return jsonify({'authenticated': True, 'user': user_data}), 200
    else:
        return jsonify({'authenticated': False}), 200

# print("DEBUG: app.auth.routes - IMMEDIATELY BEFORE get_csrf_token definition", flush=True) # DEBUG PRINT

# from app.extensions import csrf # COMPLETELY COMMENTED OUT FOR NOW (This was its state)

@auth.route('/api/csrf-token', methods=['GET'])
# @csrf.exempt # Will cause error, but that's okay for this test (This was its state)
def get_csrf_token():
    """API endpoint to provide a CSRF token."""
    logger.info("Accessed /auth/api/csrf-token endpoint")
    token = generate_csrf()
    logger.info(f"Generated CSRF token: {token} for /auth/api/csrf-token")
    return jsonify({'csrfToken': token})
# print("DEBUG: app.auth.routes - IMMEDIATELY AFTER get_csrf_token definition", flush=True) # DEBUG PRINT
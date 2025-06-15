import sys # Add this import
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
from app.extensions import csrf

# Import db from extensions
from app.extensions import db, oauth
from app.models import User, Conversation, Message, Feedback, UserProfile, PerformanceMetrics, FeedbackAnalysis
from app.auth.security import validate_password, check_rate_limit, record_failed_login, record_successful_login, rate_limit, check_login_attempts
from app.services.email_service import send_password_reset_email, send_verification_email
from app.auth.forms import LoginForm, RegistrationForm, ResetPasswordRequestForm, ResetPasswordForm
from app.utils.security_utils import is_safe_url

# Import the existing blueprint instance from the __init__.py file
from . import auth

# print("DEBUG: app.auth.routes - BEFORE BLUEPRINT DEFINITION", flush=True) # NEW DEBUG PRINT
# Create blueprint
# auth = Blueprint('auth', __name__, url_prefix='/auth') # This is redundant and incorrect
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

@auth.route('/login', methods=['GET'])
def login():
    """Serve the main React application, which handles the login form."""
    # If a user is already authenticated, redirect them to the dashboard.
    if current_user.is_authenticated:
        # Assuming you have a main blueprint with a catch-all for React routes
        return redirect(url_for('main.index'))

    # For any unauthenticated GET request to /login, just serve the React app.
    # React Router will see the '/login' path and render the correct component.
    return current_app.send_static_file('index.html')

@auth.route('/signup')
def signup():
    """Signup page."""
    # Redirect if already logged in
    if current_user.is_authenticated:
        return redirect(url_for('training.show_dashboard')) # This redirect should eventually go to the React dashboard route
    
    # return render_template('auth/signup.html')
    return jsonify({'message': 'Signup page is now handled by the frontend application. Use POST to /auth/register to sign up.'}), 405 # Method Not Allowed for GET

@auth.route('/register', methods=['GET', 'POST'])
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
        # Add now variable for base template footer - REMOVED
        # return render_template('auth/signup.html', now=datetime.utcnow())
        # Redirect if already logged in (moved from signup() for consistency if /register is hit directly)
        if current_user.is_authenticated:
            return redirect(url_for('training.show_dashboard')) # This redirect should eventually go to the React dashboard route
        return jsonify({'message': 'Signup page is now handled by the frontend application. Use POST to register.'}), 405 # Method Not Allowed for GET
    
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
        # Always return JSON for API calls
        return jsonify({'error': 'All fields are required'}), 400
    
    if password != confirm_password:
        # Always return JSON for API calls
        return jsonify({'error': 'Passwords do not match'}), 400
    
    # Validate password strength
    is_valid, error_message = validate_password(password)
    if not is_valid:
        print(f"Password validation failed: {error_message}", flush=True) # DEBUG
        # Always return JSON for API calls
        return jsonify({'error': error_message}), 400
    
    # Check if email already exists
    user_exists = User.query.filter_by(email=email).first()
    if user_exists:
        # Always return JSON for API calls
        return jsonify({'error': 'Email already registered'}), 400
        
    # --- Add Try/Except block around user/profile creation ---
    try:
        # Create new user
        new_user = User(name=name, email=email)
        new_user.set_password(password)
        
        # Generate email verification token
        new_user.email_verification_token = secrets.token_urlsafe(32)
        new_user.email_verification_token_expires = datetime.utcnow() + timedelta(hours=24)
        
        db.session.add(new_user)
        db.session.flush() # Flush to get the new_user.id

        # Create user profile with reasonable defaults
        profile = UserProfile(
            user_id=new_user.id,
            emotional_intelligence_score=7.5,
            experience_level='intermediate',
            product_type='Software',
            target_market='B2B',
            onboarding_complete=False,
            initial_setup_complete=False, # Ensure new users must personalize
            onboarding_step='experience',
            total_roleplays=0,
            total_feedback_received=0,
            objection_handling_scores=json.dumps({
                "price": 7.0, "competition": 6.5, "need": 7.5, "timing": 6.0
            })
        )
        db.session.add(profile)
        
        # Final commit for both user and profile
        db.session.commit()

        # Send verification email
        try:
            # Construct verification URL (points to frontend)
            # TODO: Use a configured frontend base URL instead of request.host_url if they differ significantly
            # or if Flask is not aware of the final public-facing frontend URL (e.g. behind a proxy)
            frontend_base_url = current_app.config.get('FRONTEND_BASE_URL', request.host_url.rstrip('/'))
            verification_url = f"{frontend_base_url}/verify-email/{new_user.email_verification_token}"
            send_verification_email(new_user.email, verification_url)
            current_app.logger.info(f"Verification email sent to {new_user.email} with URL: {verification_url}")
        except Exception as e_email:
            current_app.logger.error(f"Failed to send verification email to {new_user.email}: {e_email}")
            # Decide if registration should fail if email sending fails. 
            # For now, we'll let it proceed but log the error.
        
        # Log in the new user (they are active but not verified yet)
        login_user(new_user)
        
        # Make session permanent so it respects PERMANENT_SESSION_LIFETIME
        session.permanent = True
        
        # Prepare user data for the response, including verification status
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
        
        # Success response - NEW: Include redirect info based on plan
        redirect_url = '/chat' if not profile.is_premium() else '/personalization'
        
        response_data = {
            'message': 'Registration successful',
            'user': user_data_for_response,
            'redirect': redirect_url,
            'plan_type': 'free' if not profile.is_premium() else 'premium'
        }
        
        record_successful_login(new_user)
        current_app.logger.info(f"New user registered successfully: {new_user.email} (ID: {new_user.id})")
        
        return jsonify(response_data), 201
        
    except IntegrityError as e: # Catch potential unique constraint violation
        db.session.rollback() # Rollback the failed transaction
        current_app.logger.warning(f"IntegrityError during registration for email {email}: {e}")
        # Always return JSON for API calls
        return jsonify({'error': 'Email already registered'}), 400
        
    except Exception as e: # Catch any other unexpected errors
        db.session.rollback()
        current_app.logger.error(f"Unexpected error during registration for {email}: {e}", exc_info=True)
        # Always return JSON for API calls
        return jsonify({'error': 'An unexpected error occurred during registration.'}), 500

@auth.route('/logout')
@login_required
def logout():
    """Logout the current user."""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('auth.login'))

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
def update_subscription():
    """Handle updates to subscription tier (admin or development use only)."""
    if os.environ.get('FLASK_ENV') != 'production' or current_user.role == 'admin':
        try:
            tier = request.form.get('subscription_tier')
            if tier in ['free', 'premium', 'enterprise']:
                profile = current_user.profile
                if profile:
                    if tier == 'premium':
                        profile.upgrade_to_premium()
                    elif tier == 'free':
                        profile.downgrade_to_free()
                    else:
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

@auth.route('/api/subscription/status', methods=['GET'])
@login_required
def get_subscription_status():
    """Get current user's subscription status and usage."""
    try:
        profile = current_user.profile
        if not profile:
            return jsonify({'error': 'User profile not found'}), 404
        
        usage_stats = profile.get_usage_stats()
        return jsonify({
            'success': True,
            'subscription': usage_stats
        })
    except Exception as e:
        logger.error(f"Error getting subscription status for user {current_user.id}: {e}")
        return jsonify({'error': 'Failed to get subscription status'}), 500

@auth.route('/api/subscription/upgrade', methods=['POST'])
@login_required
def upgrade_subscription():
    """Upgrade user to premium (for now, just simulate - later add payment processing)."""
    try:
        profile = current_user.profile
        if not profile:
            return jsonify({'error': 'User profile not found'}), 404
        
        if profile.is_premium():
            return jsonify({'error': 'User is already premium'}), 400
        
        # For now, just upgrade without payment processing
        # Later: Add Stripe/payment integration here
        profile.upgrade_to_premium()
        db.session.commit()
        
        logger.info(f"User {current_user.id} upgraded to premium")
        return jsonify({
            'success': True,
            'message': 'Successfully upgraded to premium!',
            'subscription': profile.get_usage_stats()
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error upgrading user {current_user.id} to premium: {e}")
        return jsonify({'error': 'Failed to upgrade subscription'}), 500

@auth.route('/api/subscription/downgrade', methods=['POST'])
@login_required
def downgrade_subscription():
    """Downgrade user to free plan."""
    try:
        profile = current_user.profile
        if not profile:
            return jsonify({'error': 'User profile not found'}), 404
        
        if not profile.is_premium():
            return jsonify({'error': 'User is not premium'}), 400
        
        profile.downgrade_to_free()
        db.session.commit()
        
        logger.info(f"User {current_user.id} downgraded to free")
        return jsonify({
            'success': True,
            'message': 'Successfully downgraded to free plan',
            'subscription': profile.get_usage_stats()
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error downgrading user {current_user.id} to free: {e}")
        return jsonify({'error': 'Failed to downgrade subscription'}), 500

@auth.route('/delete-account', methods=['POST'])
@login_required
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
        
        # Delete related data (models are already imported at the top of the file)

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
        
        # Make session permanent so it respects PERMANENT_SESSION_LIFETIME
        session.permanent = True
        
        # Redirect to next_url or dashboard
        next_url = session.pop('next_url', None) or url_for('training.show_dashboard')
        return redirect(next_url)
        
    except Exception as e:
        flash('Google login failed. Please try again or use email login.', 'error')
        return redirect(url_for('auth.login'))
    
@auth.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Handle forgotten password requests with enhanced logging and security"""
    # Log request details for debugging
    current_app.logger.info(f"Forgot password request received for {request.method} to /forgot-password")
    # current_app.logger.info(f"Request method: {request.method}") # Redundant
    # current_app.logger.info(f"Request content type: {request.content_type}") # More relevant for POST

    # GET request - now handled by frontend
    if request.method == 'GET':
        # return render_template('auth/forgot_password.html')
        return jsonify({'message': 'Forgot password process is handled by the frontend application. Use POST to submit an email.'}), 405

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
    """Handle password reset with enhanced security and logging"""
    current_app.logger.info(f"Reset password request received for token: {token} (Method: {request.method})")

    try:
        # Find user with valid reset token
        user = User.query.filter_by(reset_token=token).first()
        
        # Validate token and its expiration
        if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow(): # Added explicit expiration check
            current_app.logger.warning(f"Invalid or expired reset token attempted: {token}")
            
            if request.method == 'POST':
                return jsonify({
                    'status': 'error',
                    'message': 'The password reset link is invalid or has expired.'
                }), 400
            
            # For GET requests, React will handle the /reset-password/:token route
            # The frontend will likely make a POST to validate the token and show the form, or handle an invalid token
            return jsonify({
                'status': 'error',
                'message': 'The password reset link is invalid or has expired. Please request a new one if needed.',
                'action': 'redirect_to_forgot_password' # Hint for frontend
            }), 400 
        
        # GET request: Frontend handles UI. Backend confirms token validity if hit via GET (though POST is more common for validation by frontend).
        if request.method == 'GET':
            current_app.logger.info(f"GET request for valid reset token for user: {user.email}. Frontend will handle UI.")
            return jsonify({
                'status': 'success',
                'message': 'Token is valid. Frontend should display reset password form.',
                'token': token # Optionally confirm the token back to frontend
            })
        
        # POST request: process password reset (this logic remains largely the same)
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

@auth.route('/verify-email/<token>', methods=['GET'])
def verify_email(token):
    """Handle email verification from the link sent to the user."""
    current_app.logger.info(f"Attempting to verify email with token: {token}")
    user = User.query.filter_by(email_verification_token=token).first()

    if not user:
        current_app.logger.warning(f"Email verification failed: Token not found - {token}")
        return jsonify({'status': 'error', 'message': 'Invalid or expired verification link.'}), 400

    if user.is_email_verified:
        current_app.logger.info(f"Email already verified for user: {user.email}")
        return jsonify({'status': 'success', 'message': 'Email already verified. You can login.'}), 200

    if user.email_verification_token_expires < datetime.utcnow():
        current_app.logger.warning(f"Email verification failed: Token expired for user {user.email} - token {token}")
        # Frontend should ideally guide user to request a new token
        return jsonify({
            'status': 'error',
            'message': 'Verification link has expired. Please request a new one.',
            'action': 'resend_verification' # Hint for frontend
        }), 400

    try:
        user.is_email_verified = True
        user.email_verification_token = None
        user.email_verification_token_expires = None
        db.session.commit()
        current_app.logger.info(f"Email successfully verified for user: {user.email}")
        # It's generally better to return JSON and let frontend redirect or display message.
        # If user might not be logged in, frontend handles login flow after this.
        return jsonify({
            'status': 'success', 
            'message': 'Email successfully verified. You can now login or continue.'
        }), 200
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error during email verification for user {user.email}: {e}", exc_info=True)
        return jsonify({'status': 'error', 'message': 'An unexpected error occurred during verification.'}), 500

@auth.route('/resend-verification-email', methods=['POST'])
@login_required # User must be logged in to resend verification for their own account
def resend_verification_email_route(): # Renamed to avoid conflict with service function
    """Resend the email verification link to the currently logged-in user."""
    user = current_user
    current_app.logger.info(f"Resend verification email request for user: {user.email}")

    if user.is_email_verified:
        current_app.logger.info(f"User {user.email} requested resend, but email is already verified.")
        return jsonify({'status': 'info', 'message': 'Your email is already verified.'}), 200 # Or 400 if considered a bad request

    # Generate a new token and expiration
    user.email_verification_token = secrets.token_urlsafe(32)
    user.email_verification_token_expires = datetime.utcnow() + timedelta(hours=24)
    
    try:
        db.session.commit() # Save new token first

        # Construct verification URL (points to frontend)
        frontend_base_url = current_app.config.get('FRONTEND_BASE_URL', request.host_url.rstrip('/'))
        verification_url = f"{frontend_base_url}/verify-email/{user.email_verification_token}"
        
        email_sent = send_verification_email(user.email, verification_url)
        if email_sent:
            current_app.logger.info(f"New verification email sent successfully to {user.email}")
            return jsonify({'status': 'success', 'message': 'A new verification email has been sent to your address.'}), 200
        else:
            current_app.logger.error(f"Failed to resend verification email to {user.email} (email_service returned false)")
            # Don't rollback token changes, user can try again or contact support
            return jsonify({'status': 'error', 'message': 'Failed to send verification email. Please try again shortly.'}), 500

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error during resend verification email for {user.email}: {e}", exc_info=True)
        return jsonify({'status': 'error', 'message': 'An unexpected error occurred.'}), 500

@auth.route('/check-account-status', methods=['POST'])
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
            'name': current_user.name,
            'profile': {}
        }
        if hasattr(current_user, 'profile') and current_user.profile:
            user_data['profile'] = {
                'experience_level': current_user.profile.experience_level,
                'initial_setup_complete': current_user.profile.initial_setup_complete
        }
        return jsonify({'authenticated': True, 'user': user_data}), 200
    else:
        return jsonify({'authenticated': False}), 200

@auth.route('/api/csrf-token', methods=['GET'])
@csrf.exempt
def get_csrf_token():
    # print("DEBUG: get_csrf_token - ROUTE ENTERED - NEW VERSION CHECK", flush=True)

    # Generate a CSRF token. This also sets it in the session.
    token = generate_csrf()
    
    # Explicitly mark the session as modified to ensure it gets saved and a cookie is sent.
    # This is crucial for the subsequent request's CSRF validation to work.
    session.modified = True

    # Your debug logic can go here if needed
    # session['example_data'] = 'this is a test'
    # logger.info(f"CSRF Route: Entered. Session ID before any action: {request.cookies.get('session')}. Is session new? {session.new}")
    # logger.info(f"CSRF Route: Token generated: {token}")
    # logger.info(f"CSRF Route: Session modified. example_data set. Session ID after modification: {request.cookies.get('session')}. Is session permanent? {session.permanent}")
    
    response = jsonify({'csrfToken': token})
    # logger.info(f"CSRF Route: Response created. Vary headers: {response.headers.getlist('Vary')}")
    
    return response

@auth.route('/api/simple-onboarding', methods=['POST'])
@login_required
def simple_onboarding():
    """Handle simple onboarding with just product info for free users."""
    try:
        data = request.get_json()
        product_info = data.get('product', '').strip()
        
        if not product_info:
            return jsonify({'error': 'Product information is required'}), 400
        
        profile = current_user.profile
        if not profile:
            return jsonify({'error': 'User profile not found'}), 404
        
        # Save minimal product info
        profile.p_product = product_info
        profile.onboarding_complete = True
        profile.initial_setup_complete = True
        
        # Generate a simple coach persona based on just the product
        coach_persona = f"Meet your AI Sales Coach! I'm here to help you sell {product_info} more effectively. I'll provide personalized practice scenarios, give you actionable feedback, and help you overcome common objections. Ready to start practicing?"
        profile.coach_persona = coach_persona
        
        db.session.commit()
        
        logger.info(f"Simple onboarding completed for user {current_user.id}")
        return jsonify({
            'success': True,
            'message': 'Onboarding complete! Let\'s start practicing.',
            'coach_persona': coach_persona,
            'redirect': '/chat'
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in simple onboarding for user {current_user.id}: {e}")
        return jsonify({'error': 'Failed to complete onboarding'}), 500

# print("DEBUG: app.auth.routes - BOTTOM OF FILE PARSING", flush=True) # NEW DEBUG PRINT
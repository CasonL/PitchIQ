from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_wtf.csrf import generate_csrf
from app.extensions import csrf
import logging

# Create the auth blueprint
auth = Blueprint('auth', __name__)
logger = logging.getLogger(__name__)

@auth.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login."""
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        remember = 'remember' in request.form
        
        # Placeholder for user authentication logic
        # This would typically involve querying the database for the user
        # and validating their credentials
        
        # Placeholder response
        if email and password:
            return redirect(url_for('main.home'))
        else:
            flash('Please check your login details and try again.')
            
    return render_template('auth/login.html')

@auth.route('/register', methods=['GET', 'POST'])
def register():
    """Handle user registration."""
    if request.method == 'POST':
        email = request.form.get('email')
        name = request.form.get('name')
        password = request.form.get('password')
        
        # Placeholder for user registration logic
        # This would typically involve validating the input, checking if the user
        # already exists, and then creating a new user in the database
        
        # Placeholder response
        if email and name and password:
            flash('Registration successful! Please log in.')
            return redirect(url_for('auth.login'))
        else:
            flash('Please fill out all fields.')
            
    return render_template('auth/register.html')

@auth.route('/logout')
@login_required
def logout():
    """Handle user logout."""
    logout_user()
    return redirect(url_for('main.index'))

@auth.route('/profile')
@login_required
def profile():
    """Display user profile."""
    return render_template('auth/profile.html')

@auth.route('/api/csrf-token', methods=['GET'])
@csrf.exempt
def get_csrf_token():
    """API endpoint to provide a CSRF token."""
    logger.info(f"Accessed {request.path} endpoint")
    try:
        token = generate_csrf()
        logger.info(f"Generated CSRF token: {token} for {request.path}")
        return jsonify({'csrfToken': token}), 200
    except Exception as e:
        logger.error(f"Error generating CSRF token in {request.path}: {e}", exc_info=True)
        return jsonify({'error': 'Failed to generate CSRF token'}), 500 
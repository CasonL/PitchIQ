from flask import Blueprint, render_template, current_app, redirect, url_for, request, g, jsonify, send_from_directory
from flask_login import current_user, login_required
import os

# Create the main blueprint
main = Blueprint('main', __name__)

# Define routes for the main blueprint
@main.route('/')
def index():
    """Serve the main React application."""
    # Construct the path to the 'dist' directory within the 'app/frontend' directory
    # current_app.root_path is the path to the 'app' directory (where __init__.py is)
    frontend_dist_path = os.path.join(current_app.root_path, 'frontend', 'dist')
    return send_from_directory(frontend_dist_path, 'index.html')

@main.route('/home')
@login_required
def home():
    """Render the home page for logged-in users."""
    return render_template('home.html')

@main.route('/about')
def about():
    """Render the about page."""
    return render_template('about.html')

@main.route('/privacy')
def privacy():
    """Render the privacy policy page."""
    return render_template('privacy.html')

@main.route('/terms')
def terms():
    """Render the terms and conditions page."""
    return render_template('terms.html') 
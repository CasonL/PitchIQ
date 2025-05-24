from flask import Blueprint, render_template, current_app, redirect, url_for, request, g, jsonify
from flask_login import current_user, login_required

# Create the main blueprint
main = Blueprint('main', __name__)

# Define routes for the main blueprint
@main.route('/')
def index():
    """Render the main landing page."""
    return render_template('landing.html')

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
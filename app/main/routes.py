from flask import render_template, current_app, redirect, url_for, request, g, jsonify, send_from_directory, abort
from flask_login import current_user, login_required
import os

from . import main # Import the main blueprint instance

# Define routes for the main blueprint
@main.route('/')
def index():
    """Serve the optimized Kimi landing page."""
    landing_path = os.path.join(current_app.root_path, 'static', 'landing')
    
    index_html_path = os.path.join(landing_path, 'index.html')
    current_app.logger.info(f"Attempting to serve landing page from: {index_html_path}")
    if not os.path.exists(index_html_path):
        current_app.logger.error(f"index.html NOT FOUND at: {index_html_path}")
    else:
        current_app.logger.info(f"Landing page FOUND at: {index_html_path}")
        
    return send_from_directory(landing_path, 'index.html')

@main.route('/assets/<path:filename>')
def landing_assets(filename):
    """Serve landing page assets (JS, CSS)."""
    landing_assets_path = os.path.join(current_app.root_path, 'static', 'landing', 'assets')
    return send_from_directory(landing_assets_path, filename)

@main.route('/<path:filename>')
def landing_static_files(filename):
    """Serve landing page static files (images, etc)."""
    # Only serve specific file types to avoid conflicts
    if filename.endswith(('.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico', '.txt')):
        landing_path = os.path.join(current_app.root_path, 'static', 'landing')
        return send_from_directory(landing_path, filename)
    # Return 404 for other paths
    return abort(404)

@main.route('/home')
@login_required
def home():
    """Render the home page for logged-in users."""
    return render_template('home.html')



@main.route('/privacy')
def privacy():
    """Render the privacy policy page."""
    return render_template('privacy.html')

@main.route('/terms')
def terms():
    """Render the terms and conditions page."""
    return render_template('terms.html') 
from flask import render_template, current_app, send_from_directory, redirect, url_for
from flask_login import login_required
from . import main # Import the blueprint instance
import os
import json
from flask_login import current_user
from datetime import datetime

# Root route - Serve the React frontend with voice demo
@main.route('/')
def index():
    """
    Serve the React landing page from the static/react/dist directory.
    This page includes the voice recording demo in the hero section.
    """
    react_dir = os.path.join(current_app.static_folder, 'react', 'dist')
    return send_from_directory(react_dir, 'index.html')

# Route to handle favicon requests and prevent 404s
@main.route('/favicon.ico')
def favicon():
    # Serve from static/images or return 204 if not found
    favicon_path = os.path.join(current_app.static_folder, 'images', 'PitchIQ Logo.png')
    if os.path.exists(favicon_path):
        # Note: send_from_directory needs directory, not full path
        image_dir = os.path.join(current_app.static_folder, 'images')
        return send_from_directory(image_dir, 'PitchIQ Logo.png', mimetype='image/png')
    else:
        # Fallback to No Content if specific icon isn't found
        return '', 204

# React App Route for /voice-test
@main.route('/voice-test')
@login_required
def voice_test():
    """Serve the React app for the voice test interface."""
    # Assuming react_app.html is a generic host page for React components
    return render_template('react_app.html')

# Commenting out the old /dashboard-react route as /dashboard now serves React
# @main.route('/dashboard-react')
# @login_required
# def dashboard_react():
#     """
#     Serve the React dashboard application.
#     Finds the index.html file in the React build directory (app/static/react/dist)
#     and serves it using send_from_directory.
#     """
#     react_dist_dir = os.path.join(current_app.static_folder, 'react', 'dist')
# 
#     # Check if index.html exists
#     if not os.path.exists(os.path.join(react_dist_dir, 'index.html')):
#         # Log an error or return a 404 if the file isn't found
#         current_app.logger.error(f"React index.html not found in {react_dist_dir}")
#         return "React dashboard not found.", 404
# 
#     return send_from_directory(react_dist_dir, 'index.html')

@main.route('/logout') 
@login_required
def logout():
    """Logout the current user."""
    from flask_login import logout_user
    logout_user()
    return redirect(url_for('auth.login'))

# Commenting out the /dashboard-static route
# @main.route('/dashboard-static')
# def dashboard_static():
#     """
#     Serve the static HTML dashboard template.
#     This view doesn't require login for development and demonstration purposes.
#     """
#     return render_template('dashboard_direct.html')

# Commenting out the /dashboard-test route
# @main.route('/dashboard-test')
# def dashboard_test():
#     """
#     Serve a simple static test dashboard with no API calls or dependencies.
#     Use this to verify basic routing and template rendering.
#     """
#     return render_template('test_dashboard.html')
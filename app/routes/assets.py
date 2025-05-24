from flask import Blueprint, send_from_directory, current_app, abort
import os

# Create the assets blueprint
assets = Blueprint('assets', __name__)

@assets.route('/js/<path:filename>')
def serve_js(filename):
    """Serve JavaScript files."""
    return send_from_directory(os.path.join(current_app.static_folder, 'js'), filename)

@assets.route('/css/<path:filename>')
def serve_css(filename):
    """Serve CSS files."""
    return send_from_directory(os.path.join(current_app.static_folder, 'css'), filename)

@assets.route('/images/<path:filename>')
def serve_images(filename):
    """Serve image files."""
    return send_from_directory(os.path.join(current_app.static_folder, 'images'), filename)

@assets.route('/webfonts/<path:filename>')
def serve_webfonts(filename):
    """Serve web font files."""
    return send_from_directory(os.path.join(current_app.static_folder, 'webfonts'), filename) 
from flask import Blueprint, render_template, request, jsonify, current_app
from flask_login import login_required, current_user

# Create the voice blueprint
voice = Blueprint('voice', __name__)

@voice.route('/')
@login_required
def index():
    """Render the main voice interface."""
    return render_template('voice/index.html')

@voice.route('/session')
@login_required
def voice_session():
    """Start a new voice session."""
    return render_template('voice/session.html')

@voice.route('/history')
@login_required
def voice_history():
    """View voice session history."""
    return render_template('voice/history.html') 
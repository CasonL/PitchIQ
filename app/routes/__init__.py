from app.routes.main import main

import logging # Add logging import
logger = logging.getLogger(__name__) # Get a logger instance

# from app.routes.auth import auth # This was the original line, now part of the try-except
# logger.info("Successfully imported 'auth' blueprint from app.routes.auth")

# Restore the original import without try-except
from app.routes.auth import auth

from app.routes.api import api
from app.routes.api.dashboard import dashboard_api
from app.routes.chat import chat
from app.routes.voice import voice
from app.training.routes import training_bp as training
from app.routes.dashboard import dashboard
from app.routes.assets import assets

# Add a demo route for showing our streaming functionality
from flask import render_template, Blueprint

demo = Blueprint('demo', __name__)

@demo.route('/streaming-demo')
def streaming_demo():
    """Demo route for showing the StreamingTextDirect component in action"""
    return render_template('demo/streaming_demo.html') 
#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Testing-only runner for PitchIQ Sales Training AI.

This script runs the application with API tests disabled for faster startup.
"""

# Set environment variables to skip API tests BEFORE importing any modules
import os
os.environ['OPENAI_SKIP_TESTS'] = 'true'
os.environ['OPENAI_REDUCED_TIMEOUT'] = 'true'
os.environ['OPENAI_MOCK_MODE'] = 'true'  # Enable mock mode

# Eventlet monkey patching needs to happen at the very beginning
import eventlet
eventlet.monkey_patch()

import sys
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app_log.txt')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def create_app(config_name=None):
    """Create and configure the Flask application."""
    # Import here to avoid circular imports
    from app import create_app as _create_app
    
    # Use FLASK_ENV from environment if config_name not provided
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    return _create_app(config_name)

if __name__ == '__main__':
    # Default port and host settings
    port = int(os.environ.get('PORT', 8081))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 'yes')
    
    logger.info(f"Starting server on {host}:{port} (debug: {debug}) with MOCK OpenAI API")
    
    # Create app and run server
    from app.extensions import socketio
    app = create_app()
    socketio.run(app, host=host, port=port, debug=debug) 
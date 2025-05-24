"""
Simplified App Runner

A simplified version of run_app.py that uses a different port and minimizes initializations.
"""
# from flask import Flask, send_from_directory, Response, jsonify, request, render_template, redirect, url_for, session, g # Flask is handled by create_app
from flask import send_from_directory, Response, jsonify, request, render_template, redirect, url_for, session, g # Keep some specific Flask imports if still needed directly in this file's routes
import os
import logging
import sys
# import re # No longer used directly here
# import time # No longer used directly here
# import secrets # Handled by create_app
# from flask_cors import CORS # Handled by create_app
# import random # Add random for varied responses - If still needed directly here, keep it. Otherwise remove.
# from openai import OpenAI # Import the OpenAI client - If OpenAIService is self-contained in create_app flow, remove.
# from flask_sqlalchemy import SQLAlchemy # Handled by create_app
# from flask_migrate import Migrate # Handled by create_app
# from logging.handlers import RotatingFileHandler # Logging is handled by create_app

# Add the parent directory to sys.path to allow imports
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app # Import the factory

# Import blueprints that might be registered on the app instance from create_app
# These might not be needed here if create_app handles them all.
# from app.routes.api.advice_routes import advice_api_blueprint
# from app.routes.api.dashboard import dashboard_api
# from app.routes.api.chat import chat_api_blueprint
# from app.routes.api.embeddings import embeddings_blueprint
# from app.routes.api.generate_contextual_question import generate_contextual_question_blueprint

# Setup basic logging - create_app should handle this
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__) # This logger instance is fine

# Create the app using the factory
app = create_app(config_name=os.getenv('FLASK_CONFIG') or 'dev')

# Remove direct app configuration and blueprint registration as it's handled by create_app
# CORS(app, resources={r"/api/*": {"origins": "*"}})
# app.secret_key = secrets.token_hex(16)
# app.config['DEBUG'] = True
# app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(os.path.abspath(os.path.dirname(__file__)), "app.db")}'
# app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize Extensions - Handled by create_app
# db = SQLAlchemy(app)
# migrate = Migrate(app, db)

# Register the API blueprints - Handled by create_app
# app.register_blueprint(dashboard_api, url_prefix='/api/dashboard')
# app.register_blueprint(chat_api_blueprint)
# app.register_blueprint(embeddings_blueprint)
# app.register_blueprint(generate_contextual_question_blueprint)
# app.register_blueprint(advice_api_blueprint)

# Routes defined directly in simple_run_app.py might need to be moved
# to blueprints if they are to be part of the main app structure,
# or they can remain here if this script is meant to run a distinct, minimal app.
# For now, assuming they are part of the main app and thus should be in blueprints
# handled by create_app. If not, they would need their own app.route decorators
# on the 'app' instance created by create_app.

# If these routes are truly specific to simple_run_app.py and not part of the main app:
with app.app_context(): # Ensure routes defined here have app context if not in blueprints
    # Add simple auth mock endpoint
    @app.route('/api/auth/status', methods=['GET'])
    def auth_status():
        return jsonify({
            "authenticated": True,
            "user": {
                "id": "mockuser123",
                "name": "Demo User",
                "email": "demo@example.com",
                "role": "user"
            }
        })

    @app.route('/')
    def index():
        # This should ideally be served by the main blueprint in create_app
        # For now, let's assume create_app defines a main index.
        # If simple_run_app needs its own index, it can define it here.
        # return render_template('index.html')
        # If using create_app, this might conflict or be overridden.
        # It's better to have one source of truth for routes.
        # For now, commenting out to avoid conflict. Let create_app handle '/'.
        pass


    @app.route('/dashboard')
    def dashboard():
        # return render_template('dashboard.html') # Likely handled by create_app
        pass

    @app.route('/simple-api-test')
    def api_test():
        return render_template('simple_api_test.html') # Keep if this is a specific test page for this runner

    @app.route('/dashboard-raw')
    def dashboard_raw():
        # return app.send_static_file('dashboard.html') # This is fine if static file serving is intended
        pass # Assuming static files are handled by create_app's config


    # The '/api/dashboard/coach' and '/api/chat/initial-greeting' routes look like
    # they should be part of the main API blueprints registered in create_app,
    # rather than defined here directly, to maintain consistency.
    # If they are already in a blueprint (e.g., dashboard_api or chat_api_blueprint)
    # and those blueprints are registered by create_app, these definitions are redundant
    # and potentially conflicting.

    # For now, commenting out these direct route definitions in simple_run_app.py
    # to ensure that the routes from the main app structure (via create_app) take precedence.

    # @app.route('/api/dashboard/coach', methods=['POST'])
    # def dashboard_coach():
    #     # ... implementation ...
    #     pass

    # @app.route('/api/chat/initial-greeting', methods=['GET', 'POST'])
    # def initial_greeting():
    #     # ... implementation ...
    #     pass

    # Serve assets - create_app and its blueprint setup should handle this.
    # @app.route('/assets/<path:filename>')
    # def serve_assets(filename):
    #     return send_from_directory('app/static/react/dist/assets', filename)

    # @app.route('/static/<path:filename>')
    # def serve_static(filename):
    #     return send_from_directory('app/static', filename)


# The OpenAIService class definition and other helper classes/functions
# should ideally be in their own modules (e.g., app/services/openai_service.py)
# and imported if needed, rather than being defined directly in the run script.
# If create_app and its associated services properly initialize OpenAIService,
# this direct definition might be redundant or could conflict.

# For now, assume OpenAIService is managed by the main app structure via create_app.
# Commenting out the class definition here.

# class OpenAIService:
#     def __init__(self):
#         self.api_key = os.environ.get("OPENAI_API_KEY")
#         if self.api_key:
#             self.client = OpenAI(api_key=self.api_key)
#         else:
#             self.client = None
#             logger.error("OPENAI_API_KEY environment variable not set. AI service will use mock responses.")
#     # ... rest of OpenAIService methods ...


# Main execution
if __name__ == '__main__':
    # Logging from create_app should cover this
    # logger.info("Starting Flask app with LIVE OpenAI Integration (new SDK style) for onboarding.")
    # logger.info("\n============================================================")
    # logger.info("SALES TRAINING AI - ONBOARDING MODULE (Using OpenAI lib v1.x.x compatible code)")
    # logger.info("Access the app at: http://localhost:8080")
    # logger.info("Ensure OPENAI_API_KEY environment variable is set.")
    # logger.info("Conversation history should be passed from frontend.")
    # logger.info("============================================================\n")
    
    # The host and port should be configured in create_app or its config
    app.run(host='0.0.0.0', port=8080, debug=True) # Use app instance from create_app 
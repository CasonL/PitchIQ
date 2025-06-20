"""
Sales Training AI - Application Factory
"""
import logging
import sys
import threading
import os
from datetime import datetime, timedelta, timezone
import time
from logging.handlers import RotatingFileHandler
import secrets
import json
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv
from flask_cors import CORS

from flask import Flask, render_template, g, session, redirect, url_for, request, jsonify, flash, current_app, send_from_directory, abort, Blueprint
from flask_migrate import Migrate
from flask_login import current_user, login_required, LoginManager
from flask_socketio import SocketIO, emit
from flask_wtf import CSRFProtect
from flask_sqlalchemy import SQLAlchemy
from flask_mail import Mail
from flask_bootstrap import Bootstrap

# Attempt to import Flask-Limiter and its utilities, fallback if it fails
try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    import logging
    logging.getLogger(__name__).info("Successfully imported Flask-Limiter and get_remote_address at global scope.")
except Exception as e:
    import logging
    logging.getLogger(__name__).error(
        f"Failed to import Flask-Limiter or get_remote_address at global scope in app/__init__.py: {e}. "
        f"Using fallback versions. RATE LIMITING WILL BE INACTIVE or use fallback behavior."
    )
    from app.limiter_fallback import FallbackLimiter as Limiter
    from app.limiter_fallback import get_remote_address_fallback as get_remote_address

# Import extensions and the init function from the app package
from app.extensions import db, login_manager, mail, limiter, oauth, init_extensions, socketio, migrate, csrf

# Import config classes and managers
from config import config_by_name
from app.database_manager import db_manager
from app.services.api_manager import api_manager

# Import system health routes and error handlers
from app.system_health import register_health_routes
from app.error_handler import register_error_handlers

from sqlalchemy.exc import OperationalError

# Load environment variables
load_dotenv()

# Define FLASK_ROUTE_PREFIXES before create_app or ensure it's defined inside if only used there
FLASK_ROUTE_PREFIXES = ('/auth', '/training', '/chat', '/voice', '/api', '/socket.io', '/dashboard', '/admin', '/static', '/instance') # Added /static, /admin, /instance

logger = logging.getLogger(__name__) # Setup logger for the app module

def create_app(config_name='dev'):
    print("DEBUG: app/__init__.py - create_app() CALLED", flush=True)
    """Create and configure Flask application."""
    
    # --- Ensure instance folder exists FIRST ---
    # This needs to happen before the Flask app object is even created,
    # because configurations might depend on files within the instance folder (e.g., .env).
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    instance_path = os.path.join(project_root, 'instance')
    try:
        os.makedirs(instance_path, exist_ok=True)
        print(f"INIT: Instance path '{instance_path}' checked/created.", flush=True)
    except OSError as e:
        print(f"CRITICAL: Could not create instance path '{instance_path}'. Error: {e}", flush=True)
        # Depending on the desired behavior, you might want to exit or raise the exception
        raise e

    # Explicitly set template folder path
    template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))
    static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))
    
    # Create static directory if it doesn't exist
    os.makedirs(static_dir, exist_ok=True)
    
    # Print static directory path for debugging
    print(f"Static directory path: {static_dir}")
    
    flask_instance = Flask(__name__, 
                instance_relative_config=True)

    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Load configuration using the standard Flask method
    flask_instance.config.from_object(config_by_name[config_name])
    
    # Initialize CSRF Protection Extension Instance (but don't init_app yet)
    from app.extensions import csrf

    # --- Define and Register Request-Level CSRF Exemption EARLY --- 
    # This was causing issues and is not the standard way to exempt blueprints.
    # We will exempt blueprints directly on the CSRF object instead.
    # @flask_instance.before_request
    # def exempt_api_csrf():
    #     # Check if the request path starts with /api/ or /training/api/ and mark it exempt
    #     if request.path.startswith(('/api/', '/training/api/')): # Simplified condition
    #         setattr(request, '_csrf_exempt', True)
    # --- End EARLY CSRF Exemption ---
    
    # Configure CORS to allow frontend to make requests
    logging.getLogger('flask_cors').level = logging.DEBUG

    # Restore the full list of allowed origins, ensuring it's used as a list
    allowed_origins = [
        "https://683dfb0aeaa20f0008871d1a--euphonious-treacle-b2b989.netlify.app", # Explicit deploy preview
        "https://euphonious-treacle-b2b989.netlify.app",      # Main Netlify frontend
        r"https://.*--euphonious-treacle-b2b989\.netlify\.app", # Regex for Netlify deploy previews for this site
        r"https://.*\.ngrok-free\.app",                      # Regex for any ngrok-free.app domains
        "http://localhost:8080",                             # Local dev (Flask server port)
        "http://127.0.0.1:8080",                             # Local dev (Flask server port)
        "http://localhost:5173",                             # Local dev (vite default)
        "http://127.0.0.1:5173",                              # Local dev (vite default)
        "http://10.0.0.150:5173"
    ]

    CORS(flask_instance, origins=allowed_origins, supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers="*", expose_headers=["Content-Length"], max_age=86400)
    
    # Use ProxyFix to handle proxy headers correctly
    # Temporarily disable x_host and x_port to diagnose URL generation issue
    flask_instance.wsgi_app = ProxyFix(flask_instance.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)
    
    # Initialize database manager
    db_manager.init_app(flask_instance)
    
    # Initialize API manager
    api_manager.init_app(flask_instance)
    
    # Initialize Nova Sonic service
    from app.services.nova_sonic_service import nova_sonic_service
    nova_sonic_service.init_app(flask_instance)
    
    # Register health check routes
    register_health_routes(flask_instance)
    
    # Import and register API routes before CSRF exemption
    from app.routes.api import api_bp as api_main_bp
    from app.routes.api.auth import auth_api_bp
    from app.routes.api.email_signup import email_signup_bp
    from app.routes.api.contact import contact_bp
    from app.routes.api.dashboard import dashboard_api_bp
    from app.routes.api.chat import chat_api_bp
    from app.routes.api.personalization import personalization_bp
    from app.routes.api.roleplay import roleplay_bp
    from app.routes.api.generate_contextual_question import generate_contextual_question_bp
    from app.routes.api.embeddings import embeddings_bp
    from app.routes.api.dashboard_coach import dashboard_coach_bp
    from app.routes.api.nova_sonic_routes import nova_sonic_bp
    from app.routes.api.seo_routes import seo_bp
    from app.routes.api.openai_realtime_routes import openai_realtime_bp

    # Register API blueprints
    flask_instance.register_blueprint(api_main_bp, url_prefix='/api')
    flask_instance.register_blueprint(auth_api_bp, url_prefix='/api/auth')
    flask_instance.register_blueprint(email_signup_bp, url_prefix='/api/email-signup')
    flask_instance.register_blueprint(contact_bp, url_prefix='/api/contact')
    flask_instance.register_blueprint(dashboard_api_bp, url_prefix='/api/dashboard')
    flask_instance.register_blueprint(chat_api_bp, url_prefix='/api/chat')
    flask_instance.register_blueprint(personalization_bp, url_prefix='/api/personalization')
    flask_instance.register_blueprint(roleplay_bp, url_prefix='/api/roleplay')
    flask_instance.register_blueprint(generate_contextual_question_bp, url_prefix='/api/generate-contextual-question')
    flask_instance.register_blueprint(embeddings_bp, url_prefix='/api/embeddings')
    flask_instance.register_blueprint(dashboard_coach_bp, url_prefix='/api/dashboard-coach')
    flask_instance.register_blueprint(nova_sonic_bp)
    flask_instance.register_blueprint(seo_bp)
    flask_instance.register_blueprint(openai_realtime_bp, url_prefix='/api/openai-realtime')
    
    # Exempt specific blueprints from CSRF protection after they are created
    # but before the app runs. This is the correct place to do this.
    csrf.exempt(api_main_bp)
    # csrf.exempt(auth_api_bp)
    csrf.exempt(email_signup_bp)
    csrf.exempt(contact_bp)
    csrf.exempt(dashboard_api_bp)
    csrf.exempt(chat_api_bp)
    csrf.exempt(personalization_bp)
    csrf.exempt(roleplay_bp)
    csrf.exempt(generate_contextual_question_bp)
    csrf.exempt(embeddings_bp)
    csrf.exempt(dashboard_coach_bp)
    csrf.exempt(nova_sonic_bp)
    csrf.exempt(seo_bp)
    csrf.exempt(openai_realtime_bp)
    
    # Initialize other extensions (this will call csrf.init_app)
    with flask_instance.app_context():
        try:
            init_extensions(flask_instance)
        except Exception as e:
            flask_instance.logger.error(f"Error initializing extensions: {e}")
    
    # --- Custom Error Handler for CSRF ---
    from flask_wtf.csrf import CSRFError
    @flask_instance.errorhandler(CSRFError)
    def handle_csrf_error(e):
        flask_instance.logger.warning(f'CSRF validation failed: {e.description}. Request path: {request.path}, Headers: {request.headers}')
        return jsonify(error="CSRF validation failed. Please try refreshing the page or ensure cookies are enabled.", reason=str(e.description)), 400

    # The old `before_request` function that was setting a global CSRF token
    # has been removed. It was based on the obsolete custom CSRF system and
    # is no longer necessary with the standardized Flask-WTF implementation.
    
    # --- Add security headers to responses ---
    @flask_instance.after_request
    def add_security_headers(response):
        # For development: Only apply minimal security headers
        # and skip CSP which is breaking the UI
        
        # Set basic security headers that won't break functionality
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Skip other headers for now
        return response
    # --- End security headers ---
    
    @flask_instance.context_processor
    def inject_now():
        return {'now': datetime.utcnow()}

    # Add CSRF token FUNCTION to template context
    @flask_instance.context_processor
    def inject_csrf_token():
        # Import the function safely
        try:
            # This is the standard function Flask-WTF uses
            from flask_wtf.csrf import generate_csrf
            return dict(csrf_token=generate_csrf)
        except ImportError:
            # Handle case where flask_wtf is not installed or setup correctly
            flask_instance.logger.warning("Flask-WTF not found, CSRF token unavailable in templates.")
            # Return a dummy function to avoid UndefinedError, but CSRF won't work
            return dict(csrf_token=lambda: "CSRF_ERROR_WTF_MISSING") 

    # Register custom Jinja2 filters
    @flask_instance.template_filter('datetime')
    def format_datetime(value, format='%B %d, %Y at %I:%M %p'):
        """Format a datetime object to string."""
        if value is None:
            return ""
        return value.strftime(format)
    
    # --- Force re-import of app.auth.routes by deleting from sys.modules ---
    # if 'app.routes' in sys.modules:
    #     del sys.modules['app.routes']

    # if 'app.auth.routes' in sys.modules:
    #     del sys.modules['app.auth.routes']

    # Import and register blueprints
    from app.auth import auth_bp
    from app.main import main as main_blueprint
    from app.chat import chat as chat_blueprint
    from app.voice import voice as voice_blueprint
    from app.training import training as training_blueprint
    from app.dashboard import dashboard as dashboard_blueprint
    from app.demo import demo as demo_blueprint
    flask_instance.register_blueprint(auth_bp) # Register auth routes first
    flask_instance.register_blueprint(main_blueprint)
    flask_instance.register_blueprint(chat_blueprint, url_prefix='/chat')
    flask_instance.register_blueprint(voice_blueprint, url_prefix='/voice')
    flask_instance.register_blueprint(training_blueprint, url_prefix='/training')
    flask_instance.register_blueprint(dashboard_blueprint, url_prefix='/dashboard')
    flask_instance.register_blueprint(demo_blueprint, url_prefix='/demo')
    
    # Register the API routes
    # flask_instance.register_blueprint(generate_contextual_question_blueprint, url_prefix='/api/generate_contextual_question')
    # flask_instance.register_blueprint(embeddings_blueprint, url_prefix='/api/embeddings')
    # flask_instance.register_blueprint(dashboard_coach_blueprint, url_prefix='/api/dashboard_coach')
    # flask_instance.register_blueprint(personalization_bp, url_prefix='/api')

    # Register the email signup and api auth blueprints
    # flask_instance.register_blueprint(email_signup_bp)
    # flask_instance.register_blueprint(api_auth_bp)

    # Register contact form blueprint
    # from app.routes.api.contact import contact_bp
    # flask_instance.register_blueprint(contact_bp, url_prefix='/api')
    
    # Register admin blueprint
    from app.admin import admin_bp

    # Register centralized error handlers
    register_error_handlers(flask_instance)

    # --- Define React frontend build directory ---
    # This should point to your main React app's build output
    react_frontend_dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'frontend', 'dist'))
    
    # This was for a secondary, simpler landing page or other static assets, might not be needed for main React app
    # landing_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static', 'landing'))
    
    # +++ Add a direct test route for POST +++
    @flask_instance.route('/api/test_post', methods=['GET', 'POST'])
    def api_test_post():
        if request.method == 'POST':
            # Handle POST request
            data = request.json
            return jsonify({'message': 'POST request successful', 'data': data}), 200
        else:
            # Handle GET request
            return jsonify({'message': 'GET request successful. Use POST to send data.'}), 200
    
    # +++ Add a simple Nova Sonic test route +++
    @flask_instance.route('/api/nova-sonic-direct-test', methods=['GET'])
    def nova_sonic_direct_test():
        """Direct test route to verify Nova Sonic service access"""
        try:
            from app.services.nova_sonic_service import nova_sonic_service
            sessions_count = len(nova_sonic_service.sessions)
            return jsonify({
                'success': True,
                'message': 'Direct Nova Sonic test successful',
                'sessions_count': sessions_count,
                'service_type': 'minimal_test'
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    #
    # The following route is commented out because it conflicts with serving
    # static assets for the main React application (from app/frontend/dist/assets).
    # The generic /<path:path> (serve_react_app) route should now handle these.
    #
    # @flask_instance.route('/assets/<path:filename>')
    # def serve_landing_assets(filename):
    #     flask_instance.logger.debug(f"Legacy /assets/ route was called for {filename} - THIS ROUTE IS COMMENTED OUT.")
    #     return send_from_directory(os.path.join(current_app.static_folder, 'landing', 'assets'), filename)

    @flask_instance.route('/vite.svg')
    def serve_vite_svg():
        # Serves vite.svg from the root of your React app's dist folder
        return send_from_directory(react_frontend_dist_dir, 'vite.svg')
    
    @flask_instance.route('/favicon.ico')
    def serve_favicon():
        # Serves favicon.ico from the root of your React app's dist folder
        return send_from_directory(react_frontend_dist_dir, 'favicon.ico')
    
    @flask_instance.route('/iq-icon.ico')
    def serve_iq_icon():
        # Serves iq-icon.ico from the root of your React app's dist folder
        return send_from_directory(react_frontend_dist_dir, 'iq-icon.ico')
    
    @flask_instance.route('/pitchiq-logo.png')
    def serve_pitchiq_logo():
        # Serves pitchiq-logo.png from the root of your React app's dist folder
        return send_from_directory(react_frontend_dist_dir, 'pitchiq-logo.png')
    
    @flask_instance.route('/iq-logo.png')
    def serve_iq_logo():
        # Serves iq-logo.png from the root of your React app's dist folder
        return send_from_directory(react_frontend_dist_dir, 'iq-logo.png')
    
    @flask_instance.route('/iq-favicon.png')
    def serve_iq_favicon():
        # Serves iq-favicon.png from the root of your React app's dist folder
        return send_from_directory(react_frontend_dist_dir, 'iq-favicon.png')
    
    # Add a route to serve the demo.mp3 file
    # Ensure demo.mp3 is in react_frontend_dist_dir if served this way
    @flask_instance.route('/demo.mp3')
    def serve_demo_mp3():
        return send_from_directory(react_frontend_dist_dir, 'demo.mp3')
    
    # Add a route to serve the notification.mp3 file
    # Ensure notification.mp3 is in react_frontend_dist_dir if served this way
    @flask_instance.route('/notification.mp3')
    def serve_notification_mp3():
        return send_from_directory(react_frontend_dist_dir, 'notification.mp3')
    
    # This is the main catch-all for serving React app assets and enabling client-side routing.
    # It MUST be registered AFTER specific file routes like /vite.svg, /demo.mp3 etc.
    # AND AFTER all blueprints (especially /api, /auth etc.)
    @flask_instance.route('/<path:path>')
    def serve_react_static_files_or_index(path):
        # Construct the full path to the potential static file in app/frontend/dist
        requested_file_path = os.path.join(react_frontend_dist_dir, path)

        # Check if the requested path points to an existing file
        if os.path.exists(requested_file_path) and os.path.isfile(requested_file_path):
            flask_instance.logger.debug(f"Catch-all: Serving static file: {path} from {react_frontend_dist_dir}")
            return send_from_directory(react_frontend_dist_dir, path)
        else:
            # If the path doesn't correspond to a static file,
            # assume it's a client-side route and serve the main index.html.
            # React Router will then handle the routing on the client side.
            # This check prevents serving index.html for API routes if they somehow miss earlier checks.
            if not path.startswith(tuple(FLASK_ROUTE_PREFIXES)): # Use the globally defined FLASK_ROUTE_PREFIXES
                flask_instance.logger.debug(f"Catch-all: Path '{path}' not a static file, serving index.html for client-side routing.")
                return send_from_directory(react_frontend_dist_dir, 'index.html')
            else:
                flask_instance.logger.warning(f"Catch-all: Path '{path}' matched a Flask prefix but wasn't handled by a blueprint. Aborting with 404.")
                abort(404) # Path matched a prefix but no specific route, so 404.
    
    # The main route ('/') is handled by the main_bp in app/routes/main.py,
    # which should also serve send_from_directory(react_frontend_dist_dir, 'index.html')

    # Add a separate teardown function to ensure database connections are properly closed
    @flask_instance.teardown_appcontext
    def close_db_connection(exception=None):
        """Close the database connection on teardown."""
        from app.extensions import db
        db.session.close()
        db.engine.dispose()

    print(f"DEBUG: app/__init__.py - In create_app, variable 'flask_instance' type BEFORE return: {type(flask_instance)}", flush=True)
    print(f"DEBUG: app/__init__.py - In create_app, variable 'flask_instance' object BEFORE return: {flask_instance}", flush=True)
    
    print("DEBUG: app/__init__.py - About to return app from create_app()", flush=True)
    return flask_instance

# Restore cleanup function (ensure DB error is fixed)
def cleanup_old_conversations(app):
    """Background thread to periodically delete old 'New Conversation' roleplays."""
    while True:
        with app.app_context():
            try:
                cutoff_time = datetime.utcnow() - timedelta(hours=1) # Use a clear variable name
                from app.models import Conversation 
                
                conversations_to_delete = db.session.query(Conversation.id).filter(
                    Conversation.title == "New Conversation",
                    Conversation.created_at < cutoff_time
                ).all()
                
                deleted_ids = [c.id for c in conversations_to_delete]
                if deleted_ids:
                    logging.info(f"Auto-cleanup: Found {len(deleted_ids)} old 'New Conversation' sessions to delete.")
                    num_deleted = Conversation.query.filter(Conversation.id.in_(deleted_ids)).delete(synchronize_session=False)
                    db.session.commit()
                    logging.info(f"Auto-cleanup: Successfully deleted {num_deleted} old conversation records.")
                else:
                    logging.debug("Auto-cleanup: No old 'New Conversation' sessions found to delete.")
            
            except OperationalError as db_err:
                 logging.error(f"Auto-cleanup: Database operational error: {db_err}. Check schema and query.")
                 try: db.session.rollback()
                 except Exception as rb_e: logging.error(f"Auto-cleanup: Error rolling back session: {rb_e}")
            except Exception as e:
                logging.error(f"Auto-cleanup: Error cleaning up old conversations: {e}")
                try: db.session.rollback()
                except Exception as rb_e: logging.error(f"Auto-cleanup: Error rolling back session: {rb_e}")

        time.sleep(3600) # Sleep for 1 hour

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login."""
    from app.models import User
    return User.query.get(int(user_id))

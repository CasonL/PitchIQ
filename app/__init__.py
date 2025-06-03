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
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Import extensions and the init function from the app package
from app.extensions import db, login_manager, mail, limiter, oauth, init_extensions, socketio, migrate, csrf

# Import config classes and managers
from config import config_by_name, Config
from app.config_manager import config_manager
from app.database_manager import db_manager
from app.services.api_manager import api_manager

# Import system health routes and error handlers
from app.system_health import register_health_routes
from app.error_handler import register_error_handlers

from sqlalchemy.exc import OperationalError

# Import the contextual question blueprint
from app.routes.api.generate_contextual_question import generate_contextual_question_blueprint
# Import the embeddings blueprint
from app.routes.api.embeddings import embeddings_blueprint
# Import the dashboard coach blueprint
from app.routes.api.dashboard_coach import dashboard_coach_blueprint
# Import the email signup blueprint
from app.routes.api.email_signup import email_signup_bp
# Import the API auth blueprint
from app.routes.api.auth import api_auth_bp

# Load environment variables
load_dotenv()

# Define FLASK_ROUTE_PREFIXES before create_app or ensure it's defined inside if only used there
FLASK_ROUTE_PREFIXES = ('/auth', '/training', '/chat', '/voice', '/api', '/socket.io', '/dashboard', '/admin', '/static', '/instance') # Added /static, /admin, /instance

logger = logging.getLogger(__name__) # Setup logger for the app module

def create_app(config_name='dev'):
    """Create and configure Flask application."""
    # Explicitly set template folder path
    import os
    template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'templates'))
    static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))
    
    # Create static directory if it doesn't exist
    os.makedirs(static_dir, exist_ok=True)
    
    # Print static directory path for debugging
    print(f"Static directory path: {static_dir}")
    
    app = Flask(__name__, 
                instance_relative_config=True)

    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Ensure instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
        
    # Load configuration using the Config Manager first
    app.config.from_mapping(config_manager.to_flask_config())
    
    # Convert string config_name to the appropriate environment name
    if config_name not in config_by_name:
        if config_name.lower() in config_by_name:
            config_name = config_name.lower()
        else:
            config_name = 'default'
            logger.warning(f"Unknown config name '{config_name}', using default configuration")
    
    # Apply config from environment-specific class
    app.config.from_object(config_by_name[config_name])
    logger.info(f"Loaded configuration for environment: {config_name}")
    
    # Apply instance config overrides if instance/config.py exists
    app.config.from_pyfile('config.py', silent=True) 
    
    # Initialize CSRF Protection Extension Instance (but don't init_app yet)
    from app.extensions import csrf

    # --- Define and Register Request-Level CSRF Exemption EARLY --- 
    @app.before_request
    def exempt_api_csrf():
        # Check if the request path starts with /api/ or /training/api/ and mark it exempt
        if request.path.startswith(('/api/', '/training/api/')): # Simplified condition
            setattr(request, '_csrf_exempt', True)
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
        "http://127.0.0.1:5173"                              # Local dev (vite default)
    ]

    CORS(app, origins=allowed_origins, supports_credentials=True, methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers="*", expose_headers=["Content-Length"], max_age=86400)
    
    # Use ProxyFix to handle proxy headers correctly
    # Temporarily disable x_host and x_port to diagnose URL generation issue
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)
    
    # Initialize database manager
    db_manager.init_app(app)
    
    # Initialize API manager
    api_manager.init_app(app)
    
    # Register health check routes
    register_health_routes(app)
    
    # Initialize other extensions (this will call csrf.init_app)
    with app.app_context():
        try:
            init_extensions(app)
        except Exception as e:
            app.logger.error(f"Error initializing extensions: {e}")
    
    # --- Setup CSRF Token in g (for forms, should run after exemption check) --- 
    @app.before_request
    def before_request():
        # NOTE: Diagnostic prints for origin comparison have been removed.

        from app.auth.security import generate_csrf_token # Import locally
        # Only generate form tokens if NOT an exempt API request
        if not getattr(request, '_csrf_exempt', False):
            g.csrf_token = generate_csrf_token()
        else:
            g.csrf_token = None # No token needed for exempt API requests
        # Also generate CSP nonce if needed elsewhere
        g.csp_nonce = secrets.token_hex(16) 
        # Start timing request for performance metrics
        g.start_time = time.time()
        
        # FIXING RECURSION ISSUE:
        # Rather than trying to update the user's last_seen on every request, 
        # we'll do this less frequently or in a different way to avoid the recursion
        # Disabled the code that was causing the infinite recursion
        pass
    # --- End CSRF setup --- 
    
    # --- Add security headers to responses ---
    @app.after_request
    def add_security_headers(response):
        # For development: Only apply minimal security headers
        # and skip CSP which is breaking the UI
        
        # Set basic security headers that won't break functionality
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Skip other headers for now
        return response
    # --- End security headers ---
    
    @app.context_processor
    def inject_now():
        return {'now': datetime.utcnow()}

    # Add CSRF token FUNCTION to template context
    @app.context_processor
    def inject_csrf_token():
        # Import the function safely
        try:
            # This is the standard function Flask-WTF uses
            from flask_wtf.csrf import generate_csrf
            return dict(csrf_token=generate_csrf)
        except ImportError:
            # Handle case where flask_wtf is not installed or setup correctly
            app.logger.warning("Flask-WTF not found, CSRF token unavailable in templates.")
            # Return a dummy function to avoid UndefinedError, but CSRF won't work
            return dict(csrf_token=lambda: "CSRF_ERROR_WTF_MISSING") 

    # Register custom Jinja2 filters
    @app.template_filter('datetime')
    def format_datetime(value, format='%B %d, %Y at %I:%M %p'):
        """Format a datetime object to string."""
        if value is None:
            return ""
        return value.strftime(format)
    
    # Import and register blueprints
    from app.routes import main, auth, api, chat, voice, training, dashboard, assets
    from app.routes import demo  # Add import for demo blueprint
    app.register_blueprint(main)
    app.register_blueprint(auth, url_prefix='/auth')
    app.register_blueprint(api, url_prefix='/api')
    app.register_blueprint(chat, url_prefix='/chat')
    app.register_blueprint(voice, url_prefix='/voice')
    app.register_blueprint(training, url_prefix='/training')
    app.register_blueprint(dashboard, url_prefix='/dashboard')
    app.register_blueprint(assets)
    app.register_blueprint(demo, url_prefix='/demo')  # Register demo blueprint
    
    # Register the API routes
    app.register_blueprint(generate_contextual_question_blueprint, url_prefix='/api/generate_contextual_question')
    app.register_blueprint(embeddings_blueprint, url_prefix='/api/embeddings')
    app.register_blueprint(dashboard_coach_blueprint, url_prefix='/api/dashboard_coach')
    app.register_blueprint(email_signup_bp)
    
    # Register contact form blueprint
    from app.routes.api.contact import contact_bp
    app.register_blueprint(contact_bp, url_prefix='/api')
    
    # Register API auth blueprint
    app.register_blueprint(api_auth_bp) # This blueprint already has /api/auth prefix
    
    # Register centralized error handlers
    register_error_handlers(app)

    # --- Define React frontend build directory ---
    # This should point to your main React app's build output
    react_frontend_dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'frontend', 'dist'))
    
    # This was for a secondary, simpler landing page or other static assets, might not be needed for main React app
    # landing_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static', 'landing'))
    
    # +++ Add a direct test route for POST +++
    @app.route('/api/test_post', methods=['GET', 'POST'])
    def api_test_post():
        if request.method == 'POST':
            # Handle POST request
            data = request.json
            return jsonify({'message': 'POST request successful', 'data': data}), 200
        else:
            # Handle GET request
            return jsonify({'message': 'GET request successful. Use POST to send data.'}), 200

    #
    # The following route is commented out because it conflicts with serving
    # static assets for the main React application (from app/frontend/dist/assets).
    # The generic /<path:path> (serve_react_app) route should now handle these.
    #
    # @app.route('/assets/<path:filename>')
    # def serve_landing_assets(filename):
    #     app.logger.debug(f"Legacy /assets/ route was called for {filename} - THIS ROUTE IS COMMENTED OUT.")
    #     return send_from_directory(os.path.join(current_app.static_folder, 'landing', 'assets'), filename)

    @app.route('/vite.svg')
    def serve_vite_svg():
        # Serves vite.svg from the root of your React app's dist folder
        return send_from_directory(react_frontend_dist_dir, 'vite.svg')
    
    # Add a route to serve the demo.mp3 file
    # Ensure demo.mp3 is in react_frontend_dist_dir if served this way
    @app.route('/demo.mp3')
    def serve_demo_mp3():
        return send_from_directory(react_frontend_dist_dir, 'demo.mp3')
    
    # Add a route to serve the notification.mp3 file
    # Ensure notification.mp3 is in react_frontend_dist_dir if served this way
    @app.route('/notification.mp3')
    def serve_notification_mp3():
        return send_from_directory(react_frontend_dist_dir, 'notification.mp3')
    
    # This is the main catch-all for serving React app assets and enabling client-side routing.
    # It MUST be registered AFTER specific file routes like /vite.svg, /demo.mp3 etc.
    # AND AFTER all blueprints (especially /api, /auth etc.)
    @app.route('/<path:path>')
    def serve_react_static_files_or_index(path):
        # Construct the full path to the potential static file in app/frontend/dist
        requested_file_path = os.path.join(react_frontend_dist_dir, path)

        # Check if the requested path points to an existing file
        if os.path.exists(requested_file_path) and os.path.isfile(requested_file_path):
            app.logger.debug(f"Catch-all: Serving static file: {path} from {react_frontend_dist_dir}")
            return send_from_directory(react_frontend_dist_dir, path)
        else:
            # If the path doesn't correspond to a static file,
            # assume it's a client-side route and serve the main index.html.
            # React Router will then handle the routing on the client side.
            # This check prevents serving index.html for API routes if they somehow miss earlier checks.
            if not path.startswith(tuple(FLASK_ROUTE_PREFIXES)): # Use the globally defined FLASK_ROUTE_PREFIXES
                app.logger.debug(f"Catch-all: Path '{path}' not a static file, serving index.html for client-side routing.")
                return send_from_directory(react_frontend_dist_dir, 'index.html')
            else:
                app.logger.warning(f"Catch-all: Path '{path}' matched a Flask prefix but wasn't handled by a blueprint. Aborting with 404.")
                abort(404) # Path matched a prefix but no specific route, so 404.
    
    # The main route ('/') is handled by the main_bp in app/routes/main.py,
    # which should also serve send_from_directory(react_frontend_dist_dir, 'index.html')

    # Add a separate teardown function to ensure database connections are properly closed
    @app.teardown_appcontext
    def close_db_connection(exception=None):
        """Close the database connection on teardown."""
        from app.extensions import db
        db.session.close()
        db.engine.dispose()

    return app

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

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

# Load environment variables
load_dotenv()

# --- Remove redundant initializations ---
# csrf = CSRFProtect()
# login_manager = LoginManager()
# bootstrap = Bootstrap()
# socketio = SocketIO()
# --- End removal ---

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
        if request.path.startswith('/api/') or request.path.startswith('/training/api/'):
            # --- NEW LOGGING ---
            if request.path == '/training/api/chat/create_test_persona':
                app.logger.info(f"[CSRF Exemption] Attempting to exempt: {request.path}")
            # --- END NEW LOGGING ---
            if hasattr(request, '_csrf_processed'):
                 app.logger.warning(f"CSRF exemption for {request.path} running AFTER CSRF check?")
            setattr(request, '_csrf_exempt', True)
            # --- NEW LOGGING ---
            if request.path == '/training/api/chat/create_test_persona':
                app.logger.info(f"[CSRF Exemption] Successfully set _csrf_exempt for: {request.path}")
            # --- END NEW LOGGING ---
            # logger.debug(f"CSRF exemption set for path: {request.path}") 
            
        # Explicitly exempt the paraphrase endpoint
        if request.path == '/api/paraphrase':
            app.logger.info(f"Explicitly exempting {request.path} from CSRF protection")
            setattr(request, '_csrf_exempt', True)
    # --- End EARLY CSRF Exemption ---
    
    # Configure CORS to allow frontend to make requests
    CORS(app, resources={
        r"/api/*": {"origins": ["http://localhost:8080", "http://127.0.0.1:8080", 
                               "http://localhost:5173", "http://127.0.0.1:5173"]},
        r"/auth/*": {"origins": ["http://localhost:8080", "http://127.0.0.1:8080", 
                                "http://localhost:5173", "http://127.0.0.1:5173"]},
        r"/chat/*": {"origins": ["http://localhost:8080", "http://127.0.0.1:8080", 
                               "http://localhost:5173", "http://127.0.0.1:5173"]},
        r"/voice/*": {"origins": ["http://localhost:8080", "http://127.0.0.1:8080", 
                                "http://localhost:5173", "http://127.0.0.1:5173"]},
        r"/training/*": {"origins": ["http://localhost:8080", "http://127.0.0.1:8080", 
                                    "http://localhost:5173", "http://127.0.0.1:5173"]},
        r"/dashboard": {"origins": "*"},  # Allow access to dashboard from anywhere
        r"/dashboard-react": {"origins": "*"}  # Allow access to the dashboard route from any origin
    }, supports_credentials=True)  # Must support credentials for sessions
    
    # Use ProxyFix to handle proxy headers correctly
    # Temporarily disable x_host and x_port to diagnose URL generation issue
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=0, x_port=0, x_prefix=1)
    
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
    print("DEBUG: Current app.url_map after training registration:")
    print(app.url_map)
    app.register_blueprint(dashboard, url_prefix='/dashboard')
    app.register_blueprint(assets)
    app.register_blueprint(demo, url_prefix='/demo')  # Register demo blueprint
    
    # Register the API routes
    app.register_blueprint(generate_contextual_question_blueprint, url_prefix='/api/generate_contextual_question')
    app.register_blueprint(embeddings_blueprint, url_prefix='/api/embeddings')
    app.register_blueprint(dashboard_coach_blueprint, url_prefix='/api/dashboard_coach')
    
    # Register centralized error handlers
    register_error_handlers(app)

    # --- Define React frontend build directory ---
    react_build_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static', 'react', 'dist'))
    landing_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static', 'landing'))
    
    # +++ Add a direct test route for POST +++
    @app.route('/api/test_post', methods=['GET', 'POST'])
    def api_test_post():
        logger.info(f"Entered /api/test_post with method: {request.method}")
        if request.method == 'POST':
            try:
                data = request.json
                logger.info(f"Received POST data: {data}")
                return jsonify({"status": "ok", "method": "POST", "received_data": data}), 200
            except Exception as e:
                logger.error(f"Error processing POST data: {e}")
                return jsonify({"error": "Failed to parse JSON"}), 400
        else: # GET
            return jsonify({"status": "ok", "method": "GET", "message": "Test POST endpoint is working."}), 200
    # +++ End test route +++
    
    # List of known Flask route prefixes to ignore in the catch-all
    FLASK_ROUTE_PREFIXES = ('/auth', '/training', '/chat', '/voice', '/api', '/socket.io', '/dashboard', '/simplified-dashboard')
    
    # Add a route to serve landing page static assets
    @app.route('/assets/<path:filename>')
    def serve_landing_assets(filename):
        """Serve the static assets for the landing page."""
        react_assets_dir = os.path.join(os.path.dirname(__file__), 'static', 'react', 'dist', 'assets')
        return send_from_directory(react_assets_dir, filename)
    
    # Add a route to serve the vite.svg file
    @app.route('/vite.svg')
    def serve_vite_svg():
        """Serve the vite.svg file for the landing page."""
        react_dist_dir = os.path.join(os.path.dirname(__file__), 'static', 'react', 'dist')
        return send_from_directory(react_dist_dir, 'vite.svg')
    
    # Add a route to serve the demo.mp3 file
    @app.route('/demo.mp3')
    def serve_demo_mp3():
        """Serve the demo.mp3 file for the landing page."""
        react_dist_dir = os.path.join(os.path.dirname(__file__), 'static', 'react', 'dist')
        return send_from_directory(react_dist_dir, 'demo.mp3')
    
    # Add a route to serve the notification.mp3 file
    @app.route('/notification.mp3')
    def serve_notification_mp3():
        """Serve the notification.mp3 file for the landing page."""
        react_dist_dir = os.path.join(os.path.dirname(__file__), 'static', 'react', 'dist')
        return send_from_directory(react_dist_dir, 'notification.mp3')
    
    # Move the catch-all route to the end, AFTER all other routes are registered
    @app.route('/<path:path>')
    def serve_react_app(path):
        """Serve the React app or static files, ignoring known Flask routes."""
        
        # Check if the path starts with a known Flask prefix
        full_path = f'/{path}' # Ensure path starts with a slash for comparison
        if full_path.startswith(FLASK_ROUTE_PREFIXES):
            # If it's a known Flask/API path, let other routes handle it or 404
            app.logger.debug(f"Path '{full_path}' matches a Flask prefix, aborting catch-all.")
            abort(404)
        
        # First check landing directory
        static_landing_path = os.path.join(landing_dir, path)
        if path and os.path.exists(static_landing_path) and os.path.isfile(static_landing_path):
            app.logger.debug(f"Serving static file from landing: {path}")
            return send_from_directory(landing_dir, path)
            
        # Then check React build directory for dashboard assets
        static_file_path = os.path.join(react_build_dir, path)
        if path and os.path.exists(static_file_path) and os.path.isfile(static_file_path):
            app.logger.debug(f"Serving static file from React build: {path}")
            return send_from_directory(react_build_dir, path)
            
        # --- Fallback: Serve React App's index.html for dashboard routes --- 
        # For any other dashboard-related path not matched above, serve the main index.html of the React app.
        index_html_path = os.path.join(react_build_dir, 'index.html')
        if path.startswith('dashboard') and os.path.exists(index_html_path):
             app.logger.debug(f"Path '{full_path}' not found or not a file, serving React index.html")
             return send_from_directory(react_build_dir, 'index.html')
        else:
             # Return 404 for all other routes
             abort(404) # Use abort for consistency
    
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

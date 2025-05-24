"""
Flask Extension Instances

This module initializes shared Flask extensions to prevent circular imports.
"""

from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_mail import Mail
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from authlib.integrations.flask_client import OAuth
from flask_migrate import Migrate
from flask_bcrypt import Bcrypt
import logging
from sqlalchemy import MetaData
import os
from flask_socketio import SocketIO
from flask import request, jsonify, redirect, url_for
from flask_bootstrap import Bootstrap
from flask_wtf import CSRFProtect

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Define naming convention for SQLAlchemy
naming_convention = {
    "ix": 'ix_%(column_0_label)s',
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(column_0_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

# Track initialization state for each app instance
_initialized_apps = set()

# Instantiate extensions without app context initially
db = SQLAlchemy(metadata=MetaData(naming_convention=naming_convention))

# --- Import models IMMEDIATELY after db instantiation --- #
# from app import models # Updated import <-- REMOVE THIS LINE
# --- End model import --- #

login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
login_manager.login_message_category = 'info'

# --- Define user_loader globally ---
@login_manager.user_loader
def load_user(user_id):
    # --- Import User model locally ---
    from app.models import User
    return User.query.get(int(user_id))

mail = Mail()
limiter = Limiter(key_func=get_remote_address)
oauth = OAuth()

# Load configuration from object (assuming Config is defined elsewhere)
# This line is removed because config is loaded in create_app
# app.config.from_object(Config)

# Initialize Bcrypt
bcrypt = Bcrypt()

# Initialize database migration
migrate = Migrate()

# Initialize Socket.IO for real-time communication
# cors_allowed_origins can be configured to specific domains or '*' for development
socketio = SocketIO(
    logger=True, 
    engineio_logger=True,
    cors_allowed_origins='*',
    async_mode='threading', # Changed from eventlet to avoid socket patching issues
    manage_session=False     # Don't let SocketIO manage the session to avoid conflicts
)

# Initialize CSRF Protection
csrf = CSRFProtect()

def init_extensions(app):
    """
    Initialize all Flask extensions.
    
    This function ensures that extensions are initialized only once per Flask app instance.
    """
    app_id = id(app)
    
    if app_id in _initialized_apps:
        logger.info(f"Extensions already initialized for this app instance (id: {app_id})")
        return
    
    logger.info(f"Initializing extensions for app instance (id: {app_id})")
    
    try:
        # Initialize SQLAlchemy - safely check if it's already registered
        logger.info("Initializing SQLAlchemy...")
        try:
            # Check if SQLAlchemy is already initialized on this app
            if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
                db.init_app(app)
            else:
                logger.info("SQLAlchemy already registered on this Flask app, skipping initialization")
        except Exception as e:
            logger.error(f"Error initializing SQLAlchemy: {str(e)}")
            # Continue with other extensions
        
        # Initialize Flask-Login
        logger.info("Initializing Flask-Login...")
        login_manager.init_app(app)
        login_manager.login_view = 'auth.login'
        login_manager.login_message = 'Please log in to access this page.'
        login_manager.login_message_category = 'info'
        
        # Initialize Flask-Mail
        logger.info("Initializing Flask-Mail...")
        mail.init_app(app)
        
        # Initialize Flask-Limiter
        logger.info("Initializing Flask-Limiter...")
        limiter.init_app(app)
        
        # Initialize OAuth
        logger.info("Initializing OAuth...")
        oauth.init_app(app)
        
        # Initialize Flask-Migrate
        logger.info("Initializing Flask-Migrate...")
        migrate.init_app(app, db)
        
        # Initialize Flask-Bcrypt
        logger.info("Initializing Flask-Bcrypt...")
        bcrypt.init_app(app)
        
        # Initialize Flask-SocketIO with explicit configuration
        logger.info("Initializing Flask-SocketIO...")
        socketio_config = {
            'cors_allowed_origins': '*',
            'logger': True,
            'engineio_logger': True,
            'async_mode': 'threading', # Changed from eventlet
            'manage_session': False
        }
        
        # Check if we're in debug mode
        if app.debug:
            logger.info("Debug mode detected, enabling detailed socketio logging")
            socketio_config['logger'] = True
            socketio_config['engineio_logger'] = True
        
        # Initialize SocketIO with the app
        try:
            # Check if SocketIO is already initialized
            if not hasattr(app, 'extensions') or 'socketio' not in app.extensions:
                socketio.init_app(app, **socketio_config)
                logger.info("Flask-SocketIO initialized successfully")
            else:
                logger.info("Flask-SocketIO already initialized")
        except Exception as e:
            logger.error(f"Error initializing SocketIO: {str(e)}")
            # Continue with initialization, don't block the application startup
        
        # Initialize CSRF Protection
        logger.info("Initializing CSRF Protection...")
        csrf.init_app(app)
        
        # Add this app to the set of initialized apps
        _initialized_apps.add(app_id)
        
        logger.info("All extensions initialized successfully")
        
    except Exception as e:
        logger.error(f"Error initializing extensions: {str(e)}", exc_info=True)
        raise

def get_db():
    """Get the SQLAlchemy database instance."""
    return db

def get_login_manager():
    """Get the LoginManager instance."""
    return login_manager

def get_migrate():
    """Get the Migrate instance."""
    return migrate

def get_socketio():
    """Get the SocketIO instance."""
    return socketio 
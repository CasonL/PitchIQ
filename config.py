import os
from dotenv import load_dotenv
# import logging # <-- Comment out or remove logging import if only using print
import sys # <-- Import sys for stderr
from datetime import timedelta

# Configure basic logging
# logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s') # <-- Remove basicConfig

# Explicitly load .env file from the instance path if it exists
# This is crucial for environments where the app is not run from the root
project_root = os.path.dirname(os.path.abspath(__file__))
instance_path = os.path.join(project_root, 'instance')
dotenv_path = os.path.join(instance_path, '.env')
if os.path.exists(dotenv_path):
    print(f"CONFIG.PY: Loading .env file from: {dotenv_path}")
    load_dotenv(dotenv_path=dotenv_path)
else:
    print(f"CONFIG.PY: No .env file found at: {dotenv_path}")

class Config:
    """Base configuration class."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    if not SECRET_KEY:
        raise ValueError("No SECRET_KEY set for Flask application. Please set it in your .env file.")

    SECURITY_PASSWORD_SALT = os.environ.get('SECURITY_PASSWORD_SALT', 'default_salt')
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'True').lower() in ('true', '1', 't')
    
    # --- Database Configuration ---
    # Get the absolute path of the directory where config.py is located
    basedir = os.path.abspath(os.path.dirname(__file__))
    # Define the instance path relative to the basedir (project root)
    instance_path = os.path.join(basedir, 'instance')
    print(f"CONFIG.PY: Instance path calculated: {instance_path}", file=sys.stderr) # <-- Print to stderr
    
    # Ensure the instance directory exists - moved this to be done by the setup script primarily
    os.makedirs(instance_path, exist_ok=True) 
    
    # Define the default database path within the instance folder
    default_db_path = os.path.join(instance_path, 'sales_training.db')
    default_db_path = os.path.abspath(default_db_path) # Make absolutely sure it's an absolute path
    print(f"CONFIG.PY: Default DB path calculated: {default_db_path}", file=sys.stderr) # <-- Print to stderr
    
    # Construct the SQLite URI. os.path.join ensures correct slashes.
    # The /// creates an absolute path for SQLite.
    default_db_uri = f'sqlite:///{default_db_path.replace(os.sep, "/")}'
    print(f"CONFIG.PY: Default DB URI constructed: {default_db_uri}", file=sys.stderr) # <-- Print to stderr
    
    # Ensure DATABASE_URL uses postgresql:// scheme for SQLAlchemy compatibility (if using Postgres externally)
    database_url_from_env = os.environ.get('DATABASE_URL')
    print(f"CONFIG.PY: DATABASE_URL from environment: {database_url_from_env}", file=sys.stderr) # <-- Print to stderr
    
    database_url_to_use = database_url_from_env
    if database_url_to_use and database_url_to_use.startswith('postgres://'):
        database_url_to_use = database_url_to_use.replace('postgres://', 'postgresql://', 1)
        print(f"CONFIG.PY: DATABASE_URL (env) modified for postgresql scheme: {database_url_to_use}", file=sys.stderr) # <-- Print to stderr
    
    SQLALCHEMY_DATABASE_URI = database_url_to_use or default_db_uri
    print(f"CONFIG.PY: Final SQLALCHEMY_DATABASE_URI: {SQLALCHEMY_DATABASE_URI}", file=sys.stderr) # <-- Print to stderr
    # --- End Database Configuration ---
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
    }
    
    # --- API Keys --- 
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4.1-mini')
    OPENAI_FEEDBACK_MODEL = os.environ.get('OPENAI_FEEDBACK_MODEL', 'gpt-4.1-mini')
    DEEPGRAM_API_KEY = os.environ.get('DEEPGRAM_API_KEY')
    # --- End API Keys ---

    # --- Email/SMTP Configuration ---
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USE_SSL = os.environ.get('SMTP_USE_SSL', 'False').lower() in ('true', '1', 't')
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER') or os.environ.get('FROM_EMAIL')
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com')
    # --- End Email Configuration ---

    # Flask-Limiter settings
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL') or "memory://"
    
    # General Rate Limits (used by @rate_limit decorator)
    RATE_LIMIT = 20  # Default limit per window
    RATE_LIMIT_WINDOW = 60  # Default window in seconds (1 minute)
    
    # Login Attempt Lockout (used by security.py functions)
    MAX_LOGIN_ATTEMPTS = 5  # Maximum failed login attempts before lockout
    LOCKOUT_TIME = 300     # Lockout period in seconds (5 minutes)
    
    # Password validation
    PASSWORD_MIN_LENGTH = 8
    
    # Session security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    # Base URL for callbacks (ensure it's correct for your environment)
    BASE_URL = os.environ.get('BASE_URL', 'http://127.0.0.1:5000')

    # CSRF Protection
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None  # No time limit for CSRF tokens
    
    # AWS Configuration for Nova Sonic
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_REGION = os.environ.get('AWS_REGION', 'us-east-1')

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    RATELIMIT_ENABLED = False # Temporarily disable Flask-Limiter
    # SQLALCHEMY_ECHO = True # Uncomment to log SQL queries
    SESSION_COOKIE_SECURE = False # Should be False for HTTP local development
    SESSION_COOKIE_SAMESITE = 'Lax' # Use 'Lax' for local dev with different ports

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False # Disable CSRF for testing forms
    LOGIN_DISABLED = True # Allow access without logging in for tests
    # Use a fast hasher for tests
    PASSWORD_HASHING_METHOD = 'plaintext' 

class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SESSION_COOKIE_SECURE = True # Enforce HTTPS for session cookies in production
    SESSION_COOKIE_SAMESITE = 'None' # Allow cross-domain authentication
    # Ensure Redis is used for rate limiting in production
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL') or "memory://"

# Configuration dictionary
config_by_name = dict(
    dev=DevelopmentConfig,
    development=DevelopmentConfig,
    test=TestingConfig,
    prod=ProductionConfig,
    production=ProductionConfig,
    default=DevelopmentConfig
) 
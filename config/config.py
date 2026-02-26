import os
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

class Config:
    """Base configuration class."""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'your-secret-key-here'
    
    # --- Database Configuration ---
    # Default SQLite path (can be overridden by environment variable)
    basedir = os.path.abspath(os.path.dirname(__file__))
    instance_path = os.path.join(basedir, 'instance')
    default_db_path = os.path.join(instance_path, 'sales_training.db') # Use .db extension
    default_db_uri = f'sqlite:///{default_db_path.replace(os.sep, "/")}'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or default_db_uri
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
    }
    # --- End Database Configuration ---
    
    # --- API Keys --- 
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    DEEPGRAM_API_KEY = os.environ.get('DEEPGRAM_API_KEY')
    CARTESIA_API_KEY = os.environ.get('CARTESIA_API_KEY')
    # --- End API Keys ---

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
    SESSION_COOKIE_SECURE = False  # Changed to False since we're not using HTTPS in development
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    
    # Google OAuth
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    # Base URL for callbacks (ensure it's correct for your environment)
    BASE_URL = os.environ.get('BASE_URL', 'http://127.0.0.1:5000')

    # Email configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER')
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    
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
    # SQLALCHEMY_ECHO = True # Uncomment to log SQL queries
    SESSION_COOKIE_SECURE = False  # Allow cookies without HTTPS in development

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
    # Ensure Redis is used for rate limiting in production
    RATELIMIT_STORAGE_URI = os.environ.get('REDIS_URL', "redis://localhost:6379/0") 

# Configuration dictionary
config_by_name = dict(
    dev=DevelopmentConfig,
    development=DevelopmentConfig,
    test=TestingConfig,
    prod=ProductionConfig,
    default=DevelopmentConfig
) 
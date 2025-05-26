"""
Configuration Management for Sales Training AI

This module handles configuration loading from various sources (env, JSON, etc.)
and provides a unified interface for accessing configuration values.
"""

import os
import logging
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

class ConfigManager:
    """
    Configuration manager that handles loading and accessing environment variables
    and configuration settings from various sources with fallbacks.
    """
    def __init__(self):
        self.config = {}
        self._load_from_env()
    
    def _load_from_env(self):
        """Load configuration from environment variables with .env file support"""
        # Load from .env file first
        load_dotenv()
        
        # Core application settings
        self.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'default-secret-key-for-development'
        self.config['DEBUG'] = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')
        self.config['TESTING'] = os.environ.get('TESTING', 'False').lower() in ('true', '1', 'yes')
        self.config['FLASK_ENV'] = os.environ.get('FLASK_ENV', 'development')
        
        # Database configuration
        self._load_database_config()
        
        # API Keys
        self._load_api_keys()
        
        # Security settings
        self._load_security_settings()
        
        # Custom application settings
        self._load_app_settings()
        
        logger.info(f"Loaded configuration with {len(self.config)} settings")
    
    def _load_database_config(self):
        """Load database configuration settings"""
        # Database URL
        db_url = os.environ.get('DATABASE_URL')
        if not db_url:
            # Default to SQLite if no DB URL is provided
            basedir = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
            instance_path = os.path.join(basedir, 'instance')
            default_db_path = os.path.join(instance_path, 'sales_training.db')
            db_url = f'sqlite:///{default_db_path.replace(os.sep, "/")}'
        
        self.config['SQLALCHEMY_DATABASE_URI'] = db_url
        self.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    def _load_api_keys(self):
        """Load API keys and external service credentials"""
        # OpenAI
        self.config['OPENAI_API_KEY'] = os.environ.get('OPENAI_API_KEY')
        self.config['OPENAI_MODEL'] = os.environ.get('OPENAI_MODEL', 'gpt-4.1-mini')
        
        # ElevenLabs
        self.config['ELEVEN_LABS_API_KEY'] = os.environ.get('ELEVEN_LABS_API_KEY') or os.environ.get('ELEVENLABS_API_KEY')
        
        # Deepgram
        self.config['DEEPGRAM_API_KEY'] = os.environ.get('DEEPGRAM_API_KEY')
        
        # Anthropic
        self.config['ANTHROPIC_API_KEY'] = os.environ.get('ANTHROPIC_API_KEY')
        
        # OAuth providers
        self.config['GOOGLE_CLIENT_ID'] = os.environ.get('GOOGLE_CLIENT_ID')
        self.config['GOOGLE_CLIENT_SECRET'] = os.environ.get('GOOGLE_CLIENT_SECRET')
    
    def _load_security_settings(self):
        """Load security-related configuration"""
        # Session security
        self.config['SESSION_COOKIE_SECURE'] = os.environ.get('SESSION_COOKIE_SECURE', 'False').lower() in ('true', '1', 'yes')
        self.config['SESSION_COOKIE_HTTPONLY'] = True
        self.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
        self.config['PERMANENT_SESSION_LIFETIME'] = int(os.environ.get('SESSION_LIFETIME', '3600'))  # 1 hour default
        
        # Rate limiting
        self.config['RATELIMIT_STORAGE_URI'] = os.environ.get('REDIS_URL') or 'memory://'
        self.config['RATE_LIMIT'] = int(os.environ.get('RATE_LIMIT', '20'))
        self.config['RATE_LIMIT_WINDOW'] = int(os.environ.get('RATE_LIMIT_WINDOW', '60'))
        
        # Login security
        self.config['MAX_LOGIN_ATTEMPTS'] = int(os.environ.get('MAX_LOGIN_ATTEMPTS', '5'))
        self.config['LOCKOUT_TIME'] = int(os.environ.get('LOCKOUT_TIME', '300'))
        self.config['PASSWORD_MIN_LENGTH'] = int(os.environ.get('PASSWORD_MIN_LENGTH', '8'))
    
    def _load_app_settings(self):
        """Load application-specific settings"""
        # Base URL
        self.config['BASE_URL'] = os.environ.get('BASE_URL', 'http://127.0.0.1:5000')
        
        # Email configuration
        self._load_email_config()
        
        # Application-specific settings can be added here
        self.config['DEFAULT_LANGUAGE'] = os.environ.get('DEFAULT_LANGUAGE', 'en')
        self.config['UPLOAD_FOLDER'] = os.environ.get('UPLOAD_FOLDER', 'uploads')
        self.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', '16777216'))  # 16MB default
    
    def _load_email_config(self):
        """Load email/SMTP configuration settings"""
        # SMTP settings from .env
        smtp_server = os.environ.get('SMTP_SERVER')
        smtp_port = int(os.environ.get('SMTP_PORT', '587'))
        smtp_username = os.environ.get('SMTP_USERNAME')
        smtp_password = os.environ.get('SMTP_PASSWORD')
        from_email = os.environ.get('FROM_EMAIL')
        smtp_use_tls = os.environ.get('SMTP_USE_TLS', 'True').lower() in ('true', '1', 'yes')
        mail_default_sender = os.environ.get('MAIL_DEFAULT_SENDER', from_email) # Use FROM_EMAIL as fallback

        # Set both SMTP_ and MAIL_ prefixed versions for compatibility
        self.config['SMTP_SERVER'] = smtp_server
        self.config['MAIL_SERVER'] = smtp_server

        self.config['SMTP_PORT'] = smtp_port
        self.config['MAIL_PORT'] = smtp_port

        self.config['SMTP_USERNAME'] = smtp_username
        self.config['MAIL_USERNAME'] = smtp_username

        self.config['SMTP_PASSWORD'] = smtp_password
        self.config['MAIL_PASSWORD'] = smtp_password

        self.config['FROM_EMAIL'] = from_email # Kept for other potential uses
        self.config['MAIL_DEFAULT_SENDER'] = mail_default_sender
        
        self.config['SMTP_USE_TLS'] = smtp_use_tls # Kept for other potential uses
        self.config['MAIL_USE_TLS'] = smtp_use_tls

        self.config['MAIL_USE_SSL'] = os.environ.get('SMTP_USE_SSL', 'False').lower() in ('true', '1', 'yes')

        # Email feature flags
        self.config['EMAIL_ENABLED'] = os.environ.get('EMAIL_ENABLED', 'False').lower() in ('true', '1', 'yes')
    
    def get(self, key, default=None):
        """Get config value with fallback"""
        return self.config.get(key, default)
    
    def set(self, key, value):
        """Set a configuration value"""
        self.config[key] = value
        return value
    
    def requires(self, *keys):
        """
        Ensure required keys exist in the configuration.
        Raises ValueError if any key is missing.
        """
        missing = [key for key in keys if not self.get(key)]
        if missing:
            missing_keys = ', '.join(missing)
            raise ValueError(f"Missing required configuration values: {missing_keys}")
        return True
    
    def to_flask_config(self):
        """Convert to dict suitable for Flask config"""
        return self.config.copy()

# Global instance for app-wide access
config_manager = ConfigManager()

# Create a backward-compatible alias
config = config_manager
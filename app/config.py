import os

class Config:
    # Basic Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'super-secret-key-for-dev')
    DEBUG = os.environ.get('FLASK_DEBUG', 'True') == 'True'
    TESTING = False
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # API Keys
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    OPENAI_MODEL = os.environ.get('OPENAI_MODEL', 'gpt-4.1-mini')
    OPENAI_FEEDBACK_MODEL = os.environ.get('OPENAI_FEEDBACK_MODEL', 'gpt-4.1-mini')
    ANTHROPIC_API_KEY = os.environ.get('ANTHROPIC_API_KEY')
    ELEVEN_LABS_API_KEY = os.environ.get('ELEVEN_LABS_API_KEY')
    
    # Other Configuration
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload
    
    # Session Configuration
    SESSION_TYPE = 'filesystem'
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours
    
    # Security Configuration
    REMEMBER_COOKIE_DURATION = 2592000  # 30 days
    
    # Application Constants
    APP_NAME = "PitchIQ"
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com')
    
    # Add any other configuration variables here 
"""
WSGI Entry Point for Elastic Beanstalk Deployment
"""
from app import create_app
from models import db

# Create application instance
application = create_app()

# Database initialization
def init_db():
    with application.app_context():
        db.create_all()

# Initialize database on startup
init_db()

if __name__ == "__main__":
    application.run()
"""
Database initialization script for Sales Training AI.

Run this script to create the initial database schema.
"""

import os
from flask import Flask
from app.extensions import db
from app.models import User
from werkzeug.security import generate_password_hash
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("DatabaseInit")

def init_db():
    """Initialize the database with required tables."""
    # Create a minimal Flask app for this script
    app = Flask(__name__)
    # Ensure this matches the database name in config.py
    app_db_uri = 'sqlite:///app.db' # Use the local app.db
    app.config['SQLALCHEMY_DATABASE_URI'] = app_db_uri
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize SQLAlchemy with this app
    db.init_app(app)
    
    # os.makedirs(r'C:\temp_db', exist_ok=True) # Removed this line
    
    with app.app_context():
        # Create an instance of the DatabaseManager and initialize the database
        # db_manager = DatabaseManager(app) # Not needed if directly using db.create_all()
        logger.info("Creating database tables in app.db...") # Updated log message
        # db.drop_all()  # Ensure this is commented out or removed
        db.create_all() # Ensure this is active
        logger.info("Database initialization completed successfully for app.db.") # Updated log message

if __name__ == "__main__":
    init_db()
"""
Setup New Database Script

This script initializes a fresh database for the Sales Training application
with the correct schema and initial user data for testing.
"""

import os
import json
import sys
from datetime import datetime
from dotenv import load_dotenv

# Explicitly load .env file right at the start
load_dotenv()

# Force debug mode off
os.environ['FLASK_DEBUG'] = '0'

# Create app context with the new database
from app import create_app
from app.extensions import db
from app.models import User, UserProfile, TrainingSession

# No longer needed - DB_PATH will come from config
# DB_PATH = 'instance/new_salestrainer.db' 

def setup_database():
    """Set up a fresh database with the correct schema and sample data."""
    # Create the app - it will load config from .env/config.py
    app = create_app()
    # Removed hardcoded config override:
    # config = {
    #     'SQLALCHEMY_DATABASE_URI': f'sqlite:///{DB_PATH}',
    #     'DEBUG': False,
    #     'TESTING': False,
    # }
    # app = create_app(config)
    
    with app.app_context():
        db_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
        print(f"\nSetting up fresh database at {db_uri}")
        
        # Check if DB exists (less reliable for Postgres, but okay for a basic check)
        # A better check would involve trying to connect
        # if os.path.exists(DB_PATH): 
        #     print("Dropping existing tables...")
        #     db.drop_all()
        
        # Let's just drop and recreate tables regardless for setup
        print("Dropping existing tables (if any)...")
        db.drop_all()
        
        print("Creating database tables...")
        db.create_all()
        
        # Create a test user if one doesn't exist
        if not User.query.filter_by(email="test@example.com").first():
            print("Creating test user...")
            test_user = User(
                email="test@example.com",
                name="Test User"
            )
            test_user.set_password("password")
            db.session.add(test_user)
            db.session.commit()
            print(f"Created test user (ID: {test_user.id})")
        
        # Create a sample user profile
        user = User.query.filter_by(email="test@example.com").first()
        if user and not UserProfile.query.filter_by(user_id=user.id).first():
            print("Creating sample user profile...")
            profile = UserProfile(
                user_id=user.id,
                experience_level="intermediate",
                product_service="Sales Training Software",
                target_market="B2B SaaS Companies",
                industry="Technology",
                pain_points=json.dumps(["Closing deals", "Handling objections"]),
                recent_wins=json.dumps(["Improved pitch conversion", "Larger deal size"]),
                mindset_challenges=json.dumps(["Confidence in pricing", "Fear of rejection"]),
                improvement_goals=json.dumps(["Better discovery calls", "Follow-up consistency"]),
                preferred_training_style="scenario-based",
                preferred_feedback_frequency="end-session",
                onboarding_complete=False
            )
            db.session.add(profile)
            db.session.commit()
            print(f"Created sample user profile for {user.email}")
        
        # Removed SQLite-specific PRAGMA check for PostgreSQL
        # from sqlalchemy import text
        # print("Verifying TrainingSession schema...")
        # schema = db.session.execute(text("PRAGMA table_info(training_session)"))
        # columns = [row[1] for row in schema.fetchall()]
        # 
        # if 'created_at' not in columns or 'updated_at' not in columns:
        #     print("Adding timestamp columns to TrainingSession...")
        #     if 'created_at' not in columns:
        #         db.session.execute(text("ALTER TABLE training_session ADD COLUMN created_at DATETIME"))
        #     if 'updated_at' not in columns:
        #         db.session.execute(text("ALTER TABLE training_session ADD COLUMN updated_at DATETIME"))
        #     db.session.commit()
        #     print("Added missing columns to TrainingSession")
        
        print("\nDatabase setup complete!")
        print(f"\nYou can now run the app with: python run_app.py")
        print(f"And access it at: http://localhost:5000")
        print(f"Login with: test@example.com / password\n")

if __name__ == "__main__":
    setup_database() 
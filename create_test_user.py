#!/usr/bin/env python3
"""
Create a test user for debugging authentication.
"""

import sys
import os

# Add the app directory to Python path
sys.path.insert(0, os.path.abspath('.'))

def create_test_user():
    """Create a test user in the database"""
    
    print("🔧 Creating Test User")
    print("=" * 50)
    
    try:
        from flask import Flask
        from app.extensions import db
        from app.models import User, UserProfile
        from config import config_by_name
        from werkzeug.security import generate_password_hash
        
        # Create a minimal Flask app for testing
        app = Flask(__name__)
        app.config.from_object(config_by_name['dev'])
        
        # Initialize database
        db.init_app(app)
        
        with app.app_context():
            # Check if test user already exists
            test_email = "test@test.com"
            existing_user = User.query.filter_by(email=test_email).first()
            
            if existing_user:
                print(f"⚠️ Found existing test user: {test_email}. Deleting and recreating...")
                # Also delete the associated profile to avoid integrity errors
                UserProfile.query.filter_by(user_id=existing_user.id).delete()
                db.session.delete(existing_user)
                db.session.commit()
                print("🗑️ Old user deleted.")

            # Create test user
            test_user = User(
                name="Test User",
                email=test_email,
                password_hash=generate_password_hash("test123")
            )
            
            db.session.add(test_user)
            db.session.commit()
            
            # Create user profile
            profile = UserProfile(
                user_id=test_user.id,
                onboarding_complete=False
            )
            
            db.session.add(profile)
            db.session.commit()
            
            print(f"✅ Test user created successfully!")
            print(f"Email: {test_email}")
            print(f"Password: test123")
            print(f"User ID: {test_user.id}")
            
            # Test the password immediately
            if test_user.check_password("test123"):
                print("✅ Password verification working!")
            else:
                print("❌ Password verification failed!")
            
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        import traceback
        print(traceback.format_exc())

if __name__ == "__main__":
    create_test_user() 
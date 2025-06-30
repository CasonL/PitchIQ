#!/usr/bin/env python3
"""
Test creating just a user without profile
"""
from app import create_app
from app.extensions import db
from app.models import User
from app.auth.security import validate_password
from datetime import datetime, timedelta
import secrets

def test_simple_user():
    app = create_app()
    
    with app.app_context():
        try:
            # Test data
            name = "Simple Test User"
            email = "simple@example.com"
            password = "TestPassword123"
            
            print(f"Testing simple user creation for {email}")
            
            # Delete existing user if any
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                print("Deleting existing user...")
                db.session.delete(existing_user)
                db.session.commit()
            
            # Create new user
            print("Creating new user...")
            new_user = User(name=name, email=email)
            new_user.set_password(password)
            
            # Generate email verification token
            new_user.email_verification_token = secrets.token_urlsafe(32)
            new_user.email_verification_token_expires = datetime.utcnow() + timedelta(hours=24)
            
            db.session.add(new_user)
            db.session.commit()
            print(f"User created successfully with ID: {new_user.id}")
            
            # Test accessing user properties
            print(f"User name: {new_user.name}")
            print(f"User email: {new_user.email}")
            print(f"User role: {new_user.role}")
            print(f"Email verified: {new_user.is_email_verified}")
            
        except Exception as e:
            print(f"User creation failed: {e}")
            import traceback
            print(traceback.format_exc())
            db.session.rollback()

if __name__ == "__main__":
    test_simple_user() 
#!/usr/bin/env python3
"""
Debug script to test registration endpoint directly
"""
from app import create_app
from app.extensions import db
from app.models import User, UserProfile
from app.auth.security import validate_password
import json
from datetime import datetime, timedelta
import secrets

def test_registration():
    app = create_app()
    
    with app.app_context():
        try:
            # Test data
            name = "Test User Debug"
            email = "debug@example.com"
            password = "TestPassword123"
            
            print(f"Testing registration for {email}")
            
            # Validate password
            is_valid, error_message = validate_password(password)
            print(f"Password validation: {is_valid}, {error_message}")
            
            # Check if email exists
            user_exists = User.query.filter_by(email=email).first()
            print(f"User exists: {user_exists is not None}")
            
            if user_exists:
                print("Deleting existing user for test...")
                db.session.delete(user_exists)
                if user_exists.profile:
                    db.session.delete(user_exists.profile)
                db.session.commit()
            
            # Create new user
            print("Creating new user...")
            new_user = User(name=name, email=email)
            new_user.set_password(password)
            
            # Generate email verification token
            new_user.email_verification_token = secrets.token_urlsafe(32)
            new_user.email_verification_token_expires = datetime.utcnow() + timedelta(hours=24)
            
            db.session.add(new_user)
            db.session.flush()  # Flush to get the new_user.id
            print(f"User created with ID: {new_user.id}")

            # Create user profile
            print("Creating user profile...")
            profile = UserProfile(
                user_id=new_user.id,
                experience_level='intermediate',
                product_type='Software',
                target_market='B2B',
                onboarding_complete=False,
                initial_setup_complete=False,
                onboarding_step='experience',
                total_roleplays=0,
                total_feedback_received=0,
                objection_handling_scores=json.dumps({
                    "price": 7.0, "competition": 6.5, "need": 7.5, "timing": 6.0
                })
            )
            db.session.add(profile)
            
            # Final commit
            print("Committing to database...")
            db.session.commit()
            print("Registration successful!")
            
            # Test email service import
            print("Testing email service import...")
            try:
                from app.services.email_service import send_verification_email
                print("Email service import successful")
            except Exception as e:
                print(f"Email service import failed: {e}")
            
        except Exception as e:
            print(f"Registration failed: {e}")
            import traceback
            print(traceback.format_exc())
            db.session.rollback()

if __name__ == "__main__":
    test_registration() 
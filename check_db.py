#!/usr/bin/env python3
"""
Check if EmailSignup table exists in database
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models import EmailSignup

def check_database():
    app = create_app('dev')
    
    with app.app_context():
        try:
            # Try to query the EmailSignup table
            count = EmailSignup.query.count()
            print(f"EmailSignup table exists with {count} records")
            
            # Try to create a test record
            test_signup = EmailSignup(
                email="test@example.com",
                early_access=True,
                get_updates=False,
                computer_fingerprint="test123"
            )
            
            # Check if email already exists
            existing = EmailSignup.query.filter_by(email="test@example.com").first()
            if existing:
                print("Test email already exists in database")
            else:
                db.session.add(test_signup)
                db.session.commit()
                print("Successfully added test record")
                
                # Clean up test record
                db.session.delete(test_signup)
                db.session.commit()
                print("Test record cleaned up")
                
        except Exception as e:
            print(f"Database error: {e}")
            print("EmailSignup table might not exist or there's a schema issue")

if __name__ == "__main__":
    check_database() 
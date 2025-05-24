"""
Reset and rebuild the database from scratch.
"""

import os
import sys
from app import create_app
from app.extensions import db
from app.models import User, UserProfile

def main():
    """Reset and rebuild the database."""
    print("Creating app...")
    app = create_app()
    
    with app.app_context():
        print("Dropping all tables...")
        db.drop_all()
        
        print("Creating all tables...")
        db.create_all()
        
        # Create test user if needed
        if not User.query.filter_by(email='test@example.com').first():
            print("Creating test user...")
            test_user = User(
                name='Test User',
                email='test@example.com',
                role='user'
            )
            test_user.set_password('password')
            db.session.add(test_user)
            db.session.commit()
            print(f"Created test user with ID: {test_user.id}")
        
        print("Database rebuild complete!")

if __name__ == '__main__':
    main() 
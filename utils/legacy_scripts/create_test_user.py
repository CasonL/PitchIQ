"""
Create a test user account for login testing.
"""
from app import create_app
from app.extensions import db
from app.models import User, UserProfile
import json

def create_test_user():
    """Create a test user in the database."""
    app = create_app()
    with app.app_context():
        # Check if test user already exists
        existing_user = User.query.filter_by(email="test@example.com").first()
        if existing_user:
            print(f"Test user already exists with ID: {existing_user.id}")
            
            # Reset password to known value
            existing_user.set_password("password")
            db.session.commit()
            print("Reset password to 'password'")
            return
            
        # Create new test user
        test_user = User(
            name="Test User",
            email="test@example.com",
            role="user"
        )
        test_user.set_password("password")
        db.session.add(test_user)
        db.session.commit()
        print(f"Created test user with ID: {test_user.id}")
        
        # Create user profile
        profile = UserProfile(
            user_id=test_user.id,
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
            onboarding_complete=True
        )
        db.session.add(profile)
        db.session.commit()
        print(f"Created user profile for test user")

if __name__ == "__main__":
    create_test_user() 
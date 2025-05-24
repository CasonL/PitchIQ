"""
Reset user profile script.
This script uses the Flask app context to properly reset the user profile.
"""

from app import create_app
from app.models import User, UserProfile
from flask import current_app
import json

def reset_user_profile():
    """Reset the user profile for demonstration purposes."""
    app = create_app()
    
    with app.app_context():
        from app.extensions import db
        
        # Use user ID 1 for demonstration
        user_id = 1
        
        # Find the user
        user = User.query.get(user_id)
        if not user:
            print(f"User with ID {user_id} not found.")
            return False
            
        print(f"Found user: {user.name} ({user.email})")
        
        # Check if user has a profile
        profile = UserProfile.query.filter_by(user_id=user_id).first()
        
        if profile:
            print(f"Found existing profile with ID {profile.id} for user {user_id}")
            print("Deleting existing profile...")
            db.session.delete(profile)
            db.session.commit()
            print("Deleted successfully")
        
        # Create a new profile with sample data
        new_profile = UserProfile(
            user_id=user_id,
            experience_level='expert',
            product_service='Sample product description',
            target_market='B2B',
            industry='Software',
            pain_points=json.dumps(["Slow sales cycle", "Price objections"]),
            recent_wins=json.dumps(["Closed major deal", "Improved pitch"]),
            mindset_challenges=json.dumps(["Rejection fear", "Confidence issues"]),
            improvement_goals=json.dumps(["Better follow-up", "Handling objections"]),
            preferred_training_style='structured',
            preferred_feedback_frequency='end-session',
            onboarding_complete=True
        )
        
        print("Creating new profile...")
        db.session.add(new_profile)
        db.session.commit()
        print(f"Successfully created new profile with ID {new_profile.id}")
        
        return True

if __name__ == "__main__":
    print("\n=== USER PROFILE RESET UTILITY ===\n")
    print("This script will reset the user profile for testing the onboarding flow.\n")
    
    if reset_user_profile():
        print("\nUser profile successfully reset!")
        print("You can now login to the application and proceed to the dashboard.")
    else:
        print("\nFailed to reset user profile. Please check the error messages.") 
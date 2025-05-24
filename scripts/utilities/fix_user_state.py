from app import create_app, db
from app.models import User, UserProfile, TrainingSession, Conversation
import json
from datetime import datetime, timedelta

app = create_app()
with app.app_context():
    print("===============================")
    print("FIXING USER STATE AND DASHBOARD")
    print("===============================")
    
    # 1. Get all users
    users = User.query.all()
    print(f"Found {len(users)} users in the database")
    
    for user in users:
        print(f"\nProcessing user ID: {user.id}, Email: {user.email}")
        
        # 2. Check if user has a profile
        profile = UserProfile.query.filter_by(user_id=user.id).first()
        if not profile:
            print(f"  User {user.id} has no profile, creating one...")
            profile = UserProfile(
                user_id=user.id,
                experience_level="intermediate",
                product_service="Software",
                target_market="B2B",
                industry="Technology",
                onboarding_complete=True  # This prevents the onboarding loop
            )
            db.session.add(profile)
            db.session.commit()
            print(f"  Created profile for user {user.id}")
        else:
            # Make sure onboarding is marked as complete
            if not profile.onboarding_complete:
                profile.onboarding_complete = True
                db.session.commit()
                print(f"  Fixed onboarding state for user {user.id}")
            else:
                print(f"  User {user.id} already has a profile with completed onboarding")
        
        # 3. Check for active conversations
        conversations = Conversation.query.filter_by(user_id=user.id).all()
        print(f"  User has {len(conversations)} conversations")
        
        # 4. Check for training sessions
        sessions = TrainingSession.query.filter_by(user_profile_id=profile.id).all()
        print(f"  User has {len(sessions)} training sessions")
        
        # 5. Create a dummy session if none exist to prevent dashboard errors
        if not sessions:
            print(f"  Creating dummy training session for user {user.id}")
            
            dummy_session = TrainingSession(
                user_profile_id=profile.id,
                start_time=datetime.utcnow() - timedelta(days=1),
                end_time=datetime.utcnow(),
                status="completed",
                trust_score=75,
                persuasion_rating=70,
                confidence_score=80,
                current_stage="completed",
                reached_stages=json.dumps(["rapport", "discovery", "presentation", "objection", "closing"]),
                conversation_history=json.dumps([
                    {"role": "system", "content": "This is a sample conversation."},
                    {"role": "user", "content": "Hello, I'm interested in your product."},
                    {"role": "assistant", "content": "Thanks for your interest! What specific needs do you have?"}
                ])
            )
            
            db.session.add(dummy_session)
            db.session.commit()
            print(f"  Created dummy session with ID {dummy_session.id} for user {user.id}")
    
    print("\n===============================")
    print("DATABASE CLEANUP COMPLETE")
    print("===============================")
    print("1. User profiles fixed/created")
    print("2. Dummy data added for dashboard")
    print("\nYou should now be able to log in with any user account and access the dashboard without errors.") 
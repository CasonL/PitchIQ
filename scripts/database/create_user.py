from app import create_app, db
from app.models import User, UserProfile
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    # Check if user already exists
    existing = User.query.filter_by(email="test@example.com").first()
    if existing:
        print(f"User already exists with ID: {existing.id}")
        # Reset password
        existing.password_hash = generate_password_hash("password123")
        db.session.commit()
        print("Password reset to 'password123'")
    else:
        # Create new user
        user = User(
            name="Test User",
            email="test@example.com",
            password_hash=generate_password_hash("password123")
        )
        db.session.add(user)
        db.session.commit()
        
        # Create profile
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
        
        print(f"Created user: {user.email} with ID: {user.id}") 
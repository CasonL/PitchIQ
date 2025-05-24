from app import create_app
from app.models import UserProfile, User
from app.extensions import db

app = create_app()

with app.app_context():
    # Find the first user and update their profile to free tier
    user = User.query.first()
    if user:
        result = UserProfile.query.filter(UserProfile.user_id == user.id).update({'subscription_tier': 'free'})
        db.session.commit()
        print(f"Updated {result} user(s) to free tier! User ID: {user.id}")
    else:
        print("No users found in the database") 
from app import create_app
from app.models import User, UserProfile, db

app = create_app()
with app.app_context():
    # Create admin user
    admin = User(
        name='Admin',
        email='admin@example.com',
        role='admin'
    )
    admin.set_password('Admin123!')
    db.session.add(admin)
    db.session.commit()
    
    # Create admin profile
    profile = UserProfile(
        user_id=admin.id,
        onboarding_complete=True
    )
    db.session.add(profile)
    db.session.commit()
    
    print(f'Created admin user ID: {admin.id} and profile ID: {profile.id}') 
"""
Database update script for PitchIQ

This script ensures that the database schema is correctly set up, 
including the session_metrics table which is needed for the dashboard to function properly.

If you encounter errors about missing tables, run this script to fix your database.

Added to fix: 'no such table: session_metrics' error in the dashboard
"""

from app import create_app
from app.models import db
from flask_migrate import Migrate

# Create an application context
app = create_app()
migrate = Migrate(app, db)

with app.app_context():
    print("Updating database schema...")
    # Create all tables that don't exist yet
    try:
        db.create_all()
        print("Database tables created successfully!")
    except Exception as e:
        print(f"Error creating database tables: {e}")
    
    # Verify the session_metrics table exists
    try:
        from sqlalchemy import text
        with db.engine.connect() as conn:
            conn.execute(text("SELECT 1 FROM session_metrics LIMIT 1"))
        print("session_metrics table confirmed to exist")
    except Exception as e:
        print(f"Note: Could not verify session_metrics table: {e}")
    
    print("Database schema update completed!") 
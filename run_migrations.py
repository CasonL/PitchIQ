"""
A simple, direct script to run Flask-Migrate database migrations.
This is the single source of truth for applying database schema changes.
"""

import os
from flask_migrate import upgrade
from app import create_app

# --- Main Execution ---
if __name__ == "__main__":
    print("--- Running Database Migrations ---")

    # 1. Create the Flask app instance using the app factory.
    #    This ensures that all application configurations, including the
    #    database URI and the instance path creation, are loaded correctly.
    #    It uses the 'FLASK_CONFIG' environment variable or defaults to 'dev'.
    #    My previous fixes ensure the instance/ folder is created here.
    app = create_app(os.getenv('FLASK_CONFIG') or 'dev')

    # 2. Use a 'with' statement to push an application context.
    #    Flask-Migrate requires an active application context to know which
    #    database to connect to. This is the critical step.
    with app.app_context():
        print("Application context created. Applying migrations...")
        
        # 3. Call the 'upgrade' command from Flask-Migrate.
        #    This command programmatically applies all pending migrations,
        #    bringing the database schema to the latest version ('head').
        upgrade()
        
        print("--- Database migrations complete. ---") 
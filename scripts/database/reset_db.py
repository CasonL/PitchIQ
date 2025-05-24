#!/usr/bin/env python
"""
Database reset script for PitchIQ application.
This script drops all tables and recreates them from the model definitions.
WARNING: This will delete all data in the database!
"""

import os
import sys
import shutil
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('db_reset')

# Default database path
DB_PATH = os.path.join('instance', 'salestrainer.db')

def backup_database(db_path):
    """Create a backup of the database before resetting."""
    if not os.path.exists(db_path):
        logger.warning(f"No database file found at {db_path}, nothing to backup")
        return
    
    # Create backup directory if it doesn't exist
    backup_dir = os.path.join('instance', 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    
    # Create timestamped backup filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = os.path.join(backup_dir, f'salestrainer_backup_{timestamp}.db')
    
    # Copy the database file
    try:
        shutil.copy2(db_path, backup_path)
        logger.info(f"Database backup created at {backup_path}")
        return backup_path
    except Exception as e:
        logger.error(f"Failed to create database backup: {str(e)}")
        return None

def reset_database():
    """Drop all tables and recreate them from the models."""
    try:
        # Get absolute path to the database file
        db_abs_path = os.path.abspath(DB_PATH)
        logger.info(f"Database path: {db_abs_path}")
        
        # First, back up the existing database if it exists
        if os.path.exists(db_abs_path):
            backup_path = backup_database(db_abs_path)
            if not backup_path:
                logger.error("Database backup failed. Aborting reset for safety.")
                return False
            
            # Remove the existing database file
            os.remove(db_abs_path)
            logger.info(f"Removed existing database file: {db_abs_path}")
        
        # Create app context to recreate the database
        from app import create_app, db
        
        app = create_app('development')
        with app.app_context():
            # Create all tables based on models
            db.create_all()
            logger.info("Successfully created all database tables")
            
            # Create default admin user if needed
            from app.models import User
            admin_exists = User.query.filter_by(email='admin@example.com').first()
            if not admin_exists:
                # Create user object without password first
                admin_user = User(
                    name='Admin User', 
                    email='admin@example.com',
                    role='admin'
                )
                # Now set the password using the dedicated method
                admin_user.set_password('adminpassword')
                
                # Add to session and commit
                db.session.add(admin_user)
                db.session.commit()
                logger.info("Created default admin user (admin@example.com / adminpassword)")
        
        logger.info("Database reset completed successfully!")
        return True
    
    except Exception as e:
        logger.error(f"Error resetting database: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("=== PitchIQ Database Reset Tool ===")
    print("WARNING: This will delete ALL data in your database!")
    print("A backup will be created in instance/backups/ before proceeding.")
    print()
    
    proceed = input("Do you want to RESET the entire database? (yes/no): ").strip().lower()
    
    if proceed == 'yes':
        print("Starting database reset...")
        success = reset_database()
        if success:
            print("\n✅ Database reset completed successfully.")
            print("You can now restart your application with a fresh database.")
            print("Default admin credentials: admin@example.com / adminpassword")
            print("\nStart with: python run_app.py")
        else:
            print("\n❌ Database reset failed. Check the logs for details.")
            sys.exit(1)
    else:
        print("Operation cancelled.") 
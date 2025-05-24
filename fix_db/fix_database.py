#!/usr/bin/env python
"""
Fix database script - rebuilds the database from scratch
"""

import os
import sys
import sqlite3
import inspect
from pprint import pprint

# Add the parent directory to path so we can import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import User, UserProfile, Conversation, Message

def rebuild_database():
    """Rebuild the database from scratch with all tables"""
    print("Starting database rebuild process...")
    
    # Database path
    db_path = 'app.db'
    
    # First, remove the database if it exists
    if os.path.exists(db_path):
        print(f"Removing existing database at {db_path}")
        try:
            os.remove(db_path)
        except Exception as e:
            print(f"Error removing database: {e}")
            return False
    
    # Create app context
    app = create_app('dev')
    
    with app.app_context():
        # Check UserProfile model definition
        print("\nChecking UserProfile model definition:")
        print(f"UserProfile.__tablename__ = {UserProfile.__tablename__}")
        
        profile_attrs = {}
        for attr_name in dir(UserProfile):
            if not attr_name.startswith('_') and not callable(getattr(UserProfile, attr_name)):
                try:
                    attr = getattr(UserProfile, attr_name)
                    if hasattr(attr, 'type'):
                        profile_attrs[attr_name] = f"{attr.type}"
                except Exception as e:
                    profile_attrs[attr_name] = f"Error accessing: {e}"
        
        print("\nUserProfile columns:")
        for name, attr_type in profile_attrs.items():
            print(f"  - {name}: {attr_type}")
        
        # Create all tables
        print("\nCreating all database tables...")
        db.create_all()
        
        # Verify that UserProfile has the subscription_tier column
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # List all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print("\nTables in the database:")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check user_profiles table
        print("\nChecking user_profiles table columns:")
        cursor.execute("PRAGMA table_info(user_profiles)")
        columns = cursor.fetchall()
        print("Columns in user_profiles table:")
        for col in columns:
            print(f"  - {col[1]} ({col[2]}) {'PRIMARY KEY' if col[5]==1 else ''}")
        
        column_names = [col[1] for col in columns]
        if 'subscription_tier' in column_names:
            print("\nSUCCESS: subscription_tier column exists in user_profiles table")
        else:
            print("\nERROR: subscription_tier column was not created")
            
            # Check if the subscription_tier attribute exists in the model
            model_attrs = [attr for attr in dir(UserProfile) if not attr.startswith('_')]
            if 'subscription_tier' in model_attrs:
                print("  - subscription_tier attribute exists in UserProfile model but wasn't created in the database")
                print("  - This may indicate a missing migration or SQLAlchemy configuration issue")
            else:
                print("  - subscription_tier attribute doesn't exist in UserProfile model")
            
            # Add subscription_tier directly with SQL
            print("\nAttempting to add subscription_tier column directly with SQL...")
            try:
                cursor.execute("ALTER TABLE user_profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free' NOT NULL")
                conn.commit()
                print("  - Column added successfully via direct SQL")
                
                # Verify the column was added
                cursor.execute("PRAGMA table_info(user_profiles)")
                columns = [col[1] for col in cursor.fetchall()]
                if 'subscription_tier' in columns:
                    print("  - Verified: subscription_tier column now exists")
                    return True
                else:
                    print("  - Failed: subscription_tier column still doesn't exist")
                    return False
            except Exception as e:
                print(f"  - Failed to add column via SQL: {e}")
                return False
        
        conn.close()
        print("\nDatabase rebuild completed successfully!")
        return True

if __name__ == "__main__":
    success = rebuild_database()
    sys.exit(0 if success else 1) 
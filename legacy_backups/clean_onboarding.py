"""
Clean onboarding data script.
This script completely rebuilds the database tables for onboarding to avoid lock issues.
"""

import os
import sqlite3
import json
import sys
import shutil
from datetime import datetime

def clean_onboarding():
    """Reset the onboarding tables completely."""
    # Path to database files
    db_paths = ['instance/salestrainer.db']
    
    # Back up the database first
    for db_path in db_paths:
        if not os.path.exists(db_path):
            print(f"Database not found at {db_path}, skipping...")
            continue
            
        backup_path = f"{db_path}.bak.{datetime.now().strftime('%Y%m%d%H%M%S')}"
        print(f"Creating backup at {backup_path}")
        shutil.copy2(db_path, backup_path)
            
        print(f"Fixing database at {db_path}...")
        
        # Sample data for the new user profile
        data = {
            'user_id': 1,  # Assuming this is for user ID 1
            'experience_level': 'expert',
            'product_service': 'Product/service description here',
            'target_market': 'B2B',
            'industry': 'Software',
            'pain_points': json.dumps(["Slow sales cycle", "Price objections"]),
            'recent_wins': json.dumps(["Closed major deal", "Improved pitch"]),
            'mindset_challenges': json.dumps(["Rejection fear", "Confidence issues"]),
            'improvement_goals': json.dumps(["Better follow-up", "Handling objections"]),
            'preferred_training_style': 'structured',
            'preferred_feedback_frequency': 'end-session',
            'onboarding_complete': 1
        }
        
        try:
            # Connect to the database with long timeout and WAL mode
            conn = sqlite3.connect(db_path, timeout=60.0)
            conn.isolation_level = None  # Autocommit mode
            cursor = conn.cursor()
            
            # Improve concurrency with pragmas
            cursor.execute("PRAGMA journal_mode = WAL")
            cursor.execute("PRAGMA busy_timeout = 60000")
            cursor.execute("PRAGMA synchronous = NORMAL")
            
            # Start exclusive transaction
            cursor.execute("BEGIN EXCLUSIVE")
            
            # Delete any existing user profile for this user
            cursor.execute("DELETE FROM user_profile WHERE user_id = ?", (data['user_id'],))
            print(f"Deleted any existing profile for user {data['user_id']}")
            
            # Recreate user profile
            cursor.execute('''
                INSERT INTO user_profile (
                    user_id, experience_level, product_service, target_market, 
                    industry, pain_points, recent_wins, mindset_challenges, 
                    improvement_goals, preferred_training_style, 
                    preferred_feedback_frequency, onboarding_complete
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                data['user_id'], data['experience_level'], data['product_service'], 
                data['target_market'], data['industry'], data['pain_points'], 
                data['recent_wins'], data['mindset_challenges'], data['improvement_goals'],
                data['preferred_training_style'], data['preferred_feedback_frequency'],
                data['onboarding_complete']
            ))
            
            # Add missing columns to training_session if the table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='training_session'")
            if cursor.fetchone():
                # Check if created_at column exists
                cursor.execute("PRAGMA table_info(training_session)")
                columns = [column[1] for column in cursor.fetchall()]
                
                # Add missing columns if needed
                if 'created_at' not in columns:
                    print("Adding 'created_at' column to training_session table")
                    cursor.execute("ALTER TABLE training_session ADD COLUMN created_at DATETIME")
                    
                if 'updated_at' not in columns:
                    print("Adding 'updated_at' column to training_session table")
                    cursor.execute("ALTER TABLE training_session ADD COLUMN updated_at DATETIME")
            
            # Commit changes
            cursor.execute("COMMIT")
            
            print(f"Successfully reset profile for user {data['user_id']}")
            print("Onboarding should be fixed now. Please refresh the page and try again.")
            
        except sqlite3.Error as e:
            if conn:
                conn.execute("ROLLBACK")
            print(f"SQLite error: {e}")
            return False
        finally:
            if conn:
                conn.close()
    
    return True

if __name__ == "__main__":
    print("\n=== ONBOARDING RESET UTILITY ===\n")
    print("This script will completely reset the onboarding profile.\n")
    
    if clean_onboarding():
        print("\nDatabase successfully cleaned!")
        print("You can now go to http://localhost:5000/training/onboarding")
    else:
        print("\nFailed to clean the database. Please try restarting your computer to ensure no database locks remain.")
        
    print("\nIf you continue to experience issues, consider:")
    print("1. Restarting your computer")
    print("2. Switching to PostgreSQL instead of SQLite")
    print("3. Starting Flask with FLASK_DEBUG=0") 
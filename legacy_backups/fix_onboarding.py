"""
Emergency fix for database lock issues during onboarding.
This script directly connects to SQLite to bypass Flask-SQLAlchemy locks.
"""

import sqlite3
import json
import os
import sys
from datetime import datetime

DB_PATH = 'instance/salestrainer.db'

def fix_onboarding():
    """Fix the user profile directly using SQLite instead of SQLAlchemy."""
    # Sample data for the profile
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
    
    if not os.path.exists(DB_PATH):
        print(f"Database file not found at {DB_PATH}")
        return False
    
    # Connect directly to SQLite
    conn = None
    try:
        conn = sqlite3.connect(DB_PATH, timeout=30.0)
        conn.isolation_level = None  # Autocommit mode
        cursor = conn.cursor()
        
        # First run PRAGMA settings to reduce lock issues
        cursor.execute("PRAGMA busy_timeout = 30000;")  # 30 second timeout
        cursor.execute("PRAGMA journal_mode = WAL;")    # Better concurrency
        
        # Begin transaction
        cursor.execute("BEGIN EXCLUSIVE;")
        
        # First, check if the user_profile table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_profile'")
        if not cursor.fetchone():
            # Create the user_profile table if it doesn't exist
            print("Creating user_profile table...")
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS user_profile (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL UNIQUE,
                    onboarding_complete BOOLEAN DEFAULT 0,
                    onboarding_step VARCHAR(50) DEFAULT 'product',
                    onboarding_step_new INTEGER DEFAULT 0,
                    product_service TEXT,
                    product_type VARCHAR(100),
                    target_market VARCHAR(50),
                    industry VARCHAR(100),
                    experience_level VARCHAR(50),
                    pain_points TEXT DEFAULT '[]',
                    recent_wins TEXT DEFAULT '[]',
                    mindset_challenges TEXT DEFAULT '[]',
                    improvement_goals TEXT DEFAULT '[]',
                    preferred_training_style VARCHAR(50) DEFAULT 'structured',
                    preferred_feedback_frequency VARCHAR(50) DEFAULT 'end-session',
                    total_roleplays INTEGER DEFAULT 0,
                    total_feedback_received INTEGER DEFAULT 0,
                    last_roleplay_date DATETIME,
                    skill_history TEXT DEFAULT '{}',
                    common_objections TEXT DEFAULT '[]',
                    objection_handling_scores TEXT DEFAULT '{}',
                    biases_used TEXT DEFAULT '[]',
                    biases_missed TEXT DEFAULT '[]',
                    emotional_intelligence_score FLOAT DEFAULT 0.0,
                    empathy_score FLOAT,
                    active_listening_score FLOAT,
                    FOREIGN KEY (user_id) REFERENCES user(id)
                )
            ''')
        
        # Check if profile exists
        cursor.execute("SELECT id FROM user_profile WHERE user_id = ?", (data['user_id'],))
        profile_id = cursor.fetchone()
        
        if profile_id:
            print(f"Found existing profile with ID {profile_id[0]}")
            # Delete existing profile to avoid conflicts
            cursor.execute("DELETE FROM user_profile WHERE user_id = ?", (data['user_id'],))
            print(f"Deleted existing profile for user {data['user_id']}")
        
        # Insert new profile
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
        
        # Commit transaction
        cursor.execute("COMMIT;")
        
        print(f"Successfully created new profile for user {data['user_id']}")
        print("Onboarding should be fixed now. Please refresh the page and try again.")
        return True
        
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        if conn:
            conn.execute("ROLLBACK;")
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    print("\n=== ONBOARDING DATABASE FIX UTILITY ===\n")
    print("This script will fix database lock issues with onboarding.\n")
    
    success = fix_onboarding()
    
    if success:
        print("\nProfile successfully fixed!")
        print("You can now try the onboarding process again.")
    else:
        print("\nFailed to fix profile. Please try again.")
        
    print("\nIf you continue to experience issues, consider:")
    print("1. Stopping all running servers")
    print("2. Restarting your computer")
    print("3. Using a different database like PostgreSQL instead of SQLite") 
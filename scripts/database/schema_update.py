"""
Schema update script to add missing columns to the training_sessions table
and the insufficient_data flag to the feedback_analysis table
"""

import os
import sys
import sqlite3
from pathlib import Path

print("Updating database schema...")

# Use absolute path for the database file
base_dir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(base_dir, 'instance', 'salestrainer.db')

if not os.path.exists(db_path):
    print(f"Error: Database file does not exist at {db_path}")
    sys.exit(1)

print(f"Database path: {db_path}")

try:
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if the training_sessions table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='training_sessions'")
    if not cursor.fetchone():
        print("Error: training_sessions table does not exist")
        conn.close()
        sys.exit(1)
    
    # Get current columns in the table
    cursor.execute("PRAGMA table_info(training_sessions)")
    columns = [row[1] for row in cursor.fetchall()]
    
    # Add missing columns if they don't exist
    columns_to_add = {
        "user_profile_id": "INTEGER REFERENCES user_profiles(id)",
        "status": "VARCHAR(20) DEFAULT 'active'",
        "start_time": "DATETIME DEFAULT CURRENT_TIMESTAMP",
        "end_time": "DATETIME",
        "buyer_persona_id": "INTEGER REFERENCES buyer_personas(id)",
        "current_stage": "VARCHAR(50) DEFAULT 'intro'",
        "reached_stages": "TEXT DEFAULT '[]'",
        "trust_score": "FLOAT DEFAULT 70.0",
        "persuasion_rating": "FLOAT DEFAULT 65.0",
        "confidence_score": "FLOAT DEFAULT 75.0"
    }
    
    for col_name, col_type in columns_to_add.items():
        if col_name not in columns:
            print(f"Adding column {col_name} to training_sessions table...")
            cursor.execute(f"ALTER TABLE training_sessions ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")
    
    # Update user_profile_id to match user_id for existing records
    if "user_id" in columns and "user_profile_id" in columns_to_add:
        print("Updating user_profile_id to match user_id for existing records...")
        cursor.execute("UPDATE training_sessions SET user_profile_id = user_id WHERE user_profile_id IS NULL")
    
    # Update buyer_persona_id to match persona_id for existing records
    if "persona_id" in columns and "buyer_persona_id" in columns_to_add:
        print("Updating buyer_persona_id to match persona_id for existing records...")
        cursor.execute("UPDATE training_sessions SET buyer_persona_id = persona_id WHERE buyer_persona_id IS NULL")
    
    # Add 'insufficient_data' column to the feedback_analysis table if it doesn't exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='feedback_analysis'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(feedback_analysis)")
        feedback_columns = [row[1] for row in cursor.fetchall()]
        
        if "insufficient_data" not in feedback_columns:
            print("Adding 'insufficient_data' column to feedback_analysis table...")
            cursor.execute("ALTER TABLE feedback_analysis ADD COLUMN insufficient_data BOOLEAN DEFAULT FALSE")
            print("Added 'insufficient_data' column to feedback_analysis table")
    else:
        print("Warning: feedback_analysis table does not exist, skipping 'insufficient_data' column addition")
    
    # Add 'role' column to the buyer_personas table if it doesn't exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='buyer_personas'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(buyer_personas)")
        persona_columns = [row[1] for row in cursor.fetchall()]
        
        if "role" not in persona_columns:
            print("Adding 'role' column to buyer_personas table...")
            cursor.execute("ALTER TABLE buyer_personas ADD COLUMN role VARCHAR(100)")
            print("Added 'role' column to buyer_personas table")
    else:
        print("Warning: buyer_personas table does not exist, skipping 'role' column addition")
    
    # Commit the changes
    conn.commit()
    print("Schema update completed successfully!")
    
except sqlite3.Error as e:
    print(f"SQLite error: {e}")
    sys.exit(1)
finally:
    if conn:
        conn.close() 
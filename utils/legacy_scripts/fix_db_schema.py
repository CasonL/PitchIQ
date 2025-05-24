"""
Fix database schema issues for SQLite.
This script adds any missing columns to resolve 'no such column' errors.
"""

import os
import sqlite3

def fix_db_schema():
    """Add missing columns to database tables."""
    # Path to database files
    db_paths = [
        'instance/salestrainer.db',
        'instance/new_salestrainer.db',
        'instance/sales_training.db'
    ]
    
    for db_path in db_paths:
        if not os.path.exists(db_path):
            print(f"Database not found at {db_path}, skipping...")
            continue
            
        print(f"Checking database at {db_path}...")
        
        try:
            # Connect to the database
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # First check if training_session table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='training_session'")
            if not cursor.fetchone():
                print(f"Table 'training_session' not found in {db_path}")
                continue
                
            # Check if created_at column exists
            cursor.execute("PRAGMA table_info(training_session)")
            columns = [column[1] for column in cursor.fetchall()]
            
            # Add missing columns if needed
            if 'created_at' not in columns:
                print(f"Adding 'created_at' column to training_session table in {db_path}")
                cursor.execute("ALTER TABLE training_session ADD COLUMN created_at DATETIME")
                
            if 'updated_at' not in columns:
                print(f"Adding 'updated_at' column to training_session table in {db_path}")
                cursor.execute("ALTER TABLE training_session ADD COLUMN updated_at DATETIME")
                
            # Commit changes
            conn.commit()
            print(f"Database schema fixed for {db_path}")
            
        except sqlite3.Error as e:
            print(f"SQLite error in {db_path}: {e}")
        finally:
            if conn:
                conn.close()
    
    print("Schema fix process completed.")

if __name__ == "__main__":
    print("\n=== DATABASE SCHEMA FIX UTILITY ===\n")
    fix_db_schema() 
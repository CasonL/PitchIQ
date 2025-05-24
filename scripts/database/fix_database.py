#!/usr/bin/env python
"""
Database schema fix script for PitchIQ application.
This script adds missing columns to the database tables.
"""

import os
import sys
import sqlite3
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('db_schema_fix')

# Database path - default to the instance folder
DB_PATH = os.path.join('instance', 'salestrainer.db')

def check_and_add_column(cursor, table_name, column_name, column_type):
    """
    Check if a column exists in a table and add it if it doesn't.
    
    Args:
        cursor: SQLite cursor
        table_name: Name of the table to check
        column_name: Name of the column to add if missing
        column_type: SQLite column type definition
    """
    # Check if table exists
    cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
    if not cursor.fetchone():
        logger.warning(f"{table_name} table doesn't exist yet, skipping column check")
        return False
    
    # Check if column exists
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in cursor.fetchall()]
    
    if column_name not in columns:
        logger.warning(f"{column_name} column missing from {table_name} table, adding it now")
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
        logger.info(f"Successfully added {column_name} column to {table_name} table")
        return True
    else:
        logger.info(f"{column_name} column already exists in {table_name} table")
        return False

def fix_database_schema():
    """
    Add missing columns to database tables if they don't exist.
    """
    logger.info("Checking database schema for missing columns...")
    
    if not os.path.exists(DB_PATH):
        logger.error(f"Database file not found at {DB_PATH}")
        logger.error("Please run this script from the root directory of the PitchIQ application.")
        return False
    
    logger.info(f"Using database path: {DB_PATH}")
    
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Track if any columns were added
        columns_added = False
        
        # Check for user_profiles table and relevant columns
        if check_and_add_column(cursor, 'user_profiles', 'subscription_tier', 'TEXT DEFAULT "free" NOT NULL'):
            columns_added = True
        if check_and_add_column(cursor, 'user_profiles', 'initial_setup_complete', 'BOOLEAN DEFAULT 0 NOT NULL'):
            columns_added = True
        
        # Check for conversation table and missing columns
        # Basic columns
        if check_and_add_column(cursor, 'conversation', 'is_archived', 'BOOLEAN DEFAULT 0'):
            columns_added = True
            
        if check_and_add_column(cursor, 'conversation', 'archived', 'BOOLEAN DEFAULT 0'):
            columns_added = True
            
        if check_and_add_column(cursor, 'conversation', 'persona_id', 'INTEGER'):
            columns_added = True
            
        # Additional columns from error logs
        if check_and_add_column(cursor, 'conversation', 'is_onboarding', 'BOOLEAN DEFAULT 0'):
            columns_added = True
            
        if check_and_add_column(cursor, 'conversation', 'session_setup_step', 'TEXT'):
            columns_added = True
            
        if check_and_add_column(cursor, 'conversation', 'product_service', 'TEXT'):
            columns_added = True
            
        if check_and_add_column(cursor, 'conversation', 'target_market', 'TEXT'):
            columns_added = True
            
        if check_and_add_column(cursor, 'conversation', 'sales_experience', 'TEXT'):
            columns_added = True
            
        if check_and_add_column(cursor, 'conversation', 'meta_data', 'TEXT'):
            columns_added = True
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        if columns_added:
            logger.info("Database schema fix completed successfully! Added missing columns.")
        else:
            logger.info("Database schema is already up to date. No changes needed.")
            
        return True
        
    except Exception as e:
        logger.error(f"Error fixing database schema: {str(e)}")
        # If connection is open, close it
        try:
            if conn:
                conn.close()
        except:
            pass
        return False

if __name__ == "__main__":
    print("=== PitchIQ Database Schema Fix Tool ===")
    print("This script will add missing columns to your database tables.")
    print("Make sure the application is not running before proceeding.")
    print()
    
    proceed = input("Do you want to continue? (y/n): ").strip().lower()
    
    if proceed == 'y':
        success = fix_database_schema()
        if success:
            print("\n✅ Database schema update completed.")
            print("You can now restart your application.")
            print("Start with: python run_app.py")
            print("Note: If you still see port binding errors, try using a different port:")
            print("      python run_app.py --port 5002")
        else:
            print("\n❌ Database schema update failed. Check the logs for details.")
            sys.exit(1)
    else:
        print("Operation cancelled.") 
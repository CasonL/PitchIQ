#!/usr/bin/env python
"""
Database check script for PitchIQ application.
This script checks the structure of tables and displays schema information.
"""

import os
import sys
import sqlite3
import logging
from tabulate import tabulate

# Setup logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('db_check')

# Database path
DB_PATH = os.path.join('instance', 'salestrainer.db')

def check_table_schema(table_name):
    """Check the schema of a specific table."""
    try:
        if not os.path.exists(DB_PATH):
            logger.error(f"Database file not found at {DB_PATH}")
            return False
        
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'")
        if not cursor.fetchone():
            logger.warning(f"Table '{table_name}' does not exist in the database.")
            conn.close()
            return False
        
        # Get table columns
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = cursor.fetchall()
        
        # Display columns in a table format
        headers = ["ID", "Name", "Type", "NotNull", "Default", "PK"]
        table_data = [[col[0], col[1], col[2], col[3], col[4], col[5]] for col in columns]
        print(f"\n=== Schema for table '{table_name}' ===")
        print(tabulate(table_data, headers=headers, tablefmt="pretty"))
        
        # Get foreign keys
        cursor.execute(f"PRAGMA foreign_key_list({table_name})")
        foreign_keys = cursor.fetchall()
        
        if foreign_keys:
            fk_headers = ["ID", "Seq", "Table", "From", "To", "On Update", "On Delete", "Match"]
            fk_data = [[fk[0], fk[1], fk[2], fk[3], fk[4], fk[5], fk[6], fk[7]] for fk in foreign_keys]
            print(f"\n=== Foreign keys for table '{table_name}' ===")
            print(tabulate(fk_data, headers=fk_headers, tablefmt="pretty"))
        
        # Get indexes
        cursor.execute(f"PRAGMA index_list({table_name})")
        indexes = cursor.fetchall()
        
        if indexes:
            idx_headers = ["Seq", "Name", "Unique"]
            idx_data = [[idx[0], idx[1], idx[2]] for idx in indexes]
            print(f"\n=== Indexes for table '{table_name}' ===")
            print(tabulate(idx_data, headers=idx_headers, tablefmt="pretty"))
        
        conn.close()
        return True
    
    except Exception as e:
        logger.error(f"Error checking schema for table '{table_name}': {str(e)}")
        return False

def list_all_tables():
    """List all tables in the database."""
    try:
        if not os.path.exists(DB_PATH):
            logger.error(f"Database file not found at {DB_PATH}")
            return []
        
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        return tables
    
    except Exception as e:
        logger.error(f"Error listing tables: {str(e)}")
        return []

def check_model_table_consistency():
    """Check consistency between model definitions and database tables."""
    try:
        # Import models to check against database
        from app import create_app, db
        from app.models import Conversation, UserProfile, User, Message, TrainingSession
        
        app = create_app('development')
        with app.app_context():
            # Get expected columns from the model
            conversation_expected_columns = [column.name for column in Conversation.__table__.columns]
            userprofile_expected_columns = [column.name for column in UserProfile.__table__.columns]
            
            # Connect to the database
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            
            # Check Conversation table
            cursor.execute("PRAGMA table_info(conversation)")
            conversation_actual_columns = [col[1] for col in cursor.fetchall()]
            
            # Check UserProfile table
            cursor.execute("PRAGMA table_info(user_profiles)")
            userprofile_actual_columns = [col[1] for col in cursor.fetchall()]
            
            # Calculate missing columns
            conversation_missing = set(conversation_expected_columns) - set(conversation_actual_columns)
            userprofile_missing = set(userprofile_expected_columns) - set(userprofile_actual_columns)
            
            # Calculate extra columns in database that aren't in model
            conversation_extra = set(conversation_actual_columns) - set(conversation_expected_columns)
            userprofile_extra = set(userprofile_actual_columns) - set(userprofile_expected_columns)
            
            print("\n=== Model vs Database Consistency Check ===")
            
            print("\nConversation model consistency:")
            if not conversation_missing and not conversation_extra:
                print("✅ Conversation table is consistent with model definition")
            else:
                if conversation_missing:
                    print(f"❌ Missing columns in database: {', '.join(conversation_missing)}")
                if conversation_extra:
                    print(f"⚠️ Extra columns in database: {', '.join(conversation_extra)}")
            
            print("\nUserProfile model consistency:")
            if not userprofile_missing and not userprofile_extra:
                print("✅ UserProfile table is consistent with model definition")
            else:
                if userprofile_missing:
                    print(f"❌ Missing columns in database: {', '.join(userprofile_missing)}")
                if userprofile_extra:
                    print(f"⚠️ Extra columns in database: {', '.join(userprofile_extra)}")
            
            conn.close()
            
            if conversation_missing or userprofile_missing:
                print("\n⚠️ Database schema is out of sync with models! Consider using reset_db.py to reset the database.")
                return False
            else:
                print("\n✅ No missing columns detected.")
                return True
    
    except Exception as e:
        logger.error(f"Error checking model consistency: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("=== PitchIQ Database Structure Check ===")
    
    print(f"\nChecking database: {os.path.abspath(DB_PATH)}")
    
    try:
        tables = list_all_tables()
        
        if not tables:
            print("No tables found in the database.")
            sys.exit(1)
        
        print(f"\nFound {len(tables)} tables:")
        for idx, table in enumerate(tables, 1):
            print(f"{idx}. {table}")
        
        print("\nChecking model consistency with database schema...")
        check_model_table_consistency()
        
        while True:
            print("\nOptions:")
            print("1. Check a specific table schema")
            print("2. Check model consistency again")
            print("3. Exit")
            
            choice = input("\nEnter your choice (1-3): ").strip()
            
            if choice == '1':
                table_name = input("Enter table name: ").strip()
                check_table_schema(table_name)
            elif choice == '2':
                check_model_table_consistency()
            elif choice == '3':
                break
            else:
                print("Invalid choice.")
        
        print("\nFinished checking database.")
    
    except Exception as e:
        logger.error(f"Error in main execution: {str(e)}")
        sys.exit(1) 
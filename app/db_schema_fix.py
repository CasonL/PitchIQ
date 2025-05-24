"""
Database schema fix for adding missing columns.
"""

import sqlite3
import logging

logger = logging.getLogger(__name__)

def fix_database_schema(app_instance):
    """
    Add missing columns to database tables if they don't exist.
    This is a temporary fix until proper migrations can be implemented.
    """
    logger.info("Checking database schema for missing columns...")
    
    # Database path - get from app config or use default
    db_path = app_instance.config.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///app.db')
    
    # Extract the file path from the URI if it's SQLite
    if db_path.startswith('sqlite:///'):
        db_path = db_path[10:]  # Remove 'sqlite:///'
    
    logger.info(f"Using database path: {db_path}")
    
    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check for user_profiles table and subscription_tier column
        check_and_add_column(cursor, 'user_profiles', 'subscription_tier', 'TEXT DEFAULT "free" NOT NULL')
        
        # Check for conversation table and missing columns
        # Basic columns
        check_and_add_column(cursor, 'conversation', 'is_archived', 'BOOLEAN DEFAULT 0')
        check_and_add_column(cursor, 'conversation', 'archived', 'BOOLEAN DEFAULT 0')
        check_and_add_column(cursor, 'conversation', 'persona_id', 'INTEGER')
        
        # Additional columns from error logs
        check_and_add_column(cursor, 'conversation', 'is_onboarding', 'BOOLEAN DEFAULT 0')
        check_and_add_column(cursor, 'conversation', 'session_setup_step', 'TEXT DEFAULT "confirm_context"')
        check_and_add_column(cursor, 'conversation', 'product_service', 'TEXT')
        check_and_add_column(cursor, 'conversation', 'target_market', 'TEXT')
        check_and_add_column(cursor, 'conversation', 'sales_experience', 'TEXT')
        check_and_add_column(cursor, 'conversation', 'meta_data', 'TEXT')
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
    except Exception as e:
        logger.error(f"Error fixing database schema: {str(e)}")
        # If connection is open, close it
        try:
            if conn:
                conn.close()
        except:
            pass

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
        return
    
    # Check if column exists
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [col[1] for col in cursor.fetchall()]
    
    if column_name not in columns:
        logger.warning(f"{column_name} column missing from {table_name} table, adding it now")
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
        logger.info(f"Successfully added {column_name} column to {table_name} table")
    else:
        logger.info(f"{column_name} column already exists in {table_name} table") 
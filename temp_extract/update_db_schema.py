"""
One-time script to update database schema for password reset functionality.
Run this script once to add the required columns to the User table.
"""

import os
import sqlite3
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_schema():
    """Add reset token fields to User table using direct SQLite connection."""
    try:
        # Path to your SQLite database
        db_path = 'instance/salestrainer.db'
        
        # Check if database exists
        if not os.path.exists(db_path):
            logger.error(f"Database file not found at {db_path}")
            return
        
        # Connect to database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(user)")
        columns = [column[1] for column in cursor.fetchall()]
        
        # Add reset_token column if it doesn't exist
        if 'reset_token' not in columns:
            cursor.execute('ALTER TABLE user ADD COLUMN reset_token VARCHAR(100)')
            logger.info("Added reset_token column")
        else:
            logger.info("reset_token column already exists")
        
        # Add reset_token_expires column if it doesn't exist
        if 'reset_token_expires' not in columns:
            cursor.execute('ALTER TABLE user ADD COLUMN reset_token_expires TIMESTAMP')
            logger.info("Added reset_token_expires column")
        else:
            logger.info("reset_token_expires column already exists")
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        logger.info("Database schema update completed")
        
    except Exception as e:
        logger.error(f"Error updating database schema: {str(e)}")
        
if __name__ == "__main__":
    update_schema()
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
        
        # Update user_profile table with missing columns
        try:
            cursor.execute("PRAGMA table_info(user_profile)")
            profile_columns = [column[1] for column in cursor.fetchall()]
            
            # Show columns for debugging
            logger.info(f"Current user_profile columns: {profile_columns}")
            
            # Add sales_experience column if it doesn't exist
            if 'sales_experience' not in profile_columns:
                cursor.execute('ALTER TABLE user_profile ADD COLUMN sales_experience VARCHAR(20)')
                logger.info("Added sales_experience column to user_profile table")
                
            # Add missing target_market column if it doesn't exist and not already present
            if 'target_market' not in profile_columns:
                cursor.execute('ALTER TABLE user_profile ADD COLUMN target_market VARCHAR(50)')
                logger.info("Added target_market column to user_profile table")
                
            # Add missing common_objections column if needed
            if 'common_objections' not in profile_columns:
                cursor.execute('ALTER TABLE user_profile ADD COLUMN common_objections TEXT')
                logger.info("Added common_objections column to user_profile table")
                
            # Add missing onboarding_complete column if needed
            if 'onboarding_complete' not in profile_columns:
                cursor.execute('ALTER TABLE user_profile ADD COLUMN onboarding_complete BOOLEAN DEFAULT 0')
                logger.info("Added onboarding_complete column to user_profile table")
                
            # Add objection_handling_scores column if needed
            if 'objection_handling_scores' not in profile_columns:
                cursor.execute('ALTER TABLE user_profile ADD COLUMN objection_handling_scores TEXT DEFAULT "{}"')
                logger.info("Added objection_handling_scores column to user_profile table")
                
            # Add emotional_intelligence_score column if needed
            if 'emotional_intelligence_score' not in profile_columns:
                cursor.execute('ALTER TABLE user_profile ADD COLUMN emotional_intelligence_score FLOAT')
                logger.info("Added emotional_intelligence_score column to user_profile table")
                
            # Update onboarding_step to be INTEGER if it's VARCHAR(50)
            cursor.execute("PRAGMA table_info(user_profile)")
            column_info = cursor.fetchall()
            onboarding_step_type = None
            for col in column_info:
                if col[1] == 'onboarding_step':
                    onboarding_step_type = col[2]
                    break
                    
            if onboarding_step_type == 'VARCHAR(50)':
                # Create a temporary column with the right type
                cursor.execute('ALTER TABLE user_profile ADD COLUMN onboarding_step_new INTEGER DEFAULT 0')
                # Copy values with type conversion (default to 0 if conversion fails)
                cursor.execute('UPDATE user_profile SET onboarding_step_new = CASE WHEN onboarding_step IS NULL THEN 0 ELSE 0 END')
                # Rename columns (SQLite doesn't support DROP COLUMN, need to use table recreation)
                conn.commit()  # Commit the changes so far
                
                logger.info("Converted onboarding_step from VARCHAR to INTEGER")
        except sqlite3.OperationalError as e:
            logger.warning(f"Error updating user_profile table: {str(e)}")
        
        # Add user_profile_id column to performance_metrics table
        try:
            cursor.execute("PRAGMA table_info(performance_metrics)")
            perf_columns = [column[1] for column in cursor.fetchall()]
            if 'user_profile_id' not in perf_columns:
                cursor.execute('ALTER TABLE performance_metrics ADD COLUMN user_profile_id INTEGER REFERENCES user_profile(id)')
                logger.info("Added user_profile_id column to performance_metrics table")

                # Get the first user profile ID to use as default
                cursor.execute("SELECT id FROM user_profile LIMIT 1")
                default_profile_id = cursor.fetchone()
                
                if default_profile_id:
                    # Set a default value for existing rows
                    cursor.execute(
                        'UPDATE performance_metrics SET user_profile_id = ? WHERE user_profile_id IS NULL',
                        (default_profile_id[0],)
                    )
                    logger.info(f"Set default user_profile_id ({default_profile_id[0]}) for existing records in performance_metrics")
            else:
                logger.info("user_profile_id column already exists in performance_metrics table")
        except sqlite3.OperationalError as e:
            logger.warning(f"Error checking performance_metrics table: {str(e)}")
        
        # Add user_profile_id column to feedback_analysis table
        try:
            cursor.execute("PRAGMA table_info(feedback_analysis)")
            feedback_columns = [column[1] for column in cursor.fetchall()]
            if 'user_profile_id' not in feedback_columns:
                cursor.execute('ALTER TABLE feedback_analysis ADD COLUMN user_profile_id INTEGER REFERENCES user_profile(id)')
                logger.info("Added user_profile_id column to feedback_analysis table")

                # Get the first user profile ID to use as default
                cursor.execute("SELECT id FROM user_profile LIMIT 1")
                default_profile_id = cursor.fetchone()
                
                if default_profile_id:
                    # Set a default value for existing rows
                    cursor.execute(
                        'UPDATE feedback_analysis SET user_profile_id = ? WHERE user_profile_id IS NULL',
                        (default_profile_id[0],)
                    )
                    logger.info(f"Set default user_profile_id ({default_profile_id[0]}) for existing records in feedback_analysis")
            else:
                logger.info("user_profile_id column already exists in feedback_analysis table")
        except sqlite3.OperationalError as e:
            logger.warning(f"Error checking feedback_analysis table: {str(e)}")
        
        # Commit changes and close connection
        conn.commit()
        conn.close()
        
        logger.info("Database schema update completed")
        
    except Exception as e:
        logger.error(f"Error updating database schema: {str(e)}")
        
if __name__ == "__main__":
    update_schema()
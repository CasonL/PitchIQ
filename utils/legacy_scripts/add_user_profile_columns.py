import sqlite3
import os

# Path to the SQLite database file
db_path = os.path.join('instance', 'sales_training.db.bak')

def add_missing_columns():
    """Add the missing columns to the user_profile table."""
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return
        
    print(f"Using database file: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if user_profile table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_profile'")
    if not cursor.fetchone():
        print("Table 'user_profile' not found in the database")
        conn.close()
        return
    
    # Check columns in user_profile
    cursor.execute("PRAGMA table_info(user_profile)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"Columns in user_profile: {columns}")
    
    # Add the missing columns if they don't exist
    if 'onboarding_step' not in columns:
        print("Adding 'onboarding_step' column to user_profile table...")
        cursor.execute("ALTER TABLE user_profile ADD COLUMN onboarding_step VARCHAR(50) DEFAULT 'welcome'")
    else:
        print("Column 'onboarding_step' already exists.")
    
    if 'onboarding_step_new' not in columns:
        print("Adding 'onboarding_step_new' column to user_profile table...")
        cursor.execute("ALTER TABLE user_profile ADD COLUMN onboarding_step_new VARCHAR(50) DEFAULT 'welcome'")
    else:
        print("Column 'onboarding_step_new' already exists.")
    
    # Add additional user profile fields if they don't exist
    additional_fields = [
        ('product_service', 'TEXT', 'NULL'),
        ('product_type', 'TEXT', 'NULL'),
        ('target_market', 'TEXT', 'NULL'),
        ('industry', 'TEXT', 'NULL'),
        ('experience_level', 'TEXT', 'NULL'),
        ('pain_points', 'TEXT', 'NULL'),
        ('recent_wins', 'TEXT', 'NULL'),
        ('mindset_challenges', 'TEXT', 'NULL'),
        ('improvement_goals', 'TEXT', 'NULL'),
        ('preferred_training_style', 'TEXT', 'NULL'),
        ('preferred_feedback_frequency', 'TEXT', 'NULL'),
        ('total_roleplays', 'INTEGER', '0'),
        ('total_feedback_received', 'INTEGER', '0'),
        ('last_roleplay_date', 'DATETIME', 'NULL'),
        ('skill_history', 'TEXT', '[]'),
        ('common_objections', 'TEXT', '[]'),
        ('objection_handling_scores', 'TEXT', '[]'),
        ('biases_used', 'TEXT', '[]'),
        ('biases_missed', 'TEXT', '[]'),
        ('emotional_intelligence_score', 'FLOAT', '0.0'),
        ('empathy_score', 'FLOAT', '0.0'),
        ('active_listening_score', 'FLOAT', '0.0')
    ]
    
    for field_name, field_type, default_value in additional_fields:
        if field_name not in columns:
            print(f"Adding '{field_name}' column to user_profile table...")
            cursor.execute(f"ALTER TABLE user_profile ADD COLUMN {field_name} {field_type} DEFAULT {default_value}")
        else:
            print(f"Column '{field_name}' already exists.")
    
    # Commit the changes and close the connection
    conn.commit()
    conn.close()
    
    print("Database update complete!")

if __name__ == "__main__":
    add_missing_columns() 
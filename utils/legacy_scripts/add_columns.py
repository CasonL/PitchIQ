import sqlite3
import os

# Path to the SQLite database file
db_path = os.path.join('instance', 'sales_training.db.bak')

def add_missing_columns():
    """Add the missing columns to the training_session table."""
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return
        
    print(f"Using database file: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # List all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    print(f"Tables in database: {tables}")
    
    if 'training_session' not in tables:
        print("Table 'training_session' not found in the database")
        conn.close()
        return
    
    # Check if reached_stages column already exists
    cursor.execute("PRAGMA table_info(training_session)")
    columns = [col[1] for col in cursor.fetchall()]
    print(f"Columns in training_session: {columns}")
    
    # Add the missing columns if they don't exist
    if 'reached_stages' not in columns:
        print("Adding 'reached_stages' column to training_session table...")
        cursor.execute("ALTER TABLE training_session ADD COLUMN reached_stages TEXT DEFAULT '[]'")
    else:
        print("Column 'reached_stages' already exists.")
    
    if 'current_stage' not in columns:
        print("Adding 'current_stage' column to training_session table...")
        cursor.execute("ALTER TABLE training_session ADD COLUMN current_stage VARCHAR(50) DEFAULT 'rapport'")
    else:
        print("Column 'current_stage' already exists.")
    
    # Check if sales_stage table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sales_stage'")
    if not cursor.fetchone():
        print("Creating sales_stage table...")
        cursor.execute('''
        CREATE TABLE sales_stage (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            user_profile_id INTEGER, 
            name VARCHAR(50) NOT NULL, 
            display_name VARCHAR(100) NOT NULL, 
            description TEXT, 
            "order" INTEGER NOT NULL, 
            is_active BOOLEAN DEFAULT 1, 
            is_default BOOLEAN DEFAULT 0, 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            FOREIGN KEY(user_profile_id) REFERENCES user_profile (id)
        )
        ''')
        
        # Create index for user_profile_id
        cursor.execute('CREATE INDEX ix_sales_stage_user_profile_id ON sales_stage (user_profile_id)')
        
        # Insert default sales stages
        default_stages = [
            ('rapport', 'Rapport Building', 'Establish trust and connection with the prospect', 1, 1, 1),
            ('discovery', 'Needs Discovery', 'Identify prospect needs and pain points', 2, 1, 1),
            ('pitch', 'Solution Presentation', 'Present your solution to address prospect needs', 3, 1, 1),
            ('objection_handling', 'Objection Handling', 'Address concerns and objections', 4, 1, 1),
            ('closing', 'Closing', 'Ask for the business and secure next steps', 5, 1, 1)
        ]
        
        cursor.executemany('''
        INSERT INTO sales_stage (name, display_name, description, "order", is_active, is_default)
        VALUES (?, ?, ?, ?, ?, ?)
        ''', default_stages)
        
        print("Sales stage table created with default stages.")
    else:
        print("Table 'sales_stage' already exists.")
    
    # Commit the changes and close the connection
    conn.commit()
    conn.close()
    
    print("Database update complete!")

if __name__ == "__main__":
    add_missing_columns() 
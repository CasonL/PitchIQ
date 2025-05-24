import sqlite3
import os

# Path to the SQLite database file
db_path = os.path.join('instance', 'sales_training.db.bak')

def fix_buyer_persona_table():
    """Fix the buyer_persona table by adding the missing columns."""
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return
        
    print(f"Using database file: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if buyer_persona table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='buyer_persona'")
    if not cursor.fetchone():
        print("Table 'buyer_persona' not found in the database")
        create_buyer_persona_table(cursor)
    else:
        # Check columns in buyer_persona
        cursor.execute("PRAGMA table_info(buyer_persona)")
        columns = [col[1] for col in cursor.fetchall()]
        print(f"Columns in buyer_persona: {columns}")
        
        # Add missing columns
        required_columns = [
            ('personality_traits', 'TEXT'),
            ('emotional_state', 'VARCHAR(50)'),
            ('buyer_type', 'VARCHAR(50)'),
            ('decision_authority', 'VARCHAR(50)'),
            ('industry_context', 'TEXT'),
            ('pain_points', 'TEXT'),
            ('objections', 'TEXT'),
            ('cognitive_biases', 'TEXT')
        ]
        
        for column_name, column_type in required_columns:
            if column_name not in columns:
                print(f"Adding '{column_name}' column to buyer_persona table...")
                cursor.execute(f"ALTER TABLE buyer_persona ADD COLUMN {column_name} {column_type}")
            else:
                print(f"Column '{column_name}' already exists.")
    
    # Commit the changes and close the connection
    conn.commit()
    conn.close()
    
    print("buyer_persona table fix complete!")

def create_buyer_persona_table(cursor):
    """Create the buyer_persona table from scratch."""
    print("Creating 'buyer_persona' table...")
    cursor.execute('''
    CREATE TABLE buyer_persona (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        personality_traits TEXT NOT NULL,
        emotional_state VARCHAR(50) NOT NULL,
        buyer_type VARCHAR(50) NOT NULL,
        decision_authority VARCHAR(50) NOT NULL,
        industry_context TEXT,
        pain_points TEXT NOT NULL,
        objections TEXT NOT NULL,
        cognitive_biases TEXT NOT NULL
    )
    ''')
    print("buyer_persona table created.")

if __name__ == "__main__":
    fix_buyer_persona_table() 
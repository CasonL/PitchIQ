import sqlite3
import os

# Path to the SQLite database file
db_path = os.path.join('instance', 'sales_training.db.bak')

def create_conversation_table():
    """Create the conversation table if it doesn't exist."""
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return
        
    print(f"Using database file: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if conversation table already exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='conversation'")
    if cursor.fetchone():
        print("Table 'conversation' already exists.")
    else:
        print("Creating 'conversation' table...")
        cursor.execute('''
        CREATE TABLE conversation (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT DEFAULT 'New Conversation',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_archived BOOLEAN DEFAULT 0,
            session_setup_step TEXT DEFAULT 'start',
            product_service TEXT,
            target_market TEXT,
            sales_experience TEXT,
            persona TEXT,
            meta_data TEXT,
            FOREIGN KEY(user_id) REFERENCES user(id)
        )
        ''')
        
        # Create index for user_id
        cursor.execute('CREATE INDEX ix_conversation_user_id ON conversation (user_id)')
        
        print("Conversation table created.")
    
    # Commit the changes and close the connection
    conn.commit()
    conn.close()
    
    print("Database update complete!")

if __name__ == "__main__":
    create_conversation_table() 
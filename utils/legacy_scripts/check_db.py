import sqlite3
import os

# Path to the SQLite database file
db_path = os.path.join('instance', 'sales_training.db.bak')

def check_schema():
    """Check the schema of the training_session table."""
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
    
    # Check columns in training_session
    cursor.execute("PRAGMA table_info(training_session)")
    columns = cursor.fetchall()
    print("\nColumns in training_session table:")
    for col in columns:
        print(f"  {col[0]}: {col[1]} ({col[2]}), nullable: {not col[3]}, default: {col[4]}")
    
    # Get a sample row from training_session if available
    cursor.execute("SELECT * FROM training_session LIMIT 1")
    row = cursor.fetchone()
    if row:
        print("\nSample data from training_session:")
        for i, col in enumerate(columns):
            print(f"  {col[1]}: {row[i]}")
    else:
        print("\nNo data in training_session table")
    
    conn.close()

if __name__ == "__main__":
    check_schema() 
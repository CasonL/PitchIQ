import sqlite3
import os

# Connect to the database
db_path = os.path.join('instance', 'sales_training.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Print tables for debugging
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print(f"Tables in database: {[t[0] for t in tables]}")

# Add columns to the training_session table if it exists
if ('training_session',) in tables:
    try:
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(training_session)")
        columns = [info[1] for info in cursor.fetchall()]
        
        if 'created_at' not in columns:
            print("Adding created_at column...")
            cursor.execute("ALTER TABLE training_session ADD COLUMN created_at DATETIME")
        
        if 'updated_at' not in columns:
            print("Adding updated_at column...")
            cursor.execute("ALTER TABLE training_session ADD COLUMN updated_at DATETIME")
        
        # Update the migration version to match the model
        cursor.execute("UPDATE alembic_version SET version_num = 'b3abebdf4435'")
        
        conn.commit()
        print("Database updated successfully!")
    except Exception as e:
        print(f"Error updating database: {e}")
else:
    print("No training_session table found!")

# Close the connection
conn.close() 
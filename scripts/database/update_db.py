import sqlite3
import os

# Connect to the database
db_path = os.path.join('instance', 'app.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Add the missing column to the conversation table
try:
    cursor.execute("ALTER TABLE conversation ADD COLUMN persona_id VARCHAR(100);")
    print("Added persona_id column to conversation table")
except sqlite3.OperationalError as e:
    print(f"Error: {e}")

# Commit changes and close connection
conn.commit()
conn.close()

print("Database update completed!") 
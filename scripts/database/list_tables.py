import sqlite3

try:
    conn = sqlite3.connect('instance/salestrainer.db')
    cursor = conn.cursor()
    cursor.execute('SELECT name FROM sqlite_master WHERE type="table"')
    tables = cursor.fetchall()
    
    print('=== TABLES ===')
    for table in tables:
        print(table[0])
    
    conn.close()
    print("Database connection closed successfully.")
except Exception as e:
    print(f"Error: {e}") 
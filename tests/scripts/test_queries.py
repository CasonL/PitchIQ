import sqlite3
import os
import json
from datetime import datetime, timedelta

# Path to the SQLite database file
db_path = os.path.join('instance', 'sales_training.db.bak')

def test_database_queries():
    """Test key database queries that were failing previously."""
    if not os.path.exists(db_path):
        print(f"Database file not found: {db_path}")
        return
        
    print(f"Using database file: {db_path}")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # This allows accessing columns by name
    cursor = conn.cursor()
    
    # Test 1: Check user_profile schema
    print("\n--- Test 1: Check user_profile schema ---")
    cursor.execute("PRAGMA table_info(user_profile)")
    columns = cursor.fetchall()
    column_names = [col['name'] for col in columns]
    print(f"user_profile columns: {', '.join(column_names)}")
    required_columns = ['onboarding_step', 'onboarding_step_new', 'product_service', 'target_market']
    missing = [col for col in required_columns if col not in column_names]
    if missing:
        print(f"❌ Missing columns: {', '.join(missing)}")
    else:
        print("✅ All required columns exist in user_profile")
    
    # Test 2: Check training_session schema
    print("\n--- Test 2: Check training_session schema ---")
    cursor.execute("PRAGMA table_info(training_session)")
    columns = cursor.fetchall()
    column_names = [col['name'] for col in columns]
    print(f"training_session columns: {', '.join(column_names)}")
    required_columns = ['reached_stages', 'current_stage']
    missing = [col for col in required_columns if col not in column_names]
    if missing:
        print(f"❌ Missing columns: {', '.join(missing)}")
    else:
        print("✅ All required columns exist in training_session")
    
    # Test 3: Check sales_stage table
    print("\n--- Test 3: Check sales_stage table ---")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sales_stage'")
    if cursor.fetchone():
        cursor.execute("SELECT COUNT(*) FROM sales_stage")
        count = cursor.fetchone()[0]
        print(f"✅ sales_stage table exists with {count} rows")
        
        # Check for default stages
        cursor.execute("SELECT name FROM sales_stage")
        stages = cursor.fetchall()
        stage_names = [stage['name'] for stage in stages]
        print(f"Sales stages: {', '.join(stage_names)}")
    else:
        print("❌ sales_stage table doesn't exist")
    
    # Test 4: Check conversation table
    print("\n--- Test 4: Check conversation table ---")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='conversation'")
    if cursor.fetchone():
        print("✅ conversation table exists")
        
        # Try the query that was failing
        try:
            one_month_ago = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d %H:%M:%S')
            cursor.execute(
                "SELECT * FROM conversation WHERE title = ? AND created_at < ?", 
                ('New Conversation', one_month_ago)
            )
            print("✅ Query executes successfully")
        except Exception as e:
            print(f"❌ Query failed: {str(e)}")
    else:
        print("❌ conversation table doesn't exist")
    
    # Test 5: Check buyer_persona table
    print("\n--- Test 5: Check buyer_persona table ---")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='buyer_persona'")
    if cursor.fetchone():
        cursor.execute("PRAGMA table_info(buyer_persona)")
        columns = cursor.fetchall()
        column_names = [col['name'] for col in columns]
        print(f"buyer_persona columns: {', '.join(column_names)}")
        required_columns = ['personality_traits', 'emotional_state', 'buyer_type', 'decision_authority', 'industry_context', 'pain_points', 'objections', 'cognitive_biases']
        missing = [col for col in required_columns if col not in column_names]
        if missing:
            print(f"❌ Missing columns: {', '.join(missing)}")
        else:
            print("✅ All required columns exist in buyer_persona")
            
        # Try an insert query
        try:
            # Roll back to avoid actually inserting data
            conn.execute("BEGIN TRANSACTION")
            cursor.execute(
                "INSERT INTO buyer_persona (name, description, personality_traits, emotional_state, buyer_type, decision_authority, industry_context, pain_points, objections, cognitive_biases) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ('Test Persona', 'Test Description', '{"test": 1.0}', 'Neutral', 'Technical', 'High', 'Technology', '["test"]', '["test"]', '{"test": 1.0}')
            )
            conn.rollback()  # Don't actually insert the data
            print("✅ Insert query executes successfully")
        except Exception as e:
            conn.rollback()
            print(f"❌ Insert query failed: {str(e)}")
    else:
        print("❌ buyer_persona table doesn't exist")
    
    # Close the connection
    conn.close()
    
    print("\nAll tests completed.")

if __name__ == "__main__":
    test_database_queries() 
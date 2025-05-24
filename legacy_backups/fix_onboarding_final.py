"""
Fix Onboarding Issues - Comprehensive Solution

This script provides a comprehensive solution to fix onboarding issues:
1. Fixes database schema issues (adding missing columns)
2. Resets the user profile for testing
3. Starts a Flask server with safe settings (no debug mode)

Run this script and then go to http://localhost:5000/training/diagnostic
to verify the database state before trying the onboarding again.
"""

import os
import sys
import json
import shutil
import sqlite3
import subprocess
from datetime import datetime
import time
import threading
import atexit

# Force debug mode off
os.environ['FLASK_DEBUG'] = '0'

# Set up console colors
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(message):
    print(f"\n{Colors.HEADER}{Colors.BOLD}=== {message} ==={Colors.END}\n")

def print_success(message):
    print(f"{Colors.GREEN}✓ {message}{Colors.END}")

def print_error(message):
    print(f"{Colors.RED}✗ {message}{Colors.END}")

def print_info(message):
    print(f"{Colors.BLUE}ℹ {message}{Colors.END}")

def print_warning(message):
    print(f"{Colors.YELLOW}⚠ {message}{Colors.END}")

# Define database paths
DB_PATHS = [
    'instance/salestrainer.db',
    'instance/new_salestrainer.db',
    'instance/sales_training.db'
]

# Step 1: Fix database schema issues
def fix_db_schema():
    print_header("FIXING DATABASE SCHEMA")
    
    success = False
    
    for db_path in DB_PATHS:
        if not os.path.exists(db_path):
            print_info(f"Database not found at {db_path}, skipping...")
            continue
            
        print_info(f"Checking database at {db_path}...")
        
        # Create backup
        backup_path = f"{db_path}.bak.{datetime.now().strftime('%Y%m%d%H%M%S')}"
        print_info(f"Creating backup at {backup_path}")
        shutil.copy2(db_path, backup_path)
        
        try:
            # Connect to the database with WAL mode and timeout
            conn = sqlite3.connect(db_path, timeout=30.0)
            conn.isolation_level = None  # Autocommit mode
            cursor = conn.cursor()
            
            # Set up pragmas for better concurrency
            cursor.execute("PRAGMA journal_mode = WAL")
            cursor.execute("PRAGMA busy_timeout = 30000")
            cursor.execute("PRAGMA synchronous = NORMAL")
            
            # Begin exclusive transaction
            cursor.execute("BEGIN EXCLUSIVE")
            
            # Check if training_session table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='training_session'")
            if not cursor.fetchone():
                print_info("Table training_session doesn't exist yet, will be created when app runs")
            else:
                # Check if columns exist
                cursor.execute("PRAGMA table_info(training_session)")
                columns = [row[1] for row in cursor.fetchall()]
                
                # Add missing columns if needed
                if 'created_at' not in columns:
                    print_info("Adding 'created_at' column to training_session table")
                    cursor.execute("ALTER TABLE training_session ADD COLUMN created_at DATETIME")
                    
                if 'updated_at' not in columns:
                    print_info("Adding 'updated_at' column to training_session table")
                    cursor.execute("ALTER TABLE training_session ADD COLUMN updated_at DATETIME")
                
                print_success(f"Updated training_session table schema in {db_path}")
            
            # Commit changes
            cursor.execute("COMMIT")
            success = True
            
        except sqlite3.Error as e:
            if conn:
                conn.execute("ROLLBACK")
            print_error(f"SQLite error: {e}")
        finally:
            if conn:
                conn.close()
    
    if success:
        print_success("Database schema fixed successfully")
    else:
        print_error("Failed to fix any database schemas")
    
    return success

# Step 2: Reset user profile for testing
def reset_user_profile():
    print_header("RESETTING USER PROFILE")
    
    success = False
    
    for db_path in DB_PATHS:
        if not os.path.exists(db_path):
            print_info(f"Database not found at {db_path}, skipping...")
            continue
            
        print_info(f"Resetting user profile in {db_path}...")
        
        # Sample data for the new user profile
        data = {
            'user_id': 1,  # Assuming this is for user ID 1
            'experience_level': 'expert',
            'product_service': 'Product/service description here',
            'target_market': 'B2B',
            'industry': 'Software',
            'pain_points': json.dumps(["Slow sales cycle", "Price objections"]),
            'recent_wins': json.dumps(["Closed major deal", "Improved pitch"]),
            'mindset_challenges': json.dumps(["Rejection fear", "Confidence issues"]),
            'improvement_goals': json.dumps(["Better follow-up", "Handling objections"]),
            'preferred_training_style': 'structured',
            'preferred_feedback_frequency': 'end-session',
            'onboarding_complete': 0  # Set to 0 to force onboarding to show
        }
        
        try:
            # Connect to the database
            conn = sqlite3.connect(db_path, timeout=30.0)
            conn.isolation_level = None  # Autocommit mode
            cursor = conn.cursor()
            
            # Set up pragmas for better concurrency
            cursor.execute("PRAGMA journal_mode = WAL")
            cursor.execute("PRAGMA busy_timeout = 30000")
            
            # Begin exclusive transaction
            cursor.execute("BEGIN EXCLUSIVE")
            
            # Check if user_profile table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='user_profile'")
            if not cursor.fetchone():
                print_info("Table user_profile doesn't exist yet, will be created when app runs")
            else:
                # Delete any existing user profile for this user
                cursor.execute("DELETE FROM user_profile WHERE user_id = ?", (data['user_id'],))
                print_info(f"Deleted any existing profile for user {data['user_id']}")
                
                # Insert new user profile
                cursor.execute('''
                    INSERT INTO user_profile (
                        user_id, experience_level, product_service, target_market, 
                        industry, pain_points, recent_wins, mindset_challenges, 
                        improvement_goals, preferred_training_style, 
                        preferred_feedback_frequency, onboarding_complete
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    data['user_id'], data['experience_level'], data['product_service'], 
                    data['target_market'], data['industry'], data['pain_points'], 
                    data['recent_wins'], data['mindset_challenges'], data['improvement_goals'],
                    data['preferred_training_style'], data['preferred_feedback_frequency'],
                    data['onboarding_complete']
                ))
                
                print_success(f"Reset user profile for user {data['user_id']} in {db_path}")
                success = True
            
            # Commit changes
            cursor.execute("COMMIT")
            
        except sqlite3.Error as e:
            if conn:
                conn.execute("ROLLBACK")
            print_error(f"SQLite error: {e}")
        finally:
            if conn:
                conn.close()
    
    if success:
        print_success("User profile reset successfully")
    else:
        print_warning("Failed to reset any user profiles. Continuing anyway as the app may create them.")
    
    return True  # Continue even if we couldn't reset profiles

# Step 3: Start Flask server with safe settings
def start_flask_server():
    print_header("STARTING FLASK SERVER")
    
    # Import the create_app function here to avoid circular imports
    try:
        from app import create_app
        from flask import current_app
        print_success("Successfully imported app modules")
    except ImportError as e:
        print_error(f"Failed to import app modules: {e}")
        return False
    
    try:
        # Create app with safe settings
        flask_app = create_app({
            'SQLALCHEMY_DATABASE_URI': 'sqlite:///instance/new_salestrainer.db',
            'SQLALCHEMY_ENGINE_OPTIONS': {
                'connect_args': {
                    'timeout': 30,  # Increase SQLite timeout
                    'check_same_thread': False  # Allow multi-threading
                },
            },
            'DEBUG': False,
            'TESTING': False,
        })
        
        # Create a thread for running the Flask server
        def run_flask():
            try:
                flask_app.run(host='127.0.0.1', port=5000, debug=False, use_reloader=False)
            except Exception as e:
                print_error(f"Error running Flask server: {e}")
        
        server_thread = threading.Thread(target=run_flask, daemon=True)
        server_thread.start()
        
        # Check if server is starting
        time.sleep(1)
        if server_thread.is_alive():
            print_success("Flask server started successfully")
            print_info("Waiting for server to initialize...")
            time.sleep(2)  # Give it a moment to fully initialize
            
            # Register server shutdown on script exit
            def shutdown_server():
                print_info("Shutting down Flask server...")
            
            atexit.register(shutdown_server)
            
            return True
        else:
            print_error("Flask server thread stopped unexpectedly")
            return False
            
    except Exception as e:
        print_error(f"Failed to start Flask server: {e}")
        return False

# Main function to run all steps
def main():
    print_header("ONBOARDING FIX UTILITY")
    
    # Step 1: Fix database schema
    if not fix_db_schema():
        print_warning("Schema fix had issues, but continuing...")
    
    # Step 2: Reset user profile
    if not reset_user_profile():
        print_warning("User profile reset had issues, but continuing...")
    
    # Step 3: Start Flask server
    if start_flask_server():
        print_header("ONBOARDING FIX COMPLETE")
        print_info("Flask server is running with safe settings")
        print_info("You can now access the following URLs:")
        print_info("- Diagnostic page: http://localhost:5000/training/diagnostic")
        print_info("- Onboarding page: http://localhost:5000/training/onboarding")
        print_info("- Fix database: http://localhost:5000/training/fix-database")
        print_info("\nPress Ctrl+C to stop the server when done")
        
        # Keep the script running
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print_info("\nShutting down...")
    else:
        print_error("Failed to start Flask server")
        print_info("Try running the app manually with:")
        print_info("FLASK_DEBUG=0 flask run")

if __name__ == "__main__":
    main() 
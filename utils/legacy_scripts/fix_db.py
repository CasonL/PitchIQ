"""
Fix database issues related to login and authentication.

This script attempts to repair database issues that may be causing 500 errors
during login:
1. It creates a test database connection
2. Verifies tables and schema
3. Verifies user table columns and indexes
4. Tests a simple user lookup
5. Optionally performs recommended fixes
"""

import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv
import sqlite3

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

def print_header(title):
    """Print a formatted section header."""
    print("\n" + "=" * 60)
    print(f"    {title}")
    print("=" * 60)

def check_db_config():
    """Check database configuration in environment and config files."""
    print_header("Checking Database Configuration")
    
    # Check environment variables
    db_url = os.environ.get('DATABASE_URL')
    db_uri = os.environ.get('SQLALCHEMY_DATABASE_URI')
    
    if db_url:
        print(f"DATABASE_URL found in environment: {db_url}")
    else:
        print("WARNING: DATABASE_URL not found in environment")
        
    if db_uri:
        print(f"SQLALCHEMY_DATABASE_URI found in environment: {db_uri}")
    else:
        print("SQLALCHEMY_DATABASE_URI not found in environment")
        
    # Check config.py
    try:
        from config import Config
        config_uri = Config.SQLALCHEMY_DATABASE_URI
        print(f"SQLALCHEMY_DATABASE_URI in config.py: {config_uri}")
        
        # Check if PostgreSQL is being used
        is_postgres = 'postgresql' in config_uri if config_uri else False
        print(f"Using PostgreSQL: {is_postgres}")
        
        # If PostgreSQL, check for other required config
        if is_postgres:
            print("PostgreSQL detected. Checking for psycopg2 package...")
            try:
                import psycopg2
                print("✓ psycopg2 package is installed")
            except ImportError:
                print("✗ psycopg2 package is NOT installed. This is required for PostgreSQL.")
                print("  Run: pip install psycopg2-binary")
    except Exception as e:
        print(f"Error reading config.py: {str(e)}")

def test_db_connection():
    """Test database connection using SQLAlchemy."""
    print_header("Testing Database Connection")
    
    try:
        from app import create_app
        from app.extensions import db
        from sqlalchemy import text
        
        app = create_app()
        with app.app_context():
            # Get database URI from app config
            db_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
            print(f"App is configured to use: {db_uri}")
            
            # Test connection
            try:
                result = db.session.execute(text('SELECT 1')).scalar()
                print(f"✓ Database connection successful! Result: {result}")
                return True
            except Exception as e:
                print(f"✗ Database connection failed: {type(e).__name__}: {str(e)}")
                return False
    except Exception as e:
        print(f"✗ Error setting up app context: {str(e)}")
        return False

def check_user_table():
    """Check user table structure and contents."""
    print_header("Checking User Table")
    
    try:
        from app import create_app
        from app.extensions import db
        from app.models import User
        from sqlalchemy import text
        
        app = create_app()
        with app.app_context():
            # Check if table exists
            try:
                result = db.session.execute(text("SELECT COUNT(*) FROM user")).scalar()
                print(f"✓ User table exists with {result} rows")
                
                # Check columns
                print("\nUser table columns:")
                columns = db.session.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'user'
                """)).fetchall()
                
                if columns:
                    for col in columns:
                        print(f"  - {col[0]}: {col[1]}")
                else:
                    print("  Unable to retrieve column information")
                
                # Get a sample user
                user = User.query.first()
                if user:
                    print(f"\nSample user found: id={user.id}, email={user.email}")
                    # Test password check with default password
                    try:
                        pw_check = user.check_password("password")
                        print(f"Password check with 'password': {pw_check}")
                    except Exception as pw_error:
                        print(f"Error checking password: {str(pw_error)}")
                else:
                    print("\nNo users found in the database")
                    print("Would you like to create a test user? (y/n)")
                    if input().lower() == 'y':
                        create_test_user()
            except Exception as e:
                print(f"✗ Error checking user table: {str(e)}")
    except Exception as e:
        print(f"✗ Error setting up app context: {str(e)}")

def create_test_user():
    """Create a test user in the database."""
    try:
        from app import create_app
        from app.extensions import db
        from app.models import User
        
        app = create_app()
        with app.app_context():
            # Create test user
            test_user = User(
                name="Test User",
                email="test@example.com"
            )
            test_user.set_password("password")
            
            db.session.add(test_user)
            db.session.commit()
            
            print(f"✓ Test user created: id={test_user.id}, email={test_user.email}")
    except Exception as e:
        print(f"✗ Error creating test user: {str(e)}")

def fix_potential_issues():
    """Fix potential database issues that could affect login."""
    print_header("Fixing Potential Issues")
    
    try:
        from app import create_app
        from app.extensions import db
        from sqlalchemy import text
        
        app = create_app()
        with app.app_context():
            # Close any open transactions and dispose engine
            print("Closing any open sessions...")
            db.session.close()
            db.engine.dispose()
            print("Session closed and engine disposed")
            
            # Check for database locks
            print("\nChecking for database locks...")
            try:
                # SQLite specific (adjust for PostgreSQL if needed)
                if 'sqlite' in app.config.get('SQLALCHEMY_DATABASE_URI', ''):
                    locks = db.session.execute(text("PRAGMA lock_status")).fetchall()
                    print(f"Lock status: {locks}")
            except Exception as e:
                print(f"Could not check locks: {str(e)}")
            
            # Try to rebuild user table indexes
            print("\nAttempting to reindex user table...")
            try:
                db.session.execute(text("REINDEX TABLE user"))
                db.session.commit()
                print("Reindexing successful")
            except Exception as e:
                print(f"Reindexing failed (may not be supported): {str(e)}")
                
            # Verify database integrity
            print("\nVerifying database integrity...")
            try:
                if 'sqlite' in app.config.get('SQLALCHEMY_DATABASE_URI', ''):
                    integrity = db.session.execute(text("PRAGMA integrity_check")).fetchall()
                    print(f"Integrity check: {integrity}")
            except Exception as e:
                print(f"Integrity check failed: {str(e)}")
    except Exception as e:
        print(f"Error during database fixes: {str(e)}")

def add_missing_columns():
    """Add the missing columns to the training_session table."""
    conn = sqlite3.connect(os.path.join('instance', 'app.db'))
    cursor = conn.cursor()
    
    # Check if reached_stages column already exists
    cursor.execute("PRAGMA table_info(training_session)")
    columns = [col[1] for col in cursor.fetchall()]
    
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
            id INTEGER NOT NULL, 
            user_profile_id INTEGER, 
            name VARCHAR(50) NOT NULL, 
            display_name VARCHAR(100) NOT NULL, 
            description TEXT, 
            "order" INTEGER NOT NULL, 
            is_active BOOLEAN DEFAULT 1, 
            is_default BOOLEAN DEFAULT 0, 
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, 
            PRIMARY KEY (id), 
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

def main():
    """Main function to run all checks and fixes."""
    print_header("Database Login Fix Utility")
    
    # Run checks
    check_db_config()
    connection_ok = test_db_connection()
    
    if connection_ok:
        check_user_table()
        
        print("\nRun advanced fixes? These operations may modify your database. (y/n)")
        if input().lower() == 'y':
            fix_potential_issues()
    else:
        print("\nCannot proceed with further checks until database connection is fixed.")
        print("Common solutions:")
        print("1. Check that the database exists and is accessible")
        print("2. Verify database connection string in config.py and .env")
        print("3. Install required database drivers (psycopg2-binary for PostgreSQL)")
        print("4. Check database server is running")
        print("5. Check if database is locked by another process")
    
    print_header("Completed Database Diagnostics")
    
    print("\nRun additional database updates? These operations may modify your database. (y/n)")
    if input().lower() == 'y':
        add_missing_columns()

if __name__ == "__main__":
    main() 
"""
Script to run all database migrations
"""

import sys
import importlib.util
import os
import subprocess

def run_migration(migration_path):
    """
    Run a single migration from the file path.
    
    Args:
        migration_path: Path to the migration file
    """
    print(f"Running migration: {migration_path}")
    
    # For simplicity in Windows/PowerShell, run the migration file directly
    # rather than trying to import it
    try:
        # Run the Python file directly
        result = subprocess.run(["python", migration_path], 
                              capture_output=True, 
                              text=True, 
                              check=False)
        
        # Check if the command was successful
        if result.returncode == 0:
            print(f"Successfully ran migration: {migration_path}")
            print(result.stdout)
            return True
        else:
            print(f"Error running migration {migration_path}:")
            print(f"Exit code: {result.returncode}")
            print(f"Output: {result.stdout}")
            print(f"Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"Exception running migration {migration_path}: {str(e)}")
        return False

def run_all_migrations():
    """
    Run all migrations in the migrations directory
    """
    migration_dir = "migrations"
    
    # Check if the directory exists
    if not os.path.isdir(migration_dir):
        print(f"Migration directory {migration_dir} not found")
        return
    
    # Get all Python files in the migrations directory
    migration_files = [
        os.path.join(migration_dir, f) 
        for f in os.listdir(migration_dir) 
        if f.endswith('.py') and not f.startswith('__')
    ]
    
    if not migration_files:
        print("No migration files found")
        return
    
    # Sort the migration files to ensure they run in order
    migration_files.sort()
    
    success_count = 0
    fail_count = 0
    
    # Print the migrations we're going to run
    print(f"Found {len(migration_files)} migration files:")
    for i, migration_file in enumerate(migration_files):
        print(f"  {i+1}. {os.path.basename(migration_file)}")
    print()
    
    # Run each migration
    for migration_file in migration_files:
        if run_migration(migration_file):
            success_count += 1
        else:
            fail_count += 1
    
    print(f"Migrations complete. Success: {success_count}, Failed: {fail_count}")

if __name__ == "__main__":
    print("Sales Training AI Database Migration Tool")
    print("-----------------------------------------")
    
    # If a specific migration is provided, run only that one
    if len(sys.argv) > 1:
        migration_path = sys.argv[1]
        print(f"Running single migration: {migration_path}")
        run_migration(migration_path)
    else:
        # Otherwise run all migrations
        print("Running all migrations...")
        run_all_migrations() 
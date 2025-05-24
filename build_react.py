"""
Copy React build files to Flask static directory

This script copies the built React files from app/frontend/dist 
to app/static/react/dist for Flask to serve.
"""

import os
import shutil
import sys

def ensure_directory_exists(dir_path):
    """Ensure the specified directory exists, create if it doesn't."""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        print(f"Created directory: {dir_path}")

def copy_build_files():
    """Copy build files to Flask static directory."""
    # Define source and target directories
    source_dir = os.path.join('app', 'frontend', 'dist')
    target_dir = os.path.join('app', 'static', 'react', 'dist')
    
    # Check if source directory exists
    if not os.path.exists(source_dir):
        print(f"Error: Source directory not found: {source_dir}")
        return False
    
    # Debug - show files in source directory
    print(f"Files in source directory ({source_dir}):")
    for item in os.listdir(source_dir):
        print(f"  - {item}")
    
    # Create target directory if it doesn't exist
    ensure_directory_exists(target_dir)
    
    # Clear target directory
    for item in os.listdir(target_dir):
        item_path = os.path.join(target_dir, item)
        if os.path.isfile(item_path):
            os.unlink(item_path)
            print(f"Removed file: {item_path}")
        elif os.path.isdir(item_path):
            shutil.rmtree(item_path)
            print(f"Removed directory: {item_path}")
    
    # Copy all files from build directory
    for item in os.listdir(source_dir):
        source_path = os.path.join(source_dir, item)
        target_path = os.path.join(target_dir, item)
        
        if os.path.isfile(source_path):
            shutil.copy2(source_path, target_path)
            print(f"Copied file: {item}")
        elif os.path.isdir(source_path):
            if os.path.exists(target_path):
                shutil.rmtree(target_path)
            shutil.copytree(source_path, target_path)
            print(f"Copied directory: {item}")
    
    # Verify files were copied
    print(f"Files in target directory ({target_dir}):")
    for item in os.listdir(target_dir):
        print(f"  - {item}")
    
    print("Successfully copied build files to Flask static directory")
    return True

if __name__ == "__main__":
    print("Starting to copy React build files...")
    if copy_build_files():
        print("Done! The React app files have been updated.")
        sys.exit(0)
    else:
        print("Failed to copy build files.")
        sys.exit(1) 
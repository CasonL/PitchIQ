#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Deploy Landing Page Script

This script copies the built React landing page from landing-page-source
to the app/static/landing directory for Flask to serve.
"""

import os
import shutil
import sys

def ensure_directory_exists(dir_path):
    """Ensure the specified directory exists, create if it doesn't."""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        print(f"Created directory: {dir_path}")

def deploy_landing_page():
    """Copy the built landing page to the Flask static directory."""
    # Source directory: React build output from landing-page-source
    script_dir = os.path.dirname(os.path.abspath(__file__))
    build_dir = os.path.join(script_dir, 'landing-page-source', 'dist')
    
    # Target directory: Flask static landing
    target_dir = os.path.join(script_dir, 'app', 'static', 'landing')
    
    # Check if build directory exists
    if not os.path.exists(build_dir):
        print(f"Error: Build directory not found at {build_dir}")
        return False
    
    # Create target directory if it doesn't exist
    ensure_directory_exists(target_dir)
    
    # Copy all files from build directory to target directory, overwriting existing.
    for item in os.listdir(build_dir):
        src_path = os.path.join(build_dir, item)
        dst_path = os.path.join(target_dir, item)
        
        try:
            if os.path.isfile(src_path):
                shutil.copy2(src_path, dst_path)
                print(f"Copied file: {item} to {dst_path}")
            elif os.path.isdir(src_path):
                if os.path.isfile(dst_path):
                    os.unlink(dst_path)
                    print(f"Removed conflicting file: {dst_path}")
                shutil.copytree(src_path, dst_path, dirs_exist_ok=True)
                print(f"Copied directory: {item} to {dst_path}")
        except Exception as e:
            print(f'Error copying {src_path} to {dst_path}. Reason: {e}')
            return False # Stop if any copy operation fails
    
    print(f"Files copied successfully to {target_dir}")
    return True

if __name__ == "__main__":
    print("Starting to deploy landing page...")
    if deploy_landing_page():
        print("Done! The landing page has been updated.")
    else:
        print("Failed to deploy landing page.")
        sys.exit(1) 
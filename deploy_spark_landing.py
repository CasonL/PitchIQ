#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Deploy Voice Orb Landing Page Script

This script copies the built React landing page from pitchiq-voice-orb-design
to the app/static/landing directory for Flask to serve.
"""

import os
import shutil
import sys
import re

def ensure_directory_exists(dir_path):
    """Ensure the specified directory exists, create if it doesn't."""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        print(f"Created directory: {dir_path}")

def update_links_in_html(file_path):
    """Update links in the HTML file to point to Flask routes."""
    if not os.path.exists(file_path):
        print(f"Warning: File not found for link updates: {file_path}")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Fix login/signup links
        content = content.replace('href="/login"', 'href="/auth/login"')
        content = content.replace('href="/signup"', 'href="/auth/signup"')
        content = content.replace('href="/register"', 'href="/auth/register"')
        
        # Ensure assets are loaded from the correct path
        content = re.sub(r'src="/assets/', 'src="/assets/', content)
        content = re.sub(r'href="/assets/', 'href="/assets/', content)
        
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(content)
        
        print(f"Updated links in {file_path}")
        return True
    except Exception as e:
        print(f"Error updating links in {file_path}: {e}")
        return False

def deploy_landing_page():
    """Copy the built landing page to the Flask static directory."""
    # Source directory: React build output
    build_dir = os.path.join('pitchiq-voice-orb-design-a43f76bafc0e5d8fa6138ab0896e1fc6c01a2e6d', 'dist')
    
    # Target directory: Flask static landing
    target_dir = os.path.join('app', 'static', 'landing')
    
    # Check if build directory exists
    if not os.path.exists(build_dir):
        print(f"Error: Build directory not found at {build_dir}")
        return False
    
    # Create target directory if it doesn't exist
    ensure_directory_exists(target_dir)
    
    # Clear existing files in target directory
    for item in os.listdir(target_dir):
        item_path = os.path.join(target_dir, item)
        if os.path.isfile(item_path):
            os.unlink(item_path)
            print(f"Removed file: {item_path}")
        elif os.path.isdir(item_path):
            shutil.rmtree(item_path)
            print(f"Removed directory: {item_path}")
    
    # Copy all files from build directory to target directory
    for item in os.listdir(build_dir):
        src_path = os.path.join(build_dir, item)
        dst_path = os.path.join(target_dir, item)
        
        if os.path.isfile(src_path):
            shutil.copy2(src_path, dst_path)
            print(f"Copied file: {item}")
        elif os.path.isdir(src_path):
            if os.path.exists(dst_path):
                shutil.rmtree(dst_path)
            shutil.copytree(src_path, dst_path)
            print(f"Copied directory: {item}")
    
    # Update links in the index.html file
    index_html_path = os.path.join(target_dir, 'index.html')
    update_links_in_html(index_html_path)
    
    print(f"Files copied successfully to {target_dir}")
    return True

if __name__ == "__main__":
    print("Starting to deploy voice orb landing page...")
    if deploy_landing_page():
        print("Done! The landing page has been updated.")
    else:
        print("Failed to deploy landing page.")
        sys.exit(1) 
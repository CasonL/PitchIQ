#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Build React App for Landing Page

This script builds the React application and copies 
the build files to the correct location for Flask to serve.
"""

import os
import sys
import shutil
import subprocess
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger(__name__)

# Define paths
FRONTEND_DIR = os.path.join('app', 'frontend')
BUILD_OUTPUT_DIR = os.path.join(FRONTEND_DIR, 'dist')
FLASK_TARGET_DIR = os.path.join('app', 'static', 'react', 'dist')

def ensure_directory_exists(dir_path):
    """Ensure the specified directory exists, create if it doesn't."""
    if not os.path.exists(dir_path):
        os.makedirs(dir_path)
        logger.info(f"Created directory: {dir_path}")

def run_command(command, cwd=None):
    """Run a shell command and return the result."""
    logger.info(f"Running command: {command}")
    
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            text=True, 
            capture_output=True,
            cwd=cwd
        )
        logger.info(f"Command output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Command failed with code {e.returncode}: {e.stderr}")
        return False

def build_react_app():
    """Build the React application."""
    logger.info("Building React application...")
    
    # Make sure we're in the frontend directory
    if not os.path.exists(FRONTEND_DIR):
        logger.error(f"Frontend directory not found: {FRONTEND_DIR}")
        return False
        
    # Install dependencies first
    if not run_command("npm install", cwd=FRONTEND_DIR):
        logger.error("Failed to install npm dependencies")
        return False
        
    # Build the React app
    if not run_command("npm run build", cwd=FRONTEND_DIR):
        logger.error("Failed to build React app")
        return False
        
    logger.info("React build completed successfully")
    return True

def copy_build_files():
    """Copy the build files to the Flask static directory."""
    logger.info(f"Copying build files from {BUILD_OUTPUT_DIR} to {FLASK_TARGET_DIR}")
    
    # Ensure source directory exists
    if not os.path.exists(BUILD_OUTPUT_DIR):
        logger.error(f"Build output directory not found: {BUILD_OUTPUT_DIR}")
        return False
    
    # Ensure target directory exists
    ensure_directory_exists(os.path.dirname(FLASK_TARGET_DIR))
    
    # Remove existing target directory if it exists
    if os.path.exists(FLASK_TARGET_DIR):
        logger.info(f"Removing existing target directory: {FLASK_TARGET_DIR}")
        shutil.rmtree(FLASK_TARGET_DIR)
    
    # Copy build files to target directory
    try:
        shutil.copytree(BUILD_OUTPUT_DIR, FLASK_TARGET_DIR)
        logger.info("Build files copied successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to copy build files: {e}")
        return False

def main():
    """Main function to build and deploy the React app."""
    logger.info("Starting React build and deployment process...")
    
    # Build the React app
    if not build_react_app():
        logger.error("React build failed")
        return 1
    
    # Copy build files to Flask static directory
    if not copy_build_files():
        logger.error("Failed to copy build files")
        return 1
    
    logger.info("React app successfully built and deployed!")
    print("\n" + "="*60)
    print(" React app successfully built and deployed to Flask static directory")
    print("="*60 + "\n")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 
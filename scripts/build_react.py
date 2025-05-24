#!/usr/bin/env python
"""
Build React Dashboard Application

This script builds the React dashboard application for production.
It runs the npm build command and ensures the output is correctly located.
"""

import os
import subprocess
import shutil
import sys
from pathlib import Path

# Define paths
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR = SCRIPT_DIR.parent
REACT_DIR = ROOT_DIR / "app" / "static" / "react"
DIST_DIR = REACT_DIR / "dist"

def check_npm():
    """Check if npm is installed"""
    try:
        subprocess.run(["npm", "--version"], check=True, stdout=subprocess.PIPE)
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        print("Error: npm is not installed or not in PATH")
        return False

def build_react_app():
    """Build the React application"""
    print("Building React dashboard application...")
    
    # Check if React directory exists
    if not REACT_DIR.exists():
        print(f"Error: React directory not found at {REACT_DIR}")
        return False
    
    # Install dependencies if needed
    if not (REACT_DIR / "node_modules").exists():
        print("Installing npm dependencies...")
        subprocess.run(["npm", "install"], cwd=REACT_DIR, check=True)
    
    # Run build command
    try:
        subprocess.run(["npm", "run", "build"], cwd=REACT_DIR, check=True)
        print(f"React build completed successfully. Files in {DIST_DIR}")
        return True
    except subprocess.SubprocessError as e:
        print(f"Error building React application: {e}")
        return False

def main():
    """Main function"""
    print("===== React Dashboard Build Script =====")
    
    # Check npm
    if not check_npm():
        sys.exit(1)
    
    # Build React application
    if not build_react_app():
        sys.exit(1)
    
    print("===== Build completed successfully =====")

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
Script to build the React landing page and copy the files to the Flask static folder.
"""
import os
import shutil
import subprocess
import sys

# Directory paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
LANDING_PAGE_DIR = os.path.join(SCRIPT_DIR, 'pitchiq-sales-spark-main')
FLASK_STATIC_DIR = os.path.join(SCRIPT_DIR, 'app', 'static')
TARGET_DIR = os.path.join(FLASK_STATIC_DIR, 'landing')

def run_command(command, cwd=None):
    """Run a shell command and print its output."""
    print(f"Running: {command}")
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False

def build_landing_page():
    """Build the React landing page."""
    print(f"Building landing page in {LANDING_PAGE_DIR}...")
    
    # Check if the directory exists
    if not os.path.exists(LANDING_PAGE_DIR):
        print(f"Error: Landing page directory not found at {LANDING_PAGE_DIR}")
        return False
    
    # Install dependencies (npm install)
    if not run_command("npm install", cwd=LANDING_PAGE_DIR):
        return False
    
    # Build the project (npm run build)
    if not run_command("npm run build", cwd=LANDING_PAGE_DIR):
        return False
    
    print("Landing page build completed successfully.")
    return True

def copy_build_to_flask():
    """Copy the built files to the Flask static directory."""
    # Source directory: React build output
    build_dir = os.path.join(LANDING_PAGE_DIR, 'dist')
    
    # Check if build directory exists
    if not os.path.exists(build_dir):
        print(f"Error: Build directory not found at {build_dir}")
        return False
    
    # Create target directory if it doesn't exist
    os.makedirs(TARGET_DIR, exist_ok=True)
    
    # Clear existing files in target directory
    for item in os.listdir(TARGET_DIR):
        item_path = os.path.join(TARGET_DIR, item)
        if os.path.isfile(item_path):
            os.unlink(item_path)
        elif os.path.isdir(item_path):
            shutil.rmtree(item_path)
    
    # Copy all files from build directory to target directory
    for item in os.listdir(build_dir):
        src_path = os.path.join(build_dir, item)
        dst_path = os.path.join(TARGET_DIR, item)
        
        if os.path.isfile(src_path):
            shutil.copy2(src_path, dst_path)
            print(f"Copied file: {item}")
        elif os.path.isdir(src_path):
            shutil.copytree(src_path, dst_path)
            print(f"Copied directory: {item}")
    
    print(f"Files copied successfully to {TARGET_DIR}")
    return True

def setup_asset_paths():
    """
    Fix asset paths in the index.html file to make them relative.
    This is needed because the landing page will be served from /static/landing/
    """
    index_path = os.path.join(TARGET_DIR, 'index.html')
    
    if not os.path.exists(index_path):
        print(f"Error: index.html not found at {index_path}")
        return False
    
    # Read the file
    with open(index_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Replace paths that start with / with ./ for correct relative paths
    content = content.replace('src="/', 'src="/')
    content = content.replace('href="/', 'href="/')
    
    # Write the modified content back
    with open(index_path, 'w', encoding='utf-8') as file:
        file.write(content)
    
    print("Asset paths updated successfully.")
    return True

def update_links_for_flask():
    """
    Update links in the landing page to point to Flask routes.
    """
    index_path = os.path.join(TARGET_DIR, 'index.html')
    
    if not os.path.exists(index_path):
        print(f"Error: index.html not found at {index_path}")
        return False
    
    # Read the file
    with open(index_path, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # Replace login/signup links to point to Flask routes
    content = content.replace('href="/login"', 'href="/auth/login"')
    content = content.replace('href="/signup"', 'href="/auth/signup"')
    
    # Write the modified content back
    with open(index_path, 'w', encoding='utf-8') as file:
        file.write(content)
    
    print("Links updated to point to Flask routes.")
    return True

def main():
    """Main function to build and copy the landing page."""
    print("Starting landing page build process...")
    
    if not build_landing_page():
        print("Failed to build landing page.")
        return 1
    
    if not copy_build_to_flask():
        print("Failed to copy build files.")
        return 1
    
    if not setup_asset_paths():
        print("Failed to update asset paths.")
        return 1
    
    if not update_links_for_flask():
        print("Failed to update links for Flask.")
        return 1
    
    print("Landing page build and copy completed successfully!")
    print(f"Files are available at: {TARGET_DIR}")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 
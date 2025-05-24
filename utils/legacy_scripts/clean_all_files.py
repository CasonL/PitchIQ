#!/usr/bin/env python
"""
This script cleans null bytes from all Python files in the project.
It scans recursively from the current directory and removes any null bytes.
"""

import os

def clean_file(file_path):
    """Remove null bytes from a file."""
    try:
        with open(file_path, 'rb') as f:
            content = f.read()
        
        # Replace null bytes
        original_size = len(content)
        content_clean = content.replace(b'\x00', b'')
        new_size = len(content_clean)
        
        # Only write if changes were made
        if original_size != new_size:
            with open(file_path, 'wb') as f:
                f.write(content_clean)
            print(f"Cleaned {file_path} - removed {original_size - new_size} null bytes")
            return True
        return False
    except Exception as e:
        print(f"Error cleaning {file_path}: {e}")
        return False

def main():
    """Main function to walk through directories and clean files."""
    count = 0
    files_cleaned = 0
    
    print("Scanning for Python files with null bytes...")
    
    # Walk through all directories from the current location
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.py'):
                count += 1
                file_path = os.path.join(root, file)
                if clean_file(file_path):
                    files_cleaned += 1
    
    print(f"\nScanned {count} Python files")
    print(f"Cleaned {files_cleaned} files with null bytes")
    print("Done!")

if __name__ == "__main__":
    main() 
#!/usr/bin/env python
"""
Script to replace "Thoughtful" traits with more lively, human-like traits throughout the codebase.
This script will systematically update all references to "Thoughtful" in Python, TypeScript, and JavaScript files.
"""

import os
import re
import json
from pathlib import Path

# Define replacements
REPLACEMENTS = {
    "Thoughtful": "Thoughtful",
    "thoughtful": "thoughtful",
    "THOUGHTFUL": "THOUGHTFUL"
}

# Define file extensions to process
FILE_EXTENSIONS = ['.py', '.tsx', '.ts', '.js', '.json']

# Define directories to exclude
EXCLUDE_DIRS = ['node_modules', 'venv', '.git', '__pycache__', 'dist', 'build']

def should_process_file(file_path):
    """Check if the file should be processed based on extension and path."""
    if not any(str(file_path).endswith(ext) for ext in FILE_EXTENSIONS):
        return False
    
    # Skip excluded directories
    for exclude_dir in EXCLUDE_DIRS:
        if exclude_dir in str(file_path):
            return False
    
    return True

def replace_in_file(file_path):
    """Replace occurrences of target words in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
        
        original_content = content
        modified = False
        
        # Replace direct string occurrences
        for old, new in REPLACEMENTS.items():
            content = content.replace(old, new)
        
        # Special handling for JSON structures in Python files
        if file_path.suffix == '.py':
            # Replace in JSON-like structures (trait dictionaries)
            for old, new in REPLACEMENTS.items():
                # Pattern for JSON keys: "Thoughtful": 0.7
                pattern = f'"{old}"\\s*:'
                replacement = f'"{new}":'
                content = re.sub(pattern, replacement, content)
                
                # Pattern for buyer_type values
                pattern = f'buyer_type\\s*=\\s*.*\\s*"{old}"'
                replacement = f'buyer_type="{new}"'
                content = re.sub(pattern, replacement, content)
                
                # Pattern for get with default: .get("buyer_type", "Thoughtful")
                pattern = f'\\.get\\(\\s*"buyer_type"\\s*,\\s*"{old}"\\s*\\)'
                replacement = f'.get("buyer_type", "{new}")'
                content = re.sub(pattern, replacement, content)
        
        # Check if content was modified
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as file:
                file.write(content)
            modified = True
            print(f"Updated: {file_path}")
        
        return modified
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def main():
    """Main function to walk through directories and replace text."""
    base_dir = Path('.')
    modified_files = 0
    
    for root, dirs, files in os.walk(base_dir):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            file_path = Path(root) / file
            if should_process_file(file_path):
                if replace_in_file(file_path):
                    modified_files += 1
    
    print(f"\nCompleted! Modified {modified_files} files.")

if __name__ == "__main__":
    main()

#!/usr/bin/env python
"""
Project Directory Cleanup Script

This script organizes utility scripts and files into a proper directory structure.
It creates necessary directories and moves files to their appropriate locations.
"""
import os
import shutil
import logging
import argparse
import re
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define directory structure
DIRECTORY_STRUCTURE = {
    'scripts': {
        'database': [
            r'(db|database|schema).*\.py$',
            r'reset_db\.py$',
            r'create_.*\.py$',
            r'check_db\.py$',
            r'list_tables\.py$',
            r'fix_database\.py$',
            r'update_db\.py$'
        ],
        'api_tests': [
            r'test_api.*\.py$',
            r'api_test.*\.py$',
            r'test_.*endpoint.*\.py$',
            r'test_tts.*\.py$'
        ],
        'deployment': [
            r'deploy.*\.py$',
            r'build.*\.py$',
            r'build.*\.ps1$',
            r'run_.*\.bat$',
            r'run_.*\.ps1$'
        ],
        'utilities': [
            r'update_.*\.py$',
            r'fix_.*\.py$',
            r'find_.*\.py$',
            r'patch_.*\.py$',
            r'check_.*\.py$',
            r'consolidate.*\.py$',
            r'list_.*\.py$'
        ]
    },
    'docs': {
        '': [
            r'.*\.md$',
            r'.*_report\.html$',
            r'.*_report\.txt$'
        ]
    },
    'config': {
        '': [
            r'\.env.*$',
            r'.*\.json$',
            r'.*config.*\.py$'
        ]
    }
}

def create_directory_structure():
    """Create the directory structure if it doesn't exist"""
    for parent_dir, subdirs in DIRECTORY_STRUCTURE.items():
        if not os.path.exists(parent_dir):
            os.makedirs(parent_dir)
            logger.info(f"Created directory: {parent_dir}")
        
        for subdir in subdirs:
            if subdir:  # Skip empty string which represents the parent directory
                full_path = os.path.join(parent_dir, subdir)
                if not os.path.exists(full_path):
                    os.makedirs(full_path)
                    logger.info(f"Created directory: {full_path}")

def should_move_file(filename, patterns):
    """Check if file matches any of the patterns"""
    for pattern in patterns:
        if re.match(pattern, filename, re.IGNORECASE):
            return True
    return False

def get_target_directory(filename):
    """Determine the target directory for a file based on its name"""
    for parent_dir, subdirs in DIRECTORY_STRUCTURE.items():
        for subdir, patterns in subdirs.items():
            if should_move_file(filename, patterns):
                if subdir:
                    return os.path.join(parent_dir, subdir)
                else:
                    return parent_dir
    return None

def move_files(dry_run=False):
    """Move files to their target directories"""
    root_dir = os.path.abspath('.')
    files_moved = 0
    
    for item in os.listdir(root_dir):
        # Skip directories that are part of our target structure
        if os.path.isdir(os.path.join(root_dir, item)) and item in DIRECTORY_STRUCTURE:
            continue
        
        # Skip hidden files and directories
        if item.startswith('.'):
            continue
        
        # Skip virtual environment directory
        if item == '.venv' or item == 'venv':
            continue
        
        # Skip app directory
        if item == 'app':
            continue
        
        # Skip important project files
        if item in ['requirements.txt', 'app.py', 'setup.py', 'wsgi.py']:
            continue
        
        # Only process Python scripts, Markdown docs, JSON files, and certain other file types
        if os.path.isfile(os.path.join(root_dir, item)) and (
            item.endswith('.py') or item.endswith('.md') or item.endswith('.json') or
            item.endswith('.bat') or item.endswith('.ps1') or re.match(r'\.env.*', item)
        ):
            target_dir = get_target_directory(item)
            if target_dir:
                src_path = os.path.join(root_dir, item)
                dst_path = os.path.join(root_dir, target_dir, item)
                
                if dry_run:
                    logger.info(f"Would move: {src_path} -> {dst_path}")
                else:
                    # Create target directory if it doesn't exist
                    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
                    
                    # Move the file
                    shutil.move(src_path, dst_path)
                    logger.info(f"Moved: {item} -> {target_dir}")
                
                files_moved += 1
    
    return files_moved

def main():
    parser = argparse.ArgumentParser(description='Clean up project directory structure')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    args = parser.parse_args()
    
    logger.info("Starting project directory cleanup")
    
    # Create directory structure
    if not args.dry_run:
        create_directory_structure()
    else:
        logger.info("Dry run: Would create directory structure")
    
    # Move files
    files_moved = move_files(args.dry_run)
    
    if args.dry_run:
        logger.info(f"Dry run: Would move {files_moved} files")
    else:
        logger.info(f"Successfully moved {files_moved} files")
    
    logger.info("Project directory cleanup complete")

if __name__ == '__main__':
    main() 
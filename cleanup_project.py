#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Script to help clean up the SalesTraining AI project.
This script will:
1. Identify potential duplicate and unused files
2. Suggest files to move to a scripts directory
3. Create a report with suggestions
"""

import os
import re
import glob
import hashlib
from collections import defaultdict
from datetime import datetime

def get_file_hash(filepath):
    """Get MD5 hash of file content."""
    hasher = hashlib.md5()
    try:
        with open(filepath, 'rb') as f:
            buf = f.read()
            hasher.update(buf)
        return hasher.hexdigest()
    except Exception:
        return None

def find_duplicate_files():
    """Find files with identical content."""
    print("Searching for duplicate files...")
    
    hash_to_files = defaultdict(list)
    python_files = glob.glob('*.py') + glob.glob('app/**/*.py', recursive=True)
    
    for file_path in python_files:
        file_hash = get_file_hash(file_path)
        if file_hash:
            hash_to_files[file_hash].append(file_path)
    
    # Filter to only include duplicates
    duplicates = {hash_val: files for hash_val, files in hash_to_files.items() if len(files) > 1}
    return duplicates

def identify_utility_scripts():
    """Identify standalone utility scripts that should be moved to a scripts directory."""
    print("Identifying utility scripts...")
    
    utility_scripts = []
    script_patterns = [
        r'test_.*\.py$',     # Test scripts
        r'fix_.*\.py$',      # Fix scripts
        r'create_.*\.py$',   # Creation scripts
        r'update_.*\.py$',   # Update scripts
        r'reset_.*\.py$',    # Reset scripts
        r'check_.*\.py$',    # Check scripts
        r'list_.*\.py$',     # Listing scripts
        r'build_.*\.py$',    # Build scripts
        r'run_[^_].*\.py$',  # Run scripts (except main ones)
    ]
    
    # Find Python files in the root directory
    root_py_files = [f for f in os.listdir('.') if os.path.isfile(f) and f.endswith('.py')]
    
    for file in root_py_files:
        # Skip main application files
        if file in ['run_app.py', 'run_backend.py', 'app.py', 'config.py', 'wsgi.py']:
            continue
            
        # Check if file matches utility script patterns
        for pattern in script_patterns:
            if re.match(pattern, file):
                utility_scripts.append(file)
                break
    
    return utility_scripts

def suggest_removable_directories():
    """Suggest directories that appear to be external projects or redundant."""
    print("Identifying potentially removable directories...")
    
    removable_dirs = []
    suspect_dirs = [
        'pitchiq-spark-launch-main',
        'pitchiq-voice-orb-design-a43f76bafc0e5d8fa6138ab0896e1fc6c01a2e6d',
        'nextjs-live-transcription-main',
        'flask-text-to-speech-main',
        'deepgram-js-sdk-main',
    ]
    
    for d in suspect_dirs:
        if os.path.isdir(d):
            removable_dirs.append(d)
    
    return removable_dirs

def create_cleanup_report(duplicates, utility_scripts, removable_dirs):
    """Create a report with cleanup suggestions."""
    print("Creating cleanup report...")
    
    report_file = 'cleanup_report.md'
    with open(report_file, 'w') as f:
        f.write("# Project Cleanup Report\n\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        f.write("## Duplicate Files\n\n")
        if duplicates:
            for hash_val, files in duplicates.items():
                f.write(f"The following files appear to be identical:\n")
                for file in files:
                    f.write(f"- `{file}`\n")
                f.write("\n")
        else:
            f.write("No duplicate files found.\n\n")
        
        f.write("## Utility Scripts to Organize\n\n")
        if utility_scripts:
            f.write("The following scripts should be moved to a `scripts/` directory:\n\n")
            for script in utility_scripts:
                f.write(f"- `{script}`\n")
            
            f.write("\nYou can create the scripts directory and move these files with:\n\n")
            f.write("```bash\n")
            f.write("mkdir -p scripts\n")
            for script in utility_scripts:
                f.write(f"git mv {script} scripts/\n")
            f.write("```\n\n")
        else:
            f.write("No utility scripts identified for reorganization.\n\n")
        
        f.write("## Potentially Removable Directories\n\n")
        if removable_dirs:
            f.write("The following directories appear to be external projects and may be removed:\n\n")
            for d in removable_dirs:
                f.write(f"- `{d}/`\n")
            
            f.write("\nBefore removing these directories, ensure they are not required by the project.\n\n")
            f.write("You can remove these directories with:\n\n")
            f.write("```bash\n")
            for d in removable_dirs:
                f.write(f"rm -rf {d}\n")
            f.write("```\n\n")
        else:
            f.write("No potentially removable directories identified.\n\n")
        
        f.write("## Next Steps\n\n")
        f.write("1. Review this report and determine which suggestions to implement\n")
        f.write("2. Test the application after making each change\n")
        f.write("3. Consider running this script again after implementing the changes\n")
    
    print(f"Report generated: {report_file}")
    return report_file

def main():
    """Run the cleanup script."""
    print("SalesTraining AI Project Cleanup Utility")
    print("=======================================")
    
    duplicates = find_duplicate_files()
    utility_scripts = identify_utility_scripts()
    removable_dirs = suggest_removable_directories()
    
    report_file = create_cleanup_report(duplicates, utility_scripts, removable_dirs)
    
    print("\nCleanup analysis complete!")
    print(f"Please review the report at: {report_file}")
    print("\nRemember to backup your project before implementing any of these changes.")

if __name__ == '__main__':
    main() 
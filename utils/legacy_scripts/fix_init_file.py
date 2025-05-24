#!/usr/bin/env python
"""
Script to fix the encoding issues in the training/__init__.py file.
This script completely removes any BOM markers and other invalid bytes.
"""

def fix_init_file():
    filepath = 'app/training/__init__.py'
    print(f"Fixing file: {filepath}")
    
    # Create a clean file from scratch
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("# Training package init\n")
    
    print(f"File recreated with clean UTF-8 encoding")

if __name__ == "__main__":
    fix_init_file() 
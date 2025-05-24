#!/usr/bin/env python
# Script to update imports in app/training/routes.py

import re

ROUTES_FILE = 'app/training/routes.py'

# Read the file
with open(ROUTES_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Check if session is already imported
if 'from flask import' in content and 'session' not in content:
    # Add session to the import list
    content = re.sub(
        r'from flask import (.*?)\n',
        r'from flask import \1, session\n',
        content,
        count=1
    )

    # Write back to the file
    with open(ROUTES_FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Updated {ROUTES_FILE}: Added session to Flask imports")
else:
    print(f"No update needed: session already imported or Flask import not found")

print("Done!") 
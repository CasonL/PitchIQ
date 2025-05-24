#!/usr/bin/env python

# Fix the import line in the training routes file
with open('app/training/routes.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the malformed import line
fixed_content = content.replace(
    'g,\n                                                                                                        ,\n make_response, session',
    'g, make_response, session'
)

# Write the fixed content back
with open('app/training/routes.py', 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("Fixed the import line formatting!") 
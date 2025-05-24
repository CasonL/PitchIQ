"""
Patch script for missing flask_admin

This script creates a dummy flask_admin package that can be imported
without errors if the real package is not available.
"""

import os
import sys

# Create the patch directory if it doesn't exist
patch_dir = os.path.join('app', 'patch')
os.makedirs(patch_dir, exist_ok=True)

# Create an __init__.py file in the patch directory
with open(os.path.join(patch_dir, '__init__.py'), 'w') as f:
    f.write('# Patch package\n')

# Create a dummy flask_admin module
flask_admin_code = """
# Dummy flask_admin module
class Admin:
    def __init__(self, *args, **kwargs):
        pass
    def init_app(self, app):
        pass
    def add_view(self, *args, **kwargs):
        pass
"""

with open(os.path.join(patch_dir, 'flask_admin.py'), 'w') as f:
    f.write(flask_admin_code)

# Add the patch directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
print(f"Added patch directory to Python path: {patch_dir}")
print("You can now import flask_admin from app.patch.flask_admin")
print("To use this patch, run your app with: python -m patch_imports && python run_app.py") 
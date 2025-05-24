"""
Debug script to trace module imports
"""
import sys
import builtins

# Store the original import function
original_import = builtins.__import__

# Create a tracking import function
def tracking_import(name, *args, **kwargs):
    if 'admin' in name:
        print(f"Importing module: {name}")
    return original_import(name, *args, **kwargs)

# Replace the import function with our tracking version
builtins.__import__ = tracking_import

try:
    print("Starting app import...")
    from app import create_app
    print("Creating app...")
    app = create_app()
    print("App created successfully")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    # Restore the original import function
    builtins.__import__ = original_import 
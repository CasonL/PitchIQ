"""
Script to check template directories and files.
"""
import os
from app import create_app

def check_templates():
    """Print template directory information."""
    app = create_app()
    
    # Get template folder
    template_folder = app.template_folder
    print(f"Template folder: {template_folder}")
    print(f"Template folder exists: {os.path.exists(template_folder)}")
    
    # List files in template folder
    print("\nTemplate directory contents:")
    for root, dirs, files in os.walk(template_folder):
        level = root.replace(template_folder, '').count(os.sep)
        indent = ' ' * 4 * level
        print(f"{indent}{os.path.basename(root)}/")
        sub_indent = ' ' * 4 * (level + 1)
        for file in files:
            print(f"{sub_indent}{file}")
    
    # Check specific files
    auth_dir = os.path.join(template_folder, 'auth')
    debug_path = os.path.join(auth_dir, 'debug.html')
    test_path = os.path.join(auth_dir, 'test.html')
    simple_debug_path = os.path.join(auth_dir, 'simple_debug.html')
    
    print(f"\nSpecific template checks:")
    print(f"auth directory exists: {os.path.exists(auth_dir)}")
    print(f"debug.html exists: {os.path.exists(debug_path)}")
    print(f"test.html exists: {os.path.exists(test_path)}")
    print(f"simple_debug.html exists: {os.path.exists(simple_debug_path)}")
    
if __name__ == "__main__":
    check_templates() 
import os
import re
import ast
import importlib
import sys
from pathlib import Path

def get_python_files(directory):
    """Get all Python files in the specified directory."""
    python_files = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    return python_files

def get_imported_modules(python_files):
    """Get all imported modules in the specified Python files."""
    imported_modules = set()
    for file_path in python_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
                try:
                    tree = ast.parse(content)
                    for node in ast.walk(tree):
                        if isinstance(node, ast.Import):
                            for name in node.names:
                                imported_modules.add(name.name)
                        elif isinstance(node, ast.ImportFrom):
                            if node.module:
                                imported_modules.add(node.module)
                except SyntaxError:
                    print(f"Syntax error in {file_path}")
        except UnicodeDecodeError:
            print(f"Could not decode {file_path}")
    return imported_modules

def find_defined_functions(file_path):
    """Find all functions defined in a Python file."""
    functions = []
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        functions.append(node.name)
            except SyntaxError:
                print(f"Syntax error in {file_path}")
    except UnicodeDecodeError:
        print(f"Could not decode {file_path}")
    return functions

def find_function_calls(file_path):
    """Find all function calls in a Python file."""
    function_calls = set()
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            content = file.read()
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Call) and hasattr(node, 'func') and hasattr(node.func, 'id'):
                        function_calls.add(node.func.id)
            except SyntaxError:
                print(f"Syntax error in {file_path}")
    except UnicodeDecodeError:
        print(f"Could not decode {file_path}")
    return function_calls

def find_potentially_unused_files(directory, used_modules):
    """Find potentially unused Python files."""
    python_files = get_python_files(directory)
    potentially_unused = []
    
    for file_path in python_files:
        # Skip __init__.py files
        if os.path.basename(file_path) == '__init__.py':
            continue
            
        # Convert file path to module path
        relative_path = os.path.relpath(file_path, directory)
        module_path = os.path.splitext(relative_path)[0].replace(os.path.sep, '.')
        
        # Check if the module is used
        if module_path not in used_modules and not any(module_path.startswith(m + '.') for m in used_modules):
            # Check for flask routes which could indicate usage
            has_routes = False
            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    if '@app.route' in content or '@auth.route' in content or '@bp.route' in content or '@training_bp.route' in content:
                        has_routes = True
            except UnicodeDecodeError:
                print(f"Could not decode {file_path}")
            
            if not has_routes:
                potentially_unused.append(file_path)
    
    return potentially_unused

def analyze_scripts(directory):
    """Find potential utility scripts that might be used only once."""
    python_files = get_python_files(directory)
    potential_scripts = []
    
    # Look for patterns that suggest a utility or migration script
    for file_path in python_files:
        if 'fix_' in file_path or 'migrate_' in file_path or 'debug_' in file_path or 'setup_' in file_path:
            # Check if it contains a "if __name__ == '__main__'" block
            try:
                with open(file_path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    if "if __name__ == '__main__'" in content:
                        potential_scripts.append(file_path)
            except UnicodeDecodeError:
                print(f"Could not decode {file_path}")
    
    return potential_scripts

def main():
    # Get all Python files in the project
    base_dir = '.'
    python_files = get_python_files(base_dir)
    
    # Get all imported modules
    imported_modules = get_imported_modules(python_files)
    
    # Find potentially unused files
    potentially_unused = find_potentially_unused_files(base_dir, imported_modules)
    
    # Find potential utility scripts
    potential_scripts = analyze_scripts(base_dir)
    
    # Print results
    print("\n===== POTENTIALLY UNUSED FILES =====")
    for file in potentially_unused:
        print(f"- {file}")
    
    print("\n===== POTENTIAL ONE-TIME UTILITY SCRIPTS =====")
    for script in potential_scripts:
        print(f"- {script}")
    
    # To analyze functions, we would need a more sophisticated approach
    # This is simplified for demonstration purposes
    print("\n===== NOTE =====")
    print("To find unused functions more accurately, consider using tools like:")
    print("- vulture (pip install vulture)")
    print("- coverage.py with unused-code plugin")
    print("This script provides a high-level overview of potentially unused files.")

if __name__ == '__main__':
    main() 
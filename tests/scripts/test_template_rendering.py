"""
Script to test template rendering directly.
"""
from flask import Flask, render_template

# Create a simple Flask app with explicit template path
app = Flask(__name__, 
          template_folder='app/templates',
          static_folder='app/static')

@app.route('/')
def index():
    return "Test app is working!"

@app.route('/test')
def test():
    """Test a simple template."""
    try:
        return render_template('auth/test.html')
    except Exception as e:
        return f"Error rendering template: {str(e)}"

@app.route('/debug')
def debug():
    """Test the debug template."""
    try:
        return render_template('auth/debug.html')
    except Exception as e:
        return f"Error rendering template: {str(e)}"

@app.route('/simple-debug')
def simple_debug():
    """Test the simple debug template."""
    try:
        return render_template('auth/simple_debug.html')
    except Exception as e:
        return f"Error rendering template: {str(e)}"

if __name__ == '__main__':
    import os
    # Get absolute paths to check file existence
    base_dir = os.path.abspath(os.path.dirname(__file__))
    template_dir = os.path.join(base_dir, 'app', 'templates')
    
    # Check if template files exist
    test_path = os.path.join(template_dir, 'auth', 'test.html')
    debug_path = os.path.join(template_dir, 'auth', 'debug.html')
    simple_debug_path = os.path.join(template_dir, 'auth', 'simple_debug.html')
    
    print(f"Template folder: {template_dir}")
    print(f"Template folder exists: {os.path.exists(template_dir)}")
    print(f"auth folder exists: {os.path.exists(os.path.join(template_dir, 'auth'))}")
    print(f"test.html exists: {os.path.exists(test_path)}")
    print(f"debug.html exists: {os.path.exists(debug_path)}")
    print(f"simple_debug.html exists: {os.path.exists(simple_debug_path)}")
    
    # List all files in the template folder
    print("\nTemplate directory contents:")
    for root, dirs, files in os.walk(template_dir):
        level = root.replace(template_dir, '').count(os.sep)
        indent = ' ' * 4 * level
        print(f"{indent}{os.path.basename(root)}/")
        sub_indent = ' ' * 4 * (level + 1)
        for file in files:
            print(f"{sub_indent}{file}")
    
    # Run the app
    print("\nStarting test Flask app...")
    app.run(debug=True, port=5500) 
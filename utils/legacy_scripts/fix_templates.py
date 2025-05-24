"""
Script to fix template folder structure and create test template files.
"""
import os
import shutil

def ensure_dir(directory):
    """Create directory if it doesn't exist."""
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"Created directory: {directory}")
    else:
        print(f"Directory already exists: {directory}")

def create_file(path, content):
    """Create a file with the given content."""
    with open(path, 'w') as f:
        f.write(content)
    print(f"Created file: {path}")

def main():
    """Fix template structure and create necessary files."""
    # Define base directories
    base_dir = os.path.abspath(os.path.dirname(__file__))
    template_dir = os.path.join(base_dir, 'app', 'templates')
    
    # Create template directory structure
    ensure_dir(template_dir)
    ensure_dir(os.path.join(template_dir, 'auth'))
    ensure_dir(os.path.join(template_dir, 'errors'))
    
    # Create a simple test.html file in auth directory
    test_html = """<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>Test Page</h1>
    <p>If you can see this, template rendering is working!</p>
</body>
</html>"""
    create_file(os.path.join(template_dir, 'auth', 'test.html'), test_html)
    
    # Create a simple debug.html file in auth directory
    debug_html = """<!DOCTYPE html>
<html>
<head>
    <title>Debug Page</title>
</head>
<body>
    <h1>Debug Page</h1>
    <p>This is the debug page for testing template rendering.</p>
    <hr>
    <div>
        <h2>Test API</h2>
        <button id="apiBtn">Test API</button>
        <pre id="apiResult">Results will appear here</pre>
    </div>
    
    <script>
        document.getElementById('apiBtn').addEventListener('click', async function() {
            const resultElement = document.getElementById('apiResult');
            resultElement.textContent = 'Testing...';
            
            try {
                const response = await fetch('/auth/simple-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ test: true })
                });
                
                const text = await response.text();
                resultElement.textContent = text;
            } catch (error) {
                resultElement.textContent = 'Error: ' + error.toString();
            }
        });
    </script>
</body>
</html>"""
    create_file(os.path.join(template_dir, 'auth', 'debug.html'), debug_html)
    
    # Create a simple_debug.html file in auth directory
    simple_debug_html = """<!DOCTYPE html>
<html>
<head>
    <title>Simple Debug Page</title>
</head>
<body>
    <h1>Simple Debug Page</h1>
    <p>This is a simple debug page to test template rendering.</p>
</body>
</html>"""
    create_file(os.path.join(template_dir, 'auth', 'simple_debug.html'), simple_debug_html)
    
    # Create a 500.html file in errors directory
    error_500_html = """<!DOCTYPE html>
<html>
<head>
    <title>Internal Server Error</title>
</head>
<body>
    <h1>Internal Server Error</h1>
    <p>Sorry, something went wrong on our server.</p>
</body>
</html>"""
    create_file(os.path.join(template_dir, 'errors', '500.html'), error_500_html)
    
    print("\nTemplate structure and files have been created successfully.")
    print("Now restart your Flask application and try accessing the routes again.")

if __name__ == "__main__":
    main() 
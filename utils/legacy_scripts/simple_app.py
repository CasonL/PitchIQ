"""
Simplified Flask app for testing routes directly.
"""
from flask import Flask, render_template, jsonify

app = Flask(__name__, 
          template_folder='app/templates',
          static_folder='app/static')

app.config['DEBUG'] = True
app.config['SECRET_KEY'] = 'debug-key'

@app.route('/')
def index():
    return "Simple test app is working!"

@app.route('/test')
def test():
    try:
        return render_template('auth/test.html')
    except Exception as e:
        return f"Error rendering template: {str(e)}"

@app.route('/api-test')
def api_test():
    return jsonify({
        'status': 'success',
        'message': 'API test successful'
    })

if __name__ == '__main__':
    print("=== Starting simplified Flask app ===")
    print(f"Template folder: {app.template_folder}")
    print(f"Routes defined:")
    for rule in app.url_map.iter_rules():
        print(f" - {rule.endpoint}: {rule.rule} [{', '.join(rule.methods - {'HEAD', 'OPTIONS'})}]")
    app.run(debug=True, port=5050) 
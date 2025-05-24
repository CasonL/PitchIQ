"""
Minimal Flask App

A completely standalone Flask app with no dependencies to test basic routing.
"""
from flask import Flask, jsonify

# Create a minimal app with no extensions or dependencies
app = Flask(__name__)

@app.route('/')
def index():
    return "<h1>Minimal Flask App</h1><p>If you can see this, basic Flask routing works.</p>"

@app.route('/api/test')
def test():
    return jsonify({"status": "success", "message": "Minimal API works"})

if __name__ == '__main__':
    print("Starting minimal Flask app on http://localhost:8000")
    # Use a different port to avoid conflicts
    app.run(debug=True, port=8000) 
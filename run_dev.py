"""
Development server runner
"""
import os
from app import create_app
from app.extensions import socketio

if __name__ == "__main__":
    os.environ['FLASK_CONFIG'] = 'dev'
    app = create_app('dev')
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False, allow_unsafe_werkzeug=True)

"""
WSGI Entry Point for Deployment
"""
import os
import sys

# Ensure the current directory and parent directory are in the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)
sys.path.insert(0, os.path.dirname(current_dir))

# Import the create_app function
from app import create_app

# Use 'prod' or 'production' for the config_name in a production environment
# You can set FLASK_CONFIG environment variable on Heroku
config_name = os.getenv('FLASK_CONFIG') or 'production'
app = create_app(config_name)

if __name__ == "__main__":
    app.run()
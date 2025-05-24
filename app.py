#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Main application runner for PitchIQ Sales Training AI.

This script initializes and runs the Flask application with SocketIO support.
It handles environment configuration, port management, and application setup.
"""

# Eventlet monkey patching needs to happen at the very beginning
import eventlet
# eventlet.monkey_patch() # Temporarily disabled for logging test

import os
import sys
import socket
import logging
import argparse
import click
from dotenv import load_dotenv
from flask.cli import FlaskGroup
import traceback
import subprocess
from werkzeug.serving import run_simple
from werkzeug.middleware.dispatcher import DispatcherMiddleware
from flask import Flask, Response, jsonify, send_from_directory

# Configure OpenAI API key from environment variable before imports
openai_api_key = os.environ.get('OPENAI_API_KEY')
if openai_api_key:
    # Set OpenAI API key environment variable explicitly
    os.environ['OPENAI_API_KEY'] = openai_api_key
    print(f"OpenAI API key found in environment and set: {openai_api_key[:4]}...{openai_api_key[-4:]}")
else:
    print("WARNING: OPENAI_API_KEY environment variable not found")

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('app_log.txt')
    ]
)
logger = logging.getLogger(__name__)

# Set Flask-specific logger to INFO
flask_logger = logging.getLogger('flask')
flask_logger.setLevel(logging.INFO)

# Set werkzeug logger
werkzeug_logger = logging.getLogger('werkzeug')
werkzeug_logger.setLevel(logging.INFO)

# Load environment variables
load_dotenv()

# Configuration
PORT = 8080
APP_ENV = os.environ.get('FLASK_ENV', 'dev')
DEBUG = True

def kill_other_python_processes():
    """Attempt to kill other Python processes that might be using the same port."""
    try:
        if sys.platform == 'win32':
            # Windows
            logger.info("Checking for other Python processes...")
            subprocess.run(['tasklist', '/FI', 'IMAGENAME eq python.exe'], check=False)
            
            # Get the current process ID
            current_pid = os.getpid()
            logger.info(f"Current process ID: {current_pid}")
            
            # Kill all other Python processes
            result = subprocess.run(
                ['taskkill', '/F', '/IM', 'python.exe', '/FI', f'PID ne {current_pid}'],
                capture_output=True,
                text=True,
                check=False
            )
            if result.returncode == 0:
                logger.info("Successfully terminated other Python processes")
            else:
                logger.info("No other Python processes found to terminate")
        else:
            # Unix-like
            logger.info("On Unix-like systems, use 'pkill -f python' manually if needed")
    except Exception as e:
        logger.warning(f"Failed to kill other Python processes: {e}")

def check_port_availability(port):
    """Check if the port is already in use."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    return result != 0  # If result is 0, port is in use

def create_fallback_app():
    """Create a simple fallback app for when the main app fails to load."""
    fallback_app = Flask(__name__, static_folder='app/static')
    
    @fallback_app.route('/')
    def index():
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Sales Training AI - Fallback Mode</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
                .container { max-width: 800px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
                h1 { color: #333; }
                .warning { color: #e74c3c; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Sales Training AI - Fallback Mode</h1>
                <p class="warning">The main application had trouble loading. You are seeing the fallback interface.</p>
                
                <h2>Available Options:</h2>
                <ul>
                    <li><a href="/api/health">API Health Check</a></li>
                    <li><a href="/api/dashboard/data">Dashboard Data API</a></li>
                    <li><a href="/simple-dashboard">Simple Dashboard</a></li>
                </ul>
            </div>
        </body>
        </html>
        """
        return Response(html, mimetype='text/html')
    
    @fallback_app.route('/api/health')
    def health_check():
        return jsonify({
            "status": "ok",
            "mode": "fallback",
            "timestamp": "immediate response"
        })
    
    @fallback_app.route('/simple-dashboard')
    def simple_dashboard():
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Simple Dashboard</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f7fb; }
                .dashboard-container { max-width: 1200px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
                .metric-box { background-color: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
                .metric-title { font-size: 14px; color: #666; margin-bottom: 5px; }
                .metric-value { font-size: 24px; font-weight: bold; color: #333; }
                .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; }
            </style>
        </head>
        <body>
            <div class="dashboard-container">
                <div class="header">
                    <h1>Sales Training Dashboard</h1>
                    <p>Simplified dashboard with mock data.</p>
                </div>
                
                <div class="metrics-grid">
                    <div class="metric-box">
                        <div class="metric-title">Sessions</div>
                        <div class="metric-value">24</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-title">Training Hours</div>
                        <div class="metric-value">32.5</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-title">Overall Score</div>
                        <div class="metric-value">78%</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-title">Improvement</div>
                        <div class="metric-value">+15%</div>
                    </div>
                </div>
                
                <div style="margin-top: 30px;">
                    <h2>Recent Activity</h2>
                    <ul>
                        <li>Completed Sales Call Demo (85% score)</li>
                        <li>Completed Product Demo (78% score)</li>
                    </ul>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                    <p><a href="/">Back to Home</a></p>
                </div>
            </div>
        </body>
        </html>
        """
        return Response(html, mimetype='text/html')
    
    @fallback_app.route('/static/<path:filename>')
    def serve_static(filename):
        return send_from_directory('app/static', filename)
        
    return fallback_app

def create_combined_app():
    """Create a combined application that falls back to simple mode if the main app fails."""
    try:
        # Try to create the main application
        main_app = create_app(APP_ENV)
        logger.info("Main application created successfully")
        return main_app
    except Exception as e:
        # If the main app fails to load, use the fallback app
        logger.error(f"Failed to create main application: {e}")
        traceback.print_exc()
        logger.info("Falling back to simplified application")
        return create_fallback_app()

def is_port_in_use(port, host='0.0.0.0'):
    """Check if the given port is in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind((host, port))
            return False
        except OSError:
            return True

def find_available_port(start_port, max_attempts=10, host='0.0.0.0'):
    """Find an available port starting from the given port."""
    for port_offset in range(max_attempts):
        port = start_port + port_offset
        if not is_port_in_use(port, host):
            return port
    # If we get here, we couldn't find an available port
    raise RuntimeError(f"Could not find available port after {max_attempts} attempts starting from {start_port}")

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Run the PitchIQ Sales Training AI application')
    parser.add_argument('--port', type=int, help='Port to run the application on')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode with verbose logging')
    parser.add_argument('--env', choices=['development', 'testing', 'production'], 
                       default=None, help='Application environment')
    return parser.parse_args()

def create_app(config_name=None):
    """Create and configure the Flask application."""
    # Import here to avoid circular imports
    from app import create_app as _create_app
    
    # Use FLASK_ENV from environment if config_name not provided
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    # Import the demo blueprint here to ensure it's available
    from app.routes import demo
    
    return _create_app(config_name)

@click.group(cls=FlaskGroup, create_app=create_app)
def cli():
    """PitchIQ Sales Training AI CLI."""
    pass

@cli.command()
@click.option('--port', default=8081, help='Port to run the server on')
@click.option('--host', default='0.0.0.0', help='Host to run the server on')
@click.option('--debug/--no-debug', default=None, help='Run in debug mode')
def run(port, host, debug):
    """Run the web server."""
    # Import here to avoid circular imports
    from app.extensions import socketio
    
    # Use debug setting from environment variable if not provided
    if debug is None:
        debug = os.environ.get('FLASK_DEBUG', 'False').lower() in ('true', '1', 'yes')
    
    logger.info(f"Starting server on {host}:{port} (debug: {debug})")
    
    app = create_app()
    socketio.run(app, host=host, port=port, debug=debug)

@cli.command()
def init_db():
    """Initialize the database."""
    app = create_app()
    with app.app_context():
        from app.database_manager import db_manager
        
        logger.info("Initializing database...")
        if db_manager.create_all():
            logger.info("Database initialized successfully")
            return 0
        else:
            logger.error("Failed to initialize database")
            return 1

@cli.command()
@click.option('--reset', is_flag=True, help='Reset the database (WARNING: This will delete all data)')
def migrate(reset):
    """Run database migrations."""
    app = create_app()
    with app.app_context():
        from app.database_manager import db_manager
        
        if reset:
            logger.warning("Resetting database...")
            if not click.confirm('Are you sure you want to reset the database? This will delete ALL data.'):
                logger.info("Database reset cancelled")
                return 0
                
            if db_manager.drop_all() and db_manager.create_all():
                logger.info("Database reset successfully")
                return 0
            else:
                logger.error("Failed to reset database")
                return 1
        
        logger.info("Running database migrations...")
        if db_manager.run_migrations():
            logger.info("Database migrations completed successfully")
            return 0
        else:
            logger.error("Failed to run database migrations")
            return 1

@cli.command()
def health():
    """Check system health."""
    app = create_app()
    with app.app_context():
        from app.system_health import system_health
        
        logger.info("Checking system health...")
        try:
            health_data = system_health().get_json()
            
            # Print formatted health status
            click.echo(f"System Status: {health_data['status'].upper()}")
            click.echo("\nComponent Status:")
            
            for name, component in health_data['components'].items():
                status = component['status']
                message = component.get('message', '')
                color = 'green' if status == 'healthy' else 'red' if status == 'unhealthy' else 'yellow'
                click.secho(f"  - {name}: {status.upper()} - {message}", fg=color)
            
            click.echo("\nSystem Info:")
            for key, value in health_data['system'].items():
                if isinstance(value, float):
                    click.echo(f"  - {key}: {value:.1f}%")
                else:
                    click.echo(f"  - {key}: {value}")
            
            return 0 if health_data['status'] == 'healthy' else 1
        except Exception as e:
            logger.error(f"Error checking system health: {str(e)}")
            click.secho(f"Error checking system health: {str(e)}", fg='red')
            return 1

@cli.command()
@click.option('--type', type=click.Choice(['api', 'database']), default=None, help='Type of test to run')
def test(type):
    """Run tests."""
    # Set environment to testing
    os.environ['FLASK_ENV'] = 'testing'
    
    logger.info(f"Running {type or 'all'} tests...")
    
    import pytest
    
    # Build arguments for pytest
    args = ['-xvs']
    
    if type == 'api':
        args.append('tests/api')
    elif type == 'database':
        args.append('tests/database')
    else:
        args.append('tests')
    
    exit_code = pytest.main(args)
    return exit_code

@cli.command()
@click.option('--directory', default=None, help='Directory to create (default: all required directories)')
def setup_dirs(directory):
    """Create required directories."""
    required_dirs = [
        'instance',
        'logs',
        'uploads',
        'uploads/audio',
        'uploads/profile_pics',
        'scripts',
        'scripts/database',
        'scripts/api_tests',
        'scripts/deployment'
    ]
    
    if directory:
        if directory not in required_dirs:
            logger.warning(f"Directory '{directory}' is not in the list of required directories")
        dirs_to_create = [directory]
    else:
        dirs_to_create = required_dirs
    
    for dir_path in dirs_to_create:
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
            logger.info(f"Created directory: {dir_path}")
        else:
            logger.info(f"Directory already exists: {dir_path}")
    
    return 0

if __name__ == '__main__':
    try:
        # Check for and kill other Python processes
        kill_other_python_processes()
        
        # Check port availability
        if not check_port_availability(PORT):
            logger.warning(f"Port {PORT} is already in use. Another process might be running.")
            logger.warning("You may need to restart your computer or manually kill processes.")
            sys.exit(1)
        
        # Create the application
        app = create_combined_app()
        
        # Print info banner
        print("\n" + "=" * 60)
        print("SALES TRAINING AI APPLICATION")
        print(f"Access the app at: http://localhost:{PORT}")
        print("=" * 60 + "\n")
        
        # Run the application
        logger.info(f"Starting Flask development server on port {PORT}")
        # Print the final URL map to debug routing
        print("--- Final Registered URL Map ---")
        try:
            print(app.url_map)
        except Exception as map_e:
            print(f"Error printing URL map: {map_e}")
        print("--- End Final URL Map ---")
        app.run(debug=DEBUG, port=PORT, threaded=True)
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        traceback.print_exc()
        sys.exit(1) 
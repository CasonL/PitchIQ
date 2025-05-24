"""
Sales Training AI - Simple Runner

This script provides a reliable way to start the Sales Training AI application.
It handles process management, port conflicts, and provides fallback options.
"""
import os
import sys
import time
import logging
import subprocess
import traceback
import socket
import psutil

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
APP_PORT = 8080
APP_HOST = '127.0.0.1'
APP_URL = f"http://{APP_HOST}:{APP_PORT}"
MAX_STARTUP_WAIT = 10  # seconds

def kill_conflicting_processes():
    """Find and kill processes that might be using our port"""
    logger.info("Scanning for conflicting Python/Flask processes...")
    killed_count = 0
    try:
        current_pid = os.getpid()
        logger.info(f"Current process ID: {current_pid}")
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'connections']):
            try:
                if proc.info['pid'] == current_pid:
                    continue # Skip self
                
                # Check if the process is using the target port
                is_using_port = False
                for conn in proc.info.get('connections', []) or []:
                    if conn.status == psutil.CONN_LISTEN and conn.laddr.port == APP_PORT:
                        is_using_port = True
                        break
                
                if is_using_port:
                    cmd_line_str = ' '.join(proc.info.get('cmdline', []) or ['N/A'])
                    logger.warning(f"Found process {proc.info['pid']} ({proc.info['name']}) listening on port {APP_PORT}. Command: {cmd_line_str[:100]}...")
                    logger.warning(f"Attempting to terminate process {proc.info['pid']}...")
                    try:
                        proc.terminate() # Try graceful termination first
                        killed_count += 1
                        time.sleep(0.5) # Give it time to close
                        if proc.is_running(): # Check if still running
                            logger.warning(f"Process {proc.info['pid']} did not terminate gracefully, forcing kill...")
                            proc.kill()
                            time.sleep(0.2)
                    except Exception as e:
                        logger.error(f"Failed to terminate/kill process {proc.info['pid']}: {e}")
                            
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                continue # Process might have died already
            except Exception as inner_e:
                logger.warning(f"Error processing process {proc.info.get('pid', 'N/A')}: {inner_e}")
                
    except Exception as e:
        logger.warning(f"Error during kill_conflicting_processes: {e}")
        
    if killed_count > 0:
        logger.info(f"Attempted to terminate {killed_count} conflicting process(es). Waiting briefly...")
        time.sleep(1) # Wait a bit longer after killing processes
    else:
        logger.info("No conflicting processes found listening on port.")

def check_port_availability(port, host='127.0.0.1'):
    """Check if a port is available"""
    logger.info(f"Checking availability for {host}:{port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    try:
        result = sock.connect_ex((host, port))
        if result == 0:
            logger.warning(f"Port {port} is currently in use (connect_ex result: 0).")
            return False
        else:
            logger.info(f"Port {port} appears to be available (connect_ex result: {result}).")
            return True
    except socket.timeout:
        logger.error(f"Timeout checking port {port}. Assuming unavailable.")
        return False
    except Exception as e:
        logger.error(f"Error checking port {port}: {e}")
        return False
    finally:
        sock.close()

def run_app():
    """Run the sales training AI application"""
    logger.info("Starting Sales Training AI Application via run_sales_ai.py")
    
    # Kill potentially conflicting processes first
    kill_conflicting_processes()
    
    # Check if port is available *after* trying to kill conflicts
    if not check_port_availability(APP_PORT, APP_HOST):
        logger.error(f"Port {APP_PORT} is still in use after cleanup attempt. Cannot start application.")
        logger.error("Please ensure no other instances are running or try restarting your machine.")
        sys.exit(1)
    
    # Display startup banner
    print("\n" + "=" * 60)
    print("SALES TRAINING AI APPLICATION")
    print(f"Access the app at: {APP_URL}")
    print("=" * 60 + "\n")
    
    app = None # Initialize app to None
    try:
        # Try to import and run the main app
        logger.info("Attempting to import create_app...")
        from app import create_app
        logger.info("Attempting to create main application instance...")
        app = create_app('dev')
        logger.info("Main application instance created successfully.")
        logger.info(f"Starting Flask server on {APP_HOST}:{APP_PORT} (Debug: True, Reloader: False)...")
        # Run WITHOUT the reloader, as this script handles process checks
        app.run(host=APP_HOST, port=APP_PORT, debug=True, threaded=True, use_reloader=False)
        logger.info("Flask server stopped.")
        
    except ImportError as ie:
        logger.error(f"Failed to import or create main application: {ie}")
        logger.error(traceback.format_exc())
    except Exception as e:
        logger.error(f"Failed to start main application: {e}")
        logger.error(traceback.format_exc())
        
        # Fallback only if app creation/run failed, not if server stopped normally
        if app is None: 
            logger.info("Falling back to simplified app...")
            try:
                from flask import Flask, jsonify, Response, send_from_directory
                
                fallback_app = Flask(__name__, static_folder='app/static')
                
                @fallback_app.route('/')
                def index():
                    # Minimal fallback page
                    return Response("<h1>Sales Training AI - Fallback Mode</h1><p>Main application failed to start. Check logs.</p><a href='/api/health'>Health</a> | <a href='/simplified-dashboard'>Simple Dashboard</a>", mimetype='text/html')
                
                @fallback_app.route('/api/health')
                def health():
                    return jsonify({"status": "ok", "mode": "fallback"})
                
                @fallback_app.route('/simplified-dashboard')
                def simplified_dashboard():
                     # Minimal simplified dashboard
                    return Response("<h1>Simplified Dashboard</h1><p>Basic fallback view.</p>", mimetype='text/html')
                
                @fallback_app.route('/static/<path:filename>')
                def serve_static(filename):
                    return send_from_directory('app/static', filename)
                
                logger.info(f"Starting fallback Flask server on {APP_HOST}:{APP_PORT} (Debug: True, Reloader: False)...")
                fallback_app.run(host=APP_HOST, port=APP_PORT, debug=True, use_reloader=False)
                logger.info("Fallback server stopped.")
                
            except Exception as fb_e:
                logger.error(f"FATAL: Failed to start fallback application: {fb_e}")
                logger.error(traceback.format_exc())
                sys.exit(1)
        else:
             logger.info("Main application server shut down normally.")
             
    logger.info("Exiting run_sales_ai.py script.")

if __name__ == "__main__":
    run_app() 
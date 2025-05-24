"""
Sales Training AI Application Runner

This script runs the Flask server for the Sales Training AI application.
"""
import os
import sys
import logging
import traceback
from app import create_app
import subprocess
import socket

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def kill_other_python_processes():
    """Attempt to kill other Python processes that might be using the same port."""
    logger.info("Starting kill_other_python_processes function...")
    try:
        if sys.platform == 'win32':
            # Windows
            logger.info("Checking for other Python processes using tasklist...")
            try:
                subprocess.run(['tasklist', '/FI', 'IMAGENAME eq python.exe'], check=False, capture_output=True, timeout=10)
            except subprocess.TimeoutExpired:
                logger.warning("The 'tasklist' command timed out after 10 seconds.")
            except FileNotFoundError:
                 logger.error("Error: 'tasklist' command not found. Make sure it's in your system PATH.")
                 return # Stop if tasklist isn't found
            except Exception as e:
                logger.warning(f"Error running tasklist: {e}")
                
            current_pid = os.getpid()
            logger.info(f"Current process ID: {current_pid}")
            
            # --- Taskkill Test (Temporarily Disabled) --- 
            logger.info(f"Attempting simplified taskkill command with 10s timeout...")
            taskkill_cmd = ['taskkill', '/F', '/IM', 'python.exe', '/FI', f'PID ne {current_pid}'] # Keep filter for safety
            logger.info(f"Executing command: {' '.join(taskkill_cmd)}")
            
            # Add log right before the call
            logger.info("--> ABOUT TO CALL subprocess.run for taskkill <--")
            logger.warning("--> SKIPPING taskkill subprocess call for debugging <--") # Indicate skip
            # try:
                # === Temporarily Commented Out ===
                # result = subprocess.run(
                #     taskkill_cmd,
                #     capture_output=True,
                #     text=True,
                #     check=False, # Don't raise error if no processes found
                #     timeout=10 # Add a 10-second timeout
                # )
                # === End Temporarily Commented Out ===
                
                # # Add log right after the call returns
                # logger.info("<-- subprocess.run for taskkill RETURNED <--")
                # logger.info(f"taskkill command finished. Return code: {result.returncode}")
                # if result.stdout:
                #     logger.info(f"taskkill stdout: {result.stdout.strip()}")
                # if result.stderr:
                #     logger.info(f"taskkill stderr: {result.stderr.strip()}")
                
                # if result.returncode == 0 and result.stdout:
                #     logger.info(f"Successfully terminated other Python processes based on stdout.")
                # else:
                #     logger.info("No other Python processes found or terminated, or taskkill failed.")
                    
            # except subprocess.TimeoutExpired:
            #     logger.info("<-- subprocess.run for taskkill TIMED OUT <--")
            #     logger.warning("The 'taskkill' command timed out after 10 seconds.")
            # except FileNotFoundError:
            #     logger.info("<-- subprocess.run for taskkill FAILED (FileNotFound) <--")
            #     logger.error("Error: 'taskkill' command not found. Make sure it is in your system PATH.")
            # except Exception as taskkill_error:
            #     logger.info(f"<-- subprocess.run for taskkill FAILED ({type(taskkill_error).__name__}) <--")
            #     logger.error(f"An error occurred executing taskkill: {taskkill_error}")
            #     logger.error(traceback.format_exc()) # Log the full traceback for this specific error
            # --- End Taskkill Test --- 
                
        else:
            # Unix-like
            logger.info("On Unix-like systems, manual process killing might be needed (e.g., 'pkill -f python')")
            
    except Exception as e:
        logger.warning(f"An unexpected error occurred within kill_other_python_processes: {e}")
        logger.error(traceback.format_exc()) # Log full traceback here too
        
    logger.info("Finished kill_other_python_processes function.")

def check_port_availability(port):
    """Check if the port is already in use."""
    logger.info(f"Starting check_port_availability for port {port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1) # Add a timeout
    is_available = False # Default to not available
    try:
        result = sock.connect_ex(('127.0.0.1', port))
        is_available = result != 0
        logger.info(f"Port {port} check result: {'Available' if is_available else 'In Use'} (connect_ex code: {result})")
    except socket.timeout:
        logger.error(f"Timeout checking port {port}. Assuming it might be in use or blocked.")
    except Exception as e:
        logger.error(f"Error checking port {port}: {e}")
    finally:
        sock.close()
        logger.info(f"Finished check_port_availability for port {port}. Available: {is_available}")
    return is_available

if __name__ == "__main__":
    logger.info("Starting run_app.py script execution...")
    try:
        # Check for and kill other Python processes
        kill_other_python_processes()
        
        # Check port availability
        port = 8080  # Using port 8080
        logger.info(f"Checking availability of port {port}...")
        if not check_port_availability(port):
            logger.error(f"Port {port} is already in use. Cannot start application.")
            logger.error("Please check if another instance is running or if the port is occupied by another service.")
            sys.exit(1)
        logger.info(f"Port {port} is available.")
        
        logger.info("Attempting to import create_app from app module...")
        # from app import create_app # Already imported at the top
        logger.info("Import successful. Calling create_app('dev')...")
        app = create_app('dev')
        logger.info("create_app('dev') returned successfully.")
        
        logger.info("Flask app instance created.")
        
        # Print info banner
        print("\n" + "=" * 60)
        print("SALES TRAINING AI APPLICATION")
        print(f"Access the app at: http://localhost:{port}")
        print("=" * 60 + "\n")
        
        logger.info(f"Starting Flask development server on port {port}...")
        # Note: app.run() is blocking, logs after this won't show until server stops
        app.run(debug=True, port=port, threaded=True, use_reloader=False) 
        # Added use_reloader=False to prevent issues with the script restarting itself during debugging
        
        logger.info("Flask server has stopped.") # This will only log when the server is shut down
        
    except ImportError as ie:
        logger.error(f"Failed to import 'create_app': {ie}")
        logger.error("Please ensure the 'app' package and '__init__.py' are correctly structured.")
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        logger.error(f"An unexpected error occurred during application startup: {e}")
        traceback.print_exc()
        sys.exit(1)
    logger.info("Exiting run_app.py script.") 
import os
from waitress import serve
from app import create_app

def main():
    """
    Runs the Flask application using Waitress, a production-quality WSGI server
    that is cross-platform and works well on Windows.
    """
    # Set the FLASK_ENV to development if it's not already set
    if 'FLASK_ENV' not in os.environ:
        os.environ['FLASK_ENV'] = 'development'
        print(f"FLASK_ENV set to: {os.environ['FLASK_ENV']}")

    # Create the Flask app instance using the app factory
    app = create_app(os.getenv('FLASK_ENV', 'development'))
    
    host = "127.0.0.1"
    port = 8080
    
    print(f"Starting Waitress server on http://{host}:{port}")
    
    # Use Waitress to serve the app
    serve(app, host=host, port=port, threads=8)

if __name__ == "__main__":
    main() 
import os
import sys
import logging
from flask import request

# Configure logging to handle Windows console encoding
logging.basicConfig(level=logging.DEBUG,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    stream=sys.stdout)
logger = logging.getLogger(__name__)

# Print environment variables
print("Environment variables related to database:")
for key, value in os.environ.items():
    if 'DB' in key.upper() or 'SQL' in key.upper() or 'DATABASE' in key.upper():
        masked_value = value
        if 'password' in key.lower() or 'pass' in key.lower():
            masked_value = '*****' if value else 'Not set'
        print(f"{key}: {masked_value}")

try:
    from app import create_app
    from app.extensions import db
    from sqlalchemy import text
    
    # Create app with debugging
    app = create_app()
    
    # Override error handler to print more details
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.exception("Unhandled exception in Flask app")
        print(f"\n\n*** EXCEPTION: {str(e)} ***")
        import traceback
        print(traceback.format_exc())
        return "Internal Server Error - Check Debug Log Output", 500
    
    # Add a debug route to test database connection
    @app.route('/debug-db')
    def debug_db():
        try:
            # Test database connection
            result = db.session.execute(text('SELECT 1')).scalar()
            return f"Database connection successful! Result: {result}"
        except Exception as e:
            logger.exception("Database connection test failed")
            return f"Database connection error: {type(e).__name__}: {str(e)}", 500

    # Override login route with heavy debugging
    from app.auth.routes import login_post as original_login_post
    
    @app.route('/auth/login-debug', methods=['POST'])
    def debug_login_post():
        """Debug version of login post with extra logging."""
        try:
            print("\n\n*** LOGIN DEBUG MODE ACTIVATED ***")
            print(f"Request JSON: {request.get_json()}")
            
            if request.is_json:
                data = request.get_json()
                email = data.get('email')
                print(f"Login attempt for email: {email}")
                
                # Check user
                from app.models import User
                user = User.query.filter_by(email=email).first()
                
                if user:
                    print(f"User found: id={user.id}, email={user.email}")
                    print(f"Checking password...")
                    if data.get('password'):
                        result = user.check_password(data.get('password'))
                        print(f"Password check result: {result}")
                    else:
                        print("No password provided")
                else:
                    print("User not found")
            
            # Try to delegate to real login handler
            try:
                return original_login_post()
            except Exception as login_error:
                print(f"Original login handler failed: {str(login_error)}")
                import traceback
                print(traceback.format_exc())
                raise
                
        except Exception as e:
            print(f"Debug login error: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return f"Login error (Debug Mode): {type(e).__name__}: {str(e)}", 500
    
    # Print application config
    with app.app_context():
        print("\nApplication configuration:")
        print(f"SQLALCHEMY_DATABASE_URI: {app.config.get('SQLALCHEMY_DATABASE_URI')}")
        print(f"SECRET_KEY set: {'Yes' if app.config.get('SECRET_KEY') else 'No'}")
        print(f"DEBUG mode: {app.config.get('DEBUG')}")
        
        # Test database
        print("\nTesting database connection...")
        try:
            db.session.execute(text('SELECT 1')).scalar()
            print("Database connection successful!")
        except Exception as e:
            print(f"Database connection failed: {type(e).__name__}: {str(e)}")
    
    print("\nStarting Flask debug server...")
    # Use host 0.0.0.0 to allow external connections for testing
    app.run(debug=True, port=5050, host='0.0.0.0')
    
except Exception as setup_error:
    logger.exception("Error setting up debug environment")
    print(f"Setup error: {str(setup_error)}")
    import traceback
    print(traceback.format_exc()) 
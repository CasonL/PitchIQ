"""
Error handling functions for Sales Training AI application.

This module provides functions for custom error pages and handling for various HTTP errors.
These handlers are registered with the Flask app instance in the application factory.
"""

from flask import render_template, request, jsonify, current_app
import traceback
import sys

# Removed Blueprint definition
# errors = Blueprint('errors', __name__)

def page_not_found(e):
    """404 Not Found error handler."""
    # Check if request prefers JSON
    if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
         return jsonify(error=str(e)), 404
    return render_template('errors/404.html'), 404

def internal_server_error(e):
    """500 Internal Server Error handler."""
    print("!!! ERROR HANDLER: internal_server_error CALLED !!!", flush=True)
    
    # Enhanced error logging
    tb = traceback.format_exc()
    
    # Get original exception if available
    original_error = getattr(e, 'original_exception', e)
    error_type = type(original_error).__name__
    
    # Log detailed error information
    current_app.logger.error(f"===== 500 ERROR DETAILS ===== ")
    current_app.logger.error(f"Error Type: {error_type}")
    current_app.logger.error(f"Error Message: {str(original_error)}")
    current_app.logger.error(f"Traceback:\n{tb}")
    
    # Log request information for debugging context
    if request:
        current_app.logger.error(f"Request URL: {request.url}")
        current_app.logger.error(f"Request Method: {request.method}")
        current_app.logger.error(f"Request Headers: {dict(request.headers)}")
        if request.is_json:
            # Don't log passwords
            safe_data = request.get_json().copy() if request.get_json() else {}
            if 'password' in safe_data:
                safe_data['password'] = '[REDACTED]'
            current_app.logger.error(f"Request JSON Data: {safe_data}")
    
    # Print to stdout for immediate visibility
    print(f"\n===== 500 SERVER ERROR =====", file=sys.stderr, flush=True)
    print(f"Error Type: {error_type}", file=sys.stderr, flush=True)
    print(f"Error Message: {str(original_error)}", file=sys.stderr, flush=True)
    print(f"Traceback:\n{tb}", file=sys.stderr, flush=True)
    
    # Database specific error check
    if 'sqlalchemy' in str(tb).lower() or 'database' in str(tb).lower():
        current_app.logger.error("This appears to be a database-related error")
        print("This appears to be a database-related error", file=sys.stderr, flush=True)
        
        # Attempt to log database connection status
        try:
            from app.extensions import db
            connection_valid = False
            try:
                from sqlalchemy import text
                db.session.execute(text("SELECT 1"))
                connection_valid = True
            except Exception as db_error:
                current_app.logger.error(f"Database connection test failed: {str(db_error)}")
                print(f"Database connection test failed: {str(db_error)}", file=sys.stderr, flush=True)
            
            current_app.logger.info(f"Database connection is {'valid' if connection_valid else 'invalid'}")
            print(f"Database connection is {'valid' if connection_valid else 'invalid'}", file=sys.stderr, flush=True)
            
            # Try to close/rollback any open transactions that might be causing problems
            try:
                db.session.rollback()
                current_app.logger.info("Database session rolled back")
            except Exception as rollback_error:
                current_app.logger.error(f"Error during session rollback: {str(rollback_error)}")
        except Exception as db_check_error:
            current_app.logger.error(f"Error checking database status: {str(db_check_error)}")
    
    if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
        return jsonify(error="Internal Server Error", details=str(e) if current_app.debug else None), 500
    
    # return render_template('errors/500.html'), 500 # Temporarily disable template
    return "Internal Server Error (Logged) - Check Terminal", 500

def forbidden(e):
    """403 Forbidden error handler."""
    if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
         return jsonify(error=str(e)), 403
    return render_template('errors/403.html'), 403

def too_many_requests(e):
    """429 Too Many Requests error handler."""
    # description attribute often contains the rate limit info
    description = getattr(e, 'description', 'Rate limit exceeded') 
    if request.accept_mimetypes.accept_json and not request.accept_mimetypes.accept_html:
         return jsonify(error=description), 429
    # Pass description to template if needed
    return render_template('errors/429.html', description=description), 429

def handle_generic_error(e):
    # Log the error with traceback
    current_app.logger.exception("An unhandled exception occurred")
    return render_template('errors/500.html', error=str(e)), 500

def handle_http_exception(e):
    # ... existing code ...

    return render_template(template, error=error_message), code

def handle_value_error(e):
    current_app.logger.warning(f"Value error encountered: {str(e)}")
    return render_template('errors/400.html', error="Invalid value provided."), 400

def handle_key_error(e):
    current_app.logger.warning(f"Key error encountered: {str(e)}")
    return render_template('errors/400.html', error="Invalid key accessed."), 400

# Function to register handlers with the app
def register_error_handlers(app):
    print("!!! REGISTERING ERROR HANDLERS !!!", flush=True)
    app.register_error_handler(403, forbidden)
    app.register_error_handler(404, page_not_found)
    app.register_error_handler(429, too_many_requests)
    app.register_error_handler(500, internal_server_error)

# Removed the direct route as it's less standard for error pages
# @errors.route('/too-many-requests')
# def too_many_requests_page():
#     """Direct access to rate limit exceeded page."""
#     return render_template('errors/429.html', retry_after='60'), 429, {'Retry-After': '60'}
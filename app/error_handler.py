import logging
import traceback
from flask import jsonify, render_template, request
from flask_login import current_user
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError

logger = logging.getLogger(__name__)

def register_error_handlers(app):
    """
    Register unified error handlers for the application.
    Uses a simplified approach to handle errors consistently.
    """
    logger.info("Registering centralized error handlers")
    
    # Generic error handler for all exceptions
    @app.errorhandler(Exception)
    def handle_exception(error):
        """Handle all exceptions with unified logic."""
        # Log with more context
        log_message = f"Unhandled exception on {request.method} {request.url}: {str(error)}"
        if current_user and current_user.is_authenticated:
            log_message += f" (User: {current_user.id})"
        logger.error(log_message)
        logger.debug(traceback.format_exc())
        
        # Refined check for API requests (prefers JSON response)
        is_api_request = (
            request.accept_mimetypes.accept_json and 
            not request.accept_mimetypes.accept_html
        )
        
        # Handle HTTP exceptions differently
        if isinstance(error, HTTPException):
            status_code = error.code
            error_title = error.name
            error_message = error.description
        else:
            status_code = 500
            error_title = "Internal Server Error"
            # Show specific error only in debug mode
            error_message = str(error) if app.debug else "An unexpected error occurred. Please try again later."
        
        # Different response format for API vs browser requests
        if is_api_request:
            response = {
                'status': 'error',
                'code': status_code,
                'message': error_message
            }
            # Add title for non-500 HTTP errors for clarity
            if status_code != 500 and isinstance(error, HTTPException):
                response['error_type'] = error.name 
            return jsonify(response), status_code
        else:
            # HTML response for browser requests
            # Use status_code to render appropriate template
            template_name = f'errors/{status_code}.html'
            fallback_template = 'errors/500.html' # Default fallback
            
            # Try specific template, fallback to 500.html
            try:
                 return render_template(template_name, 
                                     error=error_message,
                                     error_title=error_title,
                                     debug=app.debug,
                                     traceback=traceback.format_exc() if app.debug else None), status_code
            except Exception as template_error: # Catch potential template not found errors
                 logger.error(f"Error rendering template {template_name}: {template_error}, falling back to {fallback_template}")
                 return render_template(fallback_template, 
                                     error="An unexpected error occurred, and the specific error page could not be loaded.", 
                                     error_title="Server Error",
                                     debug=app.debug, 
                                     traceback=traceback.format_exc() if app.debug else None), 500
    
    # Handler for SQLAlchemy errors
    @app.errorhandler(SQLAlchemyError)
    def handle_database_error(error):
        """Handle database-related errors specifically."""
        log_message = f"Database error on {request.method} {request.url}: {str(error)}"
        if current_user and current_user.is_authenticated:
            log_message += f" (User: {current_user.id})"
        logger.error(log_message)
        logger.debug(traceback.format_exc())
        
        # Attempt to rollback the session
        try:
            from app.extensions import db
            db.session.rollback()
            logger.info("Database session rolled back successfully after error.")
        except Exception as rollback_error:
            logger.error(f"Failed to rollback database session after error: {rollback_error}")
            
        status_code = 500
        error_title = "Database Error"
        error_message = "A database error occurred. Please try again later."
        
        is_api_request = (
            request.accept_mimetypes.accept_json and 
            not request.accept_mimetypes.accept_html
        )
        
        if is_api_request:
            response = {
                'status': 'error',
                'code': status_code,
                'message': error_message,
                'error_type': 'DatabaseError'
            }
            return jsonify(response), status_code
        else:
            # Use the 500 error template
            return render_template('errors/500.html', 
                                 error=error_message, 
                                 error_title=error_title,
                                 debug=False,
                                 traceback=None), status_code
    
    # Specific handler for 404 errors
    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 Not Found errors specifically."""
        logger.info(f"404 Not Found: {request.path}")
        
        if request.path.startswith('/api/'):
            return jsonify({
                'status': 'error',
                'code': 404,
                'message': 'Resource not found'
            }), 404
        return render_template('errors/404.html'), 404
    
    # Specific handler for 500 errors
    @app.errorhandler(500)
    def handle_server_error(error):
        """Handle 500 Internal Server Error specifically."""
        logger.error(f"500 Internal Server Error: {str(error)}")
        
        if request.path.startswith('/api/'):
            return jsonify({
                'status': 'error',
                'code': 500,
                'message': 'Internal server error'
            }), 500
        return render_template('errors/500.html', error=str(error) if app.debug else None), 500
    
    # Specific handler for CSRF errors
    @app.errorhandler(400)
    def handle_csrf_error(error):
        """Handle CSRF validation errors."""
        if 'CSRF' in str(error):
            logger.warning(f"CSRF validation failed: {request.path}")
            
            if request.path.startswith('/api/'):
                return jsonify({
                    'status': 'error',
                    'code': 400,
                    'message': 'CSRF validation failed'
                }), 400
            return render_template('errors/400.html', error="CSRF validation failed"), 400
        
        # For other 400 errors, use the default handler
        return handle_exception(error)
    
    # Specific handler for unauthorized access
    @app.errorhandler(401)
    def handle_unauthorized(error):
        """Handle unauthorized access attempts."""
        logger.warning(f"Unauthorized access attempt: {request.path}")
        
        if request.path.startswith('/api/'):
            return jsonify({
                'status': 'error',
                'code': 401,
                'message': 'Authentication required'
            }), 401
        return render_template('errors/401.html'), 401 
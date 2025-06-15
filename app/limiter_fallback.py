import logging

logger = logging.getLogger(__name__)

class FallbackLimiter:
    """
    A fallback limiter that does nothing but allows the application to run
    if Flask-Limiter or its dependencies cannot be imported or initialized.
    """
    def __init__(self, app=None, key_func=None, default_limits=None, storage_uri=None, **kwargs):
        logger.warning(
            "Using FallbackLimiter. RATE LIMITING WILL BE NON-FUNCTIONAL. "
            "This is likely due to an issue with Flask-Limiter or its dependencies (e.g., 'limits' package)."
        )
        self.app = app
        self.key_func = key_func
        self.default_limits = default_limits
        self.storage_uri = storage_uri # Accept but ignore
        if app is not None:
            self.init_app(app)

    def init_app(self, app, **kwargs):
        """Initialize with the Flask app."""
        # Typically, this is where the extension would register itself with the app.
        # For the fallback, we do nothing significant.
        if not hasattr(app, 'extensions'):
            app.extensions = {}
        app.extensions['fallback_limiter'] = self
        logger.info("FallbackLimiter initialized with the app.")

    def limit(self, limit_string, key_func=None, per_method=False, methods=None,
              error_message=None, exempt_when=None, override_defaults=True,
              cost=1, on_breach=None, deduct_when=None):
        """Decorator that does not enforce any limits."""
        def decorator(func):
            return func
        return decorator

    def check(self):
        """Pre-request check, always allows."""
        return True

    def exempt(self):
        """Marks a route as exempt from limiting, no-op here."""
        pass

# Fallback for get_remote_address
def get_remote_address_fallback():
    """
    Fallback function for flask_limiter.util.get_remote_address.
    Returns a dummy IP or tries to get from request context if available.
    """
    try:
        from flask import request
        # Try to get a real IP if request context is available, otherwise default
        return request.remote_addr if request else "127.0.0.1"
    except RuntimeError: # Outside of request context
        return "127.0.0.1" # Default fallback

# Alias for consistency with how app/extensions.py might import it
get_remote_address = get_remote_address_fallback

    # Add any other methods that your application might call on the limiter instance
    # For example, if you use shared_limit:
    # def shared_limit(self, limit_value, scope, key_func=None, error_message=None, exempt_when=None, override_defaults=True, deduct_when=None, on_breach=None):
    #     def decorator(func):
    #         return func
    #     return decorator

# If you need to mock other parts of flask_limiter.util like get_remote_address for the fallback scenario:
def get_remote_address():
    # This is a simplified version. Flask-Limiter's is more robust.
    # Consider what your fallback key_func should be if the real one isn't available.
    # For a no-op limiter, this might not be strictly necessary.
    return "127.0.0.1" # Placeholder 
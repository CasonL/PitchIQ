"""
Authentication and Security Utilities for Sales Training AI

This module provides enhanced security for authentication-related functionality
including secure password handling, rate limiting, and CSRF protection.
"""

import time
import logging
import secrets
import re
from typing import Dict, Tuple, Optional, Any
from functools import wraps
from flask import request, session, g, redirect, url_for, flash, abort, current_app
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.FileHandler("security.log"), logging.StreamHandler()]
)
logger = logging.getLogger("AuthSecurity")

# Rate limiting storage (in-memory, replace with Redis in production)
_rate_limit_data = {}

# Login attempt tracking storage
_login_attempts = {}

def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validate if a password meets security requirements.
    
    Args:
        password: The password to validate
            
    Returns:
        Tuple containing (is_valid, error_message)
    """
    min_length = current_app.config.get('PASSWORD_MIN_LENGTH', 8)
    
    if len(password) < min_length:
        return False, f"Password must be at least {min_length} characters long"
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    return True, ""

def check_rate_limit(key: str, limit: int = None, window: int = None) -> Tuple[bool, int, int]:
    """
    Check if a rate limit has been exceeded.
    
    Args:
        key: Unique identifier for the rate limit (e.g., IP + endpoint)
        limit: Maximum number of requests allowed in the window
        window: Time window in seconds
        
    Returns:
        Tuple containing (is_allowed, remaining_attempts, retry_after)
    """
    global _rate_limit_data
    
    if limit is None:
        limit = current_app.config.get('RATE_LIMIT', 10)
        
    if window is None:
        window = current_app.config.get('RATE_LIMIT_WINDOW', 60)
    
    current_time = time.time()
    
    # Initialize or clean up old timestamps for this key
    if key not in _rate_limit_data:
        _rate_limit_data[key] = []
    
    # Remove timestamps older than the window
    _rate_limit_data[key] = [t for t in _rate_limit_data[key] 
                            if current_time - t < window]
    
    # Check if rate limit is exceeded
    if len(_rate_limit_data[key]) >= limit:
        oldest_timestamp = _rate_limit_data[key][0]
        retry_after = int(window - (current_time - oldest_timestamp))
        return False, 0, retry_after
    
    # Add timestamp and return allowed
    _rate_limit_data[key].append(current_time)
    remaining = limit - len(_rate_limit_data[key])
    return True, remaining, 0

def check_login_attempts(ip_address: str):
    """
    Check if a user has exceeded the maximum number of failed login attempts.
    
    Args:
        ip_address: IP address trying to log in
        
    Returns:
        Tuple containing (is_allowed, lockout_time_remaining)
    """
    global _login_attempts
    
    now = time.time()
    if ip_address in _login_attempts:
        user_data = _login_attempts[ip_address]
        
        # Check if user is in lockout period
        if user_data['lockout_until'] > now:
            time_remaining = int(user_data['lockout_until'] - now)
            return False, time_remaining
        elif user_data['lockout_until'] > 0:
            # Reset after lockout period expires
            user_data['attempts'] = 0
            user_data['lockout_until'] = 0
        
        return True, 0
    else:
        return True, 0

def record_failed_login(ip_address: str):
    """
    Record a failed login attempt and determine if account should be locked.
    
    Args:
        ip_address: IP address that failed to log in
        
    Returns:
        Tuple containing (is_locked_out, lockout_time)
    """
    global _login_attempts
    
    now = time.time()
    if ip_address not in _login_attempts:
        _login_attempts[ip_address] = {
            'attempts': 0,
            'last_attempt': 0,
            'lockout_until': 0
        }
    
    user_data = _login_attempts[ip_address]
    
    # Increment attempt count
    user_data['attempts'] += 1
    user_data['last_attempt'] = now
    
    # Check if should be locked out
    max_attempts = current_app.config.get('MAX_LOGIN_ATTEMPTS', 5)
    lockout_time = current_app.config.get('LOCKOUT_TIME', 300)  # 5 minutes
    if user_data['attempts'] >= max_attempts:
        user_data['lockout_until'] = now + lockout_time
        logger.warning(f"Account locked due to too many failed attempts: {ip_address}")
        return True, lockout_time
    
    return False, 0

def record_successful_login(ip_address: str):
    """
    Record a successful login and reset failed attempt counter.
    
    Args:
        ip_address: IP address that successfully logged in
    """
    global _login_attempts
    
    if ip_address in _login_attempts:
        del _login_attempts[ip_address]

# The custom CSRF implementation has been removed in favor of the
# standard Flask-WTF extension, which is more robust and integrated.
# The `generate_csrf()` and `@csrf.exempt` or `@csrf.protect` decorators
# from Flask-WTF should be used directly in the routes.

# Rate limiting decorator
def rate_limit(limit=None, window=None):
    """
    Decorator to apply rate limiting to a route.
    
    Args:
        limit: Maximum number of requests allowed in the window
        window: Time window in seconds
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get a unique key for this rate limit
            key = f"{request.remote_addr}:{request.path}"
            
            # Check rate limit
            allowed, remaining, retry_after = check_rate_limit(key, limit, window)
            
            if not allowed:
                logger.warning(f"Rate limit exceeded for {key}")
                
                # Abort with 429 status code, let the global handler deal with it
                abort(429)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

"""
Smart logging utilities for PitchIQ development.
Filters out noise and provides clean, actionable logs.
"""
import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from typing import Dict, List, Optional
import re

class SmartLogFilter(logging.Filter):
    """Filter that removes noisy logs and highlights important ones."""
    
    # Patterns to SUPPRESS (too noisy)
    SUPPRESS_PATTERNS = [
        r'Settings CORS headers',
        r'DEBUG:flask_cors',
        r'Request to.*matches CORS resource',
        r'The request\'s Origin header matches',
        r'CORS request received',
        r'werkzeug.*\[3[0-9]m.*GET.*static.*304',
        r'werkzeug.*GET.*static.*304',
        r'INFO:werkzeug.*GET /api/auth/status.*200',
        r'DEBUG:urllib3',
        r'Starting new HTTPS connection',
        r'https://.*"GET.*200',
        r'.*GET.*static.*304',
        r'.*GET /api/auth/status.*200',
        r'.*CORS.*',
        r'.*werkzeug.*GET.*',
        r'.*flask_cors.*',
        r'Access-Control-.*',
        r'Sending CORS headers',
        r'Using options:.*origins.*',
    ]
    
    # Patterns to HIGHLIGHT (important for debugging)
    HIGHLIGHT_PATTERNS = [
        r'ERROR',
        r'CRITICAL',
        r'Failed to create scoped token',
        r'InvalidStateError',
        r'TypeError',
        r'Construction of AudioBufferSourceNode',
        r'Error parsing client message',
        r'Session.*started',
        r'Session.*ended',
        r'Voice agent.*connected',
        r'Voice agent.*disconnected',
    ]
    
    def filter(self, record):
        """Filter log records based on patterns."""
        message = record.getMessage()
        
        # Suppress noisy patterns
        for pattern in self.SUPPRESS_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                return False
        
        # Always allow highlighted patterns
        for pattern in self.HIGHLIGHT_PATTERNS:
            if re.search(pattern, message, re.IGNORECASE):
                # Add visual emphasis
                record.msg = f"🔥 {record.msg}"
                return True
        
        # Allow INFO and above for our modules
        if record.name.startswith('app.') and record.levelno >= logging.INFO:
            return True
            
        # Allow WARNING and above for everything else
        if record.levelno >= logging.WARNING:
            return True
            
        return False

class SmartFormatter(logging.Formatter):
    """Formatter that provides clean, readable output."""
    
    # Color codes for terminal output
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green  
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'      # Reset
    }
    
    def format(self, record):
        """Format log record with colors and clean layout."""
        # Get color for level
        color = self.COLORS.get(record.levelname, '')
        reset = self.COLORS['RESET']
        
        # Clean module name
        module_name = record.name
        if module_name.startswith('app.'):
            module_name = module_name[4:]  # Remove 'app.' prefix
        
        # Format timestamp
        timestamp = self.formatTime(record, '%H:%M:%S')
        
        # Create clean format
        if record.levelno >= logging.WARNING:
            # Emphasize warnings and errors
            return f"{color}[{timestamp}] {record.levelname} {module_name}: {record.getMessage()}{reset}"
        else:
            # Clean format for info/debug
            return f"[{timestamp}] {module_name}: {record.getMessage()}"

def setup_smart_logging(level: str = "INFO") -> None:
    """
    Set up smart logging for the entire application.
    
    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR)
    """
    # Convert string level to logging constant
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    
    # AGGRESSIVELY clear all existing logging configuration
    root_logger = logging.getLogger()
    
    # Remove ALL existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Clear all existing loggers
    logging.getLogger().handlers.clear()
    
    # Reset the logging module configuration
    logging.basicConfig(force=True, level=logging.CRITICAL, handlers=[])
    
    # Create console handler with smart filter and formatter
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.addFilter(SmartLogFilter())
    console_handler.setFormatter(SmartFormatter())
    
    # Set up root logger
    root_logger.setLevel(logging.DEBUG)  # Capture everything, let filter decide
    root_logger.addHandler(console_handler)
    
    # AGGRESSIVELY silence specific noisy loggers
    noisy_loggers = [
        'werkzeug',
        'flask_cors.core',
        'flask_cors.extension', 
        'urllib3.connectionpool',
        'requests.packages.urllib3.connectionpool',
        'urllib3',
        'requests',
        'flask_cors',
    ]
    
    for logger_name in noisy_loggers:
        noisy_logger = logging.getLogger(logger_name)
        noisy_logger.setLevel(logging.CRITICAL)  # Only show CRITICAL errors
        noisy_logger.propagate = False  # Don't propagate to parent loggers
        # Remove any existing handlers
        for handler in noisy_logger.handlers[:]:
            noisy_logger.removeHandler(handler)
    
    # Disable werkzeug request logging completely
    logging.getLogger('werkzeug').disabled = True
    
    print(f"🎯 Smart logging enabled - Level: {level}")
    print(f"🔇 Silenced {len(noisy_loggers)} noisy loggers")

def get_smart_logger(name: str) -> logging.Logger:
    """
    Get a logger with smart filtering enabled.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)

def log_voice_event(event: str, details: Optional[Dict] = None) -> None:
    """Log voice-related events with special formatting."""
    logger = get_smart_logger('voice')
    details_str = f" - {details}" if details else ""
    logger.info(f"🎤 {event}{details_str}")

def log_api_call(endpoint: str, status: int, duration_ms: Optional[float] = None) -> None:
    """Log API calls with timing information."""
    logger = get_smart_logger('api')
    duration_str = f" ({duration_ms:.1f}ms)" if duration_ms else ""
    
    if status >= 400:
        logger.error(f"🚨 {endpoint} -> {status}{duration_str}")
    elif status >= 300:
        logger.warning(f"↩️ {endpoint} -> {status}{duration_str}")
    else:
        logger.info(f"✅ {endpoint} -> {status}{duration_str}")

def log_session_event(event: str, user_id: Optional[str] = None, session_id: Optional[str] = None) -> None:
    """Log session-related events."""
    logger = get_smart_logger('session')
    context = []
    if user_id:
        context.append(f"user:{user_id}")
    if session_id:
        context.append(f"session:{session_id[:8]}")
    
    context_str = f" [{', '.join(context)}]" if context else ""
    logger.info(f"👤 {event}{context_str}")

# Legacy support - keep existing functions
def get_logger(name):
    """Legacy function - returns smart logger."""
    return get_smart_logger(name)

def get_logger_with_file(name, level=logging.INFO):
    """Legacy function - returns smart logger."""
    return get_smart_logger(name) 
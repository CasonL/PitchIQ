"""
Logging utilities for the application.
"""
import logging
import os
import sys
from logging.handlers import RotatingFileHandler

def get_logger(name):
    """
    Returns a logger configured for the specified module name.
    """
    logger = logging.getLogger(name)
    
    # Set default level to INFO if not already configured
    if not logger.level:
        logger.setLevel(logging.INFO)
    
    # If no handlers are configured, add a default one
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter('%(levelname)s:%(name)s:%(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger

def get_logger_with_file(name, level=logging.INFO):
    """
    Get a logger with the specified name and level.
    
    Args:
        name (str): The name of the logger.
        level (int): The logging level (default: logging.INFO).
        
    Returns:
        logging.Logger: A logger instance.
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Create a formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create a console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # Create a file handler if logging to file is enabled
    log_file = os.environ.get('LOG_FILE', 'app_log.txt')
    if log_file:
        file_handler = RotatingFileHandler(
            log_file, maxBytes=1024*1024*5, backupCount=3
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger 
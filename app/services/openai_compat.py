
"""
OpenAI Compatibility Wrapper

This module provides a compatibility layer for different versions of the OpenAI SDK.
"""

import os
import logging
import importlib.util

logger = logging.getLogger(__name__)

# Check which version of OpenAI we're using
try:
    import openai
    openai_version = openai.__version__
    logger.info(f"Using OpenAI SDK version {openai_version}")
    
    # For new OpenAI client (v1.0.0+)
    if openai_version.startswith("1."):
        from openai import OpenAI
        
        def create_client(api_key=None):
            """Create an OpenAI client with the appropriate parameters."""
            if not api_key:
                api_key = os.environ.get("OPENAI_API_KEY")
            
            # New client doesn't accept proxies parameter
            return OpenAI(
                api_key=api_key,
                base_url="https://api.openai.com/v1"
            )
    
    # For legacy OpenAI client (v0.x.x)
    else:
        def create_client(api_key=None):
            """Create an OpenAI client with the appropriate parameters."""
            if api_key:
                openai.api_key = api_key
            # Old client uses global configuration
            return openai
            
except ImportError:
    logger.error("Failed to import OpenAI SDK. Please install it with pip install openai")
    
    def create_client(api_key=None):
        """Placeholder function when OpenAI SDK is not available."""
        raise ImportError("OpenAI SDK is not installed")

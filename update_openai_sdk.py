#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Update OpenAI SDK Script

This script updates the OpenAI SDK to a specific version that's compatible with the codebase.
It also updates related packages like httpx to ensure compatibility.
"""

import os
import sys
import subprocess
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("openai_update")

def run_command(command):
    """Run a shell command and log the output."""
    logger.info(f"Running command: {command}")
    try:
        result = subprocess.run(
            command, 
            shell=True,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        logger.info(f"Command output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"Command failed with exit code {e.returncode}")
        logger.error(f"Error output: {e.stderr}")
        return False

def update_openai_sdk():
    """Update OpenAI SDK to a compatible version."""
    logger.info("Checking current package versions...")
    
    # Check current versions
    run_command("pip show openai httpx")
    
    # Uninstall current OpenAI SDK
    logger.info("Uninstalling current OpenAI SDK...")
    run_command("pip uninstall -y openai")
    
    # Install a specific version of OpenAI SDK that's compatible
    logger.info("Installing OpenAI SDK v0.28.1 (older, more stable version)...")
    success = run_command("pip install openai==0.28.1")
    
    if success:
        logger.info("✅ Successfully updated OpenAI SDK to v0.28.1")
        logger.info("This version uses a different client initialization approach that should fix the 'proxies' parameter issue.")
    else:
        logger.error("❌ Failed to update OpenAI SDK. Please try installing it manually with:")
        logger.error("pip install openai==0.28.1")

def create_compatibility_wrapper():
    """Create a compatibility wrapper for the OpenAI client."""
    logger.info("Creating compatibility wrapper for the OpenAI client...")
    
    wrapper_file = "app/services/openai_compat.py"
    os.makedirs(os.path.dirname(wrapper_file), exist_ok=True)
    
    with open(wrapper_file, 'w', encoding='utf-8') as f:
        f.write("""
\"\"\"
OpenAI Compatibility Wrapper

This module provides a compatibility layer for different versions of the OpenAI SDK.
\"\"\"

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
            \"\"\"Create an OpenAI client with the appropriate parameters.\"\"\"
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
            \"\"\"Create an OpenAI client with the appropriate parameters.\"\"\"
            if api_key:
                openai.api_key = api_key
            # Old client uses global configuration
            return openai
            
except ImportError:
    logger.error("Failed to import OpenAI SDK. Please install it with pip install openai")
    
    def create_client(api_key=None):
        \"\"\"Placeholder function when OpenAI SDK is not available.\"\"\"
        raise ImportError("OpenAI SDK is not installed")
""")
    
    logger.info(f"✅ Created compatibility wrapper at {wrapper_file}")
    logger.info("This wrapper can be used to create OpenAI clients that work with different SDK versions")

def main():
    """Update OpenAI SDK and create compatibility utilities."""
    logger.info("Starting OpenAI SDK update process...")
    
    # Ask for confirmation
    print("\nWARNING: This script will downgrade your OpenAI SDK to v0.28.1 to fix compatibility issues.")
    print("This is a stable version but doesn't have the latest features.")
    confirm = input("Do you want to continue? (y/n): ")
    
    if confirm.lower() != 'y':
        logger.info("Update cancelled by user.")
        return
    
    update_openai_sdk()
    create_compatibility_wrapper()
    
    logger.info("\nSDK update completed. To fix the voice chat feature:")
    logger.info("1. Restart your Flask application")
    logger.info("2. If issues persist, update imports in your code to use the compatibility wrapper")
    logger.info("   with: from app.services.openai_compat import create_client")

if __name__ == "__main__":
    main() 
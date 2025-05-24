"""
Test script to verify OpenAI API key is properly set and working.

This script attempts to:
1. Check if the OpenAI API key is set in the environment
2. Make a simple API call to verify the key works
"""

import os
import sys
import logging
from openai import OpenAI

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def test_openai_key():
    """Test if the OpenAI API key is set and working."""
    # Check if API key is in environment
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        logger.error("OPENAI_API_KEY not found in environment variables")
        return False
        
    logger.info(f"Found OPENAI_API_KEY in environment (first 4 chars: {api_key[:4]}...)")
    
    # Try making a simple API call
    try:
        logger.info("Initializing OpenAI client...")
        client = OpenAI(api_key=api_key)
        
        logger.info("Making test API call...")
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5
        )
        
        logger.info(f"API call successful! Response: {response}")
        return True
    except Exception as e:
        logger.error(f"Error testing OpenAI API key: {str(e)}")
        logger.error(f"Full error details: {sys.exc_info()}")
        return False

if __name__ == "__main__":
    print("Testing OpenAI API key...")
    if test_openai_key():
        print("✅ OpenAI API key is valid and working")
    else:
        print("❌ OpenAI API key is invalid or not found")

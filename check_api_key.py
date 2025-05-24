"""
Script to verify if OpenAI API key is correctly set and functioning.

This script:
1. Checks for the API key in environment variables
2. Tries to load the key from the application's configuration
3. Tests the key by making a minimal API call
"""
import os
import sys
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('api_key_check')

def check_env_variables():
    """Check if OpenAI API key is in environment variables."""
    api_key = os.environ.get('OPENAI_API_KEY')
    if api_key:
        masked_key = f"{api_key[:4]}...{api_key[-4:]}"
        logger.info(f"OPENAI_API_KEY found in environment variables: {masked_key}")
        return api_key
    else:
        logger.warning("OPENAI_API_KEY not found in environment variables")
        return None

def check_app_config():
    """Try to load the API key from Flask app configuration."""
    try:
        # Import the create_app function to get an app instance with config loaded
        sys.path.append('.')
        from app import create_app
        app = create_app()
        
        # Check for API key in app config
        with app.app_context():
            api_key = app.config.get('OPENAI_API_KEY')
            if api_key:
                masked_key = f"{api_key[:4]}...{api_key[-4:]}"
                logger.info(f"OPENAI_API_KEY found in app config: {masked_key}")
                return api_key
            else:
                logger.warning("OPENAI_API_KEY not found in app config")
                return None
    except Exception as e:
        logger.error(f"Error checking app config: {e}")
        return None

def test_api_key(api_key):
    """Test if the API key works by making a minimal API call."""
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key)
        logger.info("Making test API call...")
        
        # Make a minimal test call
        start_time = datetime.now()
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=5
        )
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info(f"OpenAI API call successful! (took {duration:.2f}s)")
        logger.info(f"Response: {response.choices[0].message.content}")
        return True
    except Exception as e:
        logger.error(f"Error testing OpenAI API key: {e}")
        return False

def check_service_instance():
    """Check if the OpenAI service instance is properly initialized."""
    try:
        from app.services.openai_service import openai_service
        
        # Get the API key from the service
        api_key = openai_service.api_key if hasattr(openai_service, 'api_key') else None
        initialized = openai_service.initialized if hasattr(openai_service, 'initialized') else False
        
        if api_key:
            masked_key = f"{api_key[:4]}...{api_key[-4:]}"
            logger.info(f"OpenAI service has API key: {masked_key}")
        else:
            logger.warning("OpenAI service has no API key")
            
        logger.info(f"OpenAI service initialized: {initialized}")
        
        # Try to use the service to generate a response
        try:
            logger.info("Testing openai_service.generate_response...")
            response = openai_service.generate_response(
                messages=[{"role": "user", "content": "Test"}],
                max_tokens=5
            )
            logger.info(f"OpenAI service test successful: {response}")
            return True
        except Exception as e:
            logger.error(f"Error testing OpenAI service: {e}")
            return False
    except Exception as e:
        logger.error(f"Error checking OpenAI service: {e}")
        return False

def main():
    """Run all checks for the OpenAI API key."""
    logger.info("Starting OpenAI API key checks...")
    
    # Check for API key in environment variables
    env_api_key = check_env_variables()
    
    # Check app config for API key
    app_api_key = check_app_config()
    
    # Use the API key from environment or app config
    api_key = env_api_key or app_api_key
    
    if api_key:
        # Test if the API key works
        if test_api_key(api_key):
            logger.info("✅ API key is valid and working")
        else:
            logger.error("❌ API key validation failed")
            
        # Check OpenAI service instance
        if check_service_instance():
            logger.info("✅ OpenAI service instance is working")
        else:
            logger.error("❌ OpenAI service instance check failed")
    else:
        logger.error("❌ No API key found")
        
    logger.info("API key checks completed")

if __name__ == "__main__":
    main() 
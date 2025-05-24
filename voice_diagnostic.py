#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Voice Chat Diagnostic Script

This script runs a series of tests to diagnose issues with the voice chat functionality.
It tests each component in isolation to identify where the problem might be occurring.
"""

import os
import sys
import logging
import traceback
from datetime import datetime
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('voice_diagnostic.log')
    ]
)
logger = logging.getLogger("voice_diagnostic")

# Testing flags
TEST_API_KEY = True
TEST_OPENAI_SERVICE = True
TEST_CONVERSATION_MANAGER = True
TEST_ELEVENLABS = True
TEST_VOICE_ENDPOINT = True

def check_api_key():
    """Test if the OpenAI API key is properly set and working."""
    logger.info("=== TESTING API KEY CONFIGURATION ===")
    
    # Check environment variable
    api_key = os.environ.get('OPENAI_API_KEY')
    if api_key:
        masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "[INVALID FORMAT]"
        logger.info(f"✓ Found API key in environment: {masked_key}")
    else:
        logger.error("✗ No API key found in environment variables")
        
    # Check Flask app config
    try:
        from app import create_app
        app = create_app()
        with app.app_context():
            app_key = app.config.get('OPENAI_API_KEY')
            if app_key:
                masked_app_key = f"{app_key[:4]}...{app_key[-4:]}" if len(app_key) > 8 else "[INVALID FORMAT]"
                logger.info(f"✓ Found API key in app config: {masked_app_key}")
            else:
                logger.error("✗ No API key found in app config")
    except Exception as e:
        logger.error(f"✗ Error checking app config: {str(e)}")
        
    # Test API key validity
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Test"}],
            max_tokens=5
        )
        logger.info(f"✓ API key is valid and working. Response: {response.choices[0].message.content}")
        return True
    except Exception as e:
        logger.error(f"✗ API key validation failed: {str(e)}")
        return False

def test_openai_service():
    """Test if the OpenAI service is working properly."""
    logger.info("=== TESTING OPENAI SERVICE ===")
    
    try:
        from app.services.openai_service import get_openai_service
        
        # Get the OpenAI service
        openai_service = get_openai_service()
        if not openai_service:
            logger.error("✗ OpenAI service not found")
            return False
            
        logger.info(f"OpenAI service initialized: {openai_service.initialized}")
        
        if not openai_service.initialized:
            logger.error("✗ OpenAI service is not initialized")
            return False
            
        # Test generate_response
        response = openai_service.generate_response(
            messages=[{"role": "user", "content": "Hello"}],
            max_tokens=10
        )
        
        if response:
            logger.info(f"✓ OpenAI service generate_response works. Response: {response}")
            return True
        else:
            logger.error("✗ OpenAI service generate_response returned empty response")
            return False
    except Exception as e:
        logger.error(f"✗ Error testing OpenAI service: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def test_conversation_manager():
    """Test if the ConversationStateManager is working properly."""
    logger.info("=== TESTING CONVERSATION STATE MANAGER ===")
    
    try:
        from app.services.conversation_state_manager import ConversationStateManager, ConversationPhase
        
        # Create a conversation manager
        manager = ConversationStateManager()
        logger.info(f"✓ Created ConversationStateManager instance")
        
        # Test current_phase property
        phase = manager.current_phase
        logger.info(f"✓ Current phase: {phase}")
        
        # Test update_phase method
        try:
            result = manager.update_phase("Hello, I'm interested in your product.")
            logger.info(f"✓ update_phase method returned: {result}")
        except Exception as e:
            logger.error(f"✗ Error calling update_phase: {str(e)}")
            logger.error(traceback.format_exc())
            
        # Test get_system_prompt method
        try:
            prompt = manager.get_system_prompt("Test Persona")
            logger.info(f"✓ get_system_prompt returns a prompt with {len(prompt)} characters")
        except Exception as e:
            logger.error(f"✗ Error calling get_system_prompt: {str(e)}")
            logger.error(traceback.format_exc())
            
        return True
    except Exception as e:
        logger.error(f"✗ Error testing ConversationStateManager: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def test_elevenlabs_service():
    """Test if the ElevenLabs service is working properly."""
    logger.info("=== TESTING ELEVENLABS SERVICE ===")
    
    try:
        from app.services.eleven_labs_service import get_eleven_labs_service
        
        # Get the ElevenLabs service
        elevenlabs_service = get_eleven_labs_service()
        if not elevenlabs_service:
            logger.error("✗ ElevenLabs service not found")
            return False
            
        logger.info(f"✓ Got ElevenLabs service instance")
        
        # Check if API key is set
        api_key = os.environ.get('ELEVENLABS_API_KEY')
        if not api_key:
            logger.warning("! No ELEVENLABS_API_KEY found in environment")
            
        # Test generating audio (limited test to avoid API usage)
        try:
            logger.info("Attempting to access voices...")
            voices = elevenlabs_service.get_voices()
            if voices:
                logger.info(f"✓ ElevenLabs service returned {len(voices)} voices")
            else:
                logger.warning("! ElevenLabs service returned no voices")
        except Exception as e:
            logger.error(f"✗ Error accessing ElevenLabs voices: {str(e)}")
            
        return True
    except Exception as e:
        logger.error(f"✗ Error testing ElevenLabs service: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def test_voice_endpoint():
    """Test if the voice chat endpoint is working properly."""
    logger.info("=== TESTING VOICE ENDPOINT ===")
    
    try:
        from app import create_app
        import requests
        
        app = create_app()
        
        # Use test client to avoid starting a server
        with app.test_client() as client:
            # Test the voice-chat endpoint
            logger.info("Testing /voice-chat endpoint...")
            response = client.post('/api/voice-chat', 
                                  json={"message": "Test message", "session_id": "test"})
            
            logger.info(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                logger.info(f"✓ Voice chat endpoint returned 200 OK")
                logger.info(f"Response: {response.get_json()}")
                return True
            else:
                logger.error(f"✗ Voice chat endpoint returned {response.status_code}")
                logger.error(f"Response: {response.get_data(as_text=True)}")
                return False
    except Exception as e:
        logger.error(f"✗ Error testing voice endpoint: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def run_all_tests():
    """Run all diagnostic tests and print a summary."""
    results = {}
    
    logger.info("Starting voice chat diagnostic tests...")
    
    if TEST_API_KEY:
        results["API Key"] = check_api_key()
    
    if TEST_OPENAI_SERVICE:
        results["OpenAI Service"] = test_openai_service()
    
    if TEST_CONVERSATION_MANAGER:
        results["Conversation Manager"] = test_conversation_manager()
    
    if TEST_ELEVENLABS:
        results["ElevenLabs Service"] = test_elevenlabs_service()
    
    if TEST_VOICE_ENDPOINT:
        results["Voice Endpoint"] = test_voice_endpoint()
    
    # Print summary
    logger.info("\n=== DIAGNOSTIC SUMMARY ===")
    all_passed = True
    
    for test, result in results.items():
        status = "PASSED" if result else "FAILED"
        if not result:
            all_passed = False
        logger.info(f"{test}: {status}")
    
    if all_passed:
        logger.info("\nAll tests passed. If you're still experiencing issues, check the application logs for more specific errors.")
    else:
        logger.info("\nSome tests failed. Review the log for details on which components are not working properly.")

if __name__ == "__main__":
    run_all_tests() 
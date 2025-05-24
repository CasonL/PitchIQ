#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Simple OpenAI API Test

This script tests the OpenAI API key without involving any Flask app components.
It checks if the API key is valid and can make a successful request.
"""

import os
import sys
import time
import logging
from dotenv import load_dotenv
import requests
import json
from pprint import pprint

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("api_test")

def test_openai_api():
    """Test OpenAI API independently of the Flask app."""
    # Load environment variables
    load_dotenv()
    
    # Get API key
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        logger.error("No OpenAI API key found in environment variables.")
        logger.info("Please set the OPENAI_API_KEY environment variable.")
        return False
    
    # Check API key format
    if not api_key.startswith('sk-'):
        logger.error(f"Invalid API key format: {api_key[:4]}...")
        logger.info("OpenAI API keys should start with 'sk-'")
        return False
    
    logger.info(f"API key found: {api_key[:4]}...{api_key[-4:]}")
    
    # Import and initialize OpenAI client
    try:
        from openai import OpenAI
        logger.info("Creating OpenAI client...")
        client = OpenAI(api_key=api_key)
        
        # Make test request
        logger.info("Testing API with a simple request...")
        start_time = time.time()
        
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello in one word."}
            ],
            max_tokens=10
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Process response
        if response and response.choices and response.choices[0].message:
            logger.info(f"Request successful! Response: '{response.choices[0].message.content}'")
            logger.info(f"Request took {duration:.2f} seconds")
            logger.info(f"Used tokens: {response.usage.total_tokens} (prompt: {response.usage.prompt_tokens}, completion: {response.usage.completion_tokens})")
            return True
        else:
            logger.error("Received empty response from OpenAI API")
            return False
            
    except ImportError as e:
        logger.error(f"Could not import OpenAI library: {e}")
        logger.info("Please install the OpenAI library: pip install openai")
        return False
    except Exception as e:
        logger.error(f"Error making API request: {e}")
        return False

def test_dashboard_coach_api():
    """Test the dashboard coach API endpoint"""
    # Load environment variables
    load_dotenv()
    
    # Get host from environment or use default
    host = os.getenv('HOST', 'localhost')
    
    # Always use localhost for connecting from the same machine
    # even if the server is set to listen on 0.0.0.0
    if host == '0.0.0.0':
        host = 'localhost'
    
    # Try both PORT and FLASK_PORT environment variables
    ports_to_try = [
        os.getenv('FLASK_PORT', '5000'),
        os.getenv('PORT', '8081'),
        '8080'  # Common default
    ]
    
    for port in ports_to_try:
        url = f"http://{host}:{port}/api/dashboard/coach"
        print(f"\nTesting API at: {url}")
        
        # Test data with a message about a product
        payload = {
            "message": "I'm selling an AI sales training platform that allows users to practice sales calls with realistic AI personas that provide feedback and coaching.",
            "context": {
                "role": "coach",
                "messages": [],
                "additional_context": "The user is providing information about their product/service.",
                "current_stage": "product"
            }
        }
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        
        try:
            # Make the POST request
            response = requests.post(url, json=payload, headers=headers, timeout=5)
            
            # Print the response status and full JSON
            print(f"Status code: {response.status_code}")
            try:
                json_response = response.json()
                print("\nAPI Response:")
                pprint(json_response)
                
                # Specifically check for summary field
                if 'summary' in json_response:
                    print("\nSummary found:", json_response['summary'])
                else:
                    print("\nNo summary field in response")
                
                # If we get a successful response, don't try other ports
                return
                    
            except json.JSONDecodeError:
                print("Response is not valid JSON:")
                print(response.text)
        
        except requests.exceptions.RequestException as e:
            print(f"Error connecting to {url}: {str(e)}")
            # Continue trying other ports

    print("\nFailed to connect to any API endpoint.")

def main():
    """Run the test."""
    logger.info("=== SIMPLE OPENAI API TEST ===")
    if test_openai_api():
        logger.info("✅ OpenAI API is working correctly!")
    else:
        logger.error("❌ OpenAI API test failed.")

if __name__ == "__main__":
    test_dashboard_coach_api() 
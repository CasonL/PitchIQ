#!/usr/bin/env python3
"""
Test script to check API when Flask app is running as server.
"""

import requests
import time

def test_api():
    print("Testing API endpoints...")
    
    try:
        # Test the count endpoint
        response = requests.get('http://localhost:8080/api/email-signup/count', timeout=10)
        print(f"Count endpoint - Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
        print(f"Content: {response.text[:200]}")
        print()
        
        # Test the test endpoint
        response = requests.get('http://localhost:8080/api/test_post', timeout=10)
        print(f"Test endpoint - Status: {response.status_code}")
        print(f"Content-Type: {response.headers.get('Content-Type', 'Unknown')}")
        print(f"Content: {response.text[:200]}")
        
    except requests.exceptions.ConnectionError:
        print("Connection error - Flask app might not be running")
    except requests.exceptions.Timeout:
        print("Request timed out")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_api() 
#!/usr/bin/env python3
"""
Test script to debug authentication endpoints.
"""

import sys
import os
import requests
import json

# Test the authentication API endpoints
def test_auth_endpoints():
    """Test authentication endpoints"""
    
    base_url = "http://localhost:8080"
    
    print("🔧 Testing Authentication Endpoints")
    print("=" * 50)
    
    # Test 1: CSRF Token endpoint
    print("\n**Test 1: CSRF Token Endpoint**")
    try:
        response = requests.get(f"{base_url}/api/csrf-token")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Auth Status endpoint  
    print("\n**Test 2: Auth Status Endpoint**")
    try:
        response = requests.get(f"{base_url}/api/auth/status")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Login endpoint with valid credentials
    print("\n**Test 3: Login Endpoint**")
    try:
        login_data = {
            "email": "test@test.com",
            "password": "test123",
            "remember": False
        }
        response = requests.post(
            f"{base_url}/api/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # If login successful, test auth status again
        if response.status_code == 200:
            print("\n**Test 4: Auth Status After Login**")
            cookies = response.cookies
            auth_response = requests.get(f"{base_url}/api/auth/status", cookies=cookies)
            print(f"Status: {auth_response.status_code}")
            print(f"Response: {auth_response.text}")
            
    except Exception as e:
        print(f"Error: {e}")
    
    print("\n✅ Authentication endpoint test complete!")

if __name__ == "__main__":
    print("Make sure the Flask app is running on http://localhost:8080")
    print("Press Enter to test endpoints or Ctrl+C to cancel...")
    try:
        input()
        test_auth_endpoints()
    except KeyboardInterrupt:
        print("\nTest cancelled.") 